import { Prisma, BedType, FacilityUpdateMethod } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const BedStatusCreateSchema = z.object({
  facilityId: z.string().uuid(),
  type: z.enum(Object.values(BedType)),
  capacity: z.number().int().min(0),
  unavailableUnoccupied: z.number().int().min(0),
  unavailableOccupied: z.number().int().min(0),
});

const BedStatusUpdateSchema = z.object({
  type: z.enum(Object.values(BedType)).optional(),
  capacity: z.number().int().min(0).optional(),
  unavailableUnoccupied: z.number().int().min(0).optional(),
  unavailableOccupied: z.number().int().min(0).optional(),
  updateNotes: z.string().nullable().optional(),
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
  static UpdateSchema = BedStatusUpdateSchema;
  static ResponseSchema = BedStatusResponseSchema;

  static UpdateMethod = FacilityUpdateMethod;

  constructor (data) {
    super(Prisma.BedStatusScalarFieldEnum, data);
  }
}

export default BedStatus;
