import * as z from 'zod/mini';

const IncidentSchema = z.object({
  addressLine1: z.string().check(z.minLength(2)),
  addressLine2: z.optional(z.nullable(z.string())),
  city: z.string().check(z.minLength(2)),
  state: z.string().check(z.minLength(2)),
  arrestedAt: z.iso.datetime(),
  cadNumber: z.string().check(z.minLength(2)),
  supervisorBadgeNumber: z.string().check(z.length(4)),
});

export const isValidIncident = function (obj) {
  return !!IncidentSchema.safeParse(obj)?.success;
};
