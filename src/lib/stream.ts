import { API_BASE_URL, refreshSession } from "./api";
import type { ToolApprovalRequest, ToolDecision } from "@/types/chat";

/**
 * The chat stream: one turn of conversation, framed as Server-Sent Events.
 *
 * The backend emits named events rather than bare text, because a run can stop
 * halfway to ask the user to approve a tool call:
 *
 *   token      {"t": "..."}                   a piece of the answer
 *   interrupt  {"type": "tool_approval", ...} the run paused; see ToolApprovalRequest
 *   truncated  {"reason": "length"}           the answer hit the token ceiling
 *   done       {"conversation_id": "..."}     the turn finished
 *   error      {"detail": "..."}
 *
 * Two entry points share all of the machinery below:
 *
 *   streamChat  starts a turn      POST /chatbot
 *   resumeChat  answers a prompt   POST /chatbot/{id}/resume
 *
 * They differ only in the request; everything after the response headers —
 * retry policy, 401 refresh, SSE parsing — is identical, which is why it lives
 * in `runStream` rather than being written twice.
 *
 * Identity comes from the session cookie, not the request body, so every call
 * needs `credentials: "include"`.
 */

const MAX_STREAM_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface StreamHandlers {
  onToken: (token: string) => void;
  /** The run paused for approval. `onComplete` is NOT called in this case. */
  onInterrupt?: (data: ToolApprovalRequest) => void;
  /**
   * The answer stopped because it hit the model's token ceiling, not because
   * it was finished. Arrives just before `done`, so the message about to be
   * committed can be marked incomplete.
   */
  onTruncated?: () => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  onUnauthorized?: () => void;
  /**
   * Fired as soon as the X-Conversation-Id header is read — before a single
   * token arrives. This is what lets a brand-new chat navigate to /c/{id}
   * while the answer is still streaming, instead of after it finishes.
   */
  onConversationId?: (conversationId: string) => void;
  signal?: AbortSignal;
}

interface StreamChatOptions extends StreamHandlers {
  userPrompt: string;
  conversationId?: string;
}

interface ResumeChatOptions extends StreamHandlers {
  conversationId: string;
  decision: ToolDecision;
}

/** Everything after the response headers: read the body, parse SSE, dispatch. */
async function consumeSSE(
  response: Response,
  handlers: StreamHandlers
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No readable stream in response");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent: string | null = null;
  let currentDataLines: string[] = [];

  // An interrupt is not a completed turn. Calling onComplete here would append
  // a half-finished assistant message that the backend deliberately did not
  // persist — leaving a stub in the transcript that the real answer then
  // appears *after*.
  let interrupted = false;

  const dispatch = () => {
    const dataStr = currentDataLines.join("\n");
    const eventType = currentEvent || "token";

    if (eventType === "token") {
      try {
        const parsed = JSON.parse(dataStr);
        if (typeof parsed.t === "string") {
          handlers.onToken(parsed.t);
        } else if (typeof parsed === "string") {
          handlers.onToken(parsed);
        }
      } catch {
        // Fallback if the data string is plain text
        handlers.onToken(dataStr);
      }
    } else if (eventType === "error") {
      let detail = dataStr;
      try {
        detail = JSON.parse(dataStr).detail ?? dataStr;
      } catch {
        // not JSON; use the raw string
      }
      throw new Error(detail || "Unknown SSE stream error");
    } else if (eventType === "interrupt") {
      try {
        interrupted = true;
        handlers.onInterrupt?.(JSON.parse(dataStr) as ToolApprovalRequest);
      } catch {
        console.warn("[Stream] Failed to parse interrupt event data:", dataStr);
      }
    } else if (eventType === "truncated") {
      // No payload to parse — the event's presence is the whole signal.
      handlers.onTruncated?.();
    }

    currentEvent = null;
    currentDataLines = [];
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      let lineEndIndex: number;
      while ((lineEndIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, lineEndIndex);
        buffer = buffer.slice(lineEndIndex + 1);

        // Trim trailing \r if any (\r\n handling)
        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }

        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentDataLines.push(line.slice(6));
        } else if (line.startsWith("data:")) {
          currentDataLines.push(line.slice(5));
        } else if (line === "") {
          // Empty line marks the end of an SSE message block
          if (currentEvent || currentDataLines.length > 0) {
            dispatch();
          }
        }
      }

      if (done) {
        // Flush whatever is left at EOF
        const remaining = buffer + decoder.decode();
        if (remaining.trim() && remaining.startsWith("data: ")) {
          const dataStr = remaining.slice(6).trim();
          try {
            const parsed = JSON.parse(dataStr);
            if (typeof parsed.t === "string") handlers.onToken(parsed.t);
          } catch {
            handlers.onToken(dataStr);
          }
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!interrupted) {
    handlers.onComplete();
  }
}

