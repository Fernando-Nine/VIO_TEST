import { useState } from "react";
import { Play } from "lucide-react";
import type { Controller } from "../room/controller";
import { notificationRows, type Cue } from "../media/sound-preferences";

/** Ajustes › Áudio › Saída. */
export function MasterVolume({ engine }: { engine: Controller }) {
  return (
    <>
      <label className="application-volume">
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
        Só o que você ouve; o envio do seu microfone não muda.
      </p>
      {engine.masterVolume === 0 && (
        <p className="volume-status" role="status">
          O áudio do aplicativo está silenciado.
        </p>
      )}
    </>
  );
}

/** Ajustes › Notificações: Balão × Som by kind, then the effects volume. */
export function NotificationSettings({ engine }: { engine: Controller }) {
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
  const save = () => {
    engine.savePreferences();
    engine.bump();
  };
  return (
    <>
      <fieldset className="settings-group">
        <legend>Avisos</legend>
        <table className="notification-table">
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Balão</th>
              <th scope="col">Som</th>
            </tr>
          </thead>
          <tbody>
            {notificationRows.map(({ label, hint, balloon, cues }) => {
              const on = cues.some((cue) => engine.soundEvents[cue]);
              return (
                <tr key={label}>
                  <th scope="row">
                    {label}
                    {hint && <small>{hint}</small>}
                  </th>
                  <td>
                    {balloon ? (
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={`Balão: ${label}`}
                        checked={engine.balloons[balloon]}
                        onChange={(e) => {
                          engine.balloons[balloon] = e.target.checked;
                          save();
                        }}
                      />
                    ) : (
                      <span
                        className="notification-none"
                        aria-label="Sem balão"
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    {cues.length ? (
                      <span className="notification-sound">
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={`Som: ${label}`}
                          checked={on}
                          disabled={!engine.sounds}
                          onChange={(e) => {
                            for (const cue of cues)
                              engine.soundEvents[cue] = e.target.checked;
                            save();
                          }}
                        />
                        <button
                          type="button"
                          className="icon-button sound-preview"
                          aria-label={`Ouvir som: ${label}`}
                          title={`Ouvir som: ${label}`}
                          disabled={!canPreview || playing !== null}
                          onClick={() => void preview(cues[0])}
                        >
                          <Play size={15} />
                        </button>
                      </span>
                    ) : (
                      <span className="notification-none" aria-label="Sem som">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="field-note">
          Tudo vai para o sino, mesmo com o balão desligado.
        </p>
        <p className="sound-feedback" role="status">
          {feedback}
        </p>
      </fieldset>
      <fieldset className="settings-group">
        <legend>Sons do VIO</legend>
        <label className="toggle">
          <span>
            Sons do VIO
            <small>Sons curtos de ações e avisos da sala.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={engine.sounds}
            onChange={(e) => {
              engine.sounds = e.target.checked;
              save();
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
              save();
            }}
          />
        </label>
      </fieldset>
    </>
  );
}

/** Ajustes › Aparência, under Minha cor. */
export function ParticipantColors({ engine }: { engine: Controller }) {
  return (
    <fieldset className="settings-group">
      <legend>Cores das pessoas</legend>
      <label className="toggle">
        <span>
          Cores das pessoas nas transmissões
          <small>Bordas, ao vivo e fala na cor de cada pessoa.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={engine.participantColors}
          onChange={(e) => {
            engine.participantColors = e.target.checked;
            engine.savePreferences();
            engine.bump();
          }}
        />
      </label>
    </fieldset>
  );
}
