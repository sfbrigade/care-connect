import { useCallback, useEffect, useState } from 'react';

import SatisfactionSurveyModal from '@/lesc/components/SatisfactionSurveyModal';
import { useSatisfactionSurveyEligibility } from '@/hooks/useSatisfactionSurveyEligibility';

/** React Router `location.state` key for scheduling the post-navigation satisfaction survey. */
export const SATISFACTION_SURVEY_NAVIGATION_STATE = 'satisfactionSurveyIntent';

function useSatisfactionSurvey (navigate, deflectionId, { organizationId } = {}) {
  const { isEligible: shouldShowSatisfactionSurvey } = useSatisfactionSurveyEligibility();
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [staySurveyScheduled, setStaySurveyScheduled] = useState(false);
  const [activeSurveyContextId, setActiveSurveyContextId] = useState(deflectionId);

  useEffect(() => {
    let surveyTimeoutId;
    if (staySurveyScheduled && shouldShowSatisfactionSurvey) {
      surveyTimeoutId = window.setTimeout(() => {
        setIsSurveyModalOpen(true);
      }, 2000);
    }

    return () => {
      if (surveyTimeoutId) {
        window.clearTimeout(surveyTimeoutId);
      }
    };
  }, [staySurveyScheduled, shouldShowSatisfactionSurvey]);

  const navigateWithOptionalSurvey = useCallback((path) => {
    if (shouldShowSatisfactionSurvey) {
      navigate(path, {
        state: {
          [SATISFACTION_SURVEY_NAVIGATION_STATE]: {
            deflectionId,
            organizationId,
          },
        },
      });
      return;
    }
    navigate(path);
  }, [navigate, shouldShowSatisfactionSurvey, deflectionId, organizationId]);

  /**
   * Show the delayed survey without navigating afterward (e.g. after "I've left" on Holds).
   * @param {string} [contextId] - Stored with the response; defaults to hook `deflectionId`.
   */
  const scheduleOptionalSurveyWithoutNavigation = useCallback((contextId) => {
    if (shouldShowSatisfactionSurvey) {
      setActiveSurveyContextId(contextId ?? deflectionId);
      setStaySurveyScheduled(true);
    }
  }, [shouldShowSatisfactionSurvey, deflectionId]);

  const closeSurveyAndContinue = useCallback(() => {
    setIsSurveyModalOpen(false);
    setStaySurveyScheduled(false);
  }, []);

  const satisfactionSurveyModal = (
    <SatisfactionSurveyModal
      opened={isSurveyModalOpen}
      deflectionId={activeSurveyContextId}
      organizationId={organizationId}
      onFinished={closeSurveyAndContinue}
    />
  );

  return {
    navigateWithOptionalSurvey,
    scheduleOptionalSurveyWithoutNavigation,
    satisfactionSurveyModal,
  };
}

export default useSatisfactionSurvey;
