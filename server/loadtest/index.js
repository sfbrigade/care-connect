import '../config.js';
import process from 'node:process';

import { FacilityStatusEnum } from '@prisma/client';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_PASSWORD = 'abcd1234';
const LOADTEST_SUBDOMAIN = 'loadtest-reset';
const LOADTEST_NAME = 'LOADTEST RESET';
const LOADTEST_SERVICE_TYPE_ID = 'lesc';
const LOADTEST_TYPE = 'LESC';
const SCENARIO_PREFIX = 'LOADTEST';

const USER_EMAILS = {
  admin: 'admin@careconnectsf.org',
  care: 'care@careconnectsf.org',
  custody: 'sfso@careconnectsf.org',
  field1: 'sfpd@careconnectsf.org',
  field2: 'sfpd2@careconnectsf.org',
};

const HOLD_SUBJECT_STATUSES = new Set([
  'DETAINED',
  'ONSITE_AWAITING_TRANSFER',
  'AWAITING_INTAKE',
  'READY_FOR_INTAKE',
  'ADMITTED',
  'FAILED_INTAKE',
]);

const IN_TRANSIT_SUBJECT_STATUSES = new Set([
  'DETAINED',
  'ONSITE_AWAITING_TRANSFER',
]);

const OCCUPIED_SUBJECT_STATUSES = new Set([
  'IN_CHAIR',
  'RELEASED',
]);

const ACTIVE_STATUS = 'ACTIVE';

let prismaClient;

const SCENARIOS = {
  'create-bed-race': {
    description: 'Multiple officers try to create holds against one remaining bed.',
    run: runCreateBedRace,
  },
  'cancel-deflection-race': {
    description: 'Multiple users cancel the same active deflection at the same time.',
    run: runCancelDeflectionRace,
  },
  'incident-create-race': {
    description: 'Multiple officers create incidents with the same bedTypeId concurrently.',
    run: runIncidentCreateRace,
  },
  'safety-check-vs-admit': {
    description: 'Custody safety-check and care admit compete on the same hold.',
    run: runSafetyCheckVsAdmit,
  },
  'admit-vs-intake-complete': {
    description: 'Care admit and intake-complete compete on the same hold.',
    run: runAdmitVsIntakeComplete,
  },
  'release-vs-exit': {
    description: 'Custody release races with care exit on an in-chair deflection.',
    run: runReleaseVsExit,
  },
  'release-vs-exit-to-jail': {
    description: 'Medical release races with direct jail exit on the same deflection.',
    run: runReleaseVsExitToJail,
  },
  'release-vs-record-death': {
    description: 'Legal release races with record-death on the same deflection.',
    run: runReleaseVsRecordDeath,
  },
  'exit-vs-record-death': {
    description: 'Care exit races with custody record-death on the same deflection.',
    run: runExitVsRecordDeath,
  },
  'exit-to-jail-vs-record-death': {
    description: 'Direct jail exit races with record-death on the same deflection.',
    run: runExitToJailVsRecordDeath,
  },
  'cancel-vs-reopen': {
    description: 'Cancel and reopen compete on the same deflection.',
    run: runCancelVsReopen,
  },
  'transfer-vs-cancel': {
    description: 'Transfer into custody races with cancellation on the same deflection.',
    run: runTransferVsCancel,
  },
  'transfer-vs-facility-close': {
    description: 'Transfer into custody races with a facility close.',
    run: runTransferVsFacilityClose,
  },
  'facility-close-vs-deflection-create': {
    description: 'Facility close races with a direct deflection create.',
    run: runFacilityCloseVsDeflectionCreate,
  },
  'facility-close-vs-incident-create': {
    description: 'Facility close races with an incident create that requests a bed.',
    run: runFacilityCloseVsIncidentCreate,
  },
  'facility-close-vs-facility-reopen': {
    description: 'Competing facility close and reopen requests hit the same facility.',
    run: runFacilityCloseVsFacilityReopen,
  },
  'facility-close-vs-reopen': {
    description: 'Facility close races with reopening a cancelled hold.',
    run: runFacilityCloseVsReopen,
  },
  'bed-type-shrink-vs-deflection-create': {
    description: 'Chair-count shrink races with direct deflection creation.',
    run: runBedTypeShrinkVsDeflectionCreate,
  },
  'bed-type-shrink-vs-incident-create': {
    description: 'Chair-count shrink races with incident creation that requests a bed.',
    run: runBedTypeShrinkVsIncidentCreate,
  },
  'bed-type-shrink-vs-reopen': {
    description: 'Chair-count shrink races with reopening a cancelled hold.',
    run: runBedTypeShrinkVsReopen,
  },
  'bed-type-update-vs-facility-close': {
    description: 'Chair-count update races with a facility close.',
    run: runBedTypeUpdateVsFacilityClose,
  },
  'bed-type-update-vs-bed-type-update': {
    description: 'Two chair-count updates race on the same bed type.',
    run: runBedTypeUpdateVsBedTypeUpdate,
  },
  'awaiting-intake-terminal-race': {
    description: 'Multiple terminal transitions compete from AWAITING_INTAKE.',
    run: runAwaitingIntakeTerminalRace,
  },
  'ready-for-intake-terminal-race': {
    description: 'Multiple terminal transitions compete from READY_FOR_INTAKE.',
    run: runReadyForIntakeTerminalRace,
  },
  'admitted-terminal-race': {
    description: 'Multiple terminal transitions compete from ADMITTED.',
    run: runAdmittedTerminalRace,
  },
  'in-chair-terminal-race': {
    description: 'Multiple terminal transitions compete from IN_CHAIR.',
    run: runInChairTerminalRace,
  },
  'released-terminal-race': {
    description: 'Multiple terminal transitions compete from RELEASED.',
    run: runReleasedTerminalRace,
  },
  'incident-cancel-vs-deflection-create': {
    description: 'Incident cancel races with creating a new hold on that incident.',
    run: runIncidentCancelVsDeflectionCreate,
  },
  'incident-cancel-vs-transfer': {
    description: 'Incident cancel races with transfer on an active hold.',
    run: runIncidentCancelVsTransfer,
  },
  'incident-left-vs-deflection-cancel': {
    description: 'Incident left races with deflection cancel.',
    run: runIncidentLeftVsDeflectionCancel,
  },
  'incident-arrived-vs-transfer': {
    description: 'Incident arrived races with transfer on the same hold.',
    run: runIncidentArrivedVsTransfer,
  },
  'duplicate-release': {
    description: 'The same release request is submitted concurrently.',
    run: runDuplicateRelease,
  },
  'duplicate-exit': {
    description: 'The same exit request is submitted concurrently.',
    run: runDuplicateExit,
  },
  'duplicate-facility-close': {
    description: 'The same facility close request is submitted concurrently.',
    run: runDuplicateFacilityClose,
  },
  'duplicate-bed-type-update': {
    description: 'The same bed-type update request is submitted concurrently.',
    run: runDuplicateBedTypeUpdate,
  },
};

