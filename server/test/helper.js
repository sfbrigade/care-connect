// This file contains code that we reuse
// between our tests.

import util from 'node:util';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import helper from 'fastify-cli/helper.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { StatusCodes } from 'http-status-codes';
import * as nodemailerMock from 'nodemailer-mock';

import { GenericContainer, Wait } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import {
  Builder,
  fixturesIterator,
  Loader,
  Parser,
  Resolver,
} from '@getbigger-io/prisma-fixtures-cli';
import { PrismaClient } from '@prisma/client';

import s3 from '#lib/s3.js';
import { configureMailer } from '#lib/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AppPath = path.join(__dirname, '..', 'app.js');
const POSTGRES_PORT = 5432;
const MINIO_PORT = 9000;
const TEST_CONTAINER_STARTUP_TIMEOUT_MS = Number(process.env.TESTCONTAINERS_STARTUP_TIMEOUT_MS ?? 120_000);

// Disable pg-boss in tests — the plugin will decorate a no-op stub
process.env.PGBOSS_ENABLED = 'false';

// Dependency mocks for testing
configureMailer(nodemailerMock);

// Fill in this config with all the configurations
// needed for testing the application
function config () {
  return {
    skipOverride: true // Register our application with fastify-plugin
  };
}

// Try to load shared container info written by run-tests.js
async function loadSharedContainerInfo () {
  const infoPath = process.env.CARE_CONNECT_TEST_CONTAINERS;
  if (!infoPath) return null;
  try {
    const data = await fs.readFile(infoPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// automatically build and tear down our instance
async function build (t) {
  return await buildPostgres(t);
}

async function buildPostgres (t) {
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  const compose = YAML.parse(await fs.readFile(path.join(__dirname, '../..', 'compose.yml'), 'utf8'));
  const testcontainersNetworkMode = process.env.TESTCONTAINERS_NETWORK_MODE;

  const shared = await loadSharedContainerInfo();
  let startedDbContainer;
  let startedStorageContainer;
  let dbHost, dbPort, dbUsername, dbPassword;
  let storageHost, storagePort;
  const useShared = !!shared;

  if (shared) {
    // Shared containers started once by run-tests.js — just use connection info
    dbHost = shared.db.host;
    dbPort = shared.db.port;
    dbUsername = shared.db.username;
    dbPassword = shared.db.password;
    storageHost = shared.storage.host;
    storagePort = shared.storage.port;
  } else {
    // Fallback: start per-test-file containers (original behavior)
    startedDbContainer = await startDbContainer(compose.services.db.image, testcontainersNetworkMode);
    dbHost = startedDbContainer.getHost();
    dbPort = startedDbContainer.getPort();
    dbUsername = startedDbContainer.getUsername();
    dbPassword = startedDbContainer.getPassword();

    startedStorageContainer = await startStorageContainer(compose.services.storage.image, testcontainersNetworkMode);
    storageHost = startedStorageContainer.getHost();
    storagePort = startedStorageContainer.getPort();
  }

  // Unique database per test file for isolation
  const testDbName = `test_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const adminUrl = `postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/postgres`;
  const adminPrisma = new PrismaClient({ datasourceUrl: adminUrl });
  await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
  await adminPrisma.$disconnect();

  const templateDbUrl = new URL(`postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${testDbName}`);
  templateDbUrl.searchParams.set('connection_limit', '1');
  const TEMPLATE_DATABASE_URL = templateDbUrl.toString();
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  await util.promisify(execFile)('npx', ['prisma', 'db', 'push', '--schema', schemaPath], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: TEMPLATE_DATABASE_URL,
    },
  });
  const templatePrisma = new PrismaClient({
    datasourceUrl: TEMPLATE_DATABASE_URL,
  });
  // load fixtures
  const loader = new Loader();
  const resolver = new Resolver();
  const builder = new Builder(templatePrisma, new Parser());
  loader.load(path.resolve(__dirname, 'fixtures/db'));
  const fixtures = resolver.resolve(loader.fixtureConfigs);
  for (const fixture of fixturesIterator(fixtures)) {
    await builder.build(fixture);
  }
  await templatePrisma.$disconnect();

  // Snapshot into a template db so recreateDb() can clone it fast between tests
  const templateDbName = `${testDbName}_template`;
  const adminPrisma2 = new PrismaClient({ datasourceUrl: adminUrl });
  await adminPrisma2.$executeRawUnsafe(`CREATE DATABASE "${templateDbName}" TEMPLATE "${testDbName}"`);
  await adminPrisma2.$disconnect();

  // configure test database url
  process.env.DATABASE_URL = TEMPLATE_DATABASE_URL;
  t.prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

  // set up storage
  process.env.AWS_S3_ACCESS_KEY_ID = 'minioadmin';
  process.env.AWS_S3_SECRET_ACCESS_KEY = 'minioadmin';
  process.env.AWS_S3_BUCKET = 'app';
  process.env.AWS_S3_REGION = 'us-east-1';
  process.env.AWS_S3_ENDPOINT = `http://${storageHost}:${storagePort}`;

  // Reset S3 client to ensure it uses the new environment variables
  s3.reset();

  // Wait for MinIO to be ready and verify it's initialized
  let readyRetries = 15;
  while (readyRetries > 0) {
    const isReady = await s3.checkReady();
    if (isReady) {
      // Wait a bit more to ensure MinIO is fully stable
      await sleep(500);
      break;
    }
    readyRetries--;
    await sleep(500); // Check every 500ms
  }
  if (readyRetries === 0) {
    throw new Error('MinIO server did not become ready after multiple attempts.');
  }

  // Retry creating bucket in case it doesn't exist yet
  let retries = 5;
  while (retries > 0) {
    try {
      await s3.createBucket(process.env.AWS_S3_BUCKET);
      break;
    } catch (error) {
      // Bucket might already exist, which is fine
      if (error.name === 'BucketAlreadyOwnedByYou' || error.name === 'BucketAlreadyExists') {
        break;
      }
      console.warn(`MinIO bucket creation failed, retrying... (${error.message})`);
      retries--;
      await sleep(1000); // Wait a bit before retrying
    }
  }
  if (retries === 0) {
    throw new Error('Failed to create MinIO bucket after multiple retries.');
  }

  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath];

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await helper.build(argv, config());

  // recreate the database from the template
  async function recreateDb () {
    await t.prisma.$disconnect();
    await app.prisma.$disconnect();
    const recreateAdminPrisma = new PrismaClient({ datasourceUrl: adminUrl });
    await recreateAdminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
    await recreateAdminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}" TEMPLATE "${templateDbName}"`);
    await recreateAdminPrisma.$disconnect();
    await app.prisma.$connect();
    await t.prisma.$connect();
  }
  await recreateDb();

  // Replace no-op jobs stub with spy for test assertions
  const sentJobs = [];
  app.backgroundJobs.send = async function (name, data, options) {
    sentJobs.push({ name, data, options });
  };
  app.backgroundJobs._sent = sentJobs;
  app.backgroundJobs.reset = () => { sentJobs.length = 0; };

  t.afterEach(async () => {
    // clear sent mail
    nodemailerMock.mock.reset();

    // clear sent jobs
    app.backgroundJobs.reset();

    // clear test assets (only if MinIO is initialized)
    try {
      await s3.deleteObjects('_test/');
    } catch (error) {
      // Ignore errors if MinIO isn't available
      if (!error.message?.includes('not initialized')) {
        throw error;
      }
    }
    // reset test database after each test
    return recreateDb();
  });

  // tear down after we are done
  t.after(async () => {
    await app.close();
    // Clean up databases
    try {
      await t.prisma.$disconnect();
      const cleanupPrisma = new PrismaClient({ datasourceUrl: adminUrl });
      await cleanupPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE)`);
      await cleanupPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${templateDbName}" WITH (FORCE)`);
      await cleanupPrisma.$disconnect();
    } catch {
      // best effort cleanup
    }
    if (!useShared) {
      await startedDbContainer.stop();
      await startedStorageContainer.stop();
    }
  });

  return app;
}

