// Generates synthetic scenarios (historical + in-progress) for dashboard testing.
// Idempotent: skips if sentinel cadNumber already exists.
// Deterministic: uses a seeded PRNG so all developers see the same data.

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function mulberry32 (seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Module-level RNG seeded to a fixed value for full determinism
const rng = mulberry32(0xdeadbeef);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addMins (date, m) { return new Date(date.getTime() + m * 60_000); }
function addHrs (date, h) { return new Date(date.getTime() + h * 3_600_000); }
function randInt (min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick (arr) { return arr[Math.floor(rng() * arr.length)]; }
function weightedPick (items) {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = rng() * total;
  for (const item of items) { r -= item.w; if (r <= 0) return item.v; }
  return items.at(-1).v;
}

// Random timestamp in the past, spread across daylight hours
function randomPastTime (daysAgoMin, daysAgoMax) {
  const now = new Date();
  const daysAgo = randInt(daysAgoMin, daysAgoMax);
  const d = new Date(now.getTime() - daysAgo * 86_400_000);
  const maxHour = daysAgo === 0 ? Math.max(now.getHours() - 1, 6) : 23;
  d.setHours(randInt(6, maxHour), randInt(0, 59), randInt(0, 59), 0);
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
  { addressLine1: '850 Bryant St', city: 'San Francisco', state: 'CA', postalCode: '94103', latitude: 37.775840, longitude: -122.403370 },
  { addressLine1: '6th St & Howard St', city: 'San Francisco', state: 'CA', postalCode: '94103', latitude: 37.778140, longitude: -122.407360 },
  { addressLine1: '7th St & Market St', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.779820, longitude: -122.411800 },
  { addressLine1: 'Civic Center Plaza', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.779280, longitude: -122.418540 },
  { addressLine1: 'UN Plaza', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.779950, longitude: -122.414070 },
  { addressLine1: '16th St & Mission St', city: 'San Francisco', state: 'CA', postalCode: '94103', latitude: 37.764650, longitude: -122.419740 },
  { addressLine1: '100 Larkin St', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.779060, longitude: -122.415770 },
  { addressLine1: 'Market St & 5th St', city: 'San Francisco', state: 'CA', postalCode: '94103', latitude: 37.783680, longitude: -122.407520 },
  { addressLine1: '200 McAllister St', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.780170, longitude: -122.416910 },
  { addressLine1: 'Turk St & Hyde St', city: 'San Francisco', state: 'CA', postalCode: '94102', latitude: 37.782590, longitude: -122.416080 },
];

// Counter for SF# local IDs — deterministically incremented per subject created
let localIdCounter = 10001;

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
    localId: `SF-${localIdCounter++}`,
  };
}

