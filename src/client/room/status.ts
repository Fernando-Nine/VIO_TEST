export function formatDuration(total: number) {
  const seconds = Math.max(0, Math.floor(total));
  if (seconds >= 100 * 3600) return "99:59:59+";
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function connectionMetric(
  status: string,
  serverPing: number | undefined,
  hasScreens: boolean,
  peers: Array<{ state: string; rtt?: number }>,
) {
  const source = hasScreens ? "Tela" : "Servidor";
  if (status !== "connected")
    return {
      source,
      label: status === "failed" ? "Sem conexão" : "Conectando",
      tone: status === "failed" ? "bad" : "warn",
      quality: "Conexão com a sala interrompida",
    };
  if (
    hasScreens &&
    peers.some((p) => p.state === "failed" || p.state === "disconnected")
  )
    return {
      source,
      label: "Reconectando",
      tone: "bad",
      quality: "Uma conexão de tela foi interrompida",
    };
  const values = peers
    .filter((p) => p.state === "connected" && Number.isFinite(p.rtt))
    .map((p) => p.rtt!);
  const rtt = hasScreens
    ? values.length
      ? Math.max(...values)
      : undefined
    : serverPing;
  if (rtt === undefined || !Number.isFinite(rtt))
    return {
      source,
      label: "Aguardando",
      tone: "pending",
      quality: "Ainda sem medida de latência",
    };
  const tone = rtt < 100 ? "good" : rtt <= 250 ? "warn" : "bad";
  return {
    source,
    label: `${Math.round(rtt)} ms`,
    tone,
    quality:
      tone === "good"
        ? "Latência baixa"
        : tone === "warn"
          ? "Latência moderada"
          : "Latência alta",
  };
}
/** "1 h 24 min" for tooltips; minutes only below an hour. */
export function spokenDuration(total: number) {
  const minutes = Math.floor(Math.max(0, total) / 60);
  const hours = Math.floor(minutes / 60);
  if (!hours) return `${minutes} min`;
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}
