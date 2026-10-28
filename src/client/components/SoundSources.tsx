import { useId, useRef, useState } from "react";
import { Music, Volume2, VolumeX, X } from "lucide-react";
import type { Controller } from "../room/controller";
import { AnchoredPopover } from "./AnchoredPopover";
import { useSpeaking } from "./Media";
import { VolumeNumber, VolumeSlider } from "./VolumeSlider";
import "./sound.css";

/** Display name of a sound-only publication (#236). */
export const soundName = (label?: string) => label || "Som";

/**
 * Sounds shared without an image (#236): one compact chip each in the toolbar,
 * never a video tile. Playback stays in the canvas `<audio>` (ScreenAudio).
 */
export function SoundSources({ engine }: { engine: Controller }) {
  const ids = engine.view.watching.filter((id) => {
    const info = engine.screenInfo(id);
    return (
      info?.publication.audioOnly && info.publication.owner !== engine.view.id
    );
  });
  if (!ids.length) return null;
  return (
    <ul className="sound-sources" aria-label="Sons que você ouve">
      {ids.map((id) => (
        <SoundChip key={id} engine={engine} id={id} />
      ))}
    </ul>
  );
}

function SoundChip({ engine, id }: { engine: Controller; id: string }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const info = engine.screenInfo(id);
  const level = engine.screenLevel(id);
  const silent = level.muted || engine.masterVolume === 0;
  const playing = useSpeaking(engine.peers.stream(id), silent);
  if (!info) return null;
  const name = soundName(info.publication.label);
  return (
    <li className={`sound-chip ${playing ? "is-playing" : ""}`}>
      <button
        ref={anchor}
        className="text-button sound-chip-trigger"
        aria-label={`${name}, som de ${info.name}${silent ? ", silenciado" : ""}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={`${name} · ${info.name}`}
        onClick={() => setOpen(!open)}
      >
        {silent ? (
          <VolumeX size={15} aria-hidden="true" />
        ) : (
          <Music size={15} aria-hidden="true" />
        )}
        <span className="sound-chip-name">{name}</span>
        <i className="sound-bars" aria-hidden="true">
          <b />
          <b />
          <b />
        </i>
      </button>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={panelId}
          label={`Som ${name}`}
          className="sound-panel"
          close={() => setOpen(false)}
        >
          <div className="sound-panel-head">
            <Music size={18} aria-hidden="true" />
            <span>
              <strong title={name}>{name}</strong>
              <small>de {info.name}</small>
            </span>
            <button
              className="icon-button"
              aria-label={silent ? `Ativar ${name}` : `Silenciar ${name}`}
              aria-pressed={level.muted}
              onClick={() => engine.setScreenLevel(id, { muted: !level.muted })}
            >
              {silent ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
          <div className="sound-panel-volume">
            <VolumeSlider
              label={`Volume de ${name}`}
              value={level.volume}
              max={engine.fineAudio ? 3 : 1}
              step={engine.fineAudio ? 0.01 : 0.05}
              onChange={(volume) => engine.setScreenLevel(id, { volume })}
            />
            <VolumeNumber
              value={level.volume}
              reset={() => engine.setScreenLevel(id, { volume: 1 })}
            />
          </div>
          <button
            className="text-button sound-panel-stop"
            onClick={() => {
              setOpen(false);
              engine.stopWatching(id);
            }}
          >
            <X size={15} aria-hidden="true" /> Parar de ouvir
          </button>
        </AnchoredPopover>
      )}
    </li>
  );
}
