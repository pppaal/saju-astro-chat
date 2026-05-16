import type { ActiveSignal, CalendarCell, SignalPattern } from '../types'
import type { NatalContext } from '../context/types'
import type {
  Interpretation,
  InterpretationRule,
  RuleConditions,
  TemplateVars,
} from './types'
import { RULES } from './rules'

/**
 * 신호 다발 + 본명 컨텍스트 → 자연스러운 narrative.
 *
 * 1. 모든 룰을 conditions로 필터링
 * 2. 매칭된 룰별 변수 컨텍스트 수집
 * 3. 우선순위 desc로 정렬, section별 중복 제거
 * 4. 템플릿 변수 치환
 * 5. section별로 합쳐서 narrative 출력
 */
export function buildInterpretation(args: {
  natal: NatalContext
  cells: CalendarCell[]
  scope?: 'monthly' | 'yearly' | 'daily' | 'lifetime'
}): Interpretation {
  const { natal, cells, scope = 'monthly' } = args

  // 모든 셀에서 신호 + 패턴 합치기
  const allSignals = cells.flatMap((c) => c.signals)
  const allPatterns = cells.flatMap((c) => c.matchedPatterns)
  // 길일/흉일 후보
  const ranked = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)
  const luckyDates = ranked.slice(0, 3).map((c) => c.datetime.slice(5, 10)).join(', ')
  const unluckyDates = ranked.slice(-3).reverse().map((c) => c.datetime.slice(5, 10)).join(', ')

  // 룰 매칭 + 변수 컨텍스트 수집
  const matched: Array<{ rule: InterpretationRule; vars: TemplateVars }> = []
  for (const rule of RULES) {
    if (rule.scope !== scope) continue
    const ctx = findMatchContext(rule.conditions, allSignals, allPatterns, natal)
    if (!ctx) continue
    matched.push({
      rule,
      vars: {
        ...buildBaseVars(natal),
        ...ctx,
        luckyDates,
        unluckyDates,
      },
    })
  }

  // 우선순위 desc 정렬 + section별 첫 매칭만 (중복 방지)
  matched.sort((a, b) => b.rule.priority - a.rule.priority)
  const usedSections = new Set<string>()
  const picked: typeof matched = []
  for (const m of matched) {
    if (usedSections.has(m.rule.section)) continue
    picked.push(m)
    usedSections.add(m.rule.section)
  }

  // section별 정렬 (UI 순서)
  const SECTION_ORDER = [
    'daeun', 'seun', 'wolun',
    'transit', 'pattern',
    'theme-money', 'theme-career', 'theme-love', 'theme-health', 'theme-study',
    'shinsal',
  ]
  picked.sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.rule.section)
    const bi = SECTION_ORDER.indexOf(b.rule.section)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  // 템플릿 채우기
  const sections = picked.map((m) => ({
    section: m.rule.section,
    title: sectionTitle(m.rule.section),
    text: fillTemplate(m.rule.template, m.vars),
  }))

  const narrative = sections
    .map((s) => `**[${s.title}]**\n${s.text}`)
    .join('\n\n')

  return {
    narrative,
    matchedRuleIds: picked.map((m) => m.rule.id),
    sections,
  }
}

// ─── 매칭 로직 ───
function findMatchContext(
  cond: RuleConditions,
  signals: ActiveSignal[],
  patterns: SignalPattern[],
  natal: NatalContext,
): TemplateVars | null {
  // 본명 조건
  if (cond.natalStrength && !cond.natalStrength.includes(natal.saju.strength)) {
    return null
  }
  if (cond.yongsin && !cond.yongsin.includes(natal.saju.yongsin.primary)) {
    return null
  }

  // 패턴 조건
  if (cond.patternId) {
    const pat = patterns.find((p) => cond.patternId!.includes(p.id))
    if (!pat) return null
    const count = patterns.filter((p) => p.id === pat.id).length
    return {
      patternName: pat.name,
      count,
    }
  }

  // 신호 조건 — 첫 매칭 신호의 컨텍스트 반환
  const matchingSignal = signals.find((s) => signalMatches(s, cond))
  if (!matchingSignal) return null

  return extractSignalVars(matchingSignal, signals)
}

