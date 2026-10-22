import { useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";
import type { Controller } from "../room/controller";
import type { SharedWidget } from "../../shared/widgets";
import { canManageRoom } from "../../shared/permissions";

type Item = {
  id: string;
  text: string;
  onDismiss?: () => void;
  actions?: { label: string; run: () => void | Promise<unknown> }[];
};
export function Notifications({
  engine,
  openWidget,
  openScreen,
  onOpenChange,
}: {
  engine: Controller;
  openWidget: (widget: SharedWidget) => void;
  openScreen: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(new Set<string>());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const anchor = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const suppressFocus = useRef(false);
  const set = (value: boolean) => {
    clearTimeout(timer.current);
    setOpen(value);
    onOpenChange(value);
  };
  const leave = () => {
    timer.current = setTimeout(() => {
      if (!document.getElementById(id)?.contains(document.activeElement))
        set(false);
    }, 600);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
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
  const manages = canManageRoom(snapshot, engine.view.id);
  const items: Item[] = [];
  for (const person of snapshot?.participants || [])
    for (const screen of person.publications) {
      if (
        screen.kind === "screen" &&
        person.id !== engine.view.id &&
        !engine.view.watching.includes(screen.id)
      )
        items.push({
          id: `screen:${screen.id}`,
          text: `${person.name} compartilhou uma tela`,
          actions: [{ label: "Aceitar", run: () => openScreen(screen.id) }],
        });
    }
  for (const widget of snapshot?.widgets || []) {
    if (
      widget.owner !== engine.view.id &&
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
  for (const request of snapshot?.shareRequests || []) {
    if (request.status === "pending" && manages)
      items.push({
        id: `request:${request.id}:${request.createdAt}`,
        text: `${request.ownerName} quer compartilhar ${request.content.title}`,
        actions: [
          {
            label: "Aprovar",
            run: () =>
              engine.request("widget-review", {
                id: request.id,
                approve: true,
              }),
          },
          {
            label: "Negar",
            run: () =>
              engine.request("widget-review", {
                id: request.id,
                approve: false,
              }),
          },
        ],
      });
    else if (request.owner === engine.view.id && request.status !== "pending")
      items.push({
        id: `result:${request.id}:${request.createdAt}:${request.status}`,
        text: `Compartilhamento de ${request.content.title}: ${request.status === "approved" ? "aprovado" : "negado"}`,
      });
  }
  for (const notice of snapshot?.notices || [])
    items.push({ id: `notice:${notice.id}`, text: notice.text });
  const remaining = items.filter((item) => !dismissed.has(item.id));
  const dismiss = (item: Item) => {
    item.onDismiss?.();
    setDismissed((previous) => new Set([...previous, item.id]));
  };
  return (
    <div
      className="notifications-trigger"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") set(true);
      }}
      onPointerLeave={leave}
    >
      <button
        ref={anchor}
        className="text-button"
        aria-label={`Notificações (${remaining.length})`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onFocus={() => {
          if (
            !suppressFocus.current &&
            anchor.current?.matches(":focus-visible")
          )
            set(true);
        }}
        onClick={() => set(true)}
      >
        <Bell size={17} />
        {remaining.length > 0 && (
          <span className="notification-count">{remaining.length}</span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {remaining.length ? `${remaining.length} notificações disponíveis` : ""}
      </span>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={id}
          label="Notificações"
          className="notifications-panel"
          close={() => {
            suppressFocus.current = true;
            set(false);
            queueMicrotask(() => {
              suppressFocus.current = false;
            });
          }}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={leave}
        >
          <header>
            <strong>Notificações</strong>
          </header>
          {!remaining.length && <p>Nenhuma notificação.</p>}
          {remaining.map((item) => (
            <article key={item.id}>
              <p>{item.text}</p>
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
                        dismiss(item);
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
          {error && <p role="alert">{error}</p>}
        </AnchoredPopover>
      )}
    </div>
  );
}
