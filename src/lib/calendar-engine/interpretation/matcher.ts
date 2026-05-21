import type { ActiveSignal, CalendarCell, SignalPattern } from '../types'
import type { NatalContext } from '../context/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { Interpretation, InterpretationRule, RuleConditions, TemplateVars } from './types'
import { RULES } from './rules'
import { getGanjiTransitNarrative } from '../data/ganjiTransitNarrative'
import { deriveThemeBreakdown } from '../derivers/themeBreakdown'
import { deriveKeyEvents } from '../derivers/keyEvents'
import { deriveMonthComparison } from '../derivers/monthComparison'

/**
 * 신호 다발 + 본명 컨텍스트 → 자연스러운 narrative.
 *
 * 1. 모든 룰을 conditions로 필터링
 * 2. 매칭된 룰별 변수 컨텍스트 수집
 * 3. 우선순위 desc로 정렬, section별 중복 제거
 * 4. 템플릿 변수 치환
 * 5. section별로 합쳐서 narrative 출력
 */
export type InterpretationLang = 'ko' | 'en'

/**
 * lang='en' 요청이고 룰에 templateEn 이 있으면 사용, 없으면 한국어 template
 * 으로 fallback. 일진/대운 ganji 변수 (monthGanjiText 등) 도 영어 헬퍼
 * 변수 (monthGanjiTextEn 등) 로 분기 — extractSignalVars 가 둘 다 채움.
 */
function pickRuleTemplate(rule: InterpretationRule, lang: InterpretationLang): string {
  if (lang === 'en' && rule.templateEn) return rule.templateEn
  return rule.template
}

