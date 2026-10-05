import { useEffect, useRef, useState } from "react";
import { Plus, Minus, Share2, Settings2, Copy, Trash2 } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { freshKey } from "../id";
import {
  operateWidget,
  timerElapsed,
  widgetContent,
  type SharedWidget,
  type WidgetBlock,
  type WidgetContent,
  type WidgetOperation,
} from "../../shared/widgets";
import type { Controller } from "../room/controller";
import type { WidgetInstance } from "./model";

export function createContent(kind = "custom"): WidgetContent {
  const block: WidgetBlock =
    kind === "timer"
      ? {
          id: freshKey(),
          kind: "timer",
          label: "Pomodoro",
          duration: 1500,
          elapsed: 0,
          startedAt: null,
        }
      : kind === "notes"
        ? { id: freshKey(), kind: "text", label: "Anotações", value: "" }
        : { id: freshKey(), kind: "score", label: "Pontuação", value: 0 };
  return {
    title:
      kind === "notes"
        ? "Notas"
        : kind === "timer"
          ? "Cronômetro"
          : "Personalizado",
    blocks: [block],
  };
}
export function widgetValue(
  widget: WidgetInstance,
  engine: Controller,
): SharedWidget | undefined {
  if (widget.config.sharedId)
    return engine.view.snapshot?.widgets?.find(
      (w) => w.id === widget.config.sharedId,
    );
  const raw = widget.state as Partial<SharedWidget> | undefined;
  const parsed = widgetContent.safeParse(
    raw && { title: raw.title, blocks: raw.blocks },
  );
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    id: widget.id,
    owner: engine.view.id,
    revision: Number.isSafeInteger(raw?.revision) ? raw!.revision! : 0,
    createdAt: raw?.createdAt || Date.now(),
  };
}
function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function TextBlock({
  block,
  revision,
  save,
}: {
  block: Extract<WidgetBlock, { kind: "text" }>;
  revision: number;
  save: (operation: WidgetOperation) => Promise<void>;
}) {
  const [draft, setDraft] = useState(block.value);
  const [base, setBase] = useState(revision);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!dirty) {
      setDraft(block.value);
      setBase(revision);
    }
  }, [block.value, revision, dirty]);
  return (
    <div className="widget-text">
      <label>
        {block.label}
        <textarea
          maxLength={2000}
          value={draft}
          disabled={busy}
          onChange={(e) => {
            if (!dirty) setBase(revision);
            setDraft(e.target.value);
            setDirty(true);
          }}
        />
      </label>
      {dirty && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void save({
              kind: "text",
              blockId: block.id,
              value: draft,
              revision: base,
            })
              .then(() => {
                setDirty(false);
                setError("");
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Salvar texto
        </button>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <details>
            <summary>Ver texto atual da sala</summary>
            <p className="plain-note">{block.value || "Texto vazio."}</p>
          </details>
          <button
            className="text-button"
            onClick={() => {
              setBase(revision);
              setError("");
            }}
          >
            Manter meu rascunho para revisar e salvar
          </button>
        </div>
      )}
    </div>
  );
}

