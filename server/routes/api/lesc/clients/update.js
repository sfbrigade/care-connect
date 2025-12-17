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
          middleInitial: z.string().nullable().optional(),
          dateOfBirth: z.string().nullable().optional(),
          sex: z.string().nullable().optional(),
          race: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          driverLicense: z.string().nullable().optional(),
          localId: z.string().nullable().optional(),
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
        middleInitial,
        dateOfBirth,
        sex,
        race,
        address,
        driverLicense,
        localId,
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
      if (middleInitial !== undefined) updateData.middleInitial = middleInitial;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (sex !== undefined) updateData.sex = sex;
      if (race !== undefined) updateData.race = race;
      if (address !== undefined) updateData.address = address;
      if (driverLicense !== undefined) updateData.driverLicense = driverLicense;
      if (localId !== undefined) updateData.localId = localId;
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
      });
    });
}
