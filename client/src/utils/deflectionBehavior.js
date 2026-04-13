export function composeBehavior (generatedNarrative, behaviorNarrative) {
  const generated = (generatedNarrative || '').trim();
  const additions = (behaviorNarrative || '').trim();

  if (generated && additions) {
    return `${generated}\n\n${additions}`;
  }

  return generated || additions || '';
}

export function buildDeflectionUpdatePayload ({ generatedNarrative, behaviorNarrative, deflectionDetails, volunteeredToReset }) {
  const normalizedBehaviorAdditions = (behaviorNarrative || '').trim();
  return {
    behavior: composeBehavior(generatedNarrative, normalizedBehaviorAdditions),
    behaviorNarrative: normalizedBehaviorAdditions || null,
    ...(deflectionDetails && {
      deflectionDetails: [...(deflectionDetails ?? [])]
        .map((detailId) => detailId)
        .sort((a, b) => String(a).localeCompare(String(b))),
    }),
    volunteeredToReset,
  };
}
