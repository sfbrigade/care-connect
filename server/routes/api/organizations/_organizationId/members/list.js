import { User } from '#models/user.js';

export default async function (fastify) {
  fastify.get(
    '/',
    {
      onRequest: fastify.requireRole('ORG_ADMIN'),
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      // Org-scoping: non-super-admins can only access their own org
      if (!request.user.isAdmin && request.user.organizationId !== organizationId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Fetch pending invites (not accepted, not revoked, not expired)
      const invites = await fastify.prisma.invite.findMany({
        where: {
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      // Fetch active users (not deactivated, not deleted)
      const activeUsers = await fastify.prisma.user.findMany({
        where: {
          organizationId,
          deactivatedAt: null,
          deletedAt: null,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      // Fetch disabled users (deactivated but not deleted)
      const disabledUsers = await fastify.prisma.user.findMany({
        where: {
          organizationId,
          deactivatedAt: { not: null },
          deletedAt: null,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      return {
        invited: invites.map((invite) => ({
          id: invite.id,
          type: 'invite',
          firstName: invite.firstName,
          lastName: invite.lastName,
          email: invite.email,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        })),
        active: activeUsers.map((u) => {
          const user = new User(u);
          return {
            id: user.id,
            type: 'user',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            roles: user.roles,
            isCurrentUser: user.id === request.user.id,
          };
        }),
        disabled: disabledUsers.map((u) => {
          const user = new User(u);
          return {
            id: user.id,
            type: 'user',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            roles: user.roles,
            deactivatedAt: user.deactivatedAt,
          };
        }),
      };
    }
  );
}
