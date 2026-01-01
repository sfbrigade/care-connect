import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const IncidentAttributesSchema = z.object({
  cadNumber: z.string(),
  locationArrested: z.string().nullable(),
  dateTimeArrested: z.coerce.date(),
  charge: z.string(),
  unit: z.string().nullable(),
  badgeNumber: z.string().nullable(),
  agency: z.string().nullable(),
});

const IncidentResponseSchema = IncidentAttributesSchema.extend({
  id: z.string().uuid(),
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const IncidentUpdateSchema = IncidentAttributesSchema.partial();

export class Incident extends Base {
  static ResponseSchema = IncidentResponseSchema;
  static UpdateSchema = IncidentUpdateSchema;

  constructor (data) {
    super(Prisma.IncidentScalarFieldEnum, data);
  }
}

export default Incident;
