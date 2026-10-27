import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  MonitorUp,
  Settings2,
  Users,
  Radio,
  Activity,
  MessageCircle,
  PencilRuler,
  Timer,
  Blocks,
  Dice5,
  Vote,
  Shuffle,
  ListTodo,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { MenuItem } from "../components/ContextMenu";
import type { Controller } from "../room/controller";
import { Media } from "../components/Media";
import { PeopleWidget } from "./PeopleWidget";
import { MyStreamWidget } from "./MyStreamWidget";
import { Spectators } from "../components/Spectators";
import { ScreenTimer } from "../components/RoomStatus";
import { ScreenVolume } from "../components/ScreenVolume";
import { CustomWidget, createContent, widgetValue } from "./CustomWidget";
import { ChatWidget } from "./ChatWidget";
import { ModuleWidget, createModule, moduleValue } from "./ModuleWidget";
import { isModule } from "../../shared/room-modules";
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
  /** Trocar o que transmito: a new source on the same publication (#160). */
  replaceShare: () => void;
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
  /** Secondary actions offered in the header's right-click menu. */
  menu?: (props: WidgetProps) => MenuItem[];
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
const definition = (
  id: string,
  title: string,
  description: string,
  render: ComponentType<WidgetProps>,
  autoHide = false,
  menu?: WidgetDefinition["menu"],
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
      stream: Radio,
      chat: MessageCircle,
      canvas: PencilRuler,
      timer: Timer,
      custom: Blocks,
      poll: Vote,
      dice: Dice5,
      random: Shuffle,
      tasks: ListTodo,
    } as Record<string, LucideIcon>
  )[id],
  render,
  autoHide,
  menu,
});
const colorItem = ({ people }: WidgetProps): MenuItem[] => [
  { label: "Minha cor", icon: Palette, run: people },
];
export const widgetRegistry: Record<string, WidgetDefinition> = {
  screen: definition(
    "screen",
    "Transmissão",
    "Uma tela escolhida por você.",
    ScreenWidget,
  ),
  people: definition(
    "people",
    "Pessoas",
    "Quem está na chamada e na sala, com o volume de cada voz.",
    PeopleWidget,
    true,
    colorItem,
  ),
  stream: definition(
    "stream",
    "Minha transmissão",
    "Prévia, quem assiste, conexão e controles da sua tela.",
    MyStreamWidget,
    false,
    ({ diagnostics, settings }) => [
      { label: "Detalhes da conexão", icon: Activity, run: diagnostics },
      { label: "Todos os ajustes", icon: Settings2, run: settings },
    ],
  ),
  chat: definition(
    "chat",
    "Chat",
    "Conversa pública da sala em tempo real.",
    ChatWidget,
  ),
  canvas: definition("canvas", "Canvas", "Em breve", () => null),
  poll: definition(
    "poll",
    "Votação",
    "Pergunta, opções e prazo para decidir em conjunto.",
    ModuleWidget,
  ),
  dice: definition(
    "dice",
    "Dados",
    "Comandos, resultados e histórico com autoria.",
    ModuleWidget,
  ),
  random: definition(
    "random",
    "Sorteador",
    "Opções com pesos e retirada de sorteados.",
    ModuleWidget,
  ),
  tasks: definition(
    "tasks",
    "Tarefas + agenda",
    "Etapas, responsáveis e tempo da sessão.",
    ModuleWidget,
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
  if (!def || ["custom", "notes", "canvas", "chat"].includes(type))
    throw new Error("Widget indisponível.");
  return {
    id: freshKey(),
    type,
    title: def.title,
    config: {},
    ...(isModule(type) ? { state: createModule(type) } : {}),
    ...(["notes", "timer", "custom"].includes(type)
      ? { state: createContent(type) }
      : {}),
  };
}
export function titleOf(widget: WidgetInstance, engine: Controller) {
  if (isModule(widget.type))
    return moduleValue(widget, engine)?.title || widget.title;
  if (widget.type === "screen") {
    const info = engine.screenInfo(widget.config.publicationId);
    return `${info?.name || "Participante"}${info?.publication.owner === engine.view.id ? " · minha prévia" : ""}`;
  }
  if (["custom", "notes", "timer", "chat"].includes(widget.type))
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
    <>
      <ScreenTimer
        engine={engine}
        publicationId={widget.config.publicationId}
      />
      <ScreenVolume engine={engine} id={widget.config.publicationId} />
      <Spectators engine={engine} publicationId={widget.config.publicationId} />
    </>
  ) : null;
}
