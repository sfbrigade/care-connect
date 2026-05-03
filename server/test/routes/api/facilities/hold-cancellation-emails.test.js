import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build, nodemailerMock } from '#test/helper.js';
import Facility from '#models/facility.js';
import Deflection from '#models/deflection.js';

const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const BED_TYPE_ID = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

test('Hold cancellation email notifications', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('sends email when admin cancels another user\'s hold', async () => {
    await app.prisma.deflection.expire();
    nodemailerMock.mock.reset();

    // Find an active hold created by someone other than admin
    const hold = await app.prisma.deflection.findFirst({
      where: {
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        NOT: { createdById: '555740af-17e9-48a3-93b8-d5236dfd2c29' }, // not admin
      },
    });
    assert.ok(hold, 'Need an active hold created by non-admin');

    const response = await app.inject()
      .delete(`/api/deflections/${hold.id}`)
      .headers(adminHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.ok(sentMail.length > 0, 'Expected cancellation email to be sent');
    const email = sentMail[sentMail.length - 1];
    assert.ok(email.text.includes('cancelled'));
  });

  await t.test('does not send email for self-cancellation', async () => {
    // Create a hold as regular user, then cancel it as that same user
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    await app.prisma.deflection.expire();

    const hold = await app.prisma.deflection.findFirst({
      where: {
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        createdById: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5', // regular user
      },
    });

    if (hold) {
      nodemailerMock.mock.reset();

      await app.inject()
        .delete(`/api/deflections/${hold.id}`)
        .headers(userHeaders);

      const sentMail = nodemailerMock.mock.getSentMail();
      assert.deepStrictEqual(sentMail.length, 0, 'Should not send email for self-cancellation');
    }
  });

  await t.test('sends emails when facility is closed', async () => {
    await app.prisma.deflection.expire();
    nodemailerMock.mock.reset();

    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(adminHeaders)
      .payload({
        status: Facility.Status.CLOSED,
        statusReason: 'OTHER',
        statusOther: 'Testing email notifications',
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.ok(sentMail.length > 0, 'Expected cancellation emails when facility closes');
    // All emails should mention cancellation
    for (const email of sentMail) {
      assert.ok(email.text.includes('cancelled'));
    }
  });

  await t.test('sends reopening emails when facility opens after closure', async () => {
    await app.prisma.deflection.expire();

    // First close the facility to cancel holds
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(adminHeaders)
      .payload({
        status: Facility.Status.CLOSED,
        statusReason: 'OTHER',
        statusOther: 'Closing for reopen test',
      });

    // Now reopen
    nodemailerMock.mock.reset();

    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(adminHeaders)
      .payload({
        status: Facility.Status.OPEN_ACCEPTING,
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.ok(sentMail.length > 0, 'Expected reopening emails');
    for (const email of sentMail) {
      assert.ok(email.text.includes('open'));
    }
  });

  await t.test('sends emails when capacity squeeze cancels holds', async () => {
    // Reset facility to open and ensure we have active holds
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(adminHeaders)
      .payload({ status: Facility.Status.OPEN_ACCEPTING });

    await app.prisma.deflection.expire();
    nodemailerMock.mock.reset();

    // Set unavailable high enough to force hold cancellation
    // capacity=10, occupied=0, holds=4 (after expire). Setting unavailable to 7:
    // available = 10 - 7 - 0 - 0 - 4 = -1 → cancel 1 hold
    const response = await app.inject()
      .patch(`/api/facilities/${FACILITY_ID}/bed-types/${BED_TYPE_ID}`)
      .headers(adminHeaders)
      .payload({
        unavailableUnoccupied: 7,
        unavailableReason: 'SFSD_STAFFING',
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const sentMail = nodemailerMock.mock.getSentMail();
    assert.ok(sentMail.length > 0, 'Expected cancellation email from capacity squeeze');
    const email = sentMail[sentMail.length - 1];
    assert.ok(email.text.includes('cancelled'));
  });
});
