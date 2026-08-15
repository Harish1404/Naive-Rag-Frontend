"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { useChatStore } from "@/stores/chat-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useSession } from "@/components/auth/session-provider";
import { savePendingPrompt, takePendingPrompt } from "@/lib/pending-prompt";

/**
 * Sending a message, with the sign-in detour handled.
 *
 * `/` is public so a visitor sees the real chat UI rather than a wall — for a
 * chatbot the interface is the pitch. The gate is at submit, not at page load:
 * we stash the draft, send them to sign-in, and replay it when they come back,
 * so the detour costs them nothing they typed.
 *
 * Replay waits on the *backend* session, not just Clerk's. Firing as soon as
 * Clerk reports signed-in would race the cookie exchange in SessionProvider and
 * the request would 401.
 */
export function useGuardedSend() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { status } = useSession();

  const { sendMessage } = useChatStore();
  const { fetchConversations } = useSidebarStore();

  // takePendingPrompt() clears as it reads, but the send is async — without
  // this flag a second render could start a duplicate turn before the first
  // one has set isStreaming.
  const replayed = useRef(false);

  const send = useCallback(
    async (prompt: string) => {
      if (isLoaded && !isSignedIn) {
        savePendingPrompt(prompt);
        router.push(`/sign-in?redirect_url=${encodeURIComponent("/")}`);
        return null;
      }

      const conversationId = await sendMessage(prompt);
      if (conversationId) {
        await fetchConversations();
        router.push(`/c/${conversationId}`);
      }
      return conversationId;
    },
    [isLoaded, isSignedIn, sendMessage, fetchConversations, router]
  );

  useEffect(() => {
    if (replayed.current) return;
    if (status !== "authenticated") return;

    const pending = takePendingPrompt();
    if (!pending) return;

    replayed.current = true;
    void send(pending);
  }, [status, send]);

  return send;
}
