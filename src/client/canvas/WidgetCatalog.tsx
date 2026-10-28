import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, Blocks, MonitorUp, Search, Users } from "lucide-react";
import { widgetRegistry, type WidgetDefinition } from "./widgets";
import { searchWidgets } from "./catalog-search";
import { isModule } from "../../shared/room-modules";

export type Scope = "individual" | "room";
/** Tabs by intent (#222); the search looks in all of them. */
const tabs = [
  {
    id: "watch",
    label: "Assistir",
    short: "Assistir",
    ids: ["stream", "cameras"],
  },
  {
    id: "talk",
    label: "Conversar",
    short: "Conversar",
    ids: ["chat", "people"],
  },
  {
    id: "play",
    label: "Decidir e jogar",
    short: "Jogar",
    ids: ["poll", "dice", "random", "custom"],
  },
  { id: "time", label: "Tempo", short: "Tempo", ids: ["timer", "tasks"] },
  { id: "community", label: "Comunidade", short: "Mais", ids: [] },
] as const;
type Tab = (typeof tabs)[number]["id"];
/** Labels for the in-slot icons, where only one or two words fit. */
const shortNames: Record<string, string> = {
  people: "Pessoas",
  cameras: "Câmeras",
  stream: "Minha tela",
  tasks: "Tarefas",
};
/** Can be the room's (#190); the rest is only yours. */
const roomKind = (id: string) =>
  isModule(id) || ["timer", "chat", "custom"].includes(id);
/** The room chat has no personal version. */
const roomOnly = (id: string) => id === "chat";
const TAB_KEY = "vio:catalog-tab";

function readTab(): Tab {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return tabs.find((t) => t.id === saved)?.id ?? "watch";
  } catch {
    return "watch";
  }
}

