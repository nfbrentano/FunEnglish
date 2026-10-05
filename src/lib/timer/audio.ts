/**
 * Audio feedback for classroom timer completion.
 * Synthesizes a clean bell chime using Web Audio API and falls back to /sounds/bell.wav.
 * Conforms to browser autoplay policies by initializing or unlocking the audio context
 * upon user interaction (RNF04).
 */

let globalAudioCtx: AudioContext | null = null;

export function initAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === "suspended") {
      void globalAudioCtx.resume();
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

export function playAlarmSound(isMuted: boolean): void {
  if (isMuted || typeof window === "undefined") return;

  try {
    const ctx = initAudioContext();
    if (ctx && ctx.state !== "suspended") {
      const now = ctx.currentTime;

      // Bell chime with fundamental 880Hz (A5) and overtone 1760Hz (A6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1760, now);

      // Volume envelope with natural decay
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
      return;
    }
  } catch {
    // If Web Audio synthesis fails, fallback to audio element
  }

  try {
    if (typeof Audio !== "undefined") {
      const audio = new Audio("/sounds/bell.wav");
      void audio.play().catch(() => {});
    }
  } catch {
    // Audio playback not supported or blocked
  }
}
