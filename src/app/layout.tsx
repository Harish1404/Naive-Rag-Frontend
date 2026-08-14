import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { AppSidebar } from "@/components/app-sidebar";

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
  title: "RAG Chat — AI Assistant",
  description: "An intelligent RAG-powered chat assistant with streaming responses and conversation history.",
};

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
        <Providers>
          <AppSidebar />
          <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
