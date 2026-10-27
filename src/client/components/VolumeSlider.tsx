import type { CSSProperties } from "react";

/** Arrow keys move 5%, Page Up/Down 25% (docs/design/volume.md). */
export function volumeKeyStep(key: string) {
  return (
    {
      ArrowUp: 0.05,
      ArrowRight: 0.05,
      ArrowDown: -0.05,
      ArrowLeft: -0.05,
      PageUp: 0.25,
      PageDown: -0.25,
    } as Record<string, number>
  )[key];
}
export function clampVolume(value: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * The volume number: gold above 100%; double click goes back to 100%.
 */
export function VolumeNumber({
  value,
  reset,
}: {
  value: number;
  reset?: () => void;
}) {
  return (
    <output
      className={`volume-number ${value > 1 ? "is-boost" : ""}`}
      title={reset ? "Clique duplo volta a 100%" : undefined}
      onDoubleClick={reset}
    >
      {Math.round(value * 100)}%
    </output>
  );
}

/**
 * One volume track for screens and people: a mark at 100% and the stretch
 * above it in gold. Values are fractions (1 = 100%). Only local playback.
 */
export function VolumeSlider({
  value,
  max,
  label,
  onChange,
  id,
  step = 0.05,
  disabled,
  vertical,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
  id?: string;
  step?: number;
  disabled?: boolean;
  vertical?: boolean;
}) {
  const style = {
    "--fill": Math.min(value, max) / max,
    "--unity": Math.min(1, max) / max,
  } as CSSProperties;
  return (
    <span
      className={`volume-slider ${vertical ? "is-vertical" : ""} ${max > 1 ? "has-boost" : ""}`}
      style={style}
    >
      <input
        id={id}
        type="range"
        aria-label={label}
        aria-orientation={vertical ? "vertical" : undefined}
        aria-valuetext={`${Math.round(value * 100)}%`}
        min={0}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onKeyDown={(event) => {
          const delta = volumeKeyStep(event.key);
          if (delta === undefined) return;
          event.preventDefault();
          onChange(clampVolume(value + delta, max));
        }}
        onChange={(event) => onChange(+event.target.value)}
      />
    </span>
  );
}
