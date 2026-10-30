import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { Logo } from "./Logo";
import { colorPresets } from "../../shared/colors";
import { invite } from "../endpoint";
import type { Controller } from "../room/controller";
import {
  drawCode,
  forgetRecent,
  lastSeenText,
  loadRecent,
  parseRoomInput,
  recentColor,
  renameRecent,
  saveRecent,
  type RecentRoom,
} from "../room/recent-rooms";

export interface HomeEntry {
  code?: string;
  invite?: string;
  /** Lock the room right after creating it (#242). */
  lock?: boolean;
}

/** Card that replaces its button; only one open at a time. */
type Card = "create" | "join" | null;

function NameField({
  name,
  setName,
}: {
  name: string;
  setName: (value: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  return (
    <label className="home-name">
      <span>Seu nome</span>
      <input
        value={draft}
        maxLength={32}
        autoComplete="nickname"
        placeholder="Como chamar você?"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setName(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(name);
            requestAnimationFrame(() => e.currentTarget?.blur());
          }
        }}
      />
    </label>
  );
}

function AvatarButton({ engine, name }: { engine: Controller; name: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);
  return (
    <div className="home-avatar" ref={root}>
      <button
        className="home-avatar-button"
        aria-label="Trocar avatar"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Avatar name={name || "?"} color={engine.roomColor} />
      </button>
      {open && (
        <div
          className="home-colors"
          role="group"
          aria-label="Cor do avatar"
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            setOpen(false);
            root.current?.querySelector("button")?.focus();
          }}
        >
          {colorPresets.map((preset) => {
            const selected =
              preset.color.toLowerCase() === engine.roomColor.toLowerCase();
            return (
              <button
                key={preset.color}
                aria-label={preset.name}
                aria-pressed={selected}
                style={{ background: preset.color }}
                onClick={() => {
                  engine.chooseColor(preset.color);
                  setOpen(false);
                }}
              >
                {selected && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentList({
  rooms,
  setRooms,
  enter,
}: {
  rooms: RecentRoom[];
  setRooms: (list: RecentRoom[]) => void;
  enter: (code: string) => void;
}) {
  const [menu, setMenu] = useState<{
    room: RecentRoom;
    at: { x: number; y: number };
    origin: Element;
  } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const update = (list: RecentRoom[]) => {
    setRooms(list);
    saveRecent(list);
  };
  const items = (room: RecentRoom): MenuItem[] => [
    {
      label: "Renomear (só para você)",
      icon: Pencil,
      run: () => setRenaming(room.code),
    },
    {
      label: "Copiar convite",
      icon: Copy,
      run: () => {
        void navigator.clipboard
          ?.writeText(invite(room.code).href)
          .then(() => {
            setCopied(room.code);
            window.setTimeout(() => setCopied(null), 2000);
          })
          .catch(() => undefined);
      },
    },
    {
      label: "Esquecer",
      icon: Trash2,
      danger: true,
      separated: true,
      run: () => update(forgetRecent(rooms, room.code)),
    },
  ];
  if (!rooms.length)
    return (
      <p className="home-empty">As salas em que você entrar aparecem aqui.</p>
    );
  return (
    <>
      <ul className="home-recent">
        {rooms.map((room) => (
          <li key={room.code}>
            {renaming === room.code ? (
              <input
                className="home-rename"
                aria-label={`Nome da sala ${room.code}, só para você`}
                defaultValue={room.label || ""}
                placeholder={room.code}
                maxLength={40}
                autoFocus
                onBlur={(e) => {
                  update(renameRecent(rooms, room.code, e.target.value));
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button
                className="home-room"
                onClick={() => enter(room.code)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    room,
                    at: { x: e.clientX, y: e.clientY },
                    origin: e.currentTarget,
                  });
                }}
                onKeyDown={(e) => {
                  if (
                    e.key !== "ContextMenu" &&
                    !(e.shiftKey && e.key === "F10")
                  )
                    return;
                  e.preventDefault();
                  const box = e.currentTarget.getBoundingClientRect();
                  setMenu({
                    room,
                    at: { x: box.left + 24, y: box.bottom },
                    origin: e.currentTarget,
                  });
                }}
              >
                <span
                  className="home-room-color"
                  style={{ background: recentColor(room.code) }}
                  aria-hidden="true"
                />
                <span className="home-room-text">
                  <strong className={room.label ? undefined : "mono"}>
                    {room.label || room.code}
                  </strong>
                  <span>
                    {copied === room.code
                      ? "Convite copiado."
                      : lastSeenText(room.lastSeen)}
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {menu && (
        <ContextMenu
          at={menu.at}
          origin={menu.origin}
          label={menu.room.label || menu.room.code}
          items={items(menu.room)}
          close={() => setMenu(null)}
        />
      )}
    </>
  );
}

/**
 * Início (#259): what the Windows app shows when it opens, and the browser once
 * a name is saved. Create or enter in one click, recent rooms at hand.
 */
export function Home({
  engine,
  name,
  setName,
  initialCode,
  busy,
  enter,
  landing,
}: {
  engine: Controller;
  name: string;
  setName: (value: string) => void;
  /** `?sala=` of the link that opened the app: opens Entrar filled in. */
  initialCode: string;
  busy: boolean;
  enter: (entry: HomeEntry) => void;
  /** Browser only: the logo goes back to the landing page. */
  landing?: () => void;
}) {
  const [rooms, setRooms] = useState(loadRecent);
  const [card, setCard] = useState<Card>(initialCode ? "join" : null);
  const [draw, setDraw] = useState(drawCode);
  const [locked, setLocked] = useState(false);
  const [joinText, setJoinText] = useState(initialCode);
  const createButton = useRef<HTMLButtonElement>(null);
  const joinButton = useRef<HTMLButtonElement>(null);
  const nameMissing = !name.trim();
  const parsed = parseRoomInput(joinText);
  function close(which: Card) {
    setCard(null);
    requestAnimationFrame(() =>
      (which === "create" ? createButton : joinButton).current?.focus(),
    );
  }
  function needName() {
    if (!nameMissing) return false;
    document.querySelector<HTMLInputElement>(".home-name input")?.focus();
    return true;
  }
  function create(event: FormEvent) {
    event.preventDefault();
    const code = draw.trim().toUpperCase();
    if (needName() || !/^[A-Z0-9]{4,24}$/.test(code)) return;
    enter({ code, lock: locked });
  }
  function join(event: FormEvent) {
    event.preventDefault();
    if (needName() || !parsed) return;
    enter({ code: parsed.code, invite: parsed.invite });
  }
  return (
    <main className="home" id="main-content">
      <aside className="home-side" aria-label="Você e suas salas">
        {landing ? (
          <button
            className="home-logo"
            aria-label="VIO · Conheça o VIO"
            onClick={landing}
          >
            <Logo label={false} />
          </button>
        ) : (
          <span className="home-logo">
            <Logo />
          </span>
        )}
        <div className="home-me">
          <AvatarButton engine={engine} name={name} />
          <NameField name={name} setName={setName} />
        </div>
        <h2 className="home-heading">SALAS RECENTES</h2>
        <RecentList
          rooms={rooms}
          setRooms={setRooms}
          enter={(code) => {
            if (!needName()) enter({ code });
          }}
        />
        <p className="home-note">Guardadas só neste aparelho.</p>
      </aside>
      <section className="home-main" aria-labelledby="home-title">
        <h1 id="home-title">O que vamos ver hoje?</h1>
        <div className="home-actions">
          {card === "create" ? (
            <form
              className="home-card"
              onSubmit={create}
              onKeyDown={(e) => e.key === "Escape" && close("create")}
              aria-busy={busy}
            >
              <label>
                Criar sala
                <input
                  className="mono"
                  value={draw}
                  autoFocus
                  maxLength={24}
                  pattern="[A-Za-z0-9]{4,24}"
                  aria-describedby="home-draw-note"
                  onChange={(e) =>
                    setDraw(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                />
              </label>
              <span id="home-draw-note" className="home-card-note">
                Código sorteado. Pode trocar.
              </span>
              <div className="home-card-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={locked}
                  className="home-switch"
                  onClick={() => setLocked(!locked)}
                >
                  <span className="switch-track" aria-hidden="true" />
                  Trancada
                </button>
                <span className="home-card-gap" />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => close("create")}
                >
                  Cancelar
                </button>
                <button className="primary" disabled={busy}>
                  <span className="home-dot" data-ponto="inicio" />
                  Criar
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={createButton}
              className="primary home-create"
              onClick={() => {
                setDraw(drawCode());
                setCard("create");
              }}
            >
              <span className="home-dot" data-ponto="inicio" />
              Criar sala
            </button>
          )}
          {card === "join" ? (
            <form
              className="home-card"
              onSubmit={join}
              onKeyDown={(e) => e.key === "Escape" && close("join")}
              aria-busy={busy}
            >
              <label>
                Entrar com código
                <input
                  className="mono"
                  value={joinText}
                  autoFocus
                  placeholder="Código ou link da sala"
                  aria-describedby={parsed?.link ? "home-link-note" : undefined}
                  onChange={(e) => setJoinText(e.target.value)}
                />
              </label>
              <div className="home-card-row">
                {parsed?.link && (
                  <span id="home-link-note" className="home-link-tag">
                    Link reconhecido ·{" "}
                    <span className="mono">{parsed.code}</span>
                  </span>
                )}
                <span className="home-card-gap" />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => close("join")}
                >
                  Cancelar
                </button>
                <button className="home-enter" disabled={busy || !parsed}>
                  Entrar
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={joinButton}
              className="secondary home-join"
              onClick={() => setCard("join")}
            >
              Entrar com código
            </button>
          )}
        </div>
        {nameMissing && (
          <p className="home-hint">Escreva seu nome ao lado para entrar.</p>
        )}
      </section>
    </main>
  );
}

/**
 * App opening (#259): the dot lights up, "vio" writes itself and the logo
 * leaves on its own by 600 ms. Never blocks: a click or key skips it.
 */
export function Splash({ done }: { done: () => void }) {
  useEffect(() => {
    const skip = () => done();
    const timer = window.setTimeout(skip, 700);
    window.addEventListener("pointerdown", skip, true);
    window.addEventListener("keydown", skip, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", skip, true);
      window.removeEventListener("keydown", skip, true);
    };
  }, [done]);
  return (
    <div className="splash" aria-hidden="true">
      <Logo label={false} />
    </div>
  );
}
