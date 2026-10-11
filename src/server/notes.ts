import { type NoteCopy, noteCopyInput } from "../shared/widgets";
import { Fault } from "./security";

/** Immutable copies live only for the lifetime of the room. */
export class RoomNotes {
  private copies = new Map<string, NoteCopy>();
  list() {
    return [...this.copies.values()];
  }
  clear() {
    this.copies.clear();
  }
  send(senderId: string, senderName: string, input: unknown) {
    const data = noteCopyInput.parse(input);
    const previous = this.copies.get(data.id);
    if (previous) {
      if (
        previous.senderId !== senderId ||
        previous.label !== data.label ||
        previous.value !== data.value
      )
        throw new Fault(
          "NOTE_CONFLICT",
          "Esta cópia já foi enviada. Envie a revisão como uma nova cópia.",
        );
      return previous;
    }
    if (
      this.copies.size >= 60 ||
      this.list().filter((n) => n.senderId === senderId).length >= 12
    )
      throw new Fault(
        "NOTE_LIMIT",
        "Limite de cópias atingido nesta sala (12 por pessoa, 60 no total). Use uma nota compartilhada para continuar editando juntos.",
      );
    const note: NoteCopy = {
      ...data,
      senderId,
      senderName,
      sentAt: Date.now(),
    };
    this.copies.set(note.id, note);
    return note;
  }
}
