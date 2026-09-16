import { useEffect, useState } from "react";
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

export function RoomLimit({ limit }: { limit: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="limit-help"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="icon-button"
        aria-label="Por que a sala tem limite de pessoas?"
        aria-expanded={open}
        aria-describedby="room-limit-explanation"
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={17} />
      </button>
      <span
        id="room-limit-explanation"
        role="tooltip"
        className={`limit-tooltip ${open ? "shown" : ""}`}
      >
        Até {limit} pessoas. A mídia usa conexões diretas entre os navegadores.
        Cada pessoa a mais aumenta o envio e o trabalho dos aparelhos. Salas
        maiores precisam de outra estrutura para manter a qualidade.
      </span>
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
  const [focused, setFocused] = useState(false);
  const open = pinned || hovered || focused;
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
        (p.sending || p.publicationId === view.selected),
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
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setPinned(false);
          setHovered(false);
          setFocused(false);
        }
      }}
    >
      <button
        className={`connection latency-${metric.tone}`}
        aria-expanded={open}
        aria-controls="connection-details"
        aria-label={`${metric.source}: ${metric.label}. ${metric.quality}. Ver detalhes da conexão`}
        onClick={() => {
          setPinned((v) => !v);
          setFocused(false);
          setHovered(false);
        }}
      >
        <span className="connection-dot" aria-hidden="true" />
        <span className="ping-value">{metric.label}</span>
        <span className="ping-source">{metric.source}</span>
      </button>
      {open && (
        <div
          className="connection-popover"
          id="connection-details"
          role="group"
          aria-label="Detalhes da conexão"
        >
          <strong>{metric.quality}</strong>
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
              setPinned(false);
              diagnostics();
            }}
          >
            Abrir diagnóstico
          </button>
        </div>
      )}
    </div>
  );
}
