"use client";

import { SignIn } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { AuthBackdrop, clerkAppearance } from "@/components/auth/auth-backdrop";

/**
 * Catch-all route (`[[...sign-in]]`) because Clerk drives its own sub-routes
 * for factor-two, SSO callbacks and password reset underneath this path.
 */
export default function SignInPage() {
  return (
    <AuthBackdrop>
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-heading font-semibold text-base tracking-tight">
            RAG Chat
          </span>
        </div>

        <div className="text-center space-y-1.5 max-w-xs">
          <h1 className="font-heading font-bold text-xl tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in to pick up your conversations where you left off.
          </p>
        </div>

        <SignIn
          appearance={clerkAppearance}
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
        />
      </div>
    </AuthBackdrop>
  );
}
