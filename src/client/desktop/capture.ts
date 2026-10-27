import { browserCapture, type CaptureAdapter } from "../media/capture";
import { decodePacket, nativeInvoke, type DesktopSource } from "./bridge";
import {
  startNativeVideo,
  type NativeVideo,
  type NativeVideoOptions,
} from "./native-video";
import type { VideoSource } from "./video";

let selected: DesktopSource | undefined;
let video: { source: VideoSource; options: NativeVideoOptions } | undefined;
let active: { stop: () => void } | undefined;
let pending: { stop: () => void } | undefined;
let description = "";
// The native side holds one audio capture; a replacement waits for the old one to end.
let released: Promise<unknown> = Promise.resolve();
export function selectProcess(source?: DesktopSource) {
  selected = source;
}
/** With a source, the next share uses native capture instead of the WebView2 picker. */
export function selectVideo(
  source?: VideoSource,
  options?: NativeVideoOptions,
) {
  video = source && options ? { source, options } : undefined;
}

export const windowsCapture: CaptureAdapter = {
  device: browserCapture.device,
  stopScreen: () => {
    pending?.stop();
    active?.stop();
  },
  screenAudioMessage: () => description,
  async screen(audio) {
    // A replacement keeps the current share until the new image is chosen (#160).
    pending?.stop();
    const previous = active;
    const source = selected;
    const chosen = video;
    video = undefined;
    if (audio && !source)
      throw new Error("Escolha o aplicativo cujo áudio deseja transmitir.");
    let native: NativeVideo | undefined;
    // Invoke the system video picker before the first await, within user activation.
    const videoPromise = chosen
      ? startNativeVideo(chosen.source, chosen.options).then((started) => {
          native = started;
          if (stopped) started.stop();
          return new MediaStream([started.track]);
        })
      : navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
    const context = audio
      ? new AudioContext({ sampleRate: 48000, latencyHint: "interactive" })
      : undefined;
    if (context) void context.resume().catch(() => {});
    let stream: MediaStream | undefined;
    let node: AudioWorkletNode | undefined;
    let captureId: string | undefined;
    let destination: MediaStreamAudioDestinationNode | undefined;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (pending?.stop === stop) pending = undefined;
      if (active?.stop === stop) active = undefined;
      stream?.getTracks().forEach((track) => track.stop());
      native?.stop();
      destination?.stream.getTracks().forEach((track) => track.stop());
      node?.port.postMessage("stop");
      node?.port.close();
      node?.disconnect();
      if (context && context.state !== "closed")
        void context.close().catch(() => {});
      if (captureId)
        released = nativeInvoke("desktop_stop_audio", { captureId }).catch(
          () => {},
        );
    };
    pending = { stop };
    const check = () => {
      if (stopped) throw new DOMException("Captura cancelada.", "AbortError");
    };
    try {
      stream = await videoPromise;
      if (stopped) stream.getTracks().forEach((track) => track.stop());
      check();
      const video = stream.getVideoTracks()[0];
      if (!video)
        throw new Error("O Windows não retornou a imagem selecionada.");
      video.addEventListener("ended", stop, { once: true });
      description = native
        ? `Imagem capturada pelo VIO em ${native.width}×${native.height}.`
        : "Compartilhando somente a imagem escolhida.";
      if (audio && context && source) {
        await context.audioWorklet.addModule(
          new URL("./pcm-worklet.js", import.meta.url),
        );
        check();
        node = new AudioWorkletNode(context, "vio-process-audio", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
        });
        destination = context.createMediaStreamDestination();
        node.connect(destination); // Never route the captured audio to local speakers.
        previous?.stop();
        await released;
        check();
        captureId = await nativeInvoke<string>("desktop_start_audio", {
          sourceId: source.id,
        });
        if (stopped)
          void nativeInvoke("desktop_stop_audio", { captureId }).catch(
            () => {},
          );
        check();
        const startedAt = performance.now();
        let packet;
        do {
          packet = decodePacket(
            await nativeInvoke<ArrayBuffer>("desktop_read_audio", {
              captureId,
            }),
          );
          check();
          if (packet.state >= 2)
            throw new Error(
              "O Windows não liberou este áudio. Escolha novamente a fonte ou atualize o Windows.",
            );
          if (performance.now() - startedAt > 7000)
            throw new Error(
              "O Windows demorou para liberar o áudio. Tente novamente.",
            );
        } while (packet.state === 0);
        if (context.state !== "running") await context.resume();
        check();
        if (context.state !== "running")
          throw new Error(
            "Não foi possível ativar o áudio. Tente novamente com o VIO em foco.",
          );
        const track = destination.stream.getAudioTracks()[0];
        stream.addTrack(track);
        description = source.system
          ? "Todo o som do computador via WASAPI, sem as vozes da chamada."
          : `Áudio de ${source.title} via WASAPI, incluindo os processos filhos desse aplicativo.`;
        let dropped = packet.dropped;
        const push = (pcm: Float32Array) => {
          if (pcm.length && node && context.state === "running") {
            const copy = pcm.slice();
            node.port.postMessage(copy, [copy.buffer]);
          }
        };
        push(packet.pcm);
        const end = () => {
          if (stopped) return;
          stop();
          // track.stop() deliberately does not emit ended; notify Captures explicitly.
          video.dispatchEvent(new Event("ended"));
        };
        node.onprocessorerror = end;
        // One outstanding binary request, paced by the native event (20 ms max wait).
        void (async () => {
          while (!stopped) {
            const next = decodePacket(
              await nativeInvoke<ArrayBuffer>("desktop_read_audio", {
                captureId,
              }),
            );
            if (stopped) return;
            if (next.state >= 2) {
              end();
              return;
            }
            if (next.dropped !== dropped) node?.port.postMessage("reset");
            dropped = next.dropped;
            push(next.pcm);
          }
        })().catch(end);
      }
      check();
      previous?.stop();
      pending = undefined;
      active = { stop };
      return stream;
    } catch (error) {
      stop();
      throw error;
    }
  },
};
