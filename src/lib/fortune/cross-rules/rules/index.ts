import { classicalRules } from './classical'
import { extraRules } from './extras'
import { healthRules } from './health'
import { relationRules } from './relation'
import { stateRules } from './state'
import { timingRules } from './timing'
import type { Rule } from '../types'

export const allRules: Rule[] = [
  ...stateRules,
  ...relationRules,
  ...timingRules,
  ...extraRules,
  ...healthRules,
  ...classicalRules,
]

export { stateRules, relationRules, timingRules, extraRules, healthRules, classicalRules }
