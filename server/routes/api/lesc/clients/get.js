import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get client by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const client = await fastify.prisma.client.findUnique({
        where: { id },
      });

      if (!client) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Client not found' });
      }

      const response = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        middleInitial: client.middleInitial,
        dateOfBirth: client.dateOfBirth?.toISOString() || null,
        sex: client.sex,
        race: client.race,
        address: client.address,
        driverLicense: client.driverLicense,
        localId: client.localId,
        personallyIdentifiable: client.personallyIdentifiable,
        description: client.description,
        pets: client.pets,
        qualifications: client.qualifications,
        notes: client.notes,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      };

      reply.code(StatusCodes.OK);
      reply.type('application/json');
      reply.raw.end(JSON.stringify(response));
      return reply;
    });
}
