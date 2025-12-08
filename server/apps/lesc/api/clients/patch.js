import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Update client by ID',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          dateOfBirth: z.string().nullable().optional(),
          sex: z.string().nullable().optional(),
          race: z.string().nullable().optional(),
          personallyIdentifiable: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          pets: z.string().nullable().optional(),
          qualifications: z.any().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const {
        firstName,
        lastName,
        dateOfBirth,
        sex,
        race,
        personallyIdentifiable,
        description,
        pets,
        qualifications,
        notes,
      } = request.body;

      // Check if client exists
      const existingClient = await fastify.prisma.client.findUnique({
        where: { id },
      });

      if (!existingClient) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Client not found' });
      }

      // Build update data object
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (sex !== undefined) updateData.sex = sex;
      if (race !== undefined) updateData.race = race;
      if (personallyIdentifiable !== undefined) updateData.personallyIdentifiable = personallyIdentifiable;
      if (description !== undefined) updateData.description = description;
      if (pets !== undefined) updateData.pets = pets;
      if (qualifications !== undefined) updateData.qualifications = qualifications;
      if (notes !== undefined) updateData.notes = notes;

      const client = await fastify.prisma.client.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        dateOfBirth: client.dateOfBirth?.toISOString() || null,
        sex: client.sex,
        race: client.race,
        personallyIdentifiable: client.personallyIdentifiable,
        description: client.description,
        pets: client.pets,
        qualifications: client.qualifications,
        notes: client.notes,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      });
    });
}
