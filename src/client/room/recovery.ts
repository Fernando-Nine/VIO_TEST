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
