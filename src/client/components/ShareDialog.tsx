import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AppWindow,
  ArrowUpRight,
  Check,
  Globe,
  Monitor,
  RefreshCw,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import type { Controller } from "../room/controller";
import {
  desktop,
  nativeInvoke,
  type DesktopCapabilities,
} from "../desktop/bridge";
import { selectProcess, selectVideo } from "../desktop/capture";
import {
  listVideoSources,
  startNativeShare,
  videoThumbnail,
  type VideoSource,
} from "../desktop/share";
import { setDisplayVideo, type Slot } from "../media/capture";
import {
  chromium,
  displayVideo,
  loadShareChoice,
  saveShareChoice,
  shareQuality,
  shareRates,
  shareResolutions,
  type ShareChoice,
  type ShareSurface,
} from "./share-options";

const tabInfo: Record<
  ShareSurface,
  { label: string; icon: LucideIcon; sound: string; picker: string }
> = {
  monitor: {
    label: "Tela inteira",
    icon: Monitor,
    sound: "Som do computador",
    picker: "a tela",
  },
  window: {
    label: "Janela do aplicativo",
    icon: AppWindow,
    sound: "Som da janela",
    picker: "a janela",
  },
  browser: {
    label: "Aba do navegador",
    icon: Globe,
    sound: "Som da aba",
    picker: "a aba",
  },
};

/** Arrow keys move between sibling options, as in a native radio group or tablist. */
function roving(event: KeyboardEvent<HTMLElement>) {
  const step =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  if (!step) return;
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    ),
  ];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = items[(index + step + items.length) % items.length];
  if (!next) return;
  event.preventDefault();
  next.focus();
  next.click();
}