export function buildInterpretation(args: {
  natal: NatalContext
  cells: CalendarCell[]
  scope?: 'monthly' | 'yearly' | 'daily' | 'lifetime'
  lang?: InterpretationLang
  /** 전월 셀 — 주어지면 "지난달 대비" 비교를 monthly scope 에서 계산 */
  prevCells?: CalendarCell[]
  /** 디버그 — 캡 적용 전 매칭 룰 ID 도 반환 (룰 커버리지 감사용) */
  debug?: boolean
}): Interpretation {
  const { natal, cells, scope = 'monthly', lang = 'ko', prevCells, debug } = args

  // 모든 셀에서 신호 + 패턴 합치기
  const allSignals = cells.flatMap((c) => c.signals)
  const allPatterns = cells.flatMap((c) => c.matchedPatterns)
  // 길일/흉일 후보
  // Tie-breaker: 같은 derivedScore 일 때 signal 밀도 (|weight × polarity| 합)
  // 가 높은 날을 우선. 점수 분포가 좁아질 때 5/11/20/21/26 처럼 5일이
  // 동률 100점 으로 묶이던 문제 해소.
  // 3단계: derivedScore desc → signal density desc → 날짜 asc (안정성)
  const signalDensity = (c: CalendarCell): number => {
    let sum = 0
    for (const s of c.signals) {
      sum += Math.abs(s.weight ?? 0) * Math.abs(s.polarity ?? 0)
    }
    return sum
  }
  const compareCells = (a: CalendarCell, b: CalendarCell, direction: 'high' | 'low'): number => {
    const scoreDiff =
      direction === 'high' ? b.derivedScore - a.derivedScore : a.derivedScore - b.derivedScore
    if (scoreDiff !== 0) return scoreDiff
    const densityDiff =
      direction === 'high'
        ? signalDensity(b) - signalDensity(a)
        : signalDensity(a) - signalDensity(b)
    if (densityDiff !== 0) return densityDiff
    return a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0
  }
  const ranked = [...cells].sort((a, b) => compareCells(a, b, 'high'))
  const luckyDates = ranked
    .slice(0, 3)
    .map((c) => c.datetime.slice(5, 10))
    .join(', ')
  const unluckyRanked = [...cells].sort((a, b) => compareCells(a, b, 'low'))
  const unluckyDates = unluckyRanked
    .slice(0, 3)
    .map((c) => c.datetime.slice(5, 10))
    .join(', ')

  // 룰 매칭 + 변수 컨텍스트 수집
  // matched[].polarity는 룰 자체의 의도(intent) — 매칭 시그널 polarity가
  // 아니라 룰 조건의 minPolarity/maxPolarity로 추정. 시그널 polarity는
  // 룰의 의도(우호/주의)와 무관할 수 있어서 (정관 +3 시그널이 fire한 룰의
  // 의도는 "신약+정관 = 책임 무거움"으로 negative) 룰 자체의 의도를 봐야
  // 점수↔해석 동기화 정확.
  const matched: Array<{
    rule: InterpretationRule
    vars: TemplateVars
    polarity: number
    strength: number
  }> = []
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
      polarity: ruleIntent(rule),
      strength: matchSig.strength,
    })
  }

  // 우선순위 desc 정렬 + domain별 묶음 (테마 5도메인은 다중 룰 허용)
  matched.sort((a, b) => b.rule.priority - a.rule.priority)

  // domain별 picked — context/trigger는 section당 1개, 도메인은 최대 N개
  // (도메인 안에서는 section 중복 허용 — 같은 section의 다른 conditions 분기 룰
  //  여러 개 매칭 시 다 추가되어 narrative 풍부도 ↑)
  const sectionCount = new Map<string, number>()
  const usedRuleIds = new Set<string>()
  const domainPicks = new Map<string, typeof matched>()
  const picked: typeof matched = []

  // 시간 cycle 섹션은 2줄까지 허용 (대운/세운/월운) — 룰은 이미 12/24/29개
  // 있는데 1줄만 표출돼 얇았음. 두 번째 룰(다른 조건 분기)까지 풀어 깊이 ↑.
  // shinsal/transit/pattern 은 회전 섹션 — cap 2 로 올려 앵커 1 + 회전 1 확보.
  const SECTION_CAP: Record<string, number> = {
    daeun: 2,
    seun: 2,
    wolun: 2,
    today: 4,
    flow: 2,
    shinsal: 2,
    transit: 2,
    pattern: 2,
  }

  // ── 룰 로테이션 ──
  // 캡 걸린 비-도메인 섹션에서 매칭 후보가 cap 보다 많으면 매달 최고우선 룰만
  // 노출되어, 작성된 룰의 70%(커버리지 감사)가 영영 안 보이던 문제 해소.
  // slot 0 = 최고우선 앵커(항상 노출 → Saturn Return 등 헤드라인 정확성 보존),
  // 나머지 슬롯은 month seed 로 비-앵커 후보를 회전. month seed 는 cells 에서
  // 유도(현재 시각 아님) → 결정론적이라 cell-cache 안전.
  // shinsal=동급 신살, transit=느린행성 aspect(여러 달 지속), pattern=조합 —
  // 모두 같은 달 안에서 교체 가능한 후보들. natal(정체성)·daeun/seun/wolun(주기
  // narrative)은 회전 제외(이미 chart/시기로 안정적).
  const ROTATING_SECTIONS = new Set(['shinsal', 'transit', 'pattern'])
  const monthSeed = (() => {
    const iso = cells[0]?.datetime
    const d = iso ? new Date(iso) : null
    return d && !Number.isNaN(d.getTime()) ? d.getUTCFullYear() * 12 + d.getUTCMonth() : 0
  })()
  const rotatedAllow = new Map<string, Set<string>>()
  {
    const bySection = new Map<string, typeof matched>()
    for (const m of matched) {
      if (!ROTATING_SECTIONS.has(m.rule.section)) continue
      const arr = bySection.get(m.rule.section) ?? []
      arr.push(m) // matched 는 priority desc 정렬 상태 → arr 도 그 순서
      bySection.set(m.rule.section, arr)
    }
    for (const [section, cands] of bySection) {
      const cap = SECTION_CAP[section] ?? 1
      const allow = new Set<string>()
      if (cands[0]) allow.add(cands[0].rule.id) // 앵커
      const rest = cands.slice(1)
      const slots = Math.max(0, cap - 1)
      if (rest.length > 0 && slots > 0) {
        const start = ((monthSeed % rest.length) + rest.length) % rest.length
        for (let i = 0; i < slots; i++) allow.add(rest[(start + i) % rest.length].rule.id)
      }
      rotatedAllow.set(section, allow)
    }
  }

  for (const m of matched) {
    if (usedRuleIds.has(m.rule.id)) continue
    const domain = SECTION_TO_DOMAIN[m.rule.section]
    if (domain && DOMAIN_TITLES[domain]) {
      // 도메인은 후보를 다 모으고 (cap 없이) 나중에 신호 강도 기준으로
      // 추려냄 — 고정 우선순위만으로 자르면 항상 같은 룰만 표출되던 문제
      // 해소. 사주마다 신호가 강한 룰이 달라 조합이 풍부해짐.
      const list = domainPicks.get(domain) ?? []
      list.push(m)
      domainPicks.set(domain, list)
      usedRuleIds.add(m.rule.id)
    } else {
      // 회전 섹션이면 이번 달 회전 대상(앵커 + 회전 픽)만 통과.
      const allow = rotatedAllow.get(m.rule.section)
      if (allow && !allow.has(m.rule.id)) continue
      const cap = SECTION_CAP[m.rule.section] ?? 1
      const cur = sectionCount.get(m.rule.section) ?? 0
      if (cur >= cap) continue
      picked.push(m)
      sectionCount.set(m.rule.section, cur + 1)
      usedRuleIds.add(m.rule.id)
    }
  }

  // 도메인 묶음을 단일 가상 entry로 합쳐 picked에 추가
  // — 도메인별 cells에서 top/bottom dates 추출 → narrative 끝에 추가
  for (const domain of DOMAIN_ORDER) {
    const allCandidates = domainPicks.get(domain)
    if (!allCandidates || allCandidates.length === 0) continue
    // 후보가 MAX 보다 많으면 (그 사주 신호 강도 우선 + priority 보조) 로
    // 추려냄. 신호가 강한 룰이 먼저 표출 → 사주마다 조합이 확연히 달라짐.
    // 고정 priority 가 1차였을 땐 항상 같은 룰만 떴음 (변별 약함). 강도를
    // 1차로 올려 chart-driven 변별 확보. 우호/주의 한쪽 쏠림은 긍정 1개·
    // 주의 1개 보장으로 방지.
    const list = (() => {
      if (allCandidates.length <= MAX_RULES_PER_DOMAIN) return allCandidates
      const ranked = [...allCandidates].sort((a, b) => {
        if (b.strength !== a.strength) return b.strength - a.strength
        return b.rule.priority - a.rule.priority
      })
      const pos = ranked.filter((m) => m.polarity >= 1)
      const neg = ranked.filter((m) => m.polarity <= -1)
      const picks: typeof ranked = []
      // 균형 확보: 긍정 1 + 주의 1 먼저 (있으면), 나머지는 ranked 순서로 채움
      if (pos[0]) picks.push(pos[0])
      if (neg[0]) picks.push(neg[0])
      for (const m of ranked) {
        if (picks.length >= MAX_RULES_PER_DOMAIN) break
        if (!picks.includes(m)) picks.push(m)
      }
      // narrative 순서 안정화 — 원래 ranked(priority/strength) 순서 유지
      return ranked.filter((m) => picks.includes(m))
    })()
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
    const templates = sortedList.map((m) => fillTemplate(pickRuleTemplate(m.rule, lang), m.vars))
    if (hasPositive && hasCaution) {
      // 도메인마다 다른 "모순" 리드 — 4개 섹션이 같은 문장으로 시작하면
      // 사용자가 스킵함. 각 영역의 우호↔주의 긴장을 한 줄로 압축.
      const lead = MIXED_LEAD[domain]?.[lang] ?? MIXED_LEAD._default[lang]
      templates.unshift(lead)
    }
    const mergedText = mergeDomainTemplates(templates, topDates, lowDates, domain, lang)
    const merged: (typeof matched)[number] = {
      rule: {
        ...list[0].rule,
        id: `domain.${domain}`,
        section: `domain-${domain}`,
        priority: list[0].rule.priority,
        // 병합된 텍스트는 이미 lang 에 맞춰 합성됨 → template 한 쪽에만 박고
        // templateEn 은 명시적으로 비워 둠. 그렇지 않으면 list[0].rule 의
        // 원본 templateEn 이 spread 로 살아남아 pickRuleTemplate('en') 가
        // 병합된 텍스트 대신 첫 룰의 원본 EN 만 반환 (Phase 2 EN 머지 버그).
        template: mergedText,
        templateEn: undefined,
      },
      vars: list[0].vars,
      polarity: list[0].polarity,
      strength: list[0].strength,
    }
    picked.push(merged)
  }

  // section별 정렬 (UI 순서) — context → trigger → 5 domain
  const SECTION_ORDER = [
    'today',
    'daeun',
    'seun',
    'wolun',
    'natal',
    'transit',
    'flow',
    'pattern',
    'shinsal',
    'timing',
    'domain-money',
    'domain-work',
    'domain-relations',
    'domain-body',
    'domain-expression',
  ]
  picked.sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.rule.section)
    const bi = SECTION_ORDER.indexOf(b.rule.section)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  // 템플릿 채우기 (도메인 entry는 이미 합쳐진 텍스트라 fillTemplate 한 번 더 통과해도 안전)
  // 같은 section 이 2줄(대운/세운/월운 cap=2)이면 제목 한 번 + 본문 줄바꿈
  // 으로 병합 — "[10년 큰 흐름]" 제목이 두 번 나오지 않게.
  const sectionsRaw: Array<{ section: string; title: string; text: string }> = []
  const sectionIndex = new Map<string, number>()
  for (const m of picked) {
    const text = fillTemplate(pickRuleTemplate(m.rule, lang), m.vars)
    const idx = sectionIndex.get(m.rule.section)
    if (idx != null) {
      sectionsRaw[idx].text += `\n${text}`
    } else {
      sectionIndex.set(m.rule.section, sectionsRaw.length)
      sectionsRaw.push({ section: m.rule.section, title: sectionTitle(m.rule.section, lang), text })
    }
  }
  const sections = sectionsRaw

  // ── Lever 2: 구조 추가 — 대운 위치/예고 + 월운 주간 분해 ──
  // 대운: 지금 이 10년의 초/중/후반 + 다음 대운 한 줄 예고
  const daeunSec = sections.find((s) => s.section === 'daeun')
  if (daeunSec) {
    const posLine = buildDaeunPositionLine(natal, cells, lang)
    if (posLine) daeunSec.text += `\n${posLine}`
  }
  // 월운: 한 달을 주 단위로 끊어 각 주 키워드 한 줄 (scope=monthly 일 때만)
  const wolunSec = sections.find((s) => s.section === 'wolun')
  if (wolunSec && scope === 'monthly') {
    const weekLine = buildWeeklyBreakdownLine(cells, lang)
    if (weekLine) wolunSec.text += `\n${weekLine}`
  }

  // ── P0: natal 섹션 맨 앞에 "용신" 한 줄 ──
  // 사주 유저가 가장 먼저 묻는 게 "내 용신". 계산은 natal 에 이미 있으니 노출.
  const yongsinLine = buildYongsinLine(natal, lang)
  if (yongsinLine) {
    const natalSec = sections.find((s) => s.section === 'natal')
    if (natalSec) {
      natalSec.text = `${yongsinLine}\n${natalSec.text}`
    } else {
      // natal 룰이 안 떴어도(예: medium 강약) 용신 줄은 보장 — 순서 맞춰 삽입.
      const insertAt = sections.findIndex(
        (s) => SECTION_ORDER.indexOf(s.section) > SECTION_ORDER.indexOf('natal')
      )
      const sec = { section: 'natal', title: sectionTitle('natal', lang), text: yongsinLine }
      if (insertAt === -1) sections.push(sec)
      else sections.splice(insertAt, 0, sec)
    }
  }

  const narrative = sections.map((s) => `**[${s.title}]**\n${s.text}`).join('\n\n')

  // 테마 점수 — 신호 기반(셀별 themeScores)의 월 평균.
  //
  // Why-card(themeBreakdown)와 *같은* polarity×weight×layerWeight 모델이라
  // 숫자와 근거 카드의 방향이 항상 일치한다. 또 cell[0](1일) 한 칸이 아니라
  // 그 달 전체를 평균해 day-1 편향도 없앤다.
  //
  // (이전 모델 'cell[0] 신호평균 + 표출 룰 의도 ×30' 은, 표출된 룰이 신호
  //  전체와 반대 방향일 때 점수(예: 건강 60)와 근거카드(예: −47)가 모순되는
  //  문제가 있었음 → opt1: 신호 기반으로 통일.)
  const THEME_SCORE_KEYS = ['love', 'money', 'career', 'health', 'growth'] as const
  const themeScores: NonNullable<Interpretation['themeScores']> = {}
  for (const key of THEME_SCORE_KEYS) {
    let sum = 0
    let n = 0
    for (const c of cells) {
      const v = c.themeScores?.[key]
      if (typeof v === 'number') {
        sum += v
        n += 1
      }
    }
    if (n > 0) themeScores[key] = Math.round(sum / n)
  }

  // 테마 순위 — 바 동률 시 UI 가 상대 표시("가장 활발 > … > 약한 축")에 쓰도록.
  const themeRanking = (THEME_SCORE_KEYS as readonly (keyof typeof themeScores)[])
    .filter((k) => typeof themeScores[k] === 'number')
    .map((k) => ({ theme: k, score: themeScores[k] as number }))
    .sort((a, b) => b.score - a.score)
    .map((o, i) => ({ ...o, rank: i + 1 }))

  // Why-card — 테마별 점수 인과 추적 (그 점수에 기여한 신호 top N).
  const themeBreakdown = deriveThemeBreakdown(allSignals)

  // 키 이벤트 3 — 월간일 때만 (일별 셀에서 베스트/강한구간/피할날 추출).
  const keyEvents = scope === 'monthly' ? deriveKeyEvents(cells) : undefined

  // 지난달 대비 — 월간 + prevCells 가 주어졌을 때만. 전월 themeScore 를 같은
  // 모델로 얻기 위해 재귀 호출(단, prevCells 미전달 → 무한재귀 없음).
  let monthComparison
  if (scope === 'monthly' && prevCells && prevCells.length > 0) {
    const prev = buildInterpretation({ natal, cells: prevCells, scope: 'monthly', lang })
    monthComparison = deriveMonthComparison({
      currCells: cells,
      prevCells,
      currScores: themeScores,
      prevScores: prev.themeScores,
    })
  }

  return {
    narrative,
    matchedRuleIds: picked.map((m) => m.rule.id),
    allMatchedRuleIds: debug ? matched.map((m) => m.rule.id) : undefined,
    sections,
    themeScores,
    themeRanking,
    themeBreakdown,
    keyEvents,
    monthComparison,
  }
}

