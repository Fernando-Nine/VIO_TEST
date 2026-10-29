import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { InstallApp } from "./InstallApp";
import { MiniRoom } from "./MiniRoom";
import { desktop } from "../desktop/bridge";
import { version } from "../../shared/releases";
import { api } from "../endpoint";
import { Logo } from "./Logo";

const releases = "https://github.com/Fernando-Nine/vio-releases/releases";
/**
 * Production downloads the stable installer directly; the preview's "VIO Teste"
 * installer changes name on every build, so it opens the beta release page.
 */
export const installer = version.includes("-")
  ? `${releases}/tag/beta`
  : `${releases}/latest/download/VIO-x64-setup.exe`;

/** Scrolls to "Chega mais" and puts the cursor in the name. */
export function goToJoin() {
  const name = document.getElementById("your-name");
  document
    .getElementById("join-vio")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
  name?.focus({ preventScroll: true });
}

function DownloadButton({ big }: { big?: boolean }) {
  const [started, setStarted] = useState(false);
  return (
    <div className={big ? "download-block" : undefined}>
      <a
        className={`primary landing-download ${big ? "is-big" : ""}`}
        href={installer}
        onClick={() => setStarted(true)}
        rel="noopener"
      >
        {big ? (
          <>
            <span className="download-label">
              {started && <span className="landing-dot" data-ponto="baixar" />}
              {started ? "Baixando…" : "Baixar para Windows"}
            </span>
            <span className="download-meta mono">
              Windows 10 e 11 · versão {version.replace(/-.*/, "")}
            </span>
          </>
        ) : (
          <>
            <Download size={18} aria-hidden="true" />
            Baixar para Windows
          </>
        )}
      </a>
      {big && started && (
        <div className="download-steps" role="status">
          <p>Abra o instalador quando terminar.</p>
          <ol>
            <li>Clique no arquivo baixado.</li>
            <li>Crie uma sala ou entre com o código.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function CopyAddress({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="secondary landing-copy"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(location.origin)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2400);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? (
        <Check size={16} aria-hidden="true" />
      ) : (
        <Copy size={16} aria-hidden="true" />
      )}
      {copied ? "Copiado" : label}
    </button>
  );
}

/** Header action of the landing: download on a computer, the form on a phone. */
export function LandingAction() {
  return (
    <div className="header-actions">
      {!desktop && <DownloadButton />}
      <button className="primary landing-enter" onClick={goToJoin}>
        Entrar pelo navegador
      </button>
    </div>
  );
}

export function Landing({
  name,
  code,
  setName,
  setCode,
  busy,
  enter,
  history,
}: {
  name: string;
  code: string;
  setName: (value: string) => void;
  setCode: (value: string) => void;
  busy: boolean;
  enter: () => void;
  history: () => void;
}) {
  return (
    <main className="landing" id="main-content">
      <div className="landing-screen landing-first">
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
              <em>
                junto
                <span className="landing-dot is-pulsing" data-ponto="landing" />
              </em>
            </span>
          </h1>
          <div className="landing-intro">
            <p>
              Uma tela para compartilhar.
              <br />
              Voz e câmera para estar por perto.
            </p>
          </div>
          {!desktop && (
            <div className="landing-ctas">
              <DownloadButton />
              <a className="landing-why" href="#por-que">
                Por que instalar <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
          )}
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
            <h2 id="join-heading">Chega mais.</h2>
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
      </div>
      {!desktop && (
        <>
          <div className="landing-trail" aria-hidden="true" />
          <section
            className="landing-screen landing-why-app"
            id="por-que"
            aria-labelledby="why-title"
          >
            <h2 id="why-title">No app, é ao vivo de verdade.</h2>
            <div className="app-mock" aria-hidden="true">
              <div className="app-mock-bar">
                <Logo label={false} />
                <span className="mono">VIO-7K2Q</span>
                <span className="app-mock-controls">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="app-mock-body">
                <div className="app-mock-stage">
                  <span className="app-mock-sun" />
                  <span className="app-mock-hill" />
                  <span className="app-mock-player" />
                  <span className="live-tag">
                    <span className="landing-dot" data-ponto="ao-vivo" />
                    Ao vivo
                  </span>
                  <span className="app-mock-owner">Tela de Nine</span>
                </div>
                <div className="app-mock-people">
                  {[
                    ["Nine", "#a6a9ff"],
                    ["Lia", "#ff9f6b"],
                    ["Téo", "#6bc6ff"],
                    ["Duda", "#f28bd0"],
                  ].map(([who, color]) => (
                    <span key={who}>
                      <i style={{ background: color }}>{who[0]}</i>
                      {who}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p>
              Tela e som do Windows saem juntos, direto do seu PC para os seus
              amigos. O VIO não grava nem guarda nada.
            </p>
            <p className="landing-phone-note">
              O app é para Windows. No celular, você entra pelo navegador.
            </p>
            <ul className="landing-perks">
              <li>Som do jogo ou do filme junto</li>
              <li>Atualiza sozinho</li>
              <li>Sem conta</li>
            </ul>
          </section>
          <section
            className="landing-screen landing-features"
            aria-labelledby="features-title"
          >
            <div className="landing-points" aria-hidden="true">
              <span style={{ background: "#a6a9ff" }} />
              <span style={{ background: "#ff9f6b" }} />
              <span style={{ background: "#6bc6ff" }} />
              <span style={{ background: "#f28bd0" }} />
            </div>
            <h2 id="features-title">
              Cada um é um ponto.
              <br />
              Junto é sala.
            </h2>
            <MiniRoom />
          </section>
          <section
            className="landing-screen landing-get"
            id="baixar"
            aria-labelledby="get-title"
          >
            <h2 id="get-title">
              Só falta você
              <span className="landing-dot" data-ponto="download" />
            </h2>
            <div className="landing-get-computer">
              <DownloadButton big />
              <button
                className="text-button landing-browser"
                onClick={goToJoin}
              >
                Ou entre pelo navegador
              </button>
              <div className="landing-share">
                <span>Manda o link no grupo.</span>
                <span className="mono">{location.host}</span>
                <CopyAddress label="Copiar" />
              </div>
            </div>
            <div className="landing-get-phone">
              <button className="primary landing-enter-big" onClick={goToJoin}>
                Entrar pelo navegador
              </button>
              <p>
                Tem PC com Windows? Abra este endereço lá para baixar o app.
              </p>
              <CopyAddress label="Copiar endereço para o grupo" />
            </div>
            <LandingFooter history={history} />
          </section>
        </>
      )}
      {desktop && <LandingFooter history={history} />}
    </main>
  );
}

function LandingFooter({ history }: { history: () => void }) {
  return (
    <footer className="landing-footer">
      <span>
        by <strong>NerdQuest Studios</strong>
      </span>
      <span className="landing-footer-links">
        <a href={api("/source.tar.gz")} download>
          Código aberto (AGPL)
        </a>
        <button className="version" onClick={history}>
          v{version}
          <ArrowUpRight size={12} aria-hidden="true" />
        </button>
      </span>
    </footer>
  );
}