function makeIncidentData (facilityId, fieldUser, baseTime, arrivedAt, leftAt, completedAt, idx) {
  const addr = pick(SF_ADDRESSES);
  return {
    facilityId,
    ...addr,
    latitude: addr.latitude,
    longitude: addr.longitude,
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
  const hasDrug = rng() > 0.4;
  return {
    facilityId,
    bedTypeId,
    createdById: fieldUser.id,
    narcoticsSubstance: rng() > 0.5,
    narcoticsParaphernalia: rng() > 0.7,
    drugUseEvidence: hasDrug,
    drugType: hasDrug
      ? weightedPick([
        { v: 'CNS_DEPRESSANTS', w: 40 }, { v: 'CNS_STIMULANTS', w: 30 },
        { v: 'NARCOTIC_ANALGESICS', w: 20 }, { v: 'HALLUCINOGENS', w: 5 },
        { v: 'CANNABIS', w: 5 },
      ])
      : null,
    behavior: pick(BEHAVIORS),
    behaviorAdditions: rng() > 0.7 ? 'Difficulty maintaining balance' : null,
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
    transferredByProp115Certified: rng() > 0.1,
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

// Creates DeflectionUpdate audit rows for each state transition in a scenario.
// Each entry in `steps` is { subjectStatus?, status?, releaseReasonId?, refusalReasonId?,
//   exitDestinationId?, exitHousingStatusId?, exitConnectedToCare?, exitSFResident?,
//   cancelReasonId?, updatedAt, updatedById }
async function createDeflectionUpdates (prisma, deflectionId, steps) {
  for (const step of steps) {
    const data = { deflectionId, updatedAt: step.updatedAt, updatedById: step.updatedById };
    if (step.subjectStatus != null) data.subjectStatus = step.subjectStatus;
    if (step.status != null) data.status = step.status;
    if (step.releaseReasonId != null) data.releaseReasonId = step.releaseReasonId;
    if (step.refusalReasonId != null) data.refusalReasonId = step.refusalReasonId;
    if (step.exitDestinationId != null) data.exitDestinationId = step.exitDestinationId;
    if (step.exitHousingStatusId != null) data.exitHousingStatusId = step.exitHousingStatusId;
    if (step.exitConnectedToCare != null) data.exitConnectedToCare = step.exitConnectedToCare;
    if (step.exitSFResident != null) data.exitSFResident = step.exitSFResident;
    if (step.cancelReasonId != null) data.cancelReasonId = step.cancelReasonId;
    await prisma.deflectionUpdate.create({ data });
  }
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
  const releaseReasonOther = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'other' } });
  const releaseReasonDeathCustody = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'death_in_custody' } });
  const releaseReasonDeathFacility = await prisma.deflectionReleaseReason.findUnique({ where: { id: 'death_in_facility' } });
  const refusalReasonMedical = await prisma.deflectionRefusalReason.findUnique({ where: { id: 'medical_issue' } });
  const refusalReasonAggressive = await prisma.deflectionRefusalReason.findUnique({ where: { id: 'aggressive_behavior' } });

  const exitDestinations = await prisma.deflectionExitDestination.findMany();
  const exitHousingStatuses = await prisma.deflectionExitHousingStatus.findMany();
  const deflectionDetails = await prisma.deflectionDetail.findMany();

  const exitDestStreet = exitDestinations.find(d => d.id === 'street');
  const exitDestHome = exitDestinations.find(d => d.id === 'home');
  const exitDestServices = exitDestinations.find(d => d.id === 'services_non_hospital');
  const exitDestHospital = exitDestinations.find(d => d.id === 'hospital');
  const exitDestDeclined = exitDestinations.find(d => d.id === 'declined_consent');
  const exitDestJail = exitDestinations.find(d => d.id === 'jail');
  const exitDestOther = exitDestinations.find(d => d.id === 'other');

  const housingStatusPermanent = exitHousingStatuses.find(s => s.id === 'permanent');
  const housingStatusSheltered = exitHousingStatuses.find(s => s.id === 'sheltered');
  const housingStatusTemporary = exitHousingStatuses.find(s => s.id === 'temporary');
  const housingStatusUnknown = exitHousingStatuses.find(s => s.id === 'unknown');
  const housingStatusDeclined = exitHousingStatuses.find(s => s.id === 'declined_consent');

  // All full-spectrum exit dests and housing statuses for varied coverage
  const allExitDests = [
    exitDestStreet, exitDestHome, exitDestServices, exitDestDeclined, exitDestOther,
  ].filter(Boolean);
  const allHousingStatuses = [
    housingStatusPermanent, housingStatusSheltered, housingStatusTemporary,
    housingStatusUnknown, housingStatusDeclined,
  ].filter(Boolean);
  const housingStatuses = exitHousingStatuses;
  const commonExitDests = [exitDestStreet, exitDestHome, exitDestServices, exitDestDeclined].filter(Boolean);

  if (!releaseReasonSobered || cancelReasons.length === 0) {
    console.warn('Missing reference data; skipping historical data seed.');
    return;
  }

  // ── Create repeat-encounter subjects (5 subjects who appear multiple times) ──
  const repeatSubjects = [];
  for (let i = 0; i < 5; i++) {
    repeatSubjects.push(await prisma.subject.create({ data: makeSubject() }));
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
    // 1 jail exit (aggressive_behavior refusal)
    { type: 'jail_exit', daysAgoMin: 10, daysAgoMax: 70 },
    // 1 jail exit with medical_issue refusal
    { type: 'jail_exit_medical', daysAgoMin: 8, daysAgoMax: 65 },
    // 2 expired holds
    ...Array.from({ length: 2 }, () => ({ type: 'expired', daysAgoMin: 2, daysAgoMax: 60 })),
    // 1 death in custody
    { type: 'death_in_custody', daysAgoMin: 14, daysAgoMax: 90 },
    // 1 death in facility (released → record-death)
    { type: 'death_in_facility', daysAgoMin: 14, daysAgoMax: 90 },
    // 60 recent exits spread across last 7 days (exitedAt + releasedAt filled)
    ...Array.from({ length: 60 }, (_, i) => ({ type: 'recent_exit', daysAgoMin: 0, daysAgoMax: 7, recentIdx: i })),
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
    const isInProgress = type.startsWith('in_progress_');
    if (isInProgress) {
      // In-progress: created within last 1-4 hours, spaced to avoid overlap
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
    const detail = deflectionDetails.length > 0 && rng() > 0.5
      ? { connect: { id: pick(deflectionDetails).id } }
      : undefined;

    // ── Create subject (most scenarios); ~30% of historical scenarios reuse a repeat subject ──
    let subject = null;
    if (type !== 'expired') {
      const useRepeat = rng() < 0.3 && repeatSubjects.length > 0;
      subject = useRepeat ? pick(repeatSubjects) : await prisma.subject.create({ data: makeSubject() });
    }

    // ── Sentinel gets special cadNumber on first scenario ──
    const isSentinel = idx === 0;

    // ── Build per-type incident + deflection ──

    if (type === 'full_exit') {
      const exitDest = pick(allExitDests) ?? exitDestStreet;
      const housingStatus = pick(allHousingStatuses) ?? housingStatusUnknown;
      const exitFields = exitData(careUser, exitDest?.id ?? 'street', housingStatus?.id ?? 'unknown', tExit);
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
      const deflection = await prisma.deflection.create({
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
          ...exitFields,
          ...(detail ? { deflectionDetails: detail } : {}),
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id },
        { subjectStatus: 'RELEASED', releaseReasonId: releaseReasonSobered.id, updatedAt: tRelease, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          exitDestinationId: exitDest?.id,
          exitHousingStatusId: housingStatus?.id,
          exitConnectedToCare: exitFields.exitConnectedToCare,
          exitSFResident: exitFields.exitSFResident,
          updatedAt: tExit,
          updatedById: careUser.id
        },
      ]);
    } else if (type === 'handoff_full_exit') {
      const exitDest = pick(allExitDests) ?? exitDestStreet;
      const housingStatus = pick(allHousingStatuses) ?? housingStatusUnknown;
      const exitFields = exitData(careUser, exitDest?.id ?? 'street', housingStatus?.id ?? 'unknown', tExit);
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
      const deflection = await prisma.deflection.create({
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
          ...exitFields,
          ...(detail ? { deflectionDetails: detail } : {}),
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser2.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id },
        { subjectStatus: 'RELEASED', releaseReasonId: releaseReasonSobered.id, updatedAt: tRelease, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          exitDestinationId: exitDest?.id,
          exitHousingStatusId: housingStatus?.id,
          exitConnectedToCare: exitFields.exitConnectedToCare,
          exitSFResident: exitFields.exitSFResident,
          updatedAt: tExit,
          updatedById: careUser.id
        },
      ]);
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          arrivedAt: tArrived,
          leftAt: tExit,
          completedAt: tExit,
        },
      });
    } else if (type === 'cancelled_early') {
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
      const deflection = await prisma.deflection.create({
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
      await createDeflectionUpdates(prisma, deflection.id, [
        { status: 'CANCELLED', cancelReasonId: cancelReason.id, updatedAt: tCancel, updatedById: fieldUser.id },
      ]);
    } else if (type === 'cancelled_after_transfer') {
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
      const deflection = await prisma.deflection.create({
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
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { status: 'CANCELLED', cancelReasonId: cancelReason.id, updatedAt: tCancel, updatedById: custodyUser.id },
      ]);
    } else if (type === 'hospital_exit') {
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
      const deflection = await prisma.deflection.create({
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
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          releaseReasonId: releaseReasonMedical?.id,
          exitDestinationId: exitDestHospital?.id,
          updatedAt: tHospital,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'failed_intake') {
      const exitDest = pick(commonExitDests) ?? exitDestStreet;
      const housingStatus = pick(housingStatuses) ?? housingStatusUnknown;
      const exitFields = exitData(careUser, exitDest?.id ?? 'street', housingStatus?.id ?? 'unknown', tExit);
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
      const deflection = await prisma.deflection.create({
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
          ...exitFields,
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'FAILED_INTAKE', updatedAt: tIntake, updatedById: careUser.id },
        { subjectStatus: 'RELEASED', releaseReasonId: releaseReasonSobered.id, updatedAt: tRelease, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          exitDestinationId: exitDest?.id,
          exitHousingStatusId: housingStatus?.id,
          exitConnectedToCare: exitFields.exitConnectedToCare,
          exitSFResident: exitFields.exitSFResident,
          updatedAt: tExit,
          updatedById: careUser.id
        },
      ]);
    } else if (type === 'medical_release') {
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
      const deflection = await prisma.deflection.create({
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
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id },
        {
          subjectStatus: 'EXITED',
          releaseReasonId: releaseReasonMedical?.id,
          exitDestinationId: exitDestHospital?.id,
          updatedAt: tRelease,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'jail_exit') {
      // Aggressive behavior refusal reason → jail
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
      const deflection = await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReasonAggressive?.id ?? null,
          exitedAt: tJail,
          exitedById: custodyUser.id,
          exitDestinationId: exitDestJail?.id ?? 'jail',
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReasonAggressive?.id,
          exitDestinationId: exitDestJail?.id,
          updatedAt: tJail,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'jail_exit_medical') {
      // Medical issue refusal reason → jail
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
      const deflection = await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReasonMedical?.id ?? null,
          exitedAt: tJail,
          exitedById: custodyUser.id,
          exitDestinationId: exitDestJail?.id ?? 'jail',
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        {
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReasonMedical?.id,
          exitDestinationId: exitDestJail?.id,
          updatedAt: tJail,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'expired') {
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
      const deflection = await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: null,
          expiresAt: tExpiry,
          subjectStatus: 'DETAINED',
          status: 'EXPIRED',
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { status: 'EXPIRED', updatedAt: tExpiry, updatedById: fieldUser.id },
      ]);
    } else if (type === 'death_in_custody') {
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
      const deflection = await prisma.deflection.create({
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
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id },
        {
          subjectStatus: 'DEATH_IN_CUSTODY',
          releaseReasonId: releaseReasonDeathCustody?.id,
          updatedAt: tDeath,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'death_in_facility') {
      // Subject released (sobered), then dies after release
      const tDeath = addMins(tRelease, randInt(15, 90));
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
      const deflection = await prisma.deflection.create({
        data: {
          ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
          incidentId: incident.id,
          subjectId: subject.id,
          ...transferData(custodyUser, sfsoUnit, tTransfer),
          subjectStatus: 'DEATH_IN_FACILITY',
          admittedAt: tAdmit,
          admittedById: careUser.id,
          releasedAt: tRelease,
          releasedById: custodyUser.id,
          releaseReasonId: releaseReasonDeathFacility?.id ?? 'death_in_facility',
        },
      });
      await createDeflectionUpdates(prisma, deflection.id, [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
        { subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id },
        { subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id },
        { subjectStatus: 'RELEASED', releaseReasonId: releaseReasonSobered.id, updatedAt: tRelease, updatedById: custodyUser.id },
        {
          subjectStatus: 'DEATH_IN_FACILITY',
          releaseReasonId: releaseReasonDeathFacility?.id,
          updatedAt: tDeath,
          updatedById: custodyUser.id
        },
      ]);
    } else if (type === 'recent_exit') {
      // 60 recent exits across last 7 days, cycling through all requested field combos
      const { recentIdx } = scenarios[idx];

      // Cycle through exit destinations: declined_consent, home, hospital, jail, other, services_non_hospital, street
      const recentExitDestPool = [
        exitDestDeclined, exitDestHome, exitDestHospital, exitDestJail,
        exitDestOther, exitDestServices, exitDestStreet,
      ].filter(Boolean);
      const recentHousingPool = allHousingStatuses;
      const recentExitDest = recentExitDestPool[recentIdx % recentExitDestPool.length];
      const recentHousing = recentHousingPool[recentIdx % recentHousingPool.length];

      // Cycle through refusal reasons for some (aggressive_behavior, medical_issue, none)
      const isJailExit = recentExitDest?.id === 'jail';
      const refusalReason = isJailExit
        ? (recentIdx % 2 === 0 ? refusalReasonAggressive : refusalReasonMedical)
        : null;

      // Vary release reason: sobered (~60%), medical_issue (~25%), other (~15%)
      const releaseReasonCycle = [
        releaseReasonSobered, releaseReasonSobered, releaseReasonSobered,
        releaseReasonMedical, releaseReasonMedical,
        releaseReasonOther,
      ];
      const recentReleaseReason = isJailExit
        ? null
        : (releaseReasonCycle[recentIdx % releaseReasonCycle.length] ?? releaseReasonSobered);

      const exitFields = isJailExit ? null : exitData(careUser, recentExitDest?.id ?? 'street', recentHousing?.id ?? 'unknown', tExit);

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

      const deflectionPayload = {
        ...makeDeflectionBase(facility.id, bedType.id, fieldUser, base),
        incidentId: incident.id,
        subjectId: subject.id,
        ...transferData(custodyUser, sfsoUnit, tTransfer),
        subjectStatus: 'EXITED',
        exitedAt: tExit,
        exitedById: careUser.id,
        ...(isJailExit
          ? {
              refusalReasonId: refusalReason?.id ?? null,
              exitDestinationId: recentExitDest?.id ?? 'jail',
            }
          : {
              admittedAt: tAdmit,
              admittedById: careUser.id,
              releasedAt: tRelease,
              releasedById: custodyUser.id,
              releaseReasonId: recentReleaseReason?.id,
              ...exitFields,
            }),
      };

      const deflection = await prisma.deflection.create({ data: deflectionPayload });

      const updateSteps = [
        { subjectStatus: 'ONSITE_AWAITING_TRANSFER', updatedAt: tArrived, updatedById: fieldUser.id },
        { subjectStatus: 'AWAITING_INTAKE', updatedAt: tTransfer, updatedById: custodyUser.id },
        { subjectStatus: 'READY_FOR_INTAKE', updatedAt: tSafetyCheck, updatedById: custodyUser.id },
      ];
      if (!isJailExit) {
        updateSteps.push({ subjectStatus: 'ADMITTED', updatedAt: tAdmit, updatedById: careUser.id });
        updateSteps.push({ subjectStatus: 'IN_CHAIR', updatedAt: tIntake, updatedById: careUser.id });
      }
      if (isJailExit) {
        updateSteps.push({
          subjectStatus: 'EXITED',
          refusalReasonId: refusalReason?.id,
          exitDestinationId: recentExitDest?.id,
          updatedAt: tExit,
          updatedById: custodyUser.id
        });
      } else {
        updateSteps.push({
          subjectStatus: 'RELEASED',
          releaseReasonId: recentReleaseReason?.id,
          updatedAt: tRelease,
          updatedById: custodyUser.id
        });
        updateSteps.push({
          subjectStatus: 'EXITED',
          exitDestinationId: recentExitDest?.id,
          exitHousingStatusId: recentHousing?.id,
          exitConnectedToCare: exitFields?.exitConnectedToCare,
          exitSFResident: exitFields?.exitSFResident,
          updatedAt: tExit,
          updatedById: careUser.id
        });
      }
      await createDeflectionUpdates(prisma, deflection.id, updateSteps);
    } else if (type === 'in_progress_detained') {
      // ── In-progress scenarios ──
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
    } else if (type === 'in_progress_onsite') {
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
    } else if (type === 'in_progress_awaiting') {
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
    } else if (type === 'in_progress_ready') {
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
    } else if (type === 'in_progress_chair') {
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

    console.log(`  [${idx + 1}/${scenarios.length}] ${type}`);
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

  console.log(`Done! Seeded ${scenarios.length} historical scenarios (holds +${holdsAdded}, inTransit +${inTransitAdded}, occupied +${occupiedAdded}).`);
}
