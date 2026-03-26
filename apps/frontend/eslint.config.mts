import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
  {
    files: ['src/**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    plugins: { js, 'react-hooks': reactHooks, react: pluginReact },
    extends: [
      js.configs.recommended,
      pluginReact.configs.flat.recommended,
      ...tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.app.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      semi: 'warn',

      'react-hooks/rules-of-hooks': 'error', // 检查 Hook 规则
      'react-hooks/exhaustive-deps': 'warn', // 检查 Effect Hook 的依赖
      'react/display-name': 'off',
    },
  },
]);
