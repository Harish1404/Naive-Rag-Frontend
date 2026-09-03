"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import {
  useConversations,
  useInvalidateConversations,
} from "@/hooks/use-conversations";
import { ChatContainer } from "@/components/chat/chat-container";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat-header";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const {
    activeConversationId,
    isStreaming,
    pendingApproval,
    sendMessage,
    stopStreaming,
    loadConversation,
    setActiveConversationId,
  } = useChatStore();

  const { data: conversations = [] } = useConversations();
  const invalidateConversations = useInvalidateConversations();

  const activeTitle = useMemo(() => {
    const found = conversations.find((c) => c.conversation_id === conversationId);
    return found?.title;
  }, [conversations, conversationId]);

  // Load conversation when navigating to it.
  //
  // The `isStreaming || pendingApproval` guard is what makes a brand-new chat
  // work. Sending from `/` now navigates here the moment the conversation id
  // arrives on the response header, while the answer is still streaming into
  // the store. Without this guard that arrival looks like a cold load, and
  // loadConversation would set `messages: []` and refetch a transcript the
  // server has not finished writing — wiping the turn mid-flight.
  useEffect(() => {
    if (!conversationId) return;

    if (isStreaming || pendingApproval) return;

    if (conversationId !== activeConversationId) {
      loadConversation(conversationId);
    } else {
      setActiveConversationId(conversationId);
    }
  }, [
    conversationId,
    activeConversationId,
    isStreaming,
    pendingApproval,
    loadConversation,
    setActiveConversationId,
  ]);

  const handleSend = useCallback(
    async (prompt: string) => {
      await sendMessage(prompt);
      invalidateConversations();
    },
    [sendMessage, invalidateConversations]
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navbar */}
      <ChatHeader title={activeTitle} />

      {/* Main Chat Area */}
      <ChatContainer />

      {/* Sticky Bottom Input Bar */}
      <div className="border-t border-border/40 pb-6 pt-4 bg-background/80 backdrop-blur-xl shrink-0">
        <ChatInput
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
