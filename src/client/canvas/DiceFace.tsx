import { useState, type CSSProperties } from "react";
import { defaultColor, normalizeColor } from "../../shared/colors";
import type { ModuleResult } from "../../shared/room-modules";
import type { Participant } from "../../shared/protocol";
import {
  addDie,
  critical,
  dieKind,
  groups,
  kinds,
  parts,
  type Kind,
} from "./dice-parts";
import "./dice.css";

/** Outline per die, drawn in a 24-unit box. */
const outlines: Record<Kind, string> = {
  4: "M12 3.5 21 19.5H3Z",
  6: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
  8: "M12 2.5 21 12l-9 9.5L3 12Z",
  10: "M12 2.5 21 10l-9 11.5L3 10Z",
  12: "M12 2.5 21.5 9.4 17.9 20.5H6.1L2.5 9.4Z",
  20: "M12 2.5 20.3 7.25v9.5L12 21.5l-8.3-4.75v-9.5Z",
};
/** Inner facet lines that tell similar outlines apart. */
const facets: Partial<Record<Kind, string>> = {
  8: "M3 12h18",
  10: "M3 10l9 4 9-4M12 14v7.5",
  20: "M12 7.5 16.2 15H7.8Z",
};

export function DieIcon({ kind, size = 20 }: { kind: Kind; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={outlines[kind]} />
      {facets[kind] && <path d={facets[kind]} />}
    </svg>
  );
}

function Dot({ color }: { color?: string }) {
  return (
    <span
      className="dice-dot"
      style={
        {
          "--dot": normalizeColor(color || "") || defaultColor,
        } as CSSProperties
      }
    />
  );
}

export function DiceFace({
  history,
  placeholder,
  busy,
  participants,
  roll,
}: {
  history: ModuleResult[];
  placeholder: string;
  busy: boolean;
  participants: Participant[];
  roll: (expression: string) => void;
}) {
  // Empty on purpose: the configured command shows as the suggestion.
  const [command, setCommand] = useState("");
  const last = history.at(-1);
  const color = (id: string) => participants.find((p) => p.id === id)?.color;
  const crit = !!last && critical(last);
  const lastGroups = last ? groups(last.detail) : [];
  const single = lastGroups.length === 1 && !last?.detail.includes("\n");
  const shape = dieKind(lastGroups[0]?.faces || "20");
  const rolled = lastGroups[0]?.kept.reduce((a, b) => a + b, 0) ?? 0;
  const bonus = last && single ? Number(last.label) - rolled : 0;
  // N#dX: one total per roll. Many dice or rolls read as chips, not a giant line.
  const totals = last ? last.label.split(" · ") : [];
  const repeated = totals.length > 1;
  const kept = lastGroups.flatMap((g) =>
    g.kept.map((value) => ({ value, crit: g.faces === "20" && value === 20 })),
  );
  const sum = totals.reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <div className={`dice-face ${last ? "" : "is-empty"}`}>
      <div className="dice-main">
        {last ? (
          <div className={`dice-stage ${crit ? "is-crit" : ""}`} key={last.id}>
            {!repeated && kept.length <= 3 && (
              <span
                className={`dice-big ${String(rolled).length > 2 ? "is-long" : ""}`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d={outlines[shape]} />
                </svg>
                <b>{rolled}</b>
              </span>
            )}
            {single && Number.isFinite(bonus) && bonus !== 0 && (
              <span className="dice-bonus">
                {bonus > 0 ? "+" : "−"}
                {Math.abs(bonus)}
              </span>
            )}
            {repeated ? (
              <span className="dice-total is-repeated">
                <span className="dice-chips" aria-label={last.label}>
                  {totals.map((t, i) => (
                    <span key={i}>{t}</span>
                  ))}
                </span>
                <small className="dice-summary">
                  {totals.length} rolagens · soma {sum}
                </small>
              </span>
            ) : (
              <span className="dice-total">
                <b>{last.label}</b>
                {crit && <span className="dice-crit">Crítico</span>}
              </span>
            )}
            {!repeated && kept.length > 3 && (
              <span className="dice-chips is-dice" aria-hidden="true">
                {kept.map((k, i) => (
                  <span key={i} className={k.crit ? "is-crit" : undefined}>
                    {k.value}
                  </span>
                ))}
              </span>
            )}
            <small className={`dice-line ${repeated ? "is-repeated" : ""}`}>
              <span className="dice-parts">
                {last.expression}
                {repeated ? "" : ` · ${parts(last)}`}
              </span>
              <span className="dice-author"> · {last.authorName}</span>
            </small>
            <small className="dice-who">
              {last.authorName} rolou {last.expression}
            </small>
          </div>
        ) : (
          <p className="dice-empty">Ninguém rolou ainda.</p>
        )}
        <div className="dice-pad" role="group" aria-label="Adicionar dado">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-label={`Adicionar d${kind}`}
              onClick={() => setCommand((c) => addDie(c, kind))}
            >
              <DieIcon kind={kind} />
              <span>d{kind}</span>
            </button>
          ))}
        </div>
        <form
          className="dice-roll"
          onSubmit={(e) => {
            e.preventDefault();
            roll(command.trim() || placeholder);
          }}
        >
          <input
            aria-label="Comando dos dados"
            placeholder={`Ex.: ${placeholder}`}
            value={command}
            maxLength={200}
            readOnly={busy}
            spellCheck={false}
            onChange={(e) => setCommand(e.target.value)}
          />
          <button className="primary" disabled={busy}>
            Rolar
          </button>
        </form>
      </div>
      <aside className="dice-history" aria-label="Histórico">
        <strong>Histórico</strong>
        {history.length ? (
          <ol>
            {[...history].reverse().map((r) => {
              const many = r.label.includes(" · ");
              return (
                <li key={r.id} className={critical(r) ? "is-crit" : undefined}>
                  <Dot color={color(r.authorId)} />
                  <span className="dice-history-who">
                    <span>{r.authorName}</span>
                    <code
                      title={`${r.expression} · ${many ? r.label : parts(r)}`}
                    >
                      {r.expression}
                      {many ? (
                        <span> · {r.label}</span>
                      ) : (
                        <span className="dice-history-parts">
                          {" "}
                          · {parts(r)}
                        </span>
                      )}
                    </code>
                  </span>
                  {!many && <b>{r.label}</b>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="dice-empty">Ninguém rolou ainda.</p>
        )}
      </aside>
    </div>
  );
}
