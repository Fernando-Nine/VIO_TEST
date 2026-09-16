import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Copy,
  Headphones,
  HeadphoneOff,
  Info,
  LogOut,
  Maximize,
  Mic,
  MicOff,
  Monitor,
  MonitorUp,
  Pause,
  Radio,
  Settings2,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";
import { Controller } from "./room/controller";
import { Media, RemoteVoice, useSpeaking } from "./components/Media";
import { Dialog } from "./components/Dialog";
import { Settings } from "./components/Settings";
import { releases, version } from "../shared/releases";
import type { Participant, Publication } from "../shared/protocol";
type Panel = "settings" | "people" | "about" | "share" | "history" | null;
function Brand() {
  return (
    <span className="brand" aria-label="VIO">
      vio
      <span className="brand-dot" />
    </span>
  );
}
function Person({
  person,
  engine,
}: {
  person: Participant;
  engine: Controller;
}) {
  const own = person.id === engine.view.id;
  const voice = person.publications.find((p) => p.kind === "voice");
  const camera = person.publications.find((p) => p.kind === "camera");
  const screen = person.publications.some((p) => p.kind === "screen");
  const stream = voice
    ? own
      ? engine.captures.sources.get("voice")?.stream
      : engine.peers.stream(voice.id)
    : undefined;
  const level = useCallback(() => engine.captures.voiceLevel, [engine]);
  const speaking = useSpeaking(
    stream,
    !!voice?.muted || !voice,
    own ? level : undefined,
  );
  const cameraStream = camera
    ? own
      ? engine.captures.sources.get("camera")?.stream
      : engine.peers.stream(camera.id)
    : undefined;
  return (
    <div
      className={`person ${speaking ? "speaking" : ""} ${!person.online ? "offline" : ""}`}
      aria-label={`${person.name}${speaking ? ", falando" : ""}`}
    >
      <div className="person-image">
        {cameraStream ? (
          <Media
            stream={cameraStream}
            className={own ? "mirrored" : ""}
            label={`Câmera de ${person.name}`}
          />
        ) : (
          <span className="initial">
            {person.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className={`voice-badge ${!voice || voice.muted ? "muted" : ""}`}>
          {!voice || voice.muted ? (
            <MicOff size={12} />
          ) : (
            <AudioLines size={12} />
          )}
        </span>
      </div>
      <div className="person-caption">
        <span>
          {person.name}
          {own && <small> você</small>}
        </span>
        {screen && <Monitor size={13} className="live-text" />}
      </div>
      {!person.online && <small>Reconectando</small>}
    </div>
  );
}
function Preview({
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
  const ref = useRef<HTMLButtonElement>(null);
  const own = publication.owner === engine.view.id;
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        onVisible(publication.id, entries[0].isIntersecting && visible);
      },
      { threshold: 0.4 },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      onVisible(publication.id, false);
    };
  }, [publication.id, visible, onVisible]);
  const selected = engine.view.selected === publication.id;
  const stream = own
    ? engine.captures.sources.get("screen")?.stream
    : engine.peers.stream(publication.id, selected ? "main" : "preview");
  return (
    <button
      ref={ref}
      className={`preview ${selected ? "selected" : ""}`}
      onClick={() => engine.select(publication.id)}
      aria-pressed={selected}
      aria-label={`Assistir tela de ${name}`}
    >
      <div className="preview-image">
        {stream ? (
          <Media stream={stream} label={`Miniatura de ${name}`} />
        ) : (
          <Monitor size={22} />
        )}
        <span className="preview-live">AO VIVO</span>
      </div>
      <span>
        {name}
        {own ? " (você)" : ""}
      </span>
      {selected && <Check size={14} />}
    </button>
  );
}
export default function App({ engine }: { engine: Controller }) {
  const view = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    new URLSearchParams(location.search).get("sala") || "",
  );
  const [audio, setAudio] = useState(true);
  const [hidePreview, setHidePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(true);
  const [screenMuted, setScreenMuted] = useState(false);
  const [full, setFull] = useState(false);
  const player = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visibleIds = useRef(new Set<string>());
  const wake = useCallback(() => {
    setActive(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        !document.querySelector("dialog[open]") &&
        !document.activeElement?.matches(":focus-visible")
      )
        setActive(false);
    }, 4500);
  }, []);
  useEffect(() => {
    wake();
    return () => clearTimeout(timer.current);
  }, [wake]);
  useEffect(() => {
    const change = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    void engine
      .initialize()
      .then(() => engine.bump())
      .catch((e) => engine.fail(e));
    const unload = () => {
      engine.captures.stopAll();
      engine.socket?.disconnect();
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [engine]);
  const previewVisible = useCallback(
    (id: string, visible: boolean) => {
      if (visible) visibleIds.current.add(id);
      else visibleIds.current.delete(id);
      engine.previews([...visibleIds.current]);
    },
    [engine],
  );
  const people = view.snapshot?.participants || [];
  const all = people.flatMap((m) => m.publications);
  const screens = all.filter((p) => p.kind === "screen");
  const selected = all.find((p) => p.id === view.selected);
  const selectedOwner = people.find((p) => p.id === selected?.owner);
  const ownScreen = selected?.owner === view.id;
  const source = ownScreen
    ? engine.captures.sources.get("screen")?.stream
    : engine.peers.stream(view.selected);
  const muted =
    ownScreen || screenMuted || engine.remoteMute || engine.captures.deaf;
  const hasScreen = engine.captures.sources.has("screen");
  const hasVoice = engine.captures.sources.has("voice");
  const hasCamera = engine.captures.sources.has("camera");
  const micMuted =
    !hasVoice || engine.captures.micMuted || engine.captures.deaf;
  const canShare = !!navigator.mediaDevices?.getDisplayMedia;
  const canMedia = !!navigator.mediaDevices?.getUserMedia;
  const mediaStats = engine.peers
    .infos()
    .find(
      (p) =>
        !p.sending && p.publicationId === view.selected && p.tier === "main",
    );
  const allStats = engine.peers.infos();
  const canFullscreen =
    !!document.fullscreenEnabled ||
    !!(
      video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
    )?.webkitEnterFullscreen;
  const open = (p: Panel) => {
    setPanel(p);
    wake();
  };
  async function copy(link = true) {
    try {
      const url = new URL(location.href);
      url.searchParams.set("sala", view.snapshot!.code);
      await navigator.clipboard.writeText(
        link ? url.href : view.snapshot!.code,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      open("about");
      engine.view.notice = "Selecione e copie o código exibido no painel.";
      engine.bump();
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player.current?.requestFullscreen && document.fullscreenEnabled)
        await player.current.requestFullscreen();
      else {
        const el = video.current as HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        };
        if (el?.webkitEnterFullscreen) el.webkitEnterFullscreen();
        else throw new Error("Tela cheia indisponível neste navegador.");
      }
    } catch (e) {
      engine.fail(e);
    }
  }
  const connectionText = {
    idle: "Fora da sala",
    connecting: "Conectando",
    connected: "Sala conectada",
    reconnecting: "Reconectando",
    failed: "Conexão interrompida",
  }[view.status];
  return (
    <div
      className={`app ${view.snapshot ? "in-room" : ""} ${!active && !panel && source ? "idle" : ""}`}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
      onFocus={wake}
    >
      <header className="app-header">
        <div className="header-left">
          <Brand />
          {view.snapshot && (
            <>
              <span className="header-divider" />
              <button
                className="room-code"
                title="Copiar código da sala"
                onClick={() => void copy(false)}
              >
                {view.snapshot.code}
                <Copy size={14} />
              </button>
            </>
          )}
        </div>
        {view.snapshot ? (
          <div className="header-actions">
            <button
              className={`connection ${view.status}`}
              onClick={() => open("about")}
              title={`Sinalização: ${view.signalingPing ?? "—"} ms · Mídia: ${mediaStats?.rtt ?? "—"} ms`}
            >
              <span className="connection-dot" />
              {connectionText}
              <span className="technical">
                {mediaStats?.rtt !== undefined
                  ? `${mediaStats.rtt} ms mídia`
                  : "— ms mídia"}
              </span>
            </button>
            <button className="secondary invite" onClick={() => void copy()}>
              {copied ? <Check size={16} /> : <LinkIcon size={16} />}
              <span>{copied ? "Copiado" : "Convidar"}</span>
            </button>
          </div>
        ) : (
          <div className="header-actions">
            <span className="small-note">De perto, mesmo de longe.</span>
            <button
              className="icon-button"
              aria-label="Como funciona o VIO"
              onClick={() => open("about")}
            >
              <Info size={20} />
            </button>
          </div>
        )}
      </header>
      {(view.error || view.notice) && (
        <div
          className={`notice ${view.error ? "error" : ""}`}
          role={view.error ? "alert" : "status"}
        >
          <span>{view.error || view.notice}</span>
          {view.status === "failed" && (
            <button onClick={() => void engine.retry()}>Reconectar</button>
          )}
          <button
            className="icon-button"
            aria-label="Dispensar aviso"
            onClick={() => engine.dismiss()}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {!view.snapshot ? (
        <main className="entrance">
          <section className="entrance-copy">
            <div className="eyebrow">
              <span className="short-rule" /> SUA PRÓXIMA SESSÃO COMEÇA AQUI
            </div>
            <h1>
              Bom mesmo
              <br />é assistir <em>junto.</em>
            </h1>
            <p>
              Uma tela para compartilhar.
              <br />
              Voz e câmera para estar por perto.
            </p>
            <div className="entrance-signature" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="entrance-bottom">
              <span>
                <Monitor size={16} /> Tela
              </span>
              <span>
                <Mic size={16} /> Voz
              </span>
              <span>
                <Camera size={16} /> Câmera
              </span>
            </div>
          </section>
          <section className="join-card">
            <div className="card-top">
              <span className="eyebrow">SUA SALA NO VIO</span>
              <span className="join-symbol">
                <ArrowUpRight size={24} />
              </span>
            </div>
            <h2>Chega mais.</h2>
            <p>Escolha um nome e encontre sua turma.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void engine.enter(name, code);
              }}
            >
              <label htmlFor="your-name">Como podemos chamar você?</label>
              <input
                id="your-name"
                autoComplete="nickname"
                placeholder="Seu nome"
                maxLength={32}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="room-code">
                Código da sala <span>opcional</span>
              </label>
              <input
                id="room-code"
                className="mono"
                placeholder="COLE O CÓDIGO AQUI"
                pattern="[a-zA-Z0-9]{4,24}"
                maxLength={24}
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
              />
              <small>Sem código? Criamos uma sala nova para você.</small>
              <button
                className="primary join-button"
                disabled={
                  view.status === "connecting" || view.status === "reconnecting"
                }
                type="submit"
              >
                {view.status === "connecting" || view.status === "reconnecting"
                  ? "Abrindo sua sala…"
                  : code
                    ? "Entrar na sala"
                    : "Criar minha sala"}
                <ArrowRight size={19} />
              </button>
            </form>
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <span>Sem conta. Câmera e microfone começam desligados.</span>
            </div>
          </section>
        </main>
      ) : (
        <main className="room">
          <div className="room-heading">
            <div>
              <span className="eyebrow">SALA COMPARTILHADA</span>
              <h1>
                {source
                  ? "Todo mundo na mesma cena."
                  : "Sua companhia está aqui."}
              </h1>
            </div>
            <button className="text-button" onClick={() => open("people")}>
              <Users size={17} />
              {people.length} de {view.snapshot.maxParticipants}
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="player-layout">
            <div className="player" ref={player}>
              <div className="player-top">
                <span className={source ? "live-label" : "player-label"}>
                  {source ? <Radio size={14} /> : <Monitor size={15} />}{" "}
                  {source
                    ? `TELA DE ${selectedOwner?.name?.toUpperCase() || "PARTICIPANTE"}`
                    : "ESPAÇO PARA ASSISTIR"}
                </span>
                {source && (
                  <span className="technical">
                    {mediaStats?.height ? `${mediaStats.height}p` : "WebRTC"}
                    {mediaStats?.fps ? ` / ${mediaStats.fps} FPS` : ""}
                  </span>
                )}
              </div>
              {source && !(ownScreen && hidePreview) ? (
                <Media
                  stream={source}
                  label="Transmissão principal"
                  className="main-video"
                  videoRef={video}
                  muted={muted}
                  volume={engine.screenVolume}
                />
              ) : (
                <div className="player-empty">
                  <div className="empty-icon">
                    {ownScreen && hidePreview ? (
                      <EyeOff size={30} />
                    ) : (
                      <MonitorUp size={32} />
                    )}
                  </div>
                  <span className="eyebrow">
                    {ownScreen && hidePreview
                      ? "PRÉVIA OCULTA"
                      : "SEM PRESSA PARA DAR PLAY"}
                  </span>
                  <h2>
                    {ownScreen && hidePreview
                      ? "Você continua transmitindo."
                      : selected
                        ? "Conectando à transmissão…"
                        : "O que vamos assistir?"}
                  </h2>
                  <p>
                    {ownScreen && hidePreview
                      ? "As outras pessoas continuam recebendo sua tela."
                      : selected
                        ? "Aguardando a mídia. Veja o estado da conexão em Sobre a sala."
                        : "Compartilhe uma aba, uma janela ou sua tela inteira."}
                  </p>
                  {!hasScreen && canShare && (
                    <button className="secondary" onClick={() => open("share")}>
                      <MonitorUp size={17} /> Compartilhar tela
                    </button>
                  )}
                  {!canShare && !source && (
                    <p className="field-note">
                      {!window.isSecureContext
                        ? "Abra o VIO em HTTPS ou localhost para liberar as opções de captura."
                        : "Este navegador pode assistir. A captura de tela não está disponível aqui."}
                    </p>
                  )}
                </div>
              )}
              {selected && !ownScreen && mediaStats?.state !== "connected" && (
                <div className="media-connection" role="status">
                  <strong>
                    {mediaStats?.error
                      ? "A mídia ainda não conectou"
                      : "Conectando à transmissão…"}
                  </strong>
                  <p>
                    {mediaStats?.error ||
                      "A sala está aberta. Aguardando uma rota para receber esta tela."}
                  </p>
                  <button className="secondary" onClick={() => open("about")}>
                    Ver conexão
                  </button>
                </div>
              )}
              {source && (
                <div className="player-controls">
                  <div className="volume-control">
                    <button
                      className="icon-button"
                      disabled={ownScreen}
                      aria-label={
                        muted
                          ? "Ativar áudio da transmissão"
                          : "Silenciar transmissão"
                      }
                      onClick={() => setScreenMuted(!screenMuted)}
                    >
                      {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </button>
                    <input
                      aria-label="Volume da transmissão"
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={engine.screenVolume}
                      disabled={ownScreen}
                      onChange={(e) => {
                        engine.screenVolume = +e.target.value;
                        engine.bump();
                      }}
                    />
                    <span>
                      {ownScreen
                        ? "Prévia sem áudio"
                        : `${Math.round(engine.screenVolume * 100)}%`}
                    </span>
                  </div>
                  <div className="player-actions">
                    {ownScreen && (
                      <button
                        className="icon-button"
                        aria-label={
                          hidePreview
                            ? "Mostrar prévia local"
                            : "Ocultar prévia local"
                        }
                        onClick={() => setHidePreview(!hidePreview)}
                      >
                        {hidePreview ? <Eye size={19} /> : <EyeOff size={19} />}
                      </button>
                    )}
                    {canFullscreen && (
                      <button
                        className="icon-button"
                        aria-label={full ? "Sair da tela cheia" : "Tela cheia"}
                        onClick={() => void fullscreen()}
                      >
                        <Maximize size={19} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {screens.length > 1 && (
              <div
                className="stream-rail"
                aria-label="Transmissões disponíveis"
              >
                {screens.map((p) => (
                  <Preview
                    key={p.id}
                    publication={p}
                    name={
                      people.find((m) => m.id === p.owner)?.name ||
                      "Participante"
                    }
                    engine={engine}
                    visible={active && !panel}
                    onVisible={previewVisible}
                  />
                ))}
              </div>
            )}
          </div>
          <section className="people-strip" aria-label="Pessoas na sala">
            {people.map((person) => (
              <Person key={person.id} person={person} engine={engine} />
            ))}
            {people.length < view.snapshot.maxParticipants && (
              <button className="invite-seat" onClick={() => void copy()}>
                <span>
                  <Users size={22} />
                </span>
                <small>Tem lugar aqui</small>
              </button>
            )}
          </section>
          <footer className="dock">
            <div className="dock-group">
              <button
                className={`dock-button ${micMuted ? "muted" : ""}`}
                aria-pressed={!micMuted}
                aria-label={
                  hasVoice
                    ? engine.captures.micMuted
                      ? "Ativar microfone"
                      : "Silenciar microfone"
                    : "Conectar microfone"
                }
                disabled={!canMedia && !hasVoice}
                onClick={() => void engine.microphone()}
              >
                {micMuted ? <MicOff /> : <Mic />}
                <span>Microfone</span>
              </button>
              <button
                className={`dock-button ${engine.captures.deaf ? "muted" : ""}`}
                aria-pressed={engine.captures.deaf}
                aria-label={
                  engine.captures.deaf ? "Desativar ensurdecer" : "Ensurdecer"
                }
                onClick={() => engine.deafen()}
              >
                {engine.captures.deaf ? <HeadphoneOff /> : <Headphones />}
                <span>Áudio</span>
              </button>
              <button
                className={`dock-button ${hasCamera ? "enabled" : ""}`}
                aria-label={hasCamera ? "Desligar câmera" : "Ligar câmera"}
                aria-pressed={hasCamera}
                disabled={!canMedia && !hasCamera}
                onClick={() => void engine.camera()}
              >
                {hasCamera ? <Camera /> : <CameraOff />}
                <span>Câmera</span>
              </button>
            </div>
            <span className="dock-divider" />
            <button
              className={`share-button ${hasScreen ? "sharing" : ""}`}
              aria-label={hasScreen ? "Parar tela" : "Compartilhar"}
              disabled={!canShare && !hasScreen}
              onClick={() =>
                hasScreen ? void engine.stop("screen") : open("share")
              }
            >
              {hasScreen ? <Pause size={19} /> : <MonitorUp size={19} />}
              <span>{hasScreen ? "Parar tela" : "Compartilhar"}</span>
            </button>
            <span className="dock-divider" />
            <div className="dock-group">
              <button
                className="dock-button"
                aria-label="Ajustes"
                onClick={() => open("settings")}
              >
                <Settings2 />
                <span>Ajustes</span>
              </button>
              <button
                className="dock-button leave"
                aria-label="Sair da sala"
                onClick={() => void engine.leave()}
              >
                <LogOut />
                <span>Sair</span>
              </button>
            </div>
          </footer>
          {engine.captures.voiceBlocked() && (
            <button
              className="audio-unlock"
              onClick={() =>
                void engine.captures.resumeVoice().catch((e) => engine.fail(e))
              }
            >
              <Mic size={16} /> Ativar processamento do microfone
            </button>
          )}
          {all
            .filter((p) => p.kind === "voice" && p.owner !== view.id)
            .map((p) => (
              <RemoteVoice
                key={p.id}
                stream={engine.peers.stream(p.id)}
                muted={engine.captures.deaf || engine.remoteMute}
                volume={engine.volumes.get(p.owner) ?? 1}
                label={
                  people.find((m) => m.id === p.owner)?.name || "Participante"
                }
              />
            ))}
        </main>
      )}
      <footer className="app-footer">
        <span>
          by <strong>NerdQuest Studios</strong> · fundado por Nine
        </span>
        <button onClick={() => open("history")} className="version">
          v{version}
          <ArrowUpRight size={12} />
        </button>
      </footer>
      {panel && (
        <Dialog
          title={
            {
              settings: "Ajustes",
              people: "Quem está por aqui",
              about: "Sobre a sala",
              share: "Compartilhar sua tela",
              history: "O VIO está crescendo",
            }[panel]
          }
          close={() => open(null)}
        >
          {panel === "settings" && <Settings engine={engine} />}
          {panel === "share" && (
            <>
              <div className="share-intro">
                <MonitorUp size={32} />
                <p>Você escolhe o que compartilhar no seletor do navegador.</p>
              </div>
              <label className="toggle">
                <span>
                  Incluir áudio da tela
                  <small>
                    A trilha de áudio depende da fonte e do navegador.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={(e) => setAudio(e.target.checked)}
                />
              </label>
              <p className="field-note">
                Para assistir com som, procure a opção de compartilhar áudio ao
                escolher a fonte. O som do sistema pode incluir a conversa da
                sala.
              </p>
              <button
                className="primary full-width"
                onClick={() => {
                  void engine.startScreen(audio);
                  open(null);
                }}
              >
                Escolher tela <ArrowUpRight size={18} />
              </button>
            </>
          )}
          {panel === "people" && (
            <>
              {people.map((m) => (
                <div className="participant-setting" key={m.id}>
                  <div>
                    <span className="small-avatar">
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <strong>{m.name}</strong>
                    {m.id === view.id && <small>você</small>}
                    <small>{m.online ? "Na sala" : "Reconectando"}</small>
                  </div>
                  {m.id !== view.id && (
                    <label>
                      Volume da voz{" "}
                      <output>
                        {Math.round((engine.volumes.get(m.id) ?? 1) * 100)}%
                      </output>
                      <input
                        aria-label={`Volume de ${m.name}`}
                        type="range"
                        min="0"
                        max="1"
                        step=".05"
                        value={engine.volumes.get(m.id) ?? 1}
                        onChange={(e) => {
                          engine.volumes.set(m.id, +e.target.value);
                          engine.bump();
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
              <button
                className="secondary full-width"
                onClick={() => void copy()}
              >
                <Copy size={16} /> Copiar convite
              </button>
            </>
          )}
          {panel === "about" && (
            <>
              {view.snapshot ? (
                <>
                  <p>
                    Esta sala não tem anfitrião. Qualquer pessoa pode
                    compartilhar, conversar e escolher a tela que quer assistir.
                  </p>
                  <label>
                    Código da sala
                    <input
                      className="mono"
                      readOnly
                      value={view.snapshot.code}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <div className="diagnostics">
                    <h3>Conexão</h3>
                    <p>
                      Sinalização:{" "}
                      <strong>{view.signalingPing ?? "—"} ms</strong>
                    </p>
                    {allStats.length === 0 && (
                      <p>A mídia ainda não tem uma conexão para medir.</p>
                    )}
                    {allStats.map((p) => (
                      <div className="diagnostic" key={p.id}>
                        <strong>
                          {p.kind === "screen"
                            ? "Tela"
                            : p.kind === "camera"
                              ? "Câmera"
                              : "Voz"}{" "}
                          · {p.sending ? "envio" : "recepção"} ·{" "}
                          {p.tier === "preview" ? "miniatura" : "principal"}
                        </strong>
                        <span>
                          {p.state} · RTT {p.rtt ?? "—"} ms ·{" "}
                          {p.relay === undefined
                            ? "rota pendente"
                            : p.relay
                              ? "TURN / relay"
                              : "P2P direto"}
                        </span>
                        <span>
                          {p.bitrate ?? "—"} kbps
                          {p.width ? ` · ${p.width} × ${p.height}` : ""}
                        </span>
                        {p.error && <p className="error-text">{p.error}</p>}
                      </div>
                    ))}
                    <button
                      className="secondary"
                      onClick={() =>
                        void engine
                          .reconnectMedia()
                          .catch((e) => engine.fail(e))
                      }
                    >
                      Reconectar mídia
                    </button>
                    <label className="toggle">
                      <span>
                        Testar somente via TURN
                        <small>
                          {engine.peers.ice.turn
                            ? "Confirme a rota relay nas estatísticas."
                            : "TURN não está configurado neste servidor."}
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        disabled={!engine.peers.ice.turn}
                        checked={engine.peers.forceRelay}
                        onChange={(e) =>
                          void engine
                            .reconnectMedia(e.target.checked)
                            .catch((error) => engine.fail(error))
                        }
                      />
                    </label>
                  </div>
                </>
              ) : (
                <p>
                  Crie uma sala, copie o convite e envie aos seus amigos. Tela,
                  voz e câmera funcionam de forma independente. Você controla as
                  permissões no navegador.
                </p>
              )}
              <p className="field-note">
                O VIO não grava áudio, vídeo ou tela. A mídia pode seguir
                diretamente entre participantes ou passar por um retransmissor
                TURN. O código da sala permite acesso: compartilhe apenas com
                quem você quer por perto.
              </p>
              {engine.captures.audioMessage && (
                <p className="field-note">{engine.captures.audioMessage}</p>
              )}
              <a className="text-button" href="/source.tar.gz" download>
                Código-fonte · AGPLv3 <ArrowUpRight size={15} />
              </a>
            </>
          )}
          {panel === "history" && (
            <>
              {releases.map((release) => (
                <article className="release" key={release.version}>
                  <span className="eyebrow">
                    {release.date} · V{release.version}
                  </span>
                  <h3>{release.title}</h3>
                  <ul>
                    {release.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </article>
              ))}
              <p className="field-note">
                Nova base do VIO. As evidências de teste e os limites desta
                entrega estão na documentação do código-fonte.
              </p>
              <a className="text-button" href="/source.tar.gz" download>
                Baixar código-fonte <ArrowUpRight size={15} />
              </a>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
