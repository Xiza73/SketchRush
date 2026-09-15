// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Same-module element matcher for eslint-plugin-boundaries. */
const own = (type) => [type, { module: '${from.module}' }];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'eslint.config.mjs',
      'src/shared/contract/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // Tests talk to sockets and untyped test harness APIs; keep them honest but not painful.
    files: ['test/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Layer boundaries: presentation -> application -> domain <- infrastructure.
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*', 'test/**/*'],
      // Specs may wire concrete implementations from any layer.
      'boundaries/ignore': ['**/*.spec.ts'],
      'boundaries/elements': [
        { type: 'test', pattern: ['test/**/*'], mode: 'full' },
        { type: 'shared', pattern: ['src/shared/**/*'], mode: 'full' },
        {
          type: 'domain',
          pattern: ['src/modules/*/domain/**/*'],
          mode: 'full',
          capture: ['module'],
        },
        {
          type: 'application',
          pattern: ['src/modules/*/application/**/*'],
          mode: 'full',
          capture: ['module'],
        },
        {
          type: 'infrastructure',
          pattern: ['src/modules/*/infrastructure/**/*'],
          mode: 'full',
          capture: ['module'],
        },
        {
          type: 'presentation',
          pattern: ['src/modules/*/presentation/**/*'],
          mode: 'full',
          capture: ['module'],
        },
        { type: 'data', pattern: ['src/modules/*/data/**/*'], mode: 'full', capture: ['module'] },
        {
          type: 'module-root',
          pattern: ['src/modules/*/*.module.ts'],
          mode: 'full',
          capture: ['module'],
        },
        { type: 'app', pattern: ['src/*.ts'], mode: 'full' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['shared'], allow: ['shared'] },
            // Domain is pure TypeScript; another module's domain (entities, interfaces) is fair game.
            { from: ['domain'], allow: ['shared', 'domain'] },
            { from: ['application'], allow: ['shared', 'domain', own('application')] },
            {
              from: ['infrastructure'],
              allow: ['shared', 'domain', own('infrastructure'), own('data')],
            },
            // The gateway is presentation-only and calls the use cases of the other modules.
            {
              from: ['presentation'],
              allow: ['shared', 'domain', 'application', own('presentation')],
            },
            {
              from: ['module-root'],
              allow: [
                'shared',
                'module-root',
                own('domain'),
                own('application'),
                own('infrastructure'),
                own('presentation'),
              ],
            },
            { from: ['app'], allow: ['shared', 'module-root', 'app'] },
            {
              from: ['test'],
              allow: [
                'shared',
                'domain',
                'application',
                'infrastructure',
                'presentation',
                'module-root',
                'app',
                'data',
                'test',
              ],
            },
          ],
        },
      ],
    },
  },
);
