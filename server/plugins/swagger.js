import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import {
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransform,
  fastifyZodOpenApiTransformObject,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-zod-openapi';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = await fs.readFile(path.resolve(__dirname, '../../package.json'), {
  encoding: 'utf8',
});
const { version } = JSON.parse(pkg);

/**
 * This adds Swagger support to our API endpoints for generating documentation.
 */
export default fp(async (fastify) => {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  await fastify.register(fastifyZodOpenApiPlugin);
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Care Connect API',
        version,
      },
      servers: [
        {
          url: process.env.BASE_URL,
        },
      ],
    },
    transform: fastifyZodOpenApiTransform,
    transformObject: fastifyZodOpenApiTransformObject,
  });
  await fastify.register(scalar, {
    routePrefix: '/api/reference',
  });
});
