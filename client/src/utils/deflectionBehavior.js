export function composeBehavior (generatedNarrative, behaviorNarrative) {
  const generated = (generatedNarrative || '').trim();
  const additions = (behaviorNarrative || '').trim();

  if (generated && additions) {
    return `${generated}\n\n${additions}`;
  }

  return generated || additions || '';
}

export function buildDeflectionUpdatePayload ({ generatedNarrative, behaviorNarrative, deflectionDetails }) {
  const normalizedBehaviorNarrative = (behaviorNarrative || '').trim();
  return {
    behavior: composeBehavior(generatedNarrative, normalizedBehaviorNarrative),
    behaviorNarrative: normalizedBehaviorNarrative || null,
    ...(deflectionDetails && {
      deflectionDetails: [...(deflectionDetails ?? [])]
        .map((detailId) => detailId)
        .sort((a, b) => String(a).localeCompare(String(b))),
    }),
  };
}
