import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@c_chat/electron_client': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: [],
        output: {
          format: 'cjs', // CommonJS
          entryFileNames: '[name].js',
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
});
