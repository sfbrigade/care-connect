import { useAuthContext } from '../AuthContext';

export const UserRole = Object.freeze({
  FIELD: 'FIELD',
  CUSTODY: 'CUSTODY',
  CARE: 'CARE',
  ORG_ADMIN: 'ORG_ADMIN',
  FACILITY_ADMIN: 'FACILITY_ADMIN',
});

export function useUserRole () {
  const { user } = useAuthContext();

  const userRoles = user?.roles ?? [];

  return {
    isField: userRoles.includes(UserRole.FIELD),
    isCustody: userRoles.includes(UserRole.CUSTODY),
    isCare: userRoles.includes(UserRole.CARE),
    isOrgAdmin: userRoles.includes(UserRole.ORG_ADMIN),
    isFacilityAdmin: userRoles.includes(UserRole.FACILITY_ADMIN),
    isAdmin: user?.isAdmin ?? false,
    canAccess (roles) {
      if (!user) return false;
      if (user.isAdmin) return true;
      return roles.some(r => userRoles.includes(r));
    },
  };
}
