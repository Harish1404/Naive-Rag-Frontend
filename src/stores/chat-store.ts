import { create } from "zustand";
import type { Message } from "@/types/chat";
import { streamChat } from "@/lib/stream";
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

  // ── Actions ────────────────────────────────────────────────────────────────
  sendMessage: (prompt: string) => Promise<string | null>;
  loadConversation: (conversationId: string) => Promise<void>;
  clearChat: () => void;
  stopStreaming: () => void;
  setActiveConversationId: (id: string | null) => void;
  /** Push a finished message straight in. Used by voice turns, which are
   *  produced by the voice socket rather than by sendMessage. */
  appendMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  isLoadingHistory: false,
  abortController: null,

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
    });
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  loadConversation: async (conversationId) => {
    set({ isLoadingHistory: true, messages: [], activeConversationId: conversationId });

    try {
      const { data } = await api.get(`/conversations/${conversationId}`, {
        params: { limit: 200 },
      });
      set({
        messages: data.messages ?? [],
        isLoadingHistory: false,
      });
    } catch {
      toast.error("Failed to load conversation");
      set({ isLoadingHistory: false });
    }
  },

  sendMessage: async (prompt) => {
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
    });

    const conversationId = await streamChat({
      userPrompt: prompt,
      conversationId: activeConversationId ?? undefined,
      signal: controller.signal,

      onToken: (token) => {
        set((state) => ({
          streamingContent: state.streamingContent + token,
        }));
      },

      onComplete: () => {
        const { streamingContent, messages: currentMsgs, activeConversationId: convId } = get();

        // Add the completed assistant message
        const assistantMsg: Message = {
          message_id: `assistant-${Date.now()}`,
          conversation_id: convId ?? "",
          seq: currentMsgs.length,
          role: "assistant",
          content: streamingContent,
          route: null,
          tool_calls: [],
          partial: false,
          created_at: new Date().toISOString(),
        };

        set({
          messages: [...currentMsgs, assistantMsg],
          isStreaming: false,
          streamingContent: "",
          abortController: null,
        });
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
        });
      },
    });

    // If this was a new chat, update the active conversation id
    if (conversationId && !activeConversationId) {
      set({ activeConversationId: conversationId });
    }

    return conversationId;
  },
}));
