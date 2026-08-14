"use client";

export function MessageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isUser = i % 2 === 0;
        return (
          <div
            key={i}
            className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {/* AI avatar skeleton */}
            {!isUser && (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0 mt-1" />
            )}

            <div
              className={`space-y-2 ${isUser ? "max-w-[60%]" : "max-w-[70%]"}`}
            >
              <div
                className={`rounded-2xl p-4 space-y-2 ${
                  isUser ? "bg-primary/20" : "bg-muted"
                } animate-pulse`}
              >
                <div
                  className="h-3 rounded bg-muted-foreground/10"
                  style={{ width: `${70 + Math.random() * 25}%` }}
                />
                <div
                  className="h-3 rounded bg-muted-foreground/10"
                  style={{ width: `${50 + Math.random() * 40}%` }}
                />
                {!isUser && (
                  <div
                    className="h-3 rounded bg-muted-foreground/10"
                    style={{ width: `${30 + Math.random() * 50}%` }}
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
    <div className="flex items-start gap-3 animate-message-in">
      {/* AI avatar */}
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
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

      <div className="bg-surface-elevated rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-primary/60" />
      </div>
    </div>
  );
}
