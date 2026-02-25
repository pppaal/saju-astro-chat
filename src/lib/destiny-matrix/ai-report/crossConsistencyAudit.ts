import type { MatrixCalculationInput } from '@/lib/destiny-matrix'
import type { GraphRAGEvidenceBundle } from './graphRagEvidence'

type Mode = 'comprehensive' | 'timing' | 'themed'

export interface CrossConsistencyCheck {
  id: string
  title: string
  pass: boolean
  details: string
}

export interface CrossConsistencyAudit {
  score: number
  passedChecks: number
  failedChecks: number
  mode: Mode
  checks: CrossConsistencyCheck[]
  blockers: string[]
}

const SAJU_REGEX = /사주|오행|십신|대운|세운|월운|일간|격국|용신|saju|bazi|daeun|saeun|sibsin/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜싯|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac|progression/i

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === 'string' ? v : ''))
      .join(' ')
      .trim()
  return ''
}

function collectSectionTexts(report: unknown): string[] {
  const container =
    report && typeof report === 'object' && (report as Record<string, unknown>).sections
      ? ((report as Record<string, unknown>).sections as unknown)
      : report
  if (!container || typeof container !== 'object') return []

  const walk = (node: unknown, out: string[]) => {
    if (!node) return
    if (typeof node === 'string') {
      const t = node.trim()
      if (t) out.push(t)
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, out)
      return
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v, out)
    }
  }

  const out: string[] = []
  walk(container, out)
  return out
}

