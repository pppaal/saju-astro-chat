---
title: 타로 교리 (Tarot Doctrine)
tags: [doctrine, tarot]
status: living
aliases: [Tarot Doctrine]
---

# 🎴 타로 교리 (Tarot Doctrine)

> 우리 타로 서비스의 카드·스프레드·해석 노선. **무엇을 + 왜**.

## 덱 구성

<!-- gen:tarot-deck -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**원천:** [`src/lib/tarot/data/`](../../src/lib/tarot/data/)

- **총 78장** — Major 22 · Minor 56

| Suit        | 장수 |
| ----------- | ---- |
| `cups`      | 14   |
| `major`     | 22   |
| `pentacles` | 14   |
| `swords`    | 14   |
| `wands`     | 14   |

<!-- /gen:tarot-deck -->

## 스프레드 & 비용 노선

- 자리(positions)는 고정 라벨 대신 **LLM 이 질문 맥락에 맞춰 직접 명명**한다
  (동적 스프레드). 자리 의미 데이터는 비워 둠.
- 카드 수 → 크레딧 비용은 단일 룰: 자세한 표는 [[credits|크레딧 & 비용]]
- 스프레드 SSOT: [`src/lib/tarot/tarot-spreads-data.ts`](../../src/lib/tarot/tarot-spreads-data.ts)

## 해석 원칙

- 프롬프트는 deterministic 빌드 + golden test 로 shape 고정
  ([`src/lib/tarot/`](../../src/lib/tarot/) 의 promptBuild)
- 역방향(reversed) 포함, 위기 질문은 안전 메시지로 가드

## 사용처

이 교리를 소비하는 서비스: [[tarot|타로 상담사]]

> TODO(교리 산문): 정/역방향 가중치·메이저/마이너 해석 비중의 "왜" 를 보강한다.