// ─── 매칭 로직 ───
function findMatchContext(
  cond: RuleConditions,
  signals: ActiveSignal[],
  patterns: SignalPattern[],
  natal: NatalContext
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
 * 룰 자체의 의도 추정 — narrative 톤과 동기화된 점수 계산에 사용.
 *  +1: 우호 의도 (회복창·길성·신강 + 길운 등 — minPolarity ≥ 1 또는
 *      길성 신살명을 조건에 가짐)
 *  -1: 주의 의도 (체력·사고·분탈·위기 등 — maxPolarity ≤ -1 또는
 *      흉살명을 조건에 가짐)
 *   0: 중립 (본명 컨텍스트·패턴·일반 흐름)
 *
 * conditions만으로 추정 — 룰 ID 패턴은 fragile, 직접 룰에 intent 필드
 * 추가하는 게 더 정확하지만 162개 룰 manual annotation은 큰 작업.
 */
function ruleIntent(rule: InterpretationRule): number {
  const c = rule.conditions
  if (c.minPolarity != null && c.minPolarity >= 1) return 1
  if (c.maxPolarity != null && c.maxPolarity <= -1) return -1
  // 길성·흉성 신살명으로 의도 추정
  if (c.shinsalName) {
    const benefic = [
      '천을귀인',
      '태극귀인',
      '천덕귀인',
      '월덕귀인',
      '천주귀인',
      '암록',
      '금여성',
      '천의성',
      '천문성',
      '문창',
      '문곡',
      '학당귀인',
      '건록',
      '제왕',
      '도화',
      '홍염살',
    ]
    const malefic = [
      '겁살',
      '재살',
      '천살',
      '월살',
      '망신',
      '육해',
      '현침',
      '고신',
      '과숙',
      '괴강',
      '양인',
      '백호',
      '공망',
      '귀문관',
      '원진',
      '천라지망',
      '삼재',
    ]
    const hasBene = c.shinsalName.some((n) => benefic.includes(n))
    const hasMal = c.shinsalName.some((n) => malefic.includes(n))
    if (hasBene && !hasMal) return 1
    if (hasMal && !hasBene) return -1
  }
  // 명리 컨텍스트 — 신강·신약 × 십신 조합으로 의도 추정.
  // 예: 신약 + 정관 = 압박(-1), 신약 + 인성 = 도움(+1), 신강 + 재성 = 실행(+1)
  if (c.natalStrength && c.sibsin) {
    const isWeak = c.natalStrength.includes('weak')
    const isStrong = c.natalStrength.includes('strong')
    const officer = c.sibsin.some((s) => s === '정관' || s === '편관')
    const print = c.sibsin.some((s) => s === '정인' || s === '편인')
    const wealth = c.sibsin.some((s) => s === '정재' || s === '편재')
    const bigeop = c.sibsin.some((s) => s === '비견' || s === '겁재')
    const siksang = c.sibsin.some((s) => s === '식신' || s === '상관')
    if (isWeak && officer) return -1 // 신약+관성 = 책임 압박
    if (isWeak && (print || bigeop)) return 1 // 신약+인비 = 받쳐줌
    if (isWeak && wealth) return -1 // 신약+재성 = 분탈
    if (isStrong && officer) return 1 // 신강+관성 = 자리 잡음
    if (isStrong && wealth) return 1 // 신강+재성 = 실행력
    if (isStrong && (print || bigeop)) return -1 // 신강+인비 = 과도·정체
    if (isStrong && siksang) return 1 // 신강+식상 = 표현 발산
  }
  return 0
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
  natal: NatalContext
): { ctx: TemplateVars; polarity: number; strength: number } | null {
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
    return {
      ctx: { patternName: pat.name, count },
      polarity: 0,
      strength: (pat.strength ?? 50) / 50,
    }
  }
  const matchingSignal = signals.find((s) => signalMatches(s, cond))
  if (!matchingSignal) {
    // natal context만 있는 룰은 fallback 허용 (signal 차원 조건 0개일 때).
    // sibsin/shinsalName/signalLayer 등 신호 조건이 있으면 매칭 안 됐을
    // 때 룰 fire하면 안 됨 — 옛 버전은 natalStrength 있으면 그 외 조건
    // 무시하고 fire해서 04월 비견월에도 "신약+관성" 룰이 fire되던 버그.
    const hasSignalCondition =
      !!(
        cond.signalSource ||
        cond.signalKinds ||
        cond.signalLayer ||
        cond.sibsin ||
        cond.shinsalName ||
        cond.planet ||
        cond.sign ||
        cond.dignity
      ) ||
      cond.minPolarity != null ||
      cond.maxPolarity != null
    if (!hasSignalCondition && (cond.natalStrength || cond.yongsin)) {
      const fallback = signals[0]
      if (!fallback) return null
      return { ctx: extractSignalVars(fallback, signals), polarity: 0, strength: 0 }
    }
    return null
  }
  return {
    ctx: extractSignalVars(matchingSignal, signals),
    polarity: matchingSignal.polarity,
    // 그 사주에서 이 신호가 얼마나 강하게 떴는지 (weight × |polarity|).
    // 도메인 룰 선택의 2차 정렬 키 — 같은 우선순위면 신호가 강한 룰이
    // 먼저 표출돼 사주마다 다른 조합이 나옴.
    strength: Math.abs((matchingSignal.weight ?? 0) * (matchingSignal.polarity ?? 0)),
  }
}

