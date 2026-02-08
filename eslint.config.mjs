import next from 'eslint-config-next'
import tseslint from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-config-prettier'

const config = [
  ...next,
  {
    ignores: [
      // Root test files
      '*-test.js',
      '*-api-test.js',
      'test-*.js',
      'test-*.mjs',
      'test-*.ts',
      'analyze-*.js',
      'check-*.js',
      'coverage-*.js',
      // Legacy JS files
      'src/lib/cities.js',
      'src/lib/destiny-map/visual/*',
      // Config files
      'eslint.config.mjs',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.js',
      'vitest.config.mjs',
      'playwright.config.ts',
      'playwright.*.config.ts',
      // Public folder (build artifacts)
      'public/**/*.js',
      // Python environments
      '.venv/**',
      'venv/**',
      'backend_ai/venv/**',
      'backend_ai/coverage/**',
      '**/__pycache__/**',
      '*.pyc',
      // Cache directories
      '.hf_cache/**',
      '.cache/**',
      '.turbo/**',
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      // Test artifacts
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'htmlcov/**',
      '.nyc_output/**',
      // E2E tests (Playwright - different syntax)
      'e2e/**',
      // IDE and system files
      '.vscode/**',
      '.idea/**',
      '.vercel/**',
      '.env*.local',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  {
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Relax React 19 new rules for existing codebase
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/exhaustive-deps': 'error',
      // Code quality
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'curly': ['warn', 'all'],
      'import/no-anonymous-default-export': 'off', // Allow anonymous exports
    },
  },
  {
    // Slightly relaxed rules for lib files (complex internal logic)
    files: ['src/lib/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // More lenient for lib files
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Performance utilities with advanced React patterns
    files: ['src/lib/performance/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/refs': 'off', // Advanced ref patterns intentionally used
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/use-memo': 'off', // Allow custom memo patterns
    },
  },
  {
    // API routes - allow unused context and flexible patterns
    files: ['src/app/api/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^context$',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Test files - relaxed rules for test utilities and mocking
    files: ['tests/**/*.{ts,tsx,js}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Tests often need any for mocking
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off', // Allow console in tests for debugging
    },
  },
  {
    // Scripts - utility scripts with more flexibility
    files: ['scripts/**/*.{ts,tsx,js,mjs}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': 'off', // Scripts often use console output
    },
  },
  prettier,
]

export default config
