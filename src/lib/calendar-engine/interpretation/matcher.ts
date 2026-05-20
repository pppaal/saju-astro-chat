import type { ActiveSignal, CalendarCell, SignalPattern } from '../types'
import type { NatalContext } from '../context/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { Interpretation, InterpretationRule, RuleConditions, TemplateVars } from './types'
import { RULES } from './rules'
import { getGanjiTransitNarrative } from '../data/ganjiTransitNarrative'

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
}): Interpretation {
  const { natal, cells, scope = 'monthly', lang = 'ko' } = args

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
      polarity: ruleIntent(rule),
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
    const templates = sortedList.map((m) => fillTemplate(pickRuleTemplate(m.rule, lang), m.vars))
    if (hasPositive && hasCaution) {
      templates.unshift(
        lang === 'en'
          ? 'A mixed current — supportive notes run alongside cautious ones:'
          : '좋은 흐름과 조심할 흐름이 같이 들어와요:'
      )
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
    }
    picked.push(merged)
  }

  // section별 정렬 (UI 순서) — context → trigger → 5 domain
  const SECTION_ORDER = [
    'daeun',
    'seun',
    'wolun',
    'natal',
    'transit',
    'pattern',
    'shinsal',
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
  const sections = picked.map((m) => ({
    section: m.rule.section,
    title: sectionTitle(m.rule.section, lang),
    text: fillTemplate(pickRuleTemplate(m.rule, lang), m.vars),
  }))

  const narrative = sections.map((s) => `**[${s.title}]**\n${s.text}`).join('\n\n')

  // 도메인별 themeScores — 신호 평균 base + 룰 의도 adjustment.
  //
  // 점수 모델: final = signalAvg + ruleIntentAvg × 30
  //
  // - 신호 평균(cell.themeScores)이 base — 사용자 멘탈 모델(80=좋음,
  //   50=보통, 20=주의)을 따라감.
  // - 룰 의도 평균이 ±30 adjustment — narrative 톤이 양/음 쪽으로 끌어당김.
  //   우호 룰 일관(+1) 시 +30, 주의 룰 일관(-1) 시 -30, 섞이면 0.
  //
  // 결과 분포 가능 범위: 20-90+ 자유롭게.
  //  - 신호 우호(80) + 룰 우호(+1) → 110 → cap 100 (매우 좋은 날)
  //  - 신호 평균(55) + 룰 주의(-1) → 25 (주의 날)
  //  - 신호 평균(50) + 룰 중립(0) → 50 (보통)
  const DOMAIN_TO_THEME: Record<string, keyof NonNullable<Interpretation['themeScores']>> = {
    money: 'money',
    work: 'career',
    relations: 'love',
    body: 'health',
    growth: 'growth',
  }
  const cellThemeScores = cells[0]?.themeScores ?? {}
  const themeScores: NonNullable<Interpretation['themeScores']> = {}
  for (const [domain, list] of domainPicks) {
    const themeKey = DOMAIN_TO_THEME[domain]
    if (!themeKey) continue
    const intents = list.map((m) => m.polarity)
    const intentAvg = intents.length > 0 ? intents.reduce((s, p) => s + p, 0) / intents.length : 0
    // base: 신호 평균
    const signalScore = cellThemeScores[themeKey] ?? 50
    // adjustment: ±30 swing
    const final = signalScore + intentAvg * 30
    themeScores[themeKey] = Math.max(0, Math.min(100, Math.round(final)))
  }

  return {
    narrative,
    matchedRuleIds: picked.map((m) => m.rule.id),
    sections,
    themeScores,
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
      return { ctx: extractSignalVars(fallback, signals), polarity: 0 }
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
    if (v == null) return m // 변수 없으면 원본 그대로 (디버그 용이)
    return String(v)
  })
}

function sectionTitle(section: string, lang: InterpretationLang = 'ko'): string {
  const ko: Record<string, string> = {
    daeun: '10년 큰 흐름',
    seun: '올해의 운',
    wolun: '이번 달',
    natal: '타고난 결',
    transit: '주요 흐름',
    pattern: '주요 패턴',
    shinsal: '행운 별',
    // 5 도메인 통합 헤더 (5테마 1:1)
    'domain-money': '돈·자산',
    'domain-work': '일·커리어',
    'domain-relations': '관계',
    'domain-body': '몸·내면',
    'domain-growth': '자기·성장',
  }
  const en: Record<string, string> = {
    daeun: '10-year Arc',
    seun: 'This Year',
    wolun: 'This Month',
    natal: 'Your Chart',
    transit: 'Active Transits',
    pattern: 'Patterns',
    shinsal: 'Lucky Stars',
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
    ['학습·배움 우호적', 'favourable for learning'],
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
  expression: ['growth'],
}
