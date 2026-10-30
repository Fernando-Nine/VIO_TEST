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
  type DesktopSource,
} from "../desktop/bridge";
import { selectProcess, selectVideo } from "../desktop/capture";
import {
  listSoundSources,
  listVideoSources,
  soundIcon,
  startNativeShare,
  startNativeSound,
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

/** "sound": an application's sound without an image, app only (#229). */
type Tab = ShareSurface | "sound";

const tabInfo: Record<
  Tab,
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
  sound: {
    label: "Só som",
    icon: Volume2,
    sound: "Som",
    picker: "o som",
  },
};
/** Native sound captures at once; see MAX_AUDIO in src-tauri/src/capture.rs. */
const maxSounds = 3;

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
  | {
      state: "on";
      sources: VideoSource[];
      sounds: DesktopSource[];
      processAudio: boolean;
    };

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
  const [tab, setTab] = useState<Tab>("monitor");
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

  async function list(surface: Tab) {
    setLoading(true);
    setError("");
    try {
      const [sources, caps] = await Promise.all([
        listVideoSources(),
        nativeInvoke<DesktopCapabilities>("desktop_capabilities").catch(
          () => undefined,
        ),
      ]);
      const processAudio = caps?.protocol === 1 && caps.processAudio;
      // Sound ids, like video ids, are valid for one listing.
      const sounds =
        surface === "sound" && processAudio ? await listSoundSources() : [];
      setNative({ state: "on", sources, sounds, processAudio });
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
    native.state === "on" && tab !== "sound"
      ? native.sources.filter(
          (s) => s.kind === (tab === "monitor" ? "screen" : "window"),
        )
      : [];

  useEffect(() => {
    if (native.state !== "on") return;
    let cancelled = false;
    const created: string[] = [];
    setThumbs({});
    // Three at a time, in list order (#247): the app renders them in parallel.
    // Programs in "Só som" get their icon the same way.
    const queue: (() => Promise<string | undefined>)[] = [];
    const ids: string[] = [];
    for (const source of visible) {
      queue.push(() => videoThumbnail(source));
      ids.push(source.id);
    }
    if (tab === "sound")
      for (const source of native.sounds.filter((s) => !s.system)) {
        queue.push(() => soundIcon(source));
        ids.push(source.id);
      }
    const worker = async () => {
      for (let load = queue.shift(); load; load = queue.shift()) {
        const id = ids.shift() as string;
        let url: string | null = null;
        try {
          url = (await load()) ?? null;
        } catch {
          url = null;
        }
        // A thumbnail that lands after the picker moved on is dropped at once.
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (url) created.push(url);
        setThumbs((current) => ({ ...current, [id]: url }));
      }
    };
    for (let i = 0; i < 3; i++) void worker();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [native]);

  const web = !desktop;
  const browserTab = web && chromium();
  const soundTab = native.state === "on" && native.processAudio && !replace;
  const surfaces: Tab[] = browserTab
    ? ["monitor", "window", "browser"]
    : soundTab
      ? ["monitor", "window", "sound"]
      : ["monitor", "window"];
  // The app sends up to 3 sounds (#229); the native side refuses duplicates.
  const othersWithSound = [...engine.publications].filter(
    ([held, p]) => held !== slot && p.kind === "screen" && p.audio,
  ).length;
  const soundTaken = !desktop
    ? undefined
    : othersWithSound >= maxSounds
      ? "Você já transmite 3 sons. Encerre um para adicionar outro."
      : tab === "monitor" && othersWithSound
        ? "Todo o som do computador já inclui o som das outras telas."
        : undefined;
  const soundBlocked = soundTaken
    ? soundTaken
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
  const sounds = native.state === "on" && tab === "sound" ? native.sounds : [];
  const selected = visible.find((s) => s.id === chosen);
  const sound = sounds.find((s) => s.id === chosen);
  const ready =
    !!slot &&
    (native.state === "off" ||
      (!loading && (tab === "sound" ? !!sound && !soundTaken : !!selected)));

  async function share() {
    if (busy || !slot) return;
    if (tab === "sound") {
      if (!sound) return;
      setBusy(true);
      setError("");
      try {
        await startNativeSound(engine, { sound, slot });
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

  const empty =
    !loading &&
    native.state === "on" &&
    !(tab === "sound" ? sounds.length : visible.length);
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
                {tab === "monitor"
                  ? "Nenhuma tela encontrada."
                  : "Abra o aplicativo que deseja compartilhar."}
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
                : tab === "sound"
                  ? sounds.map((source) => {
                      const Icon = source.system ? Monitor : Volume2;
                      const icon = thumbs[source.id];
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
                            {icon ? (
                              <img className="share-icon" src={icon} alt="" />
                            ) : (
                              <Icon size={28} aria-hidden="true" />
                            )}
                            {chosen === source.id && (
                              <span className="share-check" aria-hidden="true">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            )}
                          </span>
                          <span className="share-name">{source.title}</span>
                          {source.detail && (
                            <span className="share-detail">
                              {source.detail}
                            </span>
                          )}
                        </button>
                      );
                    })
                  : visible.map((source) => {
                      const thumb = thumbs[source.id];
                      const Icon =
                        source.kind === "screen" ? Monitor : AppWindow;
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
                              <img
                                className={
                                  source.minimized ? "share-icon" : undefined
                                }
                                src={thumb}
                                alt=""
                              />
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
      {tab !== "sound" && (
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
      )}
      {!slot ? (
        <p className="share-limit" role="status">
          Você já transmite 3 telas. Encerre uma para compartilhar outra.
        </p>
      ) : (
        tab === "sound" &&
        soundTaken && (
          <p className="share-limit" role="status">
            {soundTaken}
          </p>
        )
      )}
      <div className="share-footer">
        {tab !== "sound" && (
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
        )}
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
