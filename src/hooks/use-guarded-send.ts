"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { useChatStore } from "@/stores/chat-store";
import { useSession } from "@/components/auth/session-provider";
import { savePendingPrompt, takePendingPrompt } from "@/lib/pending-prompt";
import { useOptimisticInsert } from "@/hooks/use-conversations";

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
  // optimisticInsert already revalidates in the background, so there is no
  // separate invalidation to fire here.
  const optimisticInsert = useOptimisticInsert();

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

      // Navigation happens on the *header*, not on the finished answer.
      //
      // This used to `await sendMessage(...)` first, which only resolves once
      // the whole stream has completed — so the user watched the answer
      // generate on `/` and was thrown to /c/{id} at the very end. Worse, the
      // store adopted the id just as late, so arriving at /c/{id} looked like
      // a cold load and blanked the messages that had just streamed in.
      //
      // sendMessage now hands the id over the moment X-Conversation-Id is
      // read, and has already set it as the active conversation by then.
      const conversationId = await sendMessage(prompt, (id) => {
        // Optimistically insert the new conversation into the sidebar cache
        // so it appears instantly, then revalidate in background
        optimisticInsert(id, prompt.slice(0, 60));
        router.push(`/c/${id}`);
      });

      return conversationId;
    },
    [isLoaded, isSignedIn, sendMessage, optimisticInsert, router]
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