async function main () {
  const options = parseArgs(process.argv.slice(2));

  if (options.listOnly) {
    printScenarioList();
    return;
  }

  const context = await createContext(options);
  const scenarioNames = options.scenario === 'all'
    ? Object.keys(SCENARIOS)
    : [options.scenario];
  const failures = [];

  try {
    for (const scenarioName of scenarioNames) {
      const scenario = SCENARIOS[scenarioName];
      if (!scenario) {
        throw new Error(`Unknown scenario "${scenarioName}". Run with --list to see available scenarios.`);
      }

      console.log(`\nScenario: ${scenarioName}`);
      console.log(`Description: ${scenario.description}`);

      for (let iteration = 1; iteration <= options.iterations; iteration++) {
        console.log(`\nIteration ${iteration}/${options.iterations}`);
        const metadata = {
          iteration,
          scenarioName,
          runTag: `${SCENARIO_PREFIX}-${scenarioName}-${Date.now()}-${iteration}`,
        };

        try {
          const result = await scenario.run(context, metadata);
          printSummary(result);
        } catch (error) {
          const failure = {
            ...metadata,
            error: error.message,
            details: error.details ?? null,
          };
          failures.push(failure);
          printSummary(failure);
        }
      }
    }
  } finally {
    await cleanupLoadtestArtifacts(context);
  }

  if (failures.length > 0) {
    const error = new Error(`${failures.length} scenario iteration(s) failed.`);
    error.details = failures;
    throw error;
  }
}

function parseArgs (args) {
  const options = {
    baseUrl: process.env.LOADTEST_BASE_URL ?? DEFAULT_BASE_URL,
    password: process.env.LOADTEST_PASSWORD ?? DEFAULT_PASSWORD,
    scenario: 'all',
    iterations: 1,
    vus: 8,
    targetAvailable: 1,
    listOnly: false,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--list') {
      options.listOnly = true;
    } else if (arg === '--scenario') {
      options.scenario = args[++index];
    } else if (arg.startsWith('--scenario=')) {
      options.scenario = arg.split('=')[1];
    } else if (arg === '--iterations') {
      options.iterations = parsePositiveInteger(args[++index], '--iterations');
    } else if (arg.startsWith('--iterations=')) {
      options.iterations = parsePositiveInteger(arg.split('=')[1], '--iterations');
    } else if (arg === '--vus') {
      options.vus = parsePositiveInteger(args[++index], '--vus');
    } else if (arg.startsWith('--vus=')) {
      options.vus = parsePositiveInteger(arg.split('=')[1], '--vus');
    } else if (arg === '--target-available') {
      options.targetAvailable = parseNonNegativeInteger(args[++index], '--target-available');
    } else if (arg.startsWith('--target-available=')) {
      options.targetAvailable = parseNonNegativeInteger(arg.split('=')[1], '--target-available');
    } else if (arg === '--base-url') {
      options.baseUrl = args[++index];
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.split('=')[1];
    } else if (arg === '--password') {
      options.password = args[++index];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    } else {
      throw new Error(`Unknown argument "${arg}"`);
    }
  }

  return options;
}

function parsePositiveInteger (value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be an integer >= 1`);
  }
  return parsed;
}

function parseNonNegativeInteger (value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be an integer >= 0`);
  }
  return parsed;
}

function printScenarioList () {
  console.log('Available scenarios:\n');
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    console.log(`- ${name}: ${scenario.description}`);
  }
}

async function createContext (options) {
  const prisma = await getPrisma();
  const usersByEmail = {};
  for (const email of Object.values(USER_EMAILS)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`Seeded user ${email} was not found. Run prisma seed first.`);
    }
    usersByEmail[email] = user;
  }

  const facility = await prisma.facility.upsert({
    where: { subdomain: LOADTEST_SUBDOMAIN },
    create: {
      name: LOADTEST_NAME,
      type: LOADTEST_TYPE,
      serviceTypeId: LOADTEST_SERVICE_TYPE_ID,
      subdomain: LOADTEST_SUBDOMAIN,
      status: FacilityStatusEnum.OPEN_ACCEPTING,
      addressLine1: '445 6th St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      phone: '(415) 555-0100',
      createdById: usersByEmail[USER_EMAILS.admin].id,
      updatedById: usersByEmail[USER_EMAILS.admin].id,
    },
    update: {
      name: LOADTEST_NAME,
      type: LOADTEST_TYPE,
      serviceTypeId: LOADTEST_SERVICE_TYPE_ID,
      status: FacilityStatusEnum.OPEN_ACCEPTING,
      updatedById: usersByEmail[USER_EMAILS.admin].id,
    },
  });

  let bedType = await prisma.bedType.findFirst({
    where: { facilityId: facility.id },
  });
  if (!bedType) {
    bedType = await prisma.bedType.create({
      data: {
        facilityId: facility.id,
        type: 'CHAIR',
        capacity: Math.max(options.targetAvailable, 1),
        available: options.targetAvailable,
        createdById: usersByEmail[USER_EMAILS.admin].id,
        updatedById: usersByEmail[USER_EMAILS.admin].id,
      },
    });
  }

  const unavailableReason = await prisma.bedTypeUnavailableReason.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!unavailableReason) {
    throw new Error('No bed type unavailable reasons were found. Run prisma seed first.');
  }

  const cookiesByEmail = {};
  for (const email of Object.values(USER_EMAILS)) {
    cookiesByEmail[email] = await login(options.baseUrl, email, options.password);
  }

  return {
    ...options,
    facilityId: facility.id,
    bedTypeId: bedType.id,
    usersByEmail,
    cookiesByEmail,
    ids: {
      unavailableReasonId: unavailableReason.id,
      facilityClosedReasonId: 'other',
      exitDestinationHome: 'home',
      exitDestinationHospital: 'hospital',
      exitDestinationJail: 'jail',
      exitHousingStatus: 'permanent',
      releaseReasonSobered: 'sobered',
      releaseReasonMedical: 'medical_issue',
    },
  };
}

