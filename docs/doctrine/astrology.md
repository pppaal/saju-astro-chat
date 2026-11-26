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
  순서에 속하고, 일몰이 자정을 넘는 날(64–66.5° 여름) 그 일몰 전 시각은 아직 전날 행성일의 _낮_
  이다(재감사 AC-7). 해가 뜨거나 지지 않는 극권의 날에는 행성시가 없다
  ([`electional.ts`](../../src/lib/astrology/foundation/electional.ts)).
- **보이드 오브 코스(VoC):** 차트 순간부터 달이 다음 사인에 _실제로 들어갈_ 때까지 태양·수성·금성·
  화성·목성·토성·천왕성·해왕성·명왕성 가운데 어느 것과도 프톨레마이오스 애스펙트(0/60/90/120/180)를
  완성하지 않으면 보이드다. 노드·ASC/MC·lot 같은 점은 대상이 아니다. 위치는 움직인다 — 진입까지
  행성도 실제로 옮겨 가며(정오에 얼리지 않음) 보고, 끝은 달 진입 시각(이분법, 1초)이다
  ([`electional.ts`](../../src/lib/astrology/foundation/electional.ts) `checkVoidOfCourse` — 재감사 AC-4).
- **항성:** 표는 J2000 황경(Swiss Ephemeris 항성 카탈로그 RA·Dec → 황도, 47개)이고 날짜 위치는 세차
  50.3″/년으로 옮긴다. 합 오브 1°. 캘린더는 하늘에 있는 트랜짓 _천체_ 만 항성과 합을 본다 — 트랜짓
  ASC·MC 는 하루에 모든 항성을 지나는 점이라 대상이 아니다. 본명 차트는 ASC·MC 도 본다
  ([`fixedStars.ts`](../../src/lib/astrology/foundation/fixedStars.ts) — 재감사 STAR-1·STAR-2).
- **솔라 아크:** 진짜 아크 = λ☉(출생 JD + 나이 일) − λ☉(출생). 같은 천체끼리의 자기각은 세지 않는다.
- **생애 마디(회귀·외행성 마디):** 목성·토성·카이런·천왕성 회귀, 명왕성·해왕성 상현 사각, 천왕성
  마주봄, 진행 달 회귀는 모두 하늘에서 잰 정확 instant(스캔 + 이분법, 약 1분)
  ([`outerMilestones.ts`](../../src/lib/calendar-engine/lifecycle/outerMilestones.ts)). 진행 달 회귀는
  2차 진행(하루 = 1년, 365.25일): 출생 T일 뒤 달이 본명 달로 돌아오면 그 순간은 출생 + T × 365.25일
  (T ≈ 27.2–27.5일 → 만 27세, 8월 하순 이후 출생은 출생연도 + 28년).
  - **첫 통과 = 마디 날짜:** 첫 정확 통과의 출생지 날짜와 그 순간의 만 나이.
  - **탐색 창(만 나이):** 1900–2050 출생의 실제 첫 통과 범위를 덮는다 — 명왕성 사각 25–100세(실제
    35.6–88.1세: 1965–75 출생은 30대 중반, 1900–1925·2000년 이후 출생은 50~80대), 천왕성 마주봄·해왕성
    사각 33–50세, 카이런 회귀 44–56세, 천왕성 회귀 76–90세, 진행 달 회귀 25–30세, 목성·토성 회귀는 평균
    나이 ±3년 안팎.
  - **통과 창:** 같은 역행 묶음의 통과(서로 500일 안)를 모아 마지막 통과를 정하고, 첫 통과로 이어지는
    접근에서 정확각 1° 안에 든 순간부터 마지막 통과 뒤 1° 밖으로 나가는 순간까지를 그 마디의 활성 창으로
    둔다.
  - **평균 나이표는 씨앗일 뿐:** 창 안(한평생 안)에 교차가 없거나 천체력이 실패하면(카이런은
    `seas_18.se1`) 그 마디는 빠진다 — 평균 나이표(`astroLifecycle.ts`)로 날짜·나이를 채우지 않는다.
  - **한 출처:** 인생 마디·단계 카드, 캘린더 라이프사이클 신호(창 = 통과 창, peak = 첫 통과), 그 신호를
    부모로 한 교차와 인생 '이 10년의 겹침'이 같은 순간을 읽는다(본명당 프로세스 메모).
- **어스펙트 applying/separating:** 트랜짓 천체의 속도로 판정, 쌍마다 가장 타이트한 하나.
- **천체력 점검:** 첫 `getSwisseph()` 에서 Swiss Ephemeris 파일(Moshier 아님)과 카이런 계산을 확인하고,
  실패는 로그로 남긴다(throw 하지 않음 — [`ephe.ts`](../../src/lib/astrology/foundation/ephe.ts)).

## 트랜짓 어스펙트 (캘린더·상담사·인생 곡선)

출생 차트·시너스트리 애스펙트(`aspects.ts`, 헬레니즘 moiety 쌍 평균)와 **다른 규칙**이다. 캘린더
트랜짓 추출기·상담사 트랜짓 줄·인생 곡선이 모두 [`transit.ts`](../../src/lib/astrology/foundation/transit.ts)
`findTransitAspects`·`transitOrbLimit` 를 읽는다.

- **애스펙트:** 메이저 5개(합·육분·사분·삼분·대립)만 — 마이너는 캘린더 추출기가 막는다. 각도는
  `ASPECT_ANGLES`([`types.ts`](../../src/lib/astrology/foundation/types.ts)).
