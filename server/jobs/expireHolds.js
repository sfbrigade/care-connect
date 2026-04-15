import prisma from '#prisma/client.js';

export default async function expireHolds (data, prismaClient = prisma) {
  await prismaClient.deflection.expire();
  await prismaClient.incident.autoCloseAfterFinalHold();
}
