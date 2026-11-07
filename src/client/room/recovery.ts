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
 * Three tries, 1 s, 2 s and 4 s later. The first two fall inside the farewell
 * window, so a join that beat the old page's farewell still finds the member.
 * With the server's probe (2 s each), the last one lands past its 12 s quiet
 * mark (#301), so a dead holder is let go before the page gives up.
 */
export function conflictDelay(attempt: number) {
  return attempt < 3 ? 1000 * 2 ** attempt : undefined;
}
