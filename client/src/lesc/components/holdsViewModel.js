import { isValidDeflection, isValidIncident } from '../../utils/validators';

export function isInitialLoading (isFetching, data) {
  return !!isFetching && data === undefined;
}

export function buildAutoCancelledHoldsMessage (count) {
  if (count === 1) {
    return '1 hold was auto-canceled because it expired.';
  }

  return `${count} holds were auto-canceled because they expired.`;
}

export function detectAutoCancelledExpiredHolds ({
  previousDeflectionIds = [],
  currentDeflections = [],
  historyDeflections = [],
}) {
  if (previousDeflectionIds.length === 0) return null;

  const currentDeflectionIds = new Set(currentDeflections.map((deflection) => deflection.id));
  const removedDeflectionIds = previousDeflectionIds.filter((id) => !currentDeflectionIds.has(id));
  if (removedDeflectionIds.length === 0) return null;

  const removedSet = new Set(removedDeflectionIds);
  const expiredDeflections = historyDeflections.filter((d) =>
    removedSet.has(d.id) && d.status === 'EXPIRED'
  );

  if (expiredDeflections.length === 0) return null;

  return {
    count: expiredDeflections.length,
  };
}

export function buildAdminCancelledHoldsMessage ({ count, allCancelled, personName, facilityName }) {
  if (allCancelled) {
    return `All active holds were cancelled by ${facilityName}. Incident was moved to History.`;
  }
  if (count === 1) {
    const name = personName || 'this person';
    return `${facilityName} cancelled hold for ${name}. Do not bring this person to ${facilityName}.`;
  }
  return `${facilityName} cancelled ${count} holds. Do not bring these persons to ${facilityName}.`;
}

export function getTransferCodeStatus ({ incidents = [], atFacility = false, canArrive = false }) {
  const activeDeflections = incidents.flatMap((incident) =>
    (incident?.deflections ?? []).map((deflection) => ({ incident, deflection }))
  );

  if (activeDeflections.length === 0) return null;

  const allDetailsComplete = activeDeflections.every(({ incident, deflection }) =>
    isValidIncident(incident) && isValidDeflection(deflection)
  );

  if (!allDetailsComplete) return null;

  if (!atFacility && canArrive) {
    return {
      icon: 'locked',
      label: activeDeflections.length === 1 ? 'Tap to unlock transfer code' : 'Tap to unlock transfer codes',
    };
  }

  if (atFacility) {
    return {
      icon: 'ready',
      label: 'Transfer codes ready',
    };
  }

  return null;
}

function toMillis (value) {
  if (!value) return 0;
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? 0 : asDate.getTime();
}

export function getDeflectionActivityMs (deflection) {
  // Only timestamps that represent events that actually happened.
  // expiresAt is a scheduled future deadline, not activity, so excluded.
  return Math.max(
    toMillis(deflection?.updatedAt),
    toMillis(deflection?.cancelledAt),
    toMillis(deflection?.exitedAt),
    toMillis(deflection?.releasedAt),
    toMillis(deflection?.medicalIntakeStartedAt),
    toMillis(deflection?.transferredAt),
    toMillis(deflection?.createdAt)
  );
}

export function groupDeflectionsByIncident (deflections = [], incidentsById = {}) {
  const deflectionsByIncident = deflections.reduce((acc, deflection) => {
    if (!acc[deflection.incidentId]) {
      acc[deflection.incidentId] = [];
    }
    acc[deflection.incidentId].push(deflection);
    return acc;
  }, {});

  return Object.entries(deflectionsByIncident)
    .map(([incidentId, incidentDeflections]) => ({
      incidentId,
      incident: incidentsById[incidentId],
      deflections: [...incidentDeflections].sort((a, b) => getDeflectionActivityMs(b) - getDeflectionActivityMs(a)),
      latestActivityMs: incidentDeflections
        .map(getDeflectionActivityMs)
        .sort((a, b) => b - a)[0] ?? 0,
    }))
    .sort((a, b) => b.latestActivityMs - a.latestActivityMs);
}
