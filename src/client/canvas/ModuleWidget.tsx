import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Settings2,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  RotateCcw,
  Palette,
  History,
  Square,
} from "lucide-react";
import { Dialog } from "../components/Dialog";
import { InlineText } from "./InlineText";
import { DiceFace } from "./DiceFace";
import { PollFace, chartMenu, useChart } from "./PollFace";
import { RaffleFace, useWheel, wheelMenu, withPalette } from "./RaffleFace";
import {
  colorAt,
  paletteColors,
  paletteIds,
  paletteNames,
} from "../../shared/palettes";
import { clock, parseClock } from "./TimerBlock";
import { freshKey } from "../id";
import { canEditPublic } from "../../shared/permissions";
import {
  widgetContent,
  type SharedWidget,
  type WidgetContent,
} from "../../shared/widgets";
import {
  applyModuleAction,
  defaultModule,
  moduleConfig,
  moduleElapsed,
  moduleResets,
  moduleTitles,
  type ModuleAction,
  type ModuleConfig,
  type ModuleKind,
  type ModuleResult,
} from "../../shared/room-modules";
import type { WidgetProps } from "./widgets";
import { HeaderTools, useMenuItems, useRename } from "./header-tools";
import type { WidgetInstance } from "./model";
import type { Controller } from "../room/controller";

export function createModule(kind: ModuleKind): WidgetContent {
  return {
    kind,
    title: moduleTitles[kind],
    blocks: [],
    module: defaultModule(kind, freshKey),
  };
}
export function moduleValue(
  widget: WidgetInstance,
  engine: Controller,
): SharedWidget | undefined {
  if (widget.config.sharedId)
    return engine.view.snapshot?.widgets?.find(
      (w) => w.id === widget.config.sharedId,
    );
  const raw = widget.state as Partial<SharedWidget> | undefined;
  const parsed = widgetContent.safeParse(
    raw && {
      kind: raw.kind,
      title: raw.title,
      blocks: raw.blocks,
      module: raw.module,
    },
  );
  if (!parsed.success) return;
  return {
    ...parsed.data,
    id: widget.id,
    owner: engine.view.id,
    createdAt: raw?.createdAt || Date.now(),
    revision: raw?.revision || 0,
    moduleState: raw?.moduleState || {},
  };
}
function localRandom(max: number) {
  const limit = 4294967296 - (4294967296 % max),
    buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}
const time = (value: number) =>
  `${Math.floor(Math.max(0, value) / 60)}:${String(Math.floor(Math.max(0, value) % 60)).padStart(2, "0")}`;
