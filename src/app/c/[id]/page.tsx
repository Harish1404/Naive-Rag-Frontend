"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { ChatContainer } from "@/components/chat/chat-container";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat-header";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const {
    activeConversationId,
    isStreaming,
    sendMessage,
    stopStreaming,
    loadConversation,
    setActiveConversationId,
  } = useChatStore();

  const { conversations, fetchConversations } = useSidebarStore();

  const activeTitle = useMemo(() => {
    const found = conversations.find((c) => c.conversation_id === conversationId);
    return found?.title;
  }, [conversations, conversationId]);

  // Load conversation when navigating to it
  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      loadConversation(conversationId);
    } else if (conversationId && conversationId === activeConversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId, activeConversationId, loadConversation, setActiveConversationId]);

  const handleSend = useCallback(
    async (prompt: string) => {
      await sendMessage(prompt);
      await fetchConversations();
    },
    [sendMessage, fetchConversations]
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Glassmorphic Header Navbar */}
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
