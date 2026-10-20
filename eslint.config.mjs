import tseslint from 'typescript-eslint';

import {
  formattingCompatibility,
  organizationRules,
  sharedIgnores,
} from './config/eslint-shared.mjs';

export default tseslint.config(sharedIgnores, {
  files: [
    'packages/**/*.{ts,mts}',
    '*.mjs',
    'config/**/*.mjs',
    'scripts/shared-browser-bundle.test.mjs',
  ],
  extends: [...tseslint.configs.recommended, organizationRules, formattingCompatibility],
});
