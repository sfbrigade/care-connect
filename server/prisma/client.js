import prismaPkg from '@prisma/client';
import { v4 as uuid } from 'uuid';

import Deflection from '#models/deflection.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { PII_FIELDS } from '#models/subject.js';
import { exitedVisibilityCutoff } from '#lib/retention.js';
import User from '#models/user.js';
const { Prisma, PrismaClient } = prismaPkg;

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
}).$extends({
  name: 'paginate',
  model: {
    facility: {
      async findByIdForUpdate (tx, id) {
        const result = await tx.$queryRaw`SELECT * FROM "Facility" WHERE "id" = ${id}::uuid FOR NO KEY UPDATE`;
        return result.length > 0 ? result[0] : null;
      }
    },
    bedType: {
      async findByIdForUpdate (tx, id) {
        let result;
        if (Array.isArray(id)) {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ANY(${id}::uuid[]) FOR NO KEY UPDATE`;
          return result;
        } else {
          result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ${id}::uuid FOR NO KEY UPDATE`;
          return result.length > 0 ? result[0] : null;
        }
      }
    },
    deflection: {
      async findByIdForUpdate (tx, id) {
        let result;
        if (Array.isArray(id)) {
          result = await tx.$queryRaw`SELECT * FROM "Deflection" WHERE "id" = ANY(${id}::int[]) ORDER BY "id" FOR NO KEY UPDATE`;
          return result;
        }
        result = await tx.$queryRaw`SELECT * FROM "Deflection" WHERE "id" = ${id} FOR NO KEY UPDATE`;
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
    subject: {
      async anonymize (now = new Date()) {
        // 96h = 24h max stay at RESET + 72h post-exit visibility window
        const parsed = parseFloat(process.env.ANONYMIZE_CUTOFF_HOURS);
        const hours = Number.isFinite(parsed) ? parsed : 96;
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
        // Hold redaction until every exit's visibility window has closed;
        // never-exited subjects still fall to the createdAt backstop.
        const visibilityCutoff = exitedVisibilityCutoff(now);
        const eligible = await prisma.$queryRaw`
          SELECT s."id"
          FROM "Subject" s
          WHERE s."anonymizedAt" IS NULL
            AND s."createdAt" <= ${cutoff}
            AND NOT EXISTS (
              SELECT 1
              FROM "Deflection" d
              WHERE d."subjectId" = s."id"
                AND d."exitedAt" > ${visibilityCutoff}
            )
        `;
        if (eligible.length === 0) return;
        const ids = eligible.map((row) => row.id);

        const documents = await prisma.deflectionDocument.findMany({
          where: { deflection: { subjectId: { in: ids } }, file: { not: null } },
        });
        const photos = await prisma.propertyPhoto.findMany({
          where: { deflection: { subjectId: { in: ids } }, file: { not: null } },
        });

        await Promise.all([
          ...documents.map(async (doc) => {
            const handler = new DeflectionDocument(doc).setAsset('file', null);
            await prisma.deflectionDocument.update({ where: { id: doc.id }, data: { file: null } });
            await handler?.();
          }),
          ...photos.map(async (photo) => {
            const handler = new PropertyPhoto(photo).setAsset('file', null);
            await prisma.propertyPhoto.update({ where: { id: photo.id }, data: { file: null } });
            await handler?.();
          }),
        ]);

        const nulledPii = Object.fromEntries(PII_FIELDS.map((field) => [field, null]));
        await prisma.subject.updateMany({
          where: { id: { in: ids } },
          data: { ...nulledPii, anonymizedAt: now },
        });
      }
    },
    user: {
      async findByIdForUpdate (tx, id) {
        const result = await tx.$queryRaw`SELECT * FROM "User" WHERE "id" = ${id}::uuid FOR NO KEY UPDATE`;
        return result.length > 0 ? result[0] : null;
      },
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
