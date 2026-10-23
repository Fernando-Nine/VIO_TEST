import { useState, type ReactNode } from "react";

/**
 * A value shown as text that turns into a field on click. Leaving the field
 * (blur, Enter, Tab or a click elsewhere) saves; Escape cancels. `accept`
 * returns false for invalid text, which is then discarded.
 */
export function InlineText({
  value,
  save,
  label,
  className = "",
  display,
  placeholder,
  maxLength = 120,
  numeric = false,
  disabled = false,
  accept = (text) => text.trim().length > 0,
}: {
  value: string;
  save: (text: string) => void;
  label: string;
  className?: string;
  display?: ReactNode;
  placeholder?: string;
  maxLength?: number;
  numeric?: boolean;
  disabled?: boolean;
  accept?: (text: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (disabled)
    return (
      <span className={`inline-text ${className}`}>{display ?? value}</span>
    );
  if (editing)
    return (
      <input
        className={`inline-text is-editing ${className}`}
        aria-label={label}
        defaultValue={value}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={numeric ? "numeric" : undefined}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          setEditing(false);
          const text = e.currentTarget.value.trim();
          if (text !== value.trim() && accept(text)) save(text);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          if (e.key === "Escape") e.currentTarget.value = value;
          e.currentTarget.blur();
        }}
      />
    );
  return (
    <button
      type="button"
      className={`inline-text ${className} ${value ? "" : "is-empty"}`}
      aria-label={`${label}: ${value || placeholder || "vazio"}. Clique para editar`}
      title="Clique para editar"
      onClick={() => setEditing(true)}
    >
      {display ?? (value || placeholder)}
    </button>
  );
}
