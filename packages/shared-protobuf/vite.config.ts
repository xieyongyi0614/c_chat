import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { protoMergePlugin } from './plugin/vite-plugin-proto';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
      rollupTypes: false,
      staticImport: true,
    }),
    protoMergePlugin({
      directories: ['./src/static'],
      output: './src/index.js',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        protoMap: resolve(__dirname, 'src/protoMap.ts'),
      },
      name: 'shared-protobuf',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      external: ['protobufjs'],
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
