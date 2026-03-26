import { Prisma, BedTypeEnum, FacilityUpdateMethodEnum } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const BedTypeCreateSchema = z.object({
  facilityId: z.string().uuid(),
  type: z.enum(Object.values(BedTypeEnum)),
  capacity: z.number().int().min(0),
  unavailableUnoccupied: z.number().int().min(0),
  unavailableOccupied: z.number().int().min(0),
});

const BedTypeUpdateSchema = z.object({
  type: z.enum(Object.values(BedTypeEnum)).optional(),
  capacity: z.number().int().min(0).optional(),
  unavailableUnoccupied: z.number().int().min(0).optional(),
  unavailableOccupied: z.number().int().min(0).optional(),
  unavailableReasonId: z.string().uuid().nullable().optional(),
  unavailableOther: z.string().nullable().optional(),
  updateNotes: z.string().nullable().optional(),
});

const BedTypeResponseSchema = BedTypeCreateSchema.extend({
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
  unavailableReasonId: z.string().uuid().nullable().optional(),
  unavailableOther: z.string().nullable().optional(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethodEnum)),
  updateNotes: z.string().nullable().optional(),
});

export class BedType extends Base {
  static CreateSchema = BedTypeCreateSchema;
  static UpdateSchema = BedTypeUpdateSchema;
  static ResponseSchema = BedTypeResponseSchema;

  static UpdateMethod = FacilityUpdateMethodEnum;

  constructor (data) {
    super(Prisma.BedTypeScalarFieldEnum, data);
  }
}

export default BedType;
