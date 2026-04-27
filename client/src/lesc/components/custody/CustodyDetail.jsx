import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import { SATISFACTION_SURVEY_NAVIGATION_STATE } from '@/hooks/useSatisfactionSurvey';
import SatisfactionSurveyModal, { isSatisfactionSurveyEnabled } from './SatisfactionSurveyModal';
import CustodyDetailContent from './CustodyDetailContent';

function CustodyDetail ({ viewerMode = 'custody' }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCareView = viewerMode === 'care';
  const backTo = isCareView ? '/care' : '/custody';

  const [isPostNavigationSurveyOpen, setIsPostNavigationSurveyOpen] = useState(false);

  const surveyIntent = location.state?.[SATISFACTION_SURVEY_NAVIGATION_STATE];
  const surveyIntentDeflectionId = surveyIntent?.deflectionId;

  useEffect(() => {
    setIsPostNavigationSurveyOpen(false);
  }, [id]);

  useEffect(() => {
    if (!isSatisfactionSurveyEnabled()) return;
    if (!surveyIntentDeflectionId || String(surveyIntentDeflectionId) !== String(id)) return;

    const timeoutId = window.setTimeout(() => {
      setIsPostNavigationSurveyOpen(true);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [id, surveyIntentDeflectionId, location.key]);

  const clearSurveyLocationState = useCallback(() => {
    const current = location.state;
    if (!current || !(SATISFACTION_SURVEY_NAVIGATION_STATE in current)) return;

    const nextState = { ...current };
    delete nextState[SATISFACTION_SURVEY_NAVIGATION_STATE];
    navigate('.', {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    });
  }, [navigate, location.state]);

  const onPostNavigationSurveyFinished = useCallback(() => {
    setIsPostNavigationSurveyOpen(false);
    clearSurveyLocationState();
  }, [clearSurveyLocationState]);

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  return (
    <>
      <Head>
        <title>{isCareView ? 'Care Details' : 'Custody Details'}</title>
      </Head>
      <CustodyDetailContent deflection={deflection} backTo={backTo} viewerMode={viewerMode} />
      {surveyIntentDeflectionId != null && String(surveyIntentDeflectionId) === String(id) && (
        <SatisfactionSurveyModal
          opened={isPostNavigationSurveyOpen}
          deflectionId={surveyIntentDeflectionId}
          department={surveyIntent?.department}
          onFinished={onPostNavigationSurveyFinished}
        />
      )}
    </>
  );
}

export default CustodyDetail;
