"use client";

import { useSidebarStore } from "@/stores/sidebar-store";
import { useChatStore } from "@/stores/chat-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, Share2, Sparkles, Cpu, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ChatHeaderProps {
  title?: string;
}

export function ChatHeader({ title }: ChatHeaderProps) {
  const { isOpen, toggleSidebar } = useSidebarStore();
  const { messages } = useChatStore();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!", {
        description: "Anyone with this link can view this conversation context.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-background/60 backdrop-blur-xl border-b border-border/40 shrink-0 min-h-[52px] transition-all">
      {/* Left: Sidebar toggle + Title / Model Badge */}
      <div className="flex items-center gap-3">
        {!isOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
            onClick={toggleSidebar}
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          {title ? (
            <h2 className="font-medium text-sm text-foreground truncate max-w-[220px] sm:max-w-[350px]">
              {title}
            </h2>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                RAG Chat
              </span>
            </div>
          )}

          {/* Model Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium">
            <Cpu className="h-3 w-3" />
            <span>Llama 3.1 8B</span>
          </div>
        </div>
      </div>

      {/* Right: Actions (Share, Theme Toggle) */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5"
          title="Share conversation"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-secondary" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Share</span>
        </Button>

        <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />

        <ThemeToggle />
      </div>
    </header>
  );
}
