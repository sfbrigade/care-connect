import { execSync } from 'child_process';

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

    // Reset database to clean seed state before running tests
    console.log('Resetting database...');
    execSync('docker compose exec -T server bash -c "cd server && npx prisma migrate reset --force"', {
      stdio: 'inherit',
      timeout: 120000,
    });
    console.log('Database reset complete.');
  } catch (error) {
    if (error.message?.includes('Server did not become ready')) {
      throw error;
    }
    // docker compose ps failed — try starting
    console.log('Starting docker compose...');
    execSync('docker compose up -d', { stdio: 'inherit' });
  }
}
