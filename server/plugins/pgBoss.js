import fp from 'fastify-plugin';

import { createBoss } from '#lib/pgBoss.js';

export default fp(async function (fastify) {
  if (process.env.PGBOSS_ENABLED === 'false') {
    fastify.decorate('jobs', {
      async send () {},
    });
    return;
  }

  const boss = createBoss();
  await boss.start();

  fastify.decorate('jobs', {
    async send (name, data, options) {
      return boss.send(name, data, options);
    },
  });

  fastify.addHook('onClose', async () => {
    await boss.stop();
  });
});
