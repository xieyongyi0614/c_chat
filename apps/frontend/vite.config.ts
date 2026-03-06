import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ELECTRON_RENDERER_PORT } from '@c_chat/shared-config';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
// https://vite.dev/config/
export default defineConfig({
  server: {
    port: ELECTRON_RENDERER_PORT,
  },
  resolve: {
    alias: {
      '@frontend': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../../dist/apps/frontend',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
});
