---
title: 사주 교리 (Saju Doctrine)
tags: [doctrine, saju]
status: living
aliases: [명리, Saju]
---

# 🀄 사주 교리 (Saju Doctrine)

> 명리학(자평파) 계산 노선. 상세 교리 원문은 코드 옆 canonical 문서에 있습니다.

## 핵심 선택

- **학파:** 자평파 (子平派)
- **년·월주·대운수:** 생 UT 출생 instant 를 절입 instant 와 비교 (OD-1). 절입표는 Swiss Ephemeris
  (KASI 와 분 단위 일치), 지원 범위 **1900–2050**.
- **일주:** 출생지 timezone 의 민용일(입력한 날짜) 자정, JDN — KST 자정도 경도 보정도 아님.
- **시주:** 평균태양시(UT + 경도 × 4분). 경도 미상은 출생 타임존의 기준 경도(서울 126.978).
- **시간 미상:** 삼주(년·월·일) 분석 — 정오 앵커는 날짜 고정용, 시주를 만들지 않는다.
- **대운:** 양남음녀 순행, 시작 나이 = 절입까지 일수 ÷ 3 내림(최소 1), 첫 대운 전에는 현재 대운 없음.
- 표준 값(기준 시간대·대운 라운딩 등): [[calculation-standards|계산 표준]] ⚙️

## Canonical 원문 (SSOT)

- 📜 **[사주 CONVENTIONS (전문)](../../src/lib/saju/CONVENTIONS.md)** — 자시·입춘·일주·시주·지장간·십신·신살·격국·용신·강약·대운 전체 교리
- 📐 [태양시 정책](../SOLAR_TIME_CONVENTION.md) · [계산 스펙](../CALCULATION_SPEC.md)
- 관계표(합·충·파·해·원진·방합): [`src/lib/saju/relationTables.ts`](../../src/lib/saju/relationTables.ts) · 형(刑): [`src/lib/saju/hyeong.ts`](../../src/lib/saju/hyeong.ts) `isHyeong`
- 신살: [`src/lib/saju/shinsal.ts`](../../src/lib/saju/shinsal.ts)

## 심화 문서

- [사주 감사](../AUDIT_SAJU.md)

## 사용처

이 교리를 소비하는 서비스: [[destiny-counselor|운명 상담사]]
