"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useVoiceStore } from "@/stores/voice-store";
import { ChatMessage } from "@/components/chat/chat-message";
import { MessageSkeleton, TypingIndicator } from "@/components/chat/message-skeleton";
import { ToolApproval } from "@/components/chat/tool-approval";
import type { Message } from "@/types/chat";

export function ChatContainer() {
  const {
    messages,
    isStreaming,
    streamingContent,
    isLoadingHistory,
    pendingApproval,
  } = useChatStore();

  const voiceContent = useVoiceStore((s) => s.streamingContent);
  const voicePhase = useVoiceStore((s) => s.phase);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, voiceContent, pendingApproval]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[56rem] mx-auto">
          <MessageSkeleton count={4} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="max-w-[56rem] mx-auto px-6 py-8 space-y-8">
        {messages.map((msg: Message) => (
          <ChatMessage key={msg.message_id} message={msg} />
        ))}

        {/* Show streaming content as a temporary assistant message */}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{
              message_id: "streaming",
              conversation_id: "",
              seq: -1,
              role: "assistant",
              content: streamingContent,
              route: null,
              tool_calls: [],
              partial: true,
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        {/* Typing indicator when streaming just started but no content yet */}
        {isStreaming && !streamingContent && <TypingIndicator />}

        {/* The graph paused for tool approval. Nothing else advances this
            thread until the user answers, so this sits at the live end of the
            conversation — after whatever the model said on its way here.
            Keyed on the pending call so a second prompt in the same turn gets
            a clean card rather than the previous one's half-typed reason. */}
        <ToolApproval key={pendingApproval?.tool_calls?.[0]?.id ?? "none"} />

        {/* A voice answer, captioned while it is still being spoken. Tokens
            arrive well ahead of their audio, so this makes the wait legible. */}
        {voiceContent && (
          <ChatMessage
            message={{
              message_id: "voice-streaming",
              conversation_id: "",
              seq: -1,
              role: "assistant",
              content: voiceContent,
              route: null,
              tool_calls: [],
              partial: true,
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        {voicePhase === "thinking" && !voiceContent && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
