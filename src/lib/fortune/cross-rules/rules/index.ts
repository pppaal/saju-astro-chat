import { extraRules } from './extras'
import { relationRules } from './relation'
import { stateRules } from './state'
import { timingRules } from './timing'
import type { Rule } from '../types'

export const allRules: Rule[] = [
  ...stateRules,
  ...relationRules,
  ...timingRules,
  ...extraRules,
]

export { stateRules, relationRules, timingRules, extraRules }
