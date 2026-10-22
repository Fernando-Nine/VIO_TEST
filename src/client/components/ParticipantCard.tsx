import { useCallback } from "react";
import {
  AudioLines,
  Headphones,
  MicOff,
  Monitor,
  Palette,
  Crown,
  ShieldCheck,
} from "lucide-react";
import type { Participant } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { Media, useSpeaking } from "./Media";
import { participantStyle } from "./participant-style";

export function ParticipantCard({
  person,
  engine,
  visible,
  onVisible,
  onEditColor,
  detailed = false,
}: {
  person: Participant;
  engine: Controller;
  visible: boolean;
  onVisible: (id: string, visible: boolean) => void;
  onEditColor: () => void;
  detailed?: boolean;
}) {
  const own = person.id === engine.view.id;
  const voice = person.publications.find((p) => p.kind === "voice");
  const camera = person.publications.find((p) => p.kind === "camera");
  const screen = person.publications.find((p) => p.kind === "screen");
  const stream = voice
    ? own
      ? engine.captures.sources.get("voice")?.stream
      : engine.peers.stream(voice.id)
    : undefined;
  const level = useCallback(() => engine.captures.voiceLevel, [engine]);
  const speaking = useSpeaking(
    stream,
    !visible || !!voice?.muted || !voice || !person.online,
    own ? level : undefined,
  );
  const cameraStream = camera
    ? own
      ? engine.captures.sources.get("camera")?.stream
      : engine.peers.stream(camera.id)
    : undefined;
  return (
    <article
      className={`participant-card ${speaking ? "speaking" : ""} ${!person.online ? "offline" : ""}`}
      aria-label={`${person.name}${speaking ? ", falando" : ""}`}
      style={participantStyle(person.color, engine.participantColors)}
    >
      <div className="participant-identity">
        <div className="participant-avatar">
          {cameraStream ? (
            <Media
              stream={cameraStream}
              className={own ? "mirrored" : ""}
              label={`Câmera de ${person.name}`}
            />
          ) : (
            <span>{[...person.name].slice(0, 2).join("").toUpperCase()}</span>
          )}
          {own && (
            <button
              className="edit-person-color"
              aria-label="Escolher minha cor"
              title="Escolher minha cor"
              onClick={onEditColor}
            >
              <Palette size={14} />
            </button>
          )}
        </div>
        <div>
          <strong title={person.name}>
            {person.name}
            {detailed && engine.view.snapshot?.creatorId === person.id && (
              <Crown
                size={15}
                role="img"
                aria-label="Criador da sala"
                className="room-creator"
              >
                <title>Criador da sala</title>
              </Crown>
            )}
            {detailed && person.role === "admin" && (
              <ShieldCheck
                size={14}
                role="img"
                aria-label="Administrador"
                className="room-admin"
              >
                <title>Administrador</title>
              </ShieldCheck>
            )}
            {own && <small> · você</small>}
          </strong>
          <span className="participant-status">
            {!person.online ? (
              "Reconectando…"
            ) : person.inCall ? (
              <>
                <Headphones size={12} /> Na chamada
              </>
            ) : (
              "Na sala"
            )}
          </span>
        </div>
        {detailed && (
          <span
            className="participant-ping"
            title="Ping com o servidor"
            aria-label={`Ping ${person.pingMs ?? "desconhecido"} ms`}
          >
            {!person.online || person.pingMs === undefined
              ? "—"
              : `${person.pingMs} ms`}
          </span>
        )}
        {person.inCall && (
          <span
            title={
              voice && !voice.muted ? "Microfone ligado" : "Microfone desligado"
            }
            aria-label={
              voice && !voice.muted ? "Microfone ligado" : "Microfone desligado"
            }
          >
            {voice && !voice.muted ? (
              <AudioLines size={14} />
            ) : (
              <MicOff size={14} />
            )}
          </span>
        )}
      </div>
      {screen && (
        <>
          <span className="participant-sharing">
            <Monitor size={12} /> Compartilhando tela
          </span>
          {!engine.view.watching.includes(screen.id) && (
            <button
              className="text-button"
              onClick={() => engine.watch(screen.id, true)}
            >
              Assistir
            </button>
          )}
        </>
      )}
      {person.inCall && !own && (
        <label className="person-volume">
          Volume da voz{" "}
          <output>
            {Math.round((engine.volumes.get(person.id) ?? 1) * 100)}%
          </output>
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            aria-label={`Volume da voz de ${person.name}`}
            value={engine.volumes.get(person.id) ?? 1}
            onChange={(event) => {
              engine.volumes.set(person.id, +event.target.value);
              engine.bump();
            }}
          />
        </label>
      )}
    </article>
  );
}
