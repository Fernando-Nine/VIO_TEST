import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { Check, Plus, Palette } from "lucide-react";
import {
  colorPresets,
  colorInk,
  hexToHsv,
  hsvToHex,
  normalizeColor,
} from "../../shared/colors";
import type { Controller } from "../room/controller";
import { participantStyle } from "./participant-style";

export function ColorPicker({ engine }: { engine: Controller }) {
  const current = engine.roomColor;
  const [draft, setDraft] = useState(current);
  const [hsv, setHsv] = useState(() => hexToHsv(current));
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const hexInput = useRef<HTMLInputElement>(null);
  const color = normalizeColor(draft);
  const own = engine.view.snapshot?.participants.find(
    (p) => p.id === engine.view.id,
  );
  useEffect(() => {
    setDraft(current);
    setHsv(hexToHsv(current));
  }, [current]);
  useEffect(() => {
    if (custom) hexInput.current?.focus();
  }, [custom]);
  const select = (value: string) => {
    setDraft(value);
    setHsv(hexToHsv(value));
    setMessage("");
  };
  const adjust = (next: typeof hsv) => {
    const bounded = {
      h: next.h,
      s: Math.max(0, Math.min(1, next.s)),
      v: Math.max(0, Math.min(1, next.v)),
    };
    setHsv(bounded);
    setDraft(hsvToHex(bounded.h, bounded.s, bounded.v));
    setMessage("");
  };
  const point = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    adjust({
      ...hsv,
      s: (event.clientX - bounds.left) / bounds.width,
      v: 1 - (event.clientY - bounds.top) / bounds.height,
    });
  };
  const keys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 0.1 : 0.01;
    adjust({
      ...hsv,
      s:
        hsv.s +
        (event.key === "ArrowRight"
          ? step
          : event.key === "ArrowLeft"
            ? -step
            : 0),
      v:
        hsv.v +
        (event.key === "ArrowUp"
          ? step
          : event.key === "ArrowDown"
            ? -step
            : 0),
    });
  };
  async function apply() {
    if (!color) return;
    setSaving(true);
    setMessage("");
    try {
      await engine.setColor(color);
      setMessage("Cor aplicada para todos nesta sala.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar sua cor. Tente novamente.",
        );
    } finally {
      setSaving(false);
    }
  }
  return (
    <fieldset className="color-picker">
      <legend>
        <Palette size={17} /> Minha cor
      </legend>
      <p className="field-note">
        Fica salva neste navegador e vale nas próximas salas.
      </p>
      <div
        className="color-identity-preview"
        style={participantStyle(color || current)}
      >
        <span className="small-avatar">
          {(own?.name || "Você").slice(0, 2).toUpperCase()}
        </span>
        <div>
          <strong>{own?.name || "Você"}</strong>
          <small>Prévia da sua identidade</small>
        </div>
        <span className="color-live-sample">
          <i /> Ao vivo
        </span>
      </div>
      <div
        className="color-presets"
        role="group"
        aria-label="Cores disponíveis"
      >
        {colorPresets.map((preset) => (
          <button
            key={preset.color}
            type="button"
            className="color-swatch"
            style={{
              backgroundColor: preset.color,
              color: colorInk(preset.color),
            }}
            aria-label={preset.name}
            title={preset.name}
            aria-pressed={color === preset.color}
            onClick={() => select(preset.color)}
            disabled={saving}
          >
            {color === preset.color && <Check size={17} strokeWidth={2.5} />}
          </button>
        ))}
        <button
          type="button"
          className="color-swatch color-custom"
          aria-label="Escolher cor personalizada"
          title="Cor personalizada"
          aria-expanded={custom}
          aria-controls="custom-color-controls"
          onClick={() => setCustom(!custom)}
          disabled={saving}
        >
          <Plus size={18} />
        </button>
      </div>
      {custom && (
        <div className="custom-color-controls" id="custom-color-controls">
          <button
            type="button"
            className="color-plane"
            aria-label={`Saturação e brilho da cor ${color || current}. Use as setas para ajustar.`}
            style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
            disabled={saving}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              point(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                point(event);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={keys}
          >
            <span
              className="color-point"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: color || current,
              }}
            />
          </button>
          <label className="color-hue">
            Matiz <output>{Math.round(hsv.h)}°</output>
            <input
              aria-label="Matiz da cor"
              type="range"
              min="0"
              max="359"
              value={Math.round(hsv.h)}
              disabled={saving}
              onChange={(event) => adjust({ ...hsv, h: +event.target.value })}
            />
          </label>
          <label className="color-hex">
            Código HEX
            <span className="hex-input-wrap">
              <i style={{ backgroundColor: color || current }} />
              <input
                ref={hexInput}
                aria-label="Código HEX da cor"
                aria-invalid={!color}
                aria-describedby="color-help"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={7}
                value={draft}
                disabled={saving}
                onChange={(event) => {
                  setDraft(event.target.value);
                  const parsed = normalizeColor(event.target.value);
                  if (parsed) setHsv(hexToHsv(parsed));
                  setMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void apply();
                  }
                }}
              />
            </span>
          </label>
          <p className="field-note" id="color-help">
            {color
              ? "Arraste no quadro, use as setas ou digite um HEX com 3 ou 6 dígitos."
              : "Digite uma cor HEX válida, como #2727F5."}
          </p>
        </div>
      )}
      <div className="color-apply">
        <button
          type="button"
          className="primary"
          disabled={
            !color ||
            color === current ||
            saving ||
            engine.view.status !== "connected"
          }
          onClick={() => void apply()}
        >
          {saving ? "Aplicando…" : "Aplicar cor"}
        </button>
        <span role="status">
          {message ||
            (color !== current
              ? "Prévia · aplique para compartilhar."
              : "Cor atual da sua identidade.")}
        </span>
      </div>
    </fieldset>
  );
}
