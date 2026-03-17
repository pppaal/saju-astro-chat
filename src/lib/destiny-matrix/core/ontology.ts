import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'

export type SemanticAxis =
  | 'retreat'
  | 'meaning'
  | 'selective_distance'
  | 'visibility'
  | 'structure'
  | 'resource_flow'
  | 'bonding'
  | 'mobility'
  | 'recovery'
  | 'deep_work'
  | 'verification'
  | 'expansion'
  | 'pressure'
  | 'discipline'
  | 'transition'

export type OntologySourceKind =
  | 'shinsal'
  | 'transit'
  | 'geokguk'
  | 'yongsin'
  | 'day_master'
  | 'pillar_element'
  | 'dominant_element'
  | 'sibsin'
  | 'twelve_stage'
  | 'relation'
  | 'planet_house'
  | 'planet_sign'
  | 'aspect'
  | 'asteroid_house'
  | 'extra_point'
  | 'advanced_astro'
  | 'cycle'
  | 'snapshot'

export interface OntologyToken {
  id: string
  sourceKind: OntologySourceKind
  sourceValue: string
  domainHints: SignalDomain[]
  axes: SemanticAxis[]
  weight: number
  role: 'core' | 'modulator' | 'ornamental'
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function pickRole(weight: number): OntologyToken['role'] {
  if (weight >= 0.7) return 'core'
  if (weight >= 0.46) return 'modulator'
  return 'ornamental'
}

const SIGN_AXES: Record<string, SemanticAxis[]> = {
  Aries: ['visibility', 'pressure', 'expansion'],
  Taurus: ['structure', 'resource_flow', 'discipline'],
  Gemini: ['verification', 'transition', 'bonding'],
  Cancer: ['recovery', 'bonding', 'meaning'],
  Leo: ['visibility', 'meaning', 'expansion'],
  Virgo: ['verification', 'discipline', 'deep_work'],
  Libra: ['bonding', 'verification', 'resource_flow'],
  Scorpio: ['deep_work', 'pressure', 'transition'],
  Sagittarius: ['expansion', 'meaning', 'mobility'],
  Capricorn: ['discipline', 'structure', 'verification'],
  Aquarius: ['transition', 'meaning', 'verification'],
  Pisces: ['retreat', 'meaning', 'recovery'],
}

const ELEMENT_AXES: Record<string, SemanticAxis[]> = {
  목: ['expansion', 'transition'],
  화: ['visibility', 'meaning'],
  토: ['structure', 'discipline'],
  금: ['verification', 'deep_work'],
  수: ['recovery', 'resource_flow'],
  fire: ['visibility', 'expansion', 'meaning'],
  earth: ['structure', 'discipline', 'resource_flow'],
  air: ['verification', 'transition', 'bonding'],
  water: ['recovery', 'meaning', 'bonding'],
}

const SIBSIN_ONTOLOGY: Record<string, { domains: SignalDomain[]; axes: SemanticAxis[]; weight: number }> = {
  비견: { domains: ['personality', 'relationship'], axes: ['bonding', 'visibility'], weight: 0.48 },
  겁재: { domains: ['wealth', 'relationship'], axes: ['pressure', 'resource_flow'], weight: 0.48 },
  식신: { domains: ['career', 'health'], axes: ['expansion', 'recovery'], weight: 0.54 },
  상관: { domains: ['career', 'relationship'], axes: ['visibility', 'pressure', 'verification'], weight: 0.56 },
  편재: { domains: ['wealth', 'career'], axes: ['resource_flow', 'expansion'], weight: 0.62 },
  정재: { domains: ['wealth', 'career'], axes: ['resource_flow', 'structure'], weight: 0.6 },
  편관: { domains: ['career', 'health'], axes: ['pressure', 'discipline'], weight: 0.58 },
  정관: { domains: ['career', 'relationship'], axes: ['structure', 'discipline', 'verification'], weight: 0.58 },
  편인: { domains: ['spirituality', 'personality'], axes: ['retreat', 'deep_work'], weight: 0.5 },
  정인: { domains: ['personality', 'health'], axes: ['meaning', 'recovery', 'structure'], weight: 0.5 },
}

const TWELVE_STAGE_ONTOLOGY: Record<string, { domains: SignalDomain[]; axes: SemanticAxis[]; weight: number }> = {
  장생: { domains: ['timing', 'health'], axes: ['recovery', 'expansion'], weight: 0.48 },
  목욕: { domains: ['relationship', 'personality'], axes: ['bonding', 'visibility'], weight: 0.42 },
  관대: { domains: ['career', 'personality'], axes: ['visibility', 'structure'], weight: 0.5 },
  건록: { domains: ['career', 'wealth'], axes: ['structure', 'resource_flow'], weight: 0.54 },
  제왕: { domains: ['career', 'timing'], axes: ['visibility', 'pressure', 'expansion'], weight: 0.56 },
  쇠: { domains: ['health', 'timing'], axes: ['recovery', 'verification'], weight: 0.44 },
  병: { domains: ['health', 'timing'], axes: ['pressure', 'recovery'], weight: 0.46 },
  사: { domains: ['timing', 'relationship'], axes: ['retreat', 'verification'], weight: 0.42 },
  묘: { domains: ['timing', 'spirituality'], axes: ['retreat', 'meaning'], weight: 0.4 },
  절: { domains: ['timing', 'move'], axes: ['transition', 'verification'], weight: 0.44 },
  태: { domains: ['timing', 'health'], axes: ['recovery', 'meaning'], weight: 0.42 },
  양: { domains: ['timing', 'career'], axes: ['transition', 'expansion'], weight: 0.44 },
}

export function mapShinsalOntology(shinsal: string): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const raw = String(shinsal || '')
  if (/화개|í™”ê°œ|華蓋/i.test(raw)) {
    return {
      domainHints: ['spirituality', 'relationship', 'personality'],
      axes: ['retreat', 'meaning', 'selective_distance', 'deep_work'],
      weight: 0.62,
      role: 'modulator',
    }
  }
  if (/역마|ì—­ë§ˆ|驛馬/i.test(raw)) {
    return {
      domainHints: ['move', 'career', 'timing'],
      axes: ['mobility', 'transition', 'expansion'],
      weight: 0.66,
      role: 'modulator',
    }
  }
  if (/도화|홍염|ë„í™”|í™ì—¼/i.test(raw)) {
    return {
      domainHints: ['relationship', 'personality'],
      axes: ['bonding', 'visibility'],
      weight: 0.58,
      role: 'modulator',
    }
  }
  if (/천을귀인|태극귀인|문창귀인|학당귀인|금여록|암록|건록|제왕|ì²œì„ê·€ì¸|íƒœê·¹ê·€ì¸|ë¬¸ì°½ê·€ì¸|í•™ë‹¹ê·€ì¸|ê¸ˆì—¬ë¡|ì•”ë¡|ê±´ë¡|ì œì™•/i.test(raw)) {
    return {
      domainHints: ['career', 'wealth', 'personality'],
      axes: ['expansion', 'structure', 'meaning'],
      weight: 0.64,
      role: 'modulator',
    }
  }
  if (/백호|망신|고신|괴강|현침|귀문관|병부|상문|ë°±í˜¸|ë§ì‹ |ê³ ì‹ |ê´´ê°•|í˜„ì¹¨|ê·€ë¬¸ê´€|ë³‘ë¶€|ìƒë¬¸/i.test(raw)) {
    return {
      domainHints: ['health', 'relationship', 'timing'],
      axes: ['pressure', 'verification', 'recovery'],
      weight: 0.61,
      role: 'modulator',
    }
  }
  return {
    domainHints: ['personality'],
    axes: ['meaning'],
    weight: 0.35,
    role: 'ornamental',
  }
}

