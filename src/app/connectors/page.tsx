"use client";

import type { ComponentType } from "react";
import { ArrowLeft, Globe } from "lucide-react";
import {
  SiGithub,
  SiGmail,
  SiNotion,
  SiGoogledrive,
  SiPostgresql,
  SiGooglecalendar,
  SiConfluence,
} from "@icons-pack/react-simple-icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function SlackIcon({ size = 20, color = "#E01E5A" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill={color}
      />
    </svg>
  );
}

import { Button } from "@/components/ui/button";
import { CONNECTORS, type Connector } from "@/lib/connectors";

/**
 * Presentation for each provider — icon, colour, blurb.
 *
 * Deliberately separate from the catalogue in src/lib/connectors.ts, and joined
 * at render time on `provider`. Icons use @icons-pack/react-simple-icons for
 * actual brand marks.
 */

interface ProviderPresentation {
  icon: ComponentType<{ size?: number; color?: string; className?: string }>;
  color: string;
  description: string;
}

const PRESENTATION: Record<string, ProviderPresentation> = {
  github: {
    icon: SiGithub,
    color: "#8B5CF6",
    description: "Access repositories, issues, and pull requests",
  },
  gmail: {
    icon: SiGmail,
    color: "#EA4335",
    description: "Connect your email for context-aware responses",
  },
  slack: {
    icon: SlackIcon,
    color: "#E01E5A",
    description: "Search through your Slack workspace messages",
  },
  notion: {
    icon: SiNotion,
    color: "#000000",
    description: "Query your Notion pages and databases",
  },
  google_drive: {
    icon: SiGoogledrive,
    color: "#4285F4",
    description: "Access documents, sheets, and presentations",
  },
  postgres: {
    icon: SiPostgresql,
    color: "#336791",
    description: "Query your databases with natural language",
  },
  web_search: {
    icon: Globe,
    color: "#00E5A0",
    description: "Search the web for real-time information",
  },
  google_calendar: {
    icon: SiGooglecalendar,
    color: "#F4B400",
    description: "Check your schedule and manage events",
  },
  confluence: {
    icon: SiConfluence,
    color: "#0052CC",
    description: "Search your team's knowledge base",
  },
};

const FALLBACK: ProviderPresentation = {
  icon: Globe,
  color: "#8B5CF6",
  description: "Connect this service via MCP",
};

export default function ConnectorsPage() {
  const router = useRouter();

  /**
   * Every provider is coming soon, so every card does the same thing.
   *
   * No network call and no react-query here on purpose: there is no
   * `/connectors` endpoint on the backend, and asking for one only produced a
   * 404 and a permanent skeleton grid.
   */
  const handleClick = (connector: Connector) => {
    toast.info(`${connector.label} — Coming Soon`, {
      description:
        "This MCP connector isn't available yet. Stay tuned for future updates!",
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-background">
      {/* Header — solid background, no glass effect */}
      <div className="sticky top-0 z-20 w-full bg-background border-b border-border/50">
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
          {CONNECTORS.map((connector) => {
            const look = PRESENTATION[connector.provider] ?? FALLBACK;
            const Icon = look.icon;

            return (
              // The whole card is the target, rather than just the pill —
              // there is only one thing to do here, so anywhere is fine.
              <button
                key={connector.provider}
                type="button"
                onClick={() => handleClick(connector)}
                className="group relative p-5 rounded-2xl border border-border/60 bg-card/50 text-left hover:bg-card hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                    <Icon size={20} color={look.color} />
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-sm mb-1">{connector.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {look.description}
                  </p>

                  {/* Status */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                      Coming Soon
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
