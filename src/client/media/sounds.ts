import type { AudioOutput } from "./audio-output";
export type Cue =
  | "share-on"
  | "share-off"
  | "unmute"
  | "mute"
  | "deafen"
  | "undeafen";
export class SoundCues {
  private context?: AudioContext;
  private unregister?: () => void;
  constructor(private output?: AudioOutput) {}
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        const context = this.context as AudioContext & {
          setSinkId?: (id: string) => Promise<void>;
        };
        if (typeof context.setSinkId === "function")
          this.unregister = this.output?.register(
            context as AudioContext & { setSinkId(id: string): Promise<void> },
          );
      }
      void this.context.resume();
    } catch {}
  }
  async play(cue: Cue) {
    this.unlock();
    await this.output?.ready();
    const context = this.context;
    if (!context || context.state === "closed") return;
    const notes: Record<Cue, number[]> = {
      "share-on": [440, 660],
      "share-off": [660, 330],
      unmute: [520, 780],
      mute: [390, 260],
      deafen: [300, 220, 180],
      undeafen: [300, 440, 600],
    };
    notes[cue].forEach((frequency, i) => {
      const start = context.currentTime + i * 0.075;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.025, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  close() {
    this.unregister?.();
    void this.context?.close();
    this.context = undefined;
  }
}
