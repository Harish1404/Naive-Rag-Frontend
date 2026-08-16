"use client";

import ReactMarkdown from "react-markdown";
import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
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
    <div className="animate-message-in group">
      {/* Role label */}
      <div className="mb-1.5">
        <span
          className={cn(
            "text-xs font-semibold tracking-wide",
            isUser ? "text-foreground" : "text-primary"
          )}
        >
          {isUser ? "You" : "Assistant"}
        </span>
      </div>

      {/* Message content */}
      <div className="relative">
        <div
          className={cn(
            "text-[14.5px] leading-[1.7]",
            isUser
              ? "bg-surface-elevated/50 rounded-2xl px-4 py-3 text-foreground"
              : "text-foreground/90"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                isStreaming && "streaming-cursor"
              )}
            >
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-muted/60 px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className={cn(
                          "block bg-muted/40 p-3 rounded-lg text-[13px] font-mono overflow-x-auto my-3",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
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
                  p: ({ children }) => <p className="my-2">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy button for assistant messages */}
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
    </div>
  );
}
