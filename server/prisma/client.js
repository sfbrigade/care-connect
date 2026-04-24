import { Prisma, PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
}).$extends({
  name: 'paginate',
  model: {
    facility: {
      async findByIdForUpdate (tx, id) {
        const result = await tx.$queryRaw`SELECT * FROM "Facility" WHERE "id" = ${id}::uuid FOR UPDATE`;
        return result.length > 0 ? result[0] : null;
      }
    },
    bedType: {
      async findByIdForUpdate (tx, id) {
        let result;
        if (Array.isArray(id)) {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ANY(${id}::uuid[]) FOR UPDATE`;
          return result;
        } else {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ${id}::uuid FOR UPDATE`;
          return result.length > 0 ? result[0] : null;
        }
      }
    },
    deflection: {
      async findByIdForUpdate (tx, id) {
        const result = await tx.$queryRaw`SELECT * FROM "Deflection" WHERE "id" = ${id} FOR UPDATE`;
        return result.length > 0 ? result[0] : null;
      },
      async expire (now = new Date()) {
        try {
          await prisma.user.findOrCreateBatchUser();
        } catch {
          // noop- can throw error if multiple processes calling at the same time
        }
        const bedTypeIds = (await prisma.deflection.findMany({
          distinct: ['bedTypeId'],
          select: {
            bedTypeId: true,
          },
          where: {
            status: Deflection.HoldStatus.ACTIVE,
            subjectStatus: Deflection.SubjectStatus.DETAINED,
            expiresAt: {
              lte: now,
            },
          },
        })).map((deflection) => deflection.bedTypeId);
        return Promise.all(bedTypeIds.map((bedTypeId) => {
          return prisma.$transaction(async (tx) => {
            const bedType = await tx.bedType.findByIdForUpdate(tx, bedTypeId);
            const deflections = await tx.deflection.findMany({
              where: {
                bedTypeId,
                status: Deflection.HoldStatus.ACTIVE,
                subjectStatus: Deflection.SubjectStatus.DETAINED,
                expiresAt: {
                  lte: now,
                },
              },
            });
            const deflectionUpdates = deflections.map((deflection) => ({
              deflectionId: deflection.id,
              status: Deflection.HoldStatus.EXPIRED,
              updatedById: User.BATCH_USER_ID,
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

            // Auto-expired deflections are always DETAINED (in transit)
            const bedTypeUpdate = await tx.bedTypeUpdate.create({
              data: {
                bedTypeId: bedType.id,
                facilityId: bedType.facilityId,
                capacity: bedType.capacity,
                unavailableUnoccupied: bedType.unavailableUnoccupied,
                unavailableOccupied: bedType.unavailableOccupied,
                occupied: bedType.occupied,
                holds: bedType.holds - deflections.length,
                inTransit: Math.max(0, bedType.inTransit - deflections.length),
                available: bedType.available + deflections.length,
                updateMethod: 'API',
                updatedById: User.BATCH_USER_ID,
              },
            });
            await tx.bedType.update({
              where: {
                id: bedType.id,
              },
              data: {
                capacity: bedTypeUpdate.capacity,
                unavailableUnoccupied: bedTypeUpdate.unavailableUnoccupied,
                unavailableOccupied: bedTypeUpdate.unavailableOccupied,
                occupied: bedTypeUpdate.occupied,
                holds: bedTypeUpdate.holds,
                inTransit: bedTypeUpdate.inTransit,
                available: bedTypeUpdate.available,
                updateMethod: bedTypeUpdate.updateMethod,
                updatedById: bedTypeUpdate.updatedById,
              },
            });
          });
        }));
      }
    },
    user: {
      async findOrCreateBatchUser () {
        let data = await prisma.user.findUnique({
          where: { id: User.BATCH_USER_ID },
        });
        if (!data) {
          data = {
            id: User.BATCH_USER_ID,
            firstName: 'Batch',
            lastName: 'User',
            email: 'batch.user@careconnectsf.org',
            isAdmin: false,
          };
          const user = new User(data);
          await user.setPassword(uuid());
          data = await prisma.user.create({
            data,
          });
        }
        return data;
      }
    },
    $allModels: {
      async paginate ({ page, perPage, include, ...options }) {
        const take = parseInt(perPage, 10);
        const skip = (parseInt(page, 10) - 1) * take;
        const context = Prisma.getExtensionContext(this);
        const total = await context.count(options);
        const records = await context.findMany({
          ...options,
          include,
          skip,
          take
        });
        return { records, total };
      }
    }
  }
});

export default prisma;
