import { useEffect, useState } from "react";
import { AppWindow, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  nativeInvoke,
  type DesktopCapabilities,
  type DesktopSource,
} from "./bridge";
import { selectProcess } from "./capture";
import type { Controller } from "../room/controller";

export function NativeShare({
  engine,
  close,
}: {
  engine: Controller;
  close: () => void;
}) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [chosen, setChosen] = useState("");
  const [audio, setAudio] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(false);
  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    setChosen("");
    try {
      const caps = await nativeInvoke<DesktopCapabilities>(
        "desktop_capabilities",
      );
      if (signal?.aborted) return;
      setAvailable(caps.protocol === 1 && caps.processAudio);
      if (!caps.processAudio || caps.protocol !== 1)
        throw new Error(
          "O áudio por aplicativo precisa do Windows 11 e de uma versão compatível do VIO.",
        );
      const list = await nativeInvoke<DesktopSource[]>("desktop_sources");
      if (!signal?.aborted) setSources(list);
    } catch (e) {
      if (!signal?.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível listar os aplicativos.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    void load(abort.signal);
    return () => abort.abort();
  }, []);
  const selected = sources.find((source) => source.id === chosen);
  return (
    <div className="native-share">
      <div className="share-intro">
        <AppWindow size={32} />
        <p>
          Escolha o áudio aqui. A imagem será escolhida em seguida, no seletor
          do Windows.
        </p>
      </div>
      <label className="toggle">
        <span>
          Áudio de um aplicativo
          <small>WASAPI · o microfone continua separado.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={audio}
          onChange={(e) => setAudio(e.target.checked)}
        />
      </label>
      {audio && (
        <>
          <div className="native-source-heading">
            <span id="native-source-label">Aplicativo que você quer ouvir</span>
            <button
              className="icon-button"
              aria-label="Atualizar aplicativos"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          {error && (
            <p role="alert" className="field-note">
              {error}
            </p>
          )}
          <fieldset
            className="native-source-list"
            aria-labelledby="native-source-label"
            aria-busy={loading}
          >
            {loading ? (
              <p>Buscando janelas abertas…</p>
            ) : (
              sources.map((source) => (
                <label className="native-source" key={source.id}>
                  <input
                    type="radio"
                    name="native-audio-source"
                    value={source.id}
                    checked={chosen === source.id}
                    onChange={() => setChosen(source.id)}
                  />
                  <AppWindow size={19} aria-hidden="true" />
                  <span>{source.title}</span>
                </label>
              ))
            )}
            {!loading && !sources.length && !error && (
              <p>
                Abra o aplicativo que deseja compartilhar e atualize a lista.
              </p>
            )}
          </fieldset>
          <p className="field-note">
            Em navegadores, o áudio inclui todas as abas. Para uma aba só, use o
            VIO na web.
          </p>
        </>
      )}
      <button
        className="primary full-width"
        disabled={audio && (loading || !available || !selected)}
        onClick={() => {
          selectProcess(audio ? selected : undefined);
          void engine.startScreen(audio);
          close();
        }}
      >
        Escolher imagem <ArrowUpRight size={18} />
      </button>
    </div>
  );
}
