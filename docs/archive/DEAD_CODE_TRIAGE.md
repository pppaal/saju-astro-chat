# Dead Code Triage Backlog

> 자동 생성: `npx knip --include files,exports,dependencies` 결과 (2026-05-06)
> 전체 raw 출력 길이 1,142줄 — 이 문서는 **분류·결정 가능한 형태**로 요약.
> 다음 갱신 시 동일 명령으로 재생성하고 차이만 처리.

## 요약

| 분류 | 항목 수 | 처리 방침 |
| --- | ---: | --- |
| Unused files | 37 → 34 | 3개 즉시 삭제 완료 (cross-rules), 나머지는 본 문서에서 클러스터별 결정 |
| Unused exports | 1,067 | 클러스터 단위로 처리. 개별 export는 PR마다 점진 정리 |
| Unused devDependencies | 12 | 대부분 false positive (CLI tooling). 섹션 4 참조 |

---

## 1. 즉시 삭제 완료 (이번 PR)

- `src/lib/fortune/cross-rules/bridges/career.ts` — career archetype 매핑. 어떤 룰에서도 import 안 됨
- `src/lib/fortune/cross-rules/bridges/domain.ts` — sibsin/yukchin → domain 매핑. 미사용
- `src/lib/fortune/cross-rules/demo.ts` — 자체 진입점, scripts/tests 어디서도 참조 안 됨

검증: `grep -rn "<symbol>" src/ tests/ scripts/` 결과 0건.

---

## 2. 삭제 후보 — 팀 결정 필요 (Cluster A: 옛 destiny-map display)

새 destiny-map UI(`src/app/destiny-map/`)로 교체된 후 남은 옛 컴포넌트들로 추정.

```
src/components/destiny-map/Display.tsx
src/components/destiny-map/FreeCrossPreview.tsx
src/components/destiny-map/display/sections/CategoryAnalysisSection.tsx
src/components/destiny-map/display/sections/CharacterBuilderSection.tsx
src/components/destiny-map/display/sections/KeyInsightsSection.tsx
src/components/destiny-map/display/sections/LifeTimelineSection.tsx
src/components/destiny-map/display/sections/LuckyElementsSection.tsx
src/components/destiny-map/display/sections/StarRating.tsx
src/components/destiny-map/display/sections/ThemeSectionsDisplay.tsx
src/components/destiny-map/display/sections/index.ts
src/components/destiny-map/display/utils.ts
```

**검증 결과**: 이 8개 sections + Display + FreeCrossPreview는 어떤 `src/app/**` 라우트에서도 import 안 됨.
**처리 권장**: 리뷰어 1명이 git log로 마지막 변경 의도 확인 후 일괄 삭제.

---

## 3. 삭제 후보 — 팀 결정 필요 (Cluster B: src/lib/match/*)

```
src/lib/match/conversationStarters.ts
src/lib/match/index.ts
src/lib/match/matchProfile.ts
src/lib/match/tier1Quick.ts
src/lib/match/tier2Medium.ts
```

**검증 결과**: `src/`·`tests/` 어디서도 import 0건.
**처리 권장**: "compatibility/매칭 기능 도입 보류" 모듈인지, 정말 dead인지 PM 확인 후 결정. 보류 중이면 `docs/archive/code/match/`로 이관.

---

## 4. 삭제 후보 — 팀 결정 필요 (Cluster C: shadcn UI primitives)

```
src/components/ui/alert.tsx
src/components/ui/badge.tsx
src/components/ui/card-shadcn.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/select.tsx
src/components/ui/spinner.tsx
src/components/ui/textarea.tsx
src/components/ui/GlobalHeader/HomeButton.tsx
```

**검증**: shadcn primitive들 — 새 디자인 시스템 마이그레이션으로 deprecated 가능성. 팀이 design system 정책 정한 뒤 일괄 처리.
**처리 권장**: design system PR 묶어서 정리.

---

