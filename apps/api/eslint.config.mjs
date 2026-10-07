import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import {
  formattingCompatibility,
  organizationRules,
  sharedIgnores,
} from '../../config/eslint-shared.mjs';

export default tseslint.config(sharedIgnores, {
  files: ['src/**/*.ts'],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    organizationRules,
    formattingCompatibility,
  ],
  languageOptions: {
    globals: globals.node,
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
  },
});
