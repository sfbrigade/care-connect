/**
 * Centralized helpers for officer–incident relationships and permissions.
 *
 * Q1  getActiveIncidentForOfficer  — returns the officer's active incident (or null)
 * Q6  getOfficerPermissions        — returns permission flags for this officer on this incident
 *     canModifyDeflection          — can this user modify a deflection?
 */

const PRE_TRANSFER_STATUSES = ['DETAINED', 'ONSITE_AWAITING_TRANSFER'];

/**
 * Are all required incident fields filled in?
 */
export function isIncidentDetailsComplete (incident) {
  return !!(
    incident.addressLine1 &&
    incident.city &&
    incident.state &&
    incident.arrestedAt &&
    incident.encounteredVia &&
    incident.cadNumber &&
    incident.caseNumber &&
    incident.supervisorBadgeNumber
  );
}

/**
 * Find the active incident for an officer. An officer has an active incident if:
 *   (a) they control at least one active pre-transfer hold, OR
 *   (b) they are checked in at RESET (arrived but not left)
 *
 * Returns the incident (with incidentOfficers for this officer) or null.
 */
export async function getActiveIncidentForOfficer (prisma, facilityId, officerId) {
  // Case (a): officer controls an active pre-transfer hold
  const heldDeflection = await prisma.deflection.findFirst({
    where: {
      currentOfficerId: officerId,
      status: 'ACTIVE',
      subjectStatus: { in: PRE_TRANSFER_STATUSES },
      incident: {
        facilityId,
        completedAt: null,
      },
    },
    include: {
      incident: {
        include: {
          incidentOfficers: {
            where: { officerId },
          },
        },
      },
    },
  });

  if (heldDeflection?.incident) {
    return heldDeflection.incident;
  }

  // Case (b): officer is checked in at RESET (arrived but not left)
  const officerRecord = await prisma.incidentOfficer.findFirst({
    where: {
      officerId,
      facilityId,
      arrivedAt: { not: null },
      leftAt: null,
      incident: {
        completedAt: null,
      },
    },
    include: {
      incident: {
        include: {
          incidentOfficers: {
            where: { officerId },
          },
        },
      },
    },
  });

  return officerRecord?.incident ?? null;
}

/**
 * Compute permission flags for an officer on an incident.
 * Returns an object of booleans the client can use directly.
 */
export async function getOfficerPermissions (prisma, incident, officerId) {
  if (!incident) {
    return {
      isCreator: false,
      canExtend: false,
      canArrive: false,
      canLeave: false,
      canCancelIncident: false,
      canEditIncident: false,
      canCreateHold: false,
      canHandoff: false,
    };
  }

  const isCreator = incident.createdById === officerId;

  const officerRecord = await prisma.incidentOfficer.findFirst({
    where: {
      incidentId: incident.id,
      facilityId: incident.facilityId,
      officerId,
    },
  });

  const hasArrived = !!officerRecord?.arrivedAt;
  const hasLeft = !!officerRecord?.leftAt;

  const activePreTransferHolds = await prisma.deflection.count({
    where: {
      incidentId: incident.id,
      currentOfficerId: officerId,
      status: 'ACTIVE',
      subjectStatus: { in: PRE_TRANSFER_STATUSES },
    },
  });

  const controlsHolds = activePreTransferHolds > 0;

  // Full handoff: all active holds (any status) belong to this officer
  const otherOfficerActiveHolds = await prisma.deflection.count({
    where: {
      incidentId: incident.id,
      status: 'ACTIVE',
      currentOfficerId: { not: officerId },
    },
  });
  const hasFullHandoff = !isCreator && otherOfficerActiveHolds === 0;

  const incidentDetailsComplete = isIncidentDetailsComplete(incident);

  return {
    isCreator,
    incidentDetailsComplete,
    canExtend: controlsHolds,
    canArrive: controlsHolds && !hasArrived,
    canLeave: hasArrived && !hasLeft,
    canCancelIncident: isCreator || hasFullHandoff,
    canEditIncident: isCreator,
    canCreateHold: isCreator && !hasArrived,
    canHandoff: controlsHolds && incidentDetailsComplete,
  };
}

/**
 * Can this user modify a deflection (edit fields, update subject, cancel, upload photos)?
 * Allowed for: the officer who currently controls the hold, custody users, or admins.
 */
export function canModifyDeflection (deflection, user) {
  if (user.isAdmin) return true;
  if (user.isCustody) return true;
  return deflection.currentOfficerId === user.id;
}
