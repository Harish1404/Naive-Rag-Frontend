"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useVoiceStore } from "@/stores/voice-store";
import { ChatMessage } from "@/components/chat/chat-message";
import { MessageSkeleton, TypingIndicator } from "@/components/chat/message-skeleton";
import type { Message } from "@/types/chat";

export function ChatContainer() {
  const {
    messages,
    isStreaming,
    streamingContent,
    isLoadingHistory,
  } = useChatStore();

  const voiceContent = useVoiceStore((s) => s.streamingContent);
  const voicePhase = useVoiceStore((s) => s.phase);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, voiceContent]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <MessageSkeleton count={4} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
