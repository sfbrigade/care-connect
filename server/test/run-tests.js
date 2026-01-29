import { GenericContainer } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTAINER_INFO_PATH = '/tmp/care-connect-test-containers.json';

async function main () {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';

  const compose = YAML.parse(await fs.readFile(path.join(__dirname, '../..', 'compose.yml'), 'utf8'));

  console.log('Starting shared Postgres container...');
  let dbContainer = new PostgreSqlContainer(compose.services.db.image);
  if (!process.env.CI) {
    dbContainer = dbContainer.withNetworkMode('care-connect');
  }
  const startedDb = await dbContainer.start();

  console.log('Starting shared MinIO container...');
  let storageContainer = new GenericContainer(compose.services.storage.image)
    .withEntrypoint(['minio', 'server', '/data'])
    .withExposedPorts(9000);
  if (!process.env.CI) {
    storageContainer = storageContainer.withNetworkMode('care-connect');
  }
  const startedStorage = await storageContainer.start();

  const containerInfo = {
    db: {
      host: startedDb.getHost(),
      port: startedDb.getPort(),
      username: startedDb.getUsername(),
      password: startedDb.getPassword(),
      database: startedDb.getDatabase(),
    },
    storage: {
      host: startedStorage.getHost(),
      port: startedStorage.getMappedPort(9000),
    },
  };

  await fs.writeFile(CONTAINER_INFO_PATH, JSON.stringify(containerInfo));
  console.log('Containers ready. Running tests...');

  // Find test files recursively
  const testFiles = [];
  async function findTestFiles (dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await findTestFiles(fullPath);
      } else if (entry.name.endsWith('.test.js')) {
        testFiles.push(path.relative(path.join(__dirname, '..'), fullPath));
      }
    }
  }
  await findTestFiles(path.join(__dirname));

  // Forward any extra CLI args (e.g. --test-concurrency 8)
  const extraArgs = process.argv.slice(2);

  const child = spawn('node', ['--test', ...extraArgs, ...testFiles], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      CARE_CONNECT_TEST_CONTAINERS: CONTAINER_INFO_PATH,
    },
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  console.log('Stopping containers...');
  await startedStorage.stop();
  await startedDb.stop();

  try {
    await fs.unlink(CONTAINER_INFO_PATH);
  } catch {
    // ignore
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
