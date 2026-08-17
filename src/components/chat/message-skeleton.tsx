"use client";

import { cn } from "@/lib/utils";

export function MessageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8 px-6 py-8">
      {Array.from({ length: count }).map((_, i) => {
        const isUser = i % 2 === 0;
        return (
          <div
            key={i}
            className={cn(
              "flex flex-col w-full animate-pulse",
              isUser ? "items-end" : "items-start"
            )}
          >
            {/* Role label skeleton */}
            <div
              className={cn("h-3 rounded bg-muted-foreground/10 mb-2", isUser ? "w-8" : "w-16")}
            />

            {/* Content skeleton */}
            <div className={isUser ? "w-[65%] sm:w-[50%]" : "w-full"}>
              <div
                className={cn(
                  "p-4 space-y-2 rounded-2xl",
                  isUser ? "bg-surface-elevated/70 border border-border/40 rounded-tr-sm" : "bg-transparent"
                )}
              >
                <div
                  className="h-3.5 rounded bg-muted-foreground/15"
                  style={{ width: `${75 + (i * 7) % 20}%` }}
                />
                <div
                  className="h-3.5 rounded bg-muted-foreground/10"
                  style={{ width: `${50 + (i * 13) % 40}%` }}
                />
                {!isUser && (
                  <div
                    className="h-3.5 rounded bg-muted-foreground/10"
                    style={{ width: `${35 + (i * 19) % 45}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="animate-message-in flex flex-col items-start w-full">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-primary">
          Assistant
        </span>
      </div>
      <div className="flex items-center gap-1.5 py-1">
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
      </div>
    </div>
  );
}
