type OutputTarget = {
  setSinkId(deviceId: string): Promise<void>;
  readonly sinkId?: unknown;
  readonly state?: string;
};
type Entry = { target: OutputTarget; sink: string; active: boolean };
type OutputDevice = Pick<MediaDeviceInfo, "kind" | "deviceId">;

export function outputError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotFoundError")
    return "A saída de áudio foi desconectada ou não está mais disponível.";
  if (name === "NotAllowedError")
    return "O navegador precisa de permissão para usar essa saída de áudio.";
  if (name === "InvalidStateError")
    return "Escolha a saída novamente com esta janela em foco.";
  return "O navegador não conseguiu ativar essa saída de áudio.";
}

export class AudioOutput {
  deviceId = "";
  pendingDeviceId = "";
  restoreMessage = "";
  private targets = new Map<OutputTarget, Entry>();
  private queue = Promise.resolve();
  private selection = 0;
  private disposed = false;
  get supported() {
    return (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof HTMLMediaElement !== "undefined" &&
      typeof HTMLMediaElement.prototype.setSinkId === "function"
    );
  }
  constructor(private failed: (error: unknown, recovered: boolean) => void) {}
  ready() {
    return this.queue;
  }
  private serial<T>(action: () => Promise<T>) {
    const change = this.queue.then(action);
    this.queue = change.then(
      () => {},
      () => {},
    );
    return change;
  }
  private async apply(entry: Entry, id: string) {
    if (!entry.active || entry.target.state === "closed" || entry.sink === id)
      return;
    try {
      await entry.target.setSinkId(id);
      entry.sink = id;
    } catch (error) {
      // An unmounted video or closed cue context cannot invalidate live audio.
      if (entry.active && entry.target.state !== "closed") throw error;
    }
  }
  private entries() {
    return [...this.targets.values()];
  }
  private async fallback(error: unknown) {
    this.deviceId = "";
    this.pendingDeviceId = "";
    const results = await Promise.allSettled(
      this.entries().map((e) => this.apply(e, "")),
    );
    if (!this.disposed)
      this.failed(
        error,
        results.every((r) => r.status === "fulfilled"),
      );
  }
  register(target: OutputTarget) {
    if (typeof target.setSinkId !== "function" || this.disposed)
      return () => {};
    const previous = this.targets.get(target);
    if (previous) previous.active = false;
    const entry: Entry = {
      target,
      active: true,
      sink: typeof target.sinkId === "string" ? target.sinkId : "",
    };
    this.targets.set(target, entry);
    void this.serial(async () => {
      try {
        await this.apply(entry, this.deviceId);
      } catch (error) {
        await this.fallback(error);
      }
    });
    return () => {
      entry.active = false;
      if (this.targets.get(target) === entry) this.targets.delete(target);
    };
  }
  select(deviceId: string) {
    ++this.selection;
    const id = deviceId === "default" ? "" : deviceId;
    return this.serial(async () => {
      if (this.disposed) return;
      const previous = this.deviceId;
      const targets = this.entries();
      // Validate even before any conversation or screen has started playing.
      if (!targets.length && id)
        targets.push({
          target: document.createElement("audio"),
          sink: "",
          active: true,
        });
      const results = await Promise.allSettled(
        targets.map((e) => this.apply(e, id)),
      );
      const failure = results.find((r) => r.status === "rejected");
      if (failure?.status === "rejected") {
        const rollback = await Promise.allSettled(
          targets.map((e) => this.apply(e, previous)),
        );
        if (rollback.some((r) => r.status === "rejected"))
          await this.fallback(failure.reason);
        throw failure.reason;
      }
      this.deviceId = id;
      this.pendingDeviceId = "";
      this.restoreMessage = "";
    });
  }
  async restore(
    deviceId: string,
    listDevices: () => Promise<OutputDevice[]> = () =>
      navigator.mediaDevices.enumerateDevices(),
  ) {
    if (!deviceId || deviceId === "default") return;
    const selection = this.selection;
    this.pendingDeviceId = deviceId;
    try {
      const devices = await listDevices();
      if (this.disposed || selection !== this.selection) return;
      if (
        !devices.some(
          (d) => d.kind === "audiooutput" && d.deviceId === deviceId,
        )
      )
        throw new DOMException("Saved output is unavailable", "NotFoundError");
      await this.select(deviceId);
    } catch {
      if (!this.disposed && this.pendingDeviceId === deviceId)
        this.restoreMessage =
          "A saída salva precisa ser confirmada novamente. Por enquanto, usamos a saída padrão do sistema.";
    }
  }
  reconcileDevices(devices: OutputDevice[]) {
    const selection = this.selection;
    return this.serial(async () => {
      if (this.disposed || selection !== this.selection || !this.deviceId)
        return;
      if (
        !devices.some(
          (d) => d.kind === "audiooutput" && d.deviceId === this.deviceId,
        )
      )
        await this.fallback(
          new DOMException("Output disconnected", "NotFoundError"),
        );
    });
  }
  watchDevices() {
    if (!this.supported) return () => {};
    const update = async () => {
      if (!this.deviceId) return;
      const selection = this.selection;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (selection === this.selection) await this.reconcileDevices(devices);
      } catch {
        /* Enumeration can be unavailable in a hidden document. */
      }
    };
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", update);
  }
  destroy() {
    this.disposed = true;
    this.selection++;
    for (const entry of this.targets.values()) entry.active = false;
    this.targets.clear();
  }
}
