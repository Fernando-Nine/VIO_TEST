import { useEffect, useId, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { Volume2, VolumeX } from "lucide-react";
import type { Controller } from "../room/controller";
import { VolumeNumber, VolumeSlider } from "./VolumeSlider";

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
                <VolumeNumber
                  value={level.volume}
                  reset={() => engine.setScreenLevel(id, { volume: 1 })}
                />
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
                <ScreenVolumeSlider engine={engine} id={id} />
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

/** The track alone: header popover, right-click menu and full screen. */
export function ScreenVolumeSlider({
  engine,
  id,
  vertical,
}: {
  engine: Controller;
  id: string;
  vertical?: boolean;
}) {
  const info = engine.screenInfo(id);
  const level = engine.screenLevel(id);
  return (
    <VolumeSlider
      id={vertical ? undefined : `level-${id}`}
      label={`Volume da tela de ${info?.name || "Participante"}`}
      value={level.volume}
      max={engine.fineAudio ? 3 : 1}
      step={engine.fineAudio ? 0.01 : 0.05}
      disabled={!info?.publication.audio}
      vertical={vertical}
      onChange={(volume) => engine.setScreenLevel(id, { volume })}
    />
  );
}

/**
 * Full screen: the thin bar's Volume button opens the track upright, above
 * itself. Inline, not a popover, so hovering it keeps the bar expanded.
 */
export function FullscreenVolume({
  engine,
  id,
}: {
  engine: Controller;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const cardId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const info = engine.screenInfo(id);
  if (!info || info.publication.owner === engine.view.id) return null;
  const level = engine.screenLevel(id);
  return (
    <div
      className="fullscreen-volume"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        closeTimer.current = setTimeout(() => setOpen(false), 300);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        className="dock-button"
        aria-label={`Volume da tela de ${info.name}`}
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {level.muted || !info.publication.audio ? <VolumeX /> : <Volume2 />}
        <span>Volume</span>
      </button>
      {open && (
        <div
          className="fullscreen-volume-card"
          id={cardId}
          role="group"
          aria-label={`Volume da tela de ${info.name}`}
        >
          <VolumeNumber
            value={level.volume}
            reset={() => engine.setScreenLevel(id, { volume: 1 })}
          />
          <ScreenVolumeSlider engine={engine} id={id} vertical />
        </div>
      )}
    </div>
  );
}
