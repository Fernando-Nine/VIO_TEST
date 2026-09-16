import { useEffect, useState } from "react";
import type { Controller } from "../room/controller";
import { presets, type Quality } from "../../shared/protocol";
export function Settings({ engine }: { engine: Controller }) {
  const [tab, setTab] = useState<"video" | "audio">("video");
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingOutput, setSavingOutput] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [quality, setQuality] = useState<Quality>(engine.captures.quality);
  const capture = engine.captures;
  useEffect(() => {
    const update = () =>
      void navigator.mediaDevices
        ?.enumerateDevices()
        .then(setDevices)
        .catch((e) => engine.fail(e));
    update();
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", update);
  }, [engine, capture.sources.has("voice"), capture.sources.has("camera")]);
  useEffect(() => {
    const timer = setTimeout(
      () => void engine.quality(quality).catch((e) => engine.fail(e)),
      350,
    );
    return () => clearTimeout(timer);
  }, [quality, engine]);
  const effective = capture.voiceEffective();
  const screen = capture.sources
    .get("screen")
    ?.stream.getVideoTracks()[0]
    ?.getSettings();
  const supports = navigator.mediaDevices?.getSupportedConstraints() || {};
  const sending = engine.peers
    .infos()
    .filter((p) => p.sending && p.kind === "screen");
  const deviceOptions = (kind: MediaDeviceKind) =>
    devices
      .filter((d) => d.kind === kind)
      .map((d, i) => (
        <option key={d.deviceId || i} value={d.deviceId}>
          {d.label || `Dispositivo ${i + 1}`}
        </option>
      ));
  const chooseOutput = async (id: string) => {
    setSavingOutput(true);
    try {
      await engine.output.select(id);
      engine.savePreferences();
    } catch {
      engine.fail(
        new Error(
          "Não foi possível selecionar essa saída de áudio. Confira a permissão do navegador ou escolha outra saída.",
        ),
      );
    } finally {
      setSavingOutput(false);
    }
  };
  const outputDevices = navigator.mediaDevices as MediaDevices & {
    selectAudioOutput?: () => Promise<MediaDeviceInfo>;
  };
  return (
    <>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Categorias dos ajustes"
      >
        {(["video", "audio"] as const).map((value, index) => (
          <button
            key={value}
            id={`settings-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`settings-panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            onClick={(e) => {
              setTab(value);
              e.currentTarget.closest(".sheet-body")?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index;
              setTab(next === 0 ? "video" : "audio");
              e.currentTarget.closest(".sheet-body")?.scrollTo({ top: 0 });
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            {value === "video" ? "Vídeo" : "Áudio"}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        className="settings-panel"
        id="settings-panel-video"
        aria-labelledby="settings-tab-video"
        hidden={tab !== "video"}
      >
        <fieldset>
          <legend>Prévias das telas</legend>
          <label className="toggle">
            <span>
              Prévias ao vivo
              <small>
                Desligadas por padrão. Quando desligadas, mostramos a inicial de
                cada pessoa.
              </small>
            </span>
            <input
              type="checkbox"
              checked={engine.previewsEnabled}
              onChange={(e) => engine.setPreviews(e.target.checked)}
            />
          </label>
          <p className="field-note">
            Ao ligar, até duas miniaturas visíveis recebem vídeo reduzido. Isso
            usa banda adicional de quem compartilha. A tela principal continua
            funcionando com a opção desligada.
          </p>
        </fieldset>
        <fieldset>
          <legend>Compartilhamento de tela</legend>
          <p className="field-note">
            Os ajustes são aplicados durante a transmissão. O resultado depende
            da captura e do navegador.
          </p>
          <div className="segmented">
            {Object.entries(presets).map(([name, q]) => (
              <button
                key={name}
                className={
                  JSON.stringify(q) === JSON.stringify(quality) ? "active" : ""
                }
                onClick={() => setQuality({ ...q })}
              >
                {name}
              </button>
            ))}
          </div>
          <label>
            Quadros por segundo <output>{quality.fps} FPS</output>
            <input
              aria-label="Quadros por segundo"
              type="range"
              min="5"
              max="60"
              step="1"
              value={quality.fps}
              onChange={(e) => setQuality({ ...quality, fps: +e.target.value })}
            />
          </label>
          <label>
            Limite de envio por espectador{" "}
            <output>{quality.bitrate} kbps</output>
            <input
              aria-label="Bitrate da tela"
              type="range"
              min="250"
              max="8000"
              step="50"
              value={quality.bitrate}
              onChange={(e) =>
                setQuality({ ...quality, bitrate: +e.target.value })
              }
            />
          </label>
          <label>
            Redução da resolução <output>÷ {quality.scale}</output>
            <input
              aria-label="Escala da resolução"
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={quality.scale}
              onChange={(e) =>
                setQuality({ ...quality, scale: +e.target.value })
              }
            />
          </label>
          <div className="technical">
            Captura efetiva:{" "}
            {screen
              ? `${screen.width} × ${screen.height} · ${Math.round(screen.frameRate || 0)} FPS`
              : "nenhuma tela ativa"}
            {sending.map((p) => (
              <p key={p.id}>
                {p.tier === "preview" ? "Miniatura" : "Vídeo principal"}:{" "}
                {p.width || "—"} × {p.height || "—"} · {p.fps ?? "—"} FPS ·{" "}
                {p.bitrate ?? "—"} kbps
              </p>
            ))}
          </div>
          {capture.qualityMessage && (
            <p className="field-note">{capture.qualityMessage}</p>
          )}
        </fieldset>
        <fieldset>
          <legend>Câmera</legend>
          <label>
            Dispositivo
            <select
              value={capture.cameraDevice}
              onChange={(e) => {
                const id = e.target.value;
                if (capture.sources.has("camera"))
                  void capture
                    .startCamera(id)
                    .then(() => engine.savePreferences())
                    .catch((e) => engine.fail(e));
                else {
                  capture.cameraDevice = id;
                  engine.savePreferences();
                }
              }}
            >
              <option value="">Padrão do sistema</option>
              {deviceOptions("videoinput")}
            </select>
          </label>
          {supports.facingMode && capture.sources.has("camera") && (
            <button
              className="secondary"
              onClick={() =>
                void capture
                  .startCamera(
                    "",
                    capture.facing === "user" ? "environment" : "user",
                  )
                  .then(() => engine.bump())
                  .catch((e) => engine.fail(e))
              }
            >
              Alternar frontal / traseira
            </button>
          )}
          <p className="field-note">
            A prévia local é espelhada. O vídeo enviado preserva a orientação da
            câmera.
          </p>
        </fieldset>
      </div>
      <div
        role="tabpanel"
        className="settings-panel"
        id="settings-panel-audio"
        aria-labelledby="settings-tab-audio"
        hidden={tab !== "audio"}
      >
        {engine.output.supported && (
          <fieldset>
            <legend>Saída de áudio</legend>
            <p className="field-note">
              Onde você ouve a conversa e o som das telas.
            </p>
            <label>
              Reproduzir em
              <select
                value={engine.output.deviceId}
                disabled={savingOutput}
                onChange={(e) => void chooseOutput(e.target.value)}
              >
                <option value="">Padrão do sistema</option>
                {deviceOptions("audiooutput")}
              </select>
            </label>
            {typeof outputDevices?.selectAudioOutput === "function" ? (
              <button
                className="text-button"
                disabled={savingOutput}
                onClick={() => {
                  void outputDevices.selectAudioOutput!()
                    .then(async (device) => {
                      setDevices(
                        await navigator.mediaDevices.enumerateDevices(),
                      );
                      await chooseOutput(device.deviceId);
                    })
                    .catch((error) => {
                      if (error?.name !== "NotAllowedError") engine.fail(error);
                    });
                }}
              >
                Escolher outra saída no navegador
              </button>
            ) : (
              <p className="field-note">
                Se só aparece a saída padrão, conecte o microfone para autorizar
                a lista de dispositivos ou use a saída escolhida no sistema.
              </p>
            )}
          </fieldset>
        )}
        <fieldset>
          <legend>Microfone</legend>
          <label>
            Microfone
            <select
              value={capture.micDevice}
              onChange={(e) =>
                void capture
                  .changeMicrophone(e.target.value)
                  .then(() => engine.savePreferences())
                  .catch((e) => engine.fail(e))
              }
            >
              <option value="">Padrão do sistema</option>
              {deviceOptions("audioinput")}
            </select>
          </label>
          <label>
            Limiar de abertura <output>{capture.threshold} dB</output>
            <input
              aria-label="Sensibilidade do microfone"
              type="range"
              min="-65"
              max="-20"
              value={capture.threshold}
              onChange={(e) => {
                capture.threshold = +e.target.value;
                engine.savePreferences();
              }}
            />
          </label>
          <p className="field-note">
            Mais à esquerda: capta vozes mais baixas. O microfone fecha abaixo
            deste nível para reduzir ruído de fundo.
          </p>
          {(
            ["echoCancellation", "noiseSuppression", "autoGainControl"] as const
          ).map((key, i) => (
            <label className="toggle" key={key}>
              <span>
                {
                  [
                    "Cancelar eco",
                    "Reduzir ruído",
                    "Ajustar ganho automaticamente",
                  ][i]
                }
                <small>
                  {supports[key]
                    ? `Efetivo: ${effective?.[key] === undefined ? "aguardando captura" : effective[key] ? "ligado" : "desligado"}`
                    : "Não informado por este navegador"}
                </small>
              </span>
              <input
                type="checkbox"
                disabled={!supports[key] || savingVoice}
                checked={capture.voiceSettings[key]}
                onChange={(e) => {
                  setSavingVoice(true);
                  void capture
                    .setVoiceSettings({
                      ...capture.voiceSettings,
                      [key]: e.target.checked,
                    })
                    .then(() => engine.savePreferences())
                    .catch((error) => engine.fail(error))
                    .finally(() => setSavingVoice(false));
                }}
              />
            </label>
          ))}
          {!capture.voiceSettings.autoGainControl && (
            <div className="manual-gain">
              <label>
                Ganho do microfone{" "}
                <output>{Math.round(capture.manualGain * 100)}%</output>
                <input
                  aria-label="Ganho manual do microfone"
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={Math.round(capture.manualGain * 100)}
                  onChange={(e) => {
                    capture.setManualGain(+e.target.value / 100);
                    engine.savePreferences();
                  }}
                />
              </label>
              <p className="field-note">
                Volume enviado da sua voz. 100% mantém o nível original. A
                sensibilidade acima define quando o microfone abre; ela não
                aumenta o volume.
              </p>
            </div>
          )}
          {capture.sources.has("voice") && (
            <button
              className="text-button"
              onClick={() => void engine.stop("voice")}
            >
              Desconectar microfone e liberar dispositivo
            </button>
          )}
        </fieldset>
        <fieldset>
          <legend>Preferências</legend>
          <label className="toggle">
            <span>
              Sons dos controles
              <small>Compartilhar, parar, mutar, desmutar e ensurdecer.</small>
            </span>
            <input
              type="checkbox"
              checked={engine.sounds}
              onChange={(e) => {
                engine.sounds = e.target.checked;
                engine.savePreferences();
              }}
            />
          </label>
          <label className="toggle">
            <span>
              Silenciar toda reprodução
              <small>Mantém seu envio de voz como está.</small>
            </span>
            <input
              type="checkbox"
              checked={engine.remoteMute}
              onChange={(e) => {
                engine.remoteMute = e.target.checked;
                engine.bump();
              }}
            />
          </label>
        </fieldset>
      </div>
    </>
  );
}
