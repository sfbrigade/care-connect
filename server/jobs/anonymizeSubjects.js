import prisma from '#prisma/client.js';

export default async function anonymizeSubjects (data, prismaClient = prisma) {
  await prismaClient.subject.anonymize();
}
