import { useAuthContext } from '../AuthContext';

export const UserRole = Object.freeze({
  FIELD: 'FIELD',
  CUSTODY: 'CUSTODY',
  CARE: 'CARE',
});

export function useUserRole () {
  const { user } = useAuthContext();

  const userRoles = user?.roles ?? [];

  return {
    isField: userRoles.includes(UserRole.FIELD),
    isCustody: userRoles.includes(UserRole.CUSTODY),
    isCare: userRoles.includes(UserRole.CARE),
    isAdmin: user?.isAdmin ?? false,
    canAccess (roles) {
      if (!user) return false;
      if (user.isAdmin) return true;
      return roles.some(r => userRoles.includes(r));
    },
  };
}
