import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { MonitorUp, Search, User, Users } from "lucide-react";
import { widgetRegistry, type WidgetDefinition } from "./widgets";
import { searchWidgets } from "./catalog-search";
import { isModule } from "../../shared/room-modules";

export type Scope = "individual" | "room";
const groups: { title: string; ids: string[] }[] = [
  {
    title: "Na sala",
    ids: ["people", "cameras", "stream", "chat"],
  },
  { title: "Decidir e jogar", ids: ["poll", "dice", "random"] },
  { title: "Tempo", ids: ["timer", "tasks"] },
];
/** Labels for the in-slot icons, where only one or two words fit. */
const shortNames: Record<string, string> = {
  people: "Pessoas",
  cameras: "Câmeras",
  stream: "Minha tela",
  tasks: "Tarefas",
};
/** What "Para a sala" can create; the rest is only yours (#190). */
const roomKind = (id: string) => isModule(id) || ["timer", "chat"].includes(id);
const SCOPE_KEY = "vio:widget-scope";

function readScope(): Scope {
  try {
    return localStorage.getItem(SCOPE_KEY) === "room" ? "room" : "individual";
  } catch {
    return "individual";
  }
}

export function WidgetCatalog(props: {
  /** Inside an empty slot: no tabs, icons sized to the slot. */
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
  /** Other tabs (Sala, Comunidade), by label. */
  tabs?: [string, ReactNode][];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(0);
  const [scope, setScopeState] = useState<Scope>(readScope);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const room = props.canRoom && scope === "room";
  const setScope = (value: Scope) => {
    setScopeState(value);
    try {
      localStorage.setItem(SCOPE_KEY, value);
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
  const all = groups.flatMap((g) =>
    g.ids.flatMap((id) => (widgetRegistry[id] ? [widgetRegistry[id]] : [])),
  );
  const available = (w: WidgetDefinition) =>
    (w.id !== "chat" || props.chatAllowed) && (!room || roomKind(w.id));
  const results = searchWidgets(query, all).filter(available);
  const searching = !!query.trim();
  function pick(w: WidgetDefinition) {
    props.add(w.id, room ? "room" : "individual");
  }
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
    const items = [
      ...(root.current?.querySelectorAll<HTMLButtonElement>(
        ".catalog-results .catalog-item:not(:disabled)",
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
  const card = (w: WidgetDefinition, rows: boolean) => {
    return (
      <button
        className={`catalog-item ${rows ? "is-row" : ""}`}
        key={w.id}
        title={rows ? undefined : `${w.title}: ${w.description}`}
        aria-label={rows ? undefined : w.title}
        onClick={() => pick(w)}
      >
        <w.icon size={20} aria-hidden="true" />
        {(rows || !props.compact) && (
          <span className="catalog-text">
            <strong>{w.title}</strong>
            <span>{w.description}</span>
          </span>
        )}
        {props.compact && !rows && (
          <span className="catalog-short" aria-hidden="true">
            {shortNames[w.id] || w.title}
          </span>
        )}
      </button>
    );
  };
  const screens = props.screens || [];
  const screenCard = (screen: (typeof screens)[number]) => {
    const name = screen.own ? "Minha prévia" : `Tela de ${screen.name}`;
    return (
      <button
        className="catalog-item"
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
              {screen.watching
                ? "Já está conectada · trazer para o foco"
                : "Conecta somente quando você escolher"}
            </span>
          </span>
        )}
      </button>
    );
  };
  const widgets = searching ? (
    results.length ? (
      <div className="catalog-results is-rows">
        {results.map((w) => card(w, true))}
      </div>
    ) : (
      <p className="widget-empty">Nenhum widget com esse nome.</p>
    )
  ) : props.compact ? (
    <div className="catalog-results is-icons">
      {screens.map(screenCard)}
      {all.filter(available).map((w) => card(w, false))}
    </div>
  ) : (
    <div className="catalog-results">
      {props.notShown}
      {screens.length > 0 && (
        <section className="catalog-group">
          <h3>Telas</h3>
          <div className="widget-catalog">{screens.map(screenCard)}</div>
        </section>
      )}
      {groups.map((group) => {
        const items = group.ids
          .map((id) => widgetRegistry[id])
          .filter((w) => w && available(w));
        if (!items.length) return null;
        return (
          <section key={group.title} className="catalog-group">
            <h3>{group.title}</h3>
            <div className="widget-catalog">
              {items.map((w) => card(w, false))}
            </div>
          </section>
        );
      })}
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
          onChange={(e) => {
            setQuery(e.target.value);
            setTab(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
        />
      </label>
      {props.canRoom && (
        <div className="catalog-scope">
          <div className="segmented" role="group" aria-label="Para quem">
            <button
              className={scope === "individual" ? "active" : ""}
              aria-pressed={scope === "individual"}
              onClick={() => setScope("individual")}
            >
              <User size={14} aria-hidden="true" />
              {props.compact ? "Mim" : "Para mim"}
            </button>
            <button
              className={scope === "room" ? "active" : ""}
              aria-pressed={scope === "room"}
              onClick={() => setScope("room")}
            >
              <Users size={14} aria-hidden="true" />
              {props.compact ? "Sala" : "Para a sala"}
            </button>
          </div>
          {!props.compact && (
            <p className="field-note">
              {room
                ? "Todos veem. Quem controla segue as permissões da sala."
                : "Só você vê."}
            </p>
          )}
        </div>
      )}
      {props.tabs && !searching && (
        <div className="catalog-tabs" role="group" aria-label="Origem">
          {["Widgets", ...props.tabs.map(([label]) => label)].map(
            (label, i) => (
              <button
                key={label}
                aria-pressed={tab === i}
                onClick={() => setTab(i)}
              >
                {label}
              </button>
            ),
          )}
        </div>
      )}
      {tab === 0 || searching ? widgets : props.tabs?.[tab - 1]?.[1]}
    </div>
  );
}
