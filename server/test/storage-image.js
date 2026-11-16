import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenericContainer } from 'testcontainers';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Returns an unstarted GenericContainer for the compose `storage` service.
 *
 * MinIO no longer publishes images to a registry, so the service is built from
 * docker/minio/Dockerfile. When the compose service has a `build` entry we build
 * (and tag) that image here — Docker's layer cache makes repeat builds instant —
 * otherwise we fall back to pulling `image` as before.
 */
export async function createStorageContainer (service) {
  if (!service.build) {
    return new GenericContainer(service.image);
  }
  const context = typeof service.build === 'string' ? service.build : service.build.context;
  const dockerfile = (typeof service.build === 'object' && service.build.dockerfile) || 'Dockerfile';
  return GenericContainer
    .fromDockerfile(path.resolve(REPO_ROOT, context), dockerfile)
    .build(service.image, { deleteOnExit: false });
}
