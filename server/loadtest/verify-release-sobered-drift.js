// Deterministic verification script for the bedType-drift bug exposed by
// `ready-for-intake-terminal-race`.
//
// HYPOTHESIS: server/routes/api/deflections/release.js skips the bedType
// counter update for default sobered releases. When the previous subjectStatus
// is a pre-chair hold (AWAITING_INTAKE / READY_FOR_INTAKE / FAILED_INTAKE /
// ADMITTED), the deflection moves to RELEASED but the bed reservation is
// never released — leaving `holds` drifted from reality.
//
// PHYSICAL REALITY: a person only occupies one of the facility's chairs after
// passing both the deputy safety check AND the care-staff medical intake.
// Anyone released before reaching IN_CHAIR never used a chair.
//
// PROPOSED FIX: sobered release from a pre-chair hold state finalizes the
// deflection in one step (COMPLETED + EXITED), with bedType counters
// transitioning hold → available (no occupied involvement). Sobered release
// from IN_CHAIR keeps the existing lingering ACTIVE+RELEASED behavior.
//
// This script reproduces the bug DETERMINISTICALLY (no race) so we can
// confirm the root cause before applying the fix and again after.
//
// Usage (from inside the server container):
//   node loadtest/verify-release-sobered-drift.js
//
// Exit codes:
//   0 = fix is in place / no drift detected
//       (deflection ends in COMPLETED+EXITED, bedType: holds-=1, available+=1)
//   2 = bug REPRODUCED (release left bedType unchanged + deflection lingering)
//   1 = unexpected outcome / setup failure

import '../config.js';
import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.LOADTEST_BASE_URL ?? 'http://localhost:3000';
const PASSWORD = process.env.LOADTEST_PASSWORD ?? 'abcd1234';
const CUSTODY_EMAIL = 'sfso@careconnectsf.org';
const FIELD_EMAIL = 'sfpd@careconnectsf.org';
const FACILITY_NAME = 'LOADTEST RESET';
const RUN_TAG = `VERIFY-release-sobered-drift-${Date.now()}`;

const prisma = new PrismaClient();

function fail (message, details = {}) {
  console.error(`ERROR: ${message}`);
  for (const [key, value] of Object.entries(details)) {
    console.error(`  ${key}:`, value);
  }
  process.exit(1);
}

async function login (email, password) {
  const response = await fetch(new URL('/api/auth/login', BASE_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`Login failed for ${email}`, { status: response.status, body });
  }
  const header = response.headers.get('set-cookie') ?? '';
  const match = header.match(/session=[^;]+/);
  if (!match) {
    fail('No session cookie in login response');
  }
  return match[0];
}

function pickCounts (bedType) {
  return {
    capacity: bedType.capacity,
    holds: bedType.holds,
    inTransit: bedType.inTransit,
    occupied: bedType.occupied,
    available: bedType.available,
    unavailableUnoccupied: bedType.unavailableUnoccupied,
    unavailableOccupied: bedType.unavailableOccupied,
  };
}

