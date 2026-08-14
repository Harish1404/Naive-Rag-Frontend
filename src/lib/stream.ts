import { API_BASE_URL, PLACEHOLDER_USER_ID } from "./api";

/**
 * Streams a chat response from the backend using native fetch + ReadableStream.
 *
 * The backend's `/chatbot` endpoint returns a raw text/event-stream where each
 * chunk is a plain text token (not structured SSE). We consume the stream with
 * a ReadableStreamDefaultReader and yield decoded text fragments via a callback.
 *
 * Returns the `conversation_id` from the `X-Conversation-Id` response header,
 * which is essential for the first message of a new chat (where no id exists yet).
 */

const MAX_STREAM_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface StreamChatOptions {
  userPrompt: string;
  conversationId?: string;
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat({
  userPrompt,
  conversationId,
  onToken,
  onComplete,
  onError,
  signal,
}: StreamChatOptions): Promise<string | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_STREAM_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[Stream] Retry ${attempt}/${MAX_STREAM_RETRIES} in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const body: Record<string, string> = {
        user_prompt: userPrompt,
        user_id: PLACEHOLDER_USER_ID,
      };

      if (conversationId) {
        body.conversation_id = conversationId;
      }

      const response = await fetch(`${API_BASE_URL}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status}: ${errorBody || response.statusText}`
        );
      }

      // Extract the conversation id from the response header
      const responseConversationId =
        response.headers.get("X-Conversation-Id") ?? conversationId ?? null;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream in response");
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          if (text) {
            onToken(text);
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete();
      return responseConversationId;
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
        onError(lastError);
        return null;
      }
    }
  }

  if (lastError) {
    onError(lastError);
  }
  return null;
}
