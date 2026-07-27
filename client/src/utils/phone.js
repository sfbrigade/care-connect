// US phone input → E.164 (+1XXXXXXXXXX). Returns null if not a valid 10-digit
// US number (accepts any punctuation; strips to digits).
export function toE164US (input) {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// E.164 → a human "XXX-XXX-XXXX" display for a US number (falls back to input).
export function formatUSPhone (e164) {
  const digits = (e164 || '').replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return e164 || '';
  return `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
}

// Seconds → mm:ss.
export function formatCountdown (s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
