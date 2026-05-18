import type { ActiveSignal, CalendarCell, SignalPattern } from '../types'
import type { NatalContext } from '../context/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'
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
  // matched[].polarity는 도메인 통합 시 우호·주의 분리에 사용 — 매칭된
  // 첫 시그널의 polarity를 픽업하거나, conditions의 min/max에서 추정.
  const matched: Array<{ rule: InterpretationRule; vars: TemplateVars; polarity: number }> = []
  for (const rule of RULES) {
    if (rule.scope !== scope) continue
    const matchSig = findMatchContextWithSignal(rule.conditions, allSignals, allPatterns, natal)
    if (!matchSig) continue
    matched.push({
      rule,
      vars: {
        ...buildBaseVars(natal),
        ...matchSig.ctx,
        luckyDates,
        unluckyDates,
      },
      polarity: matchSig.polarity,
    })
  }

  // 우선순위 desc 정렬 + domain별 묶음 (테마 5도메인은 다중 룰 허용)
  matched.sort((a, b) => b.rule.priority - a.rule.priority)

  // domain별 picked — context/trigger는 section당 1개, 도메인은 최대 N개
  // (도메인 안에서는 section 중복 허용 — 같은 section의 다른 conditions 분기 룰
  //  여러 개 매칭 시 다 추가되어 narrative 풍부도 ↑)
  const usedSectionsOutsideDomain = new Set<string>()
  const usedRuleIds = new Set<string>()
  const domainPicks = new Map<string, typeof matched>()
  const picked: typeof matched = []

  for (const m of matched) {
    if (usedRuleIds.has(m.rule.id)) continue
    const domain = SECTION_TO_DOMAIN[m.rule.section]
    if (domain && DOMAIN_TITLES[domain]) {
      const list = domainPicks.get(domain) ?? []
      if (list.length >= MAX_RULES_PER_DOMAIN) continue
      list.push(m)
      domainPicks.set(domain, list)
      usedRuleIds.add(m.rule.id)
    } else {
      // context (daeun/seun/wolun/natal) + trigger (transit/pattern/shinsal) — section당 1개
      if (usedSectionsOutsideDomain.has(m.rule.section)) continue
      picked.push(m)
      usedSectionsOutsideDomain.add(m.rule.section)
      usedRuleIds.add(m.rule.id)
    }
  }

  // 도메인 묶음을 단일 가상 entry로 합쳐 picked에 추가
  // — 도메인별 cells에서 top/bottom dates 추출 → narrative 끝에 추가
  for (const domain of DOMAIN_ORDER) {
    const list = domainPicks.get(domain)
    if (!list || list.length === 0) continue
    const themes = DOMAIN_THEMES[domain] ?? []
    const topDates = pickDomainExtremeDates(cells, themes, 3, 'high')
    const lowDates = pickDomainExtremeDates(cells, themes, 2, 'low')
    // 도메인 안에서 우호(polarity > 0)와 주의(polarity < 0) 둘 다 있으면
    // 통합 헤더 한 줄 prepend — 사용자가 "그래서 좋다는 거야 나쁘다는
    // 거야?" 헷갈리는 케이스 정리. polarity ≥ 1 → 우호, ≤ -1 → 주의.
    const hasPositive = list.some((m) => m.polarity >= 1)
    const hasCaution = list.some((m) => m.polarity <= -1)
    // 우호 먼저, 주의 나중 순서로 sort (priority desc 내에서)
    const sortedList = [...list].sort((a, b) => {
      const pa = a.polarity >= 1 ? 0 : a.polarity <= -1 ? 1 : 0.5
      const pb = b.polarity >= 1 ? 0 : b.polarity <= -1 ? 1 : 0.5
      return pa - pb
    })
    const templates = sortedList.map((m) => fillTemplate(m.rule.template, m.vars))
    if (hasPositive && hasCaution) {
      templates.unshift(
        '복합 흐름이에요. 우호적인 신호와 주의 신호가 같이 들어와요:',
      )
    }
    const merged: typeof matched[number] = {
      rule: {
        ...list[0].rule,
        id: `domain.${domain}`,
        section: `domain-${domain}`,
        priority: list[0].rule.priority,
        template: mergeDomainTemplates(templates, topDates, lowDates),
      },
      vars: list[0].vars,
      polarity: list[0].polarity,
    }
    picked.push(merged)
  }

  // section별 정렬 (UI 순서) — context → trigger → 5 domain
  const SECTION_ORDER = [
    'daeun', 'seun', 'wolun', 'natal',
    'transit', 'pattern', 'shinsal',
    'domain-money', 'domain-work', 'domain-relations', 'domain-body', 'domain-expression',
  ]
  picked.sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.rule.section)
    const bi = SECTION_ORDER.indexOf(b.rule.section)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  // 템플릿 채우기 (도메인 entry는 이미 합쳐진 텍스트라 fillTemplate 한 번 더 통과해도 안전)
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

