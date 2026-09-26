import { useEffect, useRef } from "react";
import { Play, PanelsTopLeft } from "lucide-react";
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
  const ref = useRef<HTMLElement>(null);
  const own = publication.owner === engine.view.id;
  const count = engine.view.watching.length;
  useEffect(() => {
    if (!ref.current || !visible || !engine.previewsEnabled) {
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
  }, [publication.id, visible, engine.previewsEnabled, onVisible]);
  const stream =
    !engine.previewsEnabled || !visible
      ? undefined
      : own
        ? engine.captures.sources.get("screen")?.stream
        : engine.peers.stream(publication.id, "preview");
  return (
    <article
      className="preview"
      ref={ref}
      aria-label={`Tela disponível de ${name}`}
    >
      <button
        className="preview-open"
        aria-label={`${count ? "Trocar foco para" : "Assistir"} tela de ${name}`}
        onClick={() => engine.select(publication.id)}
      >
        <span className="preview-image">
          {stream ? (
            <Media stream={stream} label={`Miniatura de ${name}`} />
          ) : (
            <span className="preview-initial">
              {[...name.trim()][0]?.toUpperCase() || "?"}
            </span>
          )}
        </span>
        <span className="preview-title">
          {name}
          {own ? " · você" : ""}
          <small>
            <Play size={12} />
            {count ? "Trocar foco" : "Assistir"}
          </small>
        </span>
      </button>
      {count === 1 && (
        <div className="preview-actions">
          <button
            onClick={() => engine.watch(publication.id, true)}
            aria-label={`Assistir tela de ${name} em conjunto`}
          >
            <PanelsTopLeft size={15} /> Em conjunto
          </button>
        </div>
      )}
    </article>
  );
}
