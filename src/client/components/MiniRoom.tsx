import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

/** Landing (#258): a tiny room that works only in the visitor's browser. */
const people = [
  { name: "Nine", color: "#a6a9ff" },
  { name: "Lia", color: "#ff9f6b" },
  { name: "Téo", color: "#6bc6ff" },
  { name: "Duda", color: "#f28bd0" },
];
const tabs = [
  { id: "screens", label: "Várias telas" },
  { id: "voice", label: "Voz" },
  { id: "widgets", label: "Widgets da sala" },
] as const;
type Tab = (typeof tabs)[number]["id"];

function Screens() {
  const [focus, setFocus] = useState(0);
  const screens = [
    { owner: "Nine", scene: "scene-sun" },
    { owner: "Lia", scene: "scene-game" },
    { owner: "Téo", scene: "scene-map" },
  ];
  return (
    <div className="mini-screens">
      {screens.map((screen, i) => (
        <button
          key={screen.owner}
          className={`mini-screen ${screen.scene} ${i === focus ? "is-focus" : ""}`}
          aria-pressed={i === focus}
          aria-label={`Tela de ${screen.owner}`}
          onClick={() => setFocus(i)}
        >
          <span className="mini-screen-name">Tela de {screen.owner}</span>
        </button>
      ))}
    </div>
  );
}

function Voice() {
  return (
    <ul className="mini-voice" aria-label="Pessoas na chamada">
      {people.map((person, i) => (
        <li key={person.name} style={{ "--who": i } as CSSProperties}>
          <span
            className="mini-voice-dot"
            data-ponto="pessoa"
            style={{ background: person.color }}
          />
          {person.name}
        </li>
      ))}
    </ul>
  );
}

const wheel = [
  { label: "Terror", color: "#2727f5" },
  { label: "Comédia", color: "#ff9f6b" },
  { label: "Anime", color: "#6bc6ff" },
  { label: "Documentário", color: "#f28bd0" },
];
function Widgets() {
  const [turn, setTurn] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [votes, setVotes] = useState([3, 1, 1]);
  const [mine, setMine] = useState<number | null>(null);
  const options = ["Filme de terror", "Série nova", "Campeonato"];
  const total = votes.reduce((a, b) => a + b, 0);
  function spin() {
    const result = Math.floor(Math.random() * wheel.length);
    // Four whole turns, then the picked slice's middle under the top pointer.
    setTurn((t) => t - (t % 360) + 360 * 4 + 360 - (result * 90 + 45));
    setPicked(null);
    window.setTimeout(() => setPicked(result), 1800);
  }
  function vote(i: number) {
    setVotes((v) =>
      v.map(
        (n, j) => n + (j === i && mine !== i ? 1 : 0) - (j === mine ? 1 : 0),
      ),
    );
    setMine(mine === i ? null : i);
  }
  return (
    <div className="mini-widgets">
      <section className="mini-widget" aria-label="Roleta">
        <header>
          <strong>Roleta</strong>
          <span className="mini-room-tag">Da sala</span>
        </header>
        <div className="mini-wheel">
          <span className="mini-wheel-pointer" aria-hidden="true" />
          <div
            className="mini-wheel-disc"
            aria-hidden="true"
            style={{ transform: `rotate(${turn}deg)` }}
          />
        </div>
        <p className="mini-wheel-result" aria-live="polite">
          {picked === null ? " " : `Saiu ${wheel[picked].label}.`}
        </p>
        <button className="primary" onClick={spin}>
          Girar
        </button>
      </section>
      <section className="mini-widget" aria-label="Votação">
        <header>
          <strong>Votação</strong>
          <span className="mini-room-tag">Da sala</span>
        </header>
        <p className="mini-poll-question">O que a gente assiste hoje?</p>
        {options.map((option, i) => (
          <button
            key={option}
            className="mini-poll-option"
            aria-pressed={mine === i}
            onClick={() => vote(i)}
          >
            <span
              className="mini-poll-bar"
              aria-hidden="true"
              style={{ width: `${(votes[i] / total) * 100}%` }}
            />
            <span>{option}</span>
            <span className="mono">{votes[i]}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

export function MiniRoom() {
  const [tab, setTab] = useState<Tab>("widgets");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function keys(event: KeyboardEvent, i: number) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (i + step + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    refs.current[next]?.focus();
  }
  return (
    <div className="mini-room">
      <div
        className="mini-room-tabs"
        role="tablist"
        aria-label="O que tem na sala"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`mini-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="mini-room-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(event) => keys(event, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="mini-room-panel"
        id="mini-room-panel"
        role="tabpanel"
        aria-labelledby={`mini-tab-${tab}`}
      >
        {tab === "screens" && <Screens />}
        {tab === "voice" && <Voice />}
        {tab === "widgets" && <Widgets />}
      </div>
      <p className="mini-room-note">
        Na sala de verdade, vale para todo mundo.
      </p>
    </div>
  );
}
