import { StatusCodes } from 'http-status-codes';

function makeStatusError (statusCode, defaultMessage) {
  return (message = defaultMessage) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  };
}

export const conflictError = makeStatusError(StatusCodes.CONFLICT, 'Conflict');
export const facilityNotAcceptingError = makeStatusError(StatusCodes.CONFLICT, 'Facility is not accepting new holds');
export const noAvailableBedError = makeStatusError(StatusCodes.GONE, 'No available beds');
