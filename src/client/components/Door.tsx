import type { Controller } from "../room/controller";

/**
 * Whoever arrives at a locked room (#260): waiting, turned away, or the
 * invite expired. The dot blinks while waiting (still with reduced motion).
 */
export function Door({
  engine,
  home,
}: {
  engine: Controller;
  /** Back to Início or the landing page. */
  home: () => void;
}) {
  const { waiting, turnedAway } = engine.view;
  const state = waiting
    ? {
        title: "Pedindo para entrar…",
        text: (
          <>
            A sala{" "}
            {waiting.code && <span className="mono">{waiting.code}</span>} está
            trancada. Quem cuida dela já foi avisado.
          </>
        ),
        action: "Cancelar",
      }
    : turnedAway === "expired"
      ? {
          title: "Esse convite expirou.",
          text: "Peça um novo para quem chamou você.",
          action: "Voltar ao início",
        }
      : {
          title: "Não deu para entrar agora.",
          text: "Tente de novo mais tarde ou fale com quem chamou você.",
          action: "Voltar ao início",
        };
  return (
    <main className="door" id="main-content">
      <section
        className="door-card"
        aria-labelledby="door-title"
        aria-live="polite"
      >
        <span className="door-dot-box" aria-hidden="true">
          <span
            className={`door-dot ${waiting ? "is-waiting" : ""}`}
            data-ponto="espera"
          />
        </span>
        <div className="door-text">
          <h1 id="door-title">{state.title}</h1>
          <p>{state.text}</p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (waiting) void engine.leave(false);
            else engine.dismissTurnedAway();
            home();
          }}
        >
          {state.action}
        </button>
      </section>
    </main>
  );
}