async function startDbContainer (image, networkMode) {
  if (!networkMode) {
    return new StartedTestDbContainer(
      await new PostgreSqlContainer(image)
        .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
        .start()
    );
  }

  const networkAlias = testContainerAlias('care-connect-test-db');
  const container = await new GenericContainer(image)
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

  return new StartedTestDbContainer(container, {
    host: networkAlias,
    port: POSTGRES_PORT,
    database: 'test',
    username: 'test',
    password: 'test',
  });
}

async function startStorageContainer (image, networkMode) {
  if (!networkMode) {
    return new StartedTestStorageContainer(
      await new GenericContainer(image)
        .withEntrypoint(['minio', 'server', '/data'])
        .withExposedPorts(MINIO_PORT)
        .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
        .start()
    );
  }

  const networkAlias = testContainerAlias('care-connect-test-storage');
  const container = await new GenericContainer(image)
    .withEntrypoint(['minio', 'server', '/data'])
    .withWaitStrategy(Wait.forLogMessage('API:'))
    .withStartupTimeout(TEST_CONTAINER_STARTUP_TIMEOUT_MS)
    .withNetworkMode(networkMode)
    .withNetworkAliases(networkAlias)
    .start();

  return new StartedTestStorageContainer(container, {
    host: networkAlias,
    port: MINIO_PORT,
  });
}

