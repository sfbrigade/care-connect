import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
}).$extends({
  name: 'paginate',
  model: {
    bedType: {
      async findByIdForUpdate (tx, id) {
        const result = await tx.$queryRaw`SELECT * FROM "BedType" WHERE "id" = ${id}::uuid FOR UPDATE`;
        return result.length > 0 ? result[0] : null;
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
