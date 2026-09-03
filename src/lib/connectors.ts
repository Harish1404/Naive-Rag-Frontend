/**
 * Connectors — the MCP integrations the assistant will eventually reach.
 *
 * This catalogue is static and lives entirely on the client. There is no
 * `/connectors` endpoint on the backend, and the page used to call one: the
 * request 404'd, the axios interceptor raised a "Not found" toast, and the grid
 * sat on loading skeletons forever.
 *
 * Every provider is `coming_soon` until the MCP work lands. When it does, this
 * constant is what a real `GET /connectors` response should replace — the shape
 * is unchanged, so only the data source moves.
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

/**
 * The nine providers the page renders.
 *
 * `provider` is the join key with the PRESENTATION map in
 * src/app/connectors/page.tsx, which supplies each one's icon and blurb — so
 * these strings must not be renamed on their own.
 */
export const CONNECTORS: Connector[] = [
  { provider: "github", label: "GitHub", status: "coming_soon", scopes: [] },
  { provider: "gmail", label: "Gmail", status: "coming_soon", scopes: [] },
  { provider: "slack", label: "Slack", status: "coming_soon", scopes: [] },
  { provider: "notion", label: "Notion", status: "coming_soon", scopes: [] },
  {
    provider: "google_drive",
    label: "Google Drive",
    status: "coming_soon",
    scopes: [],
  },
  { provider: "postgres", label: "PostgreSQL", status: "coming_soon", scopes: [] },
  { provider: "web_search", label: "Web Search", status: "coming_soon", scopes: [] },
  {
    provider: "google_calendar",
    label: "Google Calendar",
    status: "coming_soon",
    scopes: [],
  },
  { provider: "confluence", label: "Confluence", status: "coming_soon", scopes: [] },
];
