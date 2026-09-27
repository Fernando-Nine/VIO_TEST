import type { CSSProperties } from "react";
import {
  colorInk,
  defaultColor,
  normalizeColor,
  readableAccent,
} from "../../shared/colors";

export function participantStyle(
  color = defaultColor,
  accents = true,
): CSSProperties {
  const selected = normalizeColor(color) || defaultColor;
  return {
    "--person-color": selected,
    "--person-ink": colorInk(selected),
    "--person-accent": readableAccent(accents ? selected : defaultColor),
  } as CSSProperties;
}
