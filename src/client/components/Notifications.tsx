import { useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";
import type { Controller } from "../room/controller";
import type { SharedWidget } from "../../shared/widgets";
import type { ScreenEvent } from "./LiveScreens";

type Item = {
  id: string;
  text: string;
  /** Already acted on elsewhere (e.g. Assistir on the toast). */
  read?: boolean;
  time?: number;
  onDismiss?: () => void;
  actions?: { label: string; run: () => void | Promise<unknown> }[];
};
export function Notifications({
  engine,
  openWidget,
  openScreen,
  screenEvents,
  closeEvents,
  closedIds,
  onOpenChange,
}: {
  engine: Controller;
  openWidget: (widget: SharedWidget) => void;
  openScreen: (id: string) => void;
  /** Newest last. */
  screenEvents: ScreenEvent[];
  /** "Nine fechou o Cronômetro." for closes made by someone else. */
  closeEvents: { id: string; text: string; at: number }[];
  /** Room widgets you closed with −: not news anymore. */
  closedIds: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(new Set<string>());
  const [seen, setSeen] = useState(new Set<string>());
  /** Unread when the bell opened: they keep the dot until it closes. */
  const [fresh, setFresh] = useState(new Set<string>());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  // Opens only on click (or Enter/Space), never on hover or focus.
  const set = (value: boolean) => {
    if (!value) setFresh(new Set());
    setOpen(value);
    onOpenChange(value);
  };
  useEffect(() => {
    if (!open) return;
    const blur = (event: FocusEvent) => {
      if (
        !document.getElementById(id)?.contains(event.target as Node) &&
        event.target !== anchor.current
      )
        set(false);
    };
    document.addEventListener("focusin", blur);
    return () => document.removeEventListener("focusin", blur);
  }, [open]);
  const snapshot = engine.view.snapshot;
  const state = engine.canvas.getSnapshot();
  const items: Item[] = [];
  const live = new Set(
    snapshot?.participants.flatMap((p) => p.publications.map((x) => x.id)),
  );
  for (const event of screenEvents)
    items.push({
      id: `screen:${event.id}`,
      text: event.sound
        ? `${event.name} começou a transmitir o som de ${event.sound}`
        : `${event.name} começou a transmitir`,
      read: event.read,
      time: event.at,
      actions:
        live.has(event.publicationId) &&
        !engine.view.watching.includes(event.publicationId)
          ? [
              {
                label: event.sound ? "Ouvir" : "Assistir",
                run: () => openScreen(event.publicationId),
              },
            ]
          : [],
    });
  for (const event of closeEvents)
    items.push({ id: `closed:${event.id}`, text: event.text, time: event.at });
  for (const widget of snapshot?.widgets || []) {
    if (
      widget.owner !== engine.view.id &&
      !closedIds.includes(widget.id) &&
      !state.widgets.some((w) => w.config.sharedId === widget.id)
    )
      items.push({
        id: `widget:${widget.id}`,
        text: `${widget.title} está disponível na sala`,
        actions: [{ label: "Aceitar", run: () => openWidget(widget) }],
      });
    const unread =
      widget.messages?.filter(
        (m) =>
          m.authorId !== engine.view.id &&
          m.sentAt > (engine.chatRead.get(widget.id) || 0),
      ) || [];
    if (unread.length)
      items.push({
        id: `chat:${widget.id}:${unread.at(-1)!.id}`,
        onDismiss: () => engine.markChatRead(widget.id, unread.at(-1)!.sentAt),
        text: `${widget.title}: ${unread.length} nova${unread.length === 1 ? " mensagem" : "s mensagens"}`,
        actions: [
          {
            label: "Abrir",
            run: () => {
              openWidget(widget);
              engine.markChatRead(widget.id, unread.at(-1)!.sentAt);
            },
          },
        ],
      });
  }
  for (const notice of snapshot?.notices || [])
    items.push({ id: `notice:${notice.id}`, text: notice.text });
  // Newest first: the bell is a history, not a to-do list.
  const remaining = items.filter((item) => !dismissed.has(item.id)).reverse();
  const unread = remaining.filter((item) => !item.read && !seen.has(item.id));
  // Opening the bell clears the count; the items stay as history.
  useEffect(() => {
    if (!open || !unread.length) return;
    const ids = unread.map((i) => i.id);
    setSeen((previous) => new Set([...previous, ...ids]));
    setFresh((previous) => new Set([...previous, ...ids]));
  });
  const dismiss = (...list: Item[]) => {
    for (const item of list) item.onDismiss?.();
    setDismissed(
      (previous) => new Set([...previous, ...list.map((i) => i.id)]),
    );
  };
  // "Agora" is the last hour; items without a time are current state.
  const hourAgo = Date.now() - 3600000;
  const groups = [
    {
      title: "Agora",
      items: remaining.filter((i) => !i.time || i.time >= hourAgo),
    },
    {
      title: "Antes",
      items: remaining.filter((i) => i.time && i.time < hourAgo),
    },
  ].filter((g) => g.items.length);
  return (
    <div className="notifications-trigger">
      <button
        ref={anchor}
        className="text-button"
        aria-label={
          unread.length
            ? `Notificações, ${unread.length} ${unread.length === 1 ? "nova" : "novas"}`
            : "Notificações"
        }
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => set(!open)}
      >
        <Bell size={17} />
        {unread.length > 0 && (
          <span className="notification-count">{unread.length}</span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {unread.length
          ? `${unread.length} ${unread.length === 1 ? "notificação nova" : "notificações novas"}`
          : ""}
      </span>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={id}
          label="Notificações"
          className="notifications-panel"
          close={() => set(false)}
        >
          <header>
            <strong>Notificações</strong>
            {!!remaining.length && (
              <button
                className="text-button"
                onClick={() => dismiss(...remaining)}
              >
                Limpar
              </button>
            )}
          </header>
          {!remaining.length && <p>Nenhuma notificação.</p>}
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="notification-group">{group.title}</h3>
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className={fresh.has(item.id) ? "is-unread" : undefined}
                >
                  {fresh.has(item.id) && (
                    <i
                      className="notification-dot"
                      role="img"
                      aria-label="Não lida"
                    />
                  )}
                  <p>
                    {item.text}
                    {item.time && (
                      <time dateTime={new Date(item.time).toISOString()}>
                        {new Date(item.time).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    )}
                  </p>
                  <div className="notification-actions">
                    {item.actions?.map((action) => (
                      <button
                        key={action.label}
                        className="secondary"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy(item.id);
                          setError("");
                          try {
                            await action.run();
                            set(false);
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Não foi possível concluir.",
                            );
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                    <button
                      className="text-button"
                      aria-label={`Excluir da lista: ${item.text}`}
                      onClick={() => dismiss(item)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
          {error && <p role="alert">{error}</p>}
        </AnchoredPopover>
      )}
    </div>
  );
}
