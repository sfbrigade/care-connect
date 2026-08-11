import '../config.js';
import prisma from '#prisma/client.js';

// Dev helper to inspect / enroll / unenroll a user's SMS notification state.
// Intended to be run inside the server container (see scripts/sms-user.sh).

const ALL_EVENTS = ['NEW_HOLD', 'ARRIVAL', 'EXIT'];

const SMS_SELECT = {
  email: true,
  roles: true,
  deactivatedAt: true,
  deletedAt: true,
  phoneNumber: true,
  phoneVerifiedAt: true,
  smsConsentAt: true,
  smsOptedOutAt: true,
  notificationsEnabled: true,
  subscribedEvents: true,
  currentFacilityId: true,
  smsBannerDismissedAt: true,
  smsBannerRemindAfter: true,
  smsBannerRemindCount: true,
};

function usage () {
  console.log(`Usage: sms-user <check|enroll|unenroll> <email> [phoneNumber]

  check     <email>          Print SMS state + recipient-gate result.
  enroll    <email> [phone]  Full RESET recipient (verified, all events, unmuted).
  unenroll  <email>          Clear SMS state; banner will show again.`);
}

function fmt (v) {
  if (v == null) return '—';
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}

async function getResetFacility () {
  const f = await prisma.facility.findFirst({ where: { type: 'LESC' } });
  if (!f) throw new Error('No LESC (RESET) facility found — is the DB seeded?');
  return f;
}

async function printState (email) {
  const f = await prisma.facility.findFirst({ where: { type: 'LESC' } });
  const u = await prisma.user.findFirst({ where: { email }, select: SMS_SELECT });
  if (!u) { console.log(`No user found: ${email}`); return; }

  console.log(`\n${u.email}`);
  console.log('  roles                :', fmt(u.roles));
  console.log('  phoneNumber          :', fmt(u.phoneNumber));
  console.log('  phoneVerifiedAt      :', fmt(u.phoneVerifiedAt));
  console.log('  notificationsEnabled :', u.notificationsEnabled, u.notificationsEnabled ? '(unmuted)' : '(MUTED)');
  console.log('  subscribedEvents     :', fmt(u.subscribedEvents));
  console.log('  smsOptedOutAt        :', fmt(u.smsOptedOutAt));
  console.log('  currentFacilityId    :', fmt(u.currentFacilityId), u.currentFacilityId === f?.id ? '(== RESET)' : '(≠ RESET)');
  console.log('  smsConsentAt         :', fmt(u.smsConsentAt));
  console.log('  banner: dismissedAt  :', fmt(u.smsBannerDismissedAt), '| remindAfter:', fmt(u.smsBannerRemindAfter), '| remindCount:', u.smsBannerRemindCount);

  const checks = {
    'currentFacilityId == RESET': u.currentFacilityId === f?.id,
    'has CUSTODY role': (u.roles ?? []).includes('CUSTODY'),
    'phone verified': !!u.phoneVerifiedAt,
    'notifications enabled (unmuted)': u.notificationsEnabled === true,
    'not opted out': u.smsOptedOutAt == null,
    active: !u.deactivatedAt && !u.deletedAt,
  };
  const passAll = Object.values(checks).every(Boolean);
  console.log('\n  RECIPIENT GATE:', passAll ? 'PASS' : 'FAIL');
  for (const [k, ok] of Object.entries(checks)) if (!ok) console.log('    ✗', k);
  if (passAll) {
    const subs = u.subscribedEvents ?? [];
    console.log('   ', subs.length ? `→ would receive: ${subs.join(', ')}` : '→ gate passes but subscribed to NO events (nothing fires)');
  }
  console.log('');
}

async function enroll (email, phone) {
  const f = await getResetFacility();
  const phoneNumber = phone || '+15551110001';
  await prisma.user.update({
    where: { email },
    data: {
      phoneNumber,
      phoneVerifiedAt: new Date(),
      smsConsentAt: new Date(),
      subscribedEvents: ALL_EVENTS,
      notificationsEnabled: true,
      smsOptedOutAt: null,
      currentFacilityId: f.id,
      smsWelcomedAt: new Date(),
      smsOtpCode: null,
      smsOtpExpiresAt: null,
      smsOtpAttempts: 0,
      smsOtpLastSentAt: null,
    },
  });
  console.log(`Enrolled ${email} as a RESET recipient (phone ${phoneNumber}, all events, unmuted).`);
}

async function unenroll (email) {
  const f = await getResetFacility();
  await prisma.user.update({
    where: { email },
    data: {
      phoneNumber: null,
      phoneVerifiedAt: null,
      smsConsentAt: null,
      subscribedEvents: [],
      notificationsEnabled: false,
      smsOptedOutAt: null,
      currentFacilityId: f.id,
      smsBannerDismissedAt: null,
      smsBannerRemindAfter: null,
      smsBannerRemindCount: 0,
      smsWelcomedAt: null,
      smsOtpCode: null,
      smsOtpExpiresAt: null,
      smsOtpAttempts: 0,
      smsOtpLastSentAt: null,
    },
  });
  console.log(`Unenrolled ${email} (banner will show; currentFacilityId set to RESET).`);
}

const [cmd, email, phone] = process.argv.slice(2);
if (!cmd || !email || !['check', 'enroll', 'unenroll'].includes(cmd)) {
  usage();
  process.exit(1);
}

try {
  if (cmd === 'check') {
    await printState(email);
  } else if (cmd === 'enroll') {
    await enroll(email, phone);
    await printState(email);
  } else if (cmd === 'unenroll') {
    await unenroll(email);
    await printState(email);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
process.exit(0);
