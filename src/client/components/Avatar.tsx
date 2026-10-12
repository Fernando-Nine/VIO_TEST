import { useState, type CSSProperties } from "react";
import { colorInk, normalizeColor, defaultColor } from "../../shared/colors";

/** URL is optional; no upload or account storage. The identity always keeps its ring. */
export function Avatar({
  name,
  color,
  url,
}: {
  name: string;
  color: string;
  url?: string;
}) {
  const [failed, setFailed] = useState("");
  const safeColor = normalizeColor(color) || defaultColor;
  const photo = url && /^https:\/\//i.test(url) && failed !== url;
  return (
    <span
      className="person-avatar"
      style={
        {
          "--avatar-color": safeColor,
          "--avatar-ink": colorInk(safeColor),
        } as CSSProperties
      }
      aria-label={name}
    >
      {photo ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
        />
      ) : (
        <span>
          {Array.from(name.trim())[0]?.toLocaleUpperCase("pt-BR") || "?"}
        </span>
      )}
    </span>
  );
}
