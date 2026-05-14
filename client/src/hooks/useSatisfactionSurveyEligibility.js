import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';

/**
 * Derives satisfaction-survey eligibility from GET /api/users/me and keeps
 * `surveyNextEligibleAt` initialized via POST when it is null.
 */
export function useSatisfactionSurveyEligibility () {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const initAttemptedRef = useRef(false);

  const userId = user?.id;
  const surveyNextEligibleAt = user?.surveyNextEligibleAt ?? null;

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
    if (surveyNextEligibleAt != null) return;
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    scheduleCooldownMutate();
  }, [userId, surveyNextEligibleAt, scheduleCooldownMutate]);

  const isEligible = useMemo(() => {
    if (!user) return false;
    if (surveyNextEligibleAt == null) return false;
    const ts = new Date(surveyNextEligibleAt).getTime();
    return Number.isFinite(ts) && Date.now() >= ts;
  }, [user, surveyNextEligibleAt]);

  const scheduleCooldown = useCallback(() => {
    scheduleCooldownMutate();
  }, [scheduleCooldownMutate]);

  return { isEligible, scheduleCooldown };
}
