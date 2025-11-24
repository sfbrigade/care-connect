import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/feedback', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates feedback successfully with message only', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        message: 'This is a test feedback message',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.deepStrictEqual(data.message, 'This is a test feedback message');
      assert.deepStrictEqual(data.userEmail, null);
      assert.ok(data.createdAt);

      // Verify in database
      const feedback = await prisma.feedback.findUnique({
        where: { id: data.id },
      });
      assert.ok(feedback);
      assert.deepStrictEqual(feedback.message, 'This is a test feedback message');
      assert.deepStrictEqual(feedback.userEmail, null);
    });

    await t.test('creates feedback with message and email', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        message: 'Feedback with email',
        userEmail: 'test@example.com',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.deepStrictEqual(data.message, 'Feedback with email');
      assert.deepStrictEqual(data.userEmail, 'test@example.com');
      assert.ok(data.createdAt);

      // Verify in database
      const feedback = await prisma.feedback.findUnique({
        where: { id: data.id },
      });
      assert.ok(feedback);
      assert.deepStrictEqual(feedback.userEmail, 'test@example.com');
    });

    await t.test('captures user agent from headers', async () => {
      const userAgent = 'Mozilla/5.0 (Test Browser)';
      const response = await app.inject().post('/api/feedback').payload({
        message: 'Feedback with user agent',
      }).headers({
        'user-agent': userAgent,
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.userAgent, userAgent);

      // Verify in database
      const feedback = await prisma.feedback.findUnique({
        where: { id: data.id },
      });
      assert.deepStrictEqual(feedback.userAgent, userAgent);
    });

    await t.test('handles user agent header', async () => {
      // Fastify inject sets a default user-agent header, so we verify it's captured
      const response = await app.inject().post('/api/feedback').payload({
        message: 'Feedback with user agent',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      // User agent should be captured (Fastify inject sets a default)
      assert.ok(data.userAgent !== null && data.userAgent !== undefined);
    });

    await t.test('validates message is required', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        userEmail: 'test@example.com',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('validates message is not empty', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        message: '',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('validates email format when provided', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        message: 'Feedback with invalid email',
        userEmail: 'not-an-email',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('allows null email when email is not provided', async () => {
      const response = await app.inject().post('/api/feedback').payload({
        message: 'Feedback without email',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.userEmail, null);
    });
  });

  await t.test('GET /', async (t) => {
    await t.test('returns paginated feedback list', async () => {
      // Create some test feedback
      await prisma.feedback.createMany({
        data: [
          {
            message: 'First feedback',
            userEmail: 'user1@example.com',
          },
          {
            message: 'Second feedback',
            userEmail: 'user2@example.com',
          },
          {
            message: 'Third feedback',
          },
        ],
      });

      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.ok(data.data);
      assert.ok(data.pagination);
      assert.ok(Array.isArray(data.data));
      assert.deepStrictEqual(data.pagination.perPage, 20);
      assert.deepStrictEqual(data.pagination.page, 1);
      assert.ok(data.pagination.total >= 3);
      assert.ok(data.pagination.lastPage >= 1);
    });

    await t.test('returns feedback ordered by createdAt descending', async () => {
      // Create feedback with slight delays to ensure different timestamps
      const feedback1 = await prisma.feedback.create({
        data: {
          message: 'Oldest feedback',
        },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      const feedback2 = await prisma.feedback.create({
        data: {
          message: 'Middle feedback',
        },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      const feedback3 = await prisma.feedback.create({
        data: {
          message: 'Newest feedback',
        },
      });

      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const feedbackIds = data.data.map(item => item.id);
      // Should be ordered newest first
      assert.deepStrictEqual(feedbackIds[0], feedback3.id);
      assert.deepStrictEqual(feedbackIds[1], feedback2.id);
      assert.ok(feedbackIds.includes(feedback1.id));
    });

    await t.test('supports pagination with page parameter', async () => {
      // Create more than 20 feedback entries
      await prisma.feedback.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          message: `Feedback ${i + 1}`,
        })),
      });

      // Get first page
      const response1 = await app.inject().get('/api/feedback?page=1').headers(userHeaders);
      assert.deepStrictEqual(response1.statusCode, StatusCodes.OK);
      const data1 = JSON.parse(response1.body);
      assert.deepStrictEqual(data1.pagination.page, 1);
      assert.deepStrictEqual(data1.data.length, 20);

      // Get second page
      const response2 = await app.inject().get('/api/feedback?page=2').headers(userHeaders);
      assert.deepStrictEqual(response2.statusCode, StatusCodes.OK);
      const data2 = JSON.parse(response2.body);
      assert.deepStrictEqual(data2.pagination.page, 2);
      assert.ok(data2.data.length > 0);

      // Verify no overlap
      const ids1 = new Set(data1.data.map(item => item.id));
      const ids2 = new Set(data2.data.map(item => item.id));
      const intersection = [...ids1].filter(id => ids2.has(id));
      assert.deepStrictEqual(intersection.length, 0, 'Pages should not have overlapping entries');
    });

    await t.test('defaults to page 1 when page not specified', async () => {
      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.pagination.page, 1);
    });

    await t.test('returns empty array when no feedback exists', async () => {
      // Ensure no feedback exists (database is reset between tests)
      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.data, []);
      assert.deepStrictEqual(data.pagination.total, 0);
      assert.deepStrictEqual(data.pagination.lastPage, 0);
    });

    await t.test('calculates lastPage correctly', async () => {
      // Create exactly 20 feedback entries (1 page)
      await prisma.feedback.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
          message: `Feedback ${i + 1}`,
        })),
      });

      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.pagination.total, 20);
      assert.deepStrictEqual(data.pagination.lastPage, 1);
    });

    await t.test('validates page parameter is positive', async () => {
      const response = await app.inject().get('/api/feedback?page=0').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('validates page parameter is an integer', async () => {
      const response = await app.inject().get('/api/feedback?page=1.5').headers(userHeaders);

      // Zod coerce.number().int() validates that the number is an integer, so 1.5 fails validation
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('includes all feedback fields in response', async () => {
      const feedback = await prisma.feedback.create({
        data: {
          message: 'Complete feedback',
          userEmail: 'test@example.com',
          userAgent: 'Test Agent',
        },
      });

      const response = await app.inject().get('/api/feedback').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const foundFeedback = data.data.find(item => item.id === feedback.id);
      assert.ok(foundFeedback);
      assert.deepStrictEqual(foundFeedback.id, feedback.id);
      assert.deepStrictEqual(foundFeedback.message, 'Complete feedback');
      assert.deepStrictEqual(foundFeedback.userEmail, 'test@example.com');
      assert.deepStrictEqual(foundFeedback.userAgent, 'Test Agent');
      assert.ok(foundFeedback.createdAt);
    });
  });
});
