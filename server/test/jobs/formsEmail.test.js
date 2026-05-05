import { test } from 'node:test';
import * as assert from 'node:assert';
import * as nodemailerMock from 'nodemailer-mock';
import { configureMailer } from '#lib/mailer.js';
import DeflectionDocument from '#models/deflectionDocument.js';

configureMailer(nodemailerMock);

const { default: formsEmail } = await import('../../jobs/formsEmail.js');

const originalSmtpEnabled = process.env.SMTP_ENABLED;
process.env.SMTP_ENABLED = 'true';
const originalGetAsset = DeflectionDocument.prototype.getAsset;
DeflectionDocument.prototype.getAsset = async function () {
  return `/tmp/${this.file}`;
};

test('formsEmail job handler', async (t) => {
  t.after(() => {
    process.env.SMTP_ENABLED = originalSmtpEnabled;
    DeflectionDocument.prototype.getAsset = originalGetAsset;
  });

  t.afterEach(() => {
    nodemailerMock.mock.reset();
  });

  const mockPrisma = {
    deflection: {
      findUnique: async () => ({
        transferredAt: new Date('2026-05-01T12:00:00.000Z'),
        subject: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
        facility: {
          name: 'RESET',
        },
        incident: {
          createdBy: {
            firstName: 'Regular',
            lastName: 'User',
            email: 'regular.user@test.com',
          },
        },
        deflectionDocuments: [
          {
            formId: '647f',
            file: '647f.pdf',
            createdAt: new Date('2026-05-01T12:05:00.000Z'),
            updatedAt: new Date('2026-05-01T12:05:00.000Z'),
          },
          {
            formId: '849b',
            file: '849b.pdf',
            createdAt: new Date('2026-05-02T08:00:00.000Z'),
            updatedAt: new Date('2026-05-02T08:00:00.000Z'),
          },
          {
            formId: 'cert',
            file: 'cert.pdf',
            createdAt: new Date('2026-05-02T08:00:00.000Z'),
            updatedAt: new Date('2026-05-02T08:00:00.000Z'),
          },
        ],
      }),
    },
    user: {
      findUnique: async () => ({
        email: 'releasing.user@test.com',
      }),
    },
  };

  await t.test('sends custody-transfer 647f to the three fixed addresses plus the arresting officer', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['647f'],
      template: 'transfer-form',
      userId: 'test-user-id',
      recipientEmail: [
        'SFPD.Data.Transfer.Authorized@sfgov.org',
        'Andrew.bley@sfgov.org',
        'Sfso-incidentreports@sfgov.org',
      ],
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);

    assert.deepStrictEqual(sentMail[0].to, [
      'SFPD.Data.Transfer.Authorized@sfgov.org',
      'Andrew.bley@sfgov.org',
      'Sfso-incidentreports@sfgov.org',
      'regular.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].cc, undefined);
    assert.deepStrictEqual(sentMail[0].subject, '647(f) RWS document for Jane Doe / RESET deflection');
  });

  await t.test('sends 849b only to swaps supervisors and the releasing user', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['849b'],
      template: 'incident-forms',
      userId: 'test-user-id',
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);
    assert.deepStrictEqual(sentMail[0].to, [
      'sfso-swapsups@sfgov.org',
      'releasing.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].cc, undefined);
    assert.deepStrictEqual(sentMail[0].subject, 'Incident forms for Jane Doe');
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b.pdf']);
  });

  await t.test('sends self-requested 849b only to the current user', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['849b'],
      template: 'self-849b',
      userId: 'test-user-id',
      recipientEmail: 'fallback.user@test.com',
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);
    assert.deepStrictEqual(sentMail[0].to, 'releasing.user@test.com');
    assert.deepStrictEqual(sentMail[0].cc, undefined);
    assert.deepStrictEqual(sentMail[0].subject, '849(b) form for Jane Doe');
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b.pdf']);
  });

  await t.test('sends release forms as one email to swaps supervisors and the releasing user', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['647f', '849b', 'cert'],
      template: 'release-forms',
      userId: 'test-user-id',
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);

    assert.deepStrictEqual(sentMail[0].to, [
      'sfso-swapsups@sfgov.org',
      'releasing.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].cc, undefined);
    assert.deepStrictEqual(sentMail[0].subject, 'Release forms for Jane Doe');
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['647f.pdf', '849b.pdf', 'cert.pdf']);
  });

  await t.test('sends an additional 647f-only release email when 647f was regenerated after transfer', async () => {
    const regeneratedPrisma = {
      ...mockPrisma,
      deflection: {
        findUnique: async () => ({
          transferredAt: new Date('2026-05-01T12:00:00.000Z'),
          subject: {
            firstName: 'Jane',
            lastName: 'Doe',
          },
          facility: {
            name: 'RESET',
          },
          incident: {
            createdBy: {
              firstName: 'Regular',
              lastName: 'User',
              email: 'regular.user@test.com',
            },
          },
          deflectionDocuments: [
            {
              formId: '647f',
              file: '647f.pdf',
              createdAt: new Date('2026-05-01T12:05:00.000Z'),
              updatedAt: new Date('2026-05-02T07:30:00.000Z'),
            },
            {
              formId: '849b',
              file: '849b.pdf',
              createdAt: new Date('2026-05-02T08:00:00.000Z'),
              updatedAt: new Date('2026-05-02T08:00:00.000Z'),
            },
            {
              formId: 'cert',
              file: 'cert.pdf',
              createdAt: new Date('2026-05-02T08:00:00.000Z'),
              updatedAt: new Date('2026-05-02T08:00:00.000Z'),
            },
          ],
        }),
      },
    };

    await formsEmail({
      deflectionId: 4,
      formIds: ['647f', '849b', 'cert'],
      template: 'release-forms',
      userId: 'test-user-id',
    }, regeneratedPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 2);

    assert.deepStrictEqual(sentMail[0].to, [
      'sfso-swapsups@sfgov.org',
      'releasing.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['647f.pdf', '849b.pdf', 'cert.pdf']);

    assert.deepStrictEqual(sentMail[1].to, [
      'SFPD.Data.Transfer.Authorized@sfgov.org',
      'Andrew.bley@sfgov.org',
      'Sfso-incidentreports@sfgov.org',
      'regular.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[1].cc, undefined);
    assert.deepStrictEqual(sentMail[1].subject, '647(f) RWS document for Jane Doe / RESET deflection');
    assert.deepStrictEqual(sentMail[1].attachments.map(a => a.filename), ['647f.pdf']);
  });
});
