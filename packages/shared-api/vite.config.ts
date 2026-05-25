import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
      name: 'shared-api',
      formats: ['es'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['axios', 'await-to-js', '@c_chat/shared-config', '@c_chat/shared-types'],
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: mode !== 'development',
  },
}));