async function runCreateBedRace (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: context.targetAvailable });

  const incidents = await createIncidents(context, {
    count: context.vus,
    runTag: metadata.runTag,
    users: [
      context.usersByEmail[USER_EMAILS.field1],
      context.usersByEmail[USER_EMAILS.field2],
    ],
  });

  const results = await runConcurrentRequests(context, incidents.map((incident, index) => ({
    email: index % 2 === 0 ? USER_EMAILS.field1 : USER_EMAILS.field2,
    method: 'POST',
    path: '/api/deflections',
    body: {
      facilityId: context.facilityId,
      incidentId: incident.id,
      bedTypeId: context.bedTypeId,
    },
  })));

  const prisma = await getPrisma();
  const createdDeflections = await prisma.deflection.findMany({
    where: {
      facilityId: context.facilityId,
      incidentId: { in: incidents.map((incident) => incident.id) },
    },
  });
  const successCount = countStatuses(results)[201] ?? 0;

  assertAllowedStatuses(results, [201, 403, 409, 410]);
  assertInvariant(successCount <= context.targetAvailable, 'More successful deflection creates than available beds.', {
    successCount,
    targetAvailable: context.targetAvailable,
  });
  assertInvariant(createdDeflections.length === successCount, 'Created deflection count does not match successful responses.', {
    successCount,
    createdDeflections: createdDeflections.length,
  });

  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);

  return buildResult(metadata, results, state, {
    successfulCreates: successCount,
    createdDeflections: createdDeflections.length,
  });
}

async function runCancelDeflectionRace (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
    ownerEmail: USER_EMAILS.field1,
  });

  const results = await runConcurrentRequests(context, Array.from({ length: context.vus }, (_, index) => ({
    email: index % 2 === 0 ? USER_EMAILS.field1 : USER_EMAILS.custody,
    method: 'DELETE',
    path: `/api/deflections/${fixture.deflection.id}`,
  })));

  assertAllowedStatuses(results, [200, 403, 404, 410]);

  const prisma = await getPrisma();
  const finalDeflection = await prisma.deflection.findUniqueOrThrow({ where: { id: fixture.deflection.id } });
  const cancellationUpdates = await prisma.deflectionUpdate.count({
    where: {
      deflectionId: fixture.deflection.id,
      status: 'CANCELLED',
    },
  });
  assertInvariant(finalDeflection.status === 'CANCELLED', 'Deflection did not end in CANCELLED status.', {
    deflectionId: fixture.deflection.id,
    finalStatus: finalDeflection.status,
  });
  assertInvariant(cancellationUpdates === 1, 'Cancellation update was recorded more than once.', {
    deflectionId: fixture.deflection.id,
    cancellationUpdates,
  });

  const state = await loadFinalState(context, fixture);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { cancellationUpdates });
}

async function runIncidentCreateRace (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: context.targetAvailable });

  const results = await runConcurrentRequests(context, Array.from({ length: context.vus }, (_, index) => ({
    email: index % 2 === 0 ? USER_EMAILS.field1 : USER_EMAILS.field2,
    method: 'POST',
    path: `/api/incidents?bedTypeId=${context.bedTypeId}`,
    body: createIncidentPayload(context, metadata.runTag, index),
  })));

  assertAllowedStatuses(results, [201, 403, 409, 410]);

  const prisma = await getPrisma();
  const incidents = await prisma.incident.findMany({
    where: {
      facilityId: context.facilityId,
      cadNumber: { startsWith: `${metadata.runTag}-cad-` },
    },
  });
  const deflections = await prisma.deflection.findMany({
    where: {
      facilityId: context.facilityId,
      incidentId: { in: incidents.map((incident) => incident.id) },
    },
  });
  const successCount = countStatuses(results)[201] ?? 0;

  assertInvariant(deflections.length === successCount, 'Successful incident creates and deflection rows diverged.', {
    successCount,
    deflections: deflections.length,
  });
  assertInvariant(incidents.length === successCount, 'Orphan incidents were created when bed allocation failed.', {
    successCount,
    incidents: incidents.length,
  });

  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, {
    successfulCreates: successCount,
    incidentsCreated: incidents.length,
    deflectionsCreated: deflections.length,
  });
}

async function runSafetyCheckVsAdmit (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'AWAITING_INTAKE',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/safety-check` },
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/admit` },
    ],
    allowedStatuses: [200, 404, 409],
    allowedFinalSubjectStatuses: ['READY_FOR_INTAKE', 'ADMITTED'],
  });
}

async function runAdmitVsIntakeComplete (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'READY_FOR_INTAKE',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/admit` },
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/intake-complete`, body: { completed: true } },
    ],
    allowedStatuses: [200, 404, 409],
    allowedFinalSubjectStatuses: ['ADMITTED', 'IN_CHAIR'],
  });
}

async function runReleaseVsExit (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: { releaseReasonId: context.ids.releaseReasonSobered } },
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit`, body: exitBody(context) },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['RELEASED', 'EXITED'],
  });
}

async function runReleaseVsExitToJail (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'ADMITTED',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: medicalReleaseBody(context) },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit-to-jail` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['EXITED'],
    finalCheck: async ({ deflection }) => {
      assertInvariant(
        [context.ids.exitDestinationHospital, context.ids.exitDestinationJail].includes(deflection.exitDestinationId),
        'Exit destination did not match either competing terminal transition.',
        { exitDestinationId: deflection.exitDestinationId }
      );
    },
  });
}

async function runReleaseVsRecordDeath (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: { releaseReasonId: context.ids.releaseReasonSobered } },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['RELEASED', 'DEATH_IN_CUSTODY', 'DEATH_IN_FACILITY'],
  });
}

async function runExitVsRecordDeath (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit`, body: exitBody(context) },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['EXITED', 'DEATH_IN_CUSTODY'],
  });
}

async function runExitToJailVsRecordDeath (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'READY_FOR_INTAKE',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit-to-jail` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409],
    allowedFinalSubjectStatuses: ['EXITED', 'DEATH_IN_CUSTODY'],
  });
}

