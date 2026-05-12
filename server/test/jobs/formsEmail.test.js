import { test } from 'node:test';
import * as assert from 'node:assert';
import * as nodemailerMock from 'nodemailer-mock';
import { PDFDocument } from 'pdf-lib';
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

  const mockDeflection = {
    id: 4,
    transferredAt: new Date('2026-05-01T12:00:00.000Z'),
    releasedAt: new Date('2026-05-02T08:00:00.000Z'),
    exitedAt: null,
    exitDestination: null,
    releaseReason: 'SOBERED',
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
      cadNumber: 'CADEMAIL',
      caseNumber: 'CASEMAIL',
    },
    releasedBy: {
      firstName: 'Release',
      lastName: 'Deputy',
      badgeNumber: 'R123',
      prop115Certified: false,
      unit: { name: 'Release Unit' },
    },
    exitedBy: null,
    drugType: 'FENTANYL',
    behavior: null,
    releaseNarrative: 'Release narrative.',
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
  };

  const mockPrisma = {
    deflection: {
      findUnique: async () => mockDeflection,
    },
    user: {
      findUnique: async () => ({
        email: 'releasing.user@test.com',
      }),
    },
  };

  await t.test('sends custody-transfer 647f to the two fixed addresses plus the arresting officer', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['647f'],
      template: 'transfer-form',
      userId: 'test-user-id',
      recipientEmail: [
        'SFPD.Data.Transfer.Authorized@sfgov.org',
        'Andrew.bley@sfgov.org',
      ],
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 1);

    assert.deepStrictEqual(sentMail[0].to, [
      'SFPD.Data.Transfer.Authorized@sfgov.org',
      'Andrew.bley@sfgov.org',
      'regular.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].cc, undefined);
    assert.deepStrictEqual(sentMail[0].subject, '647(f) RWS document for Jane Doe / case #CASEMAIL (RESET)');
    assert.deepStrictEqual(sentMail[0].text.trim(), 'The 647(f) transfer form for Jane Doe, case #CASEMAIL, RESET center deflection, is attached.\n----');
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
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b-report-4.pdf']);
    assert.ok(sentMail[0].attachments[0].content, '849b should be generated live for email attachment');
    assert.strictEqual(sentMail[0].attachments[0].path, undefined);
    const doc = await PDFDocument.load(sentMail[0].attachments[0].content);
    const pdfForm = doc.getForm();
    assert.deepStrictEqual(pdfForm.getDropdown('Dropdown4').getSelected(), ['DET/REL']);
    assert.strictEqual(pdfForm.getTextField('CODE_2').getText(), 'R1');
    assert.strictEqual(pdfForm.getTextField('NAME LAST FIRST MIDDLE_2').getText(), 'Deputy, R, #R123');
    assert.strictEqual(pdfForm.getTextField('Text4').getText() || '', '');
  });

  await t.test('throws when live 849b cannot be generated so the queue can retry / dead-letter', async () => {
    const ungeneratablePrisma = {
      ...mockPrisma,
      deflection: {
        findUnique: async () => ({
          ...mockDeflection,
          releasedAt: null,
          exitedAt: null,
          exitDestination: null,
        }),
      },
    };

    await assert.rejects(
      () => formsEmail({
        deflectionId: 4,
        formIds: ['849b'],
        template: 'self-849b',
        userId: 'test-user-id',
      }, ungeneratablePrisma),
      /Live 849\(b\) generation failed for deflection 4/
    );

    assert.deepStrictEqual(nodemailerMock.mock.getSentMail(), []);
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
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b-report-4.pdf']);
    assert.ok(sentMail[0].attachments[0].content, '849b should be generated live for email attachment');
    assert.strictEqual(sentMail[0].attachments[0].path, undefined);
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
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b-report-4.pdf', '647f.pdf', 'cert.pdf']);
    const attachment849b = sentMail[0].attachments.find(a => a.filename === '849b-report-4.pdf');
    assert.ok(attachment849b.content, '849b should be generated live for release email attachment');
    assert.strictEqual(attachment849b.path, undefined);
  });

  await t.test('does not send an additional 647f-only release email from timestamps alone', async () => {
    const regeneratedPrisma = {
      ...mockPrisma,
      deflection: {
        findUnique: async () => ({
          ...mockDeflection,
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
    assert.deepStrictEqual(sentMail.length, 1);

    assert.deepStrictEqual(sentMail[0].to, [
      'sfso-swapsups@sfgov.org',
      'releasing.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b-report-4.pdf', '647f.pdf', 'cert.pdf']);
    const regeneratedAttachment849b = sentMail[0].attachments.find(a => a.filename === '849b-report-4.pdf');
    assert.ok(regeneratedAttachment849b.content, '849b should be generated live for release email attachment');
    assert.strictEqual(regeneratedAttachment849b.path, undefined);
  });

  await t.test('sends an additional 647f-only release email when 647f was regenerated during the release job', async () => {
    await formsEmail({
      deflectionId: 4,
      formIds: ['647f', '849b', 'cert'],
      template: 'release-forms',
      userId: 'test-user-id',
      regeneratedFormIds: ['647f', 'cert'],
    }, mockPrisma);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.deepStrictEqual(sentMail.length, 2);

    assert.deepStrictEqual(sentMail[0].to, [
      'sfso-swapsups@sfgov.org',
      'releasing.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[0].attachments.map(a => a.filename), ['849b-report-4.pdf', '647f.pdf', 'cert.pdf']);

    assert.deepStrictEqual(sentMail[1].to, [
      'SFPD.Data.Transfer.Authorized@sfgov.org',
      'Andrew.bley@sfgov.org',
      'regular.user@test.com',
    ]);
    assert.deepStrictEqual(sentMail[1].cc, undefined);
    assert.deepStrictEqual(sentMail[1].subject, '647(f) RWS document for Jane Doe / case #CASEMAIL (RESET)');
    assert.deepStrictEqual(sentMail[1].attachments.map(a => a.filename), ['647f.pdf']);
  });
});
