import { useEffect, useRef } from "react";
import { Play, PanelsTopLeft, Focus, X } from "lucide-react";
import type { Publication } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { Media } from "./Media";

export function ScreenPicker({
  publication,
  name,
  engine,
  visible,
  onVisible,
}: {
  publication: Publication;
  name: string;
  engine: Controller;
  visible: boolean;
  onVisible: (id: string, state: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const own = publication.owner === engine.view.id;
  const count = engine.view.watching.length;
  const watched = engine.view.watching.includes(publication.id);
  const focused = engine.view.selected === publication.id;
  useEffect(() => {
    if (!ref.current || !visible || !engine.previewsEnabled || watched) {
      onVisible(publication.id, false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => onVisible(publication.id, entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      onVisible(publication.id, false);
    };
  }, [publication.id, visible, engine.previewsEnabled, watched, onVisible]);
  const stream =
    !engine.previewsEnabled || !visible || watched
      ? undefined
      : own
        ? engine.captures.sources.get("screen")?.stream
        : engine.peers.stream(publication.id, "preview");
  return (
    <div className="participant-screen" ref={ref}>
      {engine.previewsEnabled && !watched && (
        <button
          className="participant-preview"
          aria-label={`Assistir somente à tela de ${name}`}
          onClick={() => engine.watchOnly(publication.id)}
        >
          {stream ? (
            <Media stream={stream} label={`Miniatura de ${name}`} />
          ) : (
            <span>{[...name.trim()][0]?.toUpperCase() || "?"}</span>
          )}
          <span className="preview-watch">
            <Play size={14} /> Assistir
          </span>
        </button>
      )}
      <div
        className={`participant-screen-actions ${watched ? "is-watched" : ""}`}
      >
        {watched ? (
          <>
            <button
              className="screen-action"
              aria-label={`Colocar tela de ${name} em foco`}
              aria-pressed={focused}
              onClick={() => engine.select(publication.id)}
            >
              <Focus size={14} />
              {focused ? "Em foco" : "Focar"}
            </button>
            {count > 1 && (
              <button
                className="screen-action"
                aria-label={`Assistir somente à tela de ${name}`}
                onClick={() => engine.watchOnly(publication.id)}
              >
                Só esta
              </button>
            )}
            <button
              className="screen-action screen-stop"
              aria-label={`Parar de assistir tela de ${name}`}
              onClick={() => engine.stopWatching(publication.id)}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              className="screen-action"
              aria-label={`Assistir somente à tela de ${name}`}
              onClick={() => engine.watchOnly(publication.id)}
            >
              <Play size={14} />
              {count ? "Só esta" : "Assistir"}
            </button>
            {count > 0 && (
              <button
                className="screen-action"
                aria-label={`Assistir tela de ${name} em conjunto`}
                onClick={() => engine.watch(publication.id, true)}
              >
                <PanelsTopLeft size={14} />
                Em conjunto
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
