import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'previous revisions/**',
      '.netlify/**',
    ],
  },

  // Site JavaScript: ES5-compatible browser code, loaded with a plain <script> tag.
  {
    files: ['assets/**/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: ['error', 'smart'],
      'no-var': 'off', // deliberate: this file targets older browsers
      'prefer-const': 'off',
      'no-implicit-globals': 'error',
    },
  },

  // Tests and tooling config: modern ESM running under Node.
  {
    files: ['tests/**/*.js', '*.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
