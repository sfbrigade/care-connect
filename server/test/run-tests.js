import { GenericContainer, Wait } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTAINER_INFO_PATH = '/tmp/care-connect-test-containers.json';
const POSTGRES_PORT = 5432;
const MINIO_PORT = 9000;
const TEST_CONTAINER_STARTUP_TIMEOUT_MS = Number(process.env.TESTCONTAINERS_STARTUP_TIMEOUT_MS ?? 120_000);

function testContainerAlias (prefix) {
  return `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function startSharedDbContainer (image, networkMode) {
  if (!networkMode) {
    const started = await new PostgreSqlContainer(image)
      .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
      .start();
    return {
      stop: () => started.stop(),
      info: {
        host: started.getHost(),
        port: started.getPort(),
        username: started.getUsername(),
        password: started.getPassword(),
        database: started.getDatabase(),
      },
    };
  }

  const networkAlias = testContainerAlias('care-connect-test-db');
  const started = await new GenericContainer(image)
    .withEnvironment({
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withHealthCheck({
      test: [
        'CMD-SHELL',
        'PGPASSWORD=test pg_isready --host localhost --username test --dbname test',
      ],
      interval: 250,
      timeout: 1000,
      retries: 1000,
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
    .withNetworkMode(networkMode)
    .withNetworkAliases(networkAlias)
    .start();
  return {
    stop: () => started.stop(),
    info: {
      host: networkAlias,
      port: POSTGRES_PORT,
      username: 'test',
      password: 'test',
      database: 'test',
    },
  };
}

async function startSharedStorageContainer (image, networkMode) {
  if (!networkMode) {
    const started = await new GenericContainer(image)
      .withEntrypoint(['minio', 'server', '/data'])
      .withExposedPorts(MINIO_PORT)
      .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
      .start();
    return {
      stop: () => started.stop(),
      info: {
        host: started.getHost(),
        port: started.getMappedPort(MINIO_PORT),
      },
    };
  }

  const networkAlias = testContainerAlias('care-connect-test-storage');
  const started = await new GenericContainer(image)
    .withEntrypoint(['minio', 'server', '/data'])
    .withWaitStrategy(Wait.forLogMessage('API:'))
    .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
    .withNetworkMode(networkMode)
    .withNetworkAliases(networkAlias)
    .start();
  return {
    stop: () => started.stop(),
    info: {
      host: networkAlias,
      port: MINIO_PORT,
    },
  };
}

async function main () {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  const networkMode = process.env.TESTCONTAINERS_NETWORK_MODE;

  const compose = YAML.parse(await fs.readFile(path.join(__dirname, '../..', 'compose.yml'), 'utf8'));

  console.log('Starting shared Postgres container...');
  const db = await startSharedDbContainer(compose.services.db.image, networkMode);

  console.log('Starting shared MinIO container...');
  const storage = await startSharedStorageContainer(compose.services.storage.image, networkMode);

  const containerInfo = { db: db.info, storage: storage.info };
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

  // Forward any extra CLI args (e.g. --test-concurrency 8, --experimental-test-module-mocks)
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
  await storage.stop();
  await db.stop();

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
