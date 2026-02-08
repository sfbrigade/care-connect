import { matchPath } from 'react-router';

export const ADMIN_AUTH_PROTECTED_PATHS = [
  '/admin/*',
];
export const AUTH_PROTECTED_PATHS = [
  '/holds/*',
  '/profile/*',
  '/units',
];
export const REDIRECTS = [
  ['/admin', '/admin/users'],
  ['/passwords', '/passwords/forgot'],
];

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
