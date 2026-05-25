import { careerDeepRules } from './career-deep'
import { classicalRules } from './classical'
import { extraRules } from './extras'
import { familyDeepRules } from './family-deep'
import { healthRules } from './health'
import { jonggyeokFineRules } from './jonggyeok-fine'
import { loveDeepRules } from './love-deep'
import { moneyDeepRules } from './money-deep'
import { relationRules } from './relation'
import { sectionDomainRules } from './section-domains'
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
  ...jonggyeokFineRules,
  ...sectionDomainRules,
]

export {
  stateRules,
  relationRules,
  timingRules,
  extraRules,
  healthRules,
  classicalRules,
  careerDeepRules,
  loveDeepRules,
  moneyDeepRules,
  familyDeepRules,
  jonggyeokFineRules,
  sectionDomainRules,
}
