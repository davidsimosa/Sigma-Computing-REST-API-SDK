import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/', 'node_modules/'],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript type-checked rules (for files covered by tsconfig.json)
  {
    files: ['src/**/*.ts'],
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // TypeScript recommended rules (non-type-checked) for files outside tsconfig
  {
    files: ['scripts/**/*.ts', '*.ts'],
    extends: tseslint.configs.recommended,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Examples — Node.js scripts, need Node globals
  {
    files: [
      'examples/**/*.{ts,mjs,js}',
      'examples-to-be-deleted/**/*.{ts,mjs,js}',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,

  // Test files — type-checked but with relaxed rules for test-specific patterns
  {
    files: ['tests/**/*.ts'],
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Tests routinely cast to `never` / `unknown` to satisfy strict mock types
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Type casts on response entries produce false positives for this rule
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // Relax rules for generated files — must come after all type-checked blocks
  // so these overrides win in ESLint's flat config cascade
  {
    files: ['src/generated/**'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
    },
  },

  // Relax rules for auto-generated resource files — must be last so overrides win
  {
    files: ['src/resources/**'],
    rules: {
      'no-await-in-loop': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
