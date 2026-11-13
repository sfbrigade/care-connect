// How long EXITED deflections stay visible in list results, measured from
// exitedAt. The anonymization job also waits for this window to close.
export const EXITED_VISIBILITY_HOURS = 72;

export function exitedVisibilityCutoff (now = new Date()) {
  return new Date(now.getTime() - EXITED_VISIBILITY_HOURS * 60 * 60 * 1000);
}
