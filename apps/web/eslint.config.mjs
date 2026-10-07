import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

import {
  formattingCompatibility,
  organizationRules,
  sharedIgnores,
} from '../../config/eslint-shared.mjs';

export default tseslint.config(
  sharedIgnores,
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      organizationRules,
      formattingCompatibility,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-inject': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@bdo/database',
                '@bdo/database/**',
                '**/apps/api/**',
                '**/api/src/**',
                '**/packages/database/**',
              ],
              message: 'O frontend acessa o backend por HTTP e usa contratos de @bdo/shared.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: { '@angular-eslint/template/prefer-control-flow': 'error' },
  },
);
