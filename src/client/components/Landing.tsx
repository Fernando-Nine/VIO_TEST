import { useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Camera,
  LoaderCircle,
  Mic,
  Monitor,
  Play,
  ShieldCheck,
} from "lucide-react";
import { InstallApp } from "./InstallApp";

const modes = [
  {
    id: "screen",
    title: "Tela",
    icon: Monitor,
    description: "Uma tela para compartilhar. Você escolhe o que assistir.",
  },
  {
    id: "voice",
    title: "Voz",
    icon: Mic,
    description: "A conversa continua, mesmo quando a tela muda.",
  },
  {
    id: "camera",
    title: "Câmera",
    icon: Camera,
    description:
      "Sua câmera, independente da tela. Mais um jeito de estar perto.",
  },
] as const;

function SessionPreview() {
  const [mode, setMode] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <section className="session-preview" aria-labelledby="preview-heading">
      <div className="preview-heading">
        <h2 id="preview-heading">
          Cada um daí.
          <br />
          <em>Todo mundo aqui.</em>
        </h2>
        <span>
          Explore o VIO <ArrowDownRight size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="preview-console">
        <div
          className="preview-tabs"
          role="tablist"
          aria-label="Conheça os recursos do VIO"
        >
          {modes.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`preview-tab-${item.id}`}
              role="tab"
              aria-selected={i === mode}
              aria-controls={`preview-panel-${item.id}`}
              tabIndex={i === mode ? 0 : -1}
              onClick={() => setMode(i)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (i + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                setMode(next);
                tabs.current[next]?.focus();
              }}
            >
              <item.icon size={15} aria-hidden="true" />
              {item.title}
            </button>
          ))}
        </div>
        <div className="preview-stage">
          {modes.map((item, i) => (
            <div
              key={item.id}
              id={`preview-panel-${item.id}`}
              role="tabpanel"
              aria-labelledby={`preview-tab-${item.id}`}
              aria-hidden={mode !== i}
              className={`preview-scene scene-${item.id} ${mode === i ? "is-visible" : ""}`}
            >
              <div className="scene-art" aria-hidden="true">
                {i === 0 && (
                  <div className="mini-window">
                    <div className="mini-window-bar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="mini-picture">
                      <span>
                        play
                        <br />
                        <em>junto.</em>
                      </span>
                      <Play size={28} fill="currentColor" />
                    </div>
                  </div>
                )}
                {i === 1 && (
                  <div className="voice-illustration">
                    <span className="voice-monogram">v.</span>
                    <div className="voice-wave">
                      {Array.from({ length: 19 }, (_, n) => (
                        <i
                          key={n}
                          style={{
                            height: `${[12, 24, 38, 18, 46, 32, 56][n % 7]}px`,
                            animationDelay: `${n * 32}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div className="camera-illustration">
                    <div>
                      <span>v</span>
                      <i />
                    </div>
                    <div>
                      <span>n</span>
                      <i />
                    </div>
                  </div>
                )}
              </div>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
        <div className="preview-caption">
          <span>Direto no navegador.</span>
          <span aria-hidden="true">0{mode + 1} / 03</span>
        </div>
      </div>
    </section>
  );
}

export function Landing({
  name,
  code,
  setName,
  setCode,
  busy,
  enter,
}: {
  name: string;
  code: string;
  setName: (value: string) => void;
  setCode: (value: string) => void;
  busy: boolean;
  enter: () => void;
}) {
  const initial = [...name.trim()][0]?.toUpperCase();
  const nameInput = useRef<HTMLInputElement>(null);
  return (
    <main className="landing" id="main-content">
      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="landing-kicker">
          <span aria-hidden="true" />
          SUA PRÓXIMA SESSÃO COMEÇA AQUI
        </p>
        <h1 id="landing-title">
          <span className="title-line">
            <span>Bom mesmo</span>
          </span>
          <span className="title-line">
            <span>é assistir</span>
          </span>
          <span className="title-line title-together">
            <em>junto.</em>
          </span>
        </h1>
        <div className="landing-intro">
          <p>
            Uma tela para compartilhar.
            <br />
            Voz e câmera para estar por perto.
          </p>
          <a
            href="#join-vio"
            className="join-shortcut"
            aria-label="Ir para criar ou entrar em uma sala"
            onClick={(event) => {
              event.preventDefault();
              nameInput.current?.focus();
            }}
          >
            <ArrowDownRight size={26} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        className="landing-join"
        id="join-vio"
        aria-labelledby="join-heading"
      >
        <div className="join-ticket-top">
          <span>SUA SALA NO VIO</span>
          <span>ENTRADA LIVRE</span>
        </div>
        <div className="join-welcome">
          <h2 id="join-heading">
            Chega
            <br />
            mais.
          </h2>
          <span
            className={`join-stamp ${initial ? "has-name" : ""}`}
            aria-hidden="true"
          >
            <span key={initial || "arrow"}>
              {initial || <ArrowUpRight size={30} />}
            </span>
          </span>
        </div>
        <p>Escolha um nome e encontre sua turma.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            enter();
          }}
          aria-busy={busy}
        >
          <label htmlFor="your-name">Como podemos chamar você?</label>
          <input
            ref={nameInput}
            id="your-name"
            autoComplete="nickname"
            placeholder="Seu nome"
            maxLength={32}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
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
            aria-describedby="room-code-help"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              )
            }
          />
          <small id="room-code-help">
            Sem código? Criamos uma sala nova para você.
          </small>
          <button
            className={`landing-submit ${busy ? "is-opening" : ""}`}
            disabled={busy}
            type="submit"
          >
            <span>
              {busy
                ? "Abrindo sua sala…"
                : code
                  ? "Entrar na sala"
                  : "Criar minha sala"}
            </span>
            <span className="submit-arrow" aria-hidden="true">
              {busy ? <LoaderCircle size={20} /> : <ArrowRight size={20} />}
            </span>
          </button>
        </form>
        <div className="landing-privacy">
          <ShieldCheck size={17} aria-hidden="true" />
          <p>
            Sem conta. Câmera e microfone
            <br />
            começam desligados.
          </p>
        </div>
        <InstallApp />
      </section>
      <SessionPreview />
    </main>
  );
}
