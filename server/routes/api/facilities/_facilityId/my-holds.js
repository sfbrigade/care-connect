import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import Incident from '#models/incident.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { isIncidentDetailsComplete, isDeflectionDetailsComplete } from '#lib/incidentPermissions.js';
import { redactDeflectionsForUser } from '#lib/deflectionVisibility.js';

const PRE_TRANSFER_STATUSES = ['DETAINED', 'ONSITE_AWAITING_TRANSFER'];

const IncidentWithPermissionsSchema = Incident.ResponseSchema.extend({
  canEdit: z.boolean(),
  canHandoff: z.boolean(),
  deflections: z.array(Deflection.ResponseSchema),
});

const MyHoldsResponseSchema = z.object({
  atFacility: z.boolean(),
  arrivedAt: z.coerce.date().nullable(),
  canArrive: z.boolean(),
  canLeave: z.boolean(),
  canExtend: z.boolean(),
  canCreateHold: z.boolean(),
  activeIncidentId: z.number().nullable(),
  incidents: z.array(IncidentWithPermissionsSchema),
});

export default async function (fastify) {
  fastify.get('/my-holds',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get the calling officer\'s active holds grouped by incident, with permissions.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: MyHoldsResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;
      const officerId = request.user.id;

      await fastify.prisma.deflection.expire();

      // Main query: all pre-transfer holds this officer controls at this facility
      const deflections = await fastify.prisma.deflection.findMany({
        where: {
          facilityId,
          currentOfficerId: officerId,
          status: 'ACTIVE',
          subjectStatus: { in: PRE_TRANSFER_STATUSES },
        },
        include: {
          incident: {
            include: {
              createdBy: true,
              createdByOrganization: true,
              createdByTitle: true,
              createdByUnit: true,
            },
          },
          subject: true,
          createdBy: true,
          cancelReason: true,
          releaseReason: true,
          refusalReason: true,
          propertyPhotos: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Presence: the most recent FacilityCheckIn for this (officer, facility)
      // is the source of truth. ARRIVAL → at facility; DEPARTURE (or no rows) → not.
      // ARRIVAL and DEPARTURE rows strictly alternate for a given user+facility.
      const lastCheckIn = await fastify.prisma.facilityCheckIn.findFirst({
        where: { userId: officerId, facilityId },
        orderBy: { timestamp: 'desc' },
      });
      const atFacility = lastCheckIn?.eventType === 'ARRIVAL';
      const arrivedAt = atFacility ? lastCheckIn.timestamp : null;

      // Group deflections by incident
      const incidentMap = new Map();
      for (const deflection of deflections) {
        const incident = deflection.incident;
        if (!incidentMap.has(incident.id)) {
          incidentMap.set(incident.id, {
            incident,
            deflections: [],
          });
        }
        // Remove the nested incident from the deflection response to avoid duplication
        const { incident: _, ...deflectionWithoutIncident } = deflection;
        deflectionWithoutIncident.propertyPhotos = (deflectionWithoutIncident.propertyPhotos ?? []).map(
          photo => new PropertyPhoto(photo)
        );
        incidentMap.get(incident.id).deflections.push(deflectionWithoutIncident);
      }

      // Build response incidents with permissions
      const hasPreTransferHolds = deflections.length > 0;
      const hasDETAINEDHolds = deflections.some(d => d.subjectStatus === 'DETAINED');
      const allPreTransferDetailsComplete = deflections.every(deflection => (
        isIncidentDetailsComplete(deflection.incident) && isDeflectionDetailsComplete(deflection)
      ));

      let activeIncidentId = null;
      const incidents = [];

      for (const [, { incident, deflections: incidentDeflections }] of incidentMap) {
        const isCreator = incident.createdById === officerId;
        const canHandoff = incidentDeflections.length > 0 &&
          isIncidentDetailsComplete(incident) &&
          incidentDeflections.every(deflection => isDeflectionDetailsComplete(deflection));

        if (isCreator && activeIncidentId === null) {
          activeIncidentId = incident.id;
        }

        incidents.push({
          ...incident,
          canEdit: isCreator,
          canHandoff,
          deflections: redactDeflectionsForUser(incidentDeflections, request.user),
        });
      }

      return reply.send({
        atFacility,
        arrivedAt,
        canArrive: hasPreTransferHolds && allPreTransferDetailsComplete && !atFacility,
        canLeave: atFacility && !hasPreTransferHolds,
        canExtend: hasDETAINEDHolds,
        canCreateHold: !atFacility,
        activeIncidentId,
        incidents,
      });
    });
}