## 5. 삭제 후보 — Cluster D: home / calendar augment

```
src/components/home/HeroSection.tsx
src/components/home/SearchBar.tsx
src/components/home/TarotDemoSection.tsx
src/components/home/VisitorStats.tsx
src/components/calendar/AugmentSection.tsx
src/components/calendar/CrossAugmentCard.tsx
src/components/calendar/SelectedDatePanel.sections.tsx
src/components/calendar/useAugmentFetch.ts
src/components/compatibility/PersonCard.tsx
```

**주의**: AugmentSection / CrossAugmentCard / useAugmentFetch는 `tests/components/calendar/*.test.tsx`에서 여전히 import 중. 테스트는 통과해도 컴포넌트 자체가 앱에서 안 쓰이는 "고립된 테스트". 정리 시 컴포넌트와 테스트 동시 삭제 또는 컴포넌트 재배선 결정 필요.
**home 4개**: 새 단일 화면 home(`82e0ab2`, `972be71` 커밋) 이후 잔존물로 추정.

---

## 6. Unused exports (1,067건) — 클러스터 처리 가이드

전체 리스트는 너무 길어 본 문서에 인라인하지 않음. 재생성:

```bash
npx knip --include exports > /tmp/knip-exports.txt
```

처리 우선순위:

1. **Barrel index re-exports 정리**: `src/lib/Saju/index.ts`(약 80개), `src/components/common/LoadingScreen/index.ts`(7개), `src/components/destiny-map/free-report/analyzers/shared/index.ts`(13개) — barrel이 실제 사용되지 않는 export까지 끌고 다님. 사용처 grep 후 barrel에서만 제거하면 안전.
2. **constants.ts 미사용 상수**: `src/components/astrology/constants.ts`, `src/components/calendar/constants.ts` 등 — 페이지 리팩토링 후 잔존물.
3. **Validation schemas re-export**: `src/lib/validation/index.ts` — zod schema barrel. 외부 사용 여부 확실치 않으면 보존.
4. **개별 helper 함수**: `src/utils/safeJsonParse.ts:safeJsonParseWithValidation` 같은 미사용 유틸 — 사용 가능성 점검 후 삭제.

---

## 7. Unused devDependencies — 대부분 false positive

| 패키지 | 실제 사용 위치 | 처리 |
| --- | --- | --- |
| `@testing-library/jest-dom` | `vitest.setup.ts` 등 setup 파일 | 보존 |
| `@testing-library/user-event` | 테스트 인터랙션 | 보존 |
| `@typescript-eslint/parser` | eslint config | 보존 |
| `@vitest/coverage-v8` | `npm run test:coverage` | 보존 |
| `cross-env` | npm scripts | 보존 |
| `eslint` | CLI tool | 보존 |
| `happy-dom` | vitest env | 보존 |
| `husky` | git hooks | 보존 |
| `lint-staged` | husky pre-commit | 보존 |
| `prettier` | format script | 보존 |
| `prisma` | CLI tool | 보존 |
| `tsx` | scripts 실행 | 보존 |

→ **모두 보존**. knip은 이런 indirect tool deps를 못 잡는 known limitation.

---

## 재생성 절차

```bash
npx knip --include files,exports,dependencies > /tmp/knip-full.txt 2>&1
```

이후 본 문서의 클러스터 번호 기준으로 변경분만 갱신.

## 다음 액션

- [ ] **Cluster A** 옛 destiny-map display 일괄 삭제 (리뷰어 1명 승인 필요)
- [ ] **Cluster B** match/* 모듈 PM 확인 후 archive 또는 삭제
- [ ] **Cluster C** shadcn UI primitive 정책 결정 후 design system PR과 함께 정리
- [ ] **Cluster D** home/calendar augment 잔존물 컴포넌트 + 테스트 동시 정리
- [ ] **Cluster E (exports)** barrel index 4개 정리부터 시작 (Saju, LoadingScreen, analyzers/shared, validation)