function signalMatches(s: ActiveSignal, cond: RuleConditions): boolean {
  if (cond.signalSource && s.source !== cond.signalSource) return false
  if (cond.signalKinds && !cond.signalKinds.includes(s.kind)) return false
  if (
    cond.signalLayer &&
    !cond.signalLayer.includes(s.layer as 'decadal' | 'yearly' | 'monthly' | 'daily')
  )
    return false
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

// 한자 갑자 → 한국어 음 표기 (壬辰 → 임진) / 로마자 (Imjin). 한자가
// 그대로 출력되면 일반 사용자에겐 읽히지 않으므로 룰 본문에 들어가는
// {monthGanji}/{yearGanji}/{daeunGanji} 변수는 한글 음으로, 영어 변형
// {*GanjiEn} 변수는 capitalized 로마자로 노출.
const STEM_KR: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}
const BRANCH_KR: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
const STEM_ROMAN: Record<string, string> = {
  甲: 'Gap',
  乙: 'Eul',
  丙: 'Byeong',
  丁: 'Jeong',
  戊: 'Mu',
  己: 'Gi',
  庚: 'Gyeong',
  辛: 'Sin',
  壬: 'Im',
  癸: 'Gye',
}
const BRANCH_ROMAN: Record<string, string> = {
  子: 'ja',
  丑: 'chuk',
  寅: 'in',
  卯: 'myo',
  辰: 'jin',
  巳: 'sa',
  午: 'o',
  未: 'mi',
  申: 'sin',
  酉: 'yu',
  戌: 'sul',
  亥: 'hae',
}
function ganjiToKoreanReading(ganji: string): string {
  if (!ganji || ganji.length < 2) return ganji
  const stem = STEM_KR[ganji[0]] ?? ganji[0]
  const branch = BRANCH_KR[ganji[1]] ?? ganji[1]
  return `${stem}${branch}`
}
function ganjiToRoman(ganji: string): string {
  if (!ganji || ganji.length < 2) return ganji
  const stem = STEM_ROMAN[ganji[0]] ?? ganji[0]
  const branch = BRANCH_ROMAN[ganji[1]] ?? ganji[1]
  return `${stem}${branch}`
}