export function mapElementOntology(
  sourceKind: 'day_master' | 'pillar_element' | 'dominant_element',
  element: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const axes = ELEMENT_AXES[String(element)] || ['meaning']
  const domainHints: SignalDomain[] =
    sourceKind === 'dominant_element'
      ? ['personality', 'relationship', 'health']
      : sourceKind === 'day_master'
        ? ['personality', 'career', 'health']
        : ['personality', 'career', 'wealth']
  const weight = sourceKind === 'day_master' ? 0.74 : sourceKind === 'dominant_element' ? 0.6 : 0.42
  const tunedWeight = sourceKind === 'pillar_element' ? 0.5 : weight
  return {
    domainHints,
    axes,
    weight: tunedWeight,
    role: pickRole(tunedWeight),
  }
}

export function mapSibsinOntology(
  sibsin: string,
  magnitude: number
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const mapped = SIBSIN_ONTOLOGY[String(sibsin)] || {
    domains: ['personality'] as SignalDomain[],
    axes: ['meaning'] as SemanticAxis[],
    weight: 0.38,
  }
  const weight = Math.min(mapped.weight + Math.min(magnitude, 4) * 0.04, 0.82)
  return {
    domainHints: mapped.domains,
    axes: mapped.axes,
    weight,
    role: pickRole(weight),
  }
}

