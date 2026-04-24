/// <reference types="vitest/config" />
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/

// Custom plugin to load CSS files as text strings (matching esbuild --loader:.css=text)
function cssAsText () {
  return {
    name: 'css-as-text',
    enforce: 'pre', // Run before Vite's built-in CSS handling
    resolveId (source, importer) {
      // If importing a CSS file from server/lib/forms, mark it with a special query
      if (importer && source.endsWith('.css')) {
        const normalizedImporter = importer.replace(/\\/g, '/');
        if (normalizedImporter.includes('server/lib/forms')) {
          // Resolve the full path
          const importerDir = path.dirname(importer.split('?')[0]);
          const resolvedPath = path.resolve(importerDir, source);
          return resolvedPath + '?raw-text';
        }
      }
    },
    load (id) {
      // Handle CSS files marked with ?raw-text query
      if (id.includes('?raw-text')) {
        const filePath = id.split('?')[0];
        this.addWatchFile(filePath);
        const code = fs.readFileSync(filePath, 'utf-8');
        return `export default ${JSON.stringify(code)}`;
      }
    }
  };
}

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@locales': fileURLToPath(new URL('../locales', import.meta.url)),
};

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ command, ssrBuild, mode }) => {
  // Check if this is an SSR build - ssrBuild should be true when building with --ssr flag
  const isSSRBuild = ssrBuild === true || (command === 'build' && process.argv.includes('--ssr'));

  return {
    plugins: [react(), cssAsText()],
    resolve: {
      alias,
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
      // Allow all hosts to connect- this is used only for development...
      allowedHosts: true,
      fs: {
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          fileURLToPath(new URL('../locales', import.meta.url)),
        ],
      },
      proxy: {
        '^/api|/static-data': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: false,
        }
      }
    },
    test: {
      globals: true,
      pool: 'threads',
      maxWorkers: 2,
      minWorkers: 1,
      environment: 'node',
      alias,
      projects: [
        {
          // Unit tests (Node.js environment)
          test: {
            name: 'unit',
            include: ['**/*.test.js'],
            exclude: ['**/*.stories.*', '**/node_modules/**', '**/.storybook/**']
          }
        },
        {
          // Component tests (JSDOM environment)
          test: {
            name: 'component',
            environment: 'jsdom',
            setupFiles: ['./src/test/setupTests.js'],
            include: ['**/*.test.jsx'],
            exclude: ['**/*.stories.*', '**/node_modules/**', '**/.storybook/**'],
            alias,
          }
        }
      ]
    }
  };
});
