import { create } from "zustand";

/**
 * Sidebar UI state — only tracks open/close.
 *
 * Conversation data has moved to TanStack Query (see use-conversations.ts)
 * for proper caching, optimistic updates, and instant sidebar additions.
 */
interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  toggleSidebar: () => set((s) => ({ isOpen: !s.isOpen })),
  setSidebarOpen: (open) => set({ isOpen: open }),
}));