export function CustomWidget({
  widget,
  engine,
  visible,
}: {
  widget: WidgetInstance;
  engine: Controller;
  visible: boolean;
}) {
  const value = widgetValue(widget, engine);
  const [now, setNow] = useState(() => engine.serverNow());
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shareId = useRef("");
  useEffect(() => {
    if (!visible) return;
    setNow(engine.serverNow());
    const timer = setInterval(() => setNow(engine.serverNow()), 250);
    return () => clearInterval(timer);
  }, [engine, visible]);
  if (!value)
    return (
      <p className="widget-empty">
        Este widget foi encerrado ou seu estado não pôde ser restaurado.
      </p>
    );
  const shared = !!widget.config.sharedId;
  const owner = !shared || value.owner === engine.view.id;
  async function operate(operation: WidgetOperation) {
    if (shared)
      await engine.request("widget-operate", {
        id: value!.id,
        operationId: freshKey(),
        operation,
      });
    else {
      const current = engine.canvas
        .getSnapshot()
        .widgets.find((w) => w.id === widget.id);
      const state = current && widgetValue(current, engine);
      if (!state) throw new Error("Widget indisponível.");
      try {
        engine.canvas.updateWidget(widget.id, {
          state: operateWidget(state, operation, engine.serverNow()),
        });
      } catch {
        throw new Error(
          "O widget mudou. Confira a versão atual antes de salvar.",
        );
      }
    }
  }
  const act = (operation: WidgetOperation) => {
    setError("");
    void operate(operation).catch((e) => setError(e.message));
  };
  return (
    <div className="custom-widget">
      <div className="widget-scope">
        <span>{shared ? "Compartilhado com a sala" : "Só para você"}</span>
        {owner && (
          <button
            className="icon-button"
            aria-label="Editar estrutura do widget"
            onClick={() => setEditing(true)}
          >
            <Settings2 size={16} />
          </button>
        )}
        {!shared && (
          <button
            className="icon-button"
            aria-label="Compartilhar widget com a sala"
            onClick={() => {
              shareId.current ||= freshKey();
              setSharing(true);
            }}
          >
            <Share2 size={16} />
          </button>
        )}
        {shared && (
          <button
            className="icon-button"
            aria-label="Criar cópia individual"
            onClick={() =>
              engine.canvas.add(
                {
                  id: freshKey(),
                  type: "custom",
                  title: value.title,
                  config: {},
                  state: { ...value, revision: 0 },
                },
                undefined,
                true,
              )
            }
          >
            <Copy size={16} />
          </button>
        )}
      </div>
      <div className="custom-blocks">
        {value.blocks.map((block) => (
          <section className="custom-block" key={block.id}>
            {block.kind === "score" && (
              <>
                <strong>{block.label}</strong>
                <div className="widget-score">
                  <button
                    aria-label={`Diminuir ${block.label}`}
                    onClick={() =>
                      act({ kind: "score", blockId: block.id, delta: -1 })
                    }
                  >
                    <Minus size={18} />
                  </button>
                  <output aria-label={`Pontos de ${block.label}`}>
                    {block.value}
                  </output>
                  <button
                    aria-label={`Aumentar ${block.label}`}
                    onClick={() =>
                      act({ kind: "score", blockId: block.id, delta: 1 })
                    }
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </>
            )}
            {block.kind === "text" &&
              (shared ? (
                <TextBlock
                  block={block}
                  revision={value.revision}
                  save={operate}
                />
              ) : (
                <div className="widget-text">
                  <label>
                    {block.label}
                    <textarea
                      maxLength={2000}
                      value={block.value}
                      onChange={(event) =>
                        act({
                          kind: "text",
                          blockId: block.id,
                          value: event.target.value,
                          revision: value.revision,
                        })
                      }
                    />
                  </label>
                  <span className="field-note">Salvo neste navegador.</span>
                </div>
              ))}
            {block.kind === "timer" && (
              <>
                <strong>{block.label}</strong>
                <output
                  className="widget-clock"
                  aria-label="Tempo do cronômetro"
                >
                  {clock(
                    block.duration
                      ? block.duration - timerElapsed(block, now)
                      : timerElapsed(block, now),
                  )}
                </output>
                <div className="widget-inline-actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      act({
                        kind: "timer",
                        blockId: block.id,
                        action: block.startedAt === null ? "start" : "pause",
                        revision: value.revision,
                      })
                    }
                  >
                    {block.startedAt === null ? "Iniciar" : "Pausar"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      act({
                        kind: "timer",
                        blockId: block.id,
                        action: "reset",
                        revision: value.revision,
                      })
                    }
                  >
                    Zerar
                  </button>
                </div>
              </>
            )}
          </section>
        ))}
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {shared &&
        !engine.view.snapshot?.participants.some(
          (p) => p.id === value.owner,
        ) && (
          <p className="field-note">
            O criador saiu. O conteúdo continua disponível; faça uma cópia para
            mudar a estrutura.
          </p>
        )}
      {editing && (
        <StructureEditor
          value={value}
          shared={shared}
          close={() => setEditing(false)}
          save={async (content, baseRevision) => {
            if (shared)
              await engine.request("widget-structure", {
                id: value.id,
                revision: baseRevision,
                content,
              });
            else {
              const latest = engine.canvas
                .getSnapshot()
                .widgets.find((w) => w.id === widget.id);
              const current = latest && widgetValue(latest, engine);
              if (!current || current.revision !== baseRevision)
                throw new Error(
                  "O widget mudou. Reabra a edição antes de salvar a estrutura.",
                );
              engine.canvas.updateWidget(widget.id, {
                title: content.title,
                state: {
                  ...current,
                  ...content,
                  revision: current.revision + 1,
                },
              });
            }
          }}
          remove={
            shared
              ? async () => {
                  await engine.request("widget-delete", { id: value.id });
                  engine.canvas.remove(widget.id);
                }
              : undefined
          }
        />
      )}
      {sharing && (
        <Dialog
          title="Compartilhar este widget?"
          close={() => setSharing(false)}
        >
          <p>
            O conteúdo ficará visível para todos nesta sala. Todos poderão usar
            os blocos; só você poderá mudar a estrutura ou excluir o widget
            compartilhado.
          </p>
          <p className="field-note">
            A sala guarda esses dados temporariamente. Eles desaparecem quando a
            sala termina ou o servidor reinicia. Cada pessoa escolhe se adiciona
            o widget ao próprio layout.
          </p>
          {error && <p role="alert">{error}</p>}
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError("");
              void engine
                .request<SharedWidget>("widget-create", {
                  id: shareId.current,
                  content: { title: value.title, blocks: value.blocks },
                })
                .then((result) => {
                  engine.canvas.updateWidget(widget.id, {
                    config: { sharedId: result.id },
                    transient: true,
                    state: undefined,
                  });
                  setSharing(false);
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            Compartilhar com a sala
          </button>
        </Dialog>
      )}
    </div>
  );
}

