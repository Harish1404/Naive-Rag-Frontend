import { create } from "zustand";
import type { Message, ToolApprovalRequest } from "@/types/chat";
import { fetchPendingApproval, resumeChat, streamChat } from "@/lib/stream";
import api from "@/lib/api";
import { toast } from "sonner";

interface ChatState {
  // ── State ──────────────────────────────────────────────────────────────────
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingHistory: boolean;
  abortController: AbortController | null;
  /** Set when the graph paused to ask the user to approve a tool call. */
  pendingApproval: ToolApprovalRequest | null;
  /**
   * The turn in flight ran into the model's token ceiling. Consumed by
   * finishTurn, which stamps it onto the committed message as `partial`.
   */
  truncated: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  sendMessage: (
    prompt: string,
    onConversationId?: (id: string) => void
  ) => Promise<string | null>;
  /** Answer a pending approval and let the turn finish. */
  resolveApproval: (action: "accept" | "reject", reason?: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  clearChat: () => void;
  stopStreaming: () => void;
  setActiveConversationId: (id: string | null) => void;
  /** Push a finished message straight in. Used by voice turns, which are
   *  produced by the voice socket rather than by sendMessage. */
  appendMessage: (message: Message) => void;
  /**
   * Commit the streamed text as a real message and reset the streaming state.
   *
   * Shared by sendMessage and resolveApproval: after an approval the answer
   * arrives across two separate HTTP responses and has to land as a single
   * message rather than two.
   */
  finishTurn: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  isLoadingHistory: false,
  abortController: null,
  pendingApproval: null,
  truncated: false,

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
  },

  appendMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearChat: () => {
    const { abortController } = get();
    abortController?.abort();
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      abortController: null,
      pendingApproval: null,
      truncated: false,
    });
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null, pendingApproval: null });
  },

  loadConversation: async (conversationId) => {
    set({
      isLoadingHistory: true,
      messages: [],
      activeConversationId: conversationId,
      pendingApproval: null,
      streamingContent: "",
    });

    try {
      const { data } = await api.get(`/conversations/${conversationId}`, {
        params: { limit: 200 },
      });

      // A thread can be sitting on an unanswered approval prompt — the tab was
      // refreshed, or the server restarted mid-turn. Without this the
      // conversation just appears to stop mid-sentence with no way to discover
      // there is a prompt still open on it.
      const pending = await fetchPendingApproval(conversationId);

      set({
        messages: data.messages ?? [],
        pendingApproval: pending,
        isLoadingHistory: false,
      });
    } catch {
      toast.error("Failed to load conversation");
      set({ isLoadingHistory: false });
    }
  },

  sendMessage: async (prompt, onConversationId) => {
    const { activeConversationId, messages } = get();

    // Optimistically add the user message to the UI
    const optimisticUserMsg: Message = {
      message_id: `temp-${Date.now()}`,
      conversation_id: activeConversationId ?? "",
      seq: messages.length,
      role: "user",
      content: prompt,
      route: null,
      tool_calls: [],
      partial: false,
      created_at: new Date().toISOString(),
    };

    const controller = new AbortController();

    set({
      messages: [...messages, optimisticUserMsg],
      isStreaming: true,
      streamingContent: "",
      abortController: controller,
      pendingApproval: null,
      truncated: false,
    });

    const conversationId = await streamChat({
      userPrompt: prompt,
      conversationId: activeConversationId ?? undefined,
      signal: controller.signal,

      // Fired on the response header, long before the answer finishes.
      // Adopting the id here — rather than after the stream — is what stops
      // /c/[id] from treating the navigation as a cold load and blanking the
      // messages out from under an in-flight turn.
      onConversationId: (id) => {
        if (!get().activeConversationId) {
          set({ activeConversationId: id });
        }
        onConversationId?.(id);
      },

      onToken: (token) => {
        set((state) => ({
          streamingContent: state.streamingContent + token,
        }));
      },

      onInterrupt: (request) => {
        // Streaming stops but `streamingContent` is deliberately kept: the
        // model often says "Let me check that for you…" before asking for the
        // tool, and that text belongs above the approval card.
        set({
          pendingApproval: request,
          isStreaming: false,
          abortController: null,
        });
      },

      onTruncated: () => {
        set({ truncated: true });
      },

      onComplete: () => {
        get().finishTurn();
      },

      onError: (error) => {
        console.error("[Chat] Stream error:", error);
        toast.error("Failed to get response", {
          description: error.message,
        });
        set({
          isStreaming: false,
          streamingContent: "",
          abortController: null,
          pendingApproval: null,
        });
      },
    });

    return conversationId;
  },

  resolveApproval: async (action, reason) => {
    const { activeConversationId, pendingApproval } = get();
    if (!activeConversationId || !pendingApproval) return;

    const controller = new AbortController();

    // Cleared before the request so a second click cannot fire a second
    // resume — the backend answers that with a 409, since the thread is no
    // longer waiting on anything.
    set({
      pendingApproval: null,
      isStreaming: true,
      abortController: controller,
    });

    await resumeChat({
      conversationId: activeConversationId,
      decision: reason ? { action, reason } : { action },
      signal: controller.signal,

      onToken: (token) => {
        set((state) => ({
          streamingContent: state.streamingContent + token,
        }));
      },

      // A turn can gate more than one tool, so resuming may pause again.
      onInterrupt: (request) => {
        set({
          pendingApproval: request,
          isStreaming: false,
          abortController: null,
        });
      },

      onTruncated: () => {
        set({ truncated: true });
      },

      onComplete: () => {
        get().finishTurn();
      },

      onError: (error) => {
        console.error("[Chat] Resume error:", error);
        toast.error("Failed to continue", { description: error.message });
        set({
          isStreaming: false,
          streamingContent: "",
          abortController: null,
        });
      },
    });
  },

  finishTurn: () => {
    const {
      streamingContent,
      messages: currentMsgs,
      activeConversationId: convId,
      truncated,
    } = get();

    if (!streamingContent.trim()) {
      set({
        isStreaming: false,
        streamingContent: "",
        abortController: null,
        truncated: false,
      });
      return;
    }

    const assistantMsg: Message = {
      message_id: `assistant-${Date.now()}`,
      conversation_id: convId ?? "",
      seq: currentMsgs.length,
      role: "assistant",
      content: streamingContent,
      route: null,
      tool_calls: [],
      // The answer ran out of budget rather than finishing. Same field the
      // backend already uses for an abandoned stream, and chat-message renders
      // a "cut off" note from it either way.
      partial: truncated,
      created_at: new Date().toISOString(),
    };

    set({
      messages: [...currentMsgs, assistantMsg],
      isStreaming: false,
      streamingContent: "",
      abortController: null,
      pendingApproval: null,
      truncated: false,
    });
  },
}));
