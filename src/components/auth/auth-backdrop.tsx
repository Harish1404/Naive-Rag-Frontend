"use client";

/**
 * Shared chrome for the sign-in and sign-up pages.
 *
 * Clerk's default card is white and ignores the app's theme, which reads as a
 * third-party page dropped into the middle of the product. `clerkAppearance`
 * maps its internal element keys onto the existing CSS custom properties from
 * globals.css, so the form inherits the same tokens as everything else and
 * follows light/dark automatically.
 */

// Not annotated with Clerk's `Appearance` type: `@clerk/types` is not a
// dependency of this install, and the object is structurally compatible with
// the prop as inferred.
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    colorDanger: "var(--destructive)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-xl shadow-primary/5 border border-border/60 rounded-2xl",
    card: "bg-card/80 backdrop-blur-xl",
    // The product already shows its own title above the form.
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border-border/70 bg-background hover:bg-accent transition-colors rounded-xl",
    formButtonPrimary:
      "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/15 normal-case font-medium",
    formFieldInput: "bg-background border-border/70 rounded-xl",
    footerActionLink: "text-primary hover:text-primary/80",
    dividerLine: "bg-border/60",
    dividerText: "text-muted-foreground",
    // Clerk renders its own branding footer; the app frame supplies context.
    footer: "hidden",
  },
};

export function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 flex items-center justify-center min-h-screen overflow-y-auto px-4 py-10">
      {/* Matches the radial accent used on the connector cards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}
