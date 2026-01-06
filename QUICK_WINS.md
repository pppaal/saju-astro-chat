# ⚡ Quick Wins - 즉시 적용 가능한 개선사항

**소요 시간: 각 30분 이내**
**난이도: ⭐ (쉬움)**

이 가이드는 **오늘 바로** 적용해서 프로젝트 퀄리티를 빠르게 올릴 수 있는 것들입니다.

---

## 1. 테스트 실행 습관화 (5분)

### 지금 바로:
```bash
# 전체 테스트 실행
npm test

# 커버리지 확인
npm test -- --coverage

# Watch 모드 (파일 변경 시 자동 실행)
npm run test:watch
```

### VS Code 단축키 설정:
```json
// .vscode/tasks.json
{
  "label": "Run Tests",
  "type": "shell",
  "command": "npm test",
  "group": {
    "kind": "test",
    "isDefault": true
  }
}
```

**효과**: 버그를 코딩 중에 바로 발견! 🐛

---

## 2. Logger 사용 시작 (10분)

### 파일 하나만 수정해보기:

**Before** (`src/app/api/some-route/route.ts`):
```typescript
console.log('Processing request');
console.error('Error occurred:', error);
```

**After**:
```typescript
import { apiLogger } from '@/lib/logger';

apiLogger.info('Processing request', { userId, requestId });
apiLogger.error('Error occurred', error, { userId, requestId });
```

### 자동 변환 스크립트:
```bash
# 테스트
node scripts/migrate-console-to-logger.js src/app/api/saju/route.ts --dry-run

# 실제 적용
node scripts/migrate-console-to-logger.js src/app/api/saju/route.ts
```

**효과**: 프로덕션에서 로그 추적이 10배 쉬워짐! 📊

---

## 3. ESLint 규칙 강화 (15분)

### `.eslintrc.json` 업데이트:
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 실행:
```bash
npm run lint
npm run lint -- --fix  # 자동 수정 가능한 것들
```

**효과**: 나쁜 코드를 작성하기 전에 경고! ⚠️

---

## 4. Pre-commit Hook 설정 (10분)

### Husky 설치:
```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
```

### `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint
npm run lint || {
  echo "❌ Lint failed. Please fix the issues."
  exit 1
}

# Type check
npx tsc --noEmit || {
  echo "❌ Type check failed. Please fix the types."
  exit 1
}

# Tests
npm test || {
  echo "❌ Tests failed. Please fix the tests."
  exit 1
}

echo "✅ All checks passed!"
```

**효과**: 나쁜 코드가 절대 커밋되지 않음! 🚫

---

## 5. 타입 체크 명령어 추가 (5분)

### `package.json`:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  }
}
```

### 실행:
```bash
npm run typecheck
```

**효과**: 타입 에러를 빌드 전에 발견! 🔍

---

## 6. VS Code 확장 프로그램 설치 (5분)

### 필수 확장:
1. **ESLint** - 실시간 린트 경고
2. **Prettier** - 자동 포맷팅
3. **Error Lens** - 에러를 코드 옆에 표시
4. **GitLens** - Git 히스토리 시각화
5. **Test Explorer** - 테스트 결과 실시간 표시

### `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "usernamehw.errorlens",
    "eamodio.gitlens",
    "hbenl.vscode-test-explorer"
  ]
}
```

**효과**: 개발 경험이 10배 좋아짐! 🚀

---

## 7. README에 상태 배지 추가 (10분)

### `README.md`:
```markdown
# Saju Astro Chat

![Tests](https://img.shields.io/github/actions/workflow/status/your-org/saju-astro-chat/test.yml?label=tests)
![Coverage](https://img.shields.io/codecov/c/github/your-org/saju-astro-chat)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Quick Start
\`\`\`bash
npm install
npm test
npm run dev
\`\`\`
```

**효과**: 프로젝트가 프로페셔널하게 보임! ✨

---

## 8. 환경 변수 검증 (15분)

### `scripts/check-env.js`:
```javascript
const requiredVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_AI_BACKEND',
];

const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:');
  missing.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}

console.log('✅ All environment variables are set!');
```

### `package.json`:
```json
{
  "scripts": {
    "predev": "node scripts/check-env.js",
    "prebuild": "node scripts/check-env.js"
  }
}
```

**효과**: 환경 설정 문제로 인한 빌드 실패 방지! 🛡️

---

## 9. Git Commit 메시지 템플릿 (5분)

### `.gitmessage`:
```
# <type>: <subject>
#
# type: feat, fix, docs, style, refactor, test, chore
#
# Example:
# feat: add user authentication
# fix: resolve login bug
# docs: update README with setup instructions
```

### 설정:
```bash
git config commit.template .gitmessage
```

**효과**: 커밋 히스토리가 깔끔해짐! 📝

---

## 10. 성능 모니터링 추가 (10분)

### `src/lib/performance.ts`:
```typescript
export function measurePerformance(name: string) {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
}
```

### 사용:
```typescript
const perf = measurePerformance('Calculate Saju');
const result = calculateSaju(data);
perf.end();
```

**효과**: 느린 함수를 즉시 발견! ⚡

---

## 🎯 오늘의 목표

**30분 투자로 5개 완료하기!**

- [ ] 1. 테스트 실행
- [ ] 2. Logger 하나 적용
- [ ] 3. ESLint 규칙 추가
- [ ] 4. Pre-commit Hook
- [ ] 5. VS Code 확장 설치

**완료하면 프로젝트 퀄리티가 즉시 1점 상승합니다!** 🚀

---

## 📊 진행 상황 체크

```bash
# 매일 실행
npm test && npm run lint && npm run typecheck
```

**Green = Good!** ✅

---

## 💡 다음 단계

Quick Wins를 모두 완료했다면:
👉 [PROJECT_QUALITY_10_ROADMAP.md](./PROJECT_QUALITY_10_ROADMAP.md)를 확인하세요!

**Happy Coding!** 🎉
