/**
 * Turns microphone audio into the frames the backend expects.
 *
 * The browser hands us Float32 samples in blocks of 128. The backend wants
 * 16-bit signed PCM in chunks big enough to be worth a WebSocket frame, so this
 * buffers up to FRAME_SAMPLES and converts on the way out.
 *
 * This runs on the audio rendering thread, which must never block: no fetch, no
 * allocation in the hot path beyond the outgoing buffer, no logging.
 *
 * Lives in public/ because AudioWorklet modules are fetched by URL at runtime
 * rather than imported through the bundler.
 */

// 40ms at 16kHz. Small enough that releasing the button does not strand much
// un-sent audio, large enough that we are not sending hundreds of tiny frames.
const FRAME_SAMPLES = 640;

class PCMWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(FRAME_SAMPLES);
    this.offset = 0;
  }

  process(inputs) {
    // inputs[0] is the first input, [0] its first channel. Absent for a frame
    // or two while the graph settles, and after the track is stopped.
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.offset++] = channel[i];

      if (this.offset === FRAME_SAMPLES) {
        const pcm = new Int16Array(FRAME_SAMPLES);
        for (let j = 0; j < FRAME_SAMPLES; j++) {
          // Clamp before scaling: values outside [-1, 1] are legal in Web Audio
          // and would wrap around into loud noise once cast to an integer.
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Transferred, not copied — ownership moves to the main thread.
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
        this.offset = 0;
      }
    }

    // Keep the processor alive; returning false would let it be collected.
    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorklet);
