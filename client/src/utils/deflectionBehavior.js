export function composeBehavior (generatedNarrative, behaviorAdditions) {
  const generated = (generatedNarrative || '').trim();
  const additions = (behaviorAdditions || '').trim();

  if (generated && additions) {
    return `${generated}\n\n${additions}`;
  }

  return generated || additions || '';
}

export function buildDeflectionUpdatePayload ({ generatedNarrative, behaviorAdditions, deflectionDetails, volunteeredToReset }) {
  const normalizedBehaviorAdditions = (behaviorAdditions || '').trim();
  return {
    behavior: composeBehavior(generatedNarrative, normalizedBehaviorAdditions),
    behaviorAdditions: normalizedBehaviorAdditions || null,
    ...(deflectionDetails && {
      deflectionDetails: [...(deflectionDetails ?? [])]
        .map((detailId) => detailId)
        .sort((a, b) => String(a).localeCompare(String(b))),
    }),
    volunteeredToReset,
  };
}