export function mapTwelveStageOntology(
  stage: string,
  magnitude: number
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const mapped = TWELVE_STAGE_ONTOLOGY[String(stage)] || {
    domains: ['timing'] as SignalDomain[],
    axes: ['transition'] as SemanticAxis[],
    weight: 0.36,
  }
  const weight = Math.min(mapped.weight + 0.06 + Math.min(magnitude, 3) * 0.03, 0.8)
  return {
    domainHints: mapped.domains,
    axes: mapped.axes,
    weight,
    role: pickRole(weight),
  }
}

export function mapRelationOntology(
  relation: MatrixCalculationInput['relations'][number]
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const raw = `${String((relation as any)?.kind || '')}:${String((relation as any)?.detail || '')}:${String((relation as any)?.note || '')}`.toLowerCase()
  if (/harmony|합|yukhap|samhap|banghap/.test(raw)) {
    return {
      domainHints: ['relationship', 'career', 'wealth'],
      axes: ['bonding', 'expansion', 'resource_flow'],
      weight: 0.58,
      role: 'modulator',
    }
  }
  if (/clash|충|hyeong|pa|hae|wonjin|tension/.test(raw)) {
    return {
      domainHints: ['relationship', 'timing', 'health'],
      axes: ['pressure', 'verification', 'transition'],
      weight: 0.6,
      role: 'modulator',
    }
  }
  return {
    domainHints: ['timing', 'relationship'],
    axes: ['transition', 'meaning'],
    weight: 0.42,
    role: 'ornamental',
  }
}

export function mapTransitOntology(transit: NonNullable<MatrixCalculationInput['activeTransits']>[number]): Pick<
  OntologyToken,
  'domainHints' | 'axes' | 'weight' | 'role'
> {
  if (transit === 'jupiterReturn' || transit === 'nodeReturn') {
    return {
      domainHints: ['career', 'wealth', 'timing'],
      axes: ['expansion', 'transition'],
      weight: 0.78,
      role: 'core',
    }
  }
  if (
    transit === 'saturnReturn' ||
    transit === 'uranusSquare' ||
    transit === 'neptuneSquare' ||
    transit === 'plutoTransit'
  ) {
    return {
      domainHints: ['career', 'relationship', 'health', 'timing'],
      axes: ['pressure', 'verification', 'transition', 'discipline'],
      weight: 0.82,
      role: 'core',
    }
  }
  if (
    transit === 'mercuryRetrograde' ||
    transit === 'venusRetrograde' ||
    transit === 'marsRetrograde' ||
    transit === 'jupiterRetrograde' ||
    transit === 'saturnRetrograde'
  ) {
    return {
      domainHints: ['timing', 'relationship', 'wealth', 'move'],
      axes: ['verification', 'retreat', 'pressure'],
      weight: 0.63,
      role: 'modulator',
    }
  }
  return {
    domainHints: ['timing'],
    axes: ['transition'],
    weight: 0.55,
    role: 'modulator',
  }
}

