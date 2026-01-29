// This file contains code that we reuse
// between our tests.

import util from 'node:util';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import helper from 'fastify-cli/helper.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { StatusCodes } from 'http-status-codes';
import * as nodemailerMock from 'nodemailer-mock';

import { GenericContainer } from 'testcontainers';
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

  const shared = await loadSharedContainerInfo();
  let startedDbContainer;
  let startedStorageContainer;
  let dbHost, dbPort, dbUsername, dbPassword;
  let storageHost, storagePort;
  const useShared = !!shared;

  if (shared) {
    // Use shared containers — create a unique database for this test file
    dbHost = shared.db.host;
    dbPort = shared.db.port;
    dbUsername = shared.db.username;
    dbPassword = shared.db.password;
    storageHost = shared.storage.host;
    storagePort = shared.storage.port;
  } else {
    // Fallback: start containers per test file (original behavior)
    let dbContainer = new PostgreSqlContainer(compose.services.db.image);
    if (!process.env.CI) {
      dbContainer = dbContainer.withNetworkMode('care-connect');
    }
    startedDbContainer = await dbContainer.start();
    dbHost = startedDbContainer.getHost();
    dbPort = startedDbContainer.getPort();
    dbUsername = startedDbContainer.getUsername();
    dbPassword = startedDbContainer.getPassword();

    let storageContainer = new GenericContainer(compose.services.storage.image)
      .withEntrypoint(['minio', 'server', '/data'])
      .withExposedPorts(9000);
    if (!process.env.CI) {
      storageContainer = storageContainer.withNetworkMode('care-connect');
    }
    startedStorageContainer = await storageContainer.start();
    storageHost = startedStorageContainer.getHost();
    storagePort = startedStorageContainer.getMappedPort(9000);
  }

  // Generate a unique database name for this test file
  const testDbName = `test_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;

  // Connect to the default database to create our test database
  const adminUrl = `postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/postgres`;
  const adminPrisma = new PrismaClient({ datasourceUrl: adminUrl });
  await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
  await adminPrisma.$disconnect();

  // set up the template (template1 equivalent) — push schema + fixtures into our test db
  const TEMPLATE_DATABASE_URL = `postgresql://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${testDbName}`;
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  await util.promisify(exec)(`DATABASE_URL=${TEMPLATE_DATABASE_URL} npx prisma db push --schema ${schemaPath}`, {
    cwd: path.join(__dirname, '..'),
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

  // Now create a template from this database so we can quickly recreate it
  const templateDbName = `${testDbName}_template`;
  const adminPrisma2 = new PrismaClient({ datasourceUrl: adminUrl });
  await templatePrisma.$disconnect();
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

  t.afterEach(async () => {
    // clear sent mail
    nodemailerMock.mock.reset();
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

async function authenticate (app, email, password) {
  const response = await app.inject().post('/api/auth/login').payload({
    email,
    password,
  });
  if (!response.statusCode === StatusCodes.OK) {
    throw new Error();
  }
  // send back headers needed to authenticate
  return {
    cookie: response.headers['set-cookie']
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
