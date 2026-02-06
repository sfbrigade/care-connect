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
    activeIncident (id) {
      return instance.get(`/api/facilities/${id}/active-incident`);
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
    statusReasons: {
      index (type = '') {
        const params = {};
        if (type) {
          params.type = type;
        }
        return instance.get('/api/facilities/status-reasons', { params });
      },
      get (id) {
        return instance.get(`/api/facilities/status-reasons/${id}`);
      },
      create (data) {
        return instance.post('/api/facilities/status-reasons', data).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/facilities/status-reasons/${id}`, data).catch(handleError);
      },
      delete (id) {
        return instance.delete(`/api/facilities/status-reasons/${id}`).catch(handleError);
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
    arrived (id) {
      return instance.patch(`/api/incidents/${id}/arrived`).catch(handleError);
    },
    left (id) {
      return instance.patch(`/api/incidents/${id}/left`).catch(handleError);
    },
    extend (id) {
      return instance.patch(`/api/incidents/${id}/extend`).catch(handleError);
    },
  },
  deflections: {
    list ({ incidentId, facilityId, active, subjectStatus } = {}) {
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
      if (subjectStatus) {
        params.subjectStatus = subjectStatus;
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
      return instance.post(`/api/deflections/${id}/transfer`).catch(handleError);
    },
    cancel (id, { cancelReasonId } = {}) {
      return instance.delete(`/api/deflections/${id}${cancelReasonId ? `?cancelReasonId=${cancelReasonId}` : ''}`);
    },
    cancelReasons: {
      index () {
        return instance.get('/api/deflections/cancel-reasons');
      },
      get (id) {
        return instance.get(`/api/deflections/cancel-reasons/${id}`);
      },
      create (data) {
        return instance.post('/api/deflections/cancel-reasons', data).catch(handleError);
      },
      update (id, data) {
        return instance.patch(`/api/deflections/cancel-reasons/${id}`, data).catch(handleError);
      },
      delete (id) {
        return instance.delete(`/api/deflections/cancel-reasons/${id}`).catch(handleError);
      },
    },
    detailCategories: {
      index ({ include } = {}) {
        const params = {};
        if (include) {
          params.include = include;
        }
        return instance.get('/api/deflections/detail-categories', { params });
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
      index (organizationId, page = 1) {
        return instance.get(`/api/organizations/${organizationId}/units`, { params: { page } });
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
  }
};

export default Api;