function extractSignalVars(s: ActiveSignal, allSignals: ActiveSignal[]): TemplateVars {
  const vars: TemplateVars = {}
  const detail = s.evidence.detail as Record<string, unknown> | undefined
  const ganji = (s.evidence.pillars?.[0] ?? '').trim()
  const ganjiKr = ganjiToKoreanReading(ganji)
  const ganjiEn = ganjiToRoman(ganji)

  if (ganji) vars.ganji = ganjiKr
  // KO + EN 두 ganji text 를 동시에 채움 — 룰 템플릿이 자기 언어에 맞는
  // placeholder ({monthGanjiText} vs {monthGanjiTextEn}) 를 선택해 사용.
  if (s.layer === 'decadal') {
    vars.daeunGanji = ganjiKr
    vars.daeunGanjiEn = ganjiEn
    vars.daeunGanjiText = getGanjiTransitNarrative(ganji, 'decadal', 'ko')
    vars.daeunGanjiTextEn = getGanjiTransitNarrative(ganji, 'decadal', 'en')
  }
  if (s.layer === 'yearly') {
    vars.yearGanji = ganjiKr
    vars.yearGanjiEn = ganjiEn
    vars.yearGanjiText = getGanjiTransitNarrative(ganji, 'yearly', 'ko')
    vars.yearGanjiTextEn = getGanjiTransitNarrative(ganji, 'yearly', 'en')
  }
  if (s.layer === 'monthly') {
    vars.monthGanji = ganjiKr
    vars.monthGanjiEn = ganjiEn
    vars.monthGanjiText = getGanjiTransitNarrative(ganji, 'monthly', 'ko')
    vars.monthGanjiTextEn = getGanjiTransitNarrative(ganji, 'monthly', 'en')
  }

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

  // Patch 3 (Phase 3) — 신살 단락의 vague "이번 달에 들어 있어요" 를 구체
  // 날짜로. 같은 shinsal name 이 활성화되는 모든 날짜 (MM-DD) 를 모아 룰
  // 본문에서 {shinsalDates} 로 호출. 1개일 땐 그 날짜, 여러 개면 ' · ' 로
  // 묶어 최대 5개까지.
  if (s.kind === 'shinsal') {
    const allActive = [s, ...sameKind]
    const dates = Array.from(new Set(allActive.map((x) => x.active.start.slice(5, 10)))).sort()
    if (dates.length > 0) {
      vars.shinsalDates = dates.slice(0, 5).join(' · ')
      vars.shinsalDatesCount = String(dates.length)
    }
  }

  // Void-of-Course 달 — 그 달 무력 구간 날짜를 모아 {vocDates}/{vocDatesCount}.
  // VoC 신호명은 날짜·사인마다 달라 sameKind 로 안 묶이므로 kind 로 직접 수집.
  if (s.kind === 'void-of-course') {
    const allVoc = allSignals.filter((x) => x.kind === 'void-of-course')
    const dates = Array.from(new Set(allVoc.map((x) => x.active.start.slice(5, 10)))).sort()
    if (dates.length > 0) {
      vars.vocDates = dates.slice(0, 6).join(' · ')
      vars.vocDatesCount = String(dates.length)
    }
  }

  // 하우스 오버레이 / ASC·MC 컨택 — 추출기가 만든 완성 문장을 그대로 출력.
  // KO/EN 둘 다 vars 에 박고 룰 template/templateEn 이 각각 사용.
  if (s.kind === 'house-transit' || s.kind === 'angle-contact') {
    const ko = (detail?.lineKo as string | undefined) ?? s.korean
    const en = (detail?.lineEn as string | undefined) ?? s.korean
    if (ko) vars.flowLine = ko
    if (en) vars.flowLineEn = en
  }

  return vars
}

