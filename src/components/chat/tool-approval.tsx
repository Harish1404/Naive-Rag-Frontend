"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldAlert, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

/**
 * The human-in-the-loop gate, rendered inline in the conversation.
 *
 * Inline rather than a modal on purpose: the model usually says something
 * ("Let me look that up for you…") before it asks for the tool, and a modal
 * would cover exactly the context the user needs in order to decide.
 *
 * The graph is genuinely parked here — `interrupt()` checkpointed it mid-run
 * and nothing else will happen on this thread until POST /chatbot/{id}/resume
 * arrives — so this component is the only way forward, and the composer is
 * disabled while it is up.
 *
 * Anything that is not an explicit accept is treated by the backend as a
 * refusal, and the tool is not retried afterwards.
 *
 * A turn can gate more than one tool, so this stays mounted across prompts.
 * The caller keys it on the pending call id, which resets the reason draft and
 * the submitting flag for each new decision without an effect doing it.
 */
export function ToolApproval() {
  const pendingApproval = useChatStore((s) => s.pendingApproval);
  const resolveApproval = useChatStore((s) => s.resolveApproval);

  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showReason) reasonRef.current?.focus();
  }, [showReason]);

  const submit = useCallback(
    (action: "accept" | "reject", withReason?: string) => {
      // Guards a double-click: the second resume would arrive at a thread that
      // is no longer waiting on anything, which the backend answers with 409.
      if (submitting) return;
      setSubmitting(true);
      void resolveApproval(action, withReason?.trim() || undefined);
    },
    [resolveApproval, submitting]
  );

  const handleReasonKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit("reject", reason);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowReason(false);
        setReason("");
      }
    },
    [reason, submit]
  );

  if (!pendingApproval) return null;

  const toolCalls = pendingApproval.tool_calls ?? [];

  return (
    <div className="animate-message-in w-full">
      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">
            Approval required
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {toolCalls.length > 1
              ? `${toolCalls.length} tools want to run`
              : "A tool wants to run"}
          </span>
        </div>

        <div className="space-y-3 px-4 py-3.5">
          {/* One block per gated call. The backend gates them as a group and
              closes out every pending id together, so they share one decision. */}
          {toolCalls.map((call) => (
            <div key={call.id} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 shrink-0 text-primary" />
                <code className="font-mono text-[13px] font-semibold text-foreground">
                  {call.name}
                </code>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border/50 bg-background/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground/80">
                {JSON.stringify(call.args ?? {}, null, 2)}
              </pre>
            </div>
          ))}

          {/* Actions */}
          {showReason ? (
            <div className="space-y-2 pt-1">
              <Textarea
                ref={reasonRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={handleReasonKeyDown}
                rows={2}
                disabled={submitting}
                placeholder="Why not? (optional — the assistant will acknowledge it)"
                className="resize-none rounded-lg border-border/60 bg-background/60 text-[13px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => submit("reject", reason)}
                  className="h-8 px-3 text-[12px]"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Send rejection
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => {
                    setShowReason(false);
                    setReason("");
                  }}
                  className="h-8 px-3 text-[12px] text-muted-foreground"
                >
                  Back
                </Button>
                <span className="ml-auto text-[11px] text-muted-foreground/70">
                  Enter to send · Esc to go back
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => submit("accept")}
                className={cn(
                  "h-8 px-3 text-[12px]",
                  "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
                )}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Allow once
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={submitting}
                onClick={() => setShowReason(true)}
                className="h-8 px-3 text-[12px] text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
              <span className="ml-auto text-[11px] text-muted-foreground/70">
                {submitting ? "Continuing…" : "This runs on your behalf"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
