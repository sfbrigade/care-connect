/* eslint-disable no-throw-literal */

import axios from 'axios';

import { StatusCodes } from 'http-status-codes';
import { capitalize } from 'inflection';

const instance = axios.create({
  headers: {
    Accept: 'application/json',
  },
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === StatusCodes.UNAUTHORIZED) {
      window.location = '/login';
    }
    return Promise.reject(error);
  }
);

function parseLinkHeader (response) {
  const link = response.headers?.link;
  if (link) {
    const linkRe = /<([^>]+)>; rel="([^"]+)"/g;
    const urls = {};
    let m;
    while ((m = linkRe.exec(link)) !== null) {
      const url = m[1];
      urls[m[2]] = url;
    }
    return urls;
  }
  return null;
}

function calculateLastPage (response, page) {
  const linkHeader = parseLinkHeader(response);
  let newLastPage = page;
  if (linkHeader?.last) {
    const match = linkHeader.last.match(/page=(\d+)/);
    newLastPage = parseInt(match[1], 10);
  } else if (linkHeader?.next) {
    newLastPage = page + 1;
  }
  return newLastPage;
}

function handleError (error) {
  const errors = {};
  if (error.response?.status === StatusCodes.UNPROCESSABLE_ENTITY) {
    for (const err of error.response.data.errors) {
      errors[err.path] ||= new Set();
      errors[err.path].add(err.message);
    }
    for (const key of Object.keys(errors)) {
      errors[key] = capitalize([...errors[key]].join(', '));
    }
  } else {
    errors._form = error.message;
    errors._status = error.response?.status;
    if (error.response?.data?.code) {
      errors._code = error.response.data.code;
    }
  }
  throw errors;
}

