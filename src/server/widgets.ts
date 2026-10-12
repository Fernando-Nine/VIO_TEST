import { Fault } from "./security";
import {
  operateWidget,
  contentKind,
  validContent,
  type SharedWidget,
  type WidgetContent,
  type WidgetOperation,
  type ChatMessage,
} from "../shared/widgets";

/** Room-scoped ephemeral state. Only Rooms supplies the authenticated actor. */
export class RoomWidgets {
  readonly entries = new Map<string, SharedWidget>();
  private operations = new Map<string, number>();
  private lastMessages = new Map<string, number>();
  clear() {
    this.entries.clear();
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
    if (
      this.entries.size >= 32 ||
      this.list().filter((w) => w.owner === owner).length >= 6
    )
      throw new Fault(
        "WIDGET_LIMIT",
        "Limite de widgets compartilhados atingido: até 6 por criador e 32 na sala.",
      );
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
    const next = { ...current, ...content, revision: current.revision + 1 };
    this.entries.set(id, next);
    return next;
  }
  remove(owner: string, id: string, authorized = false) {
    this.owned(owner, id, authorized);
    this.entries.delete(id);
  }
  message(id: string, message: ChatMessage) {
    const current = this.entries.get(id);
    if (!current || current.kind !== "chat")
      throw new Fault("NOT_FOUND", "Este chat não está disponível.");
    const messages = current.messages || [];
    if (
      messages.some(
        (m) => m.id === message.id && m.authorId === message.authorId,
      )
    )
      return current;
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
      messages: [...messages, message].slice(-100),
    };
    this.entries.set(id, next);
    return next;
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
