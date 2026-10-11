export const WHEEL_IDLE_MS = 150;
export const STRIP_ANIMATION_MS = 300;

export function wheelPixels(delta: number, mode: number, page: number) {
  return delta * (mode === 1 ? 16 : mode === 2 ? page : 1);
}
export function nearestStop(
  position: number,
  stops: number[],
  maximum: number,
) {
  return [...stops, maximum].reduce((best, stop) => {
    const value = Math.max(0, Math.min(maximum, stop));
    return Math.abs(value - position) < Math.abs(best - position)
      ? value
      : best;
  }, 0);
}
export function wheelTarget(
  position: number,
  delta: number,
  stops: number[],
  maximum: number,
  continuous: boolean,
) {
  if (continuous) return Math.max(0, Math.min(maximum, position + delta));
  const nearest = nearestStop(position, stops, maximum);
  const candidates = [...new Set([...stops, maximum])].sort((a, b) => a - b);
  return delta > 0
    ? Math.min(
        maximum,
        candidates.find((stop) => stop > nearest + 1) ?? maximum,
      )
    : Math.max(0, candidates.reverse().find((stop) => stop < nearest - 1) ?? 0);
}
