"use client";

import ReactMarkdown from "react-markdown";
import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { User, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div
      className={cn(
        "flex gap-3 animate-message-in group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1 ring-1 ring-primary/20">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-primary"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}

      <div className={cn("max-w-[75%] relative", isUser && "max-w-[65%]")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-surface-elevated text-foreground rounded-tl-md",
            isStreaming && "animate-pulse-subtle"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                components={{
                  // Style code blocks
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-background/30 px-1.5 py-0.5 rounded text-[13px] font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className={cn(
                          "block bg-background/40 p-3 rounded-lg text-[13px] font-mono overflow-x-auto my-2",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  // Make links open in new tab
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                  // Style lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 my-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 my-2">
                      {children}
                    </ol>
                  ),
                  p: ({ children }) => <p className="my-1.5">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy button for AI messages */}
        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center shrink-0 mt-1">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
