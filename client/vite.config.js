import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: '/src',
      components: '/src/Components',
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true,
      },
      '/static-data': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true,
      }
    }
  }
});
