import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Copy, Link as LinkIcon, Lock, LockOpen } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";
import { canManageRoom } from "../../shared/permissions";
import type { InviteTtl } from "../../shared/protocol";
import { invite } from "../endpoint";
import type { Controller } from "../room/controller";
import { loadTtl, saveTtl, ttlChoices, validUntil } from "../room/invite-text";

/** Keeps Tab inside the panel while it is open. */
function trapFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled)",
    ),
  ];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function EntryPanel({
  engine,
  locked,
}: {
  engine: Controller;
  locked: boolean;
}) {
  const [ttl, setTtl] = useState<InviteTtl>(loadTtl);
  const [direct, setDirect] = useState(true);
  const [copied, setCopied] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const code = engine.view.snapshot!.code;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);
  async function copyInvite() {
    try {
      if (direct) {
        const result = await engine.createInvite(ttl);
        await navigator.clipboard.writeText(invite(code, result.invite).href);
        setCopied(`Convite copiado. ${validUntil(result.expiresAt)}`);
      } else {
        await navigator.clipboard.writeText(invite(code).href);
        setCopied("Convite copiado.");
      }
      setRevoked(false);
    } catch (e) {
      engine.fail(e);
    }
  }
  async function revoke() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    try {
      await engine.revokeInvites();
      setCopied("");
      setRevoked(true);
    } catch (e) {
      engine.fail(e);
    }
  }
  return (
    <div className="entry-panel" onKeyDown={trapFocus}>
      <button
        ref={first}
        role="switch"
        aria-checked={locked}
        className="entry-lock"
        onClick={() =>
          void engine.setLocked(!locked).catch((e) => engine.fail(e))
        }
      >
        <span className="entry-text">
          <strong>Sala trancada</strong>
          <span>
            Quem já esteve aqui entra direto. Quem é novo espera você deixar.
          </span>
        </span>
        <span className="switch-track" aria-hidden="true" />
      </button>
      <hr />
      <div className="entry-invite">
        <strong id="entry-invite-title">Convite</strong>
        <div
          className="entry-ttl"
          role="radiogroup"
          aria-labelledby="entry-invite-title"
        >
          {ttlChoices.map((choice) => (
            <button
              key={choice.ttl}
              role="radio"
              aria-checked={ttl === choice.ttl}
              disabled={!direct}
              onClick={() => {
                setTtl(choice.ttl);
                saveTtl(choice.ttl);
                setCopied("");
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <label className="entry-direct">
          <input
            type="checkbox"
            checked={direct}
            onChange={(e) => {
              setDirect(e.target.checked);
              setCopied("");
            }}
          />
          Entra direto, mesmo trancada
        </label>
        <button className="primary" onClick={() => void copyInvite()}>
          <LinkIcon size={16} aria-hidden="true" />
          Copiar convite
        </button>
        {copied && (
          <p className="entry-copied" role="status">
            {copied}
          </p>
        )}
      </div>
      <hr />
      <button className="entry-revoke" onClick={() => void revoke()}>
        <strong>{confirming ? "Revogar mesmo?" : "Revogar convites"}</strong>
        <span role={revoked ? "status" : undefined}>
          {revoked
            ? "Pronto. Os convites enviados não valem mais."
            : "Os convites já enviados param de valer."}
        </span>
      </button>
    </div>
  );
}

/**
 * Room code in the header (#260). Creator and admins open the entry panel;
 * everyone else copies the code and, when locked, sees the lock as a sign.
 */
export function RoomCode({
  engine,
  copyCode,
}: {
  engine: Controller;
  copyCode: () => void;
}) {
  const snapshot = engine.view.snapshot!;
  const locked = !!snapshot.permissions?.locked;
  const manages = canManageRoom(snapshot, engine.view.id);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!manages) setOpen(false);
  }, [manages]);
  if (!manages)
    return (
      <span className="room-code-group">
        <button
          className="room-code"
          title="Copiar código da sala"
          aria-label={`Copiar código da sala ${snapshot.code}`}
          onClick={copyCode}
        >
          <span>{snapshot.code}</span>
          <Copy size={14} aria-hidden="true" />
        </button>
        {locked && (
          <span className="room-locked-sign" role="img" aria-label="Trancada">
            <Lock size={14} aria-hidden="true" />
          </span>
        )}
      </span>
    );
  return (
    <>
      <button
        ref={button}
        className={`room-code room-lock ${locked ? "is-locked" : ""}`}
        aria-expanded={open}
        aria-controls="entry-panel"
        aria-label={`${locked ? "Sala trancada" : "Sala aberta"}. Abrir opções de entrada`}
        onClick={() => setOpen(!open)}
      >
        {locked ? (
          <Lock size={16} aria-hidden="true" />
        ) : (
          <LockOpen size={16} aria-hidden="true" />
        )}
        <span>{snapshot.code}</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          id="entry-panel"
          className="entry-popover"
          label="Entrada na sala"
          close={() => setOpen(false)}
        >
          <EntryPanel engine={engine} locked={locked} />
        </AnchoredPopover>
      )}
    </>
  );
}
