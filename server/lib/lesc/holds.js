/**
 * Bed Hold utilities for LESC app
 */

/**
 * Auto-expire holds that have passed their expiration time
 * Updates holds with status ACTIVE or EXTENDED that have expired to EXPIRED
 * @param {object} prisma - Prisma client instance
 * @param {Date} [now] - Current date/time (defaults to new Date())
 * @returns {Promise<number>} - Number of holds expired
 */
export async function autoExpireHolds (prisma, now = new Date()) {
  const result = await prisma.deflection.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}
