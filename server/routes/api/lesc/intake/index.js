import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create an intake record (placeholder implementation)',
        body: z.object({
          holdId: z.string().uuid().optional(),
          fullName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          sex: z.string().optional(),
          race: z.string().optional(),
          personallyIdentifiable: z.string().optional(),
          middleInitial: z.string().optional(),
          address: z.string().optional(),
          driverLicense: z.string().optional(),
          localId: z.string().optional(),
          observedBehavior: z.string().optional(),
          observationDetails: z.string().optional(),
          faceNormal: z.string().optional(),
          speechClear: z.string().optional(),
          odorOfAlcohol: z.string().optional(),
          medicalClearance: z.string().optional(),
          itemsTracked: z.string().optional(),
          arrestType: z.string().optional(),
          cadNumber: z.string().optional(),
          officerId: z.string().optional(),
          locationOfArrest: z.string().optional(),
          timeOfArrest: z.string().optional(),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            message: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const {
        holdId,
        fullName,
        dateOfBirth,
        sex,
        race,
        personallyIdentifiable,
        middleInitial,
        address,
        driverLicense,
        localId,
      } = request.body;

      // Parse full name into first and last name
      const nameParts = fullName ? fullName.trim().split(/\s+/) : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      // Parse date of birth string to DateTime
      const dob = dateOfBirth ? new Date(dateOfBirth) : null;

      // Create Client record
      const client = await fastify.prisma.client.create({
        data: {
          firstName,
          lastName,
          middleInitial,
          dateOfBirth: dob,
          sex,
          race,
          address,
          driverLicense,
          localId,
          personallyIdentifiable,
        },
      });

      // Link client to hold if holdId is provided
      if (holdId) {
        await fastify.prisma.bedHold.update({
          where: { id: holdId },
          data: { clientId: client.id },
        });
      }

      return reply.code(StatusCodes.CREATED).send({
        id: client.id,
        message: 'Client record created',
      });
    }
  );

  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List intake records (placeholder implementation)',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            holdId: z.string().uuid().optional(),
            createdAt: z.string(),
          })),
        },
      },
    },
    async function (request, reply) {
      // Placeholder implementation - would fetch from database
      return reply.send([]);
    }
  );

  fastify.get('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get intake record by ID (placeholder implementation)',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            holdId: z.string().uuid().optional(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      // Placeholder implementation - would fetch from database
      return reply.send({
        id: request.params.id,
        createdAt: new Date().toISOString(),
      });
    }
  );
}