/**
 * findMatchContext + 매칭된 시그널의 polarity를 같이 반환.
 * 도메인 통합 시 우호(polarity > 0)·주의(polarity < 0) 분리에 사용.
 * 시그널 없이 natal 컨텍스트만 매칭하는 룰(natalStrength·yongsin only)은
 * polarity 추정 불가 → 0(중립) 반환.
 */
function findMatchContextWithSignal(
  cond: RuleConditions,
  signals: ActiveSignal[],
  patterns: SignalPattern[],
  natal: NatalContext,
): { ctx: TemplateVars; polarity: number } | null {
  // 본명 조건
  if (cond.natalStrength && !cond.natalStrength.includes(natal.saju.strength)) {
    return null
  }
  if (cond.yongsin && !cond.yongsin.includes(natal.saju.yongsin.primary)) {
    return null
  }
  if (cond.patternId) {
    const pat = patterns.find((p) => cond.patternId!.includes(p.id))
    if (!pat) return null
    const count = patterns.filter((p) => p.id === pat.id).length
    return { ctx: { patternName: pat.name, count }, polarity: 0 }
  }
  const matchingSignal = signals.find((s) => signalMatches(s, cond))
  if (!matchingSignal) {
    // natal context만으로 매칭되는 룰 — 첫 saju 신호 polarity 추정
    if (cond.natalStrength || cond.yongsin) {
      return { ctx: extractSignalVars(signals[0] ?? matchingSignal!, signals), polarity: 0 }
    }
    return null
  }
  return {
    ctx: extractSignalVars(matchingSignal, signals),
    polarity: matchingSignal.polarity,
  }
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
    natal: '본명 컨텍스트',
    transit: '주요 트랜짓',
    pattern: '매칭 패턴',
    shinsal: '신살',
    // 5 도메인 통합 헤더 (5테마 1:1)
    'domain-money': '돈·자산',
    'domain-work': '일·커리어',
    'domain-relations': '관계',
    'domain-body': '몸·내면',
    'domain-growth': '자기·성장',
  }
  return map[section] ?? section
}

// ────────────────────────────────────────────────────────────────────
// 도메인 통합 — 5테마(love/money/career/health/growth)를 5도메인으로
// 1:1 매핑. 캘린더 엔진의 AstroThemeKey 통합(18→5) 결과 정합.
// 같은 도메인 안에서 매칭된 룰들은 한 단락에 자연스럽게 합침.
// ────────────────────────────────────────────────────────────────────
const SECTION_TO_DOMAIN: Record<string, string> = {
  'theme-love': 'relations',
  'theme-money': 'money',
  'theme-career': 'work',
  'theme-health': 'body',
  'theme-growth': 'growth',
}

const DOMAIN_TITLES: Record<string, string> = {
  money: '돈·자산',
  work: '일·커리어',
  relations: '관계',
  body: '몸·내면',
  growth: '자기·성장',
}

const DOMAIN_ORDER = ['money', 'work', 'relations', 'body', 'growth']

