import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

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
  ],

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'shared-utils',
      formats: ['es'],
      fileName: (format) => `index.${format}.js`,
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
