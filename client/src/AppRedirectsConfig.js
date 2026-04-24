import { matchPath } from 'react-router';

import { UserRole } from '@/hooks/useUserRole';
import { readStoredWorkMode } from './utils/workMode';

export const ADMIN_AUTH_PROTECTED_PATHS = [
  '/admin/*',
];
export const AUTH_PROTECTED_PATHS = [
  '/profile/*',
  '/units',
];
export const ROLE_PROTECTED_PATHS = [
  { pattern: '/holds/*', roles: [UserRole.FIELD] },
  { pattern: '/holds', roles: [UserRole.FIELD] },
  { pattern: '/incident', roles: [UserRole.FIELD] },
  { pattern: '/forms/*', roles: [UserRole.FIELD] },
  { pattern: '/custody/*', roles: [UserRole.CUSTODY] },
  { pattern: '/care', roles: [UserRole.CARE] },
  { pattern: '/care/*', roles: [UserRole.CARE] },
  { pattern: '/manage-users', roles: [UserRole.ORG_ADMIN] },
  { pattern: '/manage-capacity', roles: [UserRole.FACILITY_ADMIN] },
];
export const REDIRECTS = [
  ['/admin', '/admin/users'],
  ['/passwords', '/passwords/forgot'],
];

export function getDefaultPathForUser (user) {
  const roles = user?.roles ?? [];
  // Dual-role users route to their remembered mode so they don't land on
  // /custody and leave it in browser history when their current mode is
  // FIELD (or vice-versa).
  if (roles.includes(UserRole.FIELD) && roles.includes(UserRole.CUSTODY)) {
    const stored = readStoredWorkMode();
    if (stored === 'FIELD') return '/holds';
    if (stored === 'CUSTODY') return '/custody';
  }
  if (roles.includes(UserRole.CUSTODY)) return '/custody';
  if (roles.includes(UserRole.CARE)) return '/care';
  return '/holds';
}

function isCustodyPath (pathname) {
  return pathname === '/custody' || pathname.startsWith('/custody/');
}

export function handleRedirects (authContext, location, pathname, handler, { hasActiveFieldWork = false } = {}) {
  // Work-mode block: a dual-role user with active field work (open holds or
  // an open arrival) cannot enter custody routes. Route guards otherwise let
  // them through because they hold the CUSTODY role.
  if (
    authContext.user &&
    isCustodyPath(pathname) &&
    authContext.user.roles?.includes(UserRole.FIELD) &&
    authContext.user.roles?.includes(UserRole.CUSTODY) &&
    hasActiveFieldWork
  ) {
    return handler('/holds');
  }
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
        const userRoles = authContext.user.roles ?? [];
        if (!authContext.user.isAdmin && !roles.some(r => userRoles.includes(r))) {
          if (!userRoles.length) {
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