function round(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function auditCrossConsistency(input: {
  mode: Mode
  matrixInput: MatrixCalculationInput
  report?: unknown
  graphEvidence?: GraphRAGEvidenceBundle | null
}): CrossConsistencyAudit {
  const { mode, matrixInput, report, graphEvidence } = input
  const checks: CrossConsistencyCheck[] = []

  const add = (id: string, title: string, pass: boolean, details: string) => {
    checks.push({ id, title, pass, details })
  }

  const dayMasterValid = ['목', '화', '토', '금', '수'].includes(matrixInput.dayMasterElement)
  add(
    'C01',
    'Day master element is valid',
    dayMasterValid,
    `dayMaster=${matrixInput.dayMasterElement}`
  )

  add(
    'C02',
    'Pillar elements are populated',
    Array.isArray(matrixInput.pillarElements) && matrixInput.pillarElements.length >= 4,
    `pillarElements=${(matrixInput.pillarElements || []).length}`
  )

  const sibsinEntries = Object.entries(matrixInput.sibsinDistribution || {})
  const sibsinTotal = sibsinEntries.reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0)
  add(
    'C03',
    'Sibsin distribution has sufficient density',
    sibsinEntries.length >= 2 && sibsinTotal >= 3,
    `keys=${sibsinEntries.length}, total=${sibsinTotal}`
  )

  add('C04', 'Geokguk exists', !!matrixInput.geokguk, `geokguk=${matrixInput.geokguk || 'N/A'}`)
  add('C05', 'Yongsin exists', !!matrixInput.yongsin, `yongsin=${matrixInput.yongsin || 'N/A'}`)
  add(
    'C06',
    'Timing element exists',
    !!matrixInput.currentDaeunElement || !!matrixInput.currentSaeunElement,
    `daeun=${matrixInput.currentDaeunElement || 'N/A'}, saeun=${matrixInput.currentSaeunElement || 'N/A'}`
  )
  add(
    'C07',
    'Shinsal list is present',
    Array.isArray(matrixInput.shinsalList) && matrixInput.shinsalList.length > 0,
    `shinsalCount=${(matrixInput.shinsalList || []).length}`
  )

  const planetHouseCount = Object.keys(matrixInput.planetHouses || {}).length
  const planetSignCount = Object.keys(matrixInput.planetSigns || {}).length
  add(
    'C08',
    'Planet houses are dense enough',
    planetHouseCount >= 7,
    `planetHouses=${planetHouseCount}`
  )
  add(
    'C09',
    'Planet signs are dense enough',
    planetSignCount >= 7,
    `planetSigns=${planetSignCount}`
  )

  const aspects = Array.isArray(matrixInput.aspects) ? matrixInput.aspects : []
  const aspectsWithOrb = aspects.filter((a) => typeof a.orb === 'number').length
  const aspectsWithAngle = aspects.filter((a) => typeof a.angle === 'number').length
  add('C10', 'Aspect count is sufficient', aspects.length >= 5, `aspects=${aspects.length}`)
  add('C11', 'Aspect orb precision is sufficient', aspectsWithOrb >= 3, `withOrb=${aspectsWithOrb}`)
  add(
    'C12',
    'Aspect angle precision is sufficient',
    aspectsWithAngle >= 2,
    `withAngle=${aspectsWithAngle}`
  )

  add(
    'C13',
    'Dominant western element exists',
    !!matrixInput.dominantWesternElement,
    `dominantWesternElement=${matrixInput.dominantWesternElement || 'N/A'}`
  )

  add(
    'C14',
    'Asteroid houses are present',
    Object.keys(matrixInput.asteroidHouses || {}).length >= 1,
    `asteroidHouses=${Object.keys(matrixInput.asteroidHouses || {}).length}`
  )
  add(
    'C15',
    'Extra points are present',
    Object.keys(matrixInput.extraPointSigns || {}).length >= 1,
    `extraPointSigns=${Object.keys(matrixInput.extraPointSigns || {}).length}`
  )

  const ctx = matrixInput.profileContext || {}
  const ctxPass = !!ctx.birthDate && !!ctx.birthTime && !!ctx.timezone
  add(
    'C16',
    'Profile context is complete enough',
    ctxPass,
    `birthDate=${ctx.birthDate || 'N/A'}, birthTime=${ctx.birthTime || 'N/A'}, timezone=${ctx.timezone || 'N/A'}`
  )

  const sectionTexts = collectSectionTexts(report)
  const crossSentenceCount = sectionTexts.filter(
    (t) => SAJU_REGEX.test(t) && ASTRO_REGEX.test(t)
  ).length
  const crossRatio = sectionTexts.length > 0 ? crossSentenceCount / sectionTexts.length : 0
  add(
    'C17',
    'Report has cross-grounded sections',
    crossRatio >= 0.6,
    `crossSections=${crossSentenceCount}/${sectionTexts.length}`
  )

  const totalChars = sectionTexts.reduce((sum, t) => sum + t.length, 0)
  const minChars = mode === 'comprehensive' ? 2200 : 1400
  add(
    'C18',
    'Report has minimum narrative volume',
    totalChars >= minChars,
    `totalChars=${totalChars}, min=${minChars}`
  )

  const anchors = graphEvidence?.anchors || []
  const anchorTarget = mode === 'comprehensive' ? 10 : 6
  add(
    'C19',
    'GraphRAG anchor coverage is sufficient',
    anchors.length >= anchorTarget,
    `anchors=${anchors.length}, target=${anchorTarget}`
  )

  const totalSets = anchors.reduce((sum, a) => sum + (a.crossEvidenceSets || []).length, 0)
  const anchorsWithSet = anchors.filter((a) => (a.crossEvidenceSets || []).length > 0).length
  add(
    'C20',
    'GraphRAG cross-set density is sufficient',
    totalSets >= anchors.length && anchorsWithSet === anchors.length,
    `totalSets=${totalSets}, anchorsWithSet=${anchorsWithSet}/${anchors.length}`
  )

  const passedChecks = checks.filter((c) => c.pass).length
  const failedChecks = checks.length - passedChecks
  const score = round((passedChecks / checks.length) * 100)

  const blockers = checks
    .filter(
      (c) => !c.pass && ['C01', 'C04', 'C05', 'C08', 'C09', 'C10', 'C19', 'C20'].includes(c.id)
    )
    .map((c) => `${c.id} ${c.title}`)

  return {
    score,
    passedChecks,
    failedChecks,
    mode,
    checks,
    blockers,
  }
}
