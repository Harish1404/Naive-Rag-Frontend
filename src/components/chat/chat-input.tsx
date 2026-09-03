"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Square, AudioLines, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useVoiceStore } from "@/stores/voice-store";
import { useChatStore } from "@/stores/chat-store";

const chatSchema = z.object({
  prompt: z.string().min(1, "Type a message").max(8000),
});

type ChatFormValues = z.infer<typeof chatSchema>;

interface ChatInputProps {
  onSend: (prompt: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Ask anything...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // The graph is parked on an approval prompt: it will not accept another turn
  // until this one is answered, and typing a new prompt would orphan the
  // pending interrupt. Lock the composer rather than let that happen.
  const awaitingApproval = useChatStore((s) => s.pendingApproval !== null);
  const locked = disabled || awaitingApproval;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isValid },
  } = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: { prompt: "" },
    mode: "onChange",
  });

  const promptValue = watch("prompt");

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [promptValue]);

  const onSubmit = useCallback(
    (data: ChatFormValues) => {
      if (isStreaming || locked) return;
      onSend(data.prompt.trim());
      reset();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [isStreaming, locked, onSend, reset]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    },
    [handleSubmit, onSubmit]
  );

  const voicePhase = useVoiceStore((s) => s.phase);
  const startRecording = useVoiceStore((s) => s.startRecording);
  const stopRecording = useVoiceStore((s) => s.stopRecording);
  const cancelRecording = useVoiceStore((s) => s.cancelRecording);
  const disconnectVoice = useVoiceStore((s) => s.disconnect);

  const isRecording = voicePhase === "recording";

  // Push to talk: hold to speak, release to send. Pointer events rather than
  // mouse events so the same handlers cover touch and pen.
  const handleVoiceDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      // Keeps the pointerup coming back to this button even if the finger
      // slides off it, which would otherwise leave the mic recording forever.
      e.currentTarget.setPointerCapture(e.pointerId);
      void startRecording();
    },
    [startRecording]
  );

  const handleVoiceUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Escape abandons the utterance instead of sending it.
  useEffect(() => {
    if (!isRecording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRecording();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRecording, cancelRecording]);

  // Release the socket, the mic and both AudioContexts when the chat unmounts.
  useEffect(() => () => disconnectVoice(), [disconnectVoice]);

  const handleAttachmentClick = useCallback(() => {
    toast.info("Document context ready", {
      description: "RAG pipeline automatically indexes documents uploaded in the backend.",
    });
  }, []);

  const { ref: formRef, ...registerRest } = register("prompt");

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="relative flex items-end bg-card border border-border/80 rounded-2xl shadow-xl shadow-black/5 transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
          {/* Attachment button */}
          <div className="pl-3 pb-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttachmentClick}
              className="h-8 w-8 rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Attach document"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            {...registerRest}
            ref={(e) => {
              formRef(e);
              textareaRef.current = e;
            }}
            placeholder={
              awaitingApproval
                ? "Approve or reject the tool call above to continue…"
                : placeholder
            }
            disabled={locked && !isStreaming}
            onKeyDown={handleKeyDown}
            rows={1}
            className={cn(
              "flex-1 resize-none border-0 bg-transparent px-3 py-3.5 text-sm",
              "placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0",
              "min-h-[48px] max-h-[200px] scrollbar-thin"
            )}
          />

          <div className="p-2.5 flex items-center gap-1 shrink-0">
            {/* Push to talk: hold to speak, release to send, Esc to cancel */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onPointerDown={handleVoiceDown}
              onPointerUp={handleVoiceUp}
              onPointerCancel={cancelRecording}
              disabled={voicePhase === "thinking"}
              className={cn(
                "h-8 w-8 rounded-xl transition-colors",
                isRecording
                  ? "bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                  : voicePhase === "speaking"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/70 hover:text-primary hover:bg-primary/10"
              )}
              title={
                isRecording
                  ? "Release to send · Esc to cancel"
                  : voicePhase === "thinking"
                    ? "Thinking..."
                    : "Hold to talk"
              }
            >
              {isRecording ? (
                <Mic className="h-4 w-4 animate-pulse" />
              ) : (
                <AudioLines
                  className={cn(
                    "h-4 w-4",
                    voicePhase === "speaking" && "animate-pulse"
                  )}
                />
              )}
            </Button>

            {/* Send / Stop button */}
            {isStreaming ? (
              <Button
                type="button"
                onClick={onStop}
                size="icon"
                className="h-8 w-8 rounded-xl bg-destructive/90 hover:bg-destructive text-destructive-foreground transition-all shadow-sm"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!isValid || locked}
                className={cn(
                  "h-8 w-8 rounded-xl transition-all duration-200",
                  isValid && !locked
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground/40"
                )}
                title="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-2 font-mono">
          {awaitingApproval
            ? "Waiting on your decision above"
            : isRecording
            ? "Listening… release to send · Esc to cancel"
            : voicePhase === "thinking"
              ? "Thinking…"
              : voicePhase === "speaking"
                ? "Speaking… hold the mic to interrupt"
                : "Press Enter to send · Shift + Enter for new line · Hold the mic to talk"}
        </p>
      </form>
    </div>
  );
}