export function mapAdvancedAstroOntology(
  key: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const normalized = String(key || '').toLowerCase()
  if (
    /fixedstars.*(regulus|spica|aldebaran|fomalhaut)/.test(normalized) ||
    /midpoints.*(sun|mercury|jupiter|saturn|mc)/.test(normalized)
  ) {
    return {
      domainHints: ['career', 'personality', 'timing'],
      axes: ['meaning', 'visibility', 'verification'],
      weight: 0.58,
      role: 'modulator',
    }
  }
  if (
    /fixedstars.*(algol|antares)/.test(normalized) ||
    /midpoints.*(venus|moon|juno|mars|vertex)/.test(normalized)
  ) {
    return {
      domainHints: ['relationship', 'personality', 'timing'],
      axes: ['bonding', 'pressure', 'verification'],
      weight: 0.56,
      role: 'modulator',
    }
  }
  if (/asteroids.*(juno|ceres|pallas|vesta)/.test(normalized)) {
    return {
      domainHints: ['relationship', 'career', 'health'],
      axes: ['bonding', 'deep_work', 'recovery'],
      weight: 0.54,
      role: 'modulator',
    }
  }
  if (/extrapoints.*(chiron|lilith|vertex|partoffortune)/.test(normalized)) {
    return {
      domainHints: ['relationship', 'wealth', 'health', 'timing'],
      axes: ['recovery', 'resource_flow', 'selective_distance', 'transition'],
      weight: 0.54,
      role: 'modulator',
    }
  }
  if (normalized === 'solarreturn' || normalized === 'progressions' || normalized === 'lunarreturn') {
    return {
      domainHints: ['timing', 'career', 'relationship'],
      axes: ['transition', 'verification'],
      weight: 0.7,
      role: 'modulator',
    }
  }
  if (normalized === 'eclipses') {
    return {
      domainHints: ['timing', 'relationship', 'move'],
      axes: ['transition', 'pressure', 'verification'],
      weight: 0.72,
      role: 'modulator',
    }
  }
  if (normalized === 'draconic') {
    return {
      domainHints: ['spirituality', 'personality', 'timing'],
      axes: ['meaning', 'retreat', 'deep_work'],
      weight: 0.52,
      role: 'ornamental',
    }
  }
  if (normalized === 'harmonics') {
    return {
      domainHints: ['personality', 'career', 'relationship'],
      axes: ['deep_work', 'verification', 'meaning'],
      weight: 0.52,
      role: 'ornamental',
    }
  }
  if (normalized === 'asteroids' || normalized === 'extrapoints') {
    return {
      domainHints: ['relationship', 'wealth', 'timing'],
      axes: ['bonding', 'resource_flow', 'transition'],
      weight: 0.48,
      role: 'ornamental',
    }
  }
  if (normalized === 'fixedstars' || normalized === 'midpoints') {
    return {
      domainHints: ['personality', 'spirituality', 'timing'],
      axes: ['meaning', 'deep_work'],
      weight: 0.48,
      role: 'ornamental',
    }
  }
  return {
    domainHints: ['timing'],
    axes: ['transition'],
    weight: 0.46,
    role: 'ornamental',
  }
}

export function mapPlanetHouseOntology(
  planet: string,
  house: number
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const p = String(planet || '').toLowerCase()
  const domainHints: SignalDomain[] =
    house === 10
      ? ['career']
      : house === 7
        ? ['relationship']
        : house === 6
          ? ['health', 'career']
          : house === 9 || house === 12
            ? ['move', 'spirituality']
            : house === 2
              ? ['wealth']
              : ['personality']
  const axes: SemanticAxis[] = []
  if (p === 'saturn') axes.push('structure', 'discipline', 'verification')
  if (p === 'jupiter') axes.push('expansion', 'resource_flow')
  if (p === 'venus') axes.push('bonding', 'resource_flow')
  if (p === 'mars') axes.push('pressure', 'visibility')
  if (p === 'mercury') axes.push('verification', 'deep_work')
  if (p === 'moon') axes.push('recovery', 'bonding')
  if (p === 'sun') axes.push('visibility', 'meaning')
  if (axes.length === 0) axes.push('meaning')
  return {
    domainHints: uniq(domainHints),
    axes: uniq(axes),
    weight: house === 10 || house === 7 || house === 6 ? 0.72 : 0.52,
    role: house === 10 || house === 7 || house === 6 ? 'core' : 'modulator',
  }
}

