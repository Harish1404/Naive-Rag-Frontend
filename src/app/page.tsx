"use client";

import { useEffect } from "react";
import { Sparkles, FileText, Globe, Code, UserCheck } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { ChatContainer } from "@/components/chat/chat-container";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat-header";
import { useGuardedSend } from "@/hooks/use-guarded-send";

const SUGGESTED_PROMPTS = [
  {
    icon: FileText,
    label: "Summarize a document",
    prompt: "Can you summarize the key points from the uploaded documents?",
  },
  {
    icon: Globe,
    label: "Check the weather",
    prompt: "What's the weather like in my city?",
  },
  {
    icon: Code,
    label: "Explain a concept",
    prompt: "Explain how RAG (Retrieval Augmented Generation) works",
  },
  {
    icon: UserCheck,
    label: "Ask about my resume",
    prompt: "What skills and experience do I have based on my uploaded resume?",
  },
];

export default function HomePage() {
  const { messages, isStreaming, stopStreaming, activeConversationId, clearChat } =
    useChatStore();

  useEffect(() => {
    if (activeConversationId) {
      clearChat();
    }
  }, [activeConversationId, clearChat]);

  // Signed out, this stashes the prompt and routes to sign-in, then replays it
  // once the backend session exists. Signed in, it just sends.
  const handleSend = useGuardedSend();

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navbar */}
      <ChatHeader />

      {hasMessages ? (
        <>
          <ChatContainer />
          <div className="border-t border-border/40 pb-6 pt-4 bg-background/80 backdrop-blur-xl shrink-0">
            <ChatInput
              onSend={handleSend}
              onStop={stopStreaming}
              isStreaming={isStreaming}
            />
          </div>
        </>
      ) : (
        <>
          {/* Empty State — Welcome Screen */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
            <div className="text-center space-y-4 mb-10 max-w-lg">
              {/* Logo / Brand Badge */}
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/25 mb-2 shadow-lg shadow-primary/5">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-foreground">
                What can I help with?
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your GenZ RAG Assistant. Ask questions about your documents, check real-time weather, or explore ideas.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full mb-8">
              {SUGGESTED_PROMPTS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(item.prompt)}
                  className="group flex items-center gap-3.5 p-4 rounded-2xl border border-border/60 bg-card/40 hover:bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 text-left"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground/85 group-hover:text-foreground transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="pb-6 pt-3 shrink-0">
            <ChatInput
              onSend={handleSend}
              onStop={stopStreaming}
              isStreaming={isStreaming}
              placeholder="Message RAG Assistant..."
            />
          </div>
        </>
      )}
    </div>
  );
}
