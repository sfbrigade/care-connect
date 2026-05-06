import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export async function queueReleaseFormsEmail (fastify, { deflectionId, userId }) {
  await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
    deflectionId,
    userId,
    formIds: ['647f', '849b', 'cert'],
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
