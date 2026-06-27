---
title: calendar-engine 분할 설계 (extractors 도메인 서브폴더화)
tags: [architecture, calendar-engine, refactor]
status: proposal
---

# calendar-engine 분할 설계 (extractors 도메인 서브폴더화)

> 상태: **제안(Proposal)** · 작성 맥락: 코드 품질 리뷰 — "calendar-engine 81파일
> 비대화" 감점 항목 해소. 본 문서는 분할의 **정확한 매핑·블라스트 반경·검증
> 절차·단계(phase)** 를 정의한다. 실행은 typecheck + 테스트 그린 확인 후.

## 1. 현황

`src/lib/calendar-engine` 총 **81파일 / ~19,700줄**. 디렉토리 분포:

| 디렉토리      | 파일 수 | 성격                                    |
| ------------- | ------- | --------------------------------------- |
| `extractors/` | 38      | 원천 신호 추출 (astro 19 · saju 18 · cross 1) |
| `derivers/`   | 25      | 추출 신호 → 점수·등급·서술 파생          |
| 루트          | 9       | 파이프라인 골격(index·types·cache·persistence 등) |
| `data/`       | 5       | 정적 매핑 테이블                         |
| `context/`    | 2       | NatalContext 빌더/타입                   |
| 기타          | 2       | `lifecycle/`, `extractors/shared/`       |

핵심 비대 지점은 **`extractors/` 단일 폴더 38파일**. 다만 파일명 접두사
(`astro-` / `saju-` / `cross-`)가 이미 도메인을 인코딩하고 있어, 폴더 경계로
승격하기만 하면 된다 — 설계 부채가 아니라 **물리적 정리만 남은 상태**.

## 2. 블라스트 반경 (왜 안전한가)

측정 결과(2026-06):

- **외부(엔진 밖) 파일이 `calendar-engine/extractors/...` 를 직접 import: 0건.**
  모든 소비는 루트 `index.ts` 배럴을 경유. → 외부 영향 없음.
- 엔진 내부 extractors 상대 import: 38건 (대부분 `index.ts` 의 default import).
- extractors 형제끼리 import: 12건 (`astro-*`/`saju-*` 간 참조).

즉 변경 표면은 **calendar-engine 내부로 완전히 봉인**된다. 순수 이동(`git mv`) +
상대경로 재작성이라 런타임 동작은 불변 — 깨지면 컴파일에서 100% 잡힌다.

## 3. 목표 구조 (Phase 1 — extractors)

```
extractors/
  astro/                ← astro-* 19파일 이동
    astro-transit.ts
    astro-profection.ts
    astro-progression.ts
    astro-return.ts
    astro-zr.ts
    astro-arabic-part.ts
    astro-asteroid.ts
    astro-dignity.ts
    astro-eclipse.ts
    astro-electional.ts
    astro-fixed-star.ts
    astro-house-transit.ts
    astro-lifecycle.ts
    astro-midpoint.ts
    astro-moon-nodes.ts
    astro-moon-phase-voc.ts
    astro-planetary-hour.ts
    astro-solar-arc.ts
    astro-soul-pattern.ts
  saju/                 ← saju-* 18파일 이동
    saju-pillar.ts
    saju-shinsal.ts
    saju-shinsal-activation.ts
    saju-hyeongchung.ts
    saju-tonggeun.ts
    saju-twelve-stage.ts
    saju-yongsin.ts
    saju-johu-yongsin.ts
    saju-geokguk.ts
    saju-gongmang.ts
    saju-pattern.ts
    saju-applied-pattern.ts
    saju-hour.ts
    saju-element-flow.ts
    saju-element-balance.ts
    saju-ilju-archetype.ts
    saju-jijanggan.ts
    saju-natal-branch-relation.ts
  cross/                ← cross-activation.ts
    cross-activation.ts
  shared/               ← (기존 유지)
  index.ts              ← (선택) extractors 배럴 신설
```

**파일명 유지 결정**: 이동 단계에서는 접두사(`astro-`/`saju-`)를 **그대로 둔다**.
이유 — diff 를 순수 `git mv` 로 유지해 리뷰·blame 추적을 보존. 접두사 제거
(`astro/transit.ts`)는 의미 중복이지만 Phase 3 의 별도 정리로 분리해 리스크를 격리.

## 4. 실행 절차 (Phase 1)

1. `git mv src/lib/calendar-engine/extractors/astro-*.ts .../extractors/astro/`
   (saju, cross 동일).
2. 상대경로 재작성 — 두 종류뿐:
   - **형제 참조(12건)**: `./astro-foo` → `../astro/astro-foo` 또는 동일 도메인
     내면 `./astro-foo` 유지. (도메인 경계 교차 시에만 `../` 한 단계 추가.)
   - **상위(extractors 밖) 참조**: `../derivers/x`, `../data/x`, `../types`,
     `./shared/x` → 한 단계 깊어졌으므로 `../` 하나씩 추가
     (`../../derivers/x`, `../shared/x` → `../../shared/x` 등).
3. 루트 `index.ts` 의 38개 import 경로 갱신:
   `./extractors/saju-shinsal` → `./extractors/saju/saju-shinsal`.
   (선택) `extractors/index.ts` 배럴을 신설하면 index.ts 는 배럴 1줄만 참조.
4. **검증 게이트(필수)**:
   ```
   npm run typecheck     # 0 errors — 끊긴 import 전수 검출
   npm test -- calendar  # 엔진 골든/유닛
   npm run lint
   ```
   세 개 모두 그린일 때만 커밋. 하나라도 빨강이면 경로 재작성 미스이므로 롤백·재시도.

## 5. 후속 단계 (별도 PR 권장)

- **Phase 2 — derivers 군집화**: 25파일을 성격별로.
  - `scoring/` (score · layeredScore · grade · convergence · convergence-heavy · reconcile)
  - `timeframes/` (dayActions · dayDeepRead · dayDomains · dayStrength · monthSummary · lifeCurve · lifePattern · lifetimeFlow · lifetimePivots · cycleTone · summary)
  - `language/` (plainLanguage · signalI18n · toneMeaning · patternsI18n)
  - `patterns/` (patterns · surprise · personSeed)
  - 루트: constants
  derivers 는 형제 결합이 extractors 보다 촘촘하니 import 재작성 비용·리스크가
  높다 → 반드시 분리 PR.

- **Phase 3 — 메가파일 내부 분할**: 단일 파일 >1k 줄 2개가 진짜 유지보수 리스크.
  - `derivers/dayDomains.ts` **1,519줄**
  - `derivers/lifetimeFlow.ts` **1,425줄**
  도메인/시간 축으로 모듈 분해. 폴더 이동(Phase 1·2)보다 우선순위는 같거나 높음 —
  파일 1개가 1.5k 줄이면 한 화면에 안 들어오고 충돌·리뷰 비용이 급증.

## 6. 비목표 (하지 않는 것)

- 공개 API(루트 `index.ts` export 표면) 변경 없음 — 외부 소비자 무영향.
- 추출/파생 **로직** 변경 없음 — 순수 파일 배치/경로.
- 접두사 리네이밍은 Phase 1 에 포함하지 않음(§3 참조).
