import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        Promise: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      security: security
    },
    rules: {
      // Security rules
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      
      // Code quality rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      
      // Error handling
      'no-console': 'off', // Bot needs console logging
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-undef': 'off' // TypeScript handles this
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', '!eslint.config.js']
  }
];