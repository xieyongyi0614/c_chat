import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
  {
    ignores: ['packages/shared-protobuf/src/index*'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js, react: pluginReact, 'react-hooks': reactHooks },
    extends: [
      js.configs.recommended,
      pluginReact.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
      semi: 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/display-name': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  // {
  //   // 重要：在 flat config 中，规则所属配置块必须声明对应插件
  //   // 否则会出现「Could not find plugin 'react-hooks'」之类的错误。
  //   plugins: { react: pluginReact, 'react-hooks': reactHooks },

  // },
]);