async function runCancelVsReopen (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: async () => {
      const fixture = await createDeflectionFixture(context, metadata, {
        subjectStatus: 'DETAINED',
        status: 'CANCELLED',
      });
      await syncBedTypeFromFacilityState(context);
      return fixture;
    },
    requests: (fixture) => [
      { email: USER_EMAILS.field1, method: 'DELETE', path: `/api/deflections/${fixture.deflection.id}` },
      { email: USER_EMAILS.field1, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/reopen` },
    ],
    allowedStatuses: [200, 400, 404, 409],
    allowedFinalHoldStatuses: ['ACTIVE', 'CANCELLED'],
    allowedFinalSubjectStatuses: ['DETAINED'],
  });
}

async function runTransferVsCancel (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/transfer` },
      { email: USER_EMAILS.field1, method: 'DELETE', path: `/api/deflections/${fixture.deflection.id}` },
    ],
    allowedStatuses: [200, 404, 409],
    allowedFinalHoldStatuses: ['ACTIVE', 'CANCELLED'],
    allowedFinalSubjectStatuses: ['AWAITING_INTAKE', 'CANCELLED_PROXY', 'ONSITE_AWAITING_TRANSFER'],
  });
}

async function runTransferVsFacilityClose (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/transfer` },
      { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE'],
    finalCheck: async ({ facility }) => {
      assertInvariant(
        [FacilityStatusEnum.CLOSED, FacilityStatusEnum.OPEN_ACCEPTING].includes(facility.status),
        'Facility ended in an unexpected status.',
        { status: facility.status }
      );
    },
  });
}

async function runFacilityCloseVsDeflectionCreate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const incident = await createIncidentRecord(context, {
    user: context.usersByEmail[USER_EMAILS.field1],
    runTag: metadata.runTag,
    suffix: 'root',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
    {
      email: USER_EMAILS.field1,
      method: 'POST',
      path: '/api/deflections',
      body: {
        facilityId: context.facilityId,
        incidentId: incident.id,
        bedTypeId: context.bedTypeId,
      },
    },
  ]);

  assertAllowedStatuses(results, [200, 201, 404, 409, 410, 422]);
  const state = await loadFinalState(context);
  const activeDetained = await countActiveDeflectionsByStatus(context, 'DETAINED');
  assertInvariant(activeDetained === 0 || state.facility.status === FacilityStatusEnum.OPEN_ACCEPTING, 'Facility closed while an in-transit hold remained active.', {
    facilityStatus: state.facility.status,
    activeDetained,
  });
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeDetained });
}

async function runFacilityCloseVsIncidentCreate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
    {
      email: USER_EMAILS.field1,
      method: 'POST',
      path: `/api/incidents?bedTypeId=${context.bedTypeId}`,
      body: createIncidentPayload(context, metadata.runTag, 0),
    },
  ]);

  assertAllowedStatuses(results, [200, 201, 404, 409, 410, 422]);
  const state = await loadFinalState(context);
  const activeDetained = await countActiveDeflectionsByStatus(context, 'DETAINED');
  assertInvariant(activeDetained === 0 || state.facility.status === FacilityStatusEnum.OPEN_ACCEPTING, 'Facility closed while an in-transit hold remained active.', {
    facilityStatus: state.facility.status,
    activeDetained,
  });
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeDetained });
}

async function runFacilityCloseVsFacilityReopen (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: reopenedFacilityBody() },
  ]);

  assertAllowedStatuses(results, [200, 404, 409, 422]);
  const state = await loadFinalState(context);
  assertInvariant(
    [FacilityStatusEnum.CLOSED, FacilityStatusEnum.OPEN_ACCEPTING].includes(state.facility.status),
    'Facility ended in an unexpected status after close/reopen race.',
    { status: state.facility.status }
  );
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runFacilityCloseVsReopen (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'CANCELLED',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
    { email: USER_EMAILS.field1, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/reopen` },
  ]);

  assertAllowedStatuses(results, [200, 400, 404, 409, 422]);
  const state = await loadFinalState(context, fixture);
  const activeDetained = await countActiveDeflectionsByStatus(context, 'DETAINED');
  assertInvariant(activeDetained === 0 || state.facility.status === FacilityStatusEnum.OPEN_ACCEPTING, 'A closed facility retained an active reopened in-transit hold.', {
    facilityStatus: state.facility.status,
    activeDetained,
  });
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeDetained });
}

async function runBedTypeShrinkVsDeflectionCreate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const incident = await createIncidentRecord(context, {
    user: context.usersByEmail[USER_EMAILS.field1],
    runTag: metadata.runTag,
    suffix: 'root',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: shrinkBedTypeBody(context) },
    {
      email: USER_EMAILS.field1,
      method: 'POST',
      path: '/api/deflections',
      body: {
        facilityId: context.facilityId,
        incidentId: incident.id,
        bedTypeId: context.bedTypeId,
      },
    },
  ]);

  assertAllowedStatuses(results, [200, 201, 400, 404, 409, 410, 422]);
  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runBedTypeShrinkVsIncidentCreate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: shrinkBedTypeBody(context) },
    {
      email: USER_EMAILS.field1,
      method: 'POST',
      path: `/api/incidents?bedTypeId=${context.bedTypeId}`,
      body: createIncidentPayload(context, metadata.runTag, 0),
    },
  ]);

  assertAllowedStatuses(results, [200, 201, 400, 404, 409, 410, 422]);
  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runBedTypeShrinkVsReopen (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'CANCELLED',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: shrinkBedTypeBody(context) },
    { email: USER_EMAILS.field1, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/reopen` },
  ]);

  assertAllowedStatuses(results, [200, 400, 404, 409, 422]);
  const state = await loadFinalState(context, fixture);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runBedTypeUpdateVsFacilityClose (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: shrinkBedTypeBody(context) },
    { email: USER_EMAILS.care, method: 'POST', path: `/api/facilities/${context.facilityId}/status`, body: closedFacilityBody(context) },
  ]);

  assertAllowedStatuses(results, [200, 400, 404, 409, 422]);
  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runBedTypeUpdateVsBedTypeUpdate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 2 });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: shrinkBedTypeBody(context) },
    { email: USER_EMAILS.care, method: 'PATCH', path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`, body: { capacity: 2, unavailableUnoccupied: 0, updateNotes: `${metadata.runTag}-expand` } },
  ]);

  assertAllowedStatuses(results, [200, 400, 404, 409, 422]);
  const state = await loadFinalState(context);
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runAwaitingIntakeTerminalRace (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'AWAITING_INTAKE',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/safety-check` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: { releaseReasonId: context.ids.releaseReasonSobered } },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit-to-jail` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['READY_FOR_INTAKE', 'RELEASED', 'EXITED', 'DEATH_IN_CUSTODY', 'DEATH_IN_FACILITY'],
  });
}

async function runReadyForIntakeTerminalRace (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'READY_FOR_INTAKE',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/admit` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: { releaseReasonId: context.ids.releaseReasonSobered } },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit-to-jail` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['ADMITTED', 'RELEASED', 'EXITED', 'DEATH_IN_CUSTODY', 'DEATH_IN_FACILITY'],
  });
}

