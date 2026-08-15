import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, DM_Sans, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { SessionProvider } from "@/components/auth/session-provider";
import { AppShell } from "@/components/auth/app-shell";

const figtreeHeading = Figtree({ subsets: ["latin"], variable: "--font-heading" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GenAI Amigos",
  description:
    "An intelligent RAG-powered chat assistant with streaming responses and conversation history.",
};

/**
 * Provider order is load-bearing:
 *
 *   ClerkProvider    must be outermost — SessionProvider calls useAuth().
 *   Providers        theme + react-query, needed by everything below.
 *   SessionProvider  exchanges the Clerk token for backend cookies.
 *   AppShell         decides sidebar vs bare frame, and blocks rendering
 *                    until that exchange finishes.
 *
 * `{children}` appears exactly once, inside AppShell. It used to be rendered
 * twice — once inside <main> and again after the header — which mounted every
 * page and every one of its effects two times over.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        dmSans.variable,
        figtreeHeading.variable
      )}
    >
      <body className="h-screen w-screen overflow-hidden flex bg-background text-foreground">
        <ClerkProvider>
          <Providers>
            <SessionProvider>
              <AppShell>{children}</AppShell>
            </SessionProvider>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
