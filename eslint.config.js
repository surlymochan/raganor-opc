import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import solid from 'eslint-plugin-solid';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'solid': solid
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // SOLID 原则（作为参考检查）
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 100],
      'max-params': ['warn', 4],

      // DRY 检查
      'no-duplicate-imports': 'error',

      // 通用
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-else-return': 'warn',

      // AI Slop 检查（禁止过于通用的 AI 表达）
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/^(?!.*[A-Za-z]).*$/]',
        message: '避免使用无意义的占位符或随机字符串'
      }]
    }
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'no-console': 'off'
    }
  }
];