async function runAdmittedTerminalRace (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'ADMITTED',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/intake-complete`, body: { completed: true } },
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/intake-complete`, body: { completed: false } },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: medicalReleaseBody(context) },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit-to-jail` },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['IN_CHAIR', 'FAILED_INTAKE', 'EXITED', 'DEATH_IN_CUSTODY'],
  });
}

async function runInChairTerminalRace (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit`, body: exitBody(context) },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/release`, body: { releaseReasonId: context.ids.releaseReasonSobered } },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['EXITED', 'RELEASED', 'DEATH_IN_CUSTODY', 'DEATH_IN_FACILITY'],
  });
}

async function runReleasedTerminalRace (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'RELEASED',
      status: 'ACTIVE',
      releaseReasonId: context.ids.releaseReasonSobered,
    }),
    requests: (fixture) => [
      { email: USER_EMAILS.care, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/exit`, body: exitBody(context) },
      { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/record-death` },
    ],
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['EXITED', 'DEATH_IN_FACILITY'],
  });
}

async function runIncidentCancelVsDeflectionCreate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const incident = await createIncidentRecord(context, {
    user: context.usersByEmail[USER_EMAILS.field1],
    runTag: metadata.runTag,
    suffix: 'root',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.field1, method: 'DELETE', path: `/api/incidents/${incident.id}` },
    {
      email: USER_EMAILS.field1,
      method: 'POST',
      path: '/api/deflections',
      body: {
        facilityId: context.facilityId,
        incidentId: incident.id,
        bedTypeId: context.bedTypeId,
      },
    },
  ]);

  assertAllowedStatuses(results, [200, 201, 204, 404, 409, 410, 422]);
  const state = await loadFinalState(context, { incident });
  const prisma = await getPrisma();
  const activeHoldCount = await prisma.deflection.count({
    where: { incidentId: incident.id, status: 'ACTIVE' },
  });
  if (state.incident) {
    assertInvariant(!(state.incident.completedAt && activeHoldCount > 0), 'Completed incident retained active holds.', {
      incidentId: incident.id,
      activeHoldCount,
    });
  }
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeHoldCount });
}

async function runIncidentCancelVsTransfer (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'ONSITE_AWAITING_TRANSFER',
    status: 'ACTIVE',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.field1, method: 'DELETE', path: `/api/incidents/${fixture.incident.id}` },
    { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/transfer` },
  ]);

  assertAllowedStatuses(results, [200, 204, 404, 409, 410, 422]);
  const state = await loadFinalState(context, fixture);
  const activeHoldCount = await countIncidentActiveHolds(fixture.incident.id);
  if (state.incident) {
    assertInvariant(!(state.incident.completedAt && activeHoldCount > 0), 'Completed incident retained active holds.', {
      incidentId: fixture.incident.id,
      activeHoldCount,
    });
  }
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeHoldCount });
}

async function runIncidentLeftVsDeflectionCancel (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
    incidentArrived: true,
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.field1, method: 'PATCH', path: `/api/incidents/${fixture.incident.id}/left` },
    { email: USER_EMAILS.field1, method: 'DELETE', path: `/api/deflections/${fixture.deflection.id}` },
  ]);

  assertAllowedStatuses(results, [200, 404, 409, 410, 422]);
  const state = await loadFinalState(context, fixture);
  const activeHoldCount = await countIncidentActiveHolds(fixture.incident.id);
  if (activeHoldCount === 0 && state.incident) {
    assertInvariant(Boolean(state.incident.completedAt), 'Incident had no active holds after the race but was not completed.', {
      incidentId: fixture.incident.id,
      completedAt: state.incident.completedAt,
    });
  }
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { activeHoldCount });
}

async function runIncidentArrivedVsTransfer (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
  });

  const results = await runConcurrentRequests(context, [
    { email: USER_EMAILS.field1, method: 'PATCH', path: `/api/incidents/${fixture.incident.id}/arrived` },
    { email: USER_EMAILS.custody, method: 'POST', path: `/api/deflections/${fixture.deflection.id}/transfer` },
  ]);

  assertAllowedStatuses(results, [200, 403, 404, 409]);
  const state = await loadFinalState(context, fixture);
  assertInvariant(
    ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE'].includes(state.deflection?.subjectStatus),
    'Deflection ended in an unexpected state after arrived/transfer race.',
    { subjectStatus: state.deflection?.subjectStatus }
  );
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state);
}

async function runDuplicateRelease (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => Array.from({ length: context.vus }, () => ({
      email: USER_EMAILS.custody,
      method: 'POST',
      path: `/api/deflections/${fixture.deflection.id}/release`,
      body: { releaseReasonId: context.ids.releaseReasonSobered },
    })),
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['RELEASED'],
    finalCheck: async ({ results }) => {
      assertInvariant((countStatuses(results)[200] ?? 0) === 1, 'Duplicate release created more than one successful response.', countStatuses(results));
    },
  });
}

async function runDuplicateExit (context, metadata) {
  return runDeflectionRequestRace(context, metadata, {
    setup: () => createDeflectionFixture(context, metadata, {
      subjectStatus: 'IN_CHAIR',
      status: 'ACTIVE',
    }),
    requests: (fixture) => Array.from({ length: context.vus }, () => ({
      email: USER_EMAILS.care,
      method: 'POST',
      path: `/api/deflections/${fixture.deflection.id}/exit`,
      body: exitBody(context),
    })),
    allowedStatuses: [200, 404, 409, 422],
    allowedFinalSubjectStatuses: ['EXITED'],
    finalCheck: async ({ results }) => {
      assertInvariant((countStatuses(results)[200] ?? 0) === 1, 'Duplicate exit created more than one successful response.', countStatuses(results));
    },
  });
}

async function runDuplicateFacilityClose (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
  });

  const results = await runConcurrentRequests(context, Array.from({ length: context.vus }, () => ({
    email: USER_EMAILS.care,
    method: 'POST',
    path: `/api/facilities/${context.facilityId}/status`,
    body: closedFacilityBody(context),
  })));

  assertAllowedStatuses(results, [200, 404, 409, 422]);
  const state = await loadFinalState(context, fixture);
  const prisma = await getPrisma();
  const cancellationUpdates = await prisma.deflectionUpdate.count({
    where: {
      deflectionId: fixture.deflection.id,
      status: 'CANCELLED',
    },
  });
  assertInvariant(cancellationUpdates === 1, 'Duplicate facility close cancelled the same hold more than once.', {
    cancellationUpdates,
  });
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { cancellationUpdates });
}

