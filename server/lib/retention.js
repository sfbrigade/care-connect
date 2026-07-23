// PII retention windows.
//
// EXITED deflections remain visible in list results for this long after exit
// so staff can use the data for auditing (issue #980). The anonymization job
// (prisma/client.js) also waits for this window to close before redacting a
// subject with an exited deflection, so records never disappear mid-window.
export const EXITED_VISIBILITY_HOURS = 72;

export function exitedVisibilityCutoff (now = new Date()) {
  return new Date(now.getTime() - EXITED_VISIBILITY_HOURS * 60 * 60 * 1000);
}
