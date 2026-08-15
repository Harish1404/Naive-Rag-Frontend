import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

// ── Configuration ────────────────────────────────────────────────────────────

const rawUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8000";

const API_BASE_URL = rawUrl.replace(/\/+$/, "");

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1s → 2s → 4s exponential backoff

// ── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  // Identity travels as an HttpOnly cookie the backend set, so every request
  // has to opt into sending credentials cross-origin. Without this the browser
  // silently omits the cookie and every call comes back 401.
  //
  // This replaces the old request interceptor, which injected a hardcoded
  // `user_id: "default_user"` into params and bodies. That made the *client*
  // the source of identity — anyone could act as anyone by editing one field.
  // The backend no longer accepts a user_id at all.
  withCredentials: true,
});

// ── Response Interceptor — Refresh, Retry, Error Handling ────────────────────

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _refreshAttempted?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Single-flight refresh.
 *
 * A page load fires several requests at once, so an expired access token
 * produces a burst of simultaneous 401s. Without this shared promise each one
 * would call /auth/refresh independently — and since refresh tokens rotate and
 * are single-use, the second call would present an already-spent token, which
 * the backend correctly treats as theft and punishes by revoking the whole
 * family. The user would be logged out simply for loading a busy page.
 *
 * Holding one in-flight promise means the burst produces exactly one rotation.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, null, { withCredentials: true })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Sends the user to sign-in, preserving where they were headed.
 *
 * A hard navigation rather than router.push() on purpose, and not only because
 * this module is outside React and has no access to the router: the session is
 * gone, so tearing down every in-memory store and cache is the point. A soft
 * push would leave the previous user's conversations sitting in zustand.
 */
function redirectToSignIn() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return;

  const target = encodeURIComponent(`${pathname}${search}`);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload is intentional; see above
  window.location.href = `/sign-in?redirect_url=${target}`;
}

api.interceptors.response.use(
  // Successful responses pass through untouched
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // ── 401: try one refresh, then replay the original request ──────────────
    if (status === 401 && config && !config._refreshAttempted) {
      config._refreshAttempted = true;

      // The refresh endpoint itself returning 401 means the session is truly
      // gone; retrying it would loop forever.
      if (!config.url?.includes("/auth/refresh")) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return api(config);
        }
        redirectToSignIn();
      }
      return Promise.reject(error);
    }

    // ── 403: authenticated but not allowed. Never retried ───────────────────
    if (status === 403) {
      const message =
        (error.response?.data as { detail?: string })?.detail ??
        "You do not have access to this.";
      toast.error("Access denied", { description: message, id: "api-error" });
      return Promise.reject(error);
    }

    // Only retry on network errors or 5xx server errors
    const isRetryable = !error.response || (status! >= 500 && status! < 600);

    if (config && isRetryable) {
      config._retryCount = config._retryCount ?? 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;

        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, config._retryCount - 1);
        const attempt = config._retryCount;

        console.warn(
          `[API] Retry ${attempt}/${MAX_RETRIES} for ${config.method?.toUpperCase()} ${config.url} in ${delay}ms`
        );

        toast.loading(`Connection issue — retrying (${attempt}/${MAX_RETRIES})...`, {
          id: "api-retry",
          duration: delay + 1000,
        });

        await sleep(delay);
        return api(config);
      }
    }

    // All retries exhausted or non-retryable error
    const message =
      (error.response?.data as { detail?: string })?.detail ??
      error.message ??
      "Something went wrong";

    if (!error.response) {
      toast.error("Backend unreachable", {
        description: "Could not connect to the server. Please check if it's running.",
        id: "api-error",
      });
    } else if (status === 404) {
      toast.error("Not found", { description: message, id: "api-error" });
    } else if (status === 422) {
      toast.error("Invalid request", { description: message, id: "api-error" });
    } else if (status && status >= 500) {
      toast.error("Server error", {
        description: "The server encountered an error. Please try again later.",
        id: "api-error",
      });
    }

    return Promise.reject(error);
  }
);

// ── Exports ──────────────────────────────────────────────────────────────────

export { api, API_BASE_URL, refreshSession };
export default api;
