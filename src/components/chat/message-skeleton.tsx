"use client";

export function MessageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8 px-6 py-8">
      {Array.from({ length: count }).map((_, i) => {
        const isUser = i % 2 === 0;
        return (
          <div key={i} className="animate-pulse">
            {/* Role label skeleton */}
            <div
              className="h-3 rounded bg-muted-foreground/10 mb-2"
              style={{ width: isUser ? "28px" : "62px" }}
            />

            {/* Content skeleton */}
            <div className={isUser ? "max-w-[60%]" : "max-w-full"}>
              <div
                className={`rounded-2xl p-4 space-y-2 ${
                  isUser ? "bg-surface-elevated/50" : "bg-transparent"
                }`}
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
    <div className="animate-message-in">
      <div className="mb-1.5">
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
