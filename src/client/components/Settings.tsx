import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  PersonStanding,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Crown,
  Info,
  Mic,
  Palette,
  Search,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Controller } from "../room/controller";
import {
  presets,
  screenResolutions,
  type Quality,
} from "../../shared/protocol";
import { canManageRoom } from "../../shared/permissions";
import {
  MasterVolume,
  NotificationSettings,
  ParticipantColors,
} from "./ApplicationSettings";
import { applyMotion } from "./motion";
import { version } from "../../shared/releases";
import { ColorPicker } from "./ColorPicker";
import { Dialog } from "./Dialog";
import { outputError } from "../media/audio-output";
import { api, invite } from "../endpoint";

type Category =
  | "audio"
  | "video"
  | "notifications"
  | "appearance"
  | "accessibility"
  | "app"
  | "room";
const categories: {
  id: Category;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { id: "audio", label: "Áudio", hint: "Microfone, saída, voz", icon: Mic },
  { id: "video", label: "Vídeo", hint: "Câmera, prévias, tela", icon: Video },
  {
    id: "notifications",
    label: "Notificações",
    hint: "Balões e sons",
    icon: Bell,
  },
  { id: "appearance", label: "Aparência", hint: "Minha cor", icon: Palette },
  {
    id: "accessibility",
    label: "Acessibilidade",
    hint: "Movimento",
    icon: PersonStanding,
  },
  { id: "app", label: "Aplicativo", hint: "Versão, código-fonte", icon: Info },
  { id: "room", label: "Sala", hint: "Convite, edição, posse", icon: Crown },
];
/** What the search finds; `text` is how the item starts on its page. */
const searchable: { label: string; category: Category; text?: string }[] = [
  { label: "Microfone", category: "audio" },
  { label: "Sensibilidade", category: "audio" },
  { label: "Reduzir ruído", category: "audio" },
  { label: "Cancelar eco", category: "audio" },
  { label: "Ganho automático", category: "audio" },
  { label: "Saída de áudio", category: "audio", text: "Reproduzir em" },
  { label: "Volume geral", category: "audio" },
  { label: "Ajuste fino das telas", category: "audio" },
  { label: "Câmera", category: "video" },
  { label: "Prévias ao vivo", category: "video" },
  { label: "Qualidade da tela", category: "video", text: "Compartilhamento" },
  { label: "Balões", category: "notifications", text: "Avisos" },
  { label: "Alguém entrou ou saiu", category: "notifications" },
  { label: "Nova tela", category: "notifications" },
  { label: "Widgets", category: "notifications" },
  { label: "Sons do VIO", category: "notifications" },
  { label: "Volume dos efeitos", category: "notifications" },
  { label: "Minha cor", category: "appearance" },
  { label: "Cores das pessoas", category: "appearance" },
  { label: "Reduzir movimento", category: "accessibility" },
  { label: "Versão", category: "app" },
  { label: "Novidades", category: "app" },
  { label: "Código-fonte", category: "app" },
  { label: "Convite", category: "room" },
  { label: "Permissões", category: "room" },
  { label: "Transferir posse", category: "room", text: "Posse da sala" },
];
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const narrowQuery = "(max-width: 640px)";
function useNarrow() {
  return useSyncExternalStore(
    (change) => {
      const query = matchMedia(narrowQuery);
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    () => matchMedia(narrowQuery).matches,
  );
}

/** Live input level against the gate threshold, both in dB (-65 to -20). */
function VoiceMeter({ engine }: { engine: Controller }) {
  const bar = useRef<HTMLSpanElement>(null);
  const capture = engine.captures;
  const live = capture.sources.has("voice");
  useEffect(() => {
    if (!live) return;
    let frame = 0;
    const draw = () => {
      const db = capture.inputDb;
      if (bar.current) {
        bar.current.style.width = `${percent(db)}%`;
        bar.current.classList.toggle("is-open", db > capture.threshold);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [live, capture]);
  return (
    <div className="voice-meter" aria-hidden="true">
      <span ref={bar} />
      <i style={{ left: `${percent(capture.threshold)}%` }} />
    </div>
  );
}
const percent = (db: number) =>
  Math.max(0, Math.min(100, ((db + 65) / 45) * 100));

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="settings-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
function Toggle({
  label,
  note,
  checked,
  disabled,
  change,
}: {
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  change: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>
        {label}
        {note && <small>{note}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => change(e.target.checked)}
      />
    </label>
  );
}

export function Settings({
  engine,
  openPeople,
  openHistory,
}: {
  engine: Controller;
  openPeople: () => void;
  openHistory: () => void;
}) {
  const narrow = useNarrow();
  const manages = canManageRoom(engine.view.snapshot, engine.view.id);
  const shownCategories = categories.filter((c) => c.id !== "room" || manages);
  const [chosen, setChosen] = useState<Category | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<string | null>(null);
  // Wide screens always show a page; narrow ones start on the list.
  const category =
    chosen && shownCategories.some((c) => c.id === chosen)
      ? chosen
      : narrow
        ? null
        : "audio";
  const page = useRef<HTMLDivElement>(null);
  const results = query.trim()
    ? searchable.filter(
        (item) =>
          shownCategories.some((c) => c.id === item.category) &&
          fold(item.label).includes(fold(query)),
      )
    : null;
  function choose(next: Category) {
    setChosen(next);
    setFound(null);
    page.current?.scrollTo({ top: 0 });
  }
  function open(item: (typeof searchable)[number]) {
    setChosen(item.category);
    setFound(item.text || item.label);
  }
  // Scroll to the found item and flash it once its page is on screen.
  useEffect(() => {
    if (!found || !page.current) return;
    const target = [
      ...page.current.querySelectorAll<HTMLElement>(
        "legend, label, .toggle > span, th, h4, p, a",
      ),
    ].find((el) => fold(el.textContent || "").startsWith(fold(found)));
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    target.classList.add("is-found");
    const timer = setTimeout(() => target.classList.remove("is-found"), 1600);
    return () => {
      clearTimeout(timer);
      target.classList.remove("is-found");
    };
  }, [found, category]);
  function keys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const last = shownCategories.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : (index + (event.key === "ArrowDown" ? 1 : last)) %
            shownCategories.length;
    choose(shownCategories[next].id);
    event.currentTarget
      .closest(".settings-nav")
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  const current = categories.find((c) => c.id === category);
  const tab = (
    { id, label, hint, icon: Icon }: (typeof categories)[number],
    index: number,
  ) => (
    <button
      key={id}
      id={`settings-tab-${id}`}
      type="button"
      role="tab"
      aria-selected={category === id}
      aria-controls="settings-page"
      tabIndex={category === id || (!category && index === 0) ? 0 : -1}
      onClick={() => choose(id)}
      onKeyDown={(e) => keys(e, index)}
    >
      <Icon size={18} aria-hidden="true" />
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <ChevronRight className="settings-chevron" size={18} aria-hidden="true" />
    </button>
  );
  const personal = shownCategories.filter((c) => c.id !== "room");
  return (
    <div className={`settings-layout ${category ? "has-page" : ""}`}>
      <div className="settings-nav">
        <label className="settings-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar ajuste"
            aria-label="Buscar ajuste"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results?.[0]) open(results[0]);
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
          />
        </label>
        {results ? (
          <ul className="settings-results" aria-label="Resultados da busca">
            {results.map((item) => (
              <li key={item.label}>
                <button type="button" onClick={() => open(item)}>
                  {item.label}
                  <small>
                    {categories.find((c) => c.id === item.category)?.label}
                  </small>
                </button>
              </li>
            ))}
            {!results.length && (
              <li className="settings-empty">Nenhum ajuste com esse nome.</li>
            )}
          </ul>
        ) : (
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="Categorias dos ajustes"
          >
            <p className="settings-nav-group" aria-hidden="true">
              Configurações
            </p>
            {personal.map(tab)}
            {manages && (
              <>
                <p className="settings-nav-group" aria-hidden="true">
                  Esta sala
                </p>
                {tab(categories.find((c) => c.id === "room")!, personal.length)}
              </>
            )}
          </div>
        )}
      </div>
      {current && (
        <div
          ref={page}
          id="settings-page"
          role="tabpanel"
          className="settings-page"
          aria-labelledby={`settings-tab-${current.id}`}
        >
          <header>
            {narrow && (
              <button
                type="button"
                className="icon-button"
                aria-label="Voltar às categorias"
                onClick={() => setChosen(null)}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h3>{current.label}</h3>
          </header>
          {current.id === "audio" && <AudioPage engine={engine} />}
          {current.id === "video" && <VideoPage engine={engine} />}
          {current.id === "notifications" && (
            <NotificationSettings engine={engine} />
          )}
          {current.id === "appearance" && (
            <>
              <ColorPicker engine={engine} />
              <ParticipantColors engine={engine} />
            </>
          )}
          {current.id === "accessibility" && (
            <AccessibilityPage engine={engine} />
          )}
          {current.id === "app" && <AppPage openHistory={openHistory} />}
          {current.id === "room" && (
            <RoomPage engine={engine} openPeople={openPeople} />
          )}
        </div>
      )}
    </div>
  );
}

function AccessibilityPage({ engine }: { engine: Controller }) {
  return (
    <Group title="Movimento">
      <fieldset className="settings-choice">
        <legend>Reduzir movimento</legend>
        {(
          [
            ["system", "Seguir o sistema"],
            ["reduce", "Sempre"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="motion"
              checked={engine.motion === value}
              onChange={() => {
                engine.motion = value;
                applyMotion(value);
                engine.savePreferences();
                engine.bump();
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="field-note">
        Sempre: animações e transições ficam instantâneas, mesmo que o sistema
        permita movimento.
      </p>
    </Group>
  );
}

function AppPage({ openHistory }: { openHistory: () => void }) {
  return (
    <Group title="VIO">
      <p className="settings-version">
        Versão <output>{version}</output>
      </p>
      <div className="room-invite">
        <button type="button" className="secondary" onClick={openHistory}>
          Novidades
        </button>
        <a className="text-button" href={api("/source.tar.gz")} download>
          Código-fonte · AGPLv3 <ArrowUpRight size={15} />
        </a>
      </div>
    </Group>
  );
}

function useDevices(engine: Controller) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const capture = engine.captures;
  useEffect(() => {
    const update = () =>
      void navigator.mediaDevices
        ?.enumerateDevices()
        .then(setDevices)
        .catch((e) => engine.fail(e));
    update();
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", update);
  }, [engine, capture.sources.has("voice"), capture.sources.has("camera")]);
  const options = (kind: MediaDeviceKind) =>
    devices
      .filter((d) => d.kind === kind)
      .map((d, i) => (
        <option key={d.deviceId || i} value={d.deviceId}>
          {d.label || `Dispositivo ${i + 1}`}
        </option>
      ));
  return { options, refresh: setDevices };
}

function AudioPage({ engine }: { engine: Controller }) {
  const capture = engine.captures;
  const { options, refresh } = useDevices(engine);
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingOutput, setSavingOutput] = useState(false);
  const effective = capture.voiceEffective();
  const supports = navigator.mediaDevices?.getSupportedConstraints() || {};
  const outputDevices = navigator.mediaDevices as MediaDevices & {
    selectAudioOutput?: (options?: {
      deviceId?: string;
    }) => Promise<MediaDeviceInfo>;
  };
  const chooseOutput = async (id?: string) => {
    setSavingOutput(true);
    try {
      let selected = id || "";
      if (id !== "" && outputDevices?.selectAudioOutput) {
        try {
          selected = (await outputDevices.selectAudioOutput({ deviceId: id }))
            .deviceId;
        } catch (error) {
          // Cancelling the browser picker leaves the current output untouched.
          if (error instanceof Error && error.name === "NotAllowedError")
            return;
          throw error;
        }
      }
      await engine.output.select(selected);
      engine.savePreferences();
      // A list refresh failure must not report a successful output change as failed.
      void navigator.mediaDevices
        .enumerateDevices()
        .then(refresh)
        .catch(() => {});
    } catch (error) {
      engine.fail(
        new Error(
          `${outputError(error)} Escolha outra saída em Ajustes → Áudio.`,
        ),
      );
    } finally {
      setSavingOutput(false);
    }
  };
  return (
    <>
      <Group title="Voz">
        <label>
          Microfone
          <select
            value={capture.micDevice}
            onChange={(e) =>
              void capture
                .changeMicrophone(e.target.value)
                .then(() => engine.savePreferences())
                .catch((e) => engine.fail(e))
            }
          >
            <option value="">Padrão do sistema</option>
            {options("audioinput")}
          </select>
        </label>
        <label>
          Sensibilidade <output>{capture.threshold} dB</output>
          <VoiceMeter engine={engine} />
          <input
            aria-label="Sensibilidade do microfone"
            type="range"
            min="-65"
            max="-20"
            value={capture.threshold}
            onChange={(e) => {
              capture.threshold = +e.target.value;
              engine.savePreferences();
            }}
          />
        </label>
        <p className="field-note">Abaixo da marca, o microfone fica fechado.</p>
        {(
          [
            ["echoCancellation", "Cancelar eco"],
            ["noiseSuppression", "Reduzir ruído"],
            ["autoGainControl", "Ganho automático"],
          ] as const
        ).map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            note={
              !supports[key]
                ? "Este navegador não oferece."
                : effective?.[key] === false && capture.voiceSettings[key]
                  ? "O navegador não aplicou."
                  : undefined
            }
            checked={capture.voiceSettings[key]}
            disabled={!supports[key] || savingVoice}
            change={(checked) => {
              setSavingVoice(true);
              void capture
                .setVoiceSettings({ ...capture.voiceSettings, [key]: checked })
                .then(() => engine.savePreferences())
                .catch((error) => engine.fail(error))
                .finally(() => setSavingVoice(false));
            }}
          />
        ))}
        {!capture.voiceSettings.autoGainControl && (
          <label>
            Ganho manual{" "}
            <output>{Math.round(capture.manualGain * 100)}%</output>
            <input
              aria-label="Ganho manual do microfone"
              type="range"
              min="20"
              max="300"
              step="5"
              value={Math.round(capture.manualGain * 100)}
              onChange={(e) => {
                capture.setManualGain(+e.target.value / 100);
                engine.savePreferences();
              }}
            />
          </label>
        )}
        {capture.sources.has("voice") && (
          <button
            className="text-button"
            onClick={() => void engine.stop("voice")}
          >
            Desconectar microfone e liberar dispositivo
          </button>
        )}
      </Group>
      <Group title="Saída">
        {engine.output.supported && (
          <>
            {engine.output.restoreMessage && (
              <p className="field-note" role="status">
                {engine.output.restoreMessage}
              </p>
            )}
            <label>
              Reproduzir em
              <select
                value={engine.output.deviceId}
                disabled={savingOutput}
                onChange={(e) => void chooseOutput(e.target.value)}
              >
                <option value="">Padrão do sistema</option>
                {options("audiooutput")}
              </select>
            </label>
            {typeof outputDevices?.selectAudioOutput === "function" && (
              <button
                className="text-button"
                disabled={savingOutput}
                onClick={() =>
                  void chooseOutput(engine.output.pendingDeviceId || undefined)
                }
              >
                {engine.output.pendingDeviceId
                  ? "Confirmar saída salva no navegador"
                  : "Escolher outra saída no navegador"}
              </button>
            )}
          </>
        )}
        <MasterVolume engine={engine} />
        <Toggle
          label="Ajuste fino das telas"
          note="Volume das telas até 300%, só para você."
          checked={engine.fineAudio}
          disabled={!engine.playback.supported}
          change={(checked) => engine.setFineAudio(checked)}
        />
      </Group>
    </>
  );
}

function VideoPage({ engine }: { engine: Controller }) {
  const capture = engine.captures;
  const { options } = useDevices(engine);
  const [quality, setQuality] = useState<Quality>(capture.quality);
  useEffect(() => {
    const timer = setTimeout(
      () => void engine.quality(quality).catch((e) => engine.fail(e)),
      350,
    );
    return () => clearTimeout(timer);
  }, [quality, engine]);
  const screen = capture.sources
    .get("screen")
    ?.stream.getVideoTracks()[0]
    ?.getSettings();
  const supports = navigator.mediaDevices?.getSupportedConstraints() || {};
  const sending = engine.peers
    .infos()
    .filter((p) => p.sending && p.kind === "screen");
  return (
    <>
      <Group title="Câmera">
        <label>
          Câmera
          <select
            value={capture.cameraDevice}
            onChange={(e) => {
              const id = e.target.value;
              if (capture.sources.has("camera"))
                void capture
                  .startCamera(id)
                  .then(() => engine.savePreferences())
                  .catch((e) => engine.fail(e));
              else {
                capture.cameraDevice = id;
                engine.savePreferences();
              }
            }}
          >
            <option value="">Padrão do sistema</option>
            {options("videoinput")}
          </select>
        </label>
        {supports.facingMode && capture.sources.has("camera") && (
          <button
            className="secondary"
            onClick={() =>
              void capture
                .startCamera(
                  "",
                  capture.facing === "user" ? "environment" : "user",
                )
                .then(() => engine.bump())
                .catch((e) => engine.fail(e))
            }
          >
            Alternar frontal / traseira
          </button>
        )}
      </Group>
      <Group title="Prévias">
        <Toggle
          label="Prévias ao vivo"
          note="Miniaturas com vídeo reduzido; desligadas, mostram a inicial."
          checked={engine.previewsEnabled}
          change={(checked) => engine.setPreviews(checked)}
        />
      </Group>
      <Group title="Compartilhamento de tela">
        <div className="segmented">
          {Object.entries(presets).map(([name, q]) => (
            <button
              key={name}
              className={
                JSON.stringify(q) === JSON.stringify(quality) ? "active" : ""
              }
              onClick={() => setQuality({ ...q })}
            >
              {name}
            </button>
          ))}
        </div>
        <label>
          Resolução do envio
          <select
            value={quality.resolution}
            onChange={(e) =>
              setQuality({ ...quality, resolution: +e.target.value })
            }
          >
            {screenResolutions.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}p
              </option>
            ))}
          </select>
        </label>
        <label>
          Quadros por segundo <output>{quality.fps} FPS</output>
          <input
            aria-label="Quadros por segundo"
            type="range"
            min="5"
            max="60"
            step="1"
            value={quality.fps}
            onChange={(e) => setQuality({ ...quality, fps: +e.target.value })}
          />
        </label>
        <label>
          Limite por espectador <output>{quality.bitrate} kbps</output>
          <input
            aria-label="Bitrate da tela"
            type="range"
            min="250"
            max="8000"
            step="50"
            value={quality.bitrate}
            onChange={(e) =>
              setQuality({ ...quality, bitrate: +e.target.value })
            }
          />
        </label>
        {screen && (
          <div className="technical">
            Captura: {screen.width} × {screen.height} ·{" "}
            {Math.round(screen.frameRate || 0)} FPS
            {sending.map((p) => (
              <p key={p.id}>
                {p.tier === "preview" ? "Miniatura" : "Vídeo principal"}:{" "}
                {p.width || "—"} × {p.height || "—"} · {p.fps ?? "—"} FPS ·{" "}
                {p.bitrate ?? "—"} kbps
              </p>
            ))}
          </div>
        )}
        {capture.qualityMessage && (
          <p className="field-note">{capture.qualityMessage}</p>
        )}
      </Group>
    </>
  );
}

function RoomPage({
  engine,
  openPeople,
}: {
  engine: Controller;
  openPeople: () => void;
}) {
  const snapshot = engine.view.snapshot;
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [heir, setHeir] = useState("");
  const [confirm, setConfirm] = useState(false);
  if (!snapshot) return null;
  const creator = snapshot.creatorId === engine.view.id;
  const others = snapshot.participants.filter((p) => p.id !== engine.view.id);
  const heirPerson = others.find((p) => p.id === heir);
  async function copy(what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(
        what === "link" ? invite(snapshot!.code).href : snapshot!.code,
      );
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie.");
    }
  }
  async function run(
    action: Parameters<Controller["request"]>[0],
    data: unknown,
  ) {
    setBusy(true);
    setError("");
    try {
      await engine.request(action, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Group title="Convite">
        <div className="room-invite">
          <code>{snapshot.code}</code>
          <button className="secondary" onClick={() => void copy("code")}>
            {copied === "code" ? "Código copiado" : "Copiar código"}
          </button>
          <button className="primary" onClick={() => void copy("link")}>
            {copied === "link" ? "Link copiado" : "Copiar link"}
          </button>
        </div>
      </Group>
      {!!snapshot.widgets?.length && (
        <Group title="Convidados controlam">
          {snapshot.widgets.map((w) => (
            <Toggle
              key={w.id}
              label={w.title}
              checked={!!w.allGuestsEdit}
              disabled={busy}
              change={(allowed) =>
                void run("widget-permission", {
                  id: w.id,
                  allGuests: true,
                  allowed,
                })
              }
            />
          ))}
        </Group>
      )}
      <Group title="Permissões">
        <button className="secondary" onClick={openPeople}>
          Abrir permissões em Pessoas
        </button>
      </Group>
      {creator && (
        <Group title="Posse da sala">
          {others.length ? (
            <div className="room-transfer">
              <select
                aria-label="Nova pessoa responsável pela sala"
                value={heir}
                onChange={(e) => setHeir(e.target.value)}
              >
                <option value="">Escolha uma pessoa</option>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {heirPerson && (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  Transferir posse
                </button>
              )}
            </div>
          ) : (
            <p className="field-note">
              Quando outra pessoa entrar, você pode passar a sala para ela.
            </p>
          )}
        </Group>
      )}
      {error && <p role="alert">{error}</p>}
      {confirm && heirPerson && (
        <Dialog
          title={`Transferir a sala para ${heirPerson.name}?`}
          centered
          close={() => setConfirm(false)}
        >
          <p>Você deixa de ser o criador e passa a ser administrador.</p>
          <div className="notification-actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setHeir("");
                void run("role", {
                  participantId: heirPerson.id,
                  action: "transfer",
                });
              }}
            >
              Transferir
            </button>
            <button className="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