export function mapPlanetSignOntology(
  planet: string,
  sign: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const p = String(planet || '').toLowerCase()
  const signAxes = SIGN_AXES[String(sign)] || ['meaning']
  const domainHints: SignalDomain[] = ['personality']
  if (/venus|moon|mars/.test(p)) domainHints.push('relationship')
  if (/jupiter|saturn|sun|mercury/.test(p)) domainHints.push('career')
  if (/venus|jupiter|saturn/.test(p)) domainHints.push('wealth')
  if (/moon|saturn/.test(p)) domainHints.push('health')
  if (/uranus|neptune|pluto/.test(p)) domainHints.push('timing', 'spirituality')
  return {
    domainHints: uniq(domainHints),
    axes: uniq(signAxes),
    weight: 0.46,
    role: 'modulator',
  }
}

export function mapAspectOntology(
  type: string,
  planet1: string,
  planet2: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const key = `${planet1}:${planet2}:${type}`.toLowerCase()
  const domains: SignalDomain[] = []
  if (/venus|mars|moon/.test(key)) domains.push('relationship')
  if (/jupiter|saturn|mc|sun/.test(key)) domains.push('career', 'wealth')
  if (/moon|saturn|h6/.test(key)) domains.push('health')
  if (domains.length === 0) domains.push('personality')
  if (/square|opposition/.test(type.toLowerCase())) {
    return {
      domainHints: uniq(domains),
      axes: ['pressure', 'verification'],
      weight: 0.66,
      role: 'modulator',
    }
  }
  return {
    domainHints: uniq(domains),
    axes: ['expansion', 'bonding', 'structure'],
    weight: 0.58,
    role: 'modulator',
  }
}

export function mapCycleOntology(
  cycle: 'daeun' | 'saeun' | 'wolun' | 'ilun',
  element: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const baseWeight = cycle === 'daeun' ? 0.86 : cycle === 'saeun' ? 0.72 : cycle === 'wolun' ? 0.58 : 0.46
  return {
    domainHints: ['timing', 'career', 'relationship', 'wealth', 'health', 'move'],
    axes: ['transition', 'pressure', 'expansion', 'verification', 'meaning'],
    weight: baseWeight + (element ? 0.02 : 0),
    role: cycle === 'daeun' || cycle === 'saeun' ? 'core' : 'modulator',
  }
}

export function mapAsteroidHouseOntology(
  asteroid: string,
  house: number
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const name = String(asteroid || '').toLowerCase()
  const domains: SignalDomain[] =
    name === 'juno'
      ? house === 7 || house === 11
        ? ['relationship']
        : house === 10
          ? ['career', 'relationship']
          : ['relationship', 'personality']
      : name === 'ceres'
        ? house === 6
          ? ['health', 'career']
          : house === 2
            ? ['wealth', 'health']
            : house === 4 || house === 7
              ? ['relationship', 'health']
              : ['health', 'personality']
        : name === 'pallas'
          ? house === 10 || house === 6
            ? ['career']
            : house === 3
              ? ['career', 'personality']
              : ['personality']
          : name === 'vesta'
            ? house === 10
              ? ['career', 'spirituality']
              : house === 6
                ? ['health', 'career']
                : house === 5
                  ? ['spirituality', 'personality']
                  : ['personality']
            : house === 7
              ? ['relationship']
              : house === 10
                ? ['career']
                : house === 2
                  ? ['wealth']
                  : ['personality']
  const axes: SemanticAxis[] =
    name === 'juno'
      ? ['bonding', 'verification', 'structure']
      : name === 'ceres'
        ? ['recovery', 'resource_flow', 'discipline']
        : name === 'pallas'
          ? ['deep_work', 'verification', 'structure']
          : name === 'vesta'
            ? ['deep_work', 'discipline', 'meaning']
            : ['visibility', 'meaning']
  const weight =
    name === 'juno'
      ? house === 7 || house === 11
        ? 0.5
        : 0.44
      : name === 'ceres'
        ? house === 6 || house === 2
          ? 0.48
          : 0.42
        : name === 'pallas'
          ? house === 10 || house === 6 || house === 3
            ? 0.48
            : 0.4
          : name === 'vesta'
            ? house === 10 || house === 6
              ? 0.46
              : 0.4
            : 0.34
  return {
    domainHints: uniq(domains),
    axes: uniq(axes),
    weight,
    role: pickRole(weight),
  }
}

