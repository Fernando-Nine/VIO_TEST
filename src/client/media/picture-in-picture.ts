import { useCallback, useEffect, useRef, useState } from "react";
import { desktop, nativeInvoke } from "../desktop/bridge";

type DocumentPip = {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
};
/** Move a stable React portal host, including its event listeners and live media. */
export function usePictureInPicture() {
  const active = useRef<Window | null>(null);
  const generation = useRef(0);
  const opening = useRef(false);
  const restore = useRef<() => void>(() => {});
  const [detached, setDetached] = useState(false);
  const [native, setNative] = useState(false);
  const compact = useRef(false);
  const [desktopCompact, setDesktopCompact] = useState(false);
  const api = (window as Window & { documentPictureInPicture?: DocumentPip })
    .documentPictureInPicture;
  const supported = desktop || !!api || !!document.pictureInPictureEnabled;
  const close = useCallback(() => {
    generation.current++;
    if (desktop && (compact.current || opening.current))
      void nativeInvoke("desktop_compact", { enabled: false }).catch(() => {});
    compact.current = false;
    setDesktopCompact(false);
    const pip = active.current;
    restore.current();
    pip?.close();
    active.current = null;
    setDetached(false);
    if (document.pictureInPictureElement)
      void document.exitPictureInPicture().catch(() => {});
  }, []);
  useEffect(() => close, [close]);
  useEffect(() => {
    const entered = () => setNative(true);
    const left = () => setNative(false);
    document.addEventListener("enterpictureinpicture", entered, true);
    document.addEventListener("leavepictureinpicture", left, true);
    return () => {
      document.removeEventListener("enterpictureinpicture", entered, true);
      document.removeEventListener("leavepictureinpicture", left, true);
    };
  }, []);
  async function toggle(host: HTMLElement, video: HTMLVideoElement | null) {
    if (opening.current) return;
    if (desktop) {
      const attempt = ++generation.current;
      const enabled = !compact.current;
      opening.current = true;
      try {
        await nativeInvoke("desktop_compact", { enabled });
        if (attempt !== generation.current) {
          await nativeInvoke("desktop_compact", { enabled: false });
          return;
        }
        compact.current = enabled;
        setDesktopCompact(enabled);
      } finally {
        opening.current = false;
      }
      return;
    }
    if (active.current || document.pictureInPictureElement) {
      close();
      return;
    }
    if (api) {
      const parent = host.parentNode;
      if (!parent) return;
      const next = host.nextSibling;
      const attempt = ++generation.current;
      opening.current = true;
      let pip: Window;
      try {
        pip = await api.requestWindow({ width: 720, height: 460 });
      } finally {
        opening.current = false;
      }
      if (
        attempt !== generation.current ||
        !parent.isConnected ||
        !host.isConnected
      ) {
        pip.close();
        return;
      }
      active.current = pip;
      pip.document.title = "VIO · Assistindo junto";
      const base = pip.document.createElement("base");
      base.href = document.baseURI;
      pip.document.head.append(base);
      for (const sheet of [...document.styleSheets]) {
        if (sheet.href) {
          const link = pip.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pip.document.head.append(link);
        } else {
          try {
            const style = pip.document.createElement("style");
            style.textContent = [...sheet.cssRules]
              .map((rule) => rule.cssText)
              .join("\n");
            pip.document.head.append(style);
          } catch {
            /* Only accessible styles are copied. */
          }
        }
      }
      pip.document.body.className = "app in-room pip-surface";
      pip.document.body.append(host);
      let restored = false;
      const returnHost = () => {
        if (restored) return;
        restored = true;
        if (parent.isConnected)
          parent.insertBefore(host, next?.parentNode === parent ? next : null);
        else host.remove();
        active.current = null;
        setDetached(false);
      };
      restore.current = returnHost;
      pip.addEventListener("pagehide", returnHost, { once: true });
      setDetached(true);
    } else if (
      video?.requestPictureInPicture &&
      document.pictureInPictureEnabled
    ) {
      if (!video.videoWidth)
        throw new Error(
          "Aguarde o vídeo carregar para abrir a janela flutuante.",
        );
      await video.requestPictureInPicture();
    }
  }
  return {
    supported,
    interactive: desktop || !!api,
    detached,
    active: detached || native || desktopCompact,
    toggle,
    close,
  };
}
