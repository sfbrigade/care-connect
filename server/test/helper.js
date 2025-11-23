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
  // disable the ryuk cleanup container, cannot connect from the compose network
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  const compose = YAML.parse(await fs.readFile(path.join(__dirname, '../..', 'compose.yml'), 'utf8'));
  // extract current version of postgres image being used, start a new test container
  let dbContainer = new PostgreSqlContainer(compose.services.db.image);
  if (!process.env.CI) {
    dbContainer = dbContainer.withNetworkMode('full-stack-starter');
  }
  const startedDbContainer = await dbContainer.start();
  // set up the default template (template1) with the schema and fixtures
  const TEMPLATE_DATABASE_URL = `postgresql://${startedDbContainer.getUsername()}:${startedDbContainer.getPassword()}@${startedDbContainer.getHost()}:${startedDbContainer.getPort()}/template1`;
  // run the migrations
  await util.promisify(exec)(`DATABASE_URL=${TEMPLATE_DATABASE_URL} npx prisma db push`);
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
  // configure test database url
  process.env.DATABASE_URL = `postgresql://${startedDbContainer.getUsername()}:${startedDbContainer.getPassword()}@${startedDbContainer.getHost()}:${startedDbContainer.getPort()}/${startedDbContainer.getDatabase()}`;
  t.prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

  // set up a new storage container
  let storageContainer = new GenericContainer(compose.services.storage.image)
    .withEntrypoint(['minio', 'server', '/data'])
    .withExposedPorts(9000);
  if (!process.env.CI) {
    storageContainer = storageContainer.withNetworkMode('full-stack-starter');
  }
  const startedStorageContainer = await storageContainer.start();
  process.env.AWS_S3_ACCESS_KEY_ID = 'minioadmin';
  process.env.AWS_S3_SECRET_ACCESS_KEY = 'minioadmin';
  process.env.AWS_S3_BUCKET = 'app';
  process.env.AWS_S3_REGION = 'us-east-1';
  process.env.AWS_S3_ENDPOINT = `http://${startedStorageContainer.getHost()}:${startedStorageContainer.getMappedPort(9000)}`;
  await s3.createBucket(process.env.AWS_S3_BUCKET);

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
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${startedDbContainer.getDatabase()} WITH (FORCE)`);
    await sleep(100);
    await prisma.$executeRawUnsafe(`CREATE DATABASE ${startedDbContainer.getDatabase()} `);
    await app.prisma.$connect();
    await t.prisma.$connect();
  }
  await recreateDb();

  t.afterEach(async () => {
    // clear sent mail
    nodemailerMock.mock.reset();
    // clear test assets
    await s3.deleteObjects('_test/');
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
