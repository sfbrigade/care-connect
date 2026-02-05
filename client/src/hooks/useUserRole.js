import { useAuthContext } from '@/AuthContext';

export const UserRole = Object.freeze({
  SFPD: 'sfpd',
  SFSO: 'sfso',
  CARE_TEAM: 'connections',
});

export function useUserRole () {
  const { user } = useAuthContext();

  return {
    isSFPD: user?.organizationId === UserRole.SFPD,
    isSFSO: user?.organizationId === UserRole.SFSO,
    isCareTeam: user?.organizationId === UserRole.CARE_TEAM,
    isAdmin: user?.isAdmin ?? false,
    canAccess (roles) {
      if (!user) return false;
      if (user.isAdmin) return true;
      return roles.includes(user.organizationId);
    },
  };
}
