import { matchPath } from 'react-router';

import { UserRole } from '@/hooks/useUserRole';

export const ADMIN_AUTH_PROTECTED_PATHS = [
  '/admin/*',
];
export const AUTH_PROTECTED_PATHS = [
  '/units',
];
export const ROLE_PROTECTED_PATHS = [
  { pattern: '/holds/*', roles: [UserRole.FIELD] },
  { pattern: '/holds', roles: [UserRole.FIELD] },
  { pattern: '/incident', roles: [UserRole.FIELD] },
  { pattern: '/sfso/*', roles: [UserRole.CUSTODY] },
  { pattern: '/care/*', roles: [UserRole.CARE] },
];
export const REDIRECTS = [
  ['/admin', '/admin/users'],
  ['/passwords', '/passwords/forgot'],
];

export function getDefaultPathForUser (user) {
  if (user?.role === UserRole.CUSTODY) return '/sfso/custody';
  if (user?.role === UserRole.CARE) return '/care/dashboard';
  return '/holds';
}

export function handleRedirects (authContext, location, pathname, handler) {
  let match;
  for (const pattern of ADMIN_AUTH_PROTECTED_PATHS) {
    match = matchPath(pattern, pathname);
    if (match) {
      if (!authContext.user) {
        return handler('/login', { from: location });
      } else if (!authContext.user.isAdmin) {
        return handler('/');
      }
      break;
    }
  }
  if (!match) {
    for (const { pattern, roles } of ROLE_PROTECTED_PATHS) {
      match = matchPath(pattern, pathname);
      if (match) {
        if (!authContext.user) {
          return handler('/login', { from: location });
        }
        if (!authContext.user.isAdmin && !roles.includes(authContext.user.role)) {
          if (!authContext.user.role) {
            return handler('/login');
          }
          return handler(getDefaultPathForUser(authContext.user));
        }
        break;
      }
    }
  }
  if (!match) {
    for (const pattern of AUTH_PROTECTED_PATHS) {
      match = matchPath(pattern, pathname);
      if (match) {
        if (!authContext.user) {
          return handler('/login', { from: location });
        }
        break;
      }
    }
  }
  for (const redirect of REDIRECTS) {
    let [src, dest] = redirect;
    match = matchPath(src, pathname);
    if (match) {
      if (match.params) {
        for (const key of Object.keys(match.params)) {
          dest = dest.replace(`:${key}`, match.params[key]);
        }
      }
      if (dest !== src) {
        return handler(dest);
      }
      break;
    }
  }
  return false;
}
