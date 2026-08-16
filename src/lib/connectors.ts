import { api } from "@/lib/api";

/**
 * Connectors — linking a third-party account so its MCP tools reach the chat.
 *
 * Everything here goes through the shared `api` instance, so cookie auth, the
 * single-flight refresh and the retry/backoff behaviour all apply unchanged.
 */

export type ConnectorStatus =
  | "available"
  | "connected"
  | "error"
  | "coming_soon";

export interface Connector {
  provider: string;
  label: string;
  status: ConnectorStatus;
  account_login?: string | null;
  account_avatar_url?: string | null;
  scopes: string[];
  connected_at?: string | null;
  last_used_at?: string | null;
  last_error?: string | null;
}

/** Every provider the page can show, with this user's status on each. */
export async function listConnectors(): Promise<Connector[]> {
  const { data } = await api.get<Connector[]>("/connectors");
  return data;
}

/**
 * Begin GitHub consent.
 *
 * The backend hands back a URL and we navigate to it, rather than the backend
 * answering with a 302. This call is an XHR: axios would follow a redirect to
 * github.com itself and the request would die on CORS before the user ever saw
 * a consent screen. Only a real browser navigation works.
 */
export async function connectGitHub(): Promise<void> {
  const { data } = await api.get<{ authorize_url: string }>(
    "/connectors/github/authorize"
  );
  window.location.href = data.authorize_url;
}

/** Revoke the token at GitHub and forget the connection. */
export async function disconnectGitHub(): Promise<void> {
  await api.delete("/connectors/github");
}
