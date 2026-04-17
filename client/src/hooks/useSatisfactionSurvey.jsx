import { useCallback, useEffect, useState } from 'react';

import SatisfactionSurveyModal, { isSatisfactionSurveyEnabled } from '@/lesc/components/custody/SatisfactionSurveyModal';

/**
 * After a SFSO legal release or SFPD leaves facility, either navigates immediately or waits 3s
 * and opens the satisfaction survey modal, then optionally navigates.
 */
function useSatisfactionSurvey (navigate, deflectionId, { surveySource = 'legal_release', surveyModalProps = {} } = {}) {
  const shouldShowSatisfactionSurvey = isSatisfactionSurveyEnabled();
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeSurveyContextId, setActiveSurveyContextId] = useState(deflectionId);

  useEffect(() => {
    let surveyTimeoutId;
    if (pendingAction && shouldShowSatisfactionSurvey) {
      surveyTimeoutId = window.setTimeout(() => {
        setIsSurveyModalOpen(true);
      }, 3000);
    }

    return () => {
      if (surveyTimeoutId) {
        window.clearTimeout(surveyTimeoutId);
      }
    };
  }, [pendingAction, shouldShowSatisfactionSurvey]);

  const navigateWithOptionalSurvey = useCallback((path) => {
    if (shouldShowSatisfactionSurvey) {
      setActiveSurveyContextId(deflectionId);
      setPendingAction({ type: 'navigate', path });
      return;
    }
    navigate(path);
  }, [navigate, shouldShowSatisfactionSurvey, deflectionId]);

  /**
   * Show the delayed survey without navigating afterward (e.g. after "I've left" on Holds).
   * @param {string} [contextId] - Stored with the response; defaults to hook `deflectionId`.
   */
  const scheduleOptionalSurveyWithoutNavigation = useCallback((contextId) => {
    if (shouldShowSatisfactionSurvey) {
      setActiveSurveyContextId(contextId ?? deflectionId);
      setPendingAction({ type: 'stay' });
    }
  }, [shouldShowSatisfactionSurvey, deflectionId]);

  const closeSurveyAndContinue = useCallback(() => {
    setIsSurveyModalOpen(false);
    setPendingAction((current) => {
      if (current?.type === 'navigate') {
        navigate(current.path);
      }
      return null;
    });
  }, [navigate]);

  const satisfactionSurveyModal = (
    <SatisfactionSurveyModal
      opened={isSurveyModalOpen}
      deflectionId={activeSurveyContextId}
      source={surveySource}
      onFinished={closeSurveyAndContinue}
      {...surveyModalProps}
    />
  );

  return {
    navigateWithOptionalSurvey,
    scheduleOptionalSurveyWithoutNavigation,
    satisfactionSurveyModal,
  };
}

export default useSatisfactionSurvey;
