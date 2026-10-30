import type { AudioOutput } from "./audio-output";
import type { Cue } from "./sound-preferences";

const notes: Record<Cue, number[]> = {
  "room-enter": [392, 523.25, 659.25],
  "room-leave": [659.25, 523.25, 392],
  "share-on": [440, 660],
  "share-off": [660, 330],
  unmute: [520, 780],
  mute: [390, 260],
  deafen: [300, 220, 180],
  undeafen: [300, 440, 600],
  "screen-new": [523.25, 783.99, 1046.5],
  "chat-message": [987.77, 1318.51],
  "poll-open": [587.33, 880, 587.33, 880],
  "poll-end": [523.25, 659.25, 783.99, 1046.5],
  "timer-end": [880, 660, 880, 660, 880],
  knock: [262, 262],
};
export class SoundCues {
  private context?: AudioContext;
  private gain?: GainNode;
  private unregister?: () => void;
  private generation = 0;
  private volume = 0.7;
  private oscillators = new Set<OscillatorNode>();
  private lastPlayed = new Map<Cue, number>();
  constructor(private output?: AudioOutput) {}
  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.context && this.gain)
      this.gain.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.015,
      );
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.context.destination);
        const context = this.context as AudioContext & {
          setSinkId?: (id: string) => Promise<void>;
        };
        if (typeof context.setSinkId === "function")
          this.unregister = this.output?.register(
            context as AudioContext & { setSinkId(id: string): Promise<void> },
          );
      }
      void this.context.resume().catch(() => {});
    } catch {
      // Sound feedback is optional; a blocked context must not block room actions.
    }
  }
  async play(cue: Cue): Promise<boolean> {
    if (!this.volume) return false;
    this.unlock();
    const generation = this.generation;
    try {
      await this.output?.ready();
      const context = this.context;
      if (
        generation !== this.generation ||
        !this.volume ||
        !context ||
        !this.gain ||
        context.state !== "running"
      )
        return false;
      // Coalesce bursts of people arriving/leaving without a loud stack of tones.
      const now = context.currentTime;
      if (now - (this.lastPlayed.get(cue) ?? -Infinity) < 0.28) return true;
      this.lastPlayed.set(cue, now);
      notes[cue].forEach((frequency, i) => {
        const start = now + i * 0.085;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.12, start + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
        oscillator.connect(envelope);
        envelope.connect(this.gain!);
        this.oscillators.add(oscillator);
        oscillator.onended = () => {
          this.oscillators.delete(oscillator);
          oscillator.disconnect();
          envelope.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.14);
      });
      return true;
    } catch {
      return false;
    }
  }
  cancel() {
    this.generation++;
    for (const oscillator of this.oscillators) {
      try {
        oscillator.stop();
      } catch {}
    }
    this.lastPlayed.clear();
  }
  close() {
    this.cancel();
    this.unregister?.();
    this.gain?.disconnect();
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.gain = undefined;
  }
}
