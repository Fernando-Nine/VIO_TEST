import { useEffect, useId, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { Volume2, VolumeX, X } from "lucide-react";
import type { Controller } from "../room/controller";

export function VolumeControl({ engine }: { engine: Controller }) {
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
    root.current?.querySelector<HTMLButtonElement>(".volume-trigger")?.focus();
    closing.current = false;
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const ids = engine.view.watching.filter(
    (id) => engine.screenInfo(id)?.publication.owner !== engine.view.id,
  );
  const target = ids.includes(engine.view.selected)
    ? engine.view.selected
    : ids[0];
  const level = engine.screenLevel(target || "");
  const forcedMute =
    engine.captures.deaf || engine.remoteMute || engine.masterVolume === 0;
  const leave = () => {
    const doc = root.current?.ownerDocument;
    const focused = doc?.activeElement;
    if (
      !root.current?.contains(focused || null) &&
      !doc?.getElementById(panelId)?.contains(focused || null)
    )
      closeTimer.current = setTimeout(() => setOpen(false), 220);
  };
  return (
    <div
      ref={root}
      className={`dock-volume ${open ? "has-menu" : ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") {
          cancelClose();
          setOpen(true);
        }
      }}
      onPointerLeave={(e) => {
        if (
          e.pointerType === "mouse" &&
          !root.current?.contains(root.current.ownerDocument.activeElement)
        )
          leave();
      }}
      onFocus={() => {
        cancelClose();
        if (!closing.current) setOpen(true);
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
        className="dock-button volume-trigger"
        aria-label="Volume das telas"
        title="Volume das telas · clique para silenciar a tela em foco"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onPointerDown={(e) => {
          touch.current = e.pointerType === "touch";
        }}
        onClick={() => {
          if (touch.current || matchMedia("(hover: none)").matches)
            setOpen(true);
          else if (target && !forcedMute)
            engine.setScreenLevel(target, { muted: !level.muted });
        }}
      >
        {level.muted || forcedMute ? <VolumeX /> : <Volume2 />}
        <span>Volume</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          className="volume-popover"
          id={panelId}
          label="Volume das telas assistidas"
          side="above"
          close={() => {
            cancelClose();
            setOpen(false);
          }}
          onPointerEnter={cancelClose}
          onPointerLeave={leave}
        >
          <div className="volume-scroll">
            <header>
              <strong>Áudio das telas</strong>
              <button
                className="icon-button"
                aria-label="Fechar volume"
                onClick={dismiss}
              >
                <X size={15} />
              </button>
            </header>
            {!ids.length && (
              <p className="field-note">
                Sua própria prévia não reproduz áudio.
              </p>
            )}
            {ids.map((id) => {
              const info = engine.screenInfo(id)!;
              const current = engine.screenLevel(id);
              const silent = forcedMute || current.muted;
              return (
                <div className="screen-volume-row" key={id}>
                  <label htmlFor={`level-${id}`}>
                    {info.name}
                    <output>{Math.round(current.volume * 100)}%</output>
                  </label>
                  <div>
                    <button
                      className="icon-button"
                      disabled={forcedMute || !info.publication.audio}
                      aria-label={`${current.muted ? "Ativar áudio" : "Silenciar tela"} de ${info.name}`}
                      onClick={() =>
                        engine.setScreenLevel(id, { muted: !current.muted })
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
                      value={Math.round(current.volume * 100)}
                      disabled={!info.publication.audio}
                      onChange={(e) =>
                        engine.setScreenLevel(id, {
                          volume: +e.target.value / 100,
                        })
                      }
                    />
                  </div>
                </div>
              );
            })}
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
