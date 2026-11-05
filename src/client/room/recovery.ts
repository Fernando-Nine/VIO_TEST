/** Bounded frequency, not a deadline for reconnecting after a long outage. */
export function recoveryDelay(attempt: number, random = Math.random()) {
  return Math.round(
    Math.min(30000, 1000 * 2 ** Math.min(5, Math.max(0, attempt))) *
      (0.8 + random * 0.4),
  );
}
export function recoveryCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}
export function permanentRecoveryError(error: unknown) {
  return ["FORBIDDEN", "INVALID_REQUEST", "ROOM_FULL"].includes(
    recoveryCode(error) || "",
  );
}
/** Same identity elsewhere (#286): another tab, or this tab in another room. */
export const conflictText: Record<string, string> = {
  SESSION_IN_USE: "Esta sala já está aberta em outra aba.",
  ALREADY_JOINED: "Esta aba ainda está em outra sala.",
};
/**
 * Two tries, 1 s and 2 s later: both inside the farewell window, so a join
 * that beat the old page's farewell still finds the member. Then it stops.
 */
export function conflictDelay(attempt: number) {
  return attempt < 2 ? 1000 * (attempt + 1) : undefined;
}
