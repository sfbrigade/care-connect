/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ command, ssrBuild, mode }) => {
  // Check if this is an SSR build - ssrBuild should be true when building with --ssr flag
  const isSSRBuild = ssrBuild === true || (command === 'build' && process.argv.includes('--ssr'));

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
        components: '/src/components'
      }
    },
    build: {
      rollupOptions: isSSRBuild
        ? {}
        : {
            output: {
              // Only apply manualChunks for client builds, not SSR builds
              // SSR builds mark React as external, so it can't be in manualChunks
              manualChunks: {
                // Core platform - shared across all apps
                'core-vendor': ['react', 'react-dom', 'react-router'],
                'core-ui': ['@mantine/core', '@mantine/hooks', '@mantine/modals'],
                'core-utils': ['axios', '@tanstack/react-query'],
                // App-specific chunks will be created automatically via dynamic imports
              },
            },
          },
    },
    server: {
      // Enable HTTPS for camera access on iOS
      // Vite will auto-generate self-signed certificates
      // Set VITE_HTTPS=true to enable, or use --https flag
      https: process.env.VITE_HTTPS === 'true' || process.argv.includes('--https'),
      // Allow external hosts (needed for ngrok and mobile device access)
      host: true, // Listen on all addresses
      // Allow all hosts to prevent "Invalid Host header" errors with ngrok
      strictPort: false,
      // Allow ngrok domain and localhost
      allowedHosts: [
        'localhost',
        'unlustrous-christiane-didactic.ngrok-free.dev'
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/static-data': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },
    test: {
      globals: true,
      environment: 'node',
      projects: [
        {
          // Unit tests (Node.js environment)
          test: {
            name: 'unit',
            include: ['**/*.test.js'],
            exclude: ['**/*.stories.*', '**/node_modules/**', '**/.storybook/**']
          }
        }
      ]
    }
  };
});
