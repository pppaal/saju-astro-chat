// src/types/destinypal/index.ts
//
// destinypal tier UI prop 타입 barrel.
//
// 사용 예:
//   import type { DestinyUserSummary, DestinyDay } from '@/types/calendar'
//
// tier 레이어 (월/일/인생 전체만 — 10년 대운·1년 세운 티어는 제거됨. 대운/세운
// *데이터*는 lifetime(인생 전체)이 내부에서 소비: lifetime.ts 의 DestinyDecadeCross·
// DestinyThisYear):
//   life     ← user.ts        (DestinyUserSummary)
//   lifetime ← lifetime.ts    (DestinyLifetime — daewoon/stages/milestones/ZR)
//   month    ← month.ts       (DestinyMonth    — 30일 캘린더/themes/converge)
//   day      ← day.ts         (DestinyDay      — iljin/score/themes/누락 5신호)
// shared.ts — Ganji / LayerTag / DestinySignal / NarrativeChip 등 공통.

export * from './shared'
export * from './user'
export * from './lifetime'
export * from './month'
export * from './day'
