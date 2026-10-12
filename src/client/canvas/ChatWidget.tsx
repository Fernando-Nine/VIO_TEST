import { useEffect, useRef, useState } from "react";
import { Send, Settings2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { freshKey } from "../id";
import type { WidgetProps } from "./widgets";
import { canManageRoom, canEditPublic } from "../../shared/permissions";

export function ChatWidget({ widget, engine, visible }: WidgetProps) {
  const chat = engine.view.snapshot?.widgets?.find(
    (w) => w.id === widget.config.sharedId,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const last = chat?.messages?.at(-1);
  const operation = useRef({ text: "", id: "" });
  useEffect(() => {
    const mark = () => {
      if (visible && document.visibilityState === "visible" && chat) {
        engine.markChatRead(chat.id, last?.sentAt || 0);
        if (list.current) list.current.scrollTop = list.current.scrollHeight;
      }
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [visible, chat?.id, last?.id, engine]);
  if (!chat) return <p className="widget-empty">Este chat foi encerrado.</p>;
  const manages = canManageRoom(engine.view.snapshot, engine.view.id);
  const editable = canEditPublic(engine.view.snapshot, engine.view.id, chat);
  return (
    <div className="chat-widget">
      <div className="chat-meta">
        <small>Chat da sala</small>
        {editable && (
          <button
            className="icon-button"
            aria-label="Editar chat"
            onClick={() => {
              setTitle(chat.title);
              setEditing(true);
            }}
          >
            <Settings2 size={14} />
          </button>
        )}
      </div>
      <div
        ref={list}
        className="chat-messages"
        role="log"
        aria-label={`Mensagens de ${chat.title}`}
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
      >
        {!chat.messages?.length && (
          <p className="widget-empty">Comece a conversa.</p>
        )}
        {chat.messages?.map((message, i, messages) => {
          const grouped =
            i > 0 &&
            messages[i - 1].authorId === message.authorId &&
            message.sentAt - messages[i - 1].sentAt < 300000;
          return (
            <div
              key={message.id}
              className={`chat-message ${grouped ? "is-grouped" : ""}`}
            >
              {!grouped && (
                <Avatar
                  name={message.authorName}
                  color={message.color}
                  url={message.avatarUrl}
                />
              )}
              <div>
                <div className="chat-message-heading">
                  {!grouped && <strong>{message.authorName}</strong>}
                  <time
                    dateTime={new Date(message.sentAt).toISOString()}
                    aria-label={`Enviada às ${new Date(message.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  >
                    {new Date(message.sentAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {error && !editing && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-compose"
        onSubmit={async (e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text || busy) return;
          if (operation.current.text !== text)
            operation.current = { text, id: freshKey() };
          setBusy(true);
          setError("");
          try {
            await engine.request("chat-send", {
              id: chat.id,
              messageId: operation.current.id,
              text,
            });
            setDraft("");
            operation.current = { text: "", id: "" };
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Não foi possível enviar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          aria-label="Mensagem"
          placeholder="Mensagem…"
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={busy}
        />
        <button
          className="icon-button"
          aria-label="Enviar mensagem"
          disabled={busy || !draft.trim()}
        >
          <Send size={17} />
        </button>
      </form>
      {editing && (
        <Dialog title="Editar chat" close={() => setEditing(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await engine.request("widget-structure", {
                  id: chat.id,
                  revision: chat.revision,
                  content: { kind: "chat", title, blocks: [] },
                });
                setEditing(false);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Não foi possível salvar.",
                );
              }
            }}
          >
            <label>
              Nome do chat
              <input
                value={title}
                maxLength={64}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <button className="primary">Salvar</button>
          </form>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          {manages && (
            <p className="field-note">
              As permissões de edição ficam em Pessoas na sala.
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
