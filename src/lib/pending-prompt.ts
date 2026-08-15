/**
 * Carries a prompt across the sign-in detour.
 *
 * A signed-out visitor sees the real chat UI and can type into it. On submit we
 * stash the draft here, send them to sign-in, and replay it once they land back
 * in the app — so signing in reads as a step toward their answer rather than a
 * toll gate, and nothing they typed is lost.
 *
 * sessionStorage, not localStorage: this is scoped to one tab and one detour.
 * A draft that outlived the browser session would resurface days later and
 * send a message the user had forgotten writing.
 */

const KEY = "rag:pending-prompt";

/** Longer than any sign-in flow, short enough that a stale draft never fires. */
const MAX_AGE_MS = 30 * 60 * 1000;

interface StoredPrompt {
  prompt: string;
  savedAt: number;
}

export function savePendingPrompt(prompt: string): void {
  const trimmed = prompt.trim();
  if (!trimmed || typeof window === "undefined") return;

  try {
    const payload: StoredPrompt = { prompt: trimmed, savedAt: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Storage disabled or full. The prompt is lost, but sign-in still works —
    // never let this break the redirect.
  }
}

/**
 * Reads and clears the stored prompt.
 *
 * Consuming on read is deliberate: it makes replay idempotent, so a component
 * that mounts twice (React strict mode, a fast re-render) cannot send the same
 * message two times.
 */
export function takePendingPrompt(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(KEY);

    const parsed = JSON.parse(raw) as StoredPrompt;
    if (!parsed?.prompt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;

    return parsed.prompt;
  } catch {
    return null;
  }
}

export function clearPendingPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
