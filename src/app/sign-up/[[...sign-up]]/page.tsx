"use client";

import { SignUp } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { AuthBackdrop, clerkAppearance } from "@/components/auth/auth-backdrop";

export default function SignUpPage() {
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
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Chat with your documents, search the web, and connect your tools.
          </p>
        </div>

        <SignUp
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          forceRedirectUrl="/"
        />
      </div>
    </AuthBackdrop>
  );
}
