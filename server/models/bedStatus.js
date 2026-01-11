import { Prisma, BedType, FacilityUpdateMethod } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const BedStatusCreateSchema = z.object({
  facilityId: z.string().uuid(),
  capacity: z.number(),
  unavailableUnoccupied: z.number(),
  unavailableOccupied: z.number(),
  type: z.enum(Object.values(BedType)),
});

const BedStatusResponseSchema = BedStatusCreateSchema.extend({
  id: z.string().uuid(),
  occupied: z.number(),
  holds: z.number(),
  available: z.number(),
  createdAt: z.coerce.date(),
  createdBy: User.ResponseSchema.optional(),
  createdById: z.string().uuid(),
  updatedAt: z.coerce.date(),
  updatedBy: User.ResponseSchema.optional(),
  updatedById: z.string().uuid(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethod)),
  updateNotes: z.string().nullable().optional(),
});

export class BedStatus extends Base {
  static CreateSchema = BedStatusCreateSchema;
  static ResponseSchema = BedStatusResponseSchema;

  constructor (data) {
    super(Prisma.BedStatusScalarFieldEnum, data);
  }
}

export default BedStatus;
