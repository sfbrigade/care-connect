#!/usr/bin/env node

import sodium from 'sodium-native';
import { URL } from 'url';

import '../config.js';
import prisma from '#prisma/client.js';

if (process.argv.length !== 3) {
  console.log('Usage: bin/create-readonly-db-user.js username');
  process.exit(1);
}

const username = process.argv[2];
const buf = Buffer.allocUnsafe(16);
sodium.randombytes_buf(buf);
const password = buf.toString('hex');

const create = `CREATE USER ${username} WITH PASSWORD '${password}'`;
const grant = `GRANT pg_read_all_data TO ${username}`;
await prisma.$executeRawUnsafe(create);
await prisma.$executeRawUnsafe(grant);

const url = new URL(process.env.DATABASE_URL);
url.username = username;
url.password = password;
console.log('Database connection string:');
console.log(url.toString());
