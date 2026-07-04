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
- **노드:** True Node
- **좌표계:** Tropical (회귀황도)

## 구현 위치 (SSOT)

- 표준 값: [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)
- 차트/하우스: [`src/lib/astrology/foundation/astrologyService.ts`](../../src/lib/astrology/foundation/astrologyService.ts)
- 어스펙트 orb/각도: [`src/lib/astrology/foundation/aspects.ts`](../../src/lib/astrology/foundation/aspects.ts)
- 디그니티/알무텐: [`src/lib/astrology/foundation/dignities.ts`](../../src/lib/astrology/foundation/dignities.ts), [`almutenFiguris.ts`](../../src/lib/astrology/foundation/almutenFiguris.ts)

## 심화 문서

- [계산 스펙](../CALCULATION_SPEC.md) · [점성 감사](../AUDIT_ASTRO.md) · [태양시 정책 — 평균태양시, 균시차 미적용](../SOLAR_TIME_CONVENTION.md)

## 사용처

이 교리를 소비하는 서비스: [[destiny-counselor|운명 상담사]]

> TODO(교리 산문): orb 값·디그니티 가중치의 "왜"를 여기로 끌어와 사주 교리와
> 서술 깊이를 맞춘다.
