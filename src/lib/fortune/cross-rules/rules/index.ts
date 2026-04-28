import { careerDeepRules } from './career-deep'
import { classicalRules } from './classical'
import { extraRules } from './extras'
import { familyDeepRules } from './family-deep'
import { healthRules } from './health'
import { loveDeepRules } from './love-deep'
import { moneyDeepRules } from './money-deep'
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
  ...careerDeepRules,
  ...loveDeepRules,
  ...moneyDeepRules,
  ...familyDeepRules,
]

export { stateRules, relationRules, timingRules, extraRules, healthRules, classicalRules, careerDeepRules, loveDeepRules, moneyDeepRules, familyDeepRules }