function Choices<T extends number | boolean>({
  label,
  value,
  options,
  change,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; disabled?: string }[];
  change: (value: T) => void;
}) {
  return (
    <div
      className="segmented share-choices"
      role="radiogroup"
      aria-label={label}
      onKeyDown={roving}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          className={option.value === value ? "active" : ""}
          disabled={!!option.disabled}
          title={option.disabled}
          onClick={() => change(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type Native =
  | { state: "probe" }
  | { state: "off" }
  | { state: "on"; sources: VideoSource[]; processAudio: boolean };

/**
 * One dialog for every platform (#191): the app lists sources with
 * thumbnails (A); the browser, or an app without native capture, hands the
 * chosen tab to the system picker (B).
 */
export function ShareDialog({
  engine,
  close,
  replace = false,
  slot,
}: {
  engine: Controller;
  close: () => void;
  /** Swap the source of the current share instead of starting a new one (#160). */
  replace?: boolean;
  /** Which screen (#194); none left when MAX_SCREENS are already shared. */
  slot?: Slot;
}) {
  const [choice, setChoice] = useState<ShareChoice>(loadShareChoice);
  const [tab, setTab] = useState<ShareSurface>("monitor");
  const [native, setNative] = useState<Native>(
    desktop ? { state: "probe" } : { state: "off" },
  );
  const [loading, setLoading] = useState(desktop);
  const [chosen, setChosen] = useState("");
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const update = (next: Partial<ShareChoice>) =>
    setChoice((current) => {
      const merged = { ...current, ...next };
      saveShareChoice(merged);
      return merged;
    });

  async function list(surface: ShareSurface) {
    setLoading(true);
    setError("");
    try {
      const [sources, caps] = await Promise.all([
        listVideoSources(),
        nativeInvoke<DesktopCapabilities>("desktop_capabilities").catch(
          () => undefined,
        ),
      ]);
      setNative({
        state: "on",
        sources,
        processAudio: caps?.protocol === 1 && caps.processAudio,
      });
      setChosen(
        surface === "monitor"
          ? (sources.find((s) => s.kind === "screen" && s.primary)?.id ??
              sources.find((s) => s.kind === "screen")?.id ??
              "")
          : "",
      );
    } catch (e) {
      // An app without the native picker (#192) falls back to the WebView2 one.
      setNative((current) =>
        current.state === "on" ? current : { state: "off" },
      );
      if (native.state === "on")
        setError(
          e instanceof Error ? e.message : "Não foi possível listar as fontes.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (desktop) void list(tab);
    // Native ids are valid for one listing; every tab change lists again.
  }, [tab]);

  useEffect(() => {
    requestAnimationFrame(() =>
      tabs.current
        ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus(),
    );
  }, []);

  const visible =
    native.state === "on"
      ? native.sources.filter(
          (s) => s.kind === (tab === "monitor" ? "screen" : "window"),
        )
      : [];

  useEffect(() => {
    if (native.state !== "on") return;
    let cancelled = false;
    const created: string[] = [];
    setThumbs({});
    void (async () => {
      for (const source of visible) {
        let url: string | null = null;
        try {
          url = (await videoThumbnail(source)) ?? null;
        } catch {
          url = null;
        }
        if (url) created.push(url);
        if (cancelled) break;
        setThumbs((current) => ({ ...current, [source.id]: url }));
      }
    })();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [native]);

  const web = !desktop;
  const browserTab = web && chromium();
  const surfaces: ShareSurface[] = browserTab
    ? ["monitor", "window", "browser"]
    : ["monitor", "window"];
  // The app captures one window's or the PC's sound at a time (#194).
  const soundTaken =
    desktop &&
    [...engine.publications].some(
      ([held, p]) => held !== slot && p.kind === "screen" && p.audio,
    );
  const soundBlocked = soundTaken
    ? "No app, só uma tela por vez transmite o som."
    : native.state === "on"
      ? native.processAudio
        ? undefined
        : "O som precisa do Windows 10 versão 2004 ou mais recente."
      : desktop
        ? "Atualize o app para compartilhar o som."
        : !chromium()
          ? "Este navegador não compartilha som. Use o Chrome, o Edge ou o app."
          : tab === "window"
            ? "O navegador não capta o som de uma janela. Use Tela inteira, Aba do navegador ou o app."
            : undefined;
  const audio = choice.audio && !soundBlocked;
  const selected = visible.find((s) => s.id === chosen);
  const ready = !!slot && (native.state === "off" || (!loading && !!selected));

  async function share() {
    if (busy || !slot) return;
    if (native.state === "on") {
      if (!selected) return;
      setBusy(true);
      setError("");
      try {
        await startNativeShare(engine, {
          source: selected,
          quality: shareQuality(choice, selected.height),
          audio: audio ? (tab === "window" ? "app" : "system") : "none",
          replace,
          slot,
        });
        close();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Não foi possível compartilhar.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    // The system picker must open within this click's user activation.
    const quality = shareQuality(choice);
    if (desktop) {
      selectProcess(undefined);
      selectVideo(undefined);
    } else setDisplayVideo(displayVideo(tab, choice));
    void engine
      .startScreen(!!audio, replace, slot)
      .then(() => engine.quality(quality, slot))
      .catch((e) => engine.fail(e));
    close();
  }

  const empty = !loading && native.state === "on" && !visible.length;
  return (
    <div className="share-dialog">
      <div
        ref={tabs}
        className="segmented share-tabs"
        role="tablist"
        aria-label="O que compartilhar"
        onKeyDown={roving}
      >
        {surfaces.map((surface) => {
          const { label, icon: Icon } = tabInfo[surface];
          return (
            <button
              key={surface}
              role="tab"
              aria-selected={tab === surface}
              aria-controls="share-source"
              tabIndex={tab === surface ? 0 : -1}
              className={tab === surface ? "active" : ""}
              onClick={() => setTab(surface)}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      {native.state === "off" ? (
        <p id="share-source" role="tabpanel" className="share-picker-hint">
          <ArrowUpRight size={18} aria-hidden="true" />
          Ao clicar em Compartilhar, o navegador pede para escolher{" "}
          {tabInfo[tab].picker}.
        </p>
      ) : (
        <div
          id="share-source"
          role="tabpanel"
          className="share-sources"
          aria-busy={loading}
        >
          {error ? (
            <div className="share-empty" role="alert">
              <p>{error}</p>
              <button className="secondary" onClick={() => void list(tab)}>
                <RefreshCw size={16} aria-hidden="true" /> Atualizar
              </button>
            </div>
          ) : empty ? (
            <div className="share-empty">
              <p>
                {tab === "window"
                  ? "Abra o aplicativo que deseja compartilhar."
                  : "Nenhuma tela encontrada."}
              </p>
              <button className="secondary" onClick={() => void list(tab)}>
                <RefreshCw size={16} aria-hidden="true" /> Atualizar
              </button>
            </div>
          ) : (
            <div className="share-grid">
              {loading
                ? Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="share-source is-loading">
                      <span className="share-thumb" />
                    </div>
                  ))
                : visible.map((source) => {
                    const thumb = thumbs[source.id];
                    const Icon = source.kind === "screen" ? Monitor : AppWindow;
                    return (
                      <button
                        key={source.id}
                        className="share-source"
                        aria-pressed={chosen === source.id}
                        title={source.title}
                        onClick={() => setChosen(source.id)}
                        onDoubleClick={() => void share()}
                      >
                        <span className="share-thumb">
                          {thumb ? (
                            <img src={thumb} alt="" />
                          ) : thumb === null ? (
                            <Icon size={28} aria-hidden="true" />
                          ) : null}
                          {chosen === source.id && (
                            <span className="share-check" aria-hidden="true">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="share-name">{source.title}</span>
                        <span className="share-meta">
                          {source.width}×{source.height}
                        </span>
                      </button>
                    );
                  })}
            </div>
          )}
        </div>
      )}
      <div className="share-quality">
        <div>
          <span className="share-label">Qualidade</span>
          <Choices
            label="Qualidade"
            value={choice.resolution}
            options={shareResolutions.map((value) => ({
              value,
              label: value ? `${value}p` : "Fonte",
            }))}
            change={(resolution) => update({ resolution })}
          />
        </div>
        <div>
          <span className="share-label">Taxa de quadros</span>
          <Choices
            label="Taxa de quadros"
            value={choice.fps}
            options={shareRates.map((value) => ({
              value,
              label: `${value} FPS`,
            }))}
            change={(fps) => update({ fps })}
          />
        </div>
      </div>
      {!slot && (
        <p className="share-limit" role="status">
          Você já transmite 3 telas. Encerre uma para compartilhar outra.
        </p>
      )}
      <div className="share-footer">
        <div className="share-sound">
          <span className="share-label">{tabInfo[tab].sound}</span>
          <Choices
            label={tabInfo[tab].sound}
            value={!!audio}
            options={[
              {
                value: true,
                label: (
                  <>
                    <Volume2 size={16} aria-hidden="true" /> Com som
                  </>
                ),
                disabled: soundBlocked,
              },
              {
                value: false,
                label: (
                  <>
                    <VolumeX size={16} aria-hidden="true" /> Sem som
                  </>
                ),
              },
            ]}
            change={(value) => update({ audio: value })}
          />
        </div>
        <div className="share-actions">
          <button className="secondary" onClick={close}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={!ready || busy}
            onClick={() => void share()}
          >
            {replace ? "Trocar" : "Compartilhar"}
            {native.state === "off" && <ArrowUpRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
