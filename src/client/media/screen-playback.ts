/** Optional amplification only. Native playback must remain attached to the raw stream. */
export class ScreenPlayback {
  private context?: AudioContext;
  get supported() {
    return typeof AudioContext !== "undefined";
  }
  unlock() {
    if (!this.supported) return;
    try {
      if (!this.context || this.context.state === "closed")
        this.context = new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      // A failed amplifier must never prevent normal screen audio from playing.
    }
  }
  create(stream: MediaStream) {
    this.unlock();
    const context = this.context;
    if (!context) return;
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    let input: MediaStreamAudioSourceNode | undefined;
    gain.connect(destination);
    const sync = () => {
      input?.disconnect();
      const track = stream
        .getAudioTracks()
        .find((t) => t.readyState === "live");
      if (track) {
        input = context.createMediaStreamSource(new MediaStream([track]));
        input.connect(gain);
      }
    };
    sync();
    stream.addEventListener("addtrack", sync);
    stream.addEventListener("removetrack", sync);
    return {
      stream: destination.stream,
      context,
      setVolume(volume: number) {
        gain.gain.setTargetAtTime(
          Math.min(3, Math.max(0, volume)),
          context.currentTime,
          0.02,
        );
      },
      close() {
        stream.removeEventListener("addtrack", sync);
        stream.removeEventListener("removetrack", sync);
        input?.disconnect();
        gain.disconnect();
        destination.stream.getTracks().forEach((track) => track.stop());
      },
    };
  }
  close() {
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }
}
