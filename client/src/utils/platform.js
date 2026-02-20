/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
export function isIOS () {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if running on Android
 */
export function isAndroid () {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}