- **오브 한도:** 기본 오브 × _트랜짓 천체_ 배율(아래 표). 본명 쪽 배율은 쓰지 않는다. 오브 = |분리각 −
  애스펙트 각| ≤ 한도.
- **본명 대상:** 행성 + ASC·MC(캘린더 추출기는 본명 카이런·릴리스도).
- **접근/분리:** 트랜짓 천체의 속도로, 두 정확 지점 중 가까운 쪽을 향하는지로 판정.
- **캘린더 창:** 현지 정오 샘플. 한 신호 = 오브 안 _연속_ 정오 전체이고, 범위 가장자리에 닿은 구간은
  천체력으로 범위 밖까지 잇는다(빌드 범위와 무관). peak = 가장 타이트한 정오. 역행으로 오브를 나갔다
  다시 들어오면 별개 신호다. 층: 토성~명왕성 yearly, 목성·화성 monthly, 나머지 daily. 극성은
  [`aspect-polarity.ts`](../../src/lib/calendar-engine/aspect-polarity.ts) `inferAspectPolarity`.

<!-- gen:transit-orbs -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**출처:** [`transit.ts`](../../src/lib/astrology/foundation/transit.ts) `transitOrbLimit` — `TRANSIT_ORBS[애스펙트] × PLANET_ORB_MULTIPLIER[트랜짓 천체]`.

| 트랜짓 천체 | 배율  | 합 ☌ (기본 6°) | 대립 ☍ (기본 6°) | 삼분 △ (기본 5°) | 사분 □ (기본 5°) | 육분 ⚹ (기본 4°) |
| ----------- | ----- | -------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Sun         | × 1   | 6°             | 6°               | 5°               | 5°               | 4°               |
| Moon        | × 1.2 | 7.2°           | 7.2°             | 6°               | 6°               | 4.8°             |
| Mercury     | × 0.9 | 5.4°           | 5.4°             | 4.5°             | 4.5°             | 3.6°             |
| Venus       | × 0.9 | 5.4°           | 5.4°             | 4.5°             | 4.5°             | 3.6°             |
| Mars        | × 1   | 6°             | 6°               | 5°               | 5°               | 4°               |
| Jupiter     | × 1.1 | 6.6°           | 6.6°             | 5.5°             | 5.5°             | 4.4°             |
| Saturn      | × 1.2 | 7.2°           | 7.2°             | 6°               | 6°               | 4.8°             |
| Uranus      | × 1.3 | 7.8°           | 7.8°             | 6.5°             | 6.5°             | 5.2°             |
| Neptune     | × 1.3 | 7.8°           | 7.8°             | 6.5°             | 6.5°             | 5.2°             |
| Pluto       | × 1.4 | 8.4°           | 8.4°             | 7°               | 7°               | 5.6°             |
| True Node   | × 1   | 6°             | 6°               | 5°               | 5°               | 4°               |

표에 없는 천체(카이런 등)는 배율 1.0. 본명 쪽 배율은 쓰지 않는다.

<!-- /gen:transit-orbs -->

## 출생 시각·장소 미상 (`placeUnreliable`)

출생 시각 또는 출생지를 모르면 ASC·MC·하우스가 정오 앵커·기본 좌표의 날조가 된다. 그래서 하우스·ASC·MC,
프로펙션, lot·ZR, 알무텐, 앵글 대상 어스펙트를 쓰지 않는다 — 규칙 전문은
[계산 스펙 §6](../CALCULATION_SPEC.md). 섹트도 지어내지 않는다(OD-5): 출생 시각을 모르면 섹트는
없음(null) — 정오 앵커의 태양은 거의 늘 낮이다. 시각은 알고 출생지만 모르면 존 기준점의 태양 고도로
정하되 |고도| < 3° 면 없음. 섹트가 없으면 삼분성은 참여(participating) 지배성만 세고, lot·ZR 은 쓰지
않으며, 리포트의 음양 리듬 교차 행은 빠진다.

## 구현 위치 (SSOT)

- 표준 값: [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)
- 차트/하우스: [`src/lib/astrology/foundation/astrologyService.ts`](../../src/lib/astrology/foundation/astrologyService.ts)
- 출생 차트·시너스트리 어스펙트 orb(moiety)/각도: [`src/lib/astrology/foundation/aspects.ts`](../../src/lib/astrology/foundation/aspects.ts)
- 트랜짓 어스펙트 orb(`TRANSIT_ORBS × PLANET_ORB_MULTIPLIER`): [`src/lib/astrology/foundation/transit.ts`](../../src/lib/astrology/foundation/transit.ts) — 위 표
- 디그니티/알무텐: [`src/lib/astrology/foundation/dignities.ts`](../../src/lib/astrology/foundation/dignities.ts), [`almutenFiguris.ts`](../../src/lib/astrology/foundation/almutenFiguris.ts)
- 하우스·극권 폴백: [`src/lib/astrology/foundation/houses.ts`](../../src/lib/astrology/foundation/houses.ts)

## 심화 문서

- [계산 스펙](../CALCULATION_SPEC.md) · [점성 감사](../AUDIT_ASTRO.md) · [태양시 정책 — 평균태양시, 균시차 미적용](../SOLAR_TIME_CONVENTION.md)

## 사용처

이 교리를 소비하는 서비스: [[destiny-counselor|운명 상담사]]

> TODO(교리 산문): 출생 차트 moiety orb 값·디그니티 가중치의 "왜"를 여기로 끌어와 사주
> 교리와 서술 깊이를 맞춘다(트랜짓 orb 표는 위 자동 섹션).