// 용신/희신/기신 한 줄 — natal.saju.yongsin 그대로 노출 (P0).
// 사주 유저 최우선 정보. 오행은 이미 한글(목/화/토/금/수)이라 한자는 괄호 보조.
const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const EL_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
function buildYongsinLine(natal: NatalContext, lang: InterpretationLang): string {
  const y = natal.saju.yongsin
  const primary = y?.primary
  if (!primary) return ''
  const secondary = y.secondary
  const avoid = (y.avoid ?? []).filter(Boolean)
  if (lang === 'en') {
    const pen = EL_EN[primary] ?? primary
    const sen = secondary ? (EL_EN[secondary] ?? secondary) : ''
    let s = `Your key element (yongsin) is **${pen}**${sen ? ` (supporting: ${sen})` : ''} — environments, colours, people, and activities that nourish ${pen}${sen ? ` and ${sen}` : ''} lift your fortune.`
    if (avoid.length) s += ` Ease off on ${avoid.map((a) => EL_EN[a] ?? a).join(', ')}.`
    return s
  }
  const ph = `${primary}(${EL_HANJA[primary] ?? ''})`
  const sh = secondary ? `${secondary}(${EL_HANJA[secondary] ?? ''})` : ''
  let s = `타고난 용신은 **${ph}** 기운${sh ? ` (희신 ${sh})` : ''} — ${primary}${secondary ? `·${secondary}` : ''} 를 키우는 환경·색·사람·활동이 운을 끌어올려요.`
  if (avoid.length) s += ` 멀리할 기운: ${avoid.join('·')}.`
  return s
}

// 대운 위치 한 줄 — 지금 이 10년의 초/중/후반 + 다음 대운 예고.
// natal.saju.daeun(startYear) + cells 의 대상 연도로 현재 대운 위치 계산.
function buildDaeunPositionLine(
  natal: NatalContext,
  cells: CalendarCell[],
  lang: InterpretationLang
): string {
  const daeun = natal.saju.daeun
  if (!daeun || daeun.length === 0) return ''
  const targetYear = Number(cells[0]?.datetime?.slice(0, 4))
  if (!targetYear) return ''
  const sorted = [...daeun].sort((a, b) => a.startYear - b.startYear)
  let idx = -1
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].startYear <= targetYear) idx = i
    else break
  }
  if (idx < 0) return ''
  const cur = sorted[idx]
  const next = sorted[idx + 1]
  const within = targetYear - cur.startYear // 0~9
  const age = cur.startAge + within
  const phaseKo = within <= 3 ? '초반' : within <= 6 ? '중반' : '후반'
  const phaseEn = within <= 3 ? 'early' : within <= 6 ? 'mid' : 'late'
  if (lang === 'en') {
    let s = `Right now you're in the ${phaseEn} stretch of this 10-year arc (around age ${age}).`
    if (next) s += ` The next arc opens around age ${next.startAge}.`
    return s
  }
  let s = `지금은 이 10년의 **${phaseKo}** (${age}세 무렵)이에요.`
  if (next) s += ` 다음 10년 흐름은 ${next.startAge}세 무렵 열려요.`
  return s
}

