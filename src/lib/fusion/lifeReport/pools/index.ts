// src/lib/fusion/lifeReport/pools/index.ts
// Barrel — see each pool file for design notes.

export { pickVariation, pickVariationOr, appendToPara } from './pickerDeterministic'
export { twelveStagePool, type TwelveStageDomain } from './twelveStagePool'
export {
  sibsinPool,
  sibsinCategoryPool,
  type SibsinDomain,
} from './sibsinPool'
export { planetSignPool, type PlanetSignDomain } from './planetSignPool'
export { iljuPool, getIljuArchetype, type IljuDomain } from './iljuPool'
