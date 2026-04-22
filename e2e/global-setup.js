import { execSync } from 'child_process';

const ALLOWED_DB_HOSTS = ['localhost', '127.0.0.1', 'db'];
const SAFETY_ERROR_PREFIX = 'Refusing to reset DB';

function assertSafeToReset () {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${SAFETY_ERROR_PREFIX}: NODE_ENV=production`);
  }

  let dbUrl;
  try {
    dbUrl = execSync(
      "docker compose exec -T server bash -c 'echo $DATABASE_URL'",
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch {
    throw new Error(`${SAFETY_ERROR_PREFIX}: could not read DATABASE_URL from server container`);
  }

  if (!dbUrl) {
    throw new Error(`${SAFETY_ERROR_PREFIX}: DATABASE_URL is empty in server container`);
  }

  let hostname;
  try {
    hostname = new URL(dbUrl).hostname;
  } catch {
    throw new Error(`${SAFETY_ERROR_PREFIX}: could not parse DATABASE_URL`);
  }

  if (!ALLOWED_DB_HOSTS.includes(hostname)) {
    throw new Error(
      `${SAFETY_ERROR_PREFIX}: DATABASE_URL host "${hostname}" is not in the allowlist ` +
      `(${ALLOWED_DB_HOSTS.join(', ')}).`,
    );
  }

  console.log(`DB safety check passed — will reset local dev DB at host "${hostname}".`);
}

export default async function globalSetup () {
  try {
    const result = execSync('docker compose ps --format json', { encoding: 'utf-8' });
    const isServerRunning = result.includes('"server"') && result.includes('running');

    if (!isServerRunning) {
      console.log('Docker containers not running. Starting docker compose...');
      execSync('docker compose up -d', { stdio: 'inherit' });
    }

    // Wait for the server to be ready
    console.log('Waiting for server to be ready...');
    const maxRetries = 60;
    for (let i = 0; i < maxRetries; i++) {
      try {
        execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3333', { encoding: 'utf-8' });
        console.log('Server is ready.');
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Safety check must pass before the destructive reset runs
    assertSafeToReset();

    // Reset database to clean seed state before running tests
    console.log('Resetting database...');
    execSync('docker compose exec -T server bash -c "cd server && npx prisma migrate reset --force"', {
      stdio: 'inherit',
      timeout: 120000,
    });
    // Complete any active incidents for the SFPD test user so "Hold a chair" creates a fresh one
    execSync('docker compose exec -T server bash -c "cd server && node -e \\"' +
      "import prisma from './prisma/client.js';" +
      "await prisma.incident.updateMany({ where: { completedAt: null }, data: { completedAt: new Date() } });" +
      "await prisma.\\\\\\$disconnect();" +
      '\\""', { stdio: 'inherit', timeout: 30000 });
    console.log('Database reset complete.');
  } catch (error) {
    if (error.message?.startsWith(SAFETY_ERROR_PREFIX)) {
      throw error;
    }
    if (error.message?.includes('Server did not become ready')) {
      throw error;
    }
    // docker compose ps failed — try starting
    console.log('Starting docker compose...');
    execSync('docker compose up -d', { stdio: 'inherit' });
  }
}
