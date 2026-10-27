import { useEffect, useState, type ReactNode } from "react";
import "./timer.css";
import {
  ArrowLeftRight,
  BellOff,
  Flag,
  Pause,
  Play,
  Repeat,
  RotateCcw,
} from "lucide-react";
import type { MenuItem } from "../components/ContextMenu";
import {
  timerDisplay,
  timerElapsed,
  timerAlarmMs,
  timerEndsAt,
  timerFinished,
  timerLapLimit,
  lapTimes,
  type WidgetBlock,
  type WidgetOperation,
} from "../../shared/widgets";
import type { Controller } from "../room/controller";

type Timer = Extract<WidgetBlock, { kind: "timer" }>;
const modeName = { down: "Temporizador", up: "Cronômetro" } as const;

export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = `${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}` : mm;
}

/** Accepts "25" (minutes), "mm:ss" or "h:mm:ss"; null when not a valid length. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d{1,4}$/.test(p.trim())))
    return null;
  const values = parts.map(Number);
  const seconds =
    values.length === 1
      ? values[0] * 60
      : values.reduce((total, v) => total * 60 + v, 0);
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}

const ringEvery = 1_200;

/**
 * Rings for every viewer, even while the widget is off screen. The alarm is
 * part of the widget's state: it rings from the end of a countdown until
 * anyone turns it off (for a room widget, for the whole room) or a minute
 * passes. A repeating countdown chimes once per lap instead.
 */
function useEndAlarm(block: Timer, engine: Controller) {
  const { startedAt, elapsed, duration, loop, silenced } = block;
  const end = timerEndsAt(block);
  const [ringing, setRinging] = useState(false);
  useEffect(() => {
    if (startedAt === null || !duration || !loop) return;
    const done = timerElapsed(
      { ...block, startedAt, elapsed, duration, loop },
      engine.serverNow(),
    );
    let repeat: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(
      () => {
        void engine.playCue("timer-end");
        repeat = setInterval(
          () => void engine.playCue("timer-end"),
          duration * 1000,
        );
      },
      (duration - done) * 1000,
    );
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
    // The block object changes on every revision; only timing fields matter.
  }, [startedAt, elapsed, duration, loop, engine]);
  useEffect(() => {
    if (end === null || silenced) return;
    const now = engine.serverNow();
    if (now >= end + timerAlarmMs) return;
    let ring: ReturnType<typeof setInterval> | undefined;
    const begin = setTimeout(
      () => {
        setRinging(true);
        void engine.playCue("timer-end");
        ring = setInterval(() => void engine.playCue("timer-end"), ringEvery);
      },
      Math.max(0, end - now),
    );
    const stop = setTimeout(
      () => {
        clearInterval(ring);
        setRinging(false);
      },
      end + timerAlarmMs - now,
    );
    return () => {
      clearTimeout(begin);
      clearTimeout(stop);
      clearInterval(ring);
      setRinging(false);
    };
  }, [end, silenced, engine]);
  return ringing;
}

const switchedMode = (block: Timer): Timer => {
  const other =
    (block.mode || (block.duration ? "down" : "up")) === "down" ? "up" : "down";
  return {
    ...block,
    elapsed: 0,
    startedAt: null,
    mode: other,
    duration: other === "down" ? block.duration || 1500 : 0,
    loop: other === "down" && !!block.loop,
    laps: undefined,
  };
};

/** Mode and repeat, for the header menu when the space is too small to show them. */
export function timerMenu(
  block: Timer,
  update: (next: Timer) => void,
): MenuItem[] {
  const mode = block.mode || (block.duration ? "down" : "up");
  return [
    {
      label: `Trocar para ${modeName[mode === "down" ? "up" : "down"]}`,
      icon: ArrowLeftRight,
      run: () => update(switchedMode(block)),
    },
    ...(mode === "down"
      ? [
          {
            label: block.loop ? "Não repetir" : "Repetir ao chegar ao final",
            icon: Repeat,
            run: () => update({ ...block, loop: !block.loop }),
          },
        ]
      : []),
  ];
}

const presets = [5, 10, 25];

function Ring({
  progress,
  children,
}: {
  progress: number;
  children: ReactNode;
}) {
  return (
    <div className="timer-ring">
      <svg aria-hidden="true">
        <circle className="timer-ring-track" />
        {progress > 0 && (
          <circle
            className="timer-ring-progress"
            pathLength={1}
            strokeDasharray={`${Math.min(1, progress)} 1`}
          />
        )}
      </svg>
      <div className="timer-ring-text">{children}</div>
    </div>
  );
}

