"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { clearPendingPrompt } from "@/lib/pending-prompt";
import type { MeResponse } from "@/types/auth";

/**
 * Bridges Clerk's session to this app's own.
 *
 * Clerk proves *who* someone is; the FastAPI backend decides whether they may
 * act, and issues its own HttpOnly cookies to say so. Nothing in the app can
 * call the backend until those cookies exist, so this runs the exchange once on
 * sign-in and blocks the UI behind it — otherwise the first requests of every
 * session would race the cookie and 401.
 *
 * The Clerk token is sent exactly once, here. Every later request, including
 * the voice WebSocket, rides the cookie instead.
 */

type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionContextValue {
  status: SessionStatus;
  me: MeResponse | null;
  error: string | null;
  /** Re-runs the exchange — used by the retry button. */
  retry: () => void;
  /** Merges a fresh /auth/me payload in after a profile edit. */
  setMe: (me: MeResponse) => void;
}

const SessionContext = createContext<SessionContextValue>({
  status: "loading",
  me: null,
  error: null,
  retry: () => {},
  setMe: () => {},
});

export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  /**
   * Only the *exchange* is tracked as state. Whether the user is signed in at
   * all is Clerk's fact, so it is derived below rather than mirrored into a
   * second copy — mirroring it would mean writing state from an effect purely
   * to restate something React already knows, and the two could disagree
   * for a render.
   */
  const [exchange, setExchange] = useState<"idle" | "done" | "failed" | "denied">(
    "idle"
  );
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const status: SessionStatus = !isLoaded
    ? "loading"
    : !isSignedIn || exchange === "denied"
      ? "unauthenticated"
      : exchange === "failed"
        ? "error"
        : exchange === "done"
          ? "authenticated"
          : "loading";

  // Guards against React strict mode double-invoking the effect, which would
  // otherwise establish two sessions and leave an orphaned token family.
  const inFlight = useRef(false);

  // Whose data is currently sitting in the zustand stores.
  const loadedUserId = useRef<string | null>(null);

  const establish = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const token = await getToken();
      if (!token) {
        setExchange("denied");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = body?.detail ?? `Sign-in failed (${response.status})`;

        // 403 is a real decision — banned or unverified — not a glitch, so it
        // resolves to "unauthenticated" rather than offering a retry button.
        // The backend's reason is shown either way.
        setError(detail);
        setExchange(response.status === 403 ? "denied" : "failed");
        return;
      }

      const data = (await response.json()) as MeResponse;

      // Wipe client state when the account changes.
      //
      // The zustand stores are module-level singletons, so signing out and
      // signing in as someone else in the same tab would otherwise leave the
      // previous user's conversations and messages on screen until something
      // refetched. Keyed on user_id rather than on sign-out so it also covers a
      // direct account switch, where isSignedIn never flips to false.
      const incomingId = data.user.user_id;
      if (loadedUserId.current !== null && loadedUserId.current !== incomingId) {
        useChatStore.getState().clearChat();
        clearPendingPrompt();
      }
      loadedUserId.current = incomingId;

      setMe(data);
      setError(null);
      setExchange("done");
    } catch {
      setError("Could not reach the server. Is the backend running?");
      setExchange("failed");
    } finally {
      inFlight.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // set-state-in-effect is a false positive here: establish() awaits before
    // it ever writes state, so nothing is set synchronously in the effect body.
    // Synchronising React with an external system — here, exchanging a Clerk
    // token for a backend session — is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void establish();
  }, [isLoaded, isSignedIn, establish, attempt]);

  return (
    <SessionContext.Provider
      value={{
        status,
        me,
        error,
        retry: () => {
          setExchange("idle");
          setAttempt((n) => n + 1);
        },
        setMe,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