function StructureEditor({
  value,
  shared,
  close,
  save,
  remove,
}: {
  value: SharedWidget;
  shared: boolean;
  close: () => void;
  save: (value: WidgetContent, revision: number) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const [baseRevision] = useState(value.revision);
  const [draft, setDraft] = useState<WidgetContent>(() =>
    structuredClone({ title: value.title, blocks: value.blocks }),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  function patch(id: string, change: Partial<WidgetBlock>) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        b.id === id ? ({ ...b, ...change } as WidgetBlock) : b,
      ),
    }));
  }
  return (
    <Dialog title="Estrutura do widget" close={close}>
      <label>
        Título
        <input
          value={draft.title}
          maxLength={64}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      {draft.blocks.map((block) => (
        <fieldset key={block.id}>
          <legend>
            {block.kind === "score"
              ? "Placar"
              : block.kind === "text"
                ? "Texto"
                : "Cronômetro"}
          </legend>
          <label>
            Nome
            <input
              maxLength={64}
              value={block.label}
              onChange={(e) => patch(block.id, { label: e.target.value })}
            />
          </label>
          {block.kind === "timer" && (
            <label>
              Duração em minutos · 0 para contar para cima
              <input
                type="number"
                min={0}
                max={1440}
                step={1}
                value={block.duration / 60}
                onChange={(e) =>
                  patch(block.id, {
                    duration: Math.round(Number(e.target.value) * 60),
                    elapsed: 0,
                    startedAt: null,
                  })
                }
              />
            </label>
          )}
          <button
            className="text-button"
            disabled={draft.blocks.length === 1}
            onClick={() =>
              setDraft({
                ...draft,
                blocks: draft.blocks.filter((b) => b.id !== block.id),
              })
            }
          >
            Remover bloco
          </button>
        </fieldset>
      ))}
      <div className="widget-inline-actions">
        {(["score", "text", "timer"] as const).map((kind) => (
          <button
            className="secondary"
            disabled={draft.blocks.length >= 6}
            key={kind}
            onClick={() =>
              setDraft({
                ...draft,
                blocks: [
                  ...draft.blocks,
                  kind === "score"
                    ? { id: freshKey(), kind, label: "Jogador", value: 0 }
                    : kind === "text"
                      ? { id: freshKey(), kind, label: "Texto", value: "" }
                      : {
                          id: freshKey(),
                          kind,
                          label: "Cronômetro",
                          duration: 0,
                          elapsed: 0,
                          startedAt: null,
                        },
                ],
              })
            }
          >
            +{" "}
            {kind === "score" ? "Placar" : kind === "text" ? "Texto" : "Timer"}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        className="primary"
        disabled={busy}
        onClick={() => {
          const result = widgetContent.safeParse(draft);
          if (!result.success) {
            setError("Confira os nomes dos blocos e os limites do cronômetro.");
            return;
          }
          setBusy(true);
          void save(result.data, baseRevision)
            .then(close)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        Salvar estrutura{shared ? " para a sala" : ""}
      </button>
      {remove && (
        <div className="widget-delete">
          <button
            className="text-button"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} /> Excluir para todos
          </button>
          {confirmDelete && (
            <>
              <p>
                O conteúdo será removido desta sala. As cópias individuais
                continuam existindo.
              </p>
              <button
                className="danger"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void remove()
                    .then(close)
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                Confirmar exclusão do widget
              </button>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
