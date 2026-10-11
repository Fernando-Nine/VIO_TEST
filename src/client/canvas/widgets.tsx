import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  MonitorUp,
  Settings2,
  Volume2,
  VolumeX,
  Users,
  Headphones,
  Eye,
  SlidersHorizontal,
  Activity,
  Clock3,
  NotebookPen,
  Timer,
  Blocks,
  type LucideIcon,
} from "lucide-react";
import type { Controller } from "../room/controller";
import { Media } from "../components/Media";
import { ParticipantCard } from "../components/ParticipantCard";
import { Spectators } from "../components/Spectators";
import { RoomLimit } from "../components/RoomStatus";
import { screenResolutions } from "../../shared/protocol";
import { CustomWidget, createContent, widgetValue } from "./CustomWidget";
import { freshKey } from "../id";
import type { WidgetInstance } from "./model";

export interface WidgetProps {
  widget: WidgetInstance;
  engine: Controller;
  visible: boolean;
  focused: boolean;
  height: number;
  settings: () => void;
  people: () => void;
  diagnostics: () => void;
  share: () => void;
}
export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  minimum: { width: number; height: number };
  preferred: { width: number; height: number };
  canFloat: boolean;
  autoHide?: boolean;
  apiVersion: 1;
  icon: LucideIcon;
  render: ComponentType<WidgetProps>;
}
function ScreenWidget({
  widget,
  engine,
  visible,
  focused,
  height,
  diagnostics,
}: WidgetProps) {
  const id = widget.config.publicationId;
  const info = engine.screenInfo(id);
  const own = info?.publication.owner === engine.view.id;
  const stream = own
    ? engine.captures.sources.get("screen")?.stream
    : engine.peers.stream(id);
  const box = useRef<HTMLDivElement>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const doc = box.current?.ownerDocument;
  useEffect(() => {
    const current = doc || document;
    const changed = () => setPageVisible(current.visibilityState !== "hidden");
    current.addEventListener("visibilitychange", changed);
    changed();
    return () => current.removeEventListener("visibilitychange", changed);
  }, [doc]);
  const targetHeight = Math.min(
    2160,
    Math.max(
      120,
      Math.ceil((height * Math.min(devicePixelRatio || 1, 1.5)) / 120) * 120,
    ),
  );
  useEffect(() => {
    if (own) return;
    const timer = setTimeout(
      () =>
        engine.setVideoDemand(id, {
          video:
            !visible || !pageVisible
              ? "off"
              : focused
                ? "focus"
                : height < 330
                  ? "small"
                  : "fit",
          height: targetHeight,
        }),
      220,
    );
    return () => clearTimeout(timer);
  }, [
    engine,
    id,
    own,
    visible,
    pageVisible,
    focused,
    targetHeight,
    height < 330,
  ]);
  return (
    <div className="widget-screen" ref={box}>
      <Media
        stream={stream}
        label={`Transmissão de ${info?.name || "participante"}`}
        className="main-video"
        muted
      />
      {!stream?.getVideoTracks().length && (
        <div className="widget-screen-wait" role="status">
          <MonitorUp size={28} />
          <p>Conectando à transmissão…</p>
          <button className="text-button" onClick={diagnostics}>
            Ver conexão
          </button>
        </div>
      )}
      <div className="widget-live">
        <i className="live-pulse" />
        {info?.publication.muted ? "VÍDEO PAUSADO" : "AO VIVO"}
        {own && (
          <span>
            {" "}
            · {engine.captures.quality.resolution}p /{" "}
            {engine.captures.quality.fps} FPS
          </span>
        )}
      </div>
    </div>
  );
}
function PeopleWidget({ engine, visible, people, widget }: WidgetProps) {
  const ids = useRef(new Set<string>());
  const preview = useCallback(
    (id: string, state: boolean) => {
      if (state) ids.current.add(id);
      else ids.current.delete(id);
      engine.previews([...ids.current], widget.id);
    },
    [engine, widget.id],
  );
  useEffect(() => () => engine.previews([], widget.id), [engine, widget.id]);
  const members =
    engine.view.snapshot?.participants.filter(
      (p) => widget.type !== "call" || p.inCall,
    ) || [];
  return (
    <div className="widget-people">
      <div className="widget-people-summary">
        <span>
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
        <RoomLimit
          count={engine.view.snapshot?.participants.length || 0}
          threshold={6}
        />
        <button className="text-button" onClick={people}>
          Minha cor
        </button>
      </div>
      <div className="widget-people-grid">
        {members.map((person) => (
          <ParticipantCard
            key={person.id}
            person={person}
            engine={engine}
            visible={visible}
            onVisible={preview}
            onEditColor={people}
          />
        ))}
      </div>
      {!members.length && (
        <p className="widget-empty">Ninguém na chamada ainda.</p>
      )}
    </div>
  );
}
function MixerWidget({ engine }: WidgetProps) {
  const screens = engine.view.watching.filter(
    (id) => engine.screenInfo(id)?.publication.owner !== engine.view.id,
  );
  const voices =
    engine.view.snapshot?.participants.filter(
      (p) => p.id !== engine.view.id && p.inCall,
    ) || [];
  return (
    <div className="widget-mixer">
      <p className="field-note">
        Volumes individuais. O volume geral continua valendo para todos.
      </p>
      {screens.map((id) => {
        const level = engine.screenLevel(id);
        const name = engine.screenInfo(id)?.name || "Participante";
        return (
          <div className="mixer-row" key={id}>
            <label>
              Tela · {name}
              <output>{Math.round(level.volume * 100)}%</output>
              <input
                aria-label={`Volume da tela de ${name}`}
                type="range"
                min={0}
                max={engine.fineAudio ? 3 : 1}
                step={0.05}
                value={level.volume}
                onChange={(e) =>
                  engine.setScreenLevel(id, { volume: +e.target.value })
                }
              />
            </label>
            <button
              className="icon-button"
              aria-label={`${level.muted ? "Ativar" : "Silenciar"} tela de ${name}`}
              onClick={() => engine.setScreenLevel(id, { muted: !level.muted })}
            >
              {level.muted ? <VolumeX /> : <Volume2 />}
            </button>
          </div>
        );
      })}
      {voices.map((person) => (
        <div className="mixer-row" key={person.id}>
          <label>
            Voz · {person.name}
            <output>
              {Math.round((engine.volumes.get(person.id) ?? 1) * 100)}%
            </output>
            <input
              aria-label={`Volume da voz de ${person.name}`}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={engine.volumes.get(person.id) ?? 1}
              onChange={(e) => {
                engine.volumes.set(person.id, +e.target.value);
                engine.bump();
              }}
            />
          </label>
          <button
            className="icon-button"
            aria-label={`Alternar silêncio da voz de ${person.name}`}
            onClick={() => {
              engine.volumes.set(
                person.id,
                (engine.volumes.get(person.id) ?? 1) === 0 ? 1 : 0,
              );
              engine.bump();
            }}
          >
            {engine.volumes.get(person.id) === 0 ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
      ))}
      {!screens.length && !voices.length && (
        <p className="widget-empty">
          Entre na chamada ou aceite uma transmissão para ajustar seu volume.
        </p>
      )}
    </div>
  );
}
function ConnectionWidget({ engine, diagnostics }: WidgetProps) {
  return (
    <div className="widget-connection">
      <p>
        Servidor <strong>{engine.view.signalingPing ?? "—"} ms</strong>
      </p>
      {engine.peers
        .infos()
        .filter((p) => p.tier === "main")
        .map((p) => (
          <section key={p.id}>
            <strong>
              {engine.screenInfo(p.publicationId)?.name ||
                (p.kind === "voice" ? "Voz" : "Mídia")}{" "}
              · {p.sending ? "envio" : "recepção"}
            </strong>
            <dl>
              <div>
                <dt>RTT da mídia</dt>
                <dd>{p.rtt ?? "—"} ms</dd>
              </div>
              <div>
                <dt>Bitrate</dt>
                <dd>{p.bitrate ?? "—"} kbps</dd>
              </div>
              <div>
                <dt>Perda RTP</dt>
                <dd>
                  {p.loss === undefined
                    ? "Indisponível"
                    : `${p.loss.toFixed(1)}%`}
                </dd>
              </div>
              {p.kind === "screen" && (
                <>
                  <div>
                    <dt>Resolução</dt>
                    <dd>
                      {p.width && p.height
                        ? `${p.width} × ${p.height}`
                        : "Indisponível"}
                    </dd>
                  </div>
                  <div>
                    <dt>FPS</dt>
                    <dd>{p.fps ?? "Indisponível"}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>
        ))}
      <button className="secondary" onClick={diagnostics}>
        Mais detalhes
      </button>
    </div>
  );
}
function TimeWidget({ engine, visible }: WidgetProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const update = () => setNow(engine.serverNow());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [engine, visible]);
  const show = (seconds: number) =>
    `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const publication = engine.publications.get("screen");
  return (
    <div className="widget-time">
      <span>Sala aberta há</span>
      <output>{show(engine.roomSeconds())}</output>
      <span>Sua transmissão</span>
      <output>
        {publication?.createdAt
          ? show(Math.max(0, (now - publication.createdAt) / 1000))
          : "Sem envio de tela"}
      </output>
    </div>
  );
}
function ViewersWidget({ engine }: WidgetProps) {
  const own = engine.publications.get("screen");
  const viewers = new Set(
    engine.view.snapshot?.screenViewers?.[own?.id || ""] || [],
  );
  return (
    <div className="widget-viewers">
      {own ? (
        <>
          <p>
            {viewers.size}{" "}
            {viewers.size === 1 ? "pessoa assistindo" : "pessoas assistindo"}
          </p>
          <ul>
            {engine.view.snapshot?.participants
              .filter((p) => viewers.has(p.id))
              .map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
          </ul>
          <p className="field-note">
            Inclui quem mantém o áudio em segundo plano.
          </p>
        </>
      ) : (
        <p className="widget-empty">
          Os espectadores aparecem quando você compartilha sua tela.
        </p>
      )}
    </div>
  );
}
function QuickWidget({ engine, settings, share }: WidgetProps) {
  const quality = engine.captures.quality;
  const publication = engine.publications.get("screen");
  return (
    <div className="widget-quick">
      <label>
        Resolução
        <select
          value={quality.resolution}
          onChange={(e) =>
            void engine
              .quality({ ...quality, resolution: +e.target.value })
              .catch((e) => engine.fail(e))
          }
        >
          {screenResolutions.map((p) => (
            <option key={p} value={p}>
              {p}p
            </option>
          ))}
        </select>
      </label>
      <label>
        Quadros por segundo
        <select
          value={quality.fps}
          onChange={(e) =>
            void engine
              .quality({ ...quality, fps: +e.target.value })
              .catch((e) => engine.fail(e))
          }
        >
          {[5, 15, 24, 30, 60].map((f) => (
            <option key={f} value={f}>
              {f} FPS
            </option>
          ))}
        </select>
      </label>
      {publication ? (
        <>
          <p className="field-note">
            Áudio da fonte: {publication.audio ? "incluído" : "não incluído"}.
            Para mudar, escolha a fonte novamente.
          </p>
          <button
            className="secondary"
            onClick={() => {
              const track = engine.captures.sources
                .get("screen")
                ?.stream.getVideoTracks()[0];
              if (!track) return;
              track.enabled = !track.enabled;
              void engine
                .request("state", {
                  publicationId: publication.id,
                  muted: !track.enabled,
                })
                .catch((e) => engine.fail(e));
              engine.bump();
            }}
          >
            {publication.muted ? "Retomar vídeo" : "Pausar só o vídeo"}
          </button>
          <button className="text-button" onClick={share}>
            Escolher outra fonte e áudio
          </button>
        </>
      ) : (
        <button className="primary" onClick={share}>
          <MonitorUp size={17} /> Compartilhar
        </button>
      )}
      <button className="text-button" onClick={settings}>
        <Settings2 size={16} /> Todos os ajustes
      </button>
    </div>
  );
}
const definition = (
  id: string,
  title: string,
  description: string,
  render: ComponentType<WidgetProps>,
  autoHide = false,
): WidgetDefinition => ({
  id,
  title,
  description,
  minimum: { width: 140, height: 100 },
  preferred: { width: 340, height: 280 },
  canFloat: true,
  apiVersion: 1,
  icon: (
    {
      screen: MonitorUp,
      people: Users,
      call: Headphones,
      viewers: Eye,
      mixer: SlidersHorizontal,
      connection: Activity,
      time: Clock3,
      quick: Settings2,
      notes: NotebookPen,
      timer: Timer,
      custom: Blocks,
    } as Record<string, LucideIcon>
  )[id],
  render,
  autoHide,
});
export const widgetRegistry: Record<string, WidgetDefinition> = {
  screen: definition(
    "screen",
    "Transmissão",
    "Uma tela escolhida por você.",
    ScreenWidget,
  ),
  people: definition(
    "people",
    "Pessoas na sala",
    "Quem está aqui, compartilha e participa da chamada.",
    PeopleWidget,
    true,
  ),
  call: definition(
    "call",
    "Pessoas na chamada",
    "Voz, câmera e indicadores de fala.",
    PeopleWidget,
    true,
  ),
  viewers: definition(
    "viewers",
    "Meus espectadores",
    "Quem mantém sua transmissão conectada.",
    ViewersWidget,
  ),
  mixer: definition(
    "mixer",
    "Mixer de volume",
    "Vozes e transmissões num só lugar.",
    MixerWidget,
  ),
  connection: definition(
    "connection",
    "Conexão",
    "Ping, bitrate, perda e qualidade da mídia.",
    ConnectionWidget,
  ),
  time: definition(
    "time",
    "Tempo da sala",
    "Duração da sala e do seu compartilhamento.",
    TimeWidget,
  ),
  quick: definition(
    "quick",
    "Minha tela",
    "Qualidade, FPS e pausa do vídeo.",
    QuickWidget,
    true,
  ),
  notes: definition(
    "notes",
    "Notas",
    "Texto individual, com opção de compartilhar.",
    CustomWidget,
  ),
  timer: definition(
    "timer",
    "Cronômetro",
    "Contagem livre ou regressiva.",
    CustomWidget,
  ),
  custom: definition(
    "custom",
    "Personalizado",
    "Um placar com os seus contadores de pontos.",
    CustomWidget,
  ),
};
export function createWidget(type: string): WidgetInstance {
  const def = widgetRegistry[type];
  if (!def || type === "custom") throw new Error("Widget indisponível.");
  return {
    id: freshKey(),
    type,
    title: def.title,
    config: {},
    ...(["notes", "timer", "custom"].includes(type)
      ? { state: createContent(type) }
      : {}),
  };
}
export function titleOf(widget: WidgetInstance, engine: Controller) {
  if (widget.type === "screen") {
    const info = engine.screenInfo(widget.config.publicationId);
    return `${info?.name || "Participante"}${info?.publication.owner === engine.view.id ? " · minha prévia" : ""}`;
  }
  if (["custom", "notes", "timer"].includes(widget.type))
    return widgetValue(widget, engine)?.title || widget.title;
  return widget.title;
}
export function HeaderAccessory({
  widget,
  engine,
}: {
  widget: WidgetInstance;
  engine: Controller;
}) {
  return widget.type === "screen" ? (
    <Spectators engine={engine} publicationId={widget.config.publicationId} />
  ) : null;
}
