import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    watch: { usePolling: true },
    publicDir: 'public'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});