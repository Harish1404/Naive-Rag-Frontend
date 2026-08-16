"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Cloud,
  Database,
  FileText,
  GitBranch,
  Globe,
  Hash,
  Loader2,
  Mail,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  connectGitHub,
  disconnectGitHub,
  listConnectors,
  type Connector,
} from "@/lib/connectors";

/**
 * Presentation for each provider — icon, colour, blurb.
 *
 * Deliberately separate from status, which is whatever the backend says. The
 * two are joined at render time and keyed by `provider`, so these strings must
 * match the CATALOGUE in app/routes/connectors.py.
 */
const PRESENTATION: Record<
  string,
  { icon: LucideIcon; color: string; description: string }
> = {
  github: {
    icon: GitBranch,
    color: "#8B5CF6",
    description: "Access repositories, issues, and pull requests",
  },
  gmail: {
    icon: Mail,
    color: "#EA4335",
    description: "Connect your email for context-aware responses",
  },
  slack: {
    icon: Hash,
    color: "#E01E5A",
    description: "Search through your Slack workspace messages",
  },
  notion: {
    icon: FileText,
    color: "#000000",
    description: "Query your Notion pages and databases",
  },
  google_drive: {
    icon: Cloud,
    color: "#4285F4",
    description: "Access documents, sheets, and presentations",
  },
  postgres: {
    icon: Database,
    color: "#336791",
    description: "Query your databases with natural language",
  },
  web_search: {
    icon: Globe,
    color: "#00E5A0",
    description: "Search the web for real-time information",
  },
  google_calendar: {
    icon: Calendar,
    color: "#F4B400",
    description: "Check your schedule and manage events",
  },
  confluence: {
    icon: Search,
    color: "#0052CC",
    description: "Search your team's knowledge base",
  },
};

const FALLBACK = {
  icon: Globe,
  color: "#8B5CF6",
  description: "Connect this service via MCP",
};

export default function ConnectorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDisconnect, setConfirmDisconnect] = useState<Connector | null>(
    null
  );

  const { data: connectors, isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: listConnectors,
  });

  const connect = useMutation({
    mutationFn: connectGitHub,
    // Errors are surfaced by the axios interceptor already; this only stops
    // react-query from treating the rejection as unhandled.
    onError: () => {},
  });

  const disconnect = useMutation({
    mutationFn: disconnectGitHub,
    onSuccess: async () => {
      toast.success("Disconnected", {
        description: "GitHub access has been revoked.",
      });
      await queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
    onError: () => {},
  });

  /**
   * The OAuth callback sends the browser back here with a flag.
   *
   * Read straight off window.location rather than via useSearchParams, which
   * would opt this route into client-side rendering for a one-shot read. The
   * effect only touches external systems — a toast, the history entry, and the
   * query cache — so there is no setState here to cascade.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (!connected && !error) return;

    if (connected) {
      toast.success("Connected", {
        description: `Your ${connected} account is linked. Ask about your repositories in chat.`,
      });
    } else if (error) {
      toast.error("Could not connect", { description: error });
    }

    // Clear the flag so a refresh does not replay the toast.
    window.history.replaceState({}, "", "/connectors");
    void queryClient.invalidateQueries({ queryKey: ["connectors"] });
  }, [queryClient]);

  const busyProvider = connect.isPending
    ? "github"
    : disconnect.isPending
      ? "github"
      : null;

  const handleConnect = (connector: Connector) => {
    const { provider, label, status } = connector;

    if (status === "coming_soon") {
      toast.info(`${label} — Coming Soon`, {
        description:
          "This MCP connector is not yet available. Stay tuned for future updates!",
      });
      return;
    }

    if (provider !== "github") return;

    // Navigates away on success, so the pending state is never cleared here.
    connect.mutate();
  };

  const handleDisconnect = () => {
    if (!confirmDisconnect) return;
    setConfirmDisconnect(null);
    disconnect.mutate();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-lg tracking-tight">
              Connectors
            </h1>
            <p className="text-xs text-muted-foreground">
              Connect your tools and data sources via MCP
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading || !connectors
            ? Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-border/60 bg-card/50"
                >
                  <div className="h-11 w-11 rounded-xl bg-muted animate-pulse mb-4" />
                  <div className="h-4 w-24 rounded bg-muted animate-pulse mb-2" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-muted animate-pulse mt-1.5" />
                  <div className="h-6 w-28 rounded-full bg-muted animate-pulse mt-3" />
                </div>
              ))
            : connectors.map((connector) => {
                const look = PRESENTATION[connector.provider] ?? FALLBACK;
                const Icon = look.icon;
                const isConnected = connector.status === "connected";
                const isError = connector.status === "error";
                const isBusy = busyProvider === connector.provider;

                return (
                  <div
                    key={connector.provider}
                    className="group relative p-5 rounded-2xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                  >
                    {/* Subtle glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${look.color}08, transparent 70%)`,
                      }}
                    />

                    <div className="relative z-10">
                      {/* Icon */}
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${look.color}15` }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: look.color }}
                        />
                      </div>

                      {/* Content */}
                      <h3 className="font-semibold text-sm mb-1">
                        {connector.label}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isConnected && connector.account_login
                          ? `Connected as ${connector.account_login}`
                          : look.description}
                      </p>

                      {isError && connector.last_error && (
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive leading-relaxed">
                          <TriangleAlert className="h-3 w-3 mt-px shrink-0" />
                          {connector.last_error}
                        </p>
                      )}

                      {/* Status + action */}
                      <div className="mt-3 flex items-center gap-2">
                        {connector.status === "coming_soon" && (
                          <button
                            onClick={() => handleConnect(connector)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                            Coming Soon
                          </button>
                        )}

                        {isConnected && (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Connected
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => setConfirmDisconnect(connector)}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Disconnect"
                              )}
                            </Button>
                          </>
                        )}

                        {(connector.status === "available" || isError) && (
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleConnect(connector)}
                            className="h-7 px-3 text-[11px]"
                          >
                            {isBusy ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                Redirecting
                              </>
                            ) : isError ? (
                              "Reconnect"
                            ) : (
                              "Connect"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Disconnect confirmation */}
      <Dialog
        open={confirmDisconnect !== null}
        onOpenChange={(open) => !open && setConfirmDisconnect(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Disconnect {confirmDisconnect?.label}?
            </DialogTitle>
            <DialogDescription>
              This revokes the access token, so the assistant will no longer be
              able to read your{" "}
              {confirmDisconnect?.label ?? "account"} data. You can reconnect at
              any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setConfirmDisconnect(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
