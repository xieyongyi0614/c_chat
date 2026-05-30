import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PORTS } from '@c_chat/shared-config';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: PORTS.MEDIA_PREVIEW,
  },
  base: './',
  resolve: {
    alias: {
      '@c_chat/media_preview': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../electron_client/dist/media-preview',
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
  plugins: [react(), tailwindcss()],
});
