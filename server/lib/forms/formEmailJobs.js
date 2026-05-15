import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export async function queueReleaseFormsEmail (fastify, { deflectionId, userId }) {
  // 5150 is included unconditionally; the worker silently skips it for
  // releases that aren't behavioral-health-evaluation (issue #875).
  await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
    deflectionId,
    userId,
    formIds: ['647f', '849b', 'cert', '5150'],
    emailTemplate: 'release-forms',
  });
}

export async function queue849bIncidentEmail (fastify, { deflectionId, userId, recipientEmail }) {
  await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
    deflectionId,
    userId,
    formIds: ['849b'],
    emailTemplate: 'incident-forms',
    recipientEmail,
  });
}

export async function queue5150SelfEmail (fastify, { deflectionId, userId, recipientEmail }) {
  await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
    deflectionId,
    userId,
    formIds: ['5150'],
    emailTemplate: 'self-5150',
    recipientEmail,
  });
}
