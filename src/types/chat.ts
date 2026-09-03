/**
 * TypeScript interfaces matching the FastAPI backend models.
 *
 * Kept in sync with `app/schemas/chat.py` in the Langchain-RAG backend.
 */

// ── Request Models ──────────────────────────────────────────────────────────

export interface ChatRequest {
  user_prompt: string;
  conversation_id?: string;
  user_id?: string;
}

export interface ConversationCreateRequest {
  user_id?: string;
  title?: string;
}

export interface RenameRequest {
  title: string;
}

// ── Response Models ─────────────────────────────────────────────────────────

export interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  seq: number;
  role: "user" | "assistant";
  content: string;
  route?: string | null;
  tool_calls: Record<string, unknown>[];
  partial: boolean;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// ── Human-in-the-loop tool approval ─────────────────────────────────────────

/** One tool call the graph paused on, as sent in the `interrupt` SSE event. */
export interface PendingToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * The payload of an `interrupt` event, raised by `approve_tools` in the tool
 * agent. The graph is checkpointed mid-run and waits for POST
 * /chatbot/{id}/resume before it will go any further.
 */
export interface ToolApprovalRequest {
  type: "tool_approval";
  tool_calls: PendingToolCall[];
}

/**
 * The answer to an approval prompt. Matches `ToolDecision` in
 * app/schemas/chat.py.
 *
 * There is deliberately no tool_call_id: the graph already knows which call it
 * paused on, and accepting an id from the client would only create a way to
 * answer a different prompt than the one shown.
 */
export interface ToolDecision {
  action: "accept" | "reject";
  reason?: string;
}

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  mongodb: { status: string; detail?: string };
  langsmith: { status: string; detail?: string };
}