async function runDuplicateBedTypeUpdate (context, metadata) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await createDeflectionFixture(context, metadata, {
    subjectStatus: 'DETAINED',
    status: 'ACTIVE',
  });

  const results = await runConcurrentRequests(context, Array.from({ length: context.vus }, () => ({
    email: USER_EMAILS.care,
    method: 'PATCH',
    path: `/api/facilities/${context.facilityId}/bed-types/${context.bedTypeId}`,
    body: shrinkBedTypeBody(context),
  })));

  assertAllowedStatuses(results, [200, 400, 404, 409, 422]);
  const state = await loadFinalState(context, fixture);
  const prisma = await getPrisma();
  const cancellationUpdates = await prisma.deflectionUpdate.count({
    where: {
      deflectionId: fixture.deflection.id,
      status: 'CANCELLED',
    },
  });
  assertInvariant(cancellationUpdates <= 1, 'Duplicate bed-type update cancelled the same hold more than once.', {
    cancellationUpdates,
  });
  await assertFacilityBedIntegrity(context);
  return buildResult(metadata, results, state, { cancellationUpdates });
}

async function runDeflectionRequestRace (context, metadata, config) {
  await prepareEmptyFacilityState(context, { capacity: 1 });
  const fixture = await config.setup();
  await syncBedTypeFromFacilityState(context);

  const requests = typeof config.requests === 'function'
    ? config.requests(fixture)
    : config.requests;

  const results = await runConcurrentRequests(context, requests);
  assertAllowedStatuses(results, config.allowedStatuses);

  const state = await loadFinalState(context, fixture);
  if (state.deflection) {
    if (config.allowedFinalSubjectStatuses) {
      const subjectStatus = state.deflection.status === 'CANCELLED'
        ? 'CANCELLED_PROXY'
        : state.deflection.subjectStatus;
      assertInvariant(
        config.allowedFinalSubjectStatuses.includes(subjectStatus),
        'Deflection ended in an unexpected subject status.',
        {
          allowed: config.allowedFinalSubjectStatuses,
          actual: subjectStatus,
        }
      );
    }
    if (config.allowedFinalHoldStatuses) {
      assertInvariant(
        config.allowedFinalHoldStatuses.includes(state.deflection.status),
        'Deflection ended in an unexpected hold status.',
        {
          allowed: config.allowedFinalHoldStatuses,
          actual: state.deflection.status,
        }
      );
    }
  }

  await assertFacilityBedIntegrity(context);

  if (config.finalCheck) {
    await config.finalCheck({
      context,
      fixture,
      metadata,
      results,
      ...state,
    });
  }

  return buildResult(metadata, results, state);
}

async function prepareEmptyFacilityState (context, options = {}) {
  await cleanupLoadtestArtifacts(context);
  const prisma = await getPrisma();
  const admin = context.usersByEmail[USER_EMAILS.admin];
  const capacity = options.capacity ?? Math.max(context.targetAvailable, 1);
  const unavailableUnoccupied = options.unavailableUnoccupied ?? 0;
  const unavailableOccupied = options.unavailableOccupied ?? 0;

  await prisma.facility.update({
    where: { id: context.facilityId },
    data: {
      status: options.facilityStatus ?? FacilityStatusEnum.OPEN_ACCEPTING,
      statusReasonId: options.facilityStatus === FacilityStatusEnum.CLOSED ? context.ids.facilityClosedReasonId : null,
      statusOther: null,
      updateNotes: null,
      updatedById: admin.id,
    },
  });

  await prisma.bedType.update({
    where: { id: context.bedTypeId },
    data: {
      capacity,
      unavailableUnoccupied,
      unavailableOccupied,
      occupied: 0,
      holds: 0,
      inTransit: 0,
      available: capacity - unavailableUnoccupied - unavailableOccupied,
      unavailableReasonId: unavailableUnoccupied > 0 ? context.ids.unavailableReasonId : null,
      unavailableOther: null,
      updateMethod: 'MANUAL',
      updateNotes: null,
      updatedById: admin.id,
    },
  });
}

async function createIncidents (context, { count, runTag, users }) {
  const incidents = [];
  for (let index = 0; index < count; index++) {
    incidents.push(await createIncidentRecord(context, {
      user: users[index % users.length],
      runTag,
      suffix: String(index),
    }));
  }
  return incidents;
}

async function createIncidentRecord (context, { user, runTag, suffix }) {
  const prisma = await getPrisma();
  const incident = await prisma.incident.create({
    data: {
      facilityId: context.facilityId,
      encounteredVia: 'DISPATCHED',
      cadNumber: `${runTag}-cad-${suffix}`,
      caseNumber: `${runTag}-case-${suffix}`,
      createdById: user.id,
      createdByOrganizationId: user.organizationId,
      createdByTitleId: user.titleId,
      createdByUnitId: user.unitId,
      createdByBadgeNumber: user.badgeNumber,
      updatedById: user.id,
    },
  });

  await prisma.incidentOfficer.create({
    data: {
      incidentId: incident.id,
      facilityId: context.facilityId,
      officerId: user.id,
      role: 'ARRESTING',
      badgeNumber: user.badgeNumber,
      organizationId: user.organizationId,
      unitId: user.unitId,
      titleId: user.titleId,
    },
  });

  return incident;
}

