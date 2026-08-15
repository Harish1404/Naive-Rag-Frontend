"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/session-provider";

/**
 * Decides what the frame around a page looks like.
 *
 * Three cases, and the split matters:
 *
 *   Auth pages    render bare — no sidebar, no session gate, or signing in
 *                 would require being signed in.
 *   Signed out    render the page alone. `/` is public so a visitor sees the
 *                 real chat UI; proxy.ts blocks every other route already.
 *   Signed in     wait for the backend session to exist before rendering the
 *                 app, so no child component fires a request that 401s.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { status, error, retry } = useSession();
  const pathname = usePathname();

  const isAuthPage =
    pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  if (isAuthPage) {
    return <main className="flex-1 flex flex-col h-screen overflow-hidden">{children}</main>;
  }

  // Clerk has not resolved yet. Showing the page now would flash a signed-out
  // frame for anyone who is actually signed in.
  if (!isLoaded) {
    return <FullScreenSpinner label="Loading" />;
  }

  if (!isSignedIn) {
    return (
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {children}
      </main>
    );
  }

  if (status === "loading") {
    return <FullScreenSpinner label="Preparing your workspace" />;
  }

  if (status === "error") {
    return (
      <main className="flex-1 flex items-center justify-center h-screen p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-heading font-semibold text-base">
              Could not start your session
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error ?? "Something went wrong while signing you in."}
            </p>
          </div>
          <Button onClick={retry} variant="outline" className="gap-2 rounded-xl">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <AppSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {children}
      </main>
    </>
  );
}

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <main className="flex-1 flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground tracking-wide">{label}…</p>
      </div>
    </main>
  );
}
