---
title: 계산 표준 (Calculation Standards)
tags: [doctrine, ssot, auto]
status: auto-generated
---

# ⚙️ 계산 표준 (Calculation Standards)

사주·점성 계산의 **최상위 정책 선택**을 담는 코드 SSOT 의 미러. 값을 바꾸려면
문서가 아니라 [`calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)
를 수정하세요 (코드가 이 값을 직접 읽습니다). 아래 표의 **읽는 곳** 열은 `npm run docs:sync`
가 `src/` 에서 찾아 채우고, 읽는 곳이 하나도 없는 키가 있으면 docs:sync(와 CI 의
`docs:sync:check`)가 실패합니다 — 문서에만 있고 코드가 안 읽는 정책 값을 막기 위해서입니다
(엔진 감사 F16, 2026-11).

**키의 뜻**

- `saju.baseTimezone` — 쓸 수 있는 timezone 이 없을 때(누락·잘못된 IANA 이름) 계산이 기대는
  마지막 기준 존. 출생·보는 사람 타임존은 `src/lib/datetime/resolveTimezone.ts` 한 곳에서 고른다:
  출생 tz = 명시 출생 tz → 출생 좌표의 tz(tz-lookup) → 이 값(경고 로그), 보는 사람 tz('오늘'·일진·
  푸시 날짜) = 요청의 기기 tz → 출생 tz → 이 값. 경도도 없으면 이 존의 기준 경도로 시주를
  정한다([[saju|사주 교리]], CONVENTIONS §1).
- `saju.daeunRounding` — 대운수 = 절입까지 일수 ÷ 3 의 **내림**, 최소 1 (CONVENTIONS §13).
- `saju.useSolarTermsForMonthlyCycles` — 월운 경계를 12절기로 (CONVENTIONS §3).
- `astrology.houseSystem` — 기본 하우스 시스템. |위도| > 66.56° 에선 Placidus 가 정의되지 않아
  Whole Sign 으로 대체한다([[astrology|점성 교리]]).
- `astrology.nodeType` — 노드 계산 방식(True Node).

관련 교리: [[saju|사주 교리]] · [[astrology|점성 교리]]

<!-- gen:calculation-standards -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**원천:** [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)

### 사주 (Saju)

| 항목                            | 값           | 읽는 곳                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseTimezone`                  | `Asia/Seoul` | `src/lib/cache/redis-cache.ts`<br>`src/lib/calendar-engine/extractors/saju-hour.ts`<br>`src/lib/calendar-engine/periodPillars.ts`<br>`src/lib/calendar-view/toHourCrossings.ts`<br>`src/lib/datetime/resolveTimezone.ts`<br>`src/lib/datetime/timezone.ts`<br>`src/lib/destiny/sajuFacts.ts`<br>`src/lib/saju/saju.ts` |
| `daeunRounding`                 | `floor`      | `src/lib/saju/daeunAge.ts`                                                                                                                                                                                                                                                                                             |
| `useSolarTermsForMonthlyCycles` | `true`       | `src/lib/saju/unse.ts`                                                                                                                                                                                                                                                                                                 |

### 점성 (Astrology)

| 항목          | 값         | 읽는 곳                                                                                                                                                                                                                                                                       |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `houseSystem` | `Placidus` | `src/app/api/astrology/route.ts`<br>`src/lib/astrology/advanced/options.ts`<br>`src/lib/astrology/foundation/astrologyService.ts`<br>`src/lib/astrology/foundation/progressions.ts`<br>`src/lib/astrology/foundation/returns.ts`<br>`src/lib/astrology/foundation/transit.ts` |
| `nodeType`    | `true`     | `src/lib/astrology/advanced/options.ts`<br>`src/lib/astrology/foundation/shared.ts`                                                                                                                                                                                           |

<!-- /gen:calculation-standards -->
