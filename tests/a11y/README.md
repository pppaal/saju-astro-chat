# Accessibility Testing

이 디렉토리에는 WCAG 2.1 Level AA 준수를 위한 자동화된 접근성 테스트가 포함되어 있습니다.

## 테스트 구조

```
tests/a11y/
├── axe-helper.ts           # axe-core 헬퍼 설정
├── setup.ts                # 테스트 환경 설정
├── components.test.tsx     # UI 컴포넌트 접근성 테스트
├── pages.test.tsx          # 페이지 컴포넌트 접근성 테스트
├── GlobalHeader.test.tsx   # 헤더 컴포넌트 테스트
└── ErrorBoundary.test.tsx  # 에러 처리 접근성 테스트
```

## 실행 방법

### 모든 접근성 테스트 실행
```bash
npm run test:a11y
```

### Watch 모드로 실행
```bash
npm run test:a11y:watch
```

### 특정 테스트 파일만 실행
```bash
npm run test:a11y -- components.test.tsx
```

## 테스트 범위

### 1. UI 컴포넌트 (components.test.tsx)
- **Button**: 접근 가능한 버튼 상태, 로딩 상태
- **Input**: 레이블 연결, 에러 상태, aria 속성
- **Select**: 적절한 옵션 레이블링
- **Textarea**: 레이블과 설명 연결
- **Badge**: 의미있는 텍스트와 색상 대비
- **Alert**: role="alert", 적절한 aria-live
- **Card**: 의미있는 구조
- **Spinner**: 로딩 상태 표시, aria-label

### 2. 페이지 컴포넌트 (pages.test.tsx)
- **Navigation**: 건너뛰기 링크, 헤딩 구조
- **Forms**: 레이블, 에러 메시지, 필수 필드
- **Interactive Elements**: 버튼, 링크, 키보드 탐색
- **Content Structure**: 목록, 테이블, 적절한 마크업
- **ARIA**: 역할, 상태, 속성
- **Images**: alt 텍스트, 장식용 이미지
- **Color Contrast**: WCAG AA 기준 준수

### 3. 글로벌 컴포넌트
- **GlobalHeader**: 탐색, 언어 전환, 사용자 메뉴
- **ErrorBoundary**: 에러 상태 접근성

## WCAG 2.1 Level AA 체크리스트

### ✅ Perceivable (인식 가능)
- [x] 모든 이미지에 적절한 alt 텍스트
- [x] 색상 대비 비율 4.5:1 이상 (일반 텍스트)
- [x] 색상 대비 비율 3:1 이상 (큰 텍스트)
- [x] 정보가 색상에만 의존하지 않음

### ✅ Operable (작동 가능)
- [x] 키보드로 모든 기능 접근 가능
- [x] 포커스 순서가 논리적
- [x] 포커스가 시각적으로 표시됨
- [x] 건너뛰기 링크 제공

### ✅ Understandable (이해 가능)
- [x] 명확한 레이블과 지시사항
- [x] 일관된 탐색
- [x] 에러 메시지가 명확함
- [x] 적절한 언어 속성 (lang)

### ✅ Robust (견고함)
- [x] 유효한 HTML
- [x] ARIA 속성이 올바르게 사용됨
- [x] 적절한 역할(role) 사용

## 도구

### axe-core
자동화된 접근성 테스트를 위한 업계 표준 도구입니다.

```typescript
import { axe } from './axe-helper';

const results = await axe(container);
expect(results.violations).toHaveLength(0);
```

### vitest-axe
Vitest와 통합된 axe-core 매처를 제공합니다.

```typescript
import { toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);

await expect(container).toHaveNoViolations();
```

## CI/CD 통합

### GitHub Actions
접근성 테스트는 자동으로 실행됩니다:
- ✅ PR 생성 시
- ✅ main/develop 브랜치 푸시 시
- ✅ 매일 오전 2시 (UTC)

### 워크플로우
- `.github/workflows/quality.yml`: 코드 품질 체크의 일부
- `.github/workflows/accessibility.yml`: 전용 접근성 테스트

## 모범 사례

### 1. 의미있는 HTML 사용
```tsx
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
```

### 2. 레이블 제공
```tsx
// ❌ Bad
<input type="text" placeholder="Name" />

// ✅ Good
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

### 3. 아이콘 버튼에 레이블
```tsx
// ❌ Bad
<button><CloseIcon /></button>

// ✅ Good
<button aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>
```

### 4. 에러 메시지 연결
```tsx
// ✅ Good
<input
  id="email"
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    Please enter a valid email
  </span>
)}
```

### 5. 색상 대비
```css
/* ❌ Bad - Low contrast */
color: #999999;
background: #ffffff; /* 2.8:1 */

/* ✅ Good - High contrast */
color: #333333;
background: #ffffff; /* 12.6:1 */
```

## 수동 테스트

자동화된 테스트는 약 30-40%의 접근성 문제만 발견합니다. 다음 수동 테스트도 수행하세요:

1. **키보드 탐색**
   - Tab 키로 모든 요소 접근 가능한지 확인
   - Enter/Space로 버튼 활성화
   - Esc로 모달 닫기

2. **스크린 리더**
   - NVDA (Windows)
   - JAWS (Windows)
   - VoiceOver (macOS/iOS)
   - TalkBack (Android)

3. **확대/축소**
   - 200% 줌에서도 사용 가능한지 확인
   - 텍스트가 잘리지 않는지 확인

4. **색맹 시뮬레이션**
   - Chrome DevTools의 Rendering 탭 사용
   - 정보가 색상에만 의존하지 않는지 확인

## 리소스

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## 문제 보고

접근성 문제를 발견하면 GitHub Issue를 생성해주세요:
- 문제 설명
- 재현 단계
- 스크린샷 (가능한 경우)
- WCAG 기준 참조