async function createDeflectionFixture (context, metadata, options) {
  const prisma = await getPrisma();
  const owner = context.usersByEmail[options.ownerEmail ?? USER_EMAILS.field1];
  const currentOfficer = context.usersByEmail[options.currentOfficerEmail ?? options.ownerEmail ?? USER_EMAILS.field1];
  const careUser = context.usersByEmail[USER_EMAILS.care];
  const custodyUser = context.usersByEmail[USER_EMAILS.custody];

  const incident = options.incident ?? await createIncidentRecord(context, {
    user: context.usersByEmail[options.incidentOwnerEmail ?? options.ownerEmail ?? USER_EMAILS.field1],
    runTag: metadata.runTag,
    suffix: options.incidentSuffix ?? 'fixture',
  });

  if (options.incidentArrived) {
    const now = new Date();
    await prisma.incidentOfficer.updateMany({
      where: {
        incidentId: incident.id,
        facilityId: context.facilityId,
        officerId: incident.createdById,
      },
      data: { arrivedAt: now },
    });
    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        arrivedAt: now,
        updatedById: incident.createdById,
      },
    });
  }

  let subjectId = null;
  if (options.includeSubject) {
    const subject = await prisma.subject.create({
      data: {
        firstName: 'Load',
        lastName: 'Test',
        localId: `${metadata.runTag}-subject`,
      },
    });
    subjectId = subject.id;
  }

  const now = new Date();
  const subjectStatus = options.subjectStatus;
  const status = options.status ?? defaultHoldStatusForSubjectStatus(subjectStatus);

  const data = {
    facilityId: context.facilityId,
    incidentId: incident.id,
    bedTypeId: context.bedTypeId,
    subjectStatus,
    status,
    subjectId,
    currentOfficerId: currentOfficer.id,
    createdById: owner.id,
    updatedAt: now,
  };

  if (options.includeProperty) {
    data.property = 'SMALL';
    data.propertyDetails = 'Load test bag';
  }
  if (['ADMITTED', 'IN_CHAIR', 'RELEASED'].includes(subjectStatus)) {
    data.admittedAt = now;
    data.admittedById = careUser.id;
  }
  if (subjectStatus === 'RELEASED') {
    data.releasedAt = now;
    data.releasedById = custodyUser.id;
    data.releaseReasonId = options.releaseReasonId ?? context.ids.releaseReasonSobered;
  }
  if (subjectStatus === 'EXITED') {
    data.status = 'COMPLETED';
    data.completedAt = now;
    data.releasedAt = now;
    data.releasedById = custodyUser.id;
    data.exitedAt = now;
    data.exitedById = careUser.id;
    data.exitDestinationId = context.ids.exitDestinationHome;
    data.exitHousingStatusId = context.ids.exitHousingStatus;
    data.exitConnectedToCare = 'YES';
    data.exitSFResident = 'YES';
  }
  if (subjectStatus === 'DEATH_IN_CUSTODY') {
    data.status = 'COMPLETED';
    data.completedAt = now;
    data.releaseReasonId = 'death_in_custody';
  }
  if (subjectStatus === 'DEATH_IN_FACILITY') {
    data.status = 'COMPLETED';
    data.completedAt = now;
    data.releaseReasonId = 'death_in_facility';
    data.releasedAt = now;
    data.releasedById = custodyUser.id;
  }
  if (status === 'CANCELLED') {
    data.cancelledAt = now;
    data.cancelledById = owner.id;
  }
  if (status === 'EXPIRED') {
    data.expiresAt = new Date(now.getTime() - 60 * 1000);
  }

  const deflection = await prisma.deflection.create({ data });
  await syncBedTypeFromFacilityState(context);

  return { incident, deflection };
}

function defaultHoldStatusForSubjectStatus (subjectStatus) {
  if (['EXITED', 'DEATH_IN_CUSTODY', 'DEATH_IN_FACILITY'].includes(subjectStatus)) {
    return 'COMPLETED';
  }
  return 'ACTIVE';
}

async function syncBedTypeFromFacilityState (context) {
  const prisma = await getPrisma();
  const bedType = await prisma.bedType.findUniqueOrThrow({
    where: { id: context.bedTypeId },
  });
  const deflections = await prisma.deflection.findMany({
    where: {
      facilityId: context.facilityId,
      bedTypeId: context.bedTypeId,
      status: ACTIVE_STATUS,
    },
  });
  const derived = deriveCountsFromDeflections(bedType, deflections);

  return prisma.bedType.update({
    where: { id: context.bedTypeId },
    data: {
      holds: derived.holds,
      inTransit: derived.inTransit,
      occupied: derived.occupied,
      available: derived.available,
      updatedById: context.usersByEmail[USER_EMAILS.admin].id,
    },
  });
}

function deriveCountsFromDeflections (bedType, deflections) {
  let holds = 0;
  let inTransit = 0;
  let occupied = 0;

  for (const deflection of deflections) {
    if (HOLD_SUBJECT_STATUSES.has(deflection.subjectStatus)) {
      holds++;
    }
    if (IN_TRANSIT_SUBJECT_STATUSES.has(deflection.subjectStatus)) {
      inTransit++;
    }
    if (OCCUPIED_SUBJECT_STATUSES.has(deflection.subjectStatus)) {
      occupied++;
    }
  }

  return {
    holds,
    inTransit,
    occupied,
    available: bedType.capacity - bedType.unavailableUnoccupied - bedType.unavailableOccupied - occupied - holds,
  };
}

async function assertFacilityBedIntegrity (context) {
  const prisma = await getPrisma();
  const bedType = await prisma.bedType.findUniqueOrThrow({
    where: { id: context.bedTypeId },
  });
  const deflections = await prisma.deflection.findMany({
    where: {
      facilityId: context.facilityId,
      bedTypeId: context.bedTypeId,
      status: ACTIVE_STATUS,
    },
  });
  const derived = deriveCountsFromDeflections(bedType, deflections);

  assertInvariant(bedType.holds === derived.holds, 'Bed holds count drifted from active deflections.', {
    expected: derived,
    actual: pickBedTypeCounts(bedType),
  });
  assertInvariant(bedType.inTransit === derived.inTransit, 'Bed inTransit count drifted from active deflections.', {
    expected: derived,
    actual: pickBedTypeCounts(bedType),
  });
  assertInvariant(bedType.occupied === derived.occupied, 'Bed occupied count drifted from active deflections.', {
    expected: derived,
    actual: pickBedTypeCounts(bedType),
  });
  assertInvariant(bedType.available === derived.available, 'Bed available count drifted from the capacity formula.', {
    expected: derived,
    actual: pickBedTypeCounts(bedType),
    capacity: bedType.capacity,
    unavailableUnoccupied: bedType.unavailableUnoccupied,
    unavailableOccupied: bedType.unavailableOccupied,
  });
  assertInvariant(bedType.available >= 0, 'Bed available count went negative.', {
    actual: pickBedTypeCounts(bedType),
  });
}

function pickBedTypeCounts (bedType) {
  return {
    holds: bedType.holds,
    inTransit: bedType.inTransit,
    occupied: bedType.occupied,
    available: bedType.available,
  };
}

async function loadFinalState (context, fixture = {}) {
  const prisma = await getPrisma();
  const [facility, bedType, deflection, incident] = await Promise.all([
    prisma.facility.findUnique({ where: { id: context.facilityId } }),
    prisma.bedType.findUnique({ where: { id: context.bedTypeId } }),
    fixture.deflection ? prisma.deflection.findUnique({ where: { id: fixture.deflection.id } }) : null,
    fixture.incident ? prisma.incident.findUnique({ where: { id: fixture.incident.id } }) : null,
  ]);

  return { facility, bedType, deflection, incident };
}

