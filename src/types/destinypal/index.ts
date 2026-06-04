// src/types/destinypal/index.ts
//
// destinypal 5-tier UI prop 타입 barrel.
//
// 사용 예:
//   import type { DestinyUserSummary, DestinyDay } from '@/types/destinypal'
//
// 5-tier 레이어:
//   life     ← user.ts        (DestinyUserSummary)
//   lifetime ← lifetime.ts    (DestinyLifetime — daewoon/stages/milestones/ZR)
//   decade   ← decade.ts      (DestinyDecade   — 10년 대운 + 5+5 분리)
//   year     ← year.ts        (DestinyYear     — 세운/Profection wheel)
//   month    ← month.ts       (DestinyMonth    — 30일 캘린더/themes/converge)
//   day      ← day.ts         (DestinyDay      — iljin/score/themes/누락 5신호)
// shared.ts — Ganji / LayerTag / DestinySignal / NarrativeChip 등 공통.

export * from './shared'
export * from './user'
export * from './lifetime'
export * from './decade'
export * from './year'
export * from './month'
export * from './day'
