/**
 * The browser half of the voice pipeline.
 *
 * Two independent audio graphs, because capture and playback run at different
 * sample rates and neither should stall the other:
 *
 *   mic  -> AudioContext(16k) -> pcm-worklet -> Int16 -> ws.send (binary)
 *   ws   -> Int16 -> Float32 -> AudioBuffer(24k) -> scheduled playback
 *
 * Everything here is native Web Audio and native WebSocket — no libraries, and
 * no decoder on either side, because the wire format is raw PCM.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Same host as the REST API, ws:// or wss:// to match http:// or https://.
const WS_URL = `${API_BASE_URL.replace(/^http/, "ws")}/ws/voice`;

const MIC_SAMPLE_RATE = 16000;
const TTS_SAMPLE_RATE = 24000;

export interface VoiceHandlers {
  onTranscript: (text: string) => void;
  onToken: (text: string) => void;
  onDone: (conversationId: string) => void;
  onError: (message: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
}

export class VoiceSession {
  private ws: WebSocket | null = null;

  private micContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: AudioWorkletNode | null = null;

  private playContext: AudioContext | null = null;
  /** When the next received buffer should start, in playContext time. */
  private playCursor = 0;
  private pendingSources = new Set<AudioBufferSourceNode>();

  constructor(private handlers: VoiceHandlers) {}

  // ── Connection ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      // Without this, binary frames arrive as Blob and every audio chunk needs
      // an async read before it can be scheduled.
      ws.binaryType = "arraybuffer";

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Could not reach the voice server"));
      ws.onclose = () => {
        this.ws = null;
        this.handlers.onSpeakingChange(false);
      };
      ws.onmessage = (event) => this.handleMessage(event);

      this.ws = ws;
    });
  }

  private handleMessage(event: MessageEvent) {
    // Binary is always audio; text is always a JSON control message. No
    // envelope needed because the two can never be confused.
    if (event.data instanceof ArrayBuffer) {
      this.enqueueAudio(event.data);
      return;
    }

    const msg = JSON.parse(event.data as string);
    switch (msg.type) {
      case "transcript":
        this.handlers.onTranscript(msg.text);
        break;
      case "token":
        this.handlers.onToken(msg.text);
        break;
      case "done":
        this.handlers.onDone(msg.conversation_id);
        break;
      case "error":
        this.handlers.onError(msg.message);
        break;
    }
  }

  // ── Capture ────────────────────────────────────────────────────────────────

  async startRecording(conversationId: string | null): Promise<void> {
    await this.connect();

    // Asking for the context at 16kHz lets the browser do the resampling from
    // whatever the hardware runs at. Hand-rolled decimation here would alias.
    if (!this.micContext) {
      this.micContext = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
      await this.micContext.audioWorklet.addModule("/pcm-worklet.js");
    }
    // Autoplay policy suspends contexts created outside a gesture.
    if (this.micContext.state === "suspended") await this.micContext.resume();

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const source = this.micContext.createMediaStreamSource(this.micStream);
    this.micNode = new AudioWorkletNode(this.micContext, "pcm-worklet");
    this.micNode.port.onmessage = (e) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(e.data as ArrayBuffer);
      }
    };
    source.connect(this.micNode);
    // Not connected to destination: routing the mic to the speakers would echo.

    this.send({ type: "start", conversation_id: conversationId });
  }

  /** Release the button: stop capturing and ask the server to run the turn. */
  stopRecording(): void {
    this.teardownMic();
    this.send({ type: "end" });
  }

  /** Abandon the utterance without asking for an answer. */
  cancelRecording(): void {
    this.teardownMic();
    this.send({ type: "cancel" });
  }

  private teardownMic() {
    this.micNode?.port.close();
    this.micNode?.disconnect();
    this.micNode = null;
    // Stopping the tracks is what actually turns off the browser's recording
    // indicator; disconnecting the graph alone leaves it lit.
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  private enqueueAudio(data: ArrayBuffer) {
    if (!this.playContext) {
      this.playContext = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    }
    const ctx = this.playContext;
    if (ctx.state === "suspended") void ctx.resume();

    const pcm = new Int16Array(data);
    if (pcm.length === 0) return;

    const buffer = ctx.createBuffer(1, pcm.length, TTS_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      // Int16 -> Float32. 0x8000 (not 0x7fff) so full-scale negative maps to
      // exactly -1.0 and does not clip on the way back.
      channel[i] = pcm[i] / 0x8000;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Chunks arrive faster than real time, so each is scheduled to begin where
    // the previous one ends rather than "now" — playing them all immediately
    // would overlap them into noise. The max() re-syncs the cursor if the
    // network fell behind and the queue actually drained.
    const startAt = Math.max(ctx.currentTime, this.playCursor);
    source.start(startAt);
    this.playCursor = startAt + buffer.duration;

    this.pendingSources.add(source);
    this.handlers.onSpeakingChange(true);
    source.onended = () => {
      this.pendingSources.delete(source);
      if (this.pendingSources.size === 0) {
        this.handlers.onSpeakingChange(false);
      }
    };
  }

  /** Cut playback immediately and drop anything still queued. */
  stopPlayback(): void {
    this.pendingSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        // Already ended — stop() on a finished source throws.
      }
    });
    this.pendingSources.clear();
    this.playCursor = 0;
    this.handlers.onSpeakingChange(false);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.teardownMic();
    this.stopPlayback();
    void this.micContext?.close();
    void this.playContext?.close();
    this.micContext = null;
    this.playContext = null;
    this.ws?.close();
    this.ws = null;
  }
}
