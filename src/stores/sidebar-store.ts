import { create } from "zustand";
import type { Conversation } from "@/types/chat";
import api from "@/lib/api";
import { toast } from "sonner";

interface SidebarState {
  // ── State ──────────────────────────────────────────────────────────────────
  conversations: Conversation[];
  isLoading: boolean;
  isOpen: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  fetchConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  conversations: [],
  isLoading: false,
  isOpen: true,

  toggleSidebar: () => set((s) => ({ isOpen: !s.isOpen })),
  setSidebarOpen: (open) => set({ isOpen: open }),

  fetchConversations: async () => {
    set({ isLoading: true });

    try {
      const { data } = await api.get<Conversation[]>("/conversations", {
        params: { limit: 50, skip: 0 },
      });
      set({ conversations: data, isLoading: false });
    } catch {
      set({ isLoading: false });
      // Toast is already handled by the axios interceptor
    }
  },

  deleteConversation: async (id) => {
    try {
      await api.delete(`/conversations/${id}`);
      set((s) => ({
        conversations: s.conversations.filter((c) => c.conversation_id !== id),
      }));
      toast.success("Conversation deleted");
    } catch {
      // Toast already handled by interceptor
    }
  },

  renameConversation: async (id, title) => {
    try {
      const { data } = await api.patch<Conversation>(`/conversations/${id}`, {
        title,
      });
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.conversation_id === id ? { ...c, title: data.title } : c
        ),
      }));
      toast.success("Conversation renamed");
    } catch {
      // Toast already handled by interceptor
    }
  },
}));
