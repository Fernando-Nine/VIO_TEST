import { useState } from "react";
import { Play, Volume2, Palette } from "lucide-react";
import type { Controller } from "../room/controller";
import { soundEvents, type Cue } from "../media/sound-preferences";

export function ApplicationSettings({ engine }: { engine: Controller }) {
  const [feedback, setFeedback] = useState("");
  const [playing, setPlaying] = useState<Cue | null>(null);
  const canPreview =
    engine.sounds && engine.masterVolume > 0 && engine.soundVolume > 0;
  async function preview(cue: Cue) {
    setPlaying(cue);
    const played = await engine.playCue(cue, true);
    setFeedback(
      played
        ? "Som de teste reproduzido."
        : "O navegador não liberou o som. Clique em ouvir para tentar novamente.",
    );
    setPlaying(null);
  }
  return (
    <>
      <fieldset>
        <legend>Organização dos widgets</legend>
        <p className="field-note">
          Arraste livremente. Segure Shift para encaixar no grid. No toque ou
          sem arrastar, use Layout → Mover widget.
        </p>
      </fieldset>
      <fieldset className="application-volume">
        <legend>
          <Volume2 size={17} /> Volume do aplicativo
        </legend>
        <label>
          Volume geral <output>{Math.round(engine.masterVolume * 100)}%</output>
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={engine.masterVolume}
            aria-label="Volume geral do aplicativo"
            onChange={(e) => {
              engine.masterVolume = +e.target.value;
              engine.savePreferences();
            }}
          />
        </label>
        <p className="field-note">
          Controla as vozes, o áudio das telas e os sons do VIO que você ouve. O
          volume enviado pelo seu microfone permanece o mesmo.
        </p>
        {engine.masterVolume === 0 && (
          <p className="volume-status" role="status">
            O áudio do aplicativo está silenciado.
          </p>
        )}
      </fieldset>
      <fieldset>
        <legend>Sons do VIO</legend>
        <label className="toggle">
          <span>
            Feedback sonoro
            <small>
              Sons curtos para confirmar ações e avisar sobre a sala.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={engine.sounds}
            onChange={(e) => {
              engine.sounds = e.target.checked;
              engine.savePreferences();
            }}
          />
        </label>
        <label className="sound-volume">
          Volume dos efeitos{" "}
          <output>{Math.round(engine.soundVolume * 100)}%</output>
          <input
            aria-label="Volume dos efeitos"
            type="range"
            min="0"
            max="1"
            step=".01"
            disabled={!engine.sounds}
            value={engine.soundVolume}
            onChange={(e) => {
              engine.soundVolume = +e.target.value;
              engine.savePreferences();
            }}
          />
        </label>
        <p className="field-note">
          Este volume acompanha o volume geral. Suas escolhas abaixo ficam
          salvas mesmo com os sons desligados.
        </p>
        <div className="sound-event-list">
          {soundEvents.map(({ cue, label, description }) => (
            <div className="sound-event" key={cue}>
              <label className="toggle">
                <span>
                  {label}
                  <small>{description}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={engine.soundEvents[cue]}
                  disabled={!engine.sounds}
                  onChange={(e) => {
                    engine.soundEvents[cue] = e.target.checked;
                    engine.savePreferences();
                  }}
                />
              </label>
              <button
                type="button"
                className="icon-button sound-preview"
                aria-label={`Ouvir som: ${label}`}
                title={`Ouvir som: ${label}`}
                disabled={!canPreview || playing !== null}
                onClick={() => void preview(cue)}
              >
                <Play size={15} />
              </button>
            </div>
          ))}
        </div>
        <p className="sound-feedback" role="status">
          {feedback || "Use o botão de reprodução para experimentar cada som."}
        </p>
      </fieldset>
      <fieldset>
        <legend>
          <Palette size={17} /> Aparência da sala
        </legend>
        <label className="toggle">
          <span>
            Cores das pessoas nas transmissões
            <small>
              Usa a cor de cada pessoa nas bordas, no indicador ao vivo e no
              destaque de fala.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={engine.participantColors}
            onChange={(e) => {
              engine.participantColors = e.target.checked;
              engine.savePreferences();
            }}
          />
        </label>
        <p className="field-note">
          Sua cor é escolhida em Pessoas e vale para esta sala. Desligar esta
          opção mantém as cores apenas nos avatares, na sua visualização.
        </p>
      </fieldset>
    </>
  );
}