export function mapExtraPointOntology(
  point: string,
  sign: string
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const key = String(point || '').toLowerCase()
  const signAxes = SIGN_AXES[String(sign)] || ['meaning']
  const domains: SignalDomain[] =
    key === 'chiron'
      ? ['health', 'relationship']
      : key === 'lilith'
        ? ['relationship', 'personality']
        : key === 'partoffortune'
          ? ['wealth', 'career']
          : key === 'vertex'
            ? ['relationship', 'move']
            : ['timing', 'spirituality']
  return {
    domainHints: uniq(domains),
    axes: uniq(
      signAxes.concat(key === 'chiron' ? ['recovery'] : key === 'lilith' ? ['selective_distance'] : ['transition'])
    ),
    weight: 0.36,
    role: 'ornamental',
  }
}

export function mapSnapshotOntology(
  source: 'sajuSnapshot' | 'astrologySnapshot' | 'crossSnapshot',
  key: string,
  value: unknown
): Pick<OntologyToken, 'domainHints' | 'axes' | 'weight' | 'role'> {
  const raw = String(key || '').toLowerCase()
  if (source === 'crossSnapshot' && raw.includes('crossagreement') && typeof value === 'number') {
    return {
      domainHints: ['timing', 'relationship', 'wealth'],
      axes: value >= 0.6 ? ['verification', 'bonding'] : ['verification', 'pressure'],
      weight: 0.54,
      role: 'modulator',
    }
  }
  if (source === 'sajuSnapshot' && /(unse|pillars|advancedanalysis|sinsal|facts)/.test(raw)) {
    return {
      domainHints: ['timing', 'career', 'wealth', 'relationship'],
      axes: ['meaning', 'transition', 'verification'],
      weight: 0.32,
      role: 'ornamental',
    }
  }
  if (source === 'sajuSnapshot' && /(daeun|saeun|wolun|iljin|geokguk|yongsin|sibsin|relation|sinsal)/.test(raw)) {
    return {
      domainHints: ['timing', 'career', 'relationship', 'wealth', 'health'],
      axes: ['transition', 'meaning', 'verification'],
      weight: 0.36,
      role: 'ornamental',
    }
  }
  if (source === 'astrologySnapshot' && /(natalchart|natalaspects|transits|advancedastrosignals)/.test(raw)) {
    return {
      domainHints: ['timing', 'personality', 'relationship'],
      axes: ['verification', 'transition', 'deep_work'],
      weight: 0.32,
      role: 'ornamental',
    }
  }
  if (source === 'astrologySnapshot' && /(house|sign|aspect|return|progress|draconic|harmonic|eclipse|midpoint|asteroid|vertex|chiron|lilith)/.test(raw)) {
    return {
      domainHints: ['timing', 'personality', 'relationship', 'career'],
      axes: ['verification', 'transition', 'meaning'],
      weight: 0.34,
      role: 'ornamental',
    }
  }
  if (source === 'crossSnapshot' && /(driver|caution|domainscore|crossevidence|category|source)/.test(raw)) {
    return {
      domainHints: ['timing', 'career', 'relationship', 'wealth', 'health', 'move'],
      axes: ['verification', 'meaning', 'transition'],
      weight: 0.34,
      role: 'ornamental',
    }
  }
  if (/(birthcity|timezone|housesystem|analysisat|currentdateiso|startyearmonth)/.test(raw)) {
    return {
      domainHints: ['timing', 'move'],
      axes: ['verification', 'transition'],
      weight: 0.22,
      role: 'ornamental',
    }
  }
  return {
    domainHints: ['timing'],
    axes: ['meaning'],
    weight: 0.2,
    role: 'ornamental',
  }
}
