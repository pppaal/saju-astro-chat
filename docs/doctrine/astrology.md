---
title: 점성 교리 (Astrology Doctrine)
tags: [doctrine, astrology]
status: living
---

# 🌌 점성 교리 (Astrology Doctrine)

> 우리 서비스가 채택한 점성 계산 노선. **무엇을(what) + 왜(why)** 를 적습니다.
> 사실 값(하우스 시스템 등)은 [[calculation-standards|계산 표준]] ⚙️ 에서 자동 미러됩니다.

## 핵심 선택

- **하우스 시스템:** Placidus (자세한 값은 [[calculation-standards]])
  - **극권 폴백:** |위도| > 66.56°(= 90° − 황도경사 23.44°)에서는 Placidus 가 정의되지 않아
    **Whole Sign** 으로 대체하고 결과의 `houseSystem` 도 `'WholeSign'` 으로 보고한다(커스프 1 =
    ASC 사인 0°). 예: 트롬쇠(69.65°N). 일반 위도는 Placidus 그대로.
    ([`houses.ts`](../../src/lib/astrology/foundation/houses.ts), 가드 `tests/lib/astrology/foundation/astroBugfixes.regression.test.ts`, 골든 R14)
- **노드:** True Node
- **좌표계:** Tropical (회귀황도). 평균·진태양시 보정은 없다 — 실제 UTC 천문 위치.
- **출생 instant:** 사주와 같은 [`resolveBirthInstant`](../../src/lib/datetime/resolveBirthInstant.ts)
  (`natalToJD`; RFC 5545 — 겹치는 벽시계는 첫 번째, 없는 벽시계는 공백 직전 offset).
  `isoToJD` 는 `Z`·`±hh:mm` 접미사를 절대 순간으로, 접미사 없는 벽시계는 같은 resolver 로 읽는다.
  좌표가 없으면 출생 타임존의 기준점(`defaultLatitudeFor`/`defaultLongitudeFor`)을 쓴다.

## 타이밍 기법 (2026-11 엔진 감사 E5·E13 기준)

- **섹트(sect):** 주간 차트 = 태양의 참고도 > 0° (`swe_azalt`). SSOT 는
  [`extraPoints.ts`](../../src/lib/astrology/foundation/extraPoints.ts) `isDiurnalChart` —
  astroFacts·`/api/astrology`·행운점·lot 이 모두 이 함수를 쓴다. 하우스 규칙(7~12궁 = 지평선 위)은
  천체력을 못 쓸 때의 폴백일 뿐이다(극권 Whole Sign 에서는 지평선과 어긋나 섹트가 뒤집혔다 — ASTRO-10).
- **프로펙션:** whole-sign. 활성 사인 = ASC 사인 + 나이(칸), 활성 하우스 = (나이 mod 12) + 1, 연주(Lord
  of the Year) = 그 사인의 전통 지배성. Placidus 커스프 사인은 읽지 않는다
  ([`profections.ts`](../../src/lib/astrology/foundation/profections.ts)).
- **조디악 릴리싱(ZR):** 층마다 1/12 — L1 = 행성년 1년, L2 = 1/12년, L3 = 2.5일(Valens 30일 달 / 12),
  L4 = 5시간(OD-11). L3 결 풀림(Loosing of the Bond)은 한 바퀴(211 × 2.5일 ≈ 17.3개월)보다 긴 L2
  에서만 난다 ([`zodiacalReleasing.ts`](../../src/lib/astrology/foundation/zodiacalReleasing.ts)).
- **행성시:** 행성일은 실제 현지 일출(`swe_rise_trans`)부터. 일출 전 시간은 _전날_ 행성일의 지배성
  순서에 속하고, 해가 뜨거나 지지 않는 극권의 날에는 행성시가 없다
  ([`electional.ts`](../../src/lib/astrology/foundation/electional.ts)).
- **보이드 오브 코스(VoC):** 달이 다음 사인에 _실제로 들어가는 시각_ 에 끝난다.
- **솔라 아크:** 진짜 아크 = λ☉(출생 JD + 나이 일) − λ☉(출생). 같은 천체끼리의 자기각은 세지 않는다.
- **회귀·외행성 마디:** 토성·목성·카이런 회귀와 외행성 상현 사각은 정확 instant(스캔 + 이분법, 약 1분)
  ([`outerMilestones.ts`](../../src/lib/calendar-engine/lifecycle/outerMilestones.ts)). 카이런은
  `seas_18.se1` 로 실측하고, 파일이 없을 때만 나이 표로 폴백한다.
- **어스펙트 applying/separating:** 트랜짓 천체의 속도로 판정, 쌍마다 가장 타이트한 하나.
- **천체력 점검:** 첫 `getSwisseph()` 에서 Swiss Ephemeris 파일(Moshier 아님)과 카이런 계산을 확인하고,
  실패는 로그로 남긴다(throw 하지 않음 — [`ephe.ts`](../../src/lib/astrology/foundation/ephe.ts)).

## 출생 시각·장소 미상 (`placeUnreliable`)

출생 시각 또는 출생지를 모르면 ASC·MC·하우스가 정오 앵커·기본 좌표의 날조가 된다. 그래서 하우스·ASC·MC,
프로펙션, lot·ZR, 알무텐, 앵글 대상 어스펙트를 쓰지 않는다 — 규칙 전문은
[계산 스펙 §6](../CALCULATION_SPEC.md). 섹트와 섹트 기반 품위는 남는다.

## 구현 위치 (SSOT)

- 표준 값: [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)
- 차트/하우스: [`src/lib/astrology/foundation/astrologyService.ts`](../../src/lib/astrology/foundation/astrologyService.ts)
- 어스펙트 orb/각도: [`src/lib/astrology/foundation/aspects.ts`](../../src/lib/astrology/foundation/aspects.ts)
- 디그니티/알무텐: [`src/lib/astrology/foundation/dignities.ts`](../../src/lib/astrology/foundation/dignities.ts), [`almutenFiguris.ts`](../../src/lib/astrology/foundation/almutenFiguris.ts)
- 하우스·극권 폴백: [`src/lib/astrology/foundation/houses.ts`](../../src/lib/astrology/foundation/houses.ts)

## 심화 문서

- [계산 스펙](../CALCULATION_SPEC.md) · [점성 감사](../AUDIT_ASTRO.md) · [태양시 정책 — 평균태양시, 균시차 미적용](../SOLAR_TIME_CONVENTION.md)

## 사용처

이 교리를 소비하는 서비스: [[destiny-counselor|운명 상담사]]

> TODO(교리 산문): orb 값·디그니티 가중치의 "왜"를 여기로 끌어와 사주 교리와
> 서술 깊이를 맞춘다.
