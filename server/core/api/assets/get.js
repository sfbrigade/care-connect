import s3 from '#lib/s3.js';

export default async function (fastify, opts) {
  fastify.get('/*',
    {
      schema: {
        description: 'Redirects to a signed url for the specified asset in storage',
      }
    },
    async function (request, reply) {
      const { '*': assetPath } = request.params;
      const url = await s3.getSignedAssetUrl(assetPath, 900);
      reply.header('Cache-Control', 'public, max-age=845');
      reply.redirect(url);
    });
}