class StartedTestDbContainer {
  constructor (container, options = {}) {
    this.container = container;
    this.host = options.host ?? container.getHost();
    this.port = options.port ?? container.getPort();
    this.database = options.database ?? container.getDatabase();
    this.username = options.username ?? container.getUsername();
    this.password = options.password ?? container.getPassword();
  }

  getHost () {
    return this.host;
  }

  getPort () {
    return this.port;
  }

  getDatabase () {
    return this.database;
  }

  getUsername () {
    return this.username;
  }

  getPassword () {
    return this.password;
  }

  stop () {
    return this.container.stop();
  }
}

class StartedTestStorageContainer {
  constructor (container, options = {}) {
    this.container = container;
    this.host = options.host ?? container.getHost();
    this.port = options.port ?? container.getMappedPort(MINIO_PORT);
  }

  getHost () {
    return this.host;
  }

  getPort () {
    return this.port;
  }

  stop () {
    return this.container.stop();
  }
}

function testContainerAlias (prefix) {
  return `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function authenticate (app, email, password) {
  const loginResponse = await app.inject().post('/api/auth/login').payload({
    email,
    password,
  });
  if (loginResponse.statusCode !== StatusCodes.OK) {
    throw new Error(`Login failed with status ${loginResponse.statusCode}`);
  }
  const loginData = JSON.parse(loginResponse.body);

  // Handle MFA flow
  if (loginData.mfaRequired) {
    const user = await app.prisma.user.findUnique({ where: { email } });
    const verifyResponse = await app.inject().post('/api/auth/verify-code').payload({
      token: loginData.mfaToken,
      code: user.mfaCode,
    });
    if (verifyResponse.statusCode !== StatusCodes.OK) {
      throw new Error(`MFA verification failed with status ${verifyResponse.statusCode}`);
    }
    return {
      cookie: verifyResponse.headers['set-cookie']
        ?.split(';')
        .map((t) => t.trim())[0],
    };
  }

  // No MFA (already has session)
  return {
    cookie: loginResponse.headers['set-cookie']
      ?.split(';')
      .map((t) => t.trim())[0],
  };
}

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function upload (fixtures) {
  return Promise.all(
    fixtures.map((f) => s3.putObject(path.join('_uploads', f[1]), path.resolve(__dirname, `fixtures/assets/${f[0]}`)))
  );
}

function assetExists (assetPath) {
  return s3.objectExists(assetPath);
}

export {
  assetExists,
  authenticate,
  build,
  config,
  nodemailerMock,
  upload,
};
