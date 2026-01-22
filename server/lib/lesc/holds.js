import Deflection from '#models/deflection.js';

/**
 * Auto-expire holds that have passed their expiration time
 * Updates holds with status ACTIVE or EXTENDED that have expired to EXPIRED
 * @param {object} prisma - Prisma client instance
 * @param {Date} [now] - Current date/time (defaults to new Date())
 * @returns {Promise<number>} - Number of holds expired
 */
export async function autoExpireHolds (prisma, user, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const deflections = await tx.deflection.findMany({
      where: {
        status: Deflection.HoldStatus.ACTIVE,
        expiresAt: {
          lte: now,
        },
      },
    });
    const bedCountsByType = deflections.reduce((counts, deflection) => {
      counts[deflection.bedTypeId] = (counts[deflection.bedTypeId] || 0) + 1;
      return counts;
    }, {});
    const bedTypes = await tx.bedType.findByIdForUpdate(tx, deflections.map((deflection) => deflection.bedTypeId));
    const deflectionUpdates = deflections.map((deflection) => ({
      deflectionId: deflection.id,
      status: Deflection.HoldStatus.EXPIRED,
      updatedById: user.id,
      updatedAt: now,
    }));
    await tx.deflectionUpdate.createMany({
      data: deflectionUpdates,
    });
    await tx.deflection.updateMany({
      where: {
        id: {
          in: deflections.map((deflection) => deflection.id),
        },
      },
      data: {
        status: Deflection.HoldStatus.EXPIRED,
        updatedAt: now,
      },
    });
    const bedTypeUpdates = bedTypes.map((bedType) => ({
      bedTypeId: bedType.id,
      facilityId: bedType.facilityId,
      capacity: bedType.capacity,
      unavailableUnoccupied: bedType.unavailableUnoccupied,
      unavailableOccupied: bedType.unavailableOccupied,
      occupied: bedType.occupied,
      holds: bedType.holds - bedCountsByType[bedType.id],
      available: bedType.available + bedCountsByType[bedType.id],
      updateMethod: 'API',
      updatedById: user.id,
    }));
    await tx.bedTypeUpdate.createMany({
      data: bedTypeUpdates,
    });
    await Promise.all(bedTypeUpdates.map((bedTypeUpdate) => tx.bedType.update({
      where: {
        id: bedTypeUpdate.bedTypeId,
      },
      data: {
        capacity: bedTypeUpdate.capacity,
        unavailableUnoccupied: bedTypeUpdate.unavailableUnoccupied,
        unavailableOccupied: bedTypeUpdate.unavailableOccupied,
        occupied: bedTypeUpdate.occupied,
        holds: bedTypeUpdate.holds,
        available: bedTypeUpdate.available,
        updateMethod: bedTypeUpdate.updateMethod,
        updatedById: bedTypeUpdate.updatedById,
      },
    })));
  });
}
