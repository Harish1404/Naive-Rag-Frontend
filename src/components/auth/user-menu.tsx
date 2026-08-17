"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { User, LogOut, Plug, Sun, Moon, Loader2, ChevronsUpDown } from "lucide-react";
import { useTheme } from "next-themes";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { me } = useSession();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await api.post("/auth/logout").catch(() => {});
      await signOut({ redirectUrl: "/sign-in" });
    } finally {
      setSigningOut(false);
      setLogoutModalOpen(false);
    }
  };

  const username = me?.profile.username || me?.user.email?.split("@")[0] || "Account";
  const email = me?.user.email ?? "";
  const avatar = me?.profile.avatar_url || undefined;
  const initial = (username || "U").charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <button
              className={cn(
                "h-10 w-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200",
                "hover:bg-sidebar-accent hover:ring-1 hover:ring-sidebar-border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
              title={username}
            >
              <Avatar className="h-8 w-8 ring-1 ring-sidebar-border/60">
                <AvatarImage src={avatar} alt={username} />
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <button
              className={cn(
                "w-full flex items-center gap-2.5 p-2 rounded-xl text-left",
                "hover:bg-sidebar-accent transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0 ring-1 ring-sidebar-border/60">
                <AvatarImage src={avatar} alt={username} />
                <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-sidebar-foreground">
                  {username}
                </p>
                {email && (
                  <p className="text-[10px] text-muted-foreground/70 truncate">{email}</p>
                )}
              </div>

              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={compact ? "center" : "start"}
          side={compact ? "right" : "top"}
          sideOffset={8}
          className="w-56 rounded-xl"
        >
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            Signed in as
            <span className="block text-xs font-medium text-foreground truncate">
              {email || username}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-2 text-xs">
            <User className="h-3.5 w-3.5" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push("/connectors")} className="gap-2 text-xs">
            <Plug className="h-3.5 w-3.5" />
            Connectors
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="gap-2 text-xs"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setLogoutModalOpen(true)}
            className="gap-2 text-xs text-destructive focus:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out of GenAI Amigos?</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your chat history and connectors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setLogoutModalOpen(false)}
              disabled={signingOut}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-2"
            >
              {signingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
