export function getTransferErrorMessage (err) {
  const rawMessage = err?._form || '';
  if (/network error|failed to fetch|timeout|err_network|econnrefused|enotfound/i.test(rawMessage)) {
    return 'Can’t reach the server. Check your connection and try again.';
  }
  if (/409|conflict|already/i.test(rawMessage)) {
    return 'This person was already received. Please check chair status.';
  }
  if (/404|not found/i.test(rawMessage)) {
    return 'Transfer code not recognized. Check the code and try again.';
  }
  return rawMessage || 'Failed to transfer subject into custody. Please try again.';
}
