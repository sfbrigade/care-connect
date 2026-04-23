export const HOLD_DURATION_MINUTES = 90;

export function holdExpiresAt (now = Date.now()) {
  return new Date(now + HOLD_DURATION_MINUTES * 60 * 1000);
}
