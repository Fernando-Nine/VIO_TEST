import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Plus, Minus, Share2, Copy, Trash2, X } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { freshKey } from "../id";
import { NoteActions } from "./NoteActions";
import { InlineText } from "./InlineText";
import {
  HeaderTools,
  ScopeBadge,
  useMenuItems,
  useRename,
} from "./header-tools";
import { TimerBlock, timerMenu } from "./TimerBlock";
import {
  operateWidget,
  timerElapsed,
  contentKind,
  widgetContent,
  type SharedWidget,
  type WidgetBlock,
  type WidgetContent,
  type WidgetOperation,
} from "../../shared/widgets";
import { canEditPublic, canManageRoom } from "../../shared/permissions";
import type { MenuItem } from "../components/ContextMenu";
import type { Controller } from "../room/controller";
import type { WidgetInstance } from "./model";

export function createContent(kind = "custom"): WidgetContent {
  const block: WidgetBlock =
    kind === "timer"
      ? {
          id: freshKey(),
          kind: "timer",
          label: "Cronômetro",
          mode: "down",
          loop: false,
          duration: 1500,
          elapsed: 0,
          startedAt: null,
        }
      : kind === "notes"
        ? { id: freshKey(), kind: "text", label: "Anotações", value: "" }
        : { id: freshKey(), kind: "score", label: "Pontuação", value: 0 };
  return {
    kind: kind === "notes" ? "notes" : kind === "timer" ? "timer" : "custom",
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
    raw && { kind: raw.kind, title: raw.title, blocks: raw.blocks },
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
function TextBlock({
  block,
  heading,
  revision,
  save,
  engine,
}: {
  block: Extract<WidgetBlock, { kind: "text" }>;
  heading: ReactNode;
  revision: number;
  save: (operation: WidgetOperation) => Promise<void>;
  engine: Controller;
}) {
  const inputId = useId();
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
  function commit(revision: number) {
    setBusy(true);
    void save({ kind: "text", blockId: block.id, value: draft, revision })
      .then(() => {
        setDirty(false);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }
  return (
    <div className="widget-text">
      <div className="widget-text-heading">
        {heading}
        {busy && <span className="field-note">Salvando…</span>}
      </div>
      <NoteActions engine={engine} label={block.label} value={draft} />
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
              commit(revision);
            }}
          >
            Salvar meu rascunho por cima
          </button>
        </div>
      )}
      <textarea
        id={inputId}
        aria-label={block.label}
        maxLength={2000}
        value={draft}
        readOnly={busy}
        onChange={(e) => {
          if (!dirty) setBase(revision);
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={() => {
          if (dirty && !busy && !error) commit(base);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Escape" || !dirty) return;
          e.stopPropagation();
          setDraft(block.value);
          setDirty(false);
        }}
      />
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shareId = useRef("");
  useEffect(() => {
    if (
      !visible ||
      !value?.blocks.some((b) => b.kind === "timer" && b.startedAt !== null)
    )
      return;
    setNow(engine.serverNow());
    const timer = setInterval(() => setNow(engine.serverNow()), 250);
    return () => clearInterval(timer);
  }, [
    engine,
    visible,
    !!value?.blocks.some((b) => b.kind === "timer" && b.startedAt !== null),
  ]);
  const shared = !!widget.config.sharedId;
  const owner =
    !!value &&
    (!shared || canEditPublic(engine.view.snapshot, engine.view.id, value));
  useRename(
    value && owner
      ? (title) =>
          saveStructure(
            widgetContent.parse({
              kind: value.kind,
              title,
              blocks: value.blocks,
            }),
            value.revision,
          )
      : undefined,
  );
  const timer = value?.blocks.find((b) => b.kind === "timer");
  const addable = value?.kind === "custom" || value?.kind === "notes";
  const removable =
    shared &&
    !!value &&
    (value.owner === engine.view.id ||
      canManageRoom(engine.view.snapshot, engine.view.id));
  // Mirrors the header tools so narrow headers, which hide them, keep them.
  useMenuItems(
    value
      ? ([
          ...(owner && timer ? timerMenu(timer, updateTimer) : []),
          ...(owner && addable && value.blocks.length < 6
            ? [
                {
                  label:
                    value.kind === "notes"
                      ? "Adicionar caixa de texto"
                      : "Adicionar contador",
                  icon: Plus,
                  run: addBlock,
                },
              ]
            : []),
          ...(shared
            ? [{ label: "Criar cópia individual", icon: Copy, run: copy }]
            : [{ label: "Compartilhar", icon: Share2, run: startShare }]),
          ...(removable
            ? [
                {
                  label: "Excluir para todos",
                  icon: Trash2,
                  danger: true,
                  run: () => setConfirmDelete(true),
                },
              ]
            : []),
        ] satisfies MenuItem[])
      : undefined,
  );
  if (!value)
    return (
      <p className="widget-empty">
        Este widget foi encerrado ou seu estado não pôde ser restaurado.
      </p>
    );
  async function saveStructure(content: WidgetContent, baseRevision: number) {
    if (!value) return;
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
  }
  async function operate(operation: WidgetOperation) {
    if (!owner)
      throw new Error(
        "Você não tem permissão para editar este widget público. Peça ao criador ou a um administrador.",
      );
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
  function startShare() {
    shareId.current ||= widget.id;
    setSharing(true);
  }
  function copy() {
    if (!value) return;
    engine.canvas.add(
      {
        id: freshKey(),
        type: widget.type,
        title: value.title,
        config: {},
        state: { ...value, revision: 0 },
      },
      undefined,
      true,
    );
  }
  function setBlocks(blocks: WidgetBlock[]) {
    if (!value) return;
    const content = widgetContent.safeParse({
      kind: value.kind,
      title: value.title,
      blocks,
    });
    if (!content.success) return setError("Confira o nome e os limites.");
    setError("");
    void saveStructure(content.data, value.revision).catch((e) =>
      setError(e.message),
    );
  }
  function addBlock() {
    if (!value) return;
    setBlocks([
      ...value.blocks,
      value.kind === "notes"
        ? {
            id: freshKey(),
            kind: "text",
            label: `Caixa ${value.blocks.length + 1}`,
            value: "",
          }
        : { id: freshKey(), kind: "score", label: "Jogador", value: 0 },
    ]);
  }
  const renameBlock = (id: string, label: string) =>
    setBlocks(value!.blocks.map((b) => (b.id === id ? { ...b, label } : b)));
  const blockTools = (block: WidgetBlock) =>
    owner &&
    value!.blocks.length > 1 && (
      <button
        className="icon-button block-remove"
        aria-label={`Remover ${block.label}`}
        title="Remover"
        onClick={() =>
          setBlocks(value!.blocks.filter((b) => b.id !== block.id))
        }
      >
        <X size={14} />
      </button>
    );
  const blockLabel = (block: WidgetBlock) => (
    <InlineText
      className="block-label"
      label={`Nome de ${block.label}`}
      value={block.label}
      maxLength={64}
      disabled={!owner}
      save={(label) => renameBlock(block.id, label)}
    />
  );
  function updateTimer(next: Extract<WidgetBlock, { kind: "timer" }>) {
    if (!value) return;
    void saveStructure(
      widgetContent.parse({
        kind: value.kind,
        title: value.title,
        blocks: value.blocks.map((b) => (b.id === next.id ? next : b)),
      }),
      value.revision,
    ).catch((e) => setError(e.message));
  }
  const act = (operation: WidgetOperation) => {
    setError("");
    void operate(operation).catch((e) => setError(e.message));
  };
  return (
    <div className={`custom-widget kind-${value.kind || "custom"}`}>
      <HeaderTools>
        <ScopeBadge shared={shared} />
        {!shared && (
          <button
            className="icon-button"
            aria-label={
              widget.type === "notes"
                ? "Compartilhar notas para editar juntos"
                : "Compartilhar widget com a sala"
            }
            onClick={startShare}
          >
            <Share2 size={16} />
          </button>
        )}
        {shared && (
          <button
            className="icon-button"
            aria-label="Criar cópia individual"
            onClick={copy}
          >
            <Copy size={16} />
          </button>
        )}
      </HeaderTools>
      <div className="custom-blocks">
        {widget.config.noteSender && (
          <p className="note-origin">
            Cópia de {widget.config.noteSender} ·{" "}
            {new Date(Number(widget.config.noteSentAt)).toLocaleString("pt-BR")}
            . Alterações são individuais.
          </p>
        )}
        {value.blocks.map((block) => (
          <section className="custom-block" key={block.id}>
            {block.kind === "score" && (
              <>
                <div className="block-heading">
                  {blockLabel(block)}
                  {blockTools(block)}
                </div>
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
                  engine={engine}
                  heading={
                    <div className="block-heading">
                      {blockLabel(block)}
                      {blockTools(block)}
                    </div>
                  }
                  block={block}
                  revision={value.revision}
                  save={operate}
                />
              ) : (
                <div className="widget-text">
                  <NoteActions
                    engine={engine}
                    label={block.label}
                    value={block.value}
                    save={() =>
                      operate({
                        kind: "text",
                        blockId: block.id,
                        value: block.value,
                        revision: value.revision,
                      })
                    }
                  />
                  <div className="block-heading">
                    {blockLabel(block)}
                    {blockTools(block)}
                  </div>
                  <label>
                    <span className="sr-only">{block.label}</span>
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
              <TimerBlock
                block={block}
                now={now}
                engine={engine}
                editable={owner}
                revision={value.revision}
                act={act}
                update={updateTimer}
              />
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
      {confirmDelete && (
        <Dialog
          title="Excluir este widget para todos?"
          close={() => setConfirmDelete(false)}
        >
          <p>
            O conteúdo será removido desta sala. As cópias individuais continuam
            existindo.
          </p>
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void engine
                .request("widget-delete", { id: value.id })
                .then(() => engine.canvas.remove(widget.id))
                .catch((e) => setError(e.message))
                .finally(() => {
                  setBusy(false);
                  setConfirmDelete(false);
                });
            }}
          >
            Excluir para todos
          </button>
        </Dialog>
      )}
      {sharing && (
        <Dialog
          title={
            widget.type === "notes"
              ? "Compartilhar notas para editar juntos?"
              : "Compartilhar este widget?"
          }
          close={() => setSharing(false)}
        >
          <p>
            O conteúdo ficará disponível na sala. Convidados precisam de
            aprovação para compartilhar. A edição pública exige permissão.
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
                .request<SharedWidget | { id: string; pending: true }>(
                  "widget-create",
                  {
                    id: shareId.current,
                    content: {
                      kind: value.kind,
                      title: value.title,
                      blocks: value.blocks,
                    },
                  },
                )
                .then((result) => {
                  if ("pending" in result) {
                    engine.canvas.updateWidget(widget.id, {
                      config: { ...widget.config, pendingShareId: result.id },
                    });
                    setSharing(false);
                    setError(
                      "Pedido enviado ao criador e aos administradores.",
                    );
                    return;
                  }
                  engine.receiveSharedWidget(result);
                  engine.canvas.bindShared(widget.id, result.id);
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
