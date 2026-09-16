export type Cue =
  | "share-on"
  | "share-off"
  | "unmute"
  | "mute"
  | "deafen"
  | "undeafen";
export class SoundCues {
  private context?: AudioContext;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
    } catch {}
  }
  play(cue: Cue) {
    this.unlock();
    const context = this.context;
    if (!context) return;
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
    void this.context?.close();
    this.context = undefined;
  }
}
