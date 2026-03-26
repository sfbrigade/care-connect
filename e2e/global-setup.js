import { execSync } from 'child_process';

export default async function globalSetup () {
  try {
    const result = execSync('docker compose ps --format json', { encoding: 'utf-8' });
    const isServerRunning = result.includes('"server"') && result.includes('running');

    if (!isServerRunning) {
      console.log('Docker containers not running. Starting docker compose...');
      execSync('docker compose up -d', { stdio: 'inherit' });

      // Wait for the server to be ready
      console.log('Waiting for server to be ready...');
      const maxRetries = 60;
      for (let i = 0; i < maxRetries; i++) {
        try {
          execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3333', { encoding: 'utf-8' });
          console.log('Server is ready.');
          return;
        } catch {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      throw new Error('Server did not become ready in time');
    }
  } catch (error) {
    if (error.message?.includes('Server did not become ready')) {
      throw error;
    }
    // docker compose ps failed — try starting
    console.log('Starting docker compose...');
    execSync('docker compose up -d', { stdio: 'inherit' });
  }
}
