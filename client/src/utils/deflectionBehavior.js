export function composeBehavior (generatedNarrative, behaviorAdditions) {
  const generated = (generatedNarrative || '').trim();
  const additions = (behaviorAdditions || '').trim();

  if (generated && additions) {
    return `${generated}\n\n${additions}`;
  }

  return generated || additions || '';
}

export function extractBehaviorAdditions (fullBehavior, generatedNarrative) {
  const normalizedFull = (fullBehavior ?? '').trim();
  const normalizedGenerated = (generatedNarrative ?? '').trim();
  if (!normalizedGenerated || !normalizedFull.startsWith(normalizedGenerated)) {
    return normalizedFull;
  }

  return normalizedFull.slice(normalizedGenerated.length).replace(/^\s+/, '');
}

export function buildDeflectionUpdatePayload ({ generatedNarrative, behaviorAdditions, deflectionDetails }) {
  return {
    behavior: composeBehavior(generatedNarrative, behaviorAdditions),
    deflectionDetails: [...(deflectionDetails ?? [])]
      .map((detailId) => detailId)
      .sort((a, b) => String(a).localeCompare(String(b))),
  };
}
