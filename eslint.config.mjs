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
      // 시각 파싱 SSOT 가드 — birthTime 을 split(':') 로 직접 파싱하면 'HH:MM PM'
      // 이 12시간 어긋나거나(시주/SR/LR) NaN 으로 떨어져 유효 생시가 걸러진다.
      // parseHourMinute(@/lib/saju/timeParse)만 쓰도록 강제. 흔한 3가지 형태
      // (x.birthTime.split / birthTime.split / (x.birthTime||'').split)를 잡는다.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.property.name='birthTime']",
          message:
            "birthTime 을 split 으로 직접 파싱 금지 — parseHourMinute(@/lib/saju/timeParse) 를 쓰세요('HH:MM PM' 12시간 오차 방지).",
        },
        {
          selector: "CallExpression[callee.property.name='split'][callee.object.name='birthTime']",
          message:
            'birthTime 을 split 으로 직접 파싱 금지 — parseHourMinute(@/lib/saju/timeParse) 를 쓰세요.',
        },
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.type='LogicalExpression'][callee.object.left.property.name='birthTime']",
          message:
            'birthTime 을 split 으로 직접 파싱 금지 — parseHourMinute(@/lib/saju/timeParse) 를 쓰세요.',
        },
      ],
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
      // 테스트 픽스처는 24h 리터럴을 직접 다뤄도 무방 — birthTime split 가드 제외.
      'no-restricted-syntax': 'off',
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
      'no-restricted-syntax': 'off', // 스크립트 런너는 24h 입력 직접 처리 허용
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off', // Scripts often use console output
    },
  },
  {
    // 캐시 우회 방지 가드레일 — 본명(natal) 차트는 출생정보가 같으면 불변이라
    // 반드시 cachedCalculateNatalChart(Redis 30일 + 인메모리 L1)를 거쳐야 한다.
    // 과거 리포트·캘린더·궁합이 raw calculateNatalChart 를 직접 불러 매 로드
    // Swiss Ephemeris 풀계산(~500ms)을 반복하던 회귀의 *구조적* 재발 차단.
    // 허용: 래퍼(cached.ts)·엔진(foundation)·배럴(index)·인라인 캐시 라우트
    // (api/astrology)·테스트·스크립트. destiny-matrix core 는 자체 no-restricted
    // -imports 를 갖고 있어 ignore(룰 클로버 방지).
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'src/lib/astrology/cached.ts',
      'src/lib/astrology/index.ts',
      'src/lib/astrology/foundation/**',
      'src/app/api/astrology/route.ts',
      'src/lib/destiny-matrix/core/**',
      'tests/**',
      'scripts/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/astrology',
              importNames: ['calculateNatalChart'],
              message:
                'raw calculateNatalChart 금지 — cachedCalculateNatalChart(@/lib/astrology/cached) 를 쓰세요. 본명 차트는 불변이라 캐시(Redis 30일+L1)를 반드시 거쳐야 합니다.',
            },
            {
              name: '@/lib/astrology/foundation/astrologyService',
              importNames: ['calculateNatalChart'],
              message:
                'raw calculateNatalChart 금지 — cachedCalculateNatalChart(@/lib/astrology/cached) 를 쓰세요.',
            },
          ],
        },
      ],
    },
  },
  {
    // 번들 경량화 가드레일 — 타로 히스토리/공유는 카드 이미지·이름만 필요하다.
    // 전체 덱(@/lib/tarot/data, ~400KB 의미텍스트)이나 그걸 끌어오는
    // findCardByName 을 import 하면 클라 번들에 의미 전문이 다시 들어간다.
    // 경량 @/lib/tarot/cardNameIndex 만 쓰도록 강제(라이브 게임/해석은 제외 —
    // 그쪽은 해석에 의미가 필요해 전체 덱을 정당하게 쓴다).
    files: ['src/app/tarot/history/**/*.{ts,tsx}', 'src/components/tarot/shareCardData.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/tarot/data',
              message:
                '히스토리/공유에서 전체 덱(~400KB) import 금지 — @/lib/tarot/cardNameIndex(이미지/이름) 를 쓰세요.',
            },
            {
              name: '@/lib/tarot/findCardByName',
              message:
                '히스토리/공유에서 findCardByName(전체 덱 의존) 금지 — @/lib/tarot/cardNameIndex 의 findCardImageBySavedName 을 쓰세요.',
            },
          ],
        },
      ],
    },
  },
  prettier,
]

export default config
