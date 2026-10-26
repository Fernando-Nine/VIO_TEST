import { useEffect, useId, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { Volume2, VolumeX } from "lucide-react";
import type { Controller } from "../room/controller";

/**
 * Volume of one watched screen, in its own header: click silences it, hover
 * or keyboard focus opens the slider (tap opens it on touch). Only local
 * playback changes; nothing that is sent.
 */
export function ScreenVolume({
  engine,
  id,
}: {
  engine: Controller;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const touch = useRef(false);
  const closing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelClose = () => clearTimeout(closeTimer.current);
  const dismiss = () => {
    cancelClose();
    closing.current = true;
    setOpen(false);
    button.current?.focus();
    closing.current = false;
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const info = engine.screenInfo(id);
  if (!info || info.publication.owner === engine.view.id) return null;
  const level = engine.screenLevel(id);
  const forcedMute =
    engine.captures.deaf || engine.remoteMute || engine.masterVolume === 0;
  const silent = forcedMute || level.muted;
  const noAudio = !info.publication.audio;
  const leave = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 600);
  };
  return (
    <div
      ref={root}
      className={`screen-volume ${open ? "has-menu" : ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") {
          cancelClose();
          setOpen(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") leave();
      }}
      onFocus={() => {
        cancelClose();
        if (
          !closing.current &&
          root.current?.ownerDocument.activeElement?.matches(":focus-visible")
        )
          setOpen(true);
      }}
      onBlur={(e) => {
        if (
          !e.currentTarget.contains(e.relatedTarget) &&
          !root.current?.ownerDocument
            .getElementById(panelId)
            ?.contains(e.relatedTarget as Node | null)
        )
          setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          dismiss();
        }
      }}
    >
      <button
        ref={button}
        className="icon-button volume-trigger"
        aria-label={`Volume da tela de ${info.name}`}
        title={
          noAudio
            ? "Esta tela não transmite áudio"
            : "Clique para silenciar esta tela"
        }
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onPointerDown={(e) => {
          touch.current = e.pointerType === "touch";
        }}
        onClick={() => {
          if (touch.current || matchMedia("(hover: none)").matches)
            setOpen(true);
          else if (!forcedMute && !noAudio)
            engine.setScreenLevel(id, { muted: !level.muted });
        }}
      >
        {silent || noAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          className="volume-popover"
          id={panelId}
          label={`Volume da tela de ${info.name}`}
          close={() => {
            cancelClose();
            setOpen(false);
          }}
          onPointerEnter={cancelClose}
          onPointerLeave={leave}
        >
          <div className="volume-scroll">
            <div className="screen-volume-row is-only">
              <label htmlFor={`level-${id}`}>
                {info.name}
                <output>{Math.round(level.volume * 100)}%</output>
              </label>
              <div>
                <button
                  className="icon-button"
                  disabled={forcedMute || noAudio}
                  aria-label={`${level.muted ? "Ativar áudio" : "Silenciar tela"} de ${info.name}`}
                  onClick={() =>
                    engine.setScreenLevel(id, { muted: !level.muted })
                  }
                >
                  {silent ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  id={`level-${id}`}
                  aria-label={`Volume da tela de ${info.name}`}
                  type="range"
                  min="0"
                  max={engine.fineAudio ? "300" : "100"}
                  step={engine.fineAudio ? "1" : "5"}
                  value={Math.round(level.volume * 100)}
                  disabled={noAudio}
                  onChange={(e) =>
                    engine.setScreenLevel(id, { volume: +e.target.value / 100 })
                  }
                />
              </div>
            </div>
            {noAudio && (
              <p className="field-note">Esta tela não transmite áudio.</p>
            )}
            {forcedMute && (
              <p className="field-note">
                {engine.masterVolume === 0
                  ? "O volume geral está zerado em Ajustes → Aplicativo."
                  : "A reprodução está silenciada nos controles da sala."}
              </p>
            )}
            {engine.fineAudio && (
              <small className="field-note">Ajuste fino ativo · até 300%</small>
            )}
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
