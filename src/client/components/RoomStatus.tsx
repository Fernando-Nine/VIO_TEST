import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import { Clock3, HelpCircle } from "lucide-react";
import type { Controller } from "../room/controller";
import { connectionMetric, formatDuration } from "../room/status";

export function RoomTimer({ engine }: { engine: Controller }) {
  const [seconds, setSeconds] = useState(() => engine.roomSeconds());
  useEffect(() => {
    const update = () => setSeconds(engine.roomSeconds());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [engine, engine.view.snapshot?.createdAt]);
  return (
    <span className="room-duration" title="Tempo desde a criação desta sala">
      <Clock3 size={13} aria-hidden="true" />
      <span>
        Há{" "}
        <time aria-label={`Duração da sala: ${formatDuration(seconds)}`}>
          {formatDuration(seconds)}
        </time>
      </span>
    </span>
  );
}

export function RoomLimit({
  count,
  threshold = 6,
}: {
  count: number;
  threshold?: number;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  return (
    <span
      className={`limit-help ${count >= threshold ? "capacity-warning" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        ref={button}
        className="icon-button"
        aria-label={
          count >= threshold
            ? "Envio mais pesado: entender o custo da sala"
            : "Como o número de pessoas afeta a conexão?"
        }
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={17} />
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          id={id}
          role="tooltip"
          className="limit-explanation"
          close={close}
        >
          A sala não bloqueia a entrada pelo número de pessoas. A partir de{" "}
          {threshold} pessoas, o envio fica mais pesado: a mídia usa conexões
          diretas entre os navegadores. Cada participante aumenta o uso de rede
          e o trabalho dos aparelhos. Se travar, reduza a qualidade da tela.
        </AnchoredPopover>
      )}
    </span>
  );
}

export function ConnectionStatus({
  engine,
  diagnostics,
}: {
  engine: Controller;
  diagnostics: () => void;
}) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const keepHover = () => {
    clearTimeout(hoverTimer.current);
    setHovered(true);
  };
  const leaveHover = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(false), 220);
  };
  const close = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setPinned(false);
    setHovered(false);
  }, []);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const open = pinned || hovered;
  const view = engine.view;
  const screens =
    view.snapshot?.participants
      .flatMap((p) => p.publications)
      .filter((p) => p.kind === "screen") || [];
  const screenPeers = engine.peers
    .infos()
    .filter(
      (p) =>
        p.kind === "screen" &&
        p.tier === "main" &&
        (p.sending || view.watching.includes(p.publicationId)),
    );
  const metric = connectionMetric(
    view.status,
    view.signalingPing,
    screens.length > 0,
    screenPeers,
  );
  return (
    <div
      className="connection-wrap"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") keepHover();
      }}
      onPointerLeave={leaveHover}
      onBlur={(e) => {
        if (
          !e.currentTarget.contains(e.relatedTarget) &&
          !button.current?.ownerDocument
            .getElementById(panelId)
            ?.contains(e.relatedTarget as Node | null)
        )
          close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
          button.current?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={button}
        className={`connection latency-${metric.tone}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${metric.source}: ${metric.label}. ${metric.quality}. Ver detalhes da conexão`}
        onClick={() => {
          setPinned((v) => !v);
          setHovered(false);
        }}
      >
        <span className="connection-dot" aria-hidden="true" />
        <span className="ping-value">{metric.label}</span>
        <span className="ping-source">{metric.source}</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          className="connection-popover"
          id={panelId}
          label="Detalhes da conexão"
          close={close}
          onPointerEnter={keepHover}
          onPointerLeave={leaveHover}
        >
          <strong>{metric.quality}</strong>
          <RoomTimer engine={engine} />
          <p>
            Servidor{" "}
            <b>
              {view.signalingPing === undefined
                ? "aguardando"
                : `${view.signalingPing} ms`}
            </b>
          </p>
          {screens.length === 0 ? (
            <p className="field-note">
              Quando uma tela estiver conectada, o indicador mostra a latência
              da mídia.
            </p>
          ) : screenPeers.length === 0 ? (
            <p className="field-note">
              A tela ainda não tem uma conexão com espectador para medir.
            </p>
          ) : (
            screenPeers.map((p) => (
              <p key={p.id}>
                Tela · {p.sending ? "envio" : "recepção"}
                <b>
                  {p.state !== "connected"
                    ? "conectando"
                    : p.rtt === undefined
                      ? "aguardando"
                      : `${p.rtt} ms`}
                </b>
              </p>
            ))
          )}
          <p className="ping-legend">
            <span>● &lt; 100 ms</span>
            <span>● 100–250 ms</span>
            <span>● &gt; 250 ms</span>
          </p>
          <button
            className="text-button"
            onClick={() => {
              close();
              diagnostics();
            }}
          >
            Abrir diagnóstico
          </button>
        </AnchoredPopover>
      )}
    </div>
  );
}
