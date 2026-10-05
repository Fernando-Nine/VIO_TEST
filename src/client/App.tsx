import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Phone,
  PhoneOff,
  Maximize,
  PictureInPicture2,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Copy,
  Headphones,
  HeadphoneOff,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  Pause,
  Settings2,
  Users,
  X,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { Controller } from "./room/controller";
import { RemoteVoice } from "./components/Media";
import { Dialog } from "./components/Dialog";
import { Settings } from "./components/Settings";
import { ColorPicker } from "./components/ColorPicker";
import { participantStyle } from "./components/participant-style";
import {
  ConnectionStatus,
  RoomTimer,
  RoomLimit,
} from "./components/RoomStatus";
import { Spectators } from "./components/Spectators";
import { VolumeControl } from "./components/VolumeControl";
import { usePictureInPicture } from "./media/picture-in-picture";
import { freshKey } from "./id";
const RoomCanvas = lazy(() =>
  import("./canvas/RoomCanvas").then((module) => ({
    default: module.RoomCanvas,
  })),
);
import { Landing } from "./components/Landing";
import { releases, version } from "../shared/releases";
import { invite } from "./endpoint";
type Panel = "settings" | "people" | "about" | "share" | "history" | null;
function Brand() {
  return (
    <span className="brand" aria-label="VIO">
      vio
      <span className="brand-dot" />
    </span>
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
  const [copied, setCopied] = useState(false);
  const canvas = useSyncExternalStore(
    engine.canvas.subscribe,
    engine.canvas.getSnapshot,
  );
  const peopleWidget = canvas.widgets.find((w) => w.type === "people");
  const peopleHidden =
    !peopleWidget ||
    canvas.hidden.includes(peopleWidget.id) ||
    canvas.floating.some(
      (f) => f.widgetId === peopleWidget.id && f.minimized,
    ) ||
    (canvas.single && canvas.focusId !== peopleWidget.id);
  function togglePeople() {
    if (!peopleWidget)
      engine.canvas.add(
        {
          id: freshKey(),
          type: "people",
          title: "Pessoas na sala",
          config: {},
        },
        undefined,
        true,
      );
    else if (peopleHidden) {
      const parked = canvas.floating.find(
        (f) => f.widgetId === peopleWidget.id && f.parked,
      );
      if (parked) {
        engine.canvas.move(
          peopleWidget.id,
          canvas.slots.find((s) => !s.widgetId && !s.offer)?.id ||
            engine.canvas.addSlot(),
        );
        engine.canvas.change((s) => {
          s.single = false;
        });
        wake();
        return;
      }
      if (
        canvas.hidden.includes(peopleWidget.id) ||
        canvas.floating.some(
          (f) => f.widgetId === peopleWidget.id && f.minimized,
        )
      )
        engine.canvas.minimize(peopleWidget.id);
      engine.canvas.change((s) => {
        s.single = false;
      });
    } else engine.canvas.minimize(peopleWidget.id);
    wake();
  }
  const [active, setActive] = useState(true);
  const [full, setFull] = useState(false);
  const player = useRef<HTMLDivElement>(null);
  const playerMount = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const [playerHost] = useState(() => {
    const element = document.createElement("div");
    element.className = "player-host";
    return element;
  });
  const pip = usePictureInPicture();
  useLayoutEffect(() => {
    if (!view.snapshot || !playerMount.current) return;
    playerMount.current.append(playerHost);
    const measure = () =>
      player.current?.style.setProperty(
        "--dock-height",
        `${dock.current?.offsetHeight || 64}px`,
      );
    const observer = new ResizeObserver(measure);
    if (dock.current) observer.observe(dock.current);
    measure();
    return () => {
      pip.close();
      observer.disconnect();
      playerHost.remove();
    };
  }, [!!view.snapshot, playerHost, pip.close]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draggingCards = useRef(false);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#0b0c13");
  }, [!!view.snapshot]);
  const wake = useCallback(() => {
    setActive(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        !draggingCards.current &&
        !document.querySelector("dialog[open]") &&
        !document.querySelector(
          ".widget-host:focus-within, .dock-volume.has-menu",
        ) &&
        !document.activeElement?.matches(":focus-visible")
      )
        setActive(false);
    }, 2000);
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
  const people = view.snapshot?.participants || [];
  const all = people.flatMap((m) => m.publications);
  const screens = all.filter((p) => p.kind === "screen");
  const watching = view.watching.length > 0;
  const available = screens.filter((p) => !view.watching.includes(p.id));
  const availableKey = available.map((p) => p.id).join(",");
  useEffect(() => {
    if (availableKey) wake();
  }, [availableKey, wake]);
  const hasScreen = engine.captures.sources.has("screen");
  const hasVoice = engine.captures.sources.has("voice");
  const hasCamera = engine.captures.sources.has("camera");
  const micMuted =
    !hasVoice || engine.captures.micMuted || engine.captures.deaf;
  const canShare = engine.captures.canShare;
  const canMedia = engine.captures.canUseDevices;
  const allStats = engine.peers.infos();
  const canFullscreen =
    !!document.fullscreenEnabled ||
    !!(
      player.current?.querySelector(".is-focused video") as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      }
    )?.webkitEnterFullscreen;
  const open = (p: Panel) => {
    if (p) pip.close();
    setPanel(p);
    wake();
  };
  async function goHome() {
    pip.close();
    await engine.leave();
    setCode("");
    setPanel(null);
  }
  async function copy(link = true) {
    try {
      const url = invite(view.snapshot!.code);
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
        const el = player.current?.querySelector(
          ".is-focused video",
        ) as HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        };
        if (el?.webkitEnterFullscreen) el.webkitEnterFullscreen();
        else throw new Error("Tela cheia indisponível neste navegador.");
      }
    } catch (e) {
      engine.fail(e);
    }
  }
  return (
    <div
      className={`app ${view.snapshot ? "in-room" : "landing-page"} ${!active && !panel && view.snapshot ? "idle" : ""}`}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
      onFocus={wake}
      onBlur={wake}
    >
      <header className="app-header">
        <div className="header-left">
          <button
            className="brand-home"
            aria-label="VIO · Voltar ao início"
            title="Voltar à seleção de sala"
            onClick={() => void goHome()}
          >
            <Brand />
          </button>
          {view.snapshot && (
            <>
              <span className="header-divider" />
              <button
                className="room-code"
                title="Copiar código da sala"
                onClick={() => void copy(false)}
              >
                <span>{view.snapshot.code}</span>
                <Copy size={14} />
              </button>
            </>
          )}
        </div>
        {view.snapshot ? (
          <div className="header-actions">
            <ConnectionStatus
              engine={engine}
              diagnostics={() => open("about")}
            />
            <div className="room-navigation">
              <button
                className="dock-button people-toggle"
                aria-label={
                  peopleHidden
                    ? "Mostrar pessoas e telas"
                    : "Ocultar pessoas e telas"
                }
                aria-expanded={!peopleHidden}
                title={
                  peopleHidden
                    ? "Mostrar pessoas e telas"
                    : "Ocultar pessoas e telas"
                }
                onClick={togglePeople}
              >
                <Users />
                <span>Pessoas e telas</span>
                {available.length > 0 && (
                  <small
                    className="available-count"
                    aria-label={`${available.length} transmissões disponíveis`}
                  >
                    {available.length}
                  </small>
                )}
              </button>
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
                onClick={() => void goHome()}
              >
                <LogOut />
                <span>Sair</span>
              </button>
            </div>
            <button
              className="secondary invite"
              aria-label={copied ? "Convite copiado" : "Convidar"}
              onClick={() => void copy()}
            >
              {copied ? <Check size={16} /> : <LinkIcon size={16} />}
              <span>{copied ? "Copiado" : "Convidar"}</span>
            </button>
          </div>
        ) : (
          <div className="header-actions">
            <span className="small-note">De perto, mesmo de longe.</span>
            <button
              className="landing-about"
              aria-label="Como funciona o VIO"
              onClick={() => open("about")}
            >
              <span>Como funciona</span>
              <ArrowUpRight size={16} aria-hidden="true" />
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
        <Landing
          name={name}
          code={code}
          setName={setName}
          setCode={setCode}
          busy={view.status === "connecting" || view.status === "reconnecting"}
          enter={() => {
            void engine.enter(name, code);
          }}
        />
      ) : (
        <main className="room" id="main-content">
          <div className="room-heading">
            <div>
              <h1>
                {watching ? "Na mesma cena." : "Sua companhia está aqui."}
              </h1>
              <RoomTimer engine={engine} />
            </div>
            <div className="room-capacity">
              <button className="text-button" onClick={() => open("people")}>
                <Users size={17} />
                {people.length} {people.length === 1 ? "pessoa" : "pessoas"}
                <ChevronDown size={14} />
              </button>
              <RoomLimit
                count={people.length}
                threshold={view.snapshot.recommendedParticipants}
              />
            </div>
          </div>
          <div className="player-layout" ref={playerMount}>
            {pip.detached && (
              <div className="pip-placeholder">
                <PictureInPicture2 size={28} />
                <p>A sessão está na janela flutuante.</p>
                <button className="secondary" onClick={pip.close}>
                  Trazer de volta
                </button>
              </div>
            )}
            {createPortal(
              <div
                className={`player ${engine.previewsEnabled ? "live-previews" : ""} ${watching ? "has-video" : ""}`}
                ref={player}
              >
                <Suspense
                  fallback={
                    <div className="player-empty" role="status">
                      Preparando seu espaço…
                    </div>
                  }
                >
                  <RoomCanvas
                    engine={engine}
                    active={(active && !panel) || !watching}
                    settings={() => open("settings")}
                    people={() => open("people")}
                    diagnostics={() => open("about")}
                    share={() => open("share")}
                    fullscreen={() => void fullscreen()}
                    interaction={(busy) => {
                      draggingCards.current = busy;
                      wake();
                    }}
                  />
                </Suspense>
                <footer
                  ref={dock}
                  className="dock"
                  aria-label="Controles da sala"
                >
                  <div
                    className="control-card"
                    role="group"
                    aria-label="Chamada"
                  >
                    <span className="control-card-label">Chamada</span>
                    <div className="dock-group call-controls">
                      {!engine.inCall ? (
                        <button
                          className="secondary call-join"
                          onClick={() => engine.joinCall()}
                          aria-label="Entrar na chamada com microfone desligado"
                        >
                          <Phone size={18} />
                          <span>Entrar na chamada</span>
                        </button>
                      ) : (
                        <>
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
                              engine.captures.deaf
                                ? "Desativar ensurdecer"
                                : "Ensurdecer"
                            }
                            onClick={() => engine.deafen()}
                          >
                            {engine.captures.deaf ? (
                              <HeadphoneOff />
                            ) : (
                              <Headphones />
                            )}
                            <span>Áudio</span>
                          </button>
                          <button
                            className={`dock-button ${hasCamera ? "enabled" : ""}`}
                            aria-label={
                              hasCamera ? "Desligar câmera" : "Ligar câmera"
                            }
                            aria-pressed={hasCamera}
                            disabled={!canMedia && !hasCamera}
                            onClick={() => void engine.camera()}
                          >
                            {hasCamera ? <Camera /> : <CameraOff />}
                            <span>Câmera</span>
                          </button>
                          <button
                            className="dock-button leave-call"
                            aria-label="Sair da chamada"
                            title="Sair da chamada e continuar assistindo"
                            onClick={() => void engine.leaveCall()}
                          >
                            <PhoneOff />
                            <span>Sair da voz</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className="control-card"
                    role="group"
                    aria-label="Compartilhamento"
                  >
                    <span className="control-card-label">Compartilhamento</span>
                    <div className="dock-group share-controls">
                      <button
                        className={`share-button ${hasScreen ? "sharing" : ""}`}
                        aria-label={hasScreen ? "Parar tela" : "Compartilhar"}
                        disabled={!canShare && !hasScreen}
                        onClick={() =>
                          hasScreen ? void engine.stop("screen") : open("share")
                        }
                      >
                        {hasScreen ? (
                          <Pause size={19} />
                        ) : (
                          <MonitorUp size={19} />
                        )}
                        <span>{hasScreen ? "Parar tela" : "Compartilhar"}</span>
                      </button>
                      {engine.publications.get("screen") && (
                        <Spectators
                          engine={engine}
                          publicationId={engine.publications.get("screen")!.id}
                        />
                      )}
                      {(watching || pip.interactive) && (
                        <div className="dock-group playback-controls">
                          {watching && <VolumeControl engine={engine} />}
                          {watching && canFullscreen && (
                            <button
                              className="dock-button"
                              aria-label={
                                full ? "Sair da tela cheia" : "Tela cheia"
                              }
                              title="Tela cheia"
                              disabled={pip.detached}
                              onClick={() => void fullscreen()}
                            >
                              <Maximize />
                              <span>Tela cheia</span>
                            </button>
                          )}
                          {pip.supported && (
                            <button
                              className="dock-button"
                              aria-label={
                                pip.detached
                                  ? "Voltar da janela flutuante"
                                  : pip.active
                                    ? "Fechar janela flutuante"
                                    : "Picture-in-picture"
                              }
                              title="Janela flutuante"
                              onClick={() =>
                                void pip
                                  .toggle(
                                    playerHost,
                                    player.current?.querySelector<HTMLVideoElement>(
                                      ".is-focused video",
                                    ) || null,
                                  )
                                  .catch((e) => engine.fail(e))
                              }
                            >
                              <PictureInPicture2 />
                              <span>Flutuante</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </footer>
              </div>,
              playerHost,
            )}
          </div>
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
                output={engine.output}
                muted={
                  !engine.inCall || engine.captures.deaf || engine.remoteMute
                }
                volume={
                  (engine.volumes.get(p.owner) ?? 1) * engine.masterVolume
                }
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
                  role="switch"
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
              <ColorPicker engine={engine} />
              {people.map((m) => (
                <div
                  className="participant-setting"
                  key={m.id}
                  style={participantStyle(m.color, engine.participantColors)}
                >
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
                        role="switch"
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
              <div className="system-change">
                <span className="eyebrow">MUDANÇA DE SISTEMA · 2.0.0</span>
                <h3>Uma nova geração, com a mesma história.</h3>
                <p>
                  O VIO foi reescrito do zero. A numeração continua depois da
                  1.9.0. As versões abaixo da 2.0.0 registram o sistema
                  anterior, com o changelog integral preservado.
                </p>
              </div>
              {releases.map((release) => (
                <article
                  className={`release ${release.legacy ? "legacy-release" : ""}`}
                  key={release.version}
                >
                  <span className="eyebrow">
                    V{release.version}
                    {release.date ? ` · ${release.date}` : ""}
                    {release.legacy && (
                      <span className="legacy-tag">Sistema anterior</span>
                    )}
                  </span>
                  <h3>{release.title}</h3>
                  {release.sections.map((section) => (
                    <section key={section.title}>
                      <h4>{section.title}</h4>
                      <ul>
                        {section.items.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
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
