export function normalizeUnitName (value) {
  return value == null ? value : value.toString().trim().toUpperCase();
}

export function formatUnitName (value) {
  return normalizeUnitName(value) || '';
}
