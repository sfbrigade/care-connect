// This file contains code that we reuse
// between our tests.

import util from 'node:util';
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

// automatically build and tear down our instance
async function build (t) {
  // PostgreSQL + Docker containers mode
  return await buildPostgres(t);
}

async function buildPostgres (t) {
  // disable the ryuk cleanup container, cannot connect from the compose network
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  const compose = YAML.parse(await fs.readFile(path.join(__dirname, '../..', 'compose.yml'), 'utf8'));
  // extract current version of postgres image being used, start a new test container
  let dbContainer = new PostgreSqlContainer(compose.services.db.image);
  if (!process.env.CI) {
    dbContainer = dbContainer.withNetworkMode('care-connect');
  }
  const startedDbContainer = await dbContainer.start();
  // set up the default template (template1) with the schema and fixtures
  const templateDbUrl = new URL(`postgresql://${startedDbContainer.getUsername()}:${startedDbContainer.getPassword()}@${startedDbContainer.getHost()}:${startedDbContainer.getPort()}/template1`);
  templateDbUrl.searchParams.set('connection_limit', '1');
  const TEMPLATE_DATABASE_URL = templateDbUrl.toString();
  // run the migrations
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  await util.promisify(exec)(`DATABASE_URL=${TEMPLATE_DATABASE_URL} npx prisma db push --schema ${schemaPath}`, {
    cwd: path.join(__dirname, '..'),
  });
  const prisma = new PrismaClient({
    datasourceUrl: TEMPLATE_DATABASE_URL,
  });
  // load fixtures
  const loader = new Loader();
  const resolver = new Resolver();
  const builder = new Builder(prisma, new Parser());
  loader.load(path.resolve(__dirname, 'fixtures/db'));
  const fixtures = resolver.resolve(loader.fixtureConfigs);
  for (const fixture of fixturesIterator(fixtures)) {
    await builder.build(fixture);
  }
  await prisma.$disconnect();
  // configure test database url
  process.env.DATABASE_URL = `postgresql://${startedDbContainer.getUsername()}:${startedDbContainer.getPassword()}@${startedDbContainer.getHost()}:${startedDbContainer.getPort()}/${startedDbContainer.getDatabase()}`;
  t.prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

  // set up a new storage container
  let storageContainer = new GenericContainer(compose.services.storage.image)
    .withEntrypoint(['minio', 'server', '/data'])
    .withExposedPorts(9000);
  if (!process.env.CI) {
    storageContainer = storageContainer.withNetworkMode('care-connect');
  }
  const startedStorageContainer = await storageContainer.start();
  process.env.AWS_S3_ACCESS_KEY_ID = 'minioadmin';
  process.env.AWS_S3_SECRET_ACCESS_KEY = 'minioadmin';
  process.env.AWS_S3_BUCKET = 'app';
  process.env.AWS_S3_REGION = 'us-east-1';
  process.env.AWS_S3_ENDPOINT = `http://${startedStorageContainer.getHost()}:${startedStorageContainer.getMappedPort(9000)}`;

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

  // recreate the database from the template created above
  async function recreateDb () {
    await t.prisma.$disconnect();
    await app.prisma.$disconnect();
    const templatePrisma = new PrismaClient({ datasourceUrl: TEMPLATE_DATABASE_URL });
    await templatePrisma.$connect();
    const dbName = startedDbContainer.getDatabase();
    // Quote database name to handle special characters and ensure proper SQL escaping
    await templatePrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await templatePrisma.$executeRawUnsafe('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = \'template1\' AND pid <> pg_backend_pid();');
    await templatePrisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    await templatePrisma.$disconnect();
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

  // tear down our app and the db container after we are done
  t.after(async () => {
    await app.close();
    await startedDbContainer.stop();
    await startedStorageContainer.stop();
  });

  return app;
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