/**
 * Issue a streaming request with the shared retry / refresh policy, then hand
 * the body to consumeSSE.
 *
 * Returns the conversation id from the X-Conversation-Id header.
 */
async function runStream(
  request: () => Promise<Response>,
  fallbackConversationId: string | undefined,
  handlers: StreamHandlers
): Promise<string | null> {
  let lastError: Error | null = null;
  let refreshAttempted = false;

  for (let attempt = 0; attempt <= MAX_STREAM_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[Stream] Retry ${attempt}/${MAX_STREAM_RETRIES} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const response = await request();

      // The access token lapsed mid-session. Refresh once and replay — this
      // must not count against the network-retry budget, and must not loop.
      if (response.status === 401 && !refreshAttempted) {
        refreshAttempted = true;
        const refreshed = await refreshSession();
        if (refreshed) {
          attempt -= 1; // replay immediately, without the backoff delay
          continue;
        }
        handlers.onUnauthorized?.();
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status}: ${errorBody || response.statusText}`
        );
      }

      const conversationId =
        response.headers.get("X-Conversation-Id") ?? fallbackConversationId ?? null;

      // Announced before the body is read, so a new chat can navigate now
      // rather than when the answer finishes.
      if (conversationId) {
        handlers.onConversationId?.(conversationId);
      }

      await consumeSSE(response, handlers);
      return conversationId;
    } catch (error) {
      // Don't retry if the user intentionally aborted
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors, not HTTP 4xx
      const isNetworkError =
        lastError.message.includes("Failed to fetch") ||
        lastError.message.includes("NetworkError") ||
        lastError.message.includes("HTTP 5");

      if (!isNetworkError || attempt === MAX_STREAM_RETRIES) {
        handlers.onError(lastError);
        return null;
      }
    }
  }

  if (lastError) {
    handlers.onError(lastError);
  }
  return null;
}

/**
 * One turn of chat. Omit `conversationId` to start a new thread — the id comes
 * back on the X-Conversation-Id header and through `onConversationId`.
 */
export async function streamChat({
  userPrompt,
  conversationId,
  ...handlers
}: StreamChatOptions): Promise<string | null> {
  const body: Record<string, string> = { user_prompt: userPrompt };
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  return runStream(
    () =>
      fetch(`${API_BASE_URL}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
        signal: handlers.signal,
      }),
    conversationId,
    handlers
  );
}

/**
 * Answer a pending tool-approval prompt and let the turn finish.
 *
 * The original question is not resent — it is still in the graph's checkpoint.
 * This picks up from exactly where `interrupt()` left off, so what streams back
 * is the rest of the same answer.
 *
 * A second gated tool call in the same turn will interrupt again, so this can
 * legitimately end in another `interrupt` rather than in `done`.
 */
export async function resumeChat({
  conversationId,
  decision,
  ...handlers
}: ResumeChatOptions): Promise<string | null> {
  return runStream(
    () =>
      fetch(`${API_BASE_URL}/chatbot/${conversationId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
        credentials: "include",
        signal: handlers.signal,
      }),
    conversationId,
    handlers
  );
}

/**
 * What a thread is waiting on, if anything — without advancing it.
 *
 * This is what lets a refreshed tab, or a client whose stream died while the
 * server restarted, land back on the approval prompt instead of on a
 * conversation that appears to stop mid-sentence.
 */
export async function fetchPendingApproval(
  conversationId: string
): Promise<ToolApprovalRequest | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/chatbot/${conversationId}/pending`,
      { credentials: "include" }
    );
    if (!response.ok) return null;

    const data = await response.json();
    return (data?.pending as ToolApprovalRequest) ?? null;
  } catch {
    // Best effort. A failure here just means no card is restored; the rest of
    // the conversation still loads.
    return null;
  }
}