export function TimerBlock({
  block,
  now,
  engine,
  editable,
  controllable,
  act,
  update,
  revision,
}: {
  block: Timer;
  revision: number;
  now: number;
  engine: Controller;
  editable: boolean;
  /** Start, pause, reset and the alarm; the room may allow this without editing. */
  controllable: boolean;
  act: (operation: WidgetOperation) => void;
  update: (next: Timer) => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  const ringing = useEndAlarm(block, engine);
  const mode = block.mode || (block.duration ? "down" : "up");
  const finished = timerFinished(block, now);
  const running = block.startedAt !== null && !finished;
  const stopped = { elapsed: 0, startedAt: null, laps: undefined };
  const timeEditable = editable && mode === "down" && !running && !ringing;
  const shown = timerDisplay(block, now);
  const laps = lapTimes(block);
  const best = laps.length > 1 ? Math.min(...laps) : -1;
  const progress =
    mode === "down"
      ? block.duration
        ? shown / block.duration
        : 0
      : (timerElapsed(block, now) % 60) / 60;
  const run = (action: "start" | "pause" | "reset" | "silence" | "lap") =>
    act({ kind: "timer", blockId: block.id, action, revision });
  function commitTime(input: HTMLInputElement) {
    setEditingTime(false);
    const seconds = parseClock(input.value);
    if (seconds !== null && seconds !== block.duration)
      update({ ...block, ...stopped, duration: seconds });
  }
  function setMode(next: "up" | "down") {
    if (next !== mode) update(switchedMode(block));
  }
  const time =
    timeEditable && editingTime ? (
      <input
        className="timer-time timer-input"
        aria-label="Duração em minutos ou mm:ss"
        defaultValue={clock(block.duration)}
        autoFocus
        inputMode="numeric"
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commitTime(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.value = clock(block.duration);
          if (e.key === "Enter" || e.key === "Escape") {
            e.stopPropagation();
            e.currentTarget.blur();
          }
        }}
      />
    ) : timeEditable ? (
      <button
        className="timer-time timer-edit"
        title="Clique para editar o tempo"
        aria-label={`Tempo ${clock(shown)}. Editar duração`}
        onClick={() => setEditingTime(true)}
      >
        {clock(shown)}
      </button>
    ) : (
      <output className="timer-time" aria-label="Tempo do cronômetro">
        {clock(shown)}
        {mode === "up" && (
          <small className="timer-tenths">
            .{Math.floor((shown * 10) % 10)}
          </small>
        )}
      </output>
    );
  return (
    <div
      className={`timer-face mode-${mode} ${ringing ? "is-ringing" : ""} ${finished ? "is-finished" : ""}`}
    >
      <Ring progress={ringing ? 1 : progress}>
        {time}
        <small className="timer-sub">
          {mode === "down"
            ? finished
              ? `${clock(block.duration)} concluídos`
              : `de ${clock(block.duration)}${block.loop ? " · repete" : ""}`
            : laps.length > 0
              ? `Volta ${laps.length} · ${clock(laps[laps.length - 1])}`
              : null}
        </small>
      </Ring>
      <div className="timer-side">
        {ringing ? (
          <strong className="timer-done">Tempo esgotado</strong>
        ) : editable ? (
          <div className="timer-seg" role="group" aria-label="Modo">
            {(["down", "up"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {modeName[m]}
              </button>
            ))}
          </div>
        ) : (
          <small className="timer-mode-label">{modeName[mode]}</small>
        )}
        {!ringing && mode === "down" && editable && (
          <div className="timer-presets" role="group" aria-label="Atalhos">
            {presets.map((min) => (
              <button
                key={min}
                className="timer-chip"
                aria-pressed={block.duration === min * 60}
                onClick={() =>
                  block.duration !== min * 60 &&
                  update({ ...block, ...stopped, duration: min * 60 })
                }
              >
                {min} min
              </button>
            ))}
          </div>
        )}
        {!ringing && mode === "up" && laps.length > 0 && (
          <ol className="timer-laps" aria-label="Voltas">
            {laps
              .map((lap, i) => (
                <li key={i} className={lap === best ? "is-best" : undefined}>
                  <span>Volta {i + 1}</span>
                  <span>
                    {clock(lap)}.{Math.floor((lap * 10) % 10)}
                  </span>
                </li>
              ))
              .reverse()}
          </ol>
        )}
        {controllable && (
          <div className="timer-actions">
            {ringing ? (
              <button className="primary" onClick={() => run("silence")}>
                <BellOff size={16} aria-hidden="true" />
                Desligar
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => run(running ? "pause" : "start")}
              >
                {running ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {finished ? "Reiniciar" : running ? "Pausar" : "Iniciar"}
              </button>
            )}
            {!ringing &&
              (mode === "up" && running
                ? (block.laps?.length ?? 0) < timerLapLimit && (
                    <button
                      className="secondary"
                      aria-label="Volta"
                      title="Volta"
                      onClick={() => run("lap")}
                    >
                      <Flag size={16} aria-hidden="true" />
                      <span>Volta</span>
                    </button>
                  )
                : (block.elapsed > 0 || block.startedAt !== null) &&
                  !finished && (
                    <button
                      className="secondary"
                      aria-label="Reiniciar"
                      title="Reiniciar"
                      onClick={() => run("reset")}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      <span>Reiniciar</span>
                    </button>
                  ))}
          </div>
        )}
        {!controllable && !ringing && (
          // Who cannot control sees the state, never a dead button.
          <small className="timer-state" role="status">
            {finished
              ? "Concluído"
              : running
                ? "Em andamento"
                : block.elapsed > 0
                  ? "Pausado"
                  : "Parado"}
          </small>
        )}
      </div>
    </div>
  );
}
