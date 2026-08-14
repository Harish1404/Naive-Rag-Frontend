"use client";

import {
  ArrowLeft,
  Mail,
  GitBranch,
  Hash,
  FileText,
  Cloud,
  Database,
  Globe,
  Calendar,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CONNECTORS = [
  {
    name: "Gmail",
    description: "Connect your email for context-aware responses",
    icon: Mail,
    color: "#EA4335",
    status: "coming_soon" as const,
  },
  {
    name: "GitHub",
    description: "Access repositories, issues, and pull requests",
    icon: GitBranch,
    color: "#8B5CF6",
    status: "coming_soon" as const,
  },
  {
    name: "Slack",
    description: "Search through your Slack workspace messages",
    icon: Hash,
    color: "#E01E5A",
    status: "coming_soon" as const,
  },
  {
    name: "Notion",
    description: "Query your Notion pages and databases",
    icon: FileText,
    color: "#000000",
    status: "coming_soon" as const,
  },
  {
    name: "Google Drive",
    description: "Access documents, sheets, and presentations",
    icon: Cloud,
    color: "#4285F4",
    status: "coming_soon" as const,
  },
  {
    name: "PostgreSQL",
    description: "Query your databases with natural language",
    icon: Database,
    color: "#336791",
    status: "coming_soon" as const,
  },
  {
    name: "Web Search",
    description: "Search the web for real-time information",
    icon: Globe,
    color: "#00E5A0",
    status: "coming_soon" as const,
  },
  {
    name: "Google Calendar",
    description: "Check your schedule and manage events",
    icon: Calendar,
    color: "#F4B400",
    status: "coming_soon" as const,
  },
  {
    name: "Confluence",
    description: "Search your team's knowledge base",
    icon: Search,
    color: "#0052CC",
    status: "coming_soon" as const,
  },
];

export default function ConnectorsPage() {
  const router = useRouter();

  const handleConnect = (name: string) => {
    toast.info(`${name} — Coming Soon`, {
      description:
        "This MCP connector is not yet available. Stay tuned for future updates!",
    });
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
          {CONNECTORS.map((connector) => (
            <button
              key={connector.name}
              onClick={() => handleConnect(connector.name)}
              className="group relative p-5 rounded-2xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 text-left overflow-hidden"
            >
              {/* Subtle glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${connector.color}08, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${connector.color}15`,
                  }}
                >
                  <connector.icon
                    className="h-5 w-5"
                    style={{ color: connector.color }}
                  />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-sm mb-1">{connector.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {connector.description}
                </p>

                {/* Status Badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                  Coming Soon
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
