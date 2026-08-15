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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Sidebar footer: who is signed in, and how to leave.
 *
 * Signing out has to end *both* sessions. Clerk's signOut() clears the identity
 * side; POST /auth/logout revokes the refresh token and clears the backend
 * cookies. Doing only one leaves a live session on the other — Clerk-only would
 * leave working API cookies behind, backend-only would silently sign the user
 * straight back in on the next page load.
 */
export function UserMenu() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { me } = useSession();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Backend first: it needs the cookies that Clerk's redirect would
      // otherwise tear down before this request is sent.
      await api.post("/auth/logout").catch(() => {
        // A failed revoke must not trap the user in a signed-in UI. The token
        // still expires on its own, and Clerk sign-out below always runs.
      });
      await signOut({ redirectUrl: "/sign-in" });
    } finally {
      setSigningOut(false);
    }
  };

  const username = me?.profile.username || me?.user.email?.split("@")[0] || "Account";
  const email = me?.user.email ?? "";
  const avatar = me?.profile.avatar_url || undefined;
  const initial = (username || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56 rounded-xl">
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
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2 text-xs text-destructive focus:text-destructive"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
