export const desktop = import.meta.env?.VITE_DESKTOP === "1";
export interface DesktopCapabilities {
  protocol: number;
  windowsBuild: number;
  processAudio: boolean;
}
export interface DesktopSource {
  id: string;
  title: string;
  /** Window title under the program name, when the program has a window. */
  detail?: string;
  /** Whole PC minus VIO itself, so the call's voices never echo back. */
  system: boolean;
}
type Bridge = {
  core: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
};

/** No native API is exposed by a web build, even when a global is injected. */
export function nativeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const bridge = (window as Window & { __TAURI__?: Bridge }).__TAURI__;
  if (!desktop || !bridge?.core?.invoke)
    return Promise.reject(
      new Error("Abra esta função no aplicativo VIO para Windows."),
    );
  return bridge.core.invoke<T>(command, args).catch((error: unknown) => {
    throw error instanceof Error
      ? error
      : new Error(
          typeof error === "string"
            ? error
            : "O Windows não confirmou esta ação.",
        );
  });
}

export function decodePacket(buffer: ArrayBuffer) {
  if (
    !(buffer instanceof ArrayBuffer) ||
    buffer.byteLength < 32 ||
    buffer.byteLength > 38432
  )
    throw new Error("O áudio do Windows retornou um pacote inválido.");
  const view = new DataView(buffer);
  const state = view.getUint32(8, true);
  const frames = view.getUint32(20, true);
  if (
    view.getUint32(0, true) !== 0x56494f41 ||
    view.getUint32(4, true) !== 1 ||
    view.getUint32(24, true) !== 48000 ||
    state > 3 ||
    frames > 4800 ||
    buffer.byteLength !== 32 + frames * 8
  )
    throw new Error("O formato de áudio do Windows não é compatível.");
  return {
    state,
    sequence: view.getUint32(12, true),
    dropped: view.getUint32(16, true),
    error: view.getUint32(28, true),
    pcm: new Float32Array(buffer, 32),
  };
}
