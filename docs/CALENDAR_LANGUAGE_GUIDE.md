# Calendar Language Guide

Last audited: 2026-03-17 (Asia/Hong_Kong)

This document defines the user-facing language for the calendar service.

## Goal

Calendar copy must explain:

- what kind of day it is
- what to do now
- what to avoid
- why the recommendation exists

It must not expose internal engine wording.

## Core Principle

Translate engine state into action language.

- Internal: engine labels, strategy ratios, phase codes, layer labels
- User-facing: daily flow, execution room, check points, caution, timing

## Approved Grade Labels

Use these five labels consistently across UI, API summaries, details, and action plans.

| Grade | Korean | English | Meaning |
| --- | --- | --- | --- |
| 0 | `실행 우선` | `Execute-first` | Strong day to move a key task |
| 1 | `활용 우선` | `Leverage-first` | Good day if you keep one verification step |
| 2 | `운영 우선` | `Operate-first` | Better for routine, cleanup, maintenance |
| 3 | `검토 우선` | `Review-first` | Slow down, re-check, split decisions |
| 4 | `조정 우선` | `Adjust-first` | Reduce scope, stabilize, manage downside |

## Approved Meta Labels

| Use case | Korean | English |
| --- | --- | --- |
| top thesis label | `오늘 흐름 요약` | `Daily flow summary` |
| phase label | `흐름` | `Flow` |
| focus label | `핵심 분야` | `Focus` |
| reliability label | `신뢰` | `Reliability` |
| recommendation section | `지금 할 것` | `Do now` |
| caution section | `주의할 것` | `Watch` |
| timing section | `좋은 시간` | `Best time` |
| evidence section | `이렇게 읽은 이유` | `Why it reads this way` |

## Forbidden Terms

Do not show these directly to users unless they are hidden in internal logs.

- `공격`
- `방어`
- `국면`
- `레이어 0`
- `레이어 1`
- `defensive`
- `protect-first`
- `strong defensive window`
- `matrix verdict`
- `topAnchorSummary`

## Required Replacements

| Internal wording | Replace with |
| --- | --- |
| `공격 52% / 방어 48%` | `실행 여력 52% / 안정 관리 48%` |
| `방어/재정렬 국면` | `정비 우선 흐름` |
| `공격/확장 국면` | `추진 우선 흐름` |
| `레이어 0` | `핵심 조건` |
| `레이어 1` | `보조 조건` |
| `방어 우선` | `조정 우선` |
| `검토/방어일` | `검토/조정일` |

## Sentence Style Rules

1. Lead with one conclusion.
2. Mention one reason.
3. End with one action.
4. Avoid two or more abstract nouns in the same sentence.
5. Prefer verbs users can act on today.

## Good Pattern

`오늘은 직장 흐름이 완전히 나쁘진 않지만, 무리하게 넓히면 흔들릴 수 있습니다. 그래서 중요한 일 1건만 먼저 끝내세요.`

Structure:

- flow
- limit
- action

## Bad Pattern

`방어/재정렬 국면입니다. 공격 52% / 방어 48%로 손실 방지와 재정비를 우선하세요. 레이어 0 신호는 실행 조건을 조정하라는 의미입니다.`

Why bad:

- engine state leaks directly
- user does not know what to do next
- too many abstract terms

## Canonical Copy Templates

### 1. Daily Thesis

`오늘은 [핵심 분야]에서 [흐름 설명]. 그래서 [행동 1개]에 집중하세요.`

Examples:

- `오늘은 직장 흐름에서 속도보다 확인이 더 중요합니다. 그래서 핵심 업무 1건만 먼저 마무리하세요.`
- `오늘은 재정 흐름이 무난한 편입니다. 그래서 큰 베팅보다 정리와 비교 검토에 집중하세요.`

### 2. Caution

`지금은 [위험 요소]가 커지기 쉬워 [금지 행동]보다 [안전 행동]이 낫습니다.`

Examples:

- `지금은 오해가 커지기 쉬워 즉답보다 한 번 더 확인하는 편이 낫습니다.`
- `지금은 변동성이 있어 새 계약보다 조건 점검이 우선입니다.`

### 3. Cross-evidence

`[핵심 분야] 해석에서 신호가 완전히 겹치지 않아, 오늘은 확정보다 재확인이 더 중요합니다.`

or

`[핵심 분야] 해석에서 신호가 비교적 같은 방향을 가리켜 핵심 흐름은 안정적으로 읽힙니다.`

## Tone Guardrails

- no fortune-teller exaggeration
- no pseudo-military wording
- no engine jargon
- no repeated summary/detail duplication
- no direct raw evidence dump when a sentence can summarize it

## Implementation Rule

If a new engine field is added, it must either:

- map to an approved label in this document, or
- stay internal and never render directly

## Priority Files

When calendar wording changes, audit these first:

- `src/app/api/calendar/lib/helpers.ts`
- `src/app/api/calendar/lib/constants.ts`
- `src/app/api/calendar/lib/presentationAdapter.ts`
- `src/app/api/calendar/action-plan/route.ts`
- `src/components/calendar/SelectedDatePanel.tsx`
- `src/components/calendar/CalendarActionPlanView.tsx`
- `src/components/calendar/CalendarMainView.tsx`