async function main () {
  // 1. Find the loadtest facility + bedType (assumes the load-test harness
  //    has run at least once to seed the facility).
  const facility = await prisma.facility.findFirst({ where: { name: FACILITY_NAME } });
  if (!facility) {
    fail(`Facility "${FACILITY_NAME}" not found`, {
      hint: 'Run `npm run loadtest -- --scenario=create-bed-race --iterations=1` once first to seed it.',
    });
  }
  const bedType = await prisma.bedType.findFirst({ where: { facilityId: facility.id } });
  if (!bedType) {
    fail('No bedType found for the loadtest facility');
  }
  const custodyUser = await prisma.user.findUnique({ where: { email: CUSTODY_EMAIL } });
  const fieldUser = await prisma.user.findUnique({ where: { email: FIELD_EMAIL } });
  if (!custodyUser || !fieldUser) {
    fail('Required users not found', { needed: [CUSTODY_EMAIL, FIELD_EMAIL] });
  }

  console.log(`Using facility: ${facility.id} (${facility.name})`);
  console.log(`Using bedType:  ${bedType.id}`);

  // 2. Reset state on this facility so the scenario starts clean.
  const existingDeflections = await prisma.deflection.findMany({
    where: { facilityId: facility.id },
    select: { id: true },
  });
  const existingIds = existingDeflections.map((d) => d.id);
  if (existingIds.length > 0) {
    await prisma.deflectionDocument.deleteMany({ where: { deflectionId: { in: existingIds } } });
    await prisma.propertyPhoto.deleteMany({ where: { deflectionId: { in: existingIds } } });
    await prisma.deflectionUpdate.deleteMany({ where: { deflectionId: { in: existingIds } } });
    await prisma.handoff.deleteMany({ where: { deflectionId: { in: existingIds } } });
    await prisma.deflection.deleteMany({ where: { id: { in: existingIds } } });
  }
  await prisma.facilityCheckIn.deleteMany({ where: { facilityId: facility.id } });
  await prisma.bedTypeUpdate.deleteMany({ where: { facilityId: facility.id } });
  await prisma.incident.deleteMany({ where: { facilityId: facility.id } });

  // 3. Set bedType to a known starting state: capacity=1, with a single hold.
  await prisma.bedType.update({
    where: { id: bedType.id },
    data: {
      capacity: 1,
      unavailableUnoccupied: 0,
      unavailableOccupied: 0,
      occupied: 0,
      holds: 1,
      inTransit: 0,
      available: 0,
      updatedById: fieldUser.id,
    },
  });

  // 4. Create an incident + a single ACTIVE deflection in READY_FOR_INTAKE
  //    (a pre-chair hold state — the person never reached IN_CHAIR).
  const incident = await prisma.incident.create({
    data: {
      facilityId: facility.id,
      encounteredVia: 'DISPATCHED',
      cadNumber: `${RUN_TAG}-cad`,
      caseNumber: `${RUN_TAG}-case`,
      createdById: fieldUser.id,
      createdByOrganizationId: fieldUser.organizationId,
      createdByTitleId: fieldUser.titleId,
      createdByUnitId: fieldUser.unitId,
      createdByBadgeNumber: fieldUser.badgeNumber,
      updatedById: fieldUser.id,
    },
  });
  const deflection = await prisma.deflection.create({
    data: {
      facilityId: facility.id,
      incidentId: incident.id,
      bedTypeId: bedType.id,
      subjectStatus: 'READY_FOR_INTAKE',
      status: 'ACTIVE',
      currentOfficerId: fieldUser.id,
      createdById: fieldUser.id,
    },
  });

  // 5. Capture the BEFORE state.
  const before = await prisma.bedType.findUniqueOrThrow({ where: { id: bedType.id } });
  const beforeDeflection = await prisma.deflection.findUniqueOrThrow({ where: { id: deflection.id } });
  console.log('\nBEFORE release:');
  console.log('  deflection:', { status: beforeDeflection.status, subjectStatus: beforeDeflection.subjectStatus });
  console.log('  bedType:   ', pickCounts(before));

  // 6. Hit the sobered-release endpoint.
  const cookie = await login(CUSTODY_EMAIL, PASSWORD);
  const response = await fetch(new URL(`/api/deflections/${deflection.id}/release`, BASE_URL), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify({ releaseReasonId: 'sobered' }),
  });
  const responseBody = await response.text();
  console.log(`\nrelease HTTP response: ${response.status}`);
  if (!response.ok) {
    fail('Release endpoint did not return 2xx', {
      status: response.status,
      body: responseBody,
    });
  }

  // 7. Capture the AFTER state.
  const after = await prisma.bedType.findUniqueOrThrow({ where: { id: bedType.id } });
  const afterDeflection = await prisma.deflection.findUniqueOrThrow({ where: { id: deflection.id } });
  console.log('\nAFTER release:');
  console.log('  deflection:', { status: afterDeflection.status, subjectStatus: afterDeflection.subjectStatus });
  console.log('  bedType:   ', pickCounts(after));

  // 8. Determine outcome.
  // The corrected fix: sobered release from a pre-chair hold state finalizes
  // the deflection in one step (COMPLETED + EXITED) and frees the bed
  // (holds -= 1, available += 1, no occupied change).
  console.log('\n--- Verification ---');

  const fixApplied = (
    afterDeflection.status === 'COMPLETED' &&
    afterDeflection.subjectStatus === 'EXITED' &&
    after.holds === before.holds - 1 &&
    after.occupied === before.occupied &&
    after.available === before.available + 1
  );

  const bugReproduced = (
    afterDeflection.status === 'ACTIVE' &&
    afterDeflection.subjectStatus === 'RELEASED' &&
    after.holds === before.holds &&
    after.occupied === before.occupied &&
    after.available === before.available
  );

  if (fixApplied) {
    console.log('PASS: sobered release from a pre-chair hold finalized as expected.');
    console.log(`  deflection: ACTIVE/READY_FOR_INTAKE -> COMPLETED/EXITED`);
    console.log(`  bedType holds:    ${before.holds} -> ${after.holds}`);
    console.log(`  bedType occupied: ${before.occupied} -> ${after.occupied} (unchanged; no chair was used)`);
    console.log(`  bedType available: ${before.available} -> ${after.available}`);
    console.log('release.js correctly handles sobered release from a pre-chair hold state.');
    process.exit(0);
  }
  if (bugReproduced) {
    console.log('FAIL: sobered release left bedType counters drifted.');
    console.log(`  deflection: ACTIVE/READY_FOR_INTAKE -> ACTIVE/RELEASED  (still active, lingering)`);
    console.log(`  bedType:    unchanged from BEFORE (no decrement of holds)`);
    console.log('release.js is skipping the bedType update for sobered release from a pre-chair hold.');
    console.log('See plans/release-sobered-bedtype-drift-bug.md for the proposed fix.');
    process.exit(2);
  }

  console.log('UNEXPECTED outcome — neither fix-applied nor known-bug pattern.');
  console.log('  before:    ', pickCounts(before));
  console.log('  after:     ', pickCounts(after));
  console.log('  deflection:', {
    before: { status: beforeDeflection.status, subjectStatus: beforeDeflection.subjectStatus },
    after: { status: afterDeflection.status, subjectStatus: afterDeflection.subjectStatus },
  });
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
