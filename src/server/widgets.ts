import { Fault } from "./security";
import { randomInt } from "node:crypto";
import {
  applyModuleAction,
  moduleResets,
  type ModuleActor,
  type ModuleAction,
} from "../shared/room-modules";
import {
  trimToBudget,
  trimMessages,
  chatBudget,
  historyBudget,
  operateWidget,
  contentKind,
  validContent,
  type SharedWidget,
  type WidgetContent,
  type WidgetOperation,
  type ChatMessage,
  type WidgetClosed,
  closedWidgetHold,
} from "../shared/widgets";

interface ClosedWidget extends WidgetClosed {
  widget: SharedWidget;
  timer: NodeJS.Timeout;
}

export { trimToBudget, chatBudget, historyBudget };

/** Room-scoped ephemeral state. Only Rooms supplies the authenticated actor. */
export class RoomWidgets {
  readonly entries = new Map<string, SharedWidget>();
  /** Widgets closed for everyone, kept briefly for "Desfazer" (#158). */
  readonly closed = new Map<string, ClosedWidget>();
  private operations = new Map<string, number>();
  private lastMessages = new Map<string, number>();
  clear() {
    this.entries.clear();
    for (const entry of this.closed.values()) clearTimeout(entry.timer);
    this.closed.clear();
    this.operations.clear();
    this.lastMessages.clear();
  }
  list() {
    return [...this.entries.values()];
  }
  create(owner: string, id: string, content: WidgetContent) {
    const existing = this.entries.get(id);
    if (existing) {
      if (existing.owner !== owner)
        throw new Fault("FORBIDDEN", "Este widget pertence a outra pessoa.");
      return existing;
    }
    this.capacity(owner, content.kind);
    if (!validContent(content))
      throw new Fault(
        "INVALID_REQUEST",
        "Cada bloco precisa de uma identidade única.",
      );
    const widget = {
      ...content,
      id,
      owner,
      revision: 0,
      createdAt: Date.now(),
    };
    this.entries.set(id, widget);
    return widget;
  }
  private capacity(owner: string, kind: WidgetContent["kind"]) {
    if (
      this.entries.size >= 32 ||
      this.list().filter((w) => w.owner === owner).length >= 6
    )
      throw new Fault(
        "WIDGET_LIMIT",
        "Limite de widgets da sala atingido: até 6 por criador e 32 na sala.",
      );
    if (
      kind === "chat" &&
      this.list().filter((w) => w.kind === "chat").length >= chatBudget.widgets
    )
      throw new Fault(
        "WIDGET_LIMIT",
        `A sala já tem ${chatBudget.widgets} chats. Use um dos existentes.`,
      );
  }
  private owned(owner: string, id: string, authorized = false) {
    const widget = this.entries.get(id);
    if (!widget)
      throw new Fault("NOT_FOUND", "Este widget não está mais disponível.");
    if (!authorized && widget.owner !== owner)
      throw new Fault(
        "FORBIDDEN",
        "Somente o criador pode alterar a estrutura ou excluir este widget.",
      );
    return widget;
  }
  structure(
    owner: string,
    id: string,
    revision: number,
    content: WidgetContent,
    authorized = false,
  ) {
    const current = this.owned(owner, id, authorized);
    if (content.kind && content.kind !== contentKind(current))
      throw new Fault(
        "INVALID_REQUEST",
        "Use um widget separado para outro tipo de conteúdo.",
      );
    if (current.revision !== revision)
      throw new Fault(
        "WIDGET_CONFLICT",
        "O widget mudou. Reabra a edição antes de salvar a estrutura.",
      );
    if (!validContent(content))
      throw new Fault(
        "INVALID_REQUEST",
        "Cada bloco precisa de uma identidade única.",
      );
    const next = {
      ...current,
      ...content,
      revision: current.revision + 1,
      ...(content.module && moduleResets(current.module, content.module)
        ? { moduleState: {} }
        : {}),
    };
    this.entries.set(id, next);
    return next;
  }
  remove(owner: string, id: string, authorized = false) {
    this.owned(owner, id, authorized);
    this.entries.delete(id);
  }
  /** Removes the widget and holds it for `closedWidgetHold` ms. */
  close(id: string, by: string, byName: string): WidgetClosed {
    const widget = this.owned(by, id, true);
    this.entries.delete(id);
    this.drop(id);
    // Bounded: at most one held copy per widget slot in the room.
    while (this.closed.size >= 32) this.drop(this.closed.keys().next().value!);
    const until = Date.now() + closedWidgetHold;
    const timer = setTimeout(() => {
      if (this.closed.get(id)?.until === until) this.closed.delete(id);
    }, closedWidgetHold);
    timer.unref();
    this.closed.set(id, { widget, by, byName, until, timer });
    return { by, byName, until };
  }
  /** The held widget, if it can still be restored. */
  held(id: string) {
    const entry = this.closed.get(id);
    if (!entry || entry.until < Date.now())
      throw new Fault("NOT_FOUND", "Não dá mais para desfazer.");
    return entry;
  }
  restore(id: string) {
    const { widget } = this.held(id);
    if (this.entries.has(id))
      throw new Fault("WIDGET_CONFLICT", "Este widget já está aberto.");
    this.capacity(widget.owner, widget.kind);
    this.drop(id);
    this.entries.set(id, widget);
    return widget;
  }
  private drop(id: string) {
    const entry = this.closed.get(id);
    if (entry) clearTimeout(entry.timer);
    this.closed.delete(id);
  }
  /** Returns the chat and whether the message is new (false for a retry). */
  message(id: string, message: ChatMessage): [SharedWidget, boolean] {
    const current = this.entries.get(id);
    if (!current || current.kind !== "chat")
      throw new Fault("NOT_FOUND", "Este chat não está disponível.");
    const messages = current.messages || [];
    if (
      messages.some(
        (m) => m.id === message.id && m.authorId === message.authorId,
      )
    )
      return [current, false];
    const key = message.authorId;
    if (message.sentAt - (this.lastMessages.get(key) || 0) < 700)
      throw new Fault(
        "RATE_LIMIT",
        "Espere um instante antes de enviar outra mensagem.",
      );
    this.lastMessages.set(key, message.sentAt);
    const next = {
      ...current,
      revision: current.revision + 1,
      messages: trimMessages([...messages, message]),
    };
    this.entries.set(id, next);
    return [next, true];
  }
  /** Drops a departed participant from per-widget editor lists. */
  forget(participantId: string) {
    for (const [id, widget] of this.entries)
      if (widget.guestEditors?.includes(participantId))
        this.entries.set(id, {
          ...widget,
          guestEditors: widget.guestEditors.filter((v) => v !== participantId),
        });
  }
  permission(id: string, participantId: string | undefined, allowed: boolean) {
    const current = this.entries.get(id);
    if (!current) throw new Fault("NOT_FOUND", "Widget indisponível.");
    const next = participantId
      ? {
          ...current,
          guestEditors: [
            ...new Set([
              ...(current.guestEditors || []).filter(
                (id) => id !== participantId,
              ),
              ...(allowed ? [participantId] : []),
            ]),
          ],
        }
      : { ...current, allGuestsEdit: allowed };
    next.revision++;
    this.entries.set(id, next);
    return next;
  }
  interact(
    actor: ModuleActor,
    id: string,
    operationId: string,
    operation: ModuleAction,
  ) {
    const current = this.entries.get(id);
    if (!current?.module) throw new Fault("NOT_FOUND", "Widget indisponível.");
    const key = `${actor.id}:${id}:${operationId}`;
    if (this.operations.has(key)) return current;
    const now = Date.now(),
      // Per widget: rolling dice right after a draw elsewhere is normal use.
      throttle = `module:${actor.id}:${id}`;
    if (
      (operation.kind === "roll" || operation.kind === "draw") &&
      now - (this.lastMessages.get(throttle) || 0) < 300
    )
      throw new Fault(
        "RATE_LIMIT",
        "Espere um instante antes de tentar novamente.",
      );
    try {
      const state = applyModuleAction(
        current.module,
        current.moduleState || {},
        operation,
        actor,
        operationId,
        current.revision,
        now,
        randomInt,
      );
      const moduleState = state.history
        ? {
            ...state,
            history: trimToBudget(
              state.history,
              historyBudget.results,
              historyBudget.chars,
              (r) =>
                r.detail.length + r.label.length + (r.expression?.length || 0),
            ),
          }
        : state;
      const next = { ...current, moduleState, revision: current.revision + 1 };
      this.entries.set(id, next);
      this.operations.set(key, now);
      if (operation.kind === "roll" || operation.kind === "draw")
        this.lastMessages.set(throttle, now);
      while (this.operations.size > 4096)
        this.operations.delete(this.operations.keys().next().value!);
      return next;
    } catch (e) {
      throw new Fault(
        "INVALID_REQUEST",
        e instanceof Error ? e.message : "Não foi possível concluir.",
      );
    }
  }
  operate(
    actor: string,
    id: string,
    operationId: string,
    operation: WidgetOperation,
  ) {
    const current = this.entries.get(id);
    if (!current)
      throw new Fault("NOT_FOUND", "Este widget não está mais disponível.");
    const key = `${actor}:${id}:${operationId}`;
    if (this.operations.has(key)) return current;
    try {
      const next = operateWidget(current, operation, Date.now());
      this.entries.set(id, next);
      this.operations.set(key, Date.now());
      while (this.operations.size > 4096)
        this.operations.delete(this.operations.keys().next().value!);
      return next;
    } catch (error) {
      if (error instanceof Error && error.message === "WIDGET_CONFLICT")
        throw new Fault(
          "WIDGET_CONFLICT",
          "Outra pessoa alterou o widget. Seu rascunho foi preservado; confira a versão atual antes de salvar.",
        );
      throw new Fault("INVALID_REQUEST", "Bloco indisponível para esta ação.");
    }
  }
}
