"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Sparkles,
  ChevronDown,
  LogIn,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserMenu } from "@/components/auth/user-menu";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useChatStore } from "@/stores/chat-store";
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE_COUNT = 10;

interface AppSidebarProps {
  isAuthenticated?: boolean;
}

export function AppSidebar({ isAuthenticated = true }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { isOpen, toggleSidebar } = useSidebarStore();
  const { activeConversationId, clearChat } = useChatStore();

  // TanStack Query — only fetch when authenticated
  const { data: conversations = [], isLoading } = useConversations(isAuthenticated);
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();

  // Pagination state for sidebar chats
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleNewChat = useCallback(() => {
    clearChat();
    if (pathname !== "/") {
      router.push("/");
    }
  }, [clearChat, router, pathname]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/c/${id}`);
    },
    [router]
  );

  const openDeleteDialog = useCallback((id: string, title: string) => {
    setDeleteTarget({ id, title: title || "Untitled Chat" });
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;

    const isCurrentChat =
      activeConversationId === id ||
      pathname === `/c/${id}` ||
      (pathname?.includes(id) ?? false);

    deleteConversation.mutate(id);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);

    // If currently viewing this chat or it's active in the store, redirect to new chat
    if (isCurrentChat) {
      clearChat();
      router.replace("/");
    }
  }, [deleteTarget, deleteConversation, activeConversationId, pathname, clearChat, router]);

  const handleRenameSubmit = useCallback(async () => {
    if (renameId && renameValue.trim()) {
      renameConversation.mutate({ id: renameId, title: renameValue.trim() });
      setRenameDialogOpen(false);
      setRenameId(null);
      setRenameValue("");
    }
  }, [renameId, renameValue, renameConversation]);

  const openRenameDialog = useCallback((id: string, currentTitle: string) => {
    setRenameId(id);
    setRenameValue(currentTitle);
    setRenameDialogOpen(true);
  }, []);

  // Format relative time
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const validConversations = conversations.filter(
    (c) => (c.message_count ?? 0) > 0 || (c.last_message_preview && c.last_message_preview.trim() !== "")
  );

  const visibleConversations = validConversations.slice(0, visibleCount);
  const hasMore = validConversations.length > visibleCount;

  return (
    <>
      {/* Sidebar - Transition between w-64 (expanded) and w-16 (collapsed icon rail) */}
      <aside
        className={cn(
          "sidebar-transition h-screen flex flex-col bg-sidebar border-r border-sidebar-border relative z-20 shrink-0 select-none",
          isOpen ? "w-64" : "w-16 items-center"
        )}
      >
        {isOpen ? (
          /* ── EXPANDED MODE (w-64) ────────────────────────────────────────── */
          <>
            {/* Top Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-sidebar-border/60 shrink-0">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="font-heading font-semibold text-sm tracking-tight text-foreground truncate">
                  GenAI Amigos
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent shrink-0"
                onClick={toggleSidebar}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Actions: New Chat + Connectors */}
            <div className="p-3 space-y-1.5 border-b border-sidebar-border/40 shrink-0">
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 rounded-xl transition-all duration-200 shadow-md shadow-primary/15 text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/connectors")}
                className={cn(
                  "w-full justify-start gap-2 h-8 rounded-xl text-xs font-medium transition-all duration-200 border-sidebar-border/80 bg-sidebar-accent/30 hover:bg-sidebar-accent text-sidebar-foreground",
                  pathname === "/connectors" && "bg-sidebar-accent border-primary/40 text-primary"
                )}
              >
                <Plug className="h-3.5 w-3.5 text-primary" />
                <span>Connectors</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-semibold">
                  MCP
                </span>
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
              <div className="px-2 mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                  Recent Chats
                </span>
                {isAuthenticated && conversations.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {conversations.length}
                  </span>
                )}
              </div>

              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center h-36 text-muted-foreground text-xs text-center px-4">
                  <MessageSquare className="h-7 w-7 mb-2 opacity-30 text-primary" />
                  <p className="font-medium text-muted-foreground/80">Sign in to see your chats</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    Your history will appear here
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-1 px-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-sidebar-accent/20"
                    >
                      <div
                        className="h-3 bg-muted/60 rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      />
                      <div
                        className="h-2 bg-muted/40 rounded animate-pulse"
                        style={{ width: `${40 + Math.random() * 40}%` }}
                      />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-muted-foreground text-xs text-center px-4">
                  <MessageSquare className="h-7 w-7 mb-2 opacity-30 text-primary" />
                  <p className="font-medium text-muted-foreground/80">No chats yet</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    Start a new conversation above
                  </p>
                </div>
              ) : (
                <>
                  {visibleConversations.map((conv) => {
                    const isActive =
                      activeConversationId === conv.conversation_id ||
                      pathname === `/c/${conv.conversation_id}`;
                    return (
                      <DropdownMenu key={conv.conversation_id}>
                        <div className="group relative">
                          <button
                            onClick={() => handleSelectConversation(conv.conversation_id)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex flex-col justify-center",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium ring-1 ring-sidebar-border"
                                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                            )}
                          >
                            <p className="font-medium truncate text-[13px] leading-tight pr-6">
                              {conv.title || "Untitled Chat"}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 mt-1">
                              <span className="truncate max-w-[130px]">
                                {conv.last_message_preview || "No messages"}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-1">
                                {formatTime(conv.updated_at)}
                              </span>
                            </div>
                          </button>

                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "absolute top-2.5 right-2 h-6 w-6 rounded-md flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/80"
                              )}
                              title="Options"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="3" r="1.5" />
                                <circle cx="8" cy="8" r="1.5" />
                                <circle cx="8" cy="13" r="1.5" />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() =>
                                openRenameDialog(conv.conversation_id, conv.title || "")
                              }
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                openDeleteDialog(conv.conversation_id, conv.title || "")
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </div>
                      </DropdownMenu>
                    );
                  })}

                  {hasMore && (
                    <div className="pt-1 pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVisibleCount((prev) => prev + 10)}
                        className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 justify-center gap-1.5 rounded-xl border border-dashed border-sidebar-border/60"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>Show more ({validConversations.length - visibleCount})</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Expanded Footer */}
            <div className="p-2 border-t border-sidebar-border/40 shrink-0">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => router.push("/sign-in")}
                  className="w-full justify-center gap-2 h-9 rounded-xl text-xs font-medium border-primary/40 text-primary hover:bg-primary/10 transition-all duration-200"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </Button>
              )}
            </div>
          </>
        ) : (
          /* ── COLLAPSED ICON-RAIL MODE (w-16) ─────────────────────────────── */
          <>
            {/* Top Branding / Expand toggle */}
            <div className="p-3 border-b border-sidebar-border/60 flex flex-col items-center gap-2 shrink-0">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 rounded-xl bg-primary/15 hover:bg-primary/25 flex items-center justify-center ring-1 ring-primary/20 transition-colors"
                title="Expand sidebar"
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </button>
            </div>

            {/* Quick Action Icons */}
            <div className="p-2 flex flex-col items-center gap-2 border-b border-sidebar-border/40 shrink-0">
              <Button
                variant="default"
                size="icon"
                onClick={handleNewChat}
                className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/15"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/connectors")}
                className={cn(
                  "h-9 w-9 rounded-xl border-sidebar-border/80 bg-sidebar-accent/30 hover:bg-sidebar-accent text-sidebar-foreground",
                  pathname === "/connectors" && "bg-sidebar-accent border-primary/40 text-primary"
                )}
                title="Connectors (MCP)"
              >
                <Plug className="h-4 w-4 text-primary" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Collapsed Footer: Compact User Menu or Login icon */}
            <div className="p-2 border-t border-sidebar-border/40 shrink-0 flex items-center justify-center">
              {isAuthenticated ? (
                <UserMenu compact />
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/sign-in")}
                  className="h-9 w-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10"
                  title="Sign in"
                >
                  <LogIn className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.title}&rdquo;
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteConversation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteConversation.isPending}
              className="gap-1.5"
            >
              {deleteConversation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter new title..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
