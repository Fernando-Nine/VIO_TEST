import { useEffect, useRef, useState } from "react";
import {
  Settings2,
  Share2,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { Dialog } from "../components/Dialog";
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
  moduleTitles,
  type ModuleAction,
  type ModuleConfig,
  type ModuleKind,
  type ModuleResult,
} from "../../shared/room-modules";
import type { WidgetProps } from "./widgets";
import {
  HeaderTools,
  ScopeBadge,
  useMenuItems,
  useRename,
} from "./header-tools";
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
  const [editing, setEditing] = useState(false),
    [help, setHelp] = useState(false),
    [history, setHistory] = useState(false),
    [allTasks, setAllTasks] = useState(false);
  // Empty on purpose: the configured command shows as the suggestion.
  const [expression, setExpression] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(() => engine.serverNow());
  const retry = useRef({ serialized: "", id: "" });
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
          ...(widget.config.sharedId
            ? []
            : [
                {
                  label: "Compartilhar",
                  icon: Share2,
                  run: () => void share(),
                },
              ]),
          ...(config.kind === "dice"
            ? [
                {
                  label: "Guia de dados",
                  icon: HelpCircle,
                  run: () => setHelp(true),
                },
              ]
            : []),
          ...(editable && config.kind !== "dice"
            ? [
                {
                  label: "Editar",
                  icon: Settings2,
                  run: () => setEditing(true),
                },
              ]
            : []),
          ...(editable && config.kind !== "poll"
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
    if (!value) return;
    if (widget.config.sharedId)
      await engine.request("widget-structure", {
        id: value.id,
        revision: value.revision,
        content,
      });
    else
      engine.canvas.updateWidget(widget.id, {
        title: content.title,
        state: {
          ...value,
          ...content,
          revision: value.revision + 1,
          moduleState:
            JSON.stringify(content.module) === JSON.stringify(config)
              ? state
              : {},
        },
      });
  }
  async function act(operation: ModuleAction) {
    if (busy || !value?.module) return;
    setBusy(true);
    setError("");
    setNotice("");
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
  async function share() {
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const id = widget.config.pendingShareId || freshKey();
      engine.canvas.updateWidget(widget.id, {
        config: { ...widget.config, pendingShareId: id },
      });
      const result = await engine.request<SharedWidget | { pending: true }>(
        "widget-create",
        {
          id,
          content: {
            kind: value.kind,
            title: value.title,
            blocks: [],
            module: value.module,
          },
        },
      );
      if ("pending" in result)
        setNotice(
          "Pedido enviado aos responsáveis. Seu widget continua individual até a aprovação.",
        );
      else {
        engine.receiveSharedWidget(result);
        engine.canvas.bindShared(widget.id, result.id);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível compartilhar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const controls = (
    <HeaderTools>
      <ScopeBadge shared={!!widget.config.sharedId} />
      {!widget.config.sharedId && (
        <button
          className="icon-button"
          aria-label="Compartilhar widget"
          disabled={busy}
          onClick={() => void share()}
        >
          <Share2 size={14} />
        </button>
      )}
      {config.kind === "dice" && (
        <button
          className="icon-button"
          aria-label="Guia de dados"
          onClick={() => setHelp(true)}
        >
          <HelpCircle size={14} />
        </button>
      )}
      {editable && config.kind !== "dice" && (
        <button
          className="icon-button"
          aria-label={`Editar ${value.title}`}
          onClick={() => setEditing(true)}
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
            disabled={!editable || busy}
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
  const pollCounts =
    config.kind === "poll"
      ? config.options.map(
          (option) =>
            Object.values(state.votes || {}).filter((v) => v === option.id)
              .length,
        )
      : [];
  const topVotes = Math.max(0, ...pollCounts);
  const winners =
    config.kind === "poll" && state.startedAt != null && !pollOpen && topVotes
      ? config.options.filter((_, i) => pollCounts[i] === topVotes)
      : [];
  return (
    <div
      className={`module-widget kind-${config.kind} ${compact ? "is-compact" : ""}`}
    >
      {controls}
      <div className="module-content">
        {config.kind === "poll" && (
          <>
            <strong className="module-question">{config.question}</strong>
            <small>
              {state.startedAt == null
                ? "Aguardando abertura"
                : !pollOpen
                  ? winners.length === 1
                    ? `Vencedor: ${winners[0].label}`
                    : winners.length
                      ? "Empate"
                      : "Votação encerrada"
                  : config.duration
                    ? `Restam ${time(config.duration - (now - state.startedAt) / 1000)}`
                    : "Votação aberta"}{" "}
              · {Object.keys(state.votes || {}).length}{" "}
              {Object.keys(state.votes || {}).length === 1 ? "voto" : "votos"}
            </small>
            <div className={`module-options ${revealAt ? "is-revealing" : ""}`}>
              {config.options.map((option, i) => (
                <button
                  key={option.id}
                  className={`secondary ${winners.includes(option) ? "is-winner" : ""}`}
                  aria-pressed={state.votes?.[engine.view.id] === option.id}
                  disabled={!pollOpen || busy}
                  onClick={() =>
                    void act({ kind: "vote", optionId: option.id })
                  }
                >
                  <span>{option.label}</span>
                  <b>
                    {winners.includes(option) && (
                      <Trophy size={13} aria-label="Vencedor" />
                    )}
                    {pollCounts[i]}
                  </b>
                </button>
              ))}
            </div>
            {editable && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void act({
                    kind: "poll-control",
                    action:
                      state.startedAt == null
                        ? "start"
                        : pollOpen
                          ? "close"
                          : "reset",
                    revision: value.revision,
                  })
                }
              >
                {state.startedAt == null
                  ? "Abrir votação"
                  : pollOpen
                    ? "Encerrar votação"
                    : "Reiniciar votação"}
              </button>
            )}
          </>
        )}
        {config.kind === "dice" && (
          <>
            <form
              className="module-roll"
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  kind: "roll",
                  expression: expression.trim() || config.expression,
                });
              }}
            >
              <input
                aria-label="Comando dos dados"
                placeholder={config.expression}
                value={expression}
                maxLength={200}
                readOnly={busy}
                onChange={(e) => setExpression(e.target.value)}
              />
              <button className="primary" disabled={busy}>
                Rolar
              </button>
            </form>
            {!!state.history?.length && (
              <Results entries={state.history.slice(-3)} />
            )}
          </>
        )}
        {config.kind === "random" && (
          <>
            <button
              className="primary"
              disabled={
                busy ||
                (config.removeDrawn &&
                  state.drawn?.length === config.options.length)
              }
              onClick={() => void act({ kind: "draw" })}
            >
              Sortear
            </button>
            <small>
              {config.removeDrawn
                ? config.options.length - (state.drawn?.length || 0)
                : config.options.length}{" "}
              opções disponíveis
            </small>
            {!!state.history?.length && (
              <Results entries={state.history.slice(-3)} />
            )}
          </>
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
            {editable && (
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
              <button className="text-button" onClick={() => setAllTasks(true)}>
                Ver todas ({tasks.length})
              </button>
            )}
          </>
        )}
        {(config.kind === "dice" || config.kind === "random") &&
          (state.history?.length || 0) > 3 && (
            <button className="text-button" onClick={() => setHistory(true)}>
              Histórico ({state.history!.length})
            </button>
          )}
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="field-note">
          {notice}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {state.history?.at(-1)
          ? `${state.history.at(-1)!.authorName}: ${state.history.at(-1)!.label}`
          : ""}
      </span>
      {editing && (
        <ModuleEditor
          value={value}
          close={() => setEditing(false)}
          save={saveContent}
        />
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

function ModuleEditor({
  value,
  close,
  save,
}: {
  value: SharedWidget;
  close: () => void;
  save: (content: WidgetContent) => Promise<void>;
}) {
  const [title, setTitle] = useState(value.title),
    [config, setConfig] = useState<ModuleConfig>(() =>
      structuredClone(value.module!),
    );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const rows: {
    id: string;
    label: string;
    weight?: number;
    assignee?: string;
    duration?: number;
  }[] =
    config.kind === "poll" || config.kind === "random"
      ? config.options
      : config.kind === "tasks"
        ? config.items
        : [];
  function patch(index: number, values: Record<string, string | number>) {
    if (config.kind === "poll" || config.kind === "random")
      setConfig({
        ...config,
        options: config.options.map((v, i) =>
          i === index ? { ...v, ...values } : v,
        ),
      } as ModuleConfig);
    else if (config.kind === "tasks")
      setConfig({
        ...config,
        items: config.items.map((v, i) =>
          i === index ? { ...v, ...values } : v,
        ),
      });
  }
  function order(index: number, direction: number) {
    const next = [...rows],
      target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }
  function setRows(next: typeof rows) {
    if (config.kind === "poll" || config.kind === "random")
      setConfig({ ...config, options: next } as ModuleConfig);
    else if (config.kind === "tasks")
      setConfig({ ...config, items: next } as ModuleConfig);
  }
  return (
    <Dialog title={`Editar ${value.title}`} close={close}>
      <form
        className="module-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const parsed = moduleConfig.parse(config);
            const content = widgetContent.parse({
              kind: parsed.kind,
              title,
              blocks: [],
              module: parsed,
            });
            await save(content);
            close();
          } catch (e) {
            setError(
              e instanceof Error && !("issues" in e)
                ? e.message
                : "Confira os campos e limites antes de salvar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nome do widget
          <input
            value={title}
            maxLength={64}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {config.kind === "poll" && (
          <>
            <label>
              Pergunta
              <input
                value={config.question}
                maxLength={120}
                required
                onChange={(e) =>
                  setConfig({ ...config, question: e.target.value })
                }
              />
            </label>
            <label>
              Duração em segundos (0 = sem prazo)
              <input
                type="number"
                min={0}
                max={86400}
                required
                value={config.duration}
                onChange={(e) =>
                  setConfig({ ...config, duration: Number(e.target.value) })
                }
              />
            </label>
          </>
        )}
        {config.kind === "dice" && (
          <label>
            Comando inicial
            <input
              value={config.expression}
              maxLength={200}
              required
              onChange={(e) =>
                setConfig({ ...config, expression: e.target.value })
              }
            />
          </label>
        )}
        {config.kind === "random" && (
          <label className="module-check">
            <input
              type="checkbox"
              checked={config.removeDrawn}
              onChange={(e) =>
                setConfig({ ...config, removeDrawn: e.target.checked })
              }
            />
            Retirar opções já sorteadas
          </label>
        )}
        {rows.map((row, index) => (
          <fieldset key={row.id}>
            <legend>
              {config.kind === "tasks" ? "Etapa" : "Opção"} {index + 1}
            </legend>
            <label>
              Texto
              <input
                required
                value={row.label}
                maxLength={120}
                onChange={(e) => patch(index, { label: e.target.value })}
              />
            </label>
            {config.kind === "random" && "weight" in row && (
              <label>
                Peso
                <input
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={row.weight}
                  onChange={(e) =>
                    patch(index, { weight: Number(e.target.value) })
                  }
                />
              </label>
            )}
            {config.kind === "tasks" && "assignee" in row && (
              <>
                <label>
                  Responsável
                  <input
                    maxLength={64}
                    value={row.assignee}
                    onChange={(e) => patch(index, { assignee: e.target.value })}
                  />
                </label>
                <label>
                  Duração em segundos
                  <input
                    type="number"
                    min={0}
                    max={86400}
                    required
                    value={row.duration}
                    onChange={(e) =>
                      patch(index, { duration: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            )}
            <div className="module-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover item ${index + 1} para cima`}
                disabled={index === 0}
                onClick={() => order(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Mover item ${index + 1} para baixo`}
                disabled={index === rows.length - 1}
                onClick={() => order(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Excluir item ${index + 1}`}
                disabled={rows.length <= (config.kind === "tasks" ? 1 : 2)}
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </button>
            </div>
          </fieldset>
        ))}
        {config.kind !== "dice" && (
          <button
            type="button"
            className="secondary"
            disabled={
              rows.length >=
              (config.kind === "poll" ? 12 : config.kind === "tasks" ? 30 : 50)
            }
            onClick={() => {
              if (config.kind === "poll")
                setConfig({
                  ...config,
                  options: [
                    ...config.options,
                    { id: freshKey(), label: `Opção ${rows.length + 1}` },
                  ],
                });
              else if (config.kind === "random")
                setConfig({
                  ...config,
                  options: [
                    ...config.options,
                    {
                      id: freshKey(),
                      label: `Opção ${rows.length + 1}`,
                      weight: 1,
                    },
                  ],
                });
              else if (config.kind === "tasks")
                setConfig({
                  ...config,
                  items: [
                    ...config.items,
                    {
                      id: freshKey(),
                      label: `Etapa ${rows.length + 1}`,
                      assignee: "",
                      duration: 900,
                    },
                  ],
                });
            }}
          >
            <Plus size={16} />
            Adicionar {config.kind === "tasks" ? "etapa" : "opção"}
          </button>
        )}
        <p className="field-note">
          Alterar a configuração reinicia os votos, resultados ou progresso
          deste widget. Alterar só o nome preserva o estado.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          Salvar
        </button>
      </form>
    </Dialog>
  );
}
