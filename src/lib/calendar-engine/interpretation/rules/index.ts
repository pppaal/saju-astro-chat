/**
 * Interpretation rule registry — split by category for maintainability.
 *
 * 카테고리별 파일에서 룰 배열을 import 한 뒤 단일 `RULES` 로 합치고
 * `RULES_BY_ID` 맵을 노출합니다. 외부 import 경로는 종전 `./rules` 그대로
 * 동작합니다 (디렉터리 + index.ts 패턴).
 *
 * 룰 추가/수정은 해당 카테고리 파일에서 진행하세요.
 */
import type { InterpretationRule } from '../types'

import { RULES_DAEUN } from './daeun'
import { RULES_SEUN } from './seun'
import { RULES_WOLUN } from './wolun'
import { RULES_TODAY } from './today'
import { RULES_SHINSAL } from './shinsal'
import { RULES_ASTRO } from './astro'
import { RULES_NATAL } from './natal'
import { RULES_PATTERNS } from './patterns'
import { RULES_ALIGNMENT } from './alignment'
import { RULES_CROSS } from './cross'

export const RULES: InterpretationRule[] = [
  ...RULES_DAEUN,
  ...RULES_SEUN,
  ...RULES_WOLUN,
  ...RULES_TODAY,
  ...RULES_SHINSAL,
  ...RULES_ASTRO,
  ...RULES_NATAL,
  ...RULES_PATTERNS,
  ...RULES_ALIGNMENT,
  ...RULES_CROSS,
]

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
