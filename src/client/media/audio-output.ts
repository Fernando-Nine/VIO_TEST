type OutputTarget = { setSinkId(deviceId: string): Promise<void> };
export class AudioOutput {
  deviceId = "";
  private targets = new Set<OutputTarget>();
  private queue = Promise.resolve();
  get supported() {
    return (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof HTMLMediaElement !== "undefined" &&
      typeof HTMLMediaElement.prototype.setSinkId === "function"
    );
  }
  constructor(private failed: (error: unknown) => void) {}
  ready() {
    return this.queue;
  }
  register(target: OutputTarget) {
    if (typeof target.setSinkId !== "function") return () => {};
    this.targets.add(target);
    this.queue = this.queue
      .then(async () => {
        if (!this.targets.has(target)) return;
        await target.setSinkId(this.deviceId);
      })
      .catch(async (error) => {
        this.deviceId = "";
        await Promise.allSettled([...this.targets].map((t) => t.setSinkId("")));
        this.failed(error);
      });
    return () => {
      this.targets.delete(target);
    };
  }
  async select(deviceId: string) {
    const change = this.queue.then(async () => {
      const previous = this.deviceId;
      const targets = [...this.targets];
      // Probe even when no media is playing: never claim a device was selected
      // if the browser has not accepted it.
      if (!targets.length) targets.push(document.createElement("audio"));
      const results = await Promise.allSettled(
        targets.map((t) => t.setSinkId(deviceId)),
      );
      const failure = results.find((r) => r.status === "rejected");
      if (failure?.status === "rejected") {
        await Promise.allSettled(targets.map((t) => t.setSinkId(previous)));
        throw failure.reason;
      }
      this.deviceId = deviceId;
    });
    this.queue = change.catch(() => {});
    await change;
  }
}
