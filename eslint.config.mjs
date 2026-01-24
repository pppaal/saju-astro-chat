import next from 'eslint-config-next'
import tseslint from '@typescript-eslint/eslint-plugin'

const config = [
  ...next,
  {
    ignores: [
      'src/lib/cities.js',
      'src/lib/destiny-map/visual/*',
      '.venv/**',
      'venv/**',
      'backend_ai/venv/**',
      'backend_ai/coverage/**',
      '**/__pycache__/**',
      '*.pyc',
      '.hf_cache/**',
      '.cache/**',
      '.turbo/**',
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      '.nyc_output/**',
      'e2e/**',
      'scripts/**',
      'tests/**',
      '.vscode/**',
      '.idea/**',
      '.vercel/**',
      '.env*.local',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      '*.js',
      '*.mjs',
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
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Relax React 19 new rules for existing codebase
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  {
    // Relaxed unused-vars for lib files (complex internal logic)
    files: ['src/lib/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]

export default config
