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

  // 우선순위 desc 정렬 + domain별 묶음 (테마 5도메인은 다중 룰 허용)
  matched.sort((a, b) => b.rule.priority - a.rule.priority)

  // domain별 picked — context/trigger는 section당 1개, 도메인은 최대 N개
  const usedSections = new Set<string>()
  const domainPicks = new Map<string, typeof matched>()
  const picked: typeof matched = []

  for (const m of matched) {
    const domain = SECTION_TO_DOMAIN[m.rule.section]
    if (domain && DOMAIN_TITLES[domain]) {
      // 5 도메인 통합 — section 중복 막되 같은 도메인 안에서 여러 룰 허용
      if (usedSections.has(m.rule.section)) continue
      const list = domainPicks.get(domain) ?? []
      if (list.length >= MAX_RULES_PER_DOMAIN) continue
      list.push(m)
      domainPicks.set(domain, list)
      usedSections.add(m.rule.section)
    } else {
      // context (daeun/seun/wolun/natal) + trigger (transit/pattern/shinsal) — section당 1개
      if (usedSections.has(m.rule.section)) continue
      picked.push(m)
      usedSections.add(m.rule.section)
    }
  }

  // 도메인 묶음을 단일 가상 entry로 합쳐 picked에 추가
  // — 도메인별 cells에서 top dates 추출 → narrative 마지막 줄에 추가
  for (const domain of DOMAIN_ORDER) {
    const list = domainPicks.get(domain)
    if (!list || list.length === 0) continue
    const topDates = pickDomainTopDates(cells, DOMAIN_THEMES[domain] ?? [], 3)
    const merged: typeof matched[number] = {
      rule: {
        ...list[0].rule,
        id: `domain.${domain}`,
        section: `domain-${domain}`,
        priority: list[0].rule.priority,
        template: mergeDomainTemplates(
          list.map((m) => fillTemplate(m.rule.template, m.vars)),
          topDates,
        ),
      },
      vars: list[0].vars,
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
    // 5 도메인 통합 헤더
    'domain-money': '돈·자산',
    'domain-work': '일·커리어',
    'domain-relations': '관계',
    'domain-body': '몸·내면',
    'domain-expression': '표현·창작',
  }
  return map[section] ?? section
}

// ────────────────────────────────────────────────────────────────────
// 도메인 통합 — theme-* 룰 16종을 5도메인으로 묶어 narrative 풍부도 향상.
// 같은 도메인 안에서 매칭된 룰들은 한 단락에 자연스럽게 합침.
// ────────────────────────────────────────────────────────────────────
const SECTION_TO_DOMAIN: Record<string, string> = {
  // 일·커리어
  'theme-career': 'work',
  'theme-business': 'work',
  'theme-reputation': 'work',
  'theme-legal': 'work',
  'theme-travel': 'work',     // 이직·이동도 일 흐름
  // 관계
  'theme-love': 'relations',
  'theme-family': 'relations',
  'theme-social': 'relations',
  // 돈·자산
  'theme-money': 'money',
  // 몸·내면
  'theme-health': 'body',
  'theme-study': 'body',
  'theme-spirituality': 'body',
  // 표현·창작
  'theme-creativity': 'expression',
  'theme-children': 'expression',
  'theme-karma': 'expression',
}

const DOMAIN_TITLES: Record<string, string> = {
  money: '돈·자산',
  work: '일·커리어',
  relations: '관계',
  body: '몸·내면',
  expression: '표현·창작',
}

const DOMAIN_ORDER = ['money', 'work', 'relations', 'body', 'expression']

const MAX_RULES_PER_DOMAIN = 5

/**
 * 도메인 안 여러 룰 텍스트를 자연스럽게 한 단락으로.
 * 첫 줄 = 메인 헤드라인, 뒤따르는 룰은 자연 연결사로 이어붙임.
 * 마지막 줄 = 그 도메인이 가장 강한 날짜 top 3 (있을 때만).
 * 룰 텍스트의 이모지 + 굵은 헤더는 제거하고 본문만 사용해 같은 톤 유지.
 */
const CONNECTORS = ['여기에', '한편', '추가로', '또한', '단,']

function mergeDomainTemplates(texts: string[], topDates: string[] = []): string {
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
  return body
}

/**
 * 한 도메인 안 themeKeys를 합쳐서 cell당 평균 점수를 매기고
 * 상위 N개 날짜 (MM-DD) 반환. 평균 60 미만은 제외 (모두 약하면 비표시).
 */
function pickDomainTopDates(
  cells: CalendarCell[],
  themeKeys: AstroThemeKey[],
  topN: number,
): string[] {
  if (themeKeys.length === 0) return []
  // cell당 점수 = (도메인 테마 max + avg) / 2 — max가 한 테마라도 강하면 잡아냄
  const ranked = cells
    .map((c) => {
      let sum = 0
      let max = 0
      let cnt = 0
      for (const tk of themeKeys) {
        const v = c.themeScores[tk]
        if (typeof v === 'number') {
          sum += v
          if (v > max) max = v
          cnt += 1
        }
      }
      const score = cnt > 0 ? (max + sum / cnt) / 2 : 0
      return { date: c.datetime.slice(5, 10), score, hasScore: cnt > 0 }
    })
    .filter((x) => x.hasScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
  // 가장 강한 날도 평이(52 미만)면 굳이 표시 안 함
  if (ranked.length === 0 || ranked[0].score < 52) return []
  return ranked.map((x) => x.date)
}

const DOMAIN_THEMES: Record<string, AstroThemeKey[]> = {
  money: ['money'],
  work: ['career', 'business', 'reputation', 'legal', 'travel'],
  relations: ['love', 'family', 'social'],
  body: ['health', 'study', 'spirituality'],
  expression: ['creativity', 'children', 'karma'],
}