function signalMatches(s: ActiveSignal, cond: RuleConditions): boolean {
  if (cond.signalSource && s.source !== cond.signalSource) return false
  if (cond.signalKinds && !cond.signalKinds.includes(s.kind)) return false
  if (cond.signalLayer && !cond.signalLayer.includes(s.layer as 'decadal' | 'yearly' | 'monthly' | 'daily')) return false
  if (cond.minPolarity != null && s.polarity < cond.minPolarity) return false
  if (cond.maxPolarity != null && s.polarity > cond.maxPolarity) return false

  // 사주 디테일
  if (cond.sibsin) {
    const sib = s.evidence.sibsin as string | undefined
    if (!sib || !cond.sibsin.includes(sib as never)) return false
  }
  if (cond.shinsalName) {
    const sh = s.evidence.shinsalName as string | undefined
    if (!sh || !cond.shinsalName.includes(sh)) return false
  }

  // 점성 디테일
  if (cond.planet) {
    const planets = s.evidence.planets ?? []
    if (!cond.planet.some((p) => planets.includes(p))) return false
  }
  if (cond.dignity) {
    const dig = (s.evidence.detail as { dignity?: string } | undefined)?.dignity
    if (!dig || !cond.dignity.includes(dig as never)) return false
  }
  if (cond.sign) {
    const sg = (s.evidence.detail as { sign?: string } | undefined)?.sign
    if (!sg || !cond.sign.includes(sg)) return false
  }

  return true
}

function extractSignalVars(s: ActiveSignal, allSignals: ActiveSignal[]): TemplateVars {
  const vars: TemplateVars = {}
  const detail = s.evidence.detail as Record<string, unknown> | undefined
  const ganji = (s.evidence.pillars?.[0] ?? '').trim()

  if (ganji) vars.ganji = ganji
  if (s.layer === 'decadal') vars.daeunGanji = ganji
  if (s.layer === 'yearly') vars.yearGanji = ganji
  if (s.layer === 'monthly') vars.monthGanji = ganji

  const sibsin = s.evidence.sibsin as string | undefined
  if (sibsin) {
    vars.sibsin = sibsin
    if (s.layer === 'decadal') vars.daeunSibsin = sibsin
    if (s.layer === 'yearly') vars.yearSibsin = sibsin
    if (s.layer === 'monthly') vars.monthSibsin = sibsin
  }

  if (s.evidence.shinsalName) vars.shinsalName = s.evidence.shinsalName
  if (s.evidence.planets?.[0]) vars.planet = s.evidence.planets[0]
  if (detail?.sign) vars.sign = String(detail.sign)
  if (detail?.dignity) vars.dignity = String(detail.dignity)

  // 같은 kind 같은 detail 시간 묶기 (duration)
  const sameKind = allSignals.filter((x) => x.id !== s.id && x.kind === s.kind && x.name === s.name)
  if (sameKind.length > 0 || s.active.start !== s.active.end) {
    vars.duration = `${s.active.start.slice(5, 10)} ~ ${s.active.end.slice(5, 10)}`
  }

  return vars
}

function buildBaseVars(natal: NatalContext): TemplateVars {
  return {
    natalDayMaster: natal.saju.dayMaster.name,
    natalStrength: natal.saju.strength,
    primaryYongsin: natal.saju.yongsin.primary,
    yongsinElement: natal.saju.yongsin.primary,
  }
}

function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => {
    const v = vars[key as keyof TemplateVars]
    if (v == null) return m   // 변수 없으면 원본 그대로 (디버그 용이)
    return String(v)
  })
}

function sectionTitle(section: string): string {
  const map: Record<string, string> = {
    daeun: '대운 흐름',
    seun: '올해의 운',
    wolun: '이번 달',
    transit: '주요 트랜짓',
    pattern: '매칭 패턴',
    'theme-money': '재물',
    'theme-career': '직업',
    'theme-love': '연애',
    'theme-health': '건강',
    'theme-study': '학업',
    'theme-travel': '이동',
    shinsal: '신살',
  }
  return map[section] ?? section
}
