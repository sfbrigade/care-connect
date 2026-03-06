import { describe, expect, it } from 'vitest';

import { getTransferErrorMessage } from './scanTransferCodeModalUtils';

describe('getTransferErrorMessage', () => {
  it('maps reachability/network failures to the expected message', () => {
    expect(getTransferErrorMessage({ _form: 'Network Error' }))
      .toBe('Can’t reach the server. Check your connection and try again.');
  });

  it('maps 404 errors to transfer code not recognized message', () => {
    expect(getTransferErrorMessage({ _form: 'Request failed with status code 404' }))
      .toBe('Transfer code not recognized. Check the code and try again.');
  });

  it('maps 409 errors to already received message', () => {
    expect(getTransferErrorMessage({ _form: 'Request failed with status code 409' }))
      .toBe('This person was already received. Please check chair status.');
  });

  it('falls back to default transfer failure message when missing', () => {
    expect(getTransferErrorMessage({}))
      .toBe('Failed to transfer subject into custody. Please try again.');
  });
});