// 도메인 안에 룰이 5개까지 쌓이면 narrative 너무 길어지고 "여기에/한편/
// 추가로/또한" 같은 연결사가 4번씩 반복됨. 사용자 audit 결과 3개가 최적
// (긍정 1 + 주의 1 + 컨텍스트 1 정도). 잘려나간 룰은 다른 시기에 또
// 매칭될 기회 있음.
const MAX_RULES_PER_DOMAIN = 3

/**
 * 도메인 안 여러 룰 텍스트를 자연스럽게 한 단락으로.
 * 첫 줄 = 메인 헤드라인, 뒤따르는 룰은 자연 연결사로 이어붙임.
 * 마지막 줄 = 그 도메인이 가장 강한 날짜 top 3 (있을 때만).
 * 룰 텍스트의 이모지 + 굵은 헤더는 제거하고 본문만 사용해 같은 톤 유지.
 */
const CONNECTORS = ['여기에', '한편', '추가로', '또한', '단,']

function mergeDomainTemplates(
  texts: string[],
  topDates: string[] = [],
  lowDates: string[] = [],
): string {
  if (texts.length === 0) return ''
  const cleaned = texts.map((t) => t.trim()).filter(Boolean)
  let body: string
  if (cleaned.length === 1) {
    body = cleaned[0]
  } else {
    const [head, ...rest] = cleaned
    const tail = rest.map((t, i) => {
      const stripped = t.replace(/^[🌟💰💼❤️⚡📚✈️🎖⚖️🏢🧘🤝]+\s*\*\*[^*]+\*\*\s*[—-]\s*/u, '')
      const connector = CONNECTORS[i % CONNECTORS.length]
      return `\n${connector} ${stripped}`
    })
    body = head + tail.join('')
  }
  if (topDates.length > 0) {
    body += `\n✨ 특히 강한 날: ${topDates.join(' · ')}`
  }
  if (lowDates.length > 0) {
    body += `\n⚠️ 주의 날: ${lowDates.join(' · ')}`
  }
  return body
}

/**
 * 한 도메인 안 themeKeys를 합쳐서 cell당 (max+avg)/2 점수를 매기고
 * direction='high'면 상위, 'low'면 하위 N개 날짜 (MM-DD) 반환.
 * 임계값 미달은 빈 배열 반환 (모두 평이하면 비표시 — 정직 유지).
 */
function pickDomainExtremeDates(
  cells: CalendarCell[],
  themeKeys: AstroThemeKey[],
  topN: number,
  direction: 'high' | 'low',
): string[] {
  if (themeKeys.length === 0) return []
  const scored = cells
    .map((c) => {
      let sum = 0
      let max = 0
      let min = 100
      let cnt = 0
      for (const tk of themeKeys) {
        const v = c.themeScores[tk]
        if (typeof v === 'number') {
          sum += v
          if (v > max) max = v
          if (v < min) min = v
          cnt += 1
        }
      }
      // high면 (max + avg)/2, low면 (min + avg)/2
      const avg = cnt > 0 ? sum / cnt : 50
      const score = direction === 'high' ? (max + avg) / 2 : (min + avg) / 2
      return { date: c.datetime.slice(5, 10), score, hasScore: cnt > 0 }
    })
    .filter((x) => x.hasScore)

  if (scored.length === 0) return []
  const sorted = scored.sort((a, b) =>
    direction === 'high' ? b.score - a.score : a.score - b.score,
  )
  const top = sorted.slice(0, topN)
  // 가장 극단값도 평이(high < 52 또는 low > 48)면 표시 안 함
  if (direction === 'high' && top[0].score < 52) return []
  if (direction === 'low' && top[0].score > 48) return []
  return top.map((x) => x.date)
}

const DOMAIN_THEMES: Record<string, AstroThemeKey[]> = {
  money: ['money'],
  work: ['career'],
  relations: ['love'],
  body: ['health'],
  expression: ['growth'],
}
