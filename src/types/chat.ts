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

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  mongodb: { status: string; detail?: string };
  langsmith: { status: string; detail?: string };
}
