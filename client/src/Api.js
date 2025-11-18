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
    if (error.response.status === StatusCodes.UNAUTHORIZED) {
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
          switch (error.response?.status) {
            case StatusCodes.NOT_FOUND:
            case StatusCodes.UNPROCESSABLE_ENTITY:
              throw { _form: 'Invalid email and/or password' };
            case StatusCodes.FORBIDDEN:
              throw { _form: 'Your account has been deactivated.' };
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
    list () {
      return instance.get('/api/facilities');
    },
  },
  lesc: {
    availability () {
      return instance.get('/api/lesc/availability');
    },
    holds: {
      list (facilityId) {
        return instance.get('/api/lesc/holds', { params: facilityId ? { facilityId } : {} });
      },
      create (data) {
        return instance.post('/api/lesc/holds', data).catch(handleError);
      },
      extend (id) {
        return instance.patch(`/api/lesc/holds/${id}/extend`).catch(handleError);
      },
      cancel (id) {
        return instance.delete(`/api/lesc/holds/${id}`).catch(handleError);
      },
    },
  },
  admin: {
    facilities: {
      list () {
        return instance.get('/api/admin/facilities');
      },
      get (id) {
        return instance.get(`/api/admin/facilities/${id}`);
      },
      create (data) {
        return instance.post('/api/admin/facilities', data).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/admin/facilities/${id}`, data).catch(handleError);
      },
      updateBeds (id, data) {
        return instance.patch(`/api/admin/facilities/${id}/beds`, data).catch(handleError);
      },
      addService (id, data) {
        return instance.post(`/api/admin/facilities/${id}/services`, data).catch(handleError);
      },
      removeService (id, serviceTypeId) {
        return instance.delete(`/api/admin/facilities/${id}/services/${serviceTypeId}`).catch(handleError);
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
};

export default Api;
