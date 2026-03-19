import prisma from '#prisma/client.js';
import Invite from '#models/invite.js';
import Facility from '#models/facility.js';

export default async function inviteEmail (data, prismaClient = prisma) {
  const { inviteId, facilityId } = data;

  const inviteData = await prismaClient.invite.findUniqueOrThrow({
    where: { id: inviteId },
  });
  const invite = new Invite(inviteData);

  let facility = null;
  if (facilityId) {
    const facilityData = await prismaClient.facility.findUniqueOrThrow({
      where: { id: facilityId },
    });
    facility = new Facility(facilityData);
  }

  await invite.sendInviteEmail(facility);

  // Update db invite with updatedAt
  await prismaClient.invite.update({
    where: { id: inviteId },
    data: { updatedAt: new Date() },
  });
}