function Results({ entries }: { entries: ModuleResult[] }) {
  return (
    <ol className="module-history">
      {[...entries].reverse().map((r) => (
        <li key={r.id}>
          <div>
            <strong>{r.label}</strong>
            <span>
              {r.authorName} ·{" "}
              {new Date(r.at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {r.expression && <code>{r.expression}</code>}
          <details>
            <summary>Detalhes</summary>
            <p>{r.detail}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function ModuleWidget({ widget, engine, height, visible }: WidgetProps) {
  const value = moduleValue(widget, engine),
    config = value?.module,
    state = value?.moduleState || {};
  const editable =
    !widget.config.sharedId ||
    (!!value && canEditPublic(engine.view.snapshot, engine.view.id, value));
  // Opening polls, steps and resets are controls; the room may allow them alone.
  const controllable =
    !widget.config.sharedId ||
    (!!value &&
      canEditPublic(
        engine.view.snapshot,
        engine.view.id,
        value,
        "guestControl",
      ));
  const [editing, setEditing] = useState(false),
    [help, setHelp] = useState(false),
    [history, setHistory] = useState(false),
    [allTasks, setAllTasks] = useState(false),
    [palettes, setPalettes] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(() => engine.serverNow());
  const retry = useRef({ serialized: "", id: "" });
  const queue = useRef(Promise.resolve());
  const pending = useRef<ModuleConfig | null>(null);
  const saved = useRef(0);
  const compact = height < 330;
  useEffect(() => {
    if (!visible || !["poll", "tasks"].includes(config?.kind || "")) return;
    const timer = setInterval(() => setNow(engine.serverNow()), 1000);
    return () => clearInterval(timer);
  }, [visible, config?.kind, engine]);
  const pollStart = config?.kind === "poll" ? (state.startedAt ?? null) : null;
  const pollEnd =
    config?.kind === "poll" && pollStart != null && config.duration
      ? pollStart + config.duration * 1000
      : null;
  const pollClosed = config?.kind === "poll" && !!state.closed;
  // Re-render the header menu when a personal view choice changes.
  useChart();
  useWheel();
  const pollRunning =
    pollStart != null && !pollClosed && (pollEnd == null || now < pollEnd);
  const [revealAt, setRevealAt] = useState(0);
  const seen = useRef({ start: pollStart, closed: pollClosed });
  useEffect(() => {
    const before = seen.current;
    seen.current = { start: pollStart, closed: pollClosed };
    // Chime only for changes that happen while this widget is open, not for
    // a poll that was already running or closed when it mounted.
    if (pollStart != null && before.start == null)
      void engine.playCue("poll-open");
    if (pollStart != null && pollClosed && !before.closed) {
      void engine.playCue("poll-end");
      setRevealAt(Date.now());
    }
  }, [pollStart, pollClosed, engine]);
  useEffect(() => {
    if (pollEnd == null || pollClosed) return;
    const left = pollEnd - engine.serverNow();
    if (left <= 0) return;
    const timer = setTimeout(() => {
      void engine.playCue("poll-end");
      setNow(engine.serverNow());
      setRevealAt(Date.now());
    }, left);
    return () => clearTimeout(timer);
  }, [pollEnd, pollClosed, engine]);
  useEffect(() => {
    if (!revealAt) return;
    const timer = setTimeout(() => setRevealAt(0), 2600);
    return () => clearTimeout(timer);
  }, [revealAt]);
  // Mirrors the header tools so narrow headers, which hide them, keep them.
  useMenuItems(
    value && config
      ? [
          ...(config.kind === "dice"
            ? [
                {
                  label: "Guia de dados",
                  icon: HelpCircle,
                  run: () => setHelp(true),
                },
                ...(state.history?.length
                  ? [
                      {
                        label: "Histórico completo",
                        icon: History,
                        run: () => setHistory(true),
                      },
                    ]
                  : []),
              ]
            : []),
          ...(config.kind === "random"
            ? [
                wheelMenu(),
                ...(state.history?.length
                  ? [
                      {
                        label: "Histórico completo",
                        icon: History,
                        run: () => setHistory(true),
                      },
                    ]
                  : []),
              ]
            : []),
          ...(editable && config.kind !== "dice" && config.kind !== "poll"
            ? [
                {
                  label: "Editar",
                  icon: Settings2,
                  run: () => setEditing(!editing),
                },
              ]
            : []),
          ...(config.kind === "poll" && state.startedAt != null && !pollRunning
            ? chartMenu()
            : []),
          ...(controllable && config.kind === "poll" && state.startedAt != null
            ? [
                pollRunning
                  ? {
                      label: "Encerrar votação",
                      icon: Square,
                      run: () =>
                        void act({
                          kind: "poll-control",
                          action: "close",
                          revision: value.revision,
                        }),
                    }
                  : {
                      label: "Nova votação",
                      icon: RotateCcw,
                      run: () =>
                        void act({
                          kind: "poll-control",
                          action: "reset",
                          revision: value.revision,
                        }),
                    },
              ]
            : []),
          ...(controllable && config.kind !== "poll"
            ? [
                {
                  label: "Reiniciar resultados e progresso",
                  icon: RotateCcw,
                  danger: true,
                  run: () =>
                    void act({ kind: "reset", revision: value.revision }),
                },
              ]
            : []),
          // Appearance comes after the widget's own actions.
          ...(editable && config.kind === "random"
            ? [
                {
                  label: "Cor e paleta",
                  icon: Palette,
                  run: () => setPalettes(true),
                },
              ]
            : []),
        ]
      : undefined,
  );
  useRename(
    value && config && editable
      ? (title) =>
          saveContent(
            widgetContent.parse({
              kind: config.kind,
              title,
              blocks: [],
              module: config,
            }),
          )
      : undefined,
  );
  if (!value || !config)
    return <p className="widget-empty">Este widget não está disponível.</p>;
  async function saveContent(content: WidgetContent) {
    if (widget.config.sharedId) {
      const latest = moduleValue(widget, engine);
      if (!latest) return;
      const next = await engine.request<SharedWidget>("widget-structure", {
        id: latest.id,
        revision: Math.max(latest.revision, saved.current),
        content,
      });
      saved.current = next.revision;
      return;
    }
    const current = engine.canvas
      .getSnapshot()
      .widgets.find((w) => w.id === widget.id);
    const latest = current && moduleValue(current, engine);
    if (!latest?.module) return;
    engine.canvas.updateWidget(widget.id, {
      title: content.title,
      state: {
        ...latest,
        ...content,
        revision: latest.revision + 1,
        moduleState:
          content.module && moduleResets(latest.module, content.module)
            ? {}
            : latest.moduleState,
      },
    });
  }
  /** Saves each field as it is left; edits made while one is in flight build on it. */
  function saveConfig(next: ModuleConfig) {
    const parsed = moduleConfig.safeParse(next);
    if (!parsed.success) {
      setError("Confira os campos e os limites.");
      return;
    }
    setError("");
    pending.current = parsed.data;
    const title = value?.title || moduleTitles[parsed.data.kind];
    queue.current = queue.current
      .then(() =>
        saveContent(
          widgetContent.parse({
            kind: parsed.data.kind,
            title,
            blocks: [],
            module: parsed.data,
          }),
        ),
      )
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Não foi possível salvar."),
      )
      .finally(() => {
        if (pending.current === parsed.data) pending.current = null;
      });
  }
  async function act(operation: ModuleAction) {
    if (busy || !value?.module) return;
    setBusy(true);
    setError("");
    const serialized = JSON.stringify(operation);
    if (retry.current.serialized !== serialized)
      retry.current = { serialized, id: freshKey() };
    try {
      if (widget.config.sharedId)
        await engine.request("module-interact", {
          id: value.id,
          operationId: retry.current.id,
          operation,
        });
      else {
        const next = applyModuleAction(
          value.module,
          value.moduleState || {},
          operation,
          {
            id: engine.view.id,
            name:
              engine.view.snapshot?.participants.find(
                (p) => p.id === engine.view.id,
              )?.name || "Você",
          },
          retry.current.id,
          value.revision,
          engine.serverNow(),
          localRandom,
        );
        engine.canvas.updateWidget(widget.id, {
          state: { ...value, moduleState: next, revision: value.revision + 1 },
        });
      }
      retry.current = { serialized: "", id: "" };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  const controls = (
    <HeaderTools>
      {config.kind === "dice" && (
        <button
          className="icon-button"
          aria-label="Guia de dados"
          onClick={() => setHelp(true)}
        >
          <HelpCircle size={14} />
        </button>
      )}
      {editable && config.kind !== "dice" && config.kind !== "poll" && (
        <button
          className="icon-button"
          aria-label={`Editar ${value.title}`}
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          <Settings2 size={14} />
        </button>
      )}
    </HeaderTools>
  );
  const activeIndex = Math.min(
    state.activeIndex || 0,
    config.kind === "tasks" ? config.items.length - 1 : 0,
  );
  const tasks = config.kind === "tasks" ? config.items : [];
  const taskList = (items: typeof tasks) => (
    <div className="module-tasks">
      {items.map((item) => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={!!state.done?.[item.id]}
            disabled={!controllable || busy}
            onChange={(e) =>
              void act({
                kind: "task",
                itemId: item.id,
                done: e.target.checked,
                revision: value.revision,
              })
            }
          />
          <span>
            {item.label}
            {item.assignee && <small>{item.assignee}</small>}
          </span>
        </label>
      ))}
    </div>
  );
  const pollOpen =
    config.kind === "poll" &&
    state.startedAt != null &&
    !state.closed &&
    (!config.duration || now < state.startedAt + config.duration * 1000);
  const pollSetup = config.kind === "poll" && state.startedAt == null;
  return (
    <div
      className={`module-widget kind-${config.kind} ${compact ? "is-compact" : ""}`}
    >
      {controls}
      {editable && (editing || pollSetup) ? (
        <ModuleFields
          config={config}
          current={() => pending.current ?? config}
          save={saveConfig}
          done={pollSetup ? undefined : () => setEditing(false)}
        >
          {pollSetup && controllable && (
            <button
              className="primary poll-start"
              disabled={busy}
              onClick={() =>
                void act({
                  kind: "poll-control",
                  action: "start",
                  revision: value.revision,
                })
              }
            >
              Abrir votação
            </button>
          )}
        </ModuleFields>
      ) : (
        <div className="module-content">
          {config.kind === "poll" && (
            <PollFace
              config={config}
              state={state}
              now={now}
              viewerId={engine.view.id}
              participants={engine.view.snapshot?.participants || []}
              open={pollOpen}
              busy={busy}
              controllable={controllable}
              revision={value.revision}
              revealing={!!revealAt}
              act={(operation) => void act(operation)}
            />
          )}
          {config.kind === "dice" && (
            <DiceFace
              history={state.history || []}
              placeholder={config.expression}
              busy={busy}
              participants={engine.view.snapshot?.participants || []}
              roll={(expression) => void act({ kind: "roll", expression })}
            />
          )}
          {config.kind === "random" && (
            <RaffleFace
              config={config}
              state={state}
              busy={busy}
              editable={editable}
              current={() => pending.current ?? config}
              save={saveConfig}
              draw={() => void act({ kind: "draw" })}
            />
          )}
          {config.kind === "tasks" && (
            <>
              <div className="session-current">
                <strong>
                  {activeIndex + 1}. {tasks[activeIndex].label}
                </strong>
                <span>
                  {tasks[activeIndex].duration
                    ? time(
                        tasks[activeIndex].duration - moduleElapsed(state, now),
                      )
                    : time(moduleElapsed(state, now))}
                </span>
              </div>
              {controllable && (
                <div className="module-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void act({
                        kind: "session",
                        action: state.startedAt == null ? "start" : "pause",
                        revision: value.revision,
                      })
                    }
                  >
                    {state.startedAt == null ? "Iniciar etapa" : "Pausar etapa"}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy || activeIndex === tasks.length - 1}
                    onClick={() =>
                      void act({
                        kind: "session",
                        action: "next",
                        revision: value.revision,
                      })
                    }
                  >
                    Próxima
                  </button>
                </div>
              )}
              {taskList(
                compact ? tasks.slice(activeIndex, activeIndex + 3) : tasks,
              )}
              {compact && tasks.length > 3 && (
                <button
                  className="text-button"
                  onClick={() => setAllTasks(true)}
                >
                  Ver todas ({tasks.length})
                </button>
              )}
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {state.history?.at(-1)
          ? `${state.history.at(-1)!.authorName}: ${state.history.at(-1)!.label}`
          : ""}
      </span>
      {palettes && config.kind === "random" && (
        <Dialog title="Cor e paleta" centered close={() => setPalettes(false)}>
          <div className="palette-choice" role="group" aria-label="Paletas">
            {paletteIds.map((id) => (
              <button
                key={id}
                aria-pressed={config.palette === id}
                onClick={() => {
                  setPalettes(false);
                  saveConfig(
                    withPalette(
                      (pending.current ?? config) as typeof config,
                      id,
                    ),
                  );
                }}
              >
                <span aria-hidden="true">
                  {(id === "random" ? [] : paletteColors(id, [])).map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                {paletteNames[id]}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {history && (
        <Dialog title="Histórico" close={() => setHistory(false)}>
          <Results entries={state.history || []} />
        </Dialog>
      )}
      {allTasks && (
        <Dialog title="Tarefas da sessão" close={() => setAllTasks(false)}>
          {taskList(tasks)}
        </Dialog>
      )}
      {help && (
        <Dialog title="Guia de dados" close={() => setHelp(false)}>
          <p>
            Digite uma expressão e pressione Enter. Os resultados ficam ligados
            a quem rolou.
          </p>
          <dl className="dice-guide">
            <dt>2d6 + 3</dt>
            <dd>Dois dados de seis faces, somando três.</dd>
            <dt>(1d20 + 2) * 2</dt>
            <dd>Parênteses e operações +, −, *, /.</dd>
            <dt>4d6d1 · 4d6dl1 · 4d6dh1</dt>
            <dd>Descartar o menor (d ou dl) ou o maior (dh).</dd>
            <dt>2d20k1 · 2d20kh1 · 2d20kl1</dt>
            <dd>Manter o maior (k ou kh) ou o menor (kl).</dd>
            <dt>1d6! · 1d6!5</dt>
            <dd>Rolar um dado extra ao atingir a face máxima ou cinco.</dd>
            <dt>4dF</dt>
            <dd>Dados Fate: −1, zero e +1.</dd>
            <dt>6#4d6d1</dt>
            <dd>Repetir a expressão seis vezes.</dd>
            <dt>4d6++2 · 4d6--2</dt>
            <dd>Somar ou subtrair dois em cada dado.</dd>
            <dt>10d6 &gt;&gt;4 · 10d6 &lt;&lt;3</dt>
            <dd>
              Contar valores maiores ou iguais a quatro, ou menores ou iguais a
              três.
            </dd>
            <dt>1d20 &gt;= 10</dt>
            <dd>
              Comparar totais: &lt;, &lt;=, &gt;, &gt;= ou =. Um indica
              verdadeiro; zero, falso.
            </dd>
            <dt>B5 · G5 · W5</dt>
            <dd>
              Cinco d6 contando valores a partir de quatro, três ou dois;
              aceitam !.
            </dd>
            <dt>4d6ns</dt>
            <dd>Mostrar os dados na ordem em que saíram.</dd>
          </dl>
          <p className="field-note">
            Até 100 dados por grupo, 20 repetições e 500 resultados por comando.
            Parênteses no resultado indicam dados descartados. Sintaxe inspirada
            no Rollem; c, aro, daro e taro ainda não estão disponíveis.
          </p>
        </Dialog>
      )}
    </div>
  );
}

type Row = {
  id: string;
  label: string;
  weight?: number;
  assignee?: string;
  duration?: number;
};
const rowLimits = { poll: [2, 12], random: [2, 50], tasks: [1, 30] } as const;

/** Settings edited in place inside the widget: every field saves as it is left. */
function ModuleFields({
  config,
  current,
  save,
  done,
  children,
}: {
  config: ModuleConfig;
  current: () => ModuleConfig;
  save: (next: ModuleConfig) => void;
  done?: () => void;
  children?: ReactNode;
}) {
  if (config.kind === "dice") return null;
  const kind = config.kind;
  const rows: Row[] =
    kind === "tasks"
      ? (config as Extract<ModuleConfig, { kind: "tasks" }>).items
      : (config as Extract<ModuleConfig, { kind: "poll" | "random" }>).options;
  const [min, max] = rowLimits[kind];
  const noun = kind === "tasks" ? "etapa" : "opção";
  const nextColor = (index: number) => {
    const base = current();
    if (base.kind !== "random") return undefined;
    const colors = paletteColors(
      base.palette,
      base.options.map((o) => o.color),
    );
    return colorAt(colors, index);
  };
  function setRows(edit: (rows: Row[]) => Row[]) {
    const base = current();
    if (base.kind === "tasks")
      save({ ...base, items: edit(base.items) as typeof base.items });
    else if (base.kind === "poll")
      save({ ...base, options: edit(base.options) as typeof base.options });
    else if (base.kind === "random")
      save({ ...base, options: edit(base.options) as typeof base.options });
  }
  const patch = (id: string, values: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...values } : r)));
  function move(id: string, step: number) {
    setRows((list) => {
      const next = [...list];
      const from = next.findIndex((r) => r.id === id);
      const to = from + step;
      if (from < 0 || to < 0 || to >= next.length) return list;
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }
  return (
    <div className="module-fields">
      {config.kind === "poll" && (
        <InlineText
          className="module-question"
          label="Pergunta"
          value={config.question}
          save={(question) => {
            const base = current();
            if (base.kind === "poll") save({ ...base, question });
          }}
        />
      )}
      <ol className="module-rows">
        {rows.map((row, index) => (
          <li key={row.id}>
            <InlineText
              className="row-label"
              label={`Texto da ${noun} ${index + 1}`}
              value={row.label}
              save={(label) => patch(row.id, { label })}
            />
            {kind === "random" && (
              <InlineText
                className="row-number"
                label={`Peso da opção ${index + 1}`}
                value={String(row.weight)}
                display={`×${row.weight}`}
                numeric
                maxLength={4}
                accept={(t) => /^\d{1,4}$/.test(t) && +t >= 1 && +t <= 1000}
                save={(t) => patch(row.id, { weight: +t })}
              />
            )}
            {kind === "tasks" && (
              <>
                <InlineText
                  className="row-assignee"
                  label={`Responsável pela etapa ${index + 1}`}
                  value={row.assignee || ""}
                  placeholder="Responsável"
                  maxLength={64}
                  accept={() => true}
                  save={(assignee) => patch(row.id, { assignee })}
                />
                <InlineText
                  className="row-number"
                  label={`Duração da etapa ${index + 1} em minutos ou mm:ss`}
                  value={row.duration ? clock(row.duration) : ""}
                  placeholder="Sem tempo"
                  numeric
                  maxLength={8}
                  accept={(t) => !t || t === "0" || parseClock(t) !== null}
                  save={(t) =>
                    patch(row.id, {
                      duration: !t || t === "0" ? 0 : parseClock(t)!,
                    })
                  }
                />
              </>
            )}
            <span className="row-tools">
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover ${noun} ${index + 1} para cima`}
                disabled={index === 0}
                onClick={() => move(row.id, -1)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover ${noun} ${index + 1} para baixo`}
                disabled={index === rows.length - 1}
                onClick={() => move(row.id, 1)}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Excluir ${noun} ${index + 1}`}
                disabled={rows.length <= min}
                onClick={() =>
                  setRows((list) => list.filter((r) => r.id !== row.id))
                }
              >
                <X size={14} />
              </button>
            </span>
          </li>
        ))}
        {rows.length < max && (
          <li className="row-add">
            <button
              type="button"
              className="text-button module-add"
              aria-label={`Adicionar ${noun}`}
              onClick={() =>
                setRows((list) => [
                  ...list,
                  kind === "tasks"
                    ? {
                        id: freshKey(),
                        label: `Etapa ${list.length + 1}`,
                        assignee: "",
                        duration: 900,
                      }
                    : kind === "random"
                      ? {
                          id: freshKey(),
                          label: `Opção ${list.length + 1}`,
                          weight: 1,
                          // A new option takes the next color of the palette.
                          color: nextColor(list.length),
                        }
                      : { id: freshKey(), label: `Opção ${list.length + 1}` },
                ])
              }
            >
              <Plus size={15} aria-hidden="true" />
              <span>Adicionar {noun}</span>
            </button>
          </li>
        )}
      </ol>
      <div className="module-footer">
        {config.kind === "poll" && (
          <div className="module-duration">
            <span>Prazo</span>
            <InlineText
              className="row-number"
              label="Prazo em minutos ou mm:ss"
              value={config.duration ? clock(config.duration) : ""}
              placeholder="Sem prazo"
              numeric
              maxLength={8}
              accept={(t) => !t || t === "0" || parseClock(t) !== null}
              save={(t) => {
                const base = current();
                if (base.kind === "poll")
                  save({
                    ...base,
                    duration: !t || t === "0" ? 0 : parseClock(t)!,
                  });
              }}
            />
            {!!config.duration && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const base = current();
                  if (base.kind === "poll") save({ ...base, duration: 0 });
                }}
              >
                Sem prazo
              </button>
            )}
          </div>
        )}
        {config.kind === "random" && (
          <label className="module-check">
            <input
              type="checkbox"
              checked={config.removeDrawn}
              onChange={(e) => {
                const base = current();
                if (base.kind === "random")
                  save({ ...base, removeDrawn: e.target.checked });
              }}
            />
            Retirar opções já sorteadas
          </label>
        )}
        {kind !== "poll" && (
          <p className="field-note">
            Mudar opções ou etapas reinicia os resultados.
          </p>
        )}
        {children}
      </div>
      {done && (
        <button type="button" className="secondary module-done" onClick={done}>
          Concluir
        </button>
      )}
    </div>
  );
}
