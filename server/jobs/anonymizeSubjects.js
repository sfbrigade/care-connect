import prisma from '#prisma/client.js';

export default async function anonymizeSubjects (data, prismaClient = prisma) {
  if (process.env.DISABLE_ANONYMIZE_SUBJECTS === 'true') return;
  await prismaClient.subject.anonymize();
}