const Api = {
  calculateLastPage,
  parseLinkHeader,
  assets: {
    create (data) {
      return instance.post('/api/assets', data);
    },
    upload (url, headers, file) {
      return instance.put(url, file, { headers });
    },
  },
  auth: {
    login (email, password) {
      return instance.post('/api/auth/login', { email, password })
        .catch((error) => {
          // Check if it's a validation error with details
          if (error.response?.status === StatusCodes.UNPROCESSABLE_ENTITY && error.response?.data?.errors) {
            // Handle validation errors (e.g., invalid email format)
            const validationErrors = {};
            for (const err of error.response.data.errors) {
              validationErrors[err.path] = err.message;
            }
            throw validationErrors;
          }
          switch (error.response?.status) {
            case StatusCodes.NOT_FOUND:
            case StatusCodes.UNPROCESSABLE_ENTITY:
              throw { password: 'Incorrect password. Try again or press Forgot password.' };
            case StatusCodes.FORBIDDEN:
              throw { email: 'Your account has been deactivated.' };
            default:
              throw { _form: error.message };
          }
        });
    },
    verifyCode (token, code) {
      return instance.post('/api/auth/verify-code', { token, code })
        .catch((error) => {
          const status = error.response?.status;
          const message = error.response?.data?.error;
          switch (status) {
            case StatusCodes.UNPROCESSABLE_ENTITY:
              throw { code: message || 'That code is incorrect. Try again.' };
            case StatusCodes.GONE:
              throw { code: message || 'That code has expired. Request a new one.' };
            case StatusCodes.TOO_MANY_REQUESTS:
              throw { _form: message || 'Too many attempts. Please wait and try again.' };
            case StatusCodes.NOT_FOUND:
              throw { _form: 'Invalid verification session. Please log in again.' };
            default:
              throw { _form: 'Something went wrong. Please try again.' };
          }
        });
    },
    resendCode (token) {
      return instance.post('/api/auth/resend-code', { token })
        .catch((error) => {
          const status = error.response?.status;
          if (status === StatusCodes.TOO_MANY_REQUESTS) {
            throw { _form: 'Please wait before requesting a new code.' };
          }
          throw { _form: 'Something went wrong. Please try again.' };
        });
    },
    logout () {
      return instance.delete('/api/auth/logout');
    },
    register (data) {
      return instance.post('/api/auth/register', data).catch(handleError);
    },
  },
  invites: {
    index (page = 1) {
      return instance.get('/api/invites', { params: { page } });
    },
    create (data) {
      return instance.post('/api/invites', data).catch(handleError);
    },
    bulk (data) {
      return instance.post('/api/invites/bulk', data).catch(handleError);
    },
    get (id) {
      return instance.get(`/api/invites/${id}`);
    },
    accept (id, data) {
      return instance.post(`/api/invites/${id}/accept`, data);
    },
    resend (id) {
      return instance.patch(`/api/invites/${id}/resend`);
    },
    revoke (id) {
      return instance.delete(`/api/invites/${id}`);
    },
  },
  passwords: {
    reset (email) {
      return instance.post('/api/passwords', { email }).catch((error) => {
        switch (error.response?.status) {
          case StatusCodes.NOT_FOUND:
            throw { email: 'Email not found.' };
          default:
            throw { _form: error.message };
        }
      });
    },
    get (token) {
      return instance.get(`/api/passwords/${token}`);
    },
    update (token, password) {
      return instance.patch(`/api/passwords/${token}`, { password }).catch(handleError);
    },
  },
  users: {
    index (page = 1) {
      return instance.get('/api/users', { params: { page } });
    },
    me () {
      return instance.get('/api/users/me');
    },
    get (id) {
      return instance.get(`/api/users/${id}`);
    },
    update (id, data) {
      return instance.patch(`/api/users/${id}`, data).catch(handleError);
    },
    setPassword (id, password) {
      return instance.patch(`/api/users/${id}/password`, { password }).catch(handleError);
    },
    getMfaCode (id) {
      return instance.get(`/api/users/${id}/mfa-code`);
    },
  },
  facilities: {
    index (page = 1, include = '') {
      return instance.get('/api/facilities', { params: { page, include } });
    },
    list ({ include = '', type = '' } = {}) {
      return instance.get('/api/facilities', { params: { include, type } });
    },
    get (id) {
      return instance.get(`/api/facilities/${id}`);
    },
    create (data) {
      return instance.post('/api/facilities', data).catch(handleError);
    },
    update (id, data) {
      return instance.patch(`/api/facilities/${id}`, data).catch(handleError);
    },
    delete (id) {
      return instance.delete(`/api/facilities/${id}`).catch(handleError);
    },
    updateBeds (id, data) {
      return instance.patch(`/api/facilities/${id}/beds`, data).catch(handleError);
    },
    addService (id, data) {
      return instance.post(`/api/facilities/${id}/services`, data).catch(handleError);
    },
    removeService (id, serviceTypeId) {
      return instance.delete(`/api/facilities/${id}/services/${serviceTypeId}`).catch(handleError);
    },
    myHolds (id) {
      return instance.get(`/api/facilities/${id}/my-holds`);
    },
    arrived (id) {
      return instance.post(`/api/facilities/${id}/arrived`);
    },
    left (id) {
      return instance.post(`/api/facilities/${id}/left`);
    },
    updateStatus (id, data) {
      return instance.post(`/api/facilities/${id}/status`, data).catch(handleError);
    },
    holds (id, { all = false, include = '' } = {}) {
      return instance.get(`/api/facilities/${id}/holds`, { params: { all, include } });
    },
    bedTypes: {
      index (facilityId, page = 1) {
        return instance.get(`/api/facilities/${facilityId}/bed-types`, { params: { page } });
      },
      create (facilityId, data) {
        return instance.post(`/api/facilities/${facilityId}/bed-types`, data).catch(handleError);
      },
      update (facilityId, bedTypeId, data) {
        return instance.patch(`/api/facilities/${facilityId}/bed-types/${bedTypeId}`, data).catch(handleError);
      },
      get (facilityId, bedTypeId) {
        return instance.get(`/api/facilities/${facilityId}/bed-types/${bedTypeId}`);
      },
    },
  },
  holds: {
    list () {
      return instance.get('/api/holds');
    },
    create (data) {
      return instance.post('/api/holds', data).catch(handleError);
    },
    get (id, { include = '' } = {}) {
      return instance.get(`/api/holds/${id}`, { params: { include } });
    },
    qr (id) {
      return instance.get(`/api/holds/${id}/qr`);
    },
    update (id, data) {
      return instance.patch(`/api/holds/${id}`, data).catch(handleError);
    },
    cancel (id) {
      return instance.delete(`/api/holds/${id}`).catch(handleError);
    },
    extend (ids) {
      return instance.patch('/api/holds/extend', { ids }).catch(handleError);
    },
  },
  incidents: {
    list () {
      return instance.get('/api/incidents').catch(handleError);
    },
    create (data, { bedTypeId } = {}) {
      return instance.post(`/api/incidents${bedTypeId ? `?bedTypeId=${bedTypeId}` : ''}`, data).catch(handleError);
    },
    get (id) {
      return instance.get(`/api/incidents/${id}`).catch(handleError);
    },
    update (id, data) {
      return instance.patch(`/api/incidents/${id}`, data).catch(handleError);
    },
  },
  deflections: {
    list ({ incidentId, facilityId, active, handedOff, scope, includeIncident, includeCurrentOfficer, status, subjectStatus, perPage } = {}) {
      const params = {};
      if (incidentId) {
        params.incidentId = incidentId;
      }
      if (facilityId) {
        params.facilityId = facilityId;
      }
      if (active !== undefined) {
        params.active = active;
      }
      if (handedOff) {
        params.handedOff = handedOff;
      }
      if (scope) {
        params.scope = scope;
      }
      if (includeIncident) {
        params.includeIncident = 'true';
      }
      if (includeCurrentOfficer) {
        params.includeCurrentOfficer = 'true';
      }
      if (status) {
        params.status = status;
      }
      if (subjectStatus) {
        params.subjectStatus = subjectStatus;
      }
      if (perPage) {
        params.perPage = perPage;
      }
      return instance.get('/api/deflections', { params });
    },
    create (data) {
      return instance.post('/api/deflections', data).catch(handleError);
    },
    get (id) {
      return instance.get(`/api/deflections/${id}`);
    },
    update (id, data) {
      return instance.patch(`/api/deflections/${id}`, data).catch(handleError);
    },
    subject (id, data) {
      return instance.put(`/api/deflections/${id}/subject`, data).catch(handleError);
    },
    transfer (id) {
      return instance.post(`/api/deflections/${id}/transfer`).catch(error => {
        const status = error?.response?.status;
        switch (status) {
          case StatusCodes.NOT_FOUND:
            throw { _form: 'This transfer code is not valid. Check the number and try again.' };
          case StatusCodes.CONFLICT:
            throw { _form: 'This transfer code was already used. Confirm chair status or contact staff.' };
          case StatusCodes.UNPROCESSABLE_ENTITY:
            throw { _form: 'Some required details are missing. Ask the officer to finish them before transferring.' };
          default:
            throw { _form: error.message };
        }
      });
    },
    handoff (id) {
      return instance.post(`/api/deflections/${id}/handoff`).catch(handleError);
    },
    initiateHandoff (active) {
      return instance.post('/api/deflections/initiate-handoff', { active }).catch(handleError);
    },
    safetyCheck (id) {
      return instance.post(`/api/deflections/${id}/safety-check`).catch(handleError);
    },
    admit (id) {
      return instance.post(`/api/deflections/${id}/admit`);
    },
    completeIntake (id, { completed }) {
      return instance.post(`/api/deflections/${id}/intake-complete`, { completed }).catch(handleError);
    },
    saveExitDetails (id, data) {
      return instance.post(`/api/deflections/${id}/exit-details`, data).catch(handleError);
    },
    exit (id, data) {
      return instance.post(`/api/deflections/${id}/exit`, data).catch(handleError);
    },
    release (id, data = {}) {
      return instance.post(`/api/deflections/${id}/release`, data);
    },
    exitToJail (id) {
      return instance.post(`/api/deflections/${id}/exit-to-jail`).catch(handleError);
    },
    recordDeath (id) {
      return instance.post(`/api/deflections/${id}/record-death`).catch(handleError);
    },
    recordPropertyReturn (id, data) {
      return instance.post(`/api/deflections/${id}/property-return`, data).catch(handleError);
    },
    email849b (id) {
      return instance.post(`/api/deflections/${id}/849b-email`).catch(handleError);
    },
    cancel (id, { cancelReason } = {}) {
      return instance.delete(`/api/deflections/${id}${cancelReason ? `?cancelReason=${cancelReason}` : ''}`);
    },
    reopen (id) {
      return instance.post(`/api/deflections/${id}/reopen`).catch(handleError);
    },
    submitSatisfactionSurvey (id, body) {
      return instance.post(`/api/deflections/${id}/satisfaction-survey`, body).catch(handleError);
    },
    extend (deflectionIds) {
      return instance.patch('/api/deflections/extend', { deflectionIds }).catch(handleError);
    },
  },
  serviceTypes: {
    list () {
      return instance.get('/api/service-types');
    },
    create (data) {
      return instance.post('/api/service-types', data).catch(handleError);
    },
  },
  canary: {
    error () {
      return instance.post('/api/canary/error');
    },
    job () {
      return instance.post('/api/canary/job');
    },
  },
  feedback: {
    create (data) {
      return instance.post('/api/feedback', data).catch(handleError);
    },
    list (page = 1) {
      return instance.get('/api/feedback', { params: { page } });
    },
  },
  geocode: {
    search (text, { signal } = {}) {
      return instance.get('/api/geocode/search', {
        params: { text },
        signal,
      });
    },
    reverse (latitude, longitude) {
      return instance.get('/api/geocode/reverse', {
        params: { latitude, longitude }
      }).catch(handleError);
    },
  },
  organizations: {
    index (page = 1) {
      return instance.get('/api/organizations', { params: { page } });
    },
    get (id) {
      return instance.get(`/api/organizations/${id}`);
    },
    create (data) {
      return instance.post('/api/organizations', data).catch(handleError);
    },
    update (id, data) {
      return instance.patch(`/api/organizations/${id}`, data).catch(handleError);
    },
    members (organizationId) {
      return instance.get(`/api/organizations/${organizationId}/members`);
    },
    titles: {
      index (organizationId, page = 1) {
        return instance.get(`/api/organizations/${organizationId}/titles`, { params: { page } });
      },
      get (organizationId, id) {
        return instance.get(`/api/organizations/${organizationId}/titles/${id}`);
      },
      create (organizationId, data) {
        return instance.post(`/api/organizations/${organizationId}/titles`, data).catch(handleError);
      },
      update (organizationId, id, data) {
        return instance.patch(`/api/organizations/${organizationId}/titles/${id}`, data).catch(handleError);
      },
      delete (organizationId, id) {
        return instance.delete(`/api/organizations/${organizationId}/titles/${id}`).catch(handleError);
      },
    },
    units: {
      index (organizationId, page = 1, perPage = 25) {
        return instance.get(`/api/organizations/${organizationId}/units`, { params: { page, perPage } });
      },
      get (organizationId, id) {
        return instance.get(`/api/organizations/${organizationId}/units/${id}`);
      },
      create (organizationId, data) {
        return instance.post(`/api/organizations/${organizationId}/units`, data).catch(handleError);
      },
      update (organizationId, id, data) {
        return instance.patch(`/api/organizations/${organizationId}/units/${id}`, data).catch(handleError);
      },
      delete (organizationId, id) {
        return instance.delete(`/api/organizations/${organizationId}/units/${id}`).catch(handleError);
      },
    },
  },
  propertyPhotos: {
    create (data) {
      return instance.post('/api/property-photos', data).catch(handleError);
    },
    delete (id) {
      return instance.delete(`/api/property-photos/${id}`).catch(handleError);
    },
  },
  ai: {
    transcribe (audio, mediaType) {
      return instance.post('/api/ai/transcribe', { audio, mediaType });
    },
    parseId (image, mediaType) {
      return instance.post('/api/ai/parse-id', { image, mediaType });
    },
  },
};

export default Api;
