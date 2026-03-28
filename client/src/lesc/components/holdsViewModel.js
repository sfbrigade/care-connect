import { DateTime } from 'luxon';

import { formatAddress } from '../../utils/format';
import { isCustodyTransferredStatus } from './deflectionStatusChipUtils';

export const SFPD_ACTIVE_SUBJECT_STATUSES = 'DETAINED,ONSITE_AWAITING_TRANSFER';
export const SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES = 'AWAITING_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR,RELEASED,EXITED';

export function mergeHistoryDeflections (inactiveDeflections = [], postTransferActiveDeflections = []) {
  const merged = [...inactiveDeflections, ...postTransferActiveDeflections];
  const byId = new Map();
  for (const deflection of merged) {
    byId.set(deflection.id, deflection);
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function shouldShowIncidentInActive (incident, deflections) {
  return !!incident && (deflections?.length ?? 0) > 0;
}

export function shouldShowTransferredHoldsPrompt (incident, deflections) {
  return !!incident?.arrivedAt && !incident?.leftAt && (deflections?.length ?? 0) === 0;
}

export function getTransferredDeflectionsForIncident (deflections = [], incidentId) {
  if (!incidentId) return [];

  return deflections.filter((deflection) => (
    deflection.incidentId === incidentId &&
    isCustodyTransferredStatus(deflection.subjectStatus)
  ));
}

export function buildActiveHoldDisplayDeflections (activeDeflections = [], historyDeflections = [], incident) {
  if (!incident?.id) return activeDeflections;

  if ((activeDeflections?.length ?? 0) === 0) {
    return activeDeflections;
  }

  const transferredDeflections = getTransferredDeflectionsForIncident(historyDeflections, incident.id);
  const combinedDeflections = [...activeDeflections, ...transferredDeflections];
  const byId = new Map();

  for (const deflection of combinedDeflections) {
    byId.set(deflection.id, deflection);
  }

  return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function buildHistoryDisplayDeflections (historyDeflections = [], incident, hasActiveHolds = false) {
  if (!incident?.id || !hasActiveHolds) return historyDeflections;

  return historyDeflections.filter((deflection) => !(
    deflection.incidentId === incident.id &&
    isCustodyTransferredStatus(deflection.subjectStatus)
  ));
}

export function isInitialLoading (isFetching, data) {
  return !!isFetching && data === undefined;
}

export function getExpiredDeflectionsForIncident (deflections = [], incidentId) {
  if (!incidentId) return [];

  return deflections.filter((deflection) => (
    deflection.incidentId === incidentId &&
    deflection.status === 'EXPIRED'
  ));
}

export function buildAutoCancelledHoldsMessage (count) {
  if (count === 1) {
    return '1 hold was auto-canceled because it expired.';
  }

  return `${count} holds were auto-canceled because they expired.`;
}

export function detectAutoCancelledExpiredHolds ({
  previousIncidentId,
  previousDeflectionIds = [],
  currentDeflections = [],
  historyDeflections = [],
}) {
  const incidentId = previousIncidentId ?? currentDeflections[0]?.incidentId;
  if (!incidentId || previousDeflectionIds.length === 0) return null;

  const currentDeflectionIds = new Set(currentDeflections.map((deflection) => deflection.id));
  const removedDeflectionIds = previousDeflectionIds.filter((id) => !currentDeflectionIds.has(id));
  if (removedDeflectionIds.length === 0) return null;

  const removedDeflectionIdSet = new Set(removedDeflectionIds);
  const expiredDeflections = getExpiredDeflectionsForIncident(historyDeflections, incidentId)
    .filter((deflection) => removedDeflectionIdSet.has(deflection.id));

  if (expiredDeflections.length === 0) return null;

  return {
    incidentId,
    count: expiredDeflections.length,
    allExpired: currentDeflectionIds.size === 0,
  };
}

function toMillis (value) {
  if (!value) return 0;
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? 0 : asDate.getTime();
}

export function getDeflectionActivityMs (deflection) {
  return Math.max(
    toMillis(deflection?.updatedAt),
    toMillis(deflection?.cancelledAt),
    toMillis(deflection?.exitedAt),
    toMillis(deflection?.releasedAt),
    toMillis(deflection?.admittedAt),
    toMillis(deflection?.transferredAt),
    toMillis(deflection?.expiresAt),
    toMillis(deflection?.createdAt)
  );
}

export function splitCurrentIncidentDeflections (deflections = [], incident, hasActiveHolds = false) {
  const shouldShowCurrentIncidentGroup = !!incident && !hasActiveHolds;
  const currentIncidentDeflections = shouldShowCurrentIncidentGroup
    ? deflections.filter((deflection) => deflection.incidentId === incident.id)
    : [];
  const currentIncidentDeflectionIds = new Set(currentIncidentDeflections.map((deflection) => deflection.id));
  const remainingDeflections = deflections.filter((deflection) => !currentIncidentDeflectionIds.has(deflection.id));

  return {
    shouldShowCurrentIncidentGroup,
    currentIncidentDeflections,
    remainingDeflections,
  };
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

export function buildIncidentSubtitle (incident) {
  const address = incident ? formatAddress(incident) : '';
  const time = incident?.arrestedAt
    ? DateTime.fromISO(incident.arrestedAt).toLocaleString(DateTime.TIME_SIMPLE)
    : '';
  const safeAddress = address || 'Address unavailable';
  const safeTime = time || 'Time unavailable';
  return `${safeAddress} • ${safeTime}`;
}
