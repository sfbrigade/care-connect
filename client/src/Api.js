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
  },
  facilities: {
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
    availability (id) {
      return instance.get(`/api/facilities/${id}/availability`);
    },
    holds (id, { all = false, include = '' } = {}) {
      return instance.get(`/api/facilities/${id}/holds`, { params: { all, include } });
    },
  },
  holds: {
    extend (ids) {
      return instance.patch('/api/holds/extend', { ids }).catch(handleError);
    },
  },
  lesc: {
    availability () {
      return instance.get('/api/lesc/availability');
    },
    facilities: {
      list () {
        return instance.get('/api/lesc/facilities');
      },
    },
    holds: {
      list (facilityId) {
        return instance.get('/api/lesc/holds', { params: facilityId ? { facilityId } : {} });
      },
      get (id) {
        return instance.get(`/api/lesc/holds/${id}`).catch(handleError);
      },
      create (data) {
        return instance.post('/api/lesc/holds', data).catch(handleError);
      },
      cancel (id) {
        return instance.delete(`/api/lesc/holds/${id}`).catch(handleError);
      },
      qr (id) {
        return instance.get(`/api/lesc/holds/${id}/qr`);
      },
      transfer (id, token) {
        return instance.post(`/api/lesc/holds/${id}/transfer`, { token }).catch(handleError);
      },
      transferStatus (id) {
        return instance.get(`/api/lesc/holds/${id}/transfer-status`);
      },
      forCheckin (id) {
        return instance.get(`/api/lesc/holds/${id}/for-checkin`).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/lesc/holds/${id}`, data).catch(handleError);
      },
    },
    incidents: {
      list () {
        return instance.get('/api/lesc/incidents').catch(handleError);
      },
      create (data) {
        return instance.post('/api/lesc/incidents', data).catch(handleError);
      },
      get (id) {
        return instance.get(`/api/lesc/incidents/${id}`).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/lesc/incidents/${id}`, data).catch(handleError);
      },
      findByCad (cadNumber) {
        return instance.get(`/api/lesc/incidents/by-cad/${encodeURIComponent(cadNumber)}`).catch(handleError);
      },
    },
    intake: {
      create (data) {
        return instance.post('/api/lesc/intake', data).catch(handleError);
      },
      list () {
        return instance.get('/api/lesc/intake').catch(handleError);
      },
      get (id) {
        return instance.get(`/api/lesc/intake/${id}`).catch(handleError);
      },
    },
    checkin: {
      create (holdId, data = {}) {
        return instance.post(`/api/lesc/checkin/${holdId}`, data).catch(handleError);
      },
    },
    clients: {
      get (id) {
        return instance.get(`/api/lesc/clients/${id}`).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/lesc/clients/${id}`, data).catch(handleError);
      },
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
  feedback: {
    create (data) {
      return instance.post('/api/feedback', data).catch(handleError);
    },
    list (page = 1) {
      return instance.get('/api/feedback', { params: { page } });
    },
  },
  geocode: {
    reverse (latitude, longitude) {
      return instance.get('/api/geocode/reverse', {
        params: { latitude, longitude }
      }).catch(handleError);
    },
  },
};

export default Api;
