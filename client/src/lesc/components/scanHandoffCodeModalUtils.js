export function getHandoffErrorMessage (err) {
  const rawMessage = err?._form || '';
  if (/network error|failed to fetch|timeout|err_network|econnrefused|enotfound/i.test(rawMessage)) {
    return 'Can\u2019t reach the server. Check your connection and try again.';
  }
  if (/409|conflict|already/i.test(rawMessage)) {
    return 'This hold has already been handed off.';
  }
  if (/404|not found/i.test(rawMessage)) {
    return 'Handoff code not recognized. Check the code and try again.';
  }
  if (/422|unprocessable/i.test(rawMessage)) {
    return 'You already have an active incident. Cannot accept a handoff.';
  }
  return rawMessage || 'Failed to accept handoff. Please try again.';
}
