# 한국어/영어 i18n 일관성 감사

> 작성일: 2026-05-26
> 범위: `src/app/` 아래 사용자 노출 페이지

## TL;DR

| 등급           | 페이지                                                                                                              | 비고                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 🟢 양호        | personality, about, pricing, profile/CircleAddModal, auth/signin                                                    | `t()` 또는 `isKo` 패턴 일관      |
| 🟡 일부 결함   | (main) 메인페이지 메타데이터, compatibility/tarot/destiny-counselor 메타데이터                                      | UI 텍스트는 OK, SEO 메타 KR-only |
| 🔴 한국어 전용 | **3개 error.tsx (tarot/destiny-map/compatibility)**, **destiny-map 페이지 전체**, **profile/decisions 페이지 전체** | EN 화면이 KR로 보임              |

**가장 우선 손볼 곳: 3개 error.tsx + decisions 페이지** (영어 사용자가 페이지 깨질 때 한국어로 보임).

---

## 🔴 한국어 전용 (긴급)

### 1. Error pages (3개)

영문 유저가 페이지 에러 만나면 한국어 안내가 뜸 → 신뢰도 하락.

| 파일                              | 라인           | 한글 텍스트                                                             |
| --------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `src/app/tarot/error.tsx`         | 24, 26, 33, 38 | "타로 오류", "타로 페이지를 불러오는 중 오류...", "다시 시도", "홈으로" |
| `src/app/destiny-map/error.tsx`   | 24, 26, 33, 38 | "운명 지도 오류", "운명 지도를 불러오는...", "다시 시도", "홈으로"      |
| `src/app/compatibility/error.tsx` | 28, 31, 38, 43 | "궁합 오류", "궁합 분석을 불러오는...", "다시 시도", "홈으로"           |

**고치는 법:** 각 파일 위에 `'use client'` 있을 텐데 `useI18n()` 가져와서 `locale === 'ko' ? '...' : '...'` ternary 로 4개 문자열 각각 분기. ~5분 작업.

### 2. destiny-map 페이지 전체

`src/app/destiny-map/page.tsx` (라인 19, 27, 29, 36-37, 44-47, 70, 79) — 모든 카피가 한국어 하드코딩. 영어 사용자가 들어오면 메뉴부터 본문까지 전부 한글.

### 3. profile/decisions 페이지 전체

`src/app/profile/decisions/page.tsx` (라인 42-55, 86, 115, 140, 147, 153-154, 169, 171, 205, 232, 251, 258, 287) — 결정 타입 라벨, "목록을 불러올 수 없어요", "결정 기록", "새 결정 입력" 등 모두 KR 하드코딩.

---

## 🟡 일부 결함 (UI 는 OK, SEO 메타데이터만)

브라우저 화면은 i18n 정상이지만 **`<title>`, `<meta description>` 같은 SEO 메타데이터가 한국어 only**. 영어 사용자가 구글 검색해도 KR 결과만 보임 → 인덱싱 손해.

| 파일                                 | 라인         | 문제                     |
| ------------------------------------ | ------------ | ------------------------ |
| `src/app/(main)/page.tsx`            | 33-45, 58-90 | FAQ + 메타데이터 KR-only |
| `src/app/compatibility/layout.tsx`   | 28-30        | 메타 title KR-only       |
| `src/app/tarot/layout.tsx`           | 35-46        | 메타 keywords KR-only    |
| `src/app/destiny-counselor/page.tsx` | 27-35        | 메타데이터 KR-only       |

**고치는 법:** `generateMetadata()` 안에서 `await getServerLocale()` 으로 locale 분기 → `generateLocalizedMetadata({ ko: {...}, en: {...} })` 패턴 사용. `pricing/page.tsx` 가 이 패턴 모범 예시.

### 기타

`src/app/compatibility/counselor/CompatRadarOverlay.tsx:103` — `"이(가) 가장 두드러져요"` 가 ternary 안인데 KR 부분만 한국어. EN 분기 있는지 라인 위아래 확인 필요.

---

## 🟢 양호 (모범 예시)

- `src/app/personality/page.tsx` — `t()` 헬퍼 일관
- `src/app/about/page.tsx` — `isKo` ternary 일관
- `src/app/pricing/page.tsx` — `getServerTranslation()` 사용, 서버 사이드 locale 분기 표준 패턴
- `src/app/auth/signin/page.tsx` — `t()` 일관
- `src/app/profile/components/CircleAddModal.tsx` — `t()` KO/EN 쌍 일관

---

## 권장 작업 순서

1. **즉시 (15분)**: 3개 error.tsx → 4 문자열씩 ternary. 가장 큰 신뢰도 영향.
2. **다음 PR (1시간)**: destiny-map 페이지 전체 i18n. EN 문자열 신규 작성 필요.
3. **다음 PR (1시간)**: profile/decisions 페이지 전체 i18n.
4. **여유 있을 때**: 메타데이터 4곳을 `generateLocalizedMetadata` 패턴으로 통일.

원하시면 1번 (error.tsx 3개) 부터 바로 PR 올려드릴 수 있어요. 5분 안에 됩니다.
