import { useState } from "react";
import { ArrowLeftRight, Eye, EyeOff, X } from "lucide-react";
import type { Controller } from "../room/controller";
import { ScreenAudio } from "./ScreenAudio";
import { Media } from "./Media";

function WatchedScreen({
  id,
  engine,
  diagnostics,
}: {
  id: string;
  engine: Controller;
  diagnostics: () => void;
}) {
  const { volume, muted: silent } = engine.screenLevel(id);
  const [hidden, setHidden] = useState(false);
  const info = engine.screenInfo(id);
  const name = info?.name || "Participante";
  const focused = engine.view.selected === id;
  const own = info?.publication.owner === engine.view.id;
  const stream = own
    ? engine.captures.sources.get("screen")?.stream
    : engine.peers.stream(id);
  const stats = engine.peers
    .infos()
    .find((p) => !p.sending && p.publicationId === id && p.tier === "main");
  const muted = own || silent || engine.remoteMute || engine.captures.deaf;
  return (
    <section
      className={`watched-screen ${focused ? "is-focused" : "is-secondary"} ${hidden ? "local-hidden" : ""}`}
      aria-label={`Tela de ${name}${focused ? ", em foco" : ", em conjunto"}`}
      data-publication={id}
    >
      {/* Keep this element, ref and stream stable when only the focus changes. */}
      <Media
        stream={stream}
        label={`Transmissão de ${name}`}
        className="main-video"
        muted={true}
      />
      {!own && info?.publication.audio && (
        <ScreenAudio
          stream={stream}
          engine={engine}
          muted={!!muted}
          volume={volume}
          name={name}
        />
      )}
      {(!stream?.getVideoTracks().length || hidden) && (
        <div className="screen-placeholder" role="status">
          <strong>
            {hidden ? "Prévia oculta" : `Conectando à tela de ${name}…`}
          </strong>
          {focused && (
            <p>
              {hidden
                ? "Você continua transmitindo para a sala."
                : "Aguardando a mídia da transmissão."}
            </p>
          )}
          {!hidden && stats?.error && (
            <button className="secondary" onClick={diagnostics}>
              Ver conexão
            </button>
          )}
        </div>
      )}
      <div className="screen-caption">
        <span>
          <i aria-hidden="true" />
          {name}
          {own ? " · você" : ""}
        </span>
        {engine.view.watching.length === 2 && (
          <button
            className="icon-button"
            aria-label={
              focused
                ? "Alternar foco entre telas"
                : `Colocar tela de ${name} em foco`
            }
            title="Trocar foco sem interromper os vídeos"
            onClick={() =>
              engine.select(
                focused
                  ? engine.view.watching.find((other) => other !== id)!
                  : id,
              )
            }
          >
            <ArrowLeftRight size={17} />
          </button>
        )}
        {own && (
          <button
            className="icon-button"
            aria-label={
              hidden ? "Mostrar prévia local" : "Ocultar prévia local"
            }
            onClick={() => setHidden(!hidden)}
          >
            {hidden ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        )}
        <button
          className="icon-button"
          aria-label={`Parar de assistir tela de ${name}`}
          title="Parar de assistir"
          onClick={() => engine.stopWatching(id)}
        >
          <X size={17} />
        </button>
      </div>
    </section>
  );
}

export function ScreenStage(props: {
  engine: Controller;
  diagnostics: () => void;
}) {
  return (
    <div
      className={`screen-stage ${props.engine.view.watching.length === 2 ? "watching-pair" : ""}`}
    >
      {props.engine.view.watching.map((id) => (
        <WatchedScreen key={id} id={id} {...props} />
      ))}
    </div>
  );
}
