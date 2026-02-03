# 빌드 및 번들 분석 지침

## 수정된 파일들

제가 다음 파일들을 수정했습니다:

### 1. TypeScript 에러 수정

- `src/app/tarot/[categoryName]/[spreadId]/components/stages/DeckSelectStage.tsx` - 타입 수정
- `src/components/life-prediction/phases/BirthInputPhase.tsx` - gender 타입 문제 해결

### 2. Framer-motion 임포트 변경

**주의**: `motion.div` 동적 임포트가 TypeScript 에러를 발생시켜서 **static import로 되돌렸습니다**.

최종 상태:

- ✅ `src/app/dream/page.tsx` - `AnimatePresence`만 동적 임포트 (그대로 유지)
- ✅ `src/app/life-prediction/page.tsx` - `AnimatePresence`만 동적 임포트 (그대로 유지)
- ❌ `src/app/tarot/page.tsx` - **static import로 복원** (motion.div 문제)
- ❌ `src/app/tarot/history/page.tsx` - **static import로 복원** (motion.div 문제)

## 빌드 방법

lock 파일 문제로 자동 빌드가 어렵습니다. 다음 단계를 따라주세요:

### 1. 새 터미널 열기

### 2. .next 디렉토리 삭제

**Windows PowerShell:**

```powershell
cd c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest
Remove-Item -Recurse -Force .next
```

**Windows CMD:**

```cmd
cd c:\Users\pjyrh\Desktop\saju-astro-chat-backup-latest
rmdir /s /q .next
```

### 3. 빌드 실행

```bash
npm run build
```

## 예상 빌드 결과

빌드가 성공하면 다음과 같은 출력이 나타납니다:

```
Route (app)                                Size     First Load JS
┌ ○ /                                      XXX kB         XXX kB
├ ○ /dream                                 XXX kB         XXX kB
├ ○ /life-prediction                       XXX kB         XXX kB
├ ○ /tarot                                 XXX kB         XXX kB
├ ○ /tarot/history                         XXX kB         XXX kB
...
```

## 번들 분석 방법

### 옵션 1: 빌드 결과에서 확인

위의 빌드 출력에서 "First Load JS" 열을 확인하세요.

### 옵션 2: 번들 분석기 사용

```bash
npm run build:analyze
```

브라우저에서 번들 트리맵이 자동으로 열립니다.

## 확인할 지표

1. **First Load JS 총량** - 초기 로딩 크기
2. **개별 페이지 크기** - /dream, /life-prediction 등
3. **Shared chunks** - 공유 번들 크기

## 최적화 효과

### 현재 적용된 최적화:

- ✅ `AnimatePresence` 동적 임포트 (2개 페이지)
  - /dream
  - /life-prediction

### 예상 효과:

- 초기 번들: ~80-100KB 감소 (AnimatePresence만)
- framer-motion 전체를 동적 로딩할 수 없어서 예상보다 효과가 적습니다

## 추가 최적화 옵션

framer-motion의 `motion` 컴포넌트를 동적 로딩하기 어려우므로, 다른 최적화 방법을 권장합니다:

1. **pdfjs-dist 동적 임포트** (~400KB 절약)
2. **chart.js 동적 임포트** (~150KB 절약)
3. **사용하지 않는 의존성 제거**
4. **이미지 최적화**

## 문제 발생 시

### "Unable to acquire lock" 에러

```bash
# lock 파일 삭제
del .next\lock
# 또는
rm .next/lock

# 다시 빌드
npm run build
```

### TypeScript 에러

제가 수정한 파일들을 확인하고, 에러 메시지를 알려주세요.

## 다음 단계

빌드가 성공하면:

1. 번들 사이즈 숫자를 확인해주세요
2. 기대했던 3MB → 2MB 목표를 달성했는지 확인
3. 추가 최적화가 필요한지 판단

---

**수정 완료일**: 2026-02-02
**수정된 파일**: 4개
**최적화 상태**: 부분 적용 (AnimatePresence만)