// 월운 주간 분해 한 줄 — 한 달을 주 단위로 끊어 각 주의 평균 점수로
// 강·평·주의 키워드. "왜 이 달이 굴곡지는지" 를 주차로 보여줌.
function buildWeeklyBreakdownLine(cells: CalendarCell[], lang: InterpretationLang): string {
  const dated = cells
    .map((c) => ({ day: Number(c.datetime.slice(8, 10)), score: c.derivedScore }))
    .filter((x) => x.day >= 1 && x.day <= 31)
  if (dated.length < 14) return ''
  const weeks: Array<{ lo: number; hi: number; scores: number[] }> = [
    { lo: 1, hi: 7, scores: [] },
    { lo: 8, hi: 14, scores: [] },
    { lo: 15, hi: 21, scores: [] },
    { lo: 22, hi: 31, scores: [] },
  ]
  for (const d of dated) {
    const w = weeks.find((w) => d.day >= w.lo && d.day <= w.hi)
    if (w) w.scores.push(d.score)
  }
  const labelKo = (avg: number) =>
    avg >= 75 ? '강한 주' : avg >= 60 ? '순한 주' : avg >= 45 ? '평이한 주' : '조심할 주'
  const labelEn = (avg: number) =>
    avg >= 75 ? 'strong' : avg >= 60 ? 'smooth' : avg >= 45 ? 'steady' : 'careful'
  const parts: string[] = []
  weeks.forEach((w, i) => {
    if (w.scores.length === 0) return
    const avg = Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length)
    parts.push(
      lang === 'en' ? `W${i + 1} ${labelEn(avg)}(${avg})` : `${i + 1}주 ${labelKo(avg)}(${avg})`
    )
  })
  if (parts.length === 0) return ''
  return lang === 'en' ? `By week: ${parts.join(' · ')}.` : `주차별 흐름: ${parts.join(' · ')}.`
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
    if (v == null) return m // 변수 없으면 원본 그대로 (디버그 용이)
    return String(v)
  })
}

