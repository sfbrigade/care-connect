import { DateTime } from 'luxon';

import { formatTimelineTimestamp } from '../../utils/format';

const TIMELINE_STATUSES = [
  'DETAINED',
  'ONSITE_AWAITING_TRANSFER',
  'AWAITING_INTAKE',
  'IN_MEDICAL_INTAKE',
  'IN_CHAIR',
  'RELEASED',
  'EXITED',
];

const STATUS_RANKS = {
  DETAINED: 0,
  ONSITE_AWAITING_TRANSFER: 1,
  AWAITING_INTAKE: 2,
  READY_FOR_INTAKE: 2,
  IN_MEDICAL_INTAKE: 3,
  FAILED_INTAKE: 3,
  IN_CHAIR: 4,
  RELEASED: 5,
  EXITED: 6,
  DEATH_IN_CUSTODY: 6,
  DEATH_IN_FACILITY: 6,
};

const STATUS_LABELS = {
  DETAINED: 'Detained',
  ONSITE_AWAITING_TRANSFER: 'Arrived at RESET',
  AWAITING_INTAKE: 'Custody transferred',
  IN_MEDICAL_INTAKE: 'Medical intake started',
  IN_CHAIR: 'Medical intake completed',
  RELEASED: 'Released',
  EXITED: 'Exited',
};

const DIRECT_STATUS_FIELDS = {
  DETAINED: { timestamp: 'createdAt', actor: 'createdBy' },
  ONSITE_AWAITING_TRANSFER: { timestamp: 'arrivedAt' },
  AWAITING_INTAKE: { timestamp: 'transferredAt', actor: 'transferredBy' },
  IN_MEDICAL_INTAKE: { timestamp: 'medicalIntakeStartedAt', actor: 'medicalIntakeStartedBy' },
  RELEASED: { timestamp: 'releasedAt', actor: 'releasedBy' },
  EXITED: { timestamp: 'exitedAt', actor: 'exitedBy' },
};

function firstInitialLastName (user) {
  if (!user?.firstName || !user?.lastName) return null;
  return `${user.firstName.trim().charAt(0)}. ${user.lastName.trim()}`;
}

function findUpdate (deflection, status) {
  return (deflection?.deflectionUpdates ?? [])
    .filter(update => update.subjectStatus === status)
    .sort((a, b) => DateTime.fromISO(String(a.updatedAt)).toMillis() - DateTime.fromISO(String(b.updatedAt)).toMillis())[0];
}

function getMilestoneData (deflection, status) {
  const directFields = DIRECT_STATUS_FIELDS[status];
  const update = findUpdate(deflection, status);
  const timestamp = directFields?.timestamp
    ? deflection?.[directFields.timestamp]
    : update?.updatedAt;
  const actor = directFields?.actor
    ? deflection?.[directFields.actor]
    : update?.updatedBy;

  return {
    timestamp: timestamp ?? update?.updatedAt ?? null,
    actor: actor ?? update?.updatedBy ?? null,
  };
}

function isHappyPathExit (deflection, milestones) {
  const released = milestones.find(milestone => milestone.status === 'RELEASED');
  const exited = milestones.find(milestone => milestone.status === 'EXITED');

  return Boolean(exited?.completed && released?.completed && deflection.releaseReason === 'SOBERED');
}

function isUnhappyTerminalExit (deflection, milestones) {
  const exited = milestones.find(milestone => milestone.status === 'EXITED');

  return Boolean(exited?.completed && !isHappyPathExit(deflection, milestones));
}

function getUnhappyExitLabel (deflection) {
  if (deflection.exitDestination === 'JAIL') return 'Exited (jail)';
  if (deflection.releaseReason === 'MEDICAL_ISSUE') return 'Exited (medical)';
  if (deflection.releaseReason === 'BH_EMERGENCY_5150') return 'Exited (behavioral)';
  if (deflection.releaseReason === 'OTHER') return 'Exited (other)';

  return STATUS_LABELS.EXITED;
}

function buildUnhappyTerminalTimeline (deflection, milestones) {
  const exitedIndex = milestones.findIndex(milestone => milestone.status === 'EXITED');
  const completedBeforeExit = milestones.slice(0, exitedIndex).filter(milestone => milestone.completed);

  return [
    ...completedBeforeExit,
    {
      ...milestones[exitedIndex],
      interrupted: true,
      label: getUnhappyExitLabel(deflection),
    },
  ];
}

export function buildPersonStatusTimeline (deflection, { viewerMode = 'custody', now = DateTime.now() } = {}) {
  if (!deflection) return [];

  const currentRank = STATUS_RANKS[deflection.subjectStatus] ?? -1;
  const statuses = viewerMode === 'care'
    ? TIMELINE_STATUSES.filter(status => status !== 'DETAINED')
    : TIMELINE_STATUSES;

  const milestones = statuses.map(status => {
    const { timestamp, actor } = getMilestoneData(deflection, status);
    const showActor = status !== 'ONSITE_AWAITING_TRANSFER';
    const active = currentRank >= STATUS_RANKS[status];

    return {
      status,
      label: STATUS_LABELS[status],
      active,
      completed: Boolean(timestamp),
      timestamp: timestamp ? formatTimelineTimestamp(timestamp, now) : (active ? 'Time unavailable' : null),
      actor: showActor ? firstInitialLastName(actor) : null,
      isExit: status === 'EXITED',
    };
  });

  if (isUnhappyTerminalExit(deflection, milestones)) {
    return buildUnhappyTerminalTimeline(deflection, milestones);
  }

  return milestones;
}
