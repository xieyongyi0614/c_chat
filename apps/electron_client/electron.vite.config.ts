import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import { protoMergePlugin } from './src/plugin/vite-plugin-proto';

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@c_chat/electron_client': resolve(__dirname, 'src'),
      },
    },

    plugins: [
      protoMergePlugin({
        directories: ['src/utils/socket-io-client/proto/static'],
        output: 'src/utils/socket-io-client/proto/index.js',
      }),
    ],

    ssr: {
      noExternal: [/^src\/utils\/socket-io-client\/proto.*/],
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
      commonjsOptions: {
        include: [/src\/utils\/socket-io-client\/proto/],
        transformMixedEsModules: true,
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
