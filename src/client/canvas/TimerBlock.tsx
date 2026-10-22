import { useEffect, useState } from "react";
import { ArrowLeftRight, Repeat } from "lucide-react";
import {
  timerDisplay,
  timerElapsed,
  timerFinished,
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

/** Plays the end cue for every viewer, even while the widget is off screen. */
function useEndSound(block: Timer, engine: Controller) {
  const { startedAt, elapsed, duration, loop } = block;
  useEffect(() => {
    if (startedAt === null || !duration) return;
    const timer = { ...block, startedAt, elapsed, duration, loop };
    const done = timerElapsed(timer, engine.serverNow());
    if (!loop && done >= duration) return;
    let repeat: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(
      () => {
        void engine.playCue("timer-end");
        if (loop)
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
}

export function TimerBlock({
  block,
  now,
  engine,
  editable,
  act,
  update,
  revision,
}: {
  block: Timer;
  revision: number;
  now: number;
  engine: Controller;
  editable: boolean;
  act: (operation: WidgetOperation) => void;
  update: (next: Timer) => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  useEndSound(block, engine);
  const mode = block.mode || (block.duration ? "down" : "up");
  const other = mode === "down" ? "up" : "down";
  const finished = timerFinished(block, now);
  const running = block.startedAt !== null && !finished;
  const stopped = { elapsed: 0, startedAt: null };
  const timeEditable = editable && mode === "down" && !running;
  function commitTime(input: HTMLInputElement) {
    setEditingTime(false);
    const seconds = parseClock(input.value);
    if (seconds !== null && seconds !== block.duration)
      update({ ...block, ...stopped, duration: seconds });
  }
  return (
    <>
      {editable ? (
        <div className="timer-modes" role="group" aria-label="Modo">
          <button
            className="timer-mode"
            aria-label={`Modo ${modeName[mode]}. Trocar para ${modeName[other]}`}
            title={`Trocar para ${modeName[other]}`}
            onClick={() =>
              update({
                ...block,
                ...stopped,
                mode: other,
                duration: other === "down" ? block.duration || 1500 : 0,
                loop: other === "down" && !!block.loop,
              })
            }
          >
            <ArrowLeftRight size={13} aria-hidden="true" />
            {modeName[mode]}
          </button>
          {mode === "down" && (
            <button
              className="icon-button"
              aria-pressed={!!block.loop}
              aria-label="Repetir ao chegar ao final"
              title="Repetir ao chegar ao final"
              onClick={() => update({ ...block, loop: !block.loop })}
            >
              <Repeat size={15} />
            </button>
          )}
        </div>
      ) : (
        <small className="timer-mode-label">
          {modeName[mode]}
          {block.loop && " · repete"}
        </small>
      )}
      {timeEditable && editingTime ? (
        <input
          className="widget-clock timer-input"
          aria-label="Duração em minutos ou mm:ss"
          defaultValue={clock(block.duration)}
          autoFocus
          inputMode="numeric"
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => commitTime(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Escape")
              e.currentTarget.value = clock(block.duration);
            if (e.key === "Enter" || e.key === "Escape") {
              e.stopPropagation();
              e.currentTarget.blur();
            }
          }}
        />
      ) : timeEditable ? (
        <button
          className="widget-clock timer-edit"
          title="Clique para editar o tempo"
          aria-label={`Tempo ${clock(timerDisplay(block, now))}. Editar duração`}
          onClick={() => setEditingTime(true)}
        >
          {clock(timerDisplay(block, now))}
        </button>
      ) : (
        <output className="widget-clock" aria-label="Tempo do cronômetro">
          {clock(timerDisplay(block, now))}
        </output>
      )}
      <div className="widget-inline-actions">
        <button
          className="secondary"
          onClick={() =>
            act({
              kind: "timer",
              blockId: block.id,
              action: block.startedAt === null || finished ? "start" : "pause",
              revision,
            })
          }
        >
          {finished ? "Reiniciar" : running ? "Pausar" : "Iniciar"}
        </button>
        {(block.elapsed > 0 || block.startedAt !== null) && (
          <button
            className="text-button"
            onClick={() =>
              act({
                kind: "timer",
                blockId: block.id,
                action: "reset",
                revision,
              })
            }
          >
            Zerar
          </button>
        )}
      </div>
    </>
  );
}
