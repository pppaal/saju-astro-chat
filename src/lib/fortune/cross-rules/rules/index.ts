import { relationRules } from './relation'
import { stateRules } from './state'
import { timingRules } from './timing'
import type { Rule } from '../types'

export const allRules: Rule[] = [...stateRules, ...relationRules, ...timingRules]

export { stateRules, relationRules, timingRules }