function sectionTitle(section: string, lang: InterpretationLang = 'ko'): string {
  const ko: Record<string, string> = {
    today: '오늘 한 줄',
    daeun: '10년 큰 흐름',
    seun: '올해의 운',
    wolun: '이번 달',
    natal: '타고난 결',
    transit: '주요 흐름',
    pattern: '주요 패턴',
    shinsal: '행운 별',
    timing: '타이밍 팁',
    flow: '하우스 흐름',
    // 5 도메인 통합 헤더 (5테마 1:1)
    'domain-money': '돈·자산',
    'domain-work': '일·커리어',
    'domain-relations': '관계',
    'domain-body': '몸·내면',
    'domain-growth': '자기·성장',
  }
  const en: Record<string, string> = {
    today: 'Today',
    daeun: '10-year Arc',
    seun: 'This Year',
    wolun: 'This Month',
    natal: 'Your Chart',
    transit: 'Active Transits',
    pattern: 'Patterns',
    shinsal: 'Lucky Stars',
    timing: 'Timing Tips',
    flow: 'House Transits',
    'domain-money': 'Money',
    'domain-work': 'Work & Career',
    'domain-relations': 'Relationships',
    'domain-body': 'Body & Inner Life',
    'domain-growth': 'Self & Growth',
  }
  const map = lang === 'en' ? en : ko
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

// 도메인별 "모순" 리드 — 우호 신호와 주의 신호가 같이 떴을 때, 그 영역의
// 긴장을 한 줄로. 4개 섹션이 같은 문장으로 시작하던 단조로움 해소.
const MIXED_LEAD: Record<string, { ko: string; en: string }> = {
  money: {
    ko: '돈은 들어오는데, 새는 구멍도 같이 있어요:',
    en: 'Money is coming in — but so are the leaks:',
  },
  work: {
    ko: '자리는 커지는데, 어깨도 같이 무거워지는 달이에요:',
    en: 'The role grows — and so does the weight on your shoulders:',
  },
  relations: {
    ko: '먼저 다가가도 좋은 시기예요. 단, 가족 쪽은 결이 달라요:',
    en: 'A good time to reach out first — family, though, runs on a different grain:',
  },
  body: {
    ko: '회복은 되는데, 정작 회복할 시간이 빠듯해요:',
    en: 'Recovery is favoured — but the time to actually rest runs short:',
  },
  growth: {
    ko: '배우고 나아가긴 좋은데, 한 번에 다 잡으려다 흩어지기 쉬워요:',
    en: 'Good for learning and moving forward — just easy to scatter by grabbing it all at once:',
  },
  _default: {
    ko: '좋은 흐름과 조심할 흐름이 같이 들어와요:',
    en: 'A mixed current — supportive notes run alongside cautious ones:',
  },
}

// 도메인 안에 룰이 너무 많이 쌓이면 narrative 가 길어짐. 4개가 균형점 —
// 긍정 1~2 + 주의 1 + 컨텍스트 1 정도로 풍부하되 안 늘어짐. (v2 에서 도메인
// 룰 풀을 8→11 로 늘렸으므로 슬롯도 3→4 로 확대해 변별이 실제 표출되게.)
// fingerprint dedup 이 의미 중복은 따로 잘라내므로 4개여도 같은 말 반복 X.
const MAX_RULES_PER_DOMAIN = 4

/**
 * 도메인 안에서 의미 중복을 잡는 fingerprint group.
 * 같은 group 의 키워드가 후보·이전 본문 양쪽에 있으면 후보는 skip.
 * lifeReport 의 love.ts moonSignDedup 패턴을 룰 도메인용으로 일반화.
 *
 * 예) body 도메인에서 "회복·치유에 우호적..." 룰이 이미 들어왔는데
 *     "건강·검진에 좋은 시기..." 룰을 또 붙이면 같은 결을 두 번 말함.
 *     → 두 줄 다 ['회복', '치유', '검진'] group 을 건드리므로 후보 skip.
 */
// Fingerprint group 은 *구절* 단위 — 단일 단어("정리", "검진") 만으로 묶지
// 않음. positive 의미("자산 정리") 와 negative 의미("구조 재정비") 가 한
// 단어를 공유해도 다른 group 에 속하게 분리. 의미가 진짜 같은 두 룰만
// dedup 되고, 보완적 룰 (e.g. "회복 우호" + "과로 주의") 은 둘 다 살림.
//
// 각 group 안에 한국어 + 영어 구절을 함께 — KO/EN 본문 양쪽에서 dedup
// 동작 보장. dedup 조건은 "host 와 candidate 가 같은 group 내 *어느* 구절이든
// 둘 다 포함" 이라 KO 룰 두 개끼리는 KO 키워드로, EN 두 개끼리는 EN 키워드로
// 매치. KO ↔ EN 교차 매치는 발생 안 함 (애초에 같은 lang 안에서만 호출됨).
const DOMAIN_THEME_GROUPS: Record<string, string[][]> = {
  body: [
    ['회복과 치유', '회복·치유에 우호적', 'recovery and healing', 'favourable to recovery'],
    ['무리·과로 주의', '과로 주의', 'overwork', 'pushing too hard'],
    ['수면', '잠', 'sleep'],
    ['스트레스 누적', '긴장 누적', 'stress', 'tension build-up'],
  ],
  money: [
    ['확장 기회', '큰 흐름의 확장', '확장 기회 강함', 'expansion chances', 'expansion opportunity'],
    ['진행 지연', '구조 재정비', 'delays', 'restructure', 'reshuffle'],
    ['투자·자산 정리', '큰 베팅', 'tidying up existing assets', 'big bets'],
    ['안정적 수입', '꾸준한 수입', 'steady income', 'stable income'],
  ],
  work: [
    ['승진·자리', '공식 자리', 'promotions', 'official positions', 'representative roles'],
    ['공식 절차·서류 지연', '계약 지연', 'paperwork may stall', 'contract delays'],
    ['학업·연구', '자격증·전문 분야', 'study, research', 'certifications', 'specialty fields'],
    ['창의·표현 발의', '발표·발의', 'proposals', 'presentations'],
  ],
  relations: [
    [
      '인연·만남',
      '관계 진전이 자연스러운',
      'connection, meetings',
      'relationship progress flow naturally',
    ],
    ['진척 더딘', '기존 관계 다지기', 'progress is slow', 'deepening the ones you already have'],
    ['가족·관계 긴장', '부드러운 소통이 필요', 'subtle tension', 'softer communication'],
  ],
  growth: [
    [
      '창의·표현',
      '작품·콘텐츠',
      'creativity and expression',
      'work, content',
      'expression, creation',
    ],
    ['이동·이직·이사', '여행 환경 변화', 'travel, job switches', 'environment changes'],
    ['학습·배움 우호적', '배우고 깊이 파고드는', 'favourable for learning', 'going deep'],
    [
      '예술·고독의 별',
      '하늘 지혜의 별',
      '명상',
      'art-and-solitude',
      'heaven-wisdom star',
      'meditation, religion',
    ],
  ],
}

function fingerprintMatches(text: string, group: string[]): boolean {
  return group.some((kw) => text.includes(kw))
}

/**
 * 도메인 안 여러 룰 텍스트를 자연스럽게 한 단락으로.
 * - 첫 줄 = 메인 헤드라인
 * - 뒤따르는 룰은 줄바꿈만으로 이어붙임 (여기에/한편/추가로 연결사 제거 —
 *   고정 순환이 list-archive 느낌을 만들었음, lifeReport 의
 *   appendToPara 처럼 줄 자체가 분리자가 되게)
 * - 후보가 host 와 같은 fingerprint group 을 건드리면 skip
 * - 마지막 줄 = 그 도메인이 가장 강한 날짜 top 3 (있을 때만)
 * 룰 텍스트의 이모지 + 굵은 헤더는 제거하고 본문만 사용해 같은 톤 유지.
 */
function mergeDomainTemplates(
  texts: string[],
  topDates: string[] = [],
  lowDates: string[] = [],
  domain: string = '',
  lang: InterpretationLang = 'ko'
): string {
  if (texts.length === 0) return ''
  const cleaned = texts.map((t) => t.trim()).filter(Boolean)
  let body: string
  if (cleaned.length === 1) {
    body = cleaned[0]
  } else {
    const [head, ...rest] = cleaned
    const accumulated = [head]
    const groups = DOMAIN_THEME_GROUPS[domain] ?? []
    for (const candidate of rest) {
      const stripped = candidate.replace(
        /^[🌟💰💼❤️⚡📚✈️🎖⚖️🏢🧘🤝]+\s*\*\*[^*]+\*\*\s*[—-]\s*/u,
        ''
      )
      // Patch 3 — fingerprint dedup
      const hostSoFar = accumulated.join('\n')
      const duplicates = groups.some(
        (group) => fingerprintMatches(hostSoFar, group) && fingerprintMatches(stripped, group)
      )
      if (duplicates) continue
      accumulated.push(stripped)
    }
    body = accumulated.join('\n')
  }
  if (topDates.length > 0) {
    body +=
      lang === 'en'
        ? `\n✨ Strong days: ${topDates.join(' · ')}`
        : `\n✨ 특히 강한 날: ${topDates.join(' · ')}`
  }
  if (lowDates.length > 0) {
    body +=
      lang === 'en'
        ? `\n⚠️ Take care: ${lowDates.join(' · ')}`
        : `\n⚠️ 주의 날: ${lowDates.join(' · ')}`
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
  direction: 'high' | 'low'
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
    direction === 'high' ? b.score - a.score : a.score - b.score
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
  // key must match DOMAIN_ORDER / SECTION_TO_DOMAIN ('growth'); was 'expression'
  // which left DOMAIN_THEMES['growth'] undefined → 자기·성장 도메인의 강한날/
  // 주의날 라인이 조용히 누락되던 버그.
  growth: ['growth'],
}
