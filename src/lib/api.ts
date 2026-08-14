import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

// ── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000";

const PLACEHOLDER_USER_ID = "default_user";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1s → 2s → 4s exponential backoff

// ── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject the placeholder user_id into every request that uses params
    if (config.params) {
      config.params = {
        user_id: PLACEHOLDER_USER_ID,
        ...config.params,
      };
    }

    // For POST/PATCH bodies, inject user_id when the body is an object
    if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
      config.data = {
        user_id: PLACEHOLDER_USER_ID,
        ...config.data,
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — Retry + Error Handling ────────────────────────────

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  // Successful responses pass through untouched
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    // Only retry on network errors or 5xx server errors
    const isRetryable =
      !error.response || (error.response.status >= 500 && error.response.status < 600);

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
    const status = error.response?.status;
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

export { api, API_BASE_URL, PLACEHOLDER_USER_ID };
export default api;
