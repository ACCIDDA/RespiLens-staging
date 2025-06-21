import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const base = mode === 'staging' ? '/RespiLens-staging/' : '/';
  
  return {
    base,
    plugins: [react()],
    server: {
      watch: { usePolling: true },
      publicDir: 'public'
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    }
  };
});