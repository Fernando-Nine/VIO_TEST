import { useSyncExternalStore, type CSSProperties } from "react";
import type { MenuItem } from "../components/ContextMenu";
import { BarChart3, Check, CircleOff, PieChart } from "lucide-react";
import { HeaderTools } from "./header-tools";
import { colorInk, defaultColor, normalizeColor } from "../../shared/colors";
import type {
  ModuleAction,
  ModuleConfig,
  ModuleState,
} from "../../shared/room-modules";
import type { Participant } from "../../shared/protocol";
import "./poll.css";

type Poll = Extract<ModuleConfig, { kind: "poll" }>;
type Chart = "bars" | "pie" | "none";
const chartKey = "vio:poll-chart";
const charts: { id: Chart; label: string; Icon: typeof BarChart3 }[] = [
  { id: "bars", label: "Barras", Icon: BarChart3 },
  { id: "pie", label: "Pizza", Icon: PieChart },
  { id: "none", label: "Sem gráfico", Icon: CircleOff },
];
/** Winner first, then darker shades by rank. */
const shades = ["#A6A9FF", "#6B6FD0", "#474A6A", "#383A57", "#2E3048"];

/** How each person sees results is a personal preference, kept on this device. */
const chartListeners = new Set<() => void>();
let chartValue: Chart | undefined;
function readChart(): Chart {
  if (chartValue) return chartValue;
  try {
    const saved = localStorage.getItem(chartKey);
    if (saved === "bars" || saved === "pie" || saved === "none")
      return (chartValue = saved);
  } catch {
    /* Preferences are optional. */
  }
  return (chartValue = "bars");
}
function setChart(next: Chart) {
  chartValue = next;
  try {
    localStorage.setItem(chartKey, next);
  } catch {
    /* Preferences are optional. */
  }
  chartListeners.forEach((listener) => listener());
}
export function useChart() {
  return useSyncExternalStore((listener) => {
    chartListeners.add(listener);
    return () => chartListeners.delete(listener);
  }, readChart);
}
/** The chart choice for the header menu, where narrow headers fold the tools. */
export function chartMenu(): MenuItem[] {
  const current = readChart();
  return charts
    .filter((c) => c.id !== current)
    .map(({ id, label, Icon }) => ({
      label: `Ver resultado: ${label}`,
      icon: Icon,
      run: () => setChart(id),
    }));
}

const clockText = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
const votesText = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

function Face({ person }: { person: Pick<Participant, "name" | "color"> }) {
  const color = normalizeColor(person.color) || defaultColor;
  return (
    <span
      className="poll-face"
      style={
        { "--face": color, "--face-ink": colorInk(color) } as CSSProperties
      }
      title={person.name}
    >
      {Array.from(person.name.trim())[0]?.toLocaleUpperCase("pt-BR") || "?"}
    </span>
  );
}

/** Donut with a background-colored gap between slices. */
function Donut({ counts, order }: { counts: number[]; order: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  let start = 0;
  return (
    <svg className="poll-donut" viewBox="0 0 100 100" aria-hidden="true">
      {total === 0 ? (
        <circle cx="50" cy="50" r="38" className="poll-donut-empty" />
      ) : (
        counts.map((count, i) => {
          if (!count) return null;
          const share = count / total;
          const slice = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="38"
              pathLength={100}
              strokeDasharray={`${share * 100} ${100 - share * 100}`}
              strokeDashoffset={-start * 100}
              style={{ stroke: shades[Math.min(order[i], shades.length - 1)] }}
            />
          );
          start += share;
          return slice;
        })
      )}
      {total > 0 &&
        counts.filter(Boolean).length > 1 &&
        counts
          .reduce<
            number[]
          >((edges, count) => [...edges, (edges.at(-1) ?? 0) + count / total], [])
          .map((edge, i) => (
            <line
              key={i}
              className="poll-donut-gap"
              x1="50"
              y1="50"
              x2={50 + 52 * Math.cos(edge * 2 * Math.PI)}
              y2={50 + 52 * Math.sin(edge * 2 * Math.PI)}
            />
          ))}
    </svg>
  );
}

export function PollFace({
  config,
  state,
  now,
  viewerId,
  participants,
  open,
  busy,
  controllable,
  revision,
  revealing,
  act,
}: {
  config: Poll;
  state: ModuleState;
  now: number;
  viewerId: string;
  participants: Participant[];
  open: boolean;
  busy: boolean;
  controllable: boolean;
  revision: number;
  revealing: boolean;
  act: (action: ModuleAction) => void;
}) {
  const chart = useChart();
  const voters = state.voters ?? Object.keys(state.votes || {}).length;
  const control = (action: "start" | "close" | "reset") =>
    act({ kind: "poll-control", action, revision });

  if (open) {
    const mine = state.votes?.[viewerId];
    const left =
      config.duration && state.startedAt != null
        ? config.duration - (now - state.startedAt) / 1000
        : null;
    const present = participants.filter((p) => p.online).length;
    const byId = new Map(participants.map((p) => [p.id, p]));
    const voted = (state.voterIds || [])
      .map((id) => byId.get(id))
      .filter((p): p is Participant => !!p);
    const crowd = present > 6;
    const shown = crowd ? voted.slice(0, 5) : voted.slice(0, 6);
    const rest = voted.slice(shown.length);
    const extra = Math.max(0, voters - shown.length);
    return (
      <div className="poll-view is-open">
        {left !== null && (
          <span
            className="poll-deadline"
            style={{
              width: `${Math.max(0, Math.min(1, left / config.duration)) * 100}%`,
            }}
          />
        )}
        <div className="poll-body">
          <strong className="poll-question">{config.question}</strong>
          <div className="poll-options" role="group" aria-label="Opções">
            {config.options.map((option) => (
              <button
                key={option.id}
                className="poll-option"
                aria-pressed={mine === option.id}
                disabled={busy}
                onClick={() => act({ kind: "vote", optionId: option.id })}
              >
                <span className="poll-radio" aria-hidden="true" />
                <span className="poll-label">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="poll-footer">
            <span className="poll-faces">
              {shown.map((p) => (
                <Face key={p.id} person={p} />
              ))}
              {extra > 0 && (
                <span className="poll-extra" tabIndex={0}>
                  +{extra}
                  {rest.length > 0 && (
                    <span className="poll-names" role="tooltip">
                      {rest.map((p) => (
                        <span key={p.id}>{p.name}</span>
                      ))}
                    </span>
                  )}
                </span>
              )}
            </span>
            {/* Small spaces show three options, tiny ones two. */}
            {[3, 2].map(
              (fit) =>
                config.options.length > fit && (
                  <small key={fit} className={`poll-more fits-${fit}`}>
                    +{config.options.length - fit}{" "}
                    {config.options.length - fit === 1 ? "opção" : "opções"}
                  </small>
                ),
            )}
            <small className="poll-count">
              {voters} de {Math.max(present, voters)}
              <span className="poll-count-tail"> votaram</span>
            </small>
            {left !== null && (
              <span className="poll-left" aria-label="Tempo restante">
                {clockText(left)}
              </span>
            )}
            {controllable && (
              <button
                className="secondary poll-end"
                disabled={busy}
                onClick={() => control("close")}
              >
                Encerrar agora
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const counts = config.options.map(
    (o) => Object.values(state.votes || {}).filter((v) => v === o.id).length,
  );
  const total = counts.reduce((a, b) => a + b, 0);
  const top = Math.max(0, ...counts);
  // Rank by votes (ties share a rank) for the shade of each option.
  const ranks = [...new Set(counts)].sort((a, b) => b - a);
  const order = counts.map((c) => ranks.indexOf(c));
  const winners = top ? config.options.filter((_, i) => counts[i] === top) : [];
  const ranked = config.options
    .map((option, i) => ({ option, i }))
    .sort((a, b) => counts[b.i] - counts[a.i]);
  const sorted = config.options
    .map((option, i) => ({ option, count: counts[i] }))
    .sort((a, b) => b.count - a.count);
  const footer = (
    <div className="poll-footer is-result">
      <small>{votesText(total)} · encerrada</small>
      {controllable && (
        <button
          className="secondary poll-end"
          disabled={busy}
          onClick={() => control("reset")}
        >
          Nova votação
        </button>
      )}
    </div>
  );
  return (
    <div
      className={`poll-view chart-${chart} ${revealing ? "is-revealing" : ""}`}
    >
      <HeaderTools>
        <span
          className="poll-charts"
          role="group"
          aria-label="Gráfico do resultado"
        >
          {charts.map(({ id, label, Icon }) => (
            <button
              key={id}
              className="icon-button"
              aria-label={label}
              title={label}
              aria-pressed={chart === id}
              onClick={() => setChart(id)}
            >
              <Icon size={14} />
            </button>
          ))}
        </span>
      </HeaderTools>
      {chart === "bars" && (
        <div className="poll-body">
          <strong className="poll-question">{config.question}</strong>
          <ul className="poll-bars">
            {ranked.map(({ option, i }) => (
              <li
                key={option.id}
                className={counts[i] === top && top ? "is-winner" : undefined}
              >
                <span className="poll-label">
                  {option.label}
                  {counts[i] === top && top > 0 && (
                    <Check size={14} aria-label="Vencedora" />
                  )}
                </span>
                <span className="poll-num">
                  {counts[i]}
                  <span className="poll-num-word">
                    {counts[i] === 1 ? " voto" : " votos"}
                  </span>{" "}
                  · {percent(counts[i], total)}%
                </span>
                <span className="poll-bar">
                  <span style={{ width: `${percent(counts[i], total)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          {footer}
        </div>
      )}
      {chart === "pie" && (
        <div className="poll-body poll-pie">
          <div className="poll-donut-box">
            <Donut
              counts={ranked.map((r) => counts[r.i])}
              order={ranked.map((r) => order[r.i])}
            />
            <span className="poll-donut-center">
              <b>{percent(top, total)}%</b>
              <small>
                {top} de {votesText(total)}
              </small>
            </span>
          </div>
          <div className="poll-pie-side">
            <strong className="poll-question">{config.question}</strong>
            <ul className="poll-legend">
              {ranked.map(({ option, i }) => (
                <li
                  key={option.id}
                  className={counts[i] === top && top ? "is-winner" : undefined}
                >
                  <span
                    className="poll-swatch"
                    style={{
                      background: shades[Math.min(order[i], shades.length - 1)],
                    }}
                  />
                  <span className="poll-label">{option.label}</span>
                  <span className="poll-num">
                    {counts[i]}
                    <span className="poll-num-word">
                      {" "}
                      · {percent(counts[i], total)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {footer}
          </div>
        </div>
      )}
      {chart === "none" && (
        <div className="poll-body poll-final">
          <small className="poll-question is-quiet">{config.question}</small>
          <strong className="poll-winner">
            {winners.length === 0
              ? "Sem votos"
              : new Intl.ListFormat("pt-BR").format(
                  winners.map((w) => w.label),
                )}
          </strong>
          {top > 0 && (
            <span className="poll-score">
              {winners.length > 1 ? "Empate · " : ""}
              {top} de {votesText(total)} · {percent(top, total)}%
            </span>
          )}
          <span className="poll-others">
            {sorted
              .filter(({ count }) => count !== top || !top)
              .map(({ option, count }) => (
                <span key={option.id}>
                  {option.label} <b>{count}</b>
                </span>
              ))}
          </span>
          {footer}
        </div>
      )}
    </div>
  );
}
