import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { PORTS } from '@c_chat/shared-config';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
// https://vite.dev/config/
export default defineConfig({
  server: {
    port: PORTS.FRONTEND,
  },
  base: './',
  resolve: {
    alias: {
      '@c_chat/frontend': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../electron_client/dist/renderer',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
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
