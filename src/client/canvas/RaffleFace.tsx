import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { Minus, Palette, PieChart, Plus, Shuffle } from "lucide-react";
import { AnchoredPopover } from "../components/AnchoredPopover";
import type { MenuItem } from "../components/ContextMenu";
import { HeaderTools } from "./header-tools";
import { InlineText } from "./InlineText";
import { hexToHsv, hsvToHex, normalizeColor } from "../../shared/colors";
import {
  colorAt,
  harmonyPalette,
  paletteColors,
  paletteIds,
  paletteNames,
  palettes,
  sliceInk,
  swatches,
  type PaletteId,
} from "../../shared/palettes";
import type { ModuleConfig, ModuleState } from "../../shared/room-modules";
import "./raffle.css";

type Raffle = Extract<ModuleConfig, { kind: "random" }>;
type Option = Raffle["options"][number];

/** Showing the wheel is a personal choice, kept on this device. */
const wheelKey = "vio:raffle-wheel";
const wheelListeners = new Set<() => void>();
let wheelShown: boolean | undefined;
function readWheel() {
  if (wheelShown === undefined)
    try {
      wheelShown = localStorage.getItem(wheelKey) !== "0";
    } catch {
      wheelShown = true;
    }
  return wheelShown;
}
function setWheel(shown: boolean) {
  wheelShown = shown;
  try {
    localStorage.setItem(wheelKey, shown ? "1" : "0");
  } catch {
    /* Preferences are optional. */
  }
  wheelListeners.forEach((listener) => listener());
}
export function useWheel() {
  return useSyncExternalStore((listener) => {
    wheelListeners.add(listener);
    return () => wheelListeners.delete(listener);
  }, readWheel);
}
export function wheelMenu(): MenuItem {
  const shown = readWheel();
  return {
    label: shown ? "Ocultar roleta" : "Mostrar roleta",
    icon: PieChart,
    run: () => setWheel(!shown),
  };
}

/** Each option's color: its own, else the palette's in order. */
export function optionColors(config: Raffle) {
  const base = paletteColors(
    config.palette,
    config.options.map((o) => o.color),
  );
  return config.options.map(
    (o, i) => normalizeColor(o.color || "") || colorAt(base, i),
  );
}
/** Applies a palette to every option; "random" draws a new harmony each time. */
export function withPalette(config: Raffle, id: PaletteId): Raffle {
  const colors = id === "random" ? harmonyPalette() : palettes[id];
  return {
    ...config,
    palette: id,
    options: config.options.map((o, i) => ({
      ...o,
      color: colorAt(colors, i),
    })),
  };
}

