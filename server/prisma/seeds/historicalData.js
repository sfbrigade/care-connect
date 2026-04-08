// Generates 50 synthetic scenarios (45 historical + 5 in-progress) for dashboard testing.
// Idempotent: skips if sentinel cadNumber already exists.

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addMins (date, m) { return new Date(date.getTime() + m * 60_000); }
function addHrs (date, h) { return new Date(date.getTime() + h * 3_600_000); }
function addDays (date, d) { return new Date(date.getTime() + d * 86_400_000); }
function randInt (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick (arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function weightedPick (items) {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.w; if (r <= 0) return item.v; }
  return items.at(-1).v;
}

// Random timestamp in the past, spread across daylight hours
function randomPastTime (daysAgoMin, daysAgoMax) {
  const now = Date.now();
  const base = now - randInt(daysAgoMin, daysAgoMax) * 86_400_000;
  const d = new Date(base);
  d.setHours(randInt(6, 23), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

// ─── Data pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'William', 'Linda',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah',
  'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty',
  'Anthony', 'Margaret', 'Mark', 'Sandra', 'Steven', 'Dorothy', 'Paul', 'Kimberly',
  'Andrew', 'Emily', 'Kenneth', 'Donna', 'Brian', 'Amanda', 'George', 'Melissa',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez',
];

const SF_ADDRESSES = [
  { addressLine1: '850 Bryant St', city: 'San Francisco', state: 'CA', postalCode: '94103' },
  { addressLine1: '6th St & Howard St', city: 'San Francisco', state: 'CA', postalCode: '94103' },
  { addressLine1: '7th St & Market St', city: 'San Francisco', state: 'CA', postalCode: '94102' },
  { addressLine1: 'Civic Center Plaza', city: 'San Francisco', state: 'CA', postalCode: '94102' },
  { addressLine1: 'UN Plaza', city: 'San Francisco', state: 'CA', postalCode: '94102' },
  { addressLine1: '16th St & Mission St', city: 'San Francisco', state: 'CA', postalCode: '94103' },
  { addressLine1: '100 Larkin St', city: 'San Francisco', state: 'CA', postalCode: '94102' },
  { addressLine1: 'Market St & 5th St', city: 'San Francisco', state: 'CA', postalCode: '94103' },
  { addressLine1: '200 McAllister St', city: 'San Francisco', state: 'CA', postalCode: '94102' },
  { addressLine1: 'Turk St & Hyde St', city: 'San Francisco', state: 'CA', postalCode: '94102' },
];

const BEHAVIORS = [
  'Cooperative', 'Cooperative', 'Cooperative',
  'Lethargic, slurred speech',
  'Agitated but manageable',
  'Unresponsive, breathing',
  'Confused, disoriented',
  'Verbally combative',
];

// ─── Scenario factory helpers ─────────────────────────────────────────────────

function makeSubject () {
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    dateOfBirth: new Date(
      `${randInt(1960, 2000)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`
    ),
    sex: weightedPick([{ v: 'MALE', w: 60 }, { v: 'FEMALE', w: 25 }, { v: 'OTHER', w: 10 }, { v: 'UNKNOWN', w: 5 }]),
    race: weightedPick([
      { v: 'WHITE', w: 30 }, { v: 'BLACK', w: 25 }, { v: 'HISPANIC', w: 25 },
      { v: 'ASIAN', w: 10 }, { v: 'OTHER', w: 7 }, { v: 'UNKNOWN', w: 3 },
    ]),
  };
}

function makeIncidentData (facilityId, fieldUser, baseTime, arrivedAt, leftAt, completedAt, idx) {
  const addr = pick(SF_ADDRESSES);
  return {
    facilityId,
    ...addr,
    arrestedAt: addMins(baseTime, -randInt(1, 20)),
    encounteredVia: weightedPick([{ v: 'ON_VIEW', w: 60 }, { v: 'DISPATCHED', w: 40 }]),
    cadNumber: `26-${String(10000 + idx).slice(1)}`,
    caseNumber: `SF-2026-${String(50000 + idx).slice(1)}`,
    supervisorBadgeNumber: String(1000 + randInt(0, 8999)),
    createdByBadgeNumber: fieldUser.badgeNumber ?? String(1000 + randInt(0, 8999)),
    arrivedAt: arrivedAt ?? null,
    leftAt: leftAt ?? null,
    completedAt: completedAt ?? null,
    createdById: fieldUser.id,
    createdByOrganizationId: fieldUser.organizationId,
    updatedById: fieldUser.id,
    createdAt: baseTime,
  };
}

function makeDeflectionBase (facilityId, bedTypeId, fieldUser, baseTime) {
  const hasDrug = Math.random() > 0.4;
  return {
    facilityId,
    bedTypeId,
    createdById: fieldUser.id,
    narcoticsSubstance: Math.random() > 0.5,
    narcoticsParaphernalia: Math.random() > 0.7,
    drugUseEvidence: hasDrug,
    drugType: hasDrug ? weightedPick([
      { v: 'CNS_DEPRESSANTS', w: 40 }, { v: 'CNS_STIMULANTS', w: 30 },
      { v: 'NARCOTIC_ANALGESICS', w: 20 }, { v: 'HALLUCINOGENS', w: 5 },
      { v: 'CANNABIS', w: 5 },
    ]) : null,
    behavior: pick(BEHAVIORS),
    behaviorAdditions: Math.random() > 0.7 ? 'Difficulty maintaining balance' : null,
    property: weightedPick([
      { v: 'NONE', w: 40 }, { v: 'SMALL', w: 35 },
      { v: 'MEDIUM', w: 20 }, { v: 'LARGE', w: 5 },
    ]),
    currentOfficerId: fieldUser.id,
    expiresAt: addHrs(baseTime, 1),
    status: 'ACTIVE',
    subjectStatus: 'DETAINED',
    createdAt: baseTime,
  };
}

// Returns transfer fields only — subjectStatus must be set explicitly by each caller
function transferData (custodyUser, sfsoUnit, t) {
  return {
    transferredAt: t,
    transferredById: custodyUser.id,
    transferredByBadgeNumber: String(5000 + randInt(0, 3999)),
    transferredByProp115Certified: Math.random() > 0.1,
    transferredByOrganizationId: custodyUser.organizationId,
    transferredByUnitId: sfsoUnit?.id ?? null,
    transferredByTitleId: 'deputy',
  };
}

function exitData (careUser, exitDestId, housingStatusId, t) {
  return {
    exitedAt: t,
    exitedById: careUser.id,
    exitDestinationId: exitDestId,
    exitHousingStatusId: housingStatusId,
    exitConnectedToCare: weightedPick([
      { v: 'YES', w: 30 }, { v: 'NO', w: 50 }, { v: 'UNKNOWN', w: 20 },
    ]),
    // Route input may include DECLINED_CONSENT, but the stored DB value is UNKNOWN.
    exitSFResident: weightedPick([
      { v: 'YES', w: 50 }, { v: 'NO', w: 30 }, { v: 'UNKNOWN', w: 20 },
    ]),
    subjectStatus: 'EXITED',
  };
}

async function createIncidentOfficer (prisma, {
  incidentId,
  facilityId,
  officer,
  role,
  arrivedAt = null,
  leftAt = null,
  handoffReceivedAt = null,
  handoffReceivedFromId = null,
}) {
  if (!officer) return;
  await prisma.incidentOfficer.create({
    data: {
      incidentId,
      facilityId,
      officerId: officer.id,
      role,
      arrivedAt,
      leftAt,
      handoffReceivedAt,
      handoffReceivedFromId,
      badgeNumber: officer.badgeNumber ?? null,
      organizationId: officer.organizationId ?? null,
      unitId: officer.unitId ?? null,
      titleId: officer.titleId ?? null,
      createdAt: handoffReceivedAt ?? arrivedAt ?? leftAt ?? new Date(),
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function main (prisma) {
  console.log('Seeding historical data...');

  // ── Look up required references ──
  const fieldUser = await prisma.user.findUnique({ where: { email: 'sfpd@careconnectsf.org' } });
  const fieldUser2 = await prisma.user.findUnique({ where: { email: 'sfpd2@careconnectsf.org' } });
  const custodyUser = await prisma.user.findUnique({ where: { email: 'sfso@careconnectsf.org' } });
  const careUser = await prisma.user.findUnique({ where: { email: 'care@careconnectsf.org' } });

  if (!fieldUser || !fieldUser2 || !custodyUser || !careUser) {
    console.warn('Required test users not found; skipping historical data seed.');
    return;
  }

  const facility = await prisma.facility.findUnique({ where: { subdomain: 'reset' } });
  if (!facility) {
    console.warn('RESET facility not found; skipping historical data seed.');
    return;
  }

  const bedType = await prisma.bedType.findFirst({ where: { facilityId: facility.id } });
  if (!bedType) {
    console.warn('No bed type found for RESET; skipping historical data seed.');
    return;
  }

  // Idempotency check
  const sentinel = await prisma.incident.findFirst({
    where: { cadNumber: 'HIST-SENTINEL' },
  });
  if (sentinel) {
    console.log('Historical data already seeded; skipping.');
    return;
  }

  // ── Look up lookup tables ──
  const sfsoUnit = await prisma.unit.findFirst({ where: { organizationId: 'sfso' } });

  const cancelReasons = await prisma.deflectionCancelReason.findMany();
  const releaseReasonSobered = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'sobered' } });
  const releaseReasonMedical = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'medical_issue' } });
  const releaseReasonDeathCustody = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'death_in_custody' } });
  const refusalReasonMedical = await prisma.deflectionRefusalReason.findUnique({ where: { id: 'medical_issue' } });

  const exitDestinations = await prisma.deflectionExitDestination.findMany();
  const exitHousingStatuses = await prisma.deflectionExitHousingStatus.findMany();
  const deflectionDetails = await prisma.deflectionDetail.findMany();

  const exitDestStreet = exitDestinations.find(d => d.id === 'street');
  const exitDestHome = exitDestinations.find(d => d.id === 'home');
  const exitDestServices = exitDestinations.find(d => d.id === 'services_non_hospital');
  const exitDestHospital = exitDestinations.find(d => d.id === 'hospital');
  const exitDestDeclined = exitDestinations.find(d => d.id === 'declined_consent');

  const commonExitDests = [exitDestStreet, exitDestHome, exitDestServices, exitDestDeclined].filter(Boolean);
  const housingStatuses = exitHousingStatuses;

  if (!releaseReasonSobered || cancelReasons.length === 0) {
    console.warn('Missing reference data; skipping historical data seed.');
    return;
  }

  // ── Build scenario list ──
  // Each entry: { type, daysAgoMin, daysAgoMax }
  const scenarios = [
    // 20 full happy-path exits
    ...Array.from({ length: 20 }, () => ({ type: 'full_exit', daysAgoMin: 3, daysAgoMax: 90 })),
    // 2 officer handoff happy paths
    ...Array.from({ length: 2 }, () => ({ type: 'handoff_full_exit', daysAgoMin: 3, daysAgoMax: 90 })),
    // 7 cancelled before arrival
    ...Array.from({ length: 7 }, () => ({ type: 'cancelled_early', daysAgoMin: 2, daysAgoMax: 90 })),
    // 3 cancelled after transfer to custody
    ...Array.from({ length: 3 }, () => ({ type: 'cancelled_after_transfer', daysAgoMin: 2, daysAgoMax: 80 })),
    // 4 hospital direct exits
    ...Array.from({ length: 4 }, () => ({ type: 'hospital_exit', daysAgoMin: 5, daysAgoMax: 85 })),
    // 3 failed intake → released → exited
    ...Array.from({ length: 3 }, () => ({ type: 'failed_intake', daysAgoMin: 5, daysAgoMax: 75 })),
    // 2 medical release (auto-exits)
    ...Array.from({ length: 2 }, () => ({ type: 'medical_release', daysAgoMin: 7, daysAgoMax: 60 })),
    // 1 jail exit
    { type: 'jail_exit', daysAgoMin: 10, daysAgoMax: 70 },
    // 2 expired holds
    ...Array.from({ length: 2 }, () => ({ type: 'expired', daysAgoMin: 2, daysAgoMax: 60 })),
    // 1 death in custody
    { type: 'death', daysAgoMin: 14, daysAgoMax: 90 },
    // 5 in-progress (recent)
    { type: 'in_progress_detained', daysAgoMin: 0, daysAgoMax: 0 },
    { type: 'in_progress_onsite', daysAgoMin: 0, daysAgoMax: 0 },
    { type: 'in_progress_awaiting', daysAgoMin: 0, daysAgoMax: 0 },
    { type: 'in_progress_ready', daysAgoMin: 0, daysAgoMax: 0 },
    { type: 'in_progress_chair', daysAgoMin: 0, daysAgoMax: 0 },
  ];

  let holdsAdded = 0;
  let inTransitAdded = 0;
  let occupiedAdded = 0;

  for (let idx = 0; idx < scenarios.length; idx++) {
    const { type, daysAgoMin, daysAgoMax } = scenarios[idx];

    // Base time: when incident was created
    let base;
    if (daysAgoMin === 0) {
      // In-progress: created within last 1-4 hours
      base = addHrs(new Date(), -(1 + idx * 0.5));
    } else {
      base = randomPastTime(daysAgoMin, daysAgoMax);
    }

    // Shared timing deltas (realistic durations)
    const arrivedDelta = randInt(5, 25);       // mins: creation → arrived
    const transferDelta = randInt(5, 25);      // mins: arrived → transfer
    const safetyCheckDelta = randInt(5, 20);   // mins: transfer → safety check
    const admitDelta = randInt(5, 30);         // mins: safety check → admit
    const intakeDelta = randInt(15, 60);       // mins: admit → intake complete
    const inCustodyDuration = randInt(60, 480); // mins: intake → release
    const exitDelta = randInt(15, 45);         // mins: release → exit

    const tArrived = addMins(base, arrivedDelta);
    const tTransfer = addMins(tArrived, transferDelta);
    const tSafetyCheck = addMins(tTransfer, safetyCheckDelta);
    const tAdmit = addMins(tSafetyCheck, admitDelta);
    const tIntake = addMins(tAdmit, intakeDelta);
    const tRelease = addMins(tIntake, inCustodyDuration);
    const tExit = addMins(tRelease, exitDelta);

    // Pick optional deflection detail
    const detail = deflectionDetails.length > 0 && Math.random() > 0.5
      ? { connect: { id: pick(deflectionDetails).id } }
      : undefined;

    // ── Create subject (most scenarios) ──
    let subject = null;
    if (type !== 'expired') {
      subject = await prisma.subject.create({ data: makeSubject() });
    }

    // ── Sentinel gets special cadNumber on first scenario ──
    const isSentinel = idx === 0;

    // ── Build per-type incident + deflection ──

    if (type === 'full_exit') {
      const incident = await prisma.incident.create({
        data: {
          ...makeIncidentData(facility.id, fieldUser, base, tArrived, tExit, tExit, idx),
          ...(isSentinel ? { cadNumber: 'HIST-SENTINEL' } : {}),
        },
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tExit,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          releasedAt: tRelease,
          releasedById: custodyUser.id,
          releaseReasonId: releaseReasonSobered.id,
          ...exitData(careUser, pick(commonExitDests)?.id ?? 'street', pick(housingStatuses)?.id ?? 'unknown', tExit),
          ...(detail ? { deflectionDetails: detail } : {}),
        },
      });
    }

    else if (type === 'handoff_full_exit') {
      const tHandoff = addMins(base, randInt(10, Math.max(11, arrivedDelta - 1)));
      const incident = await prisma.incident.create({
        data: {
          ...makeIncidentData(facility.id, fieldUser, base, null, null, tExit, idx),
          ...(isSentinel ? { cadNumber: 'HIST-SENTINEL' } : {}),
        },
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser2,
        role: 'RECEIVING',
        arrivedAt: tArrived,
        leftAt: tExit,
        handoffReceivedAt: tHandoff,
        handoffReceivedFromId: fieldUser.id,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          currentOfficerId: fieldUser2.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          releasedAt: tRelease,
          releasedById: custodyUser.id,
          releaseReasonId: releaseReasonSobered.id,
          ...exitData(careUser, pick(commonExitDests)?.id ?? 'street', pick(housingStatuses)?.id ?? 'unknown', tExit),
          ...(detail ? { deflectionDetails: detail } : {}),
        },
      });
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          arrivedAt: tArrived,
          leftAt: tExit,
          completedAt: tExit,
        },
      });
    }

    else if (type === 'cancelled_early') {
      const tCancel = addMins(base, randInt(5, 60));
      const cancelReason = pick(cancelReasons);
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, null, null, tCancel, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          subjectStatus: 'DETAINED',
          status: 'CANCELLED',
          cancelReasonId: cancelReason.id,
          cancelledAt: tCancel,
          cancelledById: fieldUser.id,
        },
      });
    }

    else if (type === 'cancelled_after_transfer') {
      const tCancel = addMins(tTransfer, randInt(10, 90));
      const cancelReason = pick(cancelReasons);
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, null, tCancel, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'AWAITING_INTAKE',
          status: 'CANCELLED',
          cancelReasonId: cancelReason.id,
          cancelledAt: tCancel,
          cancelledById: custodyUser.id,
        },
      });
    }

    else if (type === 'hospital_exit') {
      const tHospital = addMins(tSafetyCheck, randInt(5, 30));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, tHospital, tHospital, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tHospital,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          releaseReasonId: releaseReasonMedical?.id ?? releaseReasonSobered.id,
          releasedAt: tHospital,
          releasedById: custodyUser.id,
          exitedAt: tHospital,
          exitedById: custodyUser.id,
          exitDestinationId: exitDestHospital?.id ?? null,
        },
      });
    }

    else if (type === 'failed_intake') {
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, tExit, tExit, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tExit,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          rejectedAt: tIntake,
          rejectedById: careUser.id,
          releasedAt: tRelease,
          releasedById: custodyUser.id,
          releaseReasonId: releaseReasonSobered.id,
          ...exitData(careUser, pick(commonExitDests)?.id ?? 'street', pick(housingStatuses)?.id ?? 'unknown', tExit),
        },
      });
    }

    else if (type === 'medical_release') {
      // Medical release auto-exits immediately (no explicit exit step needed)
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, tRelease, tRelease, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tRelease,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          releasedAt: tRelease,
          releasedById: custodyUser.id,
          releaseReasonId: releaseReasonMedical?.id ?? releaseReasonSobered.id,
          exitedAt: tRelease,
          exitedById: custodyUser.id,
          exitDestinationId: exitDestHospital?.id ?? null,
        },
      });
    }

    else if (type === 'jail_exit') {
      const tJail = addMins(tTransfer, randInt(15, 60));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, tJail, tJail, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tJail,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReasonMedical?.id ?? null,
          exitedAt: tJail,
          exitedById: custodyUser.id,
          exitDestinationId: 'jail',
        },
      });
    }

    else if (type === 'expired') {
      // Hold created but no follow-up; expired after 1 hour
      const tExpiry = addHrs(base, 1);
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, null, null, tExpiry, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: null,
          expiresAt: tExpiry,
          subjectStatus: 'DETAINED',
          status: 'EXPIRED',
        },
      });
    }

    else if (type === 'death') {
      const tDeath = addMins(tIntake, randInt(30, 180));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tArrived, tDeath, tDeath, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tArrived,
        leftAt: tDeath,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'DEATH_IN_CUSTODY',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          releaseReasonId: releaseReasonDeathCustody?.id ?? 'death_in_custody',
        },
      });
    }

    // ── In-progress scenarios ──

    else if (type === 'in_progress_detained') {
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, null, null, null, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          subjectStatus: 'DETAINED',
          status: 'ACTIVE',
        },
      });
      holdsAdded++;
      inTransitAdded++;
    }

    else if (type === 'in_progress_onsite') {
      const tOnsite = addMins(base, randInt(10, 20));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tOnsite, null, null, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tOnsite,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
          status: 'ACTIVE',
        },
      });
      holdsAdded++;
      inTransitAdded++;
    }

    else if (type === 'in_progress_awaiting') {
      const tOnsite = addMins(base, randInt(5, 15));
      const tTrans = addMins(tOnsite, randInt(5, 15));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tOnsite, null, null, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tOnsite,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTrans),
          subjectStatus: 'AWAITING_INTAKE',
        },
      });
      holdsAdded++;
    }

    else if (type === 'in_progress_ready') {
      const tOnsite = addMins(base, randInt(5, 15));
      const tTrans = addMins(tOnsite, randInt(5, 15));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tOnsite, null, null, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tOnsite,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTrans),
          subjectStatus: 'READY_FOR_INTAKE',
        },
      });
      holdsAdded++;
    }

    else if (type === 'in_progress_chair') {
      const tOnsite = addMins(base, randInt(5, 15));
      const tTrans = addMins(tOnsite, randInt(5, 15));
      const tAdm = addMins(tTrans, randInt(10, 35));
      const incident = await prisma.incident.create({
        data: makeIncidentData(facility.id, fieldUser, base, tOnsite, null, null, idx),
      });
      await createIncidentOfficer(prisma, {
        incidentId: incident.id,
        facilityId: facility.id,
        officer: fieldUser,
        role: 'ARRESTING',
        arrivedAt: tOnsite,
      });
      await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTrans),
          subjectStatus: 'IN_CHAIR',
          admittedAt: tAdm,
          admittedById: careUser.id,
        },
      });
      occupiedAdded++;
    }

    console.log(`  [${idx + 1}/50] ${type}`);
  }

  // ── Update bedType capacity to reflect active in-progress holds ──
  if (holdsAdded > 0 || occupiedAdded > 0 || inTransitAdded > 0) {
    await prisma.bedType.update({
      where: { id: bedType.id },
      data: {
        holds: { increment: holdsAdded },
        inTransit: { increment: inTransitAdded },
        occupied: { increment: occupiedAdded },
        available: { decrement: holdsAdded + occupiedAdded },
      },
    });
  }

  console.log(`Done! Seeded 50 historical scenarios (holds +${holdsAdded}, inTransit +${inTransitAdded}, occupied +${occupiedAdded}).`);
}
