export default async function (fastify, opts) {
  fastify.delete('/logout',
    {
      schema: {
        description: 'Logs out the current user by deleting the current session.'
      }
    },
    async function (request, reply) {
      request.session.delete();
      return reply.send();
    });
}
