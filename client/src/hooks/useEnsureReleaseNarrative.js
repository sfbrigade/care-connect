import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { build849bReleaseNarrative } from '../utils/releaseNarrative';

function setDeflectionCache (queryClient, deflectionId, updatedDeflection) {
  queryClient.setQueryData(['deflections', String(deflectionId)], updatedDeflection);
  queryClient.setQueryData(['deflections', deflectionId], updatedDeflection);
}

function useEnsureReleaseNarrative ({ deflection, incident, incidentReady }) {
  const queryClient = useQueryClient();
  const attemptedNarrativeRef = useRef(null);

  const generatedReleaseNarrative = useMemo(() => build849bReleaseNarrative({
    incident,
    behavior: deflection?.behavior,
  }), [incident, deflection?.behavior]);

  const ensureReleaseNarrativeMutation = useMutation({
    mutationFn: (releaseNarrative) => Api.deflections.update(deflection.id, { releaseNarrative }),
    onSuccess: (response) => {
      attemptedNarrativeRef.current = response.data.releaseNarrative ?? generatedReleaseNarrative;
      setDeflectionCache(queryClient, deflection.id, response.data);
    },
    onError: () => {
      attemptedNarrativeRef.current = null;
    },
  });

  useEffect(() => {
    if (!deflection?.id || deflection.releaseNarrative != null || !incidentReady) {
      return;
    }

    if (attemptedNarrativeRef.current === generatedReleaseNarrative || ensureReleaseNarrativeMutation.isPending) {
      return;
    }

    attemptedNarrativeRef.current = generatedReleaseNarrative;
    ensureReleaseNarrativeMutation.mutate(generatedReleaseNarrative);
  }, [
    deflection?.id,
    deflection?.releaseNarrative,
    generatedReleaseNarrative,
    incidentReady,
    ensureReleaseNarrativeMutation.isPending,
  ]);

  return deflection?.releaseNarrative ?? generatedReleaseNarrative;
}

export default useEnsureReleaseNarrative;
