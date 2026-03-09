export function sanitizeManualCodeInput (value) {
  return value.replace(/\D/g, '').slice(0, 6);
}
