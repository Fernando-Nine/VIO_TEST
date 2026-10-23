import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { EmojiPicker } from "../components/EmojiPicker";
import { HeaderTools, ScopeBadge, useRename } from "./header-tools";
import { freshKey } from "../id";
import type { WidgetProps } from "./widgets";
import { canEditPublic } from "../../shared/permissions";

export function ChatWidget({ widget, engine, visible }: WidgetProps) {
  const chat = engine.view.snapshot?.widgets?.find(
    (w) => w.id === widget.config.sharedId,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLInputElement>(null);
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
  const editable =
    !!chat && canEditPublic(engine.view.snapshot, engine.view.id, chat);
  useRename(
    chat && editable
      ? async (title) => {
          await engine.request("widget-structure", {
            id: chat.id,
            revision: chat.revision,
            content: { kind: "chat", title, blocks: [] },
          });
        }
      : undefined,
  );
  if (!chat) return <p className="widget-empty">Este chat foi encerrado.</p>;
  let groupStart = 0;
  return (
    <div className="chat-widget">
      <HeaderTools>
        <ScopeBadge shared />
      </HeaderTools>
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
          // A group keeps one header until the author changes or five
          // minutes pass since the header that opened it.
          const grouped =
            i > 0 &&
            messages[i - 1].authorId === message.authorId &&
            message.sentAt - groupStart < 300000;
          if (!grouped) groupStart = message.sentAt;
          const time = new Date(message.sentAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
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
                {grouped && (
                  <time
                    className="chat-hover-time"
                    dateTime={new Date(message.sentAt).toISOString()}
                    aria-label={`Enviada às ${time}`}
                  >
                    {time}
                  </time>
                )}
                {!grouped && (
                  <div className="chat-message-heading">
                    <strong>{message.authorName}</strong>
                    <time
                      dateTime={new Date(message.sentAt).toISOString()}
                      aria-label={`Enviada às ${time}`}
                    >
                      {time}
                    </time>
                  </div>
                )}
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
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
        <EmojiPicker
          onPick={(emoji) => {
            const input = composer.current;
            const at = input?.selectionStart ?? draft.length;
            const end = input?.selectionEnd ?? at;
            setDraft((d) =>
              (d.slice(0, at) + emoji + d.slice(end)).slice(0, 2000),
            );
            requestAnimationFrame(() => {
              input?.focus();
              input?.setSelectionRange(at + emoji.length, at + emoji.length);
            });
          }}
        />
        <input
          ref={composer}
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
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