export function WidgetCatalog(props: {
  /** Inside an empty slot: short tabs, icons sized to the slot. */
  compact?: boolean;
  canRoom: boolean;
  chatAllowed: boolean;
  add: (type: string, scope: Scope) => void;
  close: () => void;
  /** The "Not shown" section, already rendered by the caller. */
  notShown?: ReactNode;
  /** Live screens, your own preview included, to put in the slot (#190). */
  screens?: { id: string; name: string; own: boolean; watching: boolean }[];
  showScreen?: (id: string) => void;
  /** Footer "Widgets da sala": how many, and the list it opens. */
  roomWidgets?: { count: number; list: ReactNode };
  /** "Saber mais" on the community entry. */
  community?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTabState] = useState<Tab>(readTab);
  const [roomList, setRoomList] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const setTab = (value: Tab) => {
    setTabState(value);
    try {
      localStorage.setItem(TAB_KEY, value);
    } catch {
      /* Preferences are optional. */
    }
  };
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  // Esc or a click outside closes the in-slot catalog.
  useEffect(() => {
    if (!props.compact) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) props.close();
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  });
  const available = (w: WidgetDefinition) =>
    !roomOnly(w.id) || (props.chatAllowed && props.canRoom);
  const definitions = (ids: readonly string[]) =>
    ids.flatMap((id) =>
      widgetRegistry[id] && available(widgetRegistry[id])
        ? [widgetRegistry[id]]
        : [],
    );
  const all = definitions(tabs.flatMap((t) => t.ids));
  const results = searchWidgets(query, all);
  const searching = !!query.trim();
  const shared = (w: WidgetDefinition) => props.canRoom && roomKind(w.id);
  function keys(event: KeyboardEvent) {
    if (event.key === "Escape" && props.compact) {
      event.stopPropagation();
      props.close();
      return;
    }
    if (
      !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    if ((event.target as HTMLElement).closest('[role="tablist"]')) return;
    const items = [
      ...(root.current?.querySelectorAll<HTMLButtonElement>(
        ".catalog-results button:not(:disabled)",
      ) || []),
    ];
    if (!items.length) return;
    const fromInput = event.target === input.current;
    if (fromInput && ["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const index = items.indexOf(event.target as HTMLButtonElement);
    const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
    if (fromInput) items[step > 0 ? 0 : items.length - 1].focus();
    else if (index + step < 0) input.current?.focus();
    else items[Math.min(items.length - 1, index + step)].focus();
  }
  /** Para mim / Para a sala on the item itself (#222), or Adicionar. */
  const actions = (w: WidgetDefinition, small: boolean) =>
    roomOnly(w.id) ? (
      <button
        className="primary"
        aria-label={`${w.title}: para a sala`}
        onClick={() => props.add(w.id, "room")}
      >
        {small ? <Users size={14} aria-hidden="true" /> : "Para a sala"}
      </button>
    ) : shared(w) ? (
      <>
        <button
          className="secondary"
          aria-label={`${w.title}: para mim`}
          title={small ? "Para mim" : undefined}
          onClick={() => props.add(w.id, "individual")}
        >
          {small ? "Mim" : "Para mim"}
        </button>
        <button
          className="primary"
          aria-label={`${w.title}: para a sala`}
          title={small ? "Para a sala" : undefined}
          onClick={() => props.add(w.id, "room")}
        >
          {small ? "Sala" : "Para a sala"}
        </button>
      </>
    ) : (
      <button
        className="secondary"
        aria-label={`${w.title}: adicionar`}
        onClick={() => props.add(w.id, "individual")}
      >
        Adicionar
      </button>
    );
  const description = (w: WidgetDefinition) =>
    roomKind(w.id) ? w.description : `Só para você · ${w.description}`;
  const row = (w: WidgetDefinition) => (
    <div className="catalog-item is-row" key={w.id}>
      <w.icon size={20} aria-hidden="true" />
      <span className="catalog-text">
        <strong>{w.title}</strong>
        <span>{description(w)}</span>
      </span>
      <span className="catalog-actions">{actions(w, !!props.compact)}</span>
    </div>
  );
  /** In-slot tile: personal-only items are the icon itself. */
  const tile = (w: WidgetDefinition) =>
    shared(w) || roomOnly(w.id) ? (
      <div
        className="catalog-item is-tile"
        key={w.id}
        title={`${w.title}: ${w.description}`}
      >
        <w.icon size={20} aria-hidden="true" />
        <span className="catalog-short" aria-hidden="true">
          {shortNames[w.id] || w.title}
        </span>
        <span className="catalog-actions">{actions(w, true)}</span>
      </div>
    ) : (
      <button
        className="catalog-item is-tile"
        key={w.id}
        title={`${w.title}: ${w.description}`}
        aria-label={`${w.title}: adicionar`}
        onClick={() => props.add(w.id, "individual")}
      >
        <w.icon size={20} aria-hidden="true" />
        <span className="catalog-short" aria-hidden="true">
          {shortNames[w.id] || w.title}
        </span>
      </button>
    );
  const screens = props.screens || [];
  const screenCard = (screen: (typeof screens)[number]) => {
    const name = screen.own ? "Minha prévia" : `Tela de ${screen.name}`;
    return (
      <button
        className={`catalog-item ${props.compact ? "is-tile" : "is-row"}`}
        key={`screen:${screen.id}`}
        title={props.compact ? name : undefined}
        aria-label={props.compact ? name : undefined}
        onClick={() => props.showScreen?.(screen.id)}
      >
        <MonitorUp size={20} aria-hidden="true" />
        {props.compact ? (
          <span className="catalog-short" aria-hidden="true">
            {screen.own ? "Minha prévia" : screen.name}
          </span>
        ) : (
          <span className="catalog-text">
            <strong>{name}</strong>
            <span>
              Ao vivo ·{" "}
              {screen.watching
                ? "já está conectada · trazer para o foco"
                : "conecta somente quando você escolher"}
            </span>
          </span>
        )}
      </button>
    );
  };
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const items = definitions(current.ids);
  const community = (
    <div className="catalog-item is-row">
      <Blocks size={20} aria-hidden="true" />
      <span className="catalog-text">
        <strong>Widget personalizado</strong>
        <span>Widgets criados pela comunidade. Em breve.</span>
      </span>
      <span className="catalog-actions">
        <button className="secondary" onClick={props.community}>
          Saber mais
        </button>
      </span>
    </div>
  );
  const body = searching ? (
    results.length ? (
      <div className="catalog-results is-rows">{results.map(row)}</div>
    ) : (
      <p className="widget-empty">Nenhum widget com esse nome.</p>
    )
  ) : props.compact ? (
    <div
      className="catalog-results is-icons"
      role="tabpanel"
      id="catalog-panel"
    >
      {tab === "watch" && screens.map(screenCard)}
      {items.map(tile)}
      {tab === "community" && (
        <button
          className="catalog-item is-tile"
          title="Widgets criados pela comunidade. Em breve."
          aria-label="Widget personalizado: saber mais"
          onClick={props.community}
        >
          <Blocks size={20} aria-hidden="true" />
          <span className="catalog-short" aria-hidden="true">
            Comunidade
          </span>
        </button>
      )}
    </div>
  ) : (
    <div className="catalog-results is-rows" role="tabpanel" id="catalog-panel">
      {props.notShown}
      {tab === "watch" && screens.map(screenCard)}
      {items.map(row)}
      {tab === "community" && community}
    </div>
  );
  if (roomList && props.roomWidgets)
    return (
      <div ref={root} className="catalog">
        <button
          className="text-button catalog-back"
          onClick={() => setRoomList(false)}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Widgets da sala
        </button>
        {props.roomWidgets.list}
      </div>
    );
  return (
    <div
      ref={root}
      className={`catalog ${props.compact ? "is-compact" : ""}`}
      onKeyDown={keys}
    >
      <label className="catalog-search">
        <Search size={16} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          placeholder="Buscar widget"
          aria-label="Buscar widget"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            const first = results[0];
            if (e.key !== "Enter" || !first || !searching) return;
            e.preventDefault();
            props.add(first.id, roomOnly(first.id) ? "room" : "individual");
          }}
        />
      </label>
      {!searching && (
        <div
          className="catalog-tabs"
          role="tablist"
          aria-label="Categorias"
          onKeyDown={(event) => {
            const step =
              event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0;
            if (!step) return;
            event.preventDefault();
            const index = tabs.findIndex((t) => t.id === tab);
            const next = tabs[(index + step + tabs.length) % tabs.length];
            setTab(next.id);
            event.currentTarget
              .querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)
              ?.focus();
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              data-tab={t.id}
              aria-selected={tab === t.id}
              aria-controls="catalog-panel"
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
            >
              {props.compact ? t.short : t.label}
            </button>
          ))}
        </div>
      )}
      {body}
      {!props.compact && props.roomWidgets && (
        <button
          className="text-button catalog-room"
          onClick={() => setRoomList(true)}
        >
          <Users size={16} aria-hidden="true" />
          Widgets da sala
          <span className="mono">{props.roomWidgets.count}</span>
        </button>
      )}
    </div>
  );
}
