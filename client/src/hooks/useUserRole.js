import { useAuthContext } from '@/AuthContext';

export const UserRole = Object.freeze({
  FIELD: 'FIELD',
  CUSTODY: 'CUSTODY',
  CARE: 'CARE',
});

export function useUserRole () {
  const { user } = useAuthContext();

  return {
    isField: user?.role === UserRole.FIELD,
    isCustody: user?.role === UserRole.CUSTODY,
    isCare: user?.role === UserRole.CARE,
    isAdmin: user?.isAdmin ?? false,
    canAccess (roles) {
      if (!user) return false;
      if (user.isAdmin) return true;
      return roles.includes(user.role);
    },
  };
}
