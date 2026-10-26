import { useState } from "react";
import { hexToHsv, hsvToHex, normalizeColor } from "../../shared/colors";
import {
  paletteColors,
  paletteIds,
  paletteNames,
  type PaletteId,
} from "../../shared/palettes";
import "./raffle.css";

/** Swatches, hue and HEX: the shared color picker of the widgets. */
export function ColorFields({
  color,
  choices,
  pick,
  done,
}: {
  color: string;
  choices: string[];
  pick: (color: string) => void;
  /** Enter on a valid HEX picks it and calls this. */
  done?: () => void;
}) {
  const [hex, setHex] = useState(color);
  const valid = normalizeColor(hex);
  const hsv = hexToHsv(valid || color);
  return (
    <div className="color-fields">
      <div className="raffle-swatches">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={c === valid}
            style={{ background: c }}
            onClick={() => {
              setHex(c);
              pick(c);
            }}
          />
        ))}
      </div>
      <label className="color-hue">
        <input
          aria-label="Matiz da cor"
          type="range"
          min="0"
          max="359"
          value={Math.round(hsv.h)}
          onChange={(e) =>
            setHex(hsvToHex(+e.target.value, hsv.s || 0.6, hsv.v || 0.8))
          }
          onPointerUp={() => valid && pick(valid)}
          onKeyUp={() => valid && pick(valid)}
        />
      </label>
      <label className="raffle-hex">
        <i style={{ background: valid || color }} />
        <input
          aria-label="Código HEX da cor"
          value={hex}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) {
              pick(valid);
              done?.();
            }
          }}
          onBlur={() => valid && valid !== color && pick(valid)}
        />
      </label>
    </div>
  );
}

/** The palette list of "Cor e paleta". */
export function PaletteChoice({
  current,
  choose,
}: {
  current: PaletteId | undefined;
  choose: (id: PaletteId) => void;
}) {
  return (
    <div className="palette-choice" role="group" aria-label="Paletas">
      {paletteIds.map((id) => (
        <button
          key={id}
          aria-pressed={current === id}
          onClick={() => choose(id)}
        >
          <span aria-hidden="true">
            {(id === "random" ? [] : paletteColors(id, [])).map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          {paletteNames[id]}
        </button>
      ))}
    </div>
  );
}
