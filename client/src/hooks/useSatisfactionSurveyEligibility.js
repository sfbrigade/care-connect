import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';

/**
 * Derives satisfaction-survey eligibility from GET /api/users/me and keeps
 * `satisfactionSurveyNextEligibleAt` initialized via POST when it is null.
 */
export function useSatisfactionSurveyEligibility () {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const initAttemptedRef = useRef(false);

  const userId = user?.id;
  const satisfactionSurveyNextEligibleAt = user?.satisfactionSurveyNextEligibleAt ?? null;

  useEffect(() => {
    initAttemptedRef.current = false;
  }, [userId]);

  const { mutate: scheduleCooldownMutate } = useMutation({
    mutationFn: () => Api.users.scheduleSatisfactionSurveyCooldown(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });

  useEffect(() => {
    if (!userId) return;
    if (satisfactionSurveyNextEligibleAt != null) return;
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    scheduleCooldownMutate();
  }, [userId, satisfactionSurveyNextEligibleAt, scheduleCooldownMutate]);

  const isEligible = useMemo(() => {
    if (!user) return false;
    if (satisfactionSurveyNextEligibleAt == null) return false;
    const ts = new Date(satisfactionSurveyNextEligibleAt).getTime();
    return Number.isFinite(ts) && Date.now() >= ts;
  }, [user, satisfactionSurveyNextEligibleAt]);

  const scheduleCooldown = useCallback(() => {
    scheduleCooldownMutate();
  }, [scheduleCooldownMutate]);

  return { isEligible, scheduleCooldown };
}
