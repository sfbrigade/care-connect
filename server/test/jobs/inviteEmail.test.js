import { test } from 'node:test';
import * as assert from 'node:assert';
import * as nodemailerMock from 'nodemailer-mock';
import { configureMailer } from '#lib/mailer.js';

// Configure mock mailer before importing job handler (mailer.js is a singleton)
configureMailer(nodemailerMock);

const { default: inviteEmail } = await import('../../jobs/inviteEmail.js');

// Enable SMTP so mailer actually sends
const originalSmtpEnabled = process.env.SMTP_ENABLED;
process.env.SMTP_ENABLED = 'true';

test('inviteEmail job handler', async (t) => {
  t.after(() => {
    process.env.SMTP_ENABLED = originalSmtpEnabled;
  });

  t.afterEach(() => {
    nodemailerMock.mock.reset();
  });

  await t.test('sends invite email with facility', async (t) => {
    const mockPrisma = {
      invite: {
        findUniqueOrThrow: async () => ({
          id: 'test-invite-id',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          message: 'Welcome!',
        }),
        update: async () => ({}),
      },
      facility: {
        findUniqueOrThrow: async () => ({
          id: 'test-facility-id',
          subdomain: 'lesc',
        }),
      },
    };

    await inviteEmail({ inviteId: 'test-invite-id', facilityId: 'test-facility-id' }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);
    assert.deepStrictEqual(sentMail[0].to, 'Jane Doe <jane@test.com>');
    assert.ok(sentMail[0].html.includes('test-invite-id'));
  });

  await t.test('sends invite email without facility (null facilityId)', async (t) => {
    const mockPrisma = {
      invite: {
        findUniqueOrThrow: async () => ({
          id: 'test-invite-id',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          message: null,
        }),
        update: async () => ({}),
      },
    };

    await inviteEmail({ inviteId: 'test-invite-id', facilityId: null }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);
    assert.deepStrictEqual(sentMail[0].to, 'Jane Doe <jane@test.com>');
  });
});
