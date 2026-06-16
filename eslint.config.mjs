import next from 'eslint-config-next'
import prettier from 'eslint-config-prettier'
import apiRouteProtection from './eslint-rules/api-route-protection.mjs'

// Local custom rules, exposed under the `local` plugin namespace.
const localPlugin = {
  rules: {
    'api-route-protection': apiRouteProtection,
  },
}

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
      'artifacts/**',
      'qa-dumps/**',
      'reports/ops/**',
      'reports/quality/**',
      'reports/typecheck/**',
      'tmp/**',
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
    files: ['**/*.{ts,tsx}'],
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
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // More lenient for lib files
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Core engine contract: prevent role drift into ai-report layer
    files: [
      'src/lib/destiny-matrix/core/runDestinyCore.ts',
      'src/lib/destiny-matrix/core/patternEngine.ts',
      'src/lib/destiny-matrix/core/scenarioEngine.ts',
      'src/lib/destiny-matrix/core/decisionEngine.ts',
      'src/lib/destiny-matrix/core/canonical.ts',
      'src/lib/destiny-matrix/core/types.ts',
      'src/lib/destiny-matrix/core/index.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@/lib/destiny-matrix/ai-report/*'],
        },
      ],
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
    plugins: { local: localPlugin },
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
      // Every API route handler must be protected by the shared API middleware
      // (withApiMiddleware / initializeApiContext). Intentional exceptions are
      // allowlisted inside the rule. See eslint-rules/api-route-protection.mjs.
      'local/api-route-protection': 'error',
    },
  },
  {
    // Test files - relaxed rules for test utilities and mocking
    files: ['tests/**/*.{ts,tsx,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Tests often need any for mocking
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off', // Allow console in tests for debugging
      '@next/next/no-assign-module-variable': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      'import/no-anonymous-default-export': 'off', // k6 load scripts require `export default function`
      'prefer-const': 'off',
    },
  },
  {
    // Scripts - utility scripts with more flexibility
    files: ['scripts/**/*.{ts,tsx,js,mjs,cjs,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off', // Scripts often use console output
    },
  },
  prettier,
]

export default config
