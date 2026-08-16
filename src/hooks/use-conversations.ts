"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Conversation } from "@/types/chat";
import { toast } from "sonner";

const CONVERSATIONS_KEY = ["conversations"] as const;

/**
 * Fetches conversations from the backend via TanStack Query.
 *
 * Replaces the zustand-based fetchConversations approach so that:
 * - Data is cached and doesn't re-fetch on every route change
 * - Optimistic updates work natively for instant sidebar additions
 * - staleTime prevents request waterfalls on navigation
 *
 * The `enabled` flag lets the sidebar skip the query entirely when the user is
 * not authenticated, avoiding 401 responses.
 */
export function useConversations(enabled = true) {
  return useQuery<Conversation[]>({
    queryKey: CONVERSATIONS_KEY,
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>("/conversations", {
        params: { limit: 50, skip: 0 },
      });
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Optimistically inserts a brand-new conversation into the cache.
 *
 * Called right after sendMessage returns a conversation_id for the first
 * message. The entry appears in the sidebar instantly; a background
 * invalidation then replaces it with the real server data.
 */
export function useOptimisticInsert() {
  const queryClient = useQueryClient();

  return (conversationId: string, title: string) => {
    const optimistic: Conversation = {
      conversation_id: conversationId,
      user_id: "",
      title: title || "New Chat",
      message_count: 1,
      last_message_preview: title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    queryClient.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) => {
      if (!old) return [optimistic];
      // Avoid duplicates if the conversation already exists
      if (old.some((c) => c.conversation_id === conversationId)) return old;
      return [optimistic, ...old];
    });

    // Revalidate in background for consistency
    void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
  };
}

/** Delete a conversation with optimistic removal from sidebar. */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conversations/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previous = queryClient.getQueryData<Conversation[]>(CONVERSATIONS_KEY);
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) =>
        old?.filter((c) => c.conversation_id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(CONVERSATIONS_KEY, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSuccess: () => {
      toast.success("Conversation deleted");
    },
  });
}

/** Rename a conversation with optimistic update. */
export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data } = await api.patch<Conversation>(`/conversations/${id}`, {
        title,
      });
      return data;
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previous = queryClient.getQueryData<Conversation[]>(CONVERSATIONS_KEY);
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) =>
        old?.map((c) =>
          c.conversation_id === id ? { ...c, title } : c
        ) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CONVERSATIONS_KEY, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSuccess: () => {
      toast.success("Conversation renamed");
    },
  });
}

/** Invalidate the conversations cache manually. */
export function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
}