function polar(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [50 + radius * Math.cos(rad), 50 + radius * Math.sin(rad)];
}
function slicePath(start: number, end: number) {
  if (end - start >= 359.99) return "M50 2a48 48 0 1 1 0 96a48 48 0 1 1 0-96Z";
  const [x1, y1] = polar(start, 48);
  const [x2, y2] = polar(end, 48);
  return `M50 50L${x1} ${y1}A48 48 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
}

function Wheel({
  slices,
  landOn,
  spinKey,
}: {
  slices: { option: Option; color: string }[];
  landOn: string | undefined;
  spinKey: string | undefined;
}) {
  const total = slices.reduce((sum, s) => sum + s.option.weight, 0) || 1;
  let at = 0;
  const arcs = slices.map((s) => {
    const start = at;
    at += (s.option.weight / total) * 360;
    return { ...s, start, end: at };
  });
  const target = arcs.find((a) => a.option.id === landOn);
  const center = target ? (target.start + target.end) / 2 : 0;
  // The wheel turns so the drawn slice stops under the pointer.
  const [rotation, setRotation] = useState(-center);
  const [spinning, setSpinning] = useState(false);
  const seen = useRef(spinKey);
  useEffect(() => {
    if (seen.current === spinKey) return;
    seen.current = spinKey;
    setSpinning(true);
    setRotation((r) => {
      const rest = (((-center - r) % 360) + 360) % 360;
      return r + 720 + rest;
    });
  }, [spinKey, center]);
  return (
    <div className="raffle-wheel">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g
          className={spinning ? "is-spinning" : undefined}
          style={{ transform: `rotate(${rotation}deg)` }}
          onTransitionEnd={() => setSpinning(false)}
        >
          {arcs.map((a) => (
            <path
              key={a.option.id}
              d={slicePath(a.start, a.end)}
              fill={a.color}
            />
          ))}
          {arcs.map((a) => {
            const mid = (a.start + a.end) / 2;
            const [x, y] = polar(mid, 30);
            const flip = mid > 180;
            return (
              <text
                key={a.option.id}
                className="raffle-slice-label"
                x={x}
                y={y}
                fill={sliceInk(a.color)}
                transform={`rotate(${mid + (flip ? 90 : -90)} ${x} ${y})`}
              >
                {a.option.label.length > 14
                  ? `${a.option.label.slice(0, 13)}…`
                  : a.option.label}
              </text>
            );
          })}
        </g>
        <circle className="raffle-hub" cx="50" cy="50" r="7" />
        <path className="raffle-pointer" d="M46.5 0h7L50 6Z" />
      </svg>
    </div>
  );
}

function ColorPop({
  anchor,
  color,
  choices,
  pick,
  close,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  color: string;
  choices: string[];
  pick: (color: string) => void;
  close: () => void;
}) {
  const [hex, setHex] = useState(color);
  const hsv = hexToHsv(normalizeColor(hex) || color);
  return (
    <AnchoredPopover
      anchor={anchor}
      id="raffle-color"
      className="raffle-pop raffle-colors"
      label="Cor da opção"
      close={close}
    >
      <div className="raffle-swatches">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={c === normalizeColor(hex)}
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
          onPointerUp={() => normalizeColor(hex) && pick(normalizeColor(hex)!)}
          onKeyUp={() => normalizeColor(hex) && pick(normalizeColor(hex)!)}
        />
      </label>
      <label className="raffle-hex">
        <i style={{ background: normalizeColor(hex) || color }} />
        <input
          aria-label="Código HEX da cor"
          value={hex}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && normalizeColor(hex)) {
              pick(normalizeColor(hex)!);
              close();
            }
          }}
          onBlur={() => normalizeColor(hex) && pick(normalizeColor(hex)!)}
        />
      </label>
    </AnchoredPopover>
  );
}

export function RaffleFace({
  config,
  state,
  busy,
  editable,
  current,
  save,
  draw,
}: {
  config: Raffle;
  state: ModuleState;
  busy: boolean;
  editable: boolean;
  current: () => ModuleConfig;
  save: (next: Raffle) => void;
  draw: () => void;
}) {
  const shown = useWheel();
  const [colorFor, setColorFor] = useState<string | null>(null);
  const [palettesOpen, setPalettesOpen] = useState(false);
  const colorAnchor = useRef<HTMLButtonElement | null>(null);
  const paletteAnchor = useRef<HTMLButtonElement>(null);
  const colors = optionColors(config);
  const drawn = new Set(config.removeDrawn ? state.drawn : []);
  const last = state.history?.at(-1);
  const lastId = config.removeDrawn
    ? state.drawn?.at(-1)
    : config.options.find((o) => o.label === last?.label)?.id;
  const left = config.options.filter((o) => !drawn.has(o.id)).length;
  // The option just drawn stays on the wheel until the next draw, so it can land.
  const slices = config.options
    .map((option, i) => ({ option, color: colors[i] }))
    .filter(({ option }) => !drawn.has(option.id) || option.id === lastId);
  const latest = () => {
    const base = current();
    return base.kind === "random" ? base : config;
  };
  const patch = (id: string, values: Partial<Option>) => {
    const base = latest();
    save({
      ...base,
      options: base.options.map((o) => (o.id === id ? { ...o, ...values } : o)),
    });
  };
  const choices = swatches(
    paletteColors(
      config.palette,
      config.options.map((o) => o.color),
    ),
  );
  return (
    <div className={`raffle-face ${shown ? "" : "no-wheel"}`}>
      <HeaderTools>
        {editable && (
          <button
            ref={paletteAnchor}
            className="icon-button"
            aria-label="Paletas"
            title="Paletas"
            aria-expanded={palettesOpen}
            onClick={() => setPalettesOpen(!palettesOpen)}
          >
            <Palette size={14} />
          </button>
        )}
        <button
          className="icon-button"
          aria-label={shown ? "Ocultar roleta" : "Mostrar roleta"}
          title={shown ? "Ocultar roleta" : "Mostrar roleta"}
          aria-pressed={shown}
          onClick={() => setWheel(!shown)}
        >
          <PieChart size={14} />
        </button>
      </HeaderTools>
      {palettesOpen && (
        <AnchoredPopover
          anchor={paletteAnchor}
          id="raffle-palettes"
          className="raffle-pop raffle-palettes"
          label="Paletas"
          close={() => setPalettesOpen(false)}
        >
          {paletteIds.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={(config.palette || "indigo") === id}
              className={id === "random" ? "is-random" : undefined}
              onClick={() => {
                save(withPalette(latest(), id));
                if (id !== "random") setPalettesOpen(false);
              }}
            >
              {id === "random" ? (
                <Shuffle size={15} aria-hidden="true" />
              ) : (
                <span className="raffle-strip" aria-hidden="true">
                  {palettes[id].map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
              )}
              {paletteNames[id]}
            </button>
          ))}
        </AnchoredPopover>
      )}
      {shown && <Wheel slices={slices} landOn={lastId} spinKey={last?.id} />}
      <div className="raffle-side">
        <div className="raffle-result" aria-live="polite">
          <strong>{last?.label || "Pronto para sortear"}</strong>
          <small>
            {config.removeDrawn ? `Restam ${left}` : `${left} opções`}
          </small>
        </div>
        <ul className="raffle-list">
          {config.options.map((option, i) => {
            const out = drawn.has(option.id);
            return (
              <li key={option.id} className={out ? "is-drawn" : undefined}>
                {editable && !out ? (
                  <button
                    type="button"
                    className="raffle-chip"
                    aria-label={`Cor de ${option.label}`}
                    style={{ "--chip": colors[i] } as CSSProperties}
                    onClick={(e) => {
                      colorAnchor.current = e.currentTarget;
                      setColorFor(colorFor === option.id ? null : option.id);
                    }}
                  />
                ) : (
                  <span
                    className="raffle-chip"
                    style={{ "--chip": colors[i] } as CSSProperties}
                  />
                )}
                {editable && !out ? (
                  <InlineText
                    className="raffle-name"
                    label={`Texto da opção ${i + 1}`}
                    value={option.label}
                    save={(label) => patch(option.id, { label })}
                  />
                ) : (
                  <span className="raffle-name">{option.label}</span>
                )}
                {out ? (
                  <small className="raffle-out">sorteado</small>
                ) : editable ? (
                  <span className="raffle-weight">
                    <button
                      type="button"
                      aria-label={`Diminuir peso de ${option.label}`}
                      disabled={option.weight <= 1}
                      onClick={() =>
                        patch(option.id, { weight: option.weight - 1 })
                      }
                    >
                      <Minus size={12} />
                    </button>
                    <span>×{option.weight}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar peso de ${option.label}`}
                      disabled={option.weight >= 1000}
                      onClick={() =>
                        patch(option.id, { weight: option.weight + 1 })
                      }
                    >
                      <Plus size={12} />
                    </button>
                  </span>
                ) : (
                  <small className="raffle-out">×{option.weight}</small>
                )}
              </li>
            );
          })}
        </ul>
        <div className="raffle-actions">
          {editable && (
            <label className="raffle-switch">
              <input
                type="checkbox"
                role="switch"
                checked={config.removeDrawn}
                onChange={(e) =>
                  save({ ...latest(), removeDrawn: e.target.checked })
                }
              />
              Retirar sorteados
            </label>
          )}
          <button
            className="primary raffle-draw"
            disabled={busy || left === 0}
            onClick={draw}
          >
            Sortear
          </button>
        </div>
      </div>
      {colorFor && config.options.some((o) => o.id === colorFor) && (
        <ColorPop
          key={colorFor}
          anchor={colorAnchor}
          color={colors[config.options.findIndex((o) => o.id === colorFor)]}
          choices={choices}
          pick={(color) => patch(colorFor, { color })}
          close={() => setColorFor(null)}
        />
      )}
    </div>
  );
}