async function countActiveDeflectionsByStatus (context, subjectStatus) {
  const prisma = await getPrisma();
  return prisma.deflection.count({
    where: {
      facilityId: context.facilityId,
      status: ACTIVE_STATUS,
      subjectStatus,
    },
  });
}

async function countIncidentActiveHolds (incidentId) {
  const prisma = await getPrisma();
  return prisma.deflection.count({
    where: {
      incidentId,
      status: ACTIVE_STATUS,
    },
  });
}

async function runConcurrentRequests (context, requests) {
  return runConcurrent(requests.map((request) => async () => executeRequest(context, request)));
}

async function executeRequest (context, request) {
  if (request.custom) {
    return request.custom();
  }

  const path = typeof request.path === 'function' ? request.path() : request.path;
  const body = typeof request.body === 'function' ? request.body() : request.body;

  return requestJson(context, {
    method: request.method,
    path,
    cookie: context.cookiesByEmail[request.email],
    body,
  });
}

async function login (baseUrl, email, password) {
  const prisma = await getPrisma();
  const loginResponse = await fetch(new URL('/api/auth/login', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginBody = await parseJson(loginResponse);
  if (!loginResponse.ok) {
    throw new Error(`Login failed for ${email} with status ${loginResponse.status}: ${JSON.stringify(loginBody)}`);
  }

  if (loginBody?.mfaRequired) {
    const user = await prisma.user.findUnique({ where: { email } });
    const verifyResponse = await fetch(new URL('/api/auth/verify-code', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: loginBody.mfaToken, code: user.mfaCode }),
    });
    const verifyBody = await parseJson(verifyResponse);
    if (!verifyResponse.ok) {
      throw new Error(`MFA verification failed for ${email} with status ${verifyResponse.status}: ${JSON.stringify(verifyBody)}`);
    }
    return extractSessionCookie(verifyResponse);
  }

  return extractSessionCookie(loginResponse);
}

function extractSessionCookie (response) {
  const header = response.headers.get('set-cookie') ?? '';
  const match = header.match(/session=[^;]+/);
  if (!match) {
    throw new Error('No session cookie returned by the auth endpoint.');
  }
  return match[0];
}

async function requestJson (context, { method, path, cookie, body }) {
  const response = await fetch(new URL(path, context.baseUrl), {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    body: await parseJson(response),
  };
}

async function parseJson (response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function cleanupLoadtestArtifacts (context) {
  const prisma = await getPrisma();
  const deflections = await prisma.deflection.findMany({
    where: { facilityId: context.facilityId },
    select: { id: true, subjectId: true },
  });
  const deflectionIds = deflections.map((deflection) => deflection.id);
  const subjectIds = [...new Set(deflections.map((deflection) => deflection.subjectId).filter(Boolean))];

  if (deflectionIds.length > 0) {
    await prisma.deflectionDocument.deleteMany({ where: { deflectionId: { in: deflectionIds } } });
    await prisma.propertyPhoto.deleteMany({ where: { deflectionId: { in: deflectionIds } } });
    await prisma.deflectionUpdate.deleteMany({ where: { deflectionId: { in: deflectionIds } } });
    await prisma.deflection.deleteMany({ where: { id: { in: deflectionIds } } });
  }

  await prisma.incidentOfficer.deleteMany({
    where: { facilityId: context.facilityId },
  });
  await prisma.incident.deleteMany({
    where: { facilityId: context.facilityId },
  });
  await prisma.bedTypeUpdate.deleteMany({
    where: { facilityId: context.facilityId },
  });
  await prisma.facilityUpdate.deleteMany({
    where: { facilityId: context.facilityId },
  });
  if (subjectIds.length > 0) {
    await prisma.subject.deleteMany({
      where: { id: { in: subjectIds } },
    });
  }
}

async function runConcurrent (tasks) {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const promises = tasks.map((task) => (async () => {
    await gate;
    return task();
  })());

  release();
  return Promise.all(promises);
}

function countStatuses (results) {
  return results.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});
}

function assertAllowedStatuses (results, allowedStatuses) {
  const allowed = new Set(allowedStatuses);
  const statusCounts = countStatuses(results);
  assertInvariant(
    results.every((result) => allowed.has(result.status)),
    'Unexpected response status returned.',
    statusCounts,
  );
}

function assertInvariant (condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function buildResult (metadata, results, state, checks = {}) {
  return {
    ...metadata,
    statusCounts: countStatuses(results),
    checks: {
      ...checks,
      facilityStatus: state.facility?.status ?? null,
      deflectionStatus: state.deflection?.status ?? null,
      subjectStatus: state.deflection?.subjectStatus ?? null,
      bedType: state.bedType,
    },
  };
}

function printSummary (result) {
  console.log(JSON.stringify(result, null, 2));
}

function createIncidentPayload (context, runTag, index) {
  return {
    facilityId: context.facilityId,
    encounteredVia: 'DISPATCHED',
    cadNumber: `${runTag}-cad-${index}`,
    caseNumber: `${runTag}-case-${index}`,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    arrestedAt: null,
    supervisorBadgeNumber: null,
  };
}

function closedFacilityBody (context) {
  return {
    status: FacilityStatusEnum.CLOSED,
    statusReasonId: context.ids.facilityClosedReasonId,
    updateNotes: 'Load test facility close',
  };
}

function reopenedFacilityBody () {
  return {
    status: FacilityStatusEnum.OPEN_ACCEPTING,
    updateNotes: 'Load test facility reopen',
  };
}

function shrinkBedTypeBody (context) {
  return {
    unavailableUnoccupied: 1,
    unavailableReasonId: context.ids.unavailableReasonId,
    updateNotes: 'Load test shrink',
  };
}

function medicalReleaseBody (context) {
  return {
    releaseReasonId: context.ids.releaseReasonMedical,
    exitDestinationId: context.ids.exitDestinationHospital,
  };
}

function exitBody (context) {
  return {
    exitDestinationId: context.ids.exitDestinationHome,
    exitHousingStatusId: context.ids.exitHousingStatus,
    exitSFResident: 'YES',
    exitConnectedToCare: 'YES',
  };
}

async function getPrisma () {
  if (!prismaClient) {
    const module = await import('#prisma/client.js');
    prismaClient = module.default;
  }
  return prismaClient;
}

main()
  .catch((error) => {
    console.error('\nLoad test failed.');
    console.error(error.message);
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
