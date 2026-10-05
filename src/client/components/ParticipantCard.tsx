import { useCallback } from "react";
import { AudioLines, Headphones, MicOff, Monitor, Palette } from "lucide-react";
import type { Participant } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { Media, useSpeaking } from "./Media";
import { ScreenPicker } from "./ScreenPicker";
import { participantStyle } from "./participant-style";

export function ParticipantCard({
  person,
  engine,
  visible,
  onVisible,
  onEditColor,
}: {
  person: Participant;
  engine: Controller;
  visible: boolean;
  onVisible: (id: string, visible: boolean) => void;
  onEditColor: () => void;
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
          <ScreenPicker
            publication={screen}
            name={person.name}
            engine={engine}
            visible={visible}
            onVisible={onVisible}
          />
        </>
      )}
    </article>
  );
}
