import { create } from "zustand";
import { toast } from "sonner";
import { VoiceSession } from "@/lib/voice-socket";
import { useChatStore } from "./chat-store";

type VoicePhase = "idle" | "recording" | "thinking" | "speaking";

interface VoiceState {
  phase: VoicePhase;
  /** What the server heard, shown as soon as it lands. */
  transcript: string;
  /** The answer accumulating token by token, ahead of its audio. */
  streamingContent: string;

  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  interrupt: () => void;
  disconnect: () => void;
}

// One session per tab. Held outside the store because it owns AudioContexts and
// a socket, which are not state and must not be cloned by any state update.
let session: VoiceSession | null = null;

export const useVoiceStore = create<VoiceState>((set, get) => {
  const getSession = () => {
    if (session) return session;

    session = new VoiceSession({
      onTranscript: (text) => {
        set({ transcript: text, phase: "thinking" });

        // Show the spoken question in the transcript immediately, the same way
        // chat-store does for a typed one.
        const chat = useChatStore.getState();
        chat.appendMessage({
          message_id: `voice-user-${Date.now()}`,
          conversation_id: chat.activeConversationId ?? "",
          seq: chat.messages.length,
          role: "user",
          content: text,
          route: null,
          tool_calls: [],
          partial: false,
          created_at: new Date().toISOString(),
        });
      },

      onToken: (text) => {
        set((s) => ({ streamingContent: s.streamingContent + text }));
      },

      onDone: (conversationId) => {
        const { streamingContent } = get();
        const chat = useChatStore.getState();

        if (streamingContent) {
          chat.appendMessage({
            message_id: `voice-assistant-${Date.now()}`,
            conversation_id: conversationId,
            seq: chat.messages.length,
            role: "assistant",
            content: streamingContent,
            route: null,
            tool_calls: [],
            partial: false,
            created_at: new Date().toISOString(),
          });
        }
        if (!chat.activeConversationId) {
          chat.setActiveConversationId(conversationId);
        }

        // `done` means the server has sent all the audio, not that the speakers
        // have finished — onSpeakingChange is what moves us out of "speaking".
        set({ streamingContent: "", transcript: "" });
      },

      onError: (message) => {
        toast.error(message);
        set({ phase: "idle", streamingContent: "", transcript: "" });
      },

      onSpeakingChange: (speaking) => {
        set((s) => {
          if (speaking) return { phase: "speaking" };
          // Ignore a stale "stopped speaking" that lands after a new turn has
          // already begun, or it would knock us back to idle mid-recording.
          return s.phase === "speaking" ? { phase: "idle" } : {};
        });
      },
    });
    return session;
  };

  return {
    phase: "idle",
    transcript: "",
    streamingContent: "",

    startRecording: async () => {
      const s = getSession();
      // Pressing the button while the assistant is talking cuts it off — the
      // one interruption push-to-talk still needs, since the user is about to
      // speak over it.
      s.stopPlayback();

      try {
        await s.startRecording(useChatStore.getState().activeConversationId);
        set({ phase: "recording", transcript: "", streamingContent: "" });
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone access denied. Allow it in your browser settings."
            : err instanceof Error
              ? err.message
              : "Could not start the microphone";
        toast.error(message);
        set({ phase: "idle" });
      }
    },

    stopRecording: () => {
      if (get().phase !== "recording") return;
      getSession().stopRecording();
      set({ phase: "thinking" });
    },

    cancelRecording: () => {
      if (get().phase !== "recording") return;
      getSession().cancelRecording();
      set({ phase: "idle", transcript: "", streamingContent: "" });
    },

    interrupt: () => {
      getSession().stopPlayback();
      set({ phase: "idle" });
    },

    disconnect: () => {
      session?.close();
      session = null;
      set({ phase: "idle", transcript: "", streamingContent: "" });
    },
  };
});
