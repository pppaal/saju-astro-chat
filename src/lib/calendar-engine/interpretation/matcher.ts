import type { ActiveSignal, CalendarCell, SignalPattern } from '../types'
import type { NatalContext } from '../context/types'
import type { Interpretation, InterpretationRule, RuleConditions, TemplateVars } from './types'
import { RULES } from './rules'
import { getGanjiTransitNarrative } from '../data/ganjiTransitNarrative'
import { deriveKeyEvents } from '../derivers/keyEvents'
import { deriveConvergence } from '../derivers/convergence'
import { deriveLifetimePivots } from '../derivers/lifetimePivots'
import type { LifecycleMilestoneOverride } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { deriveLifetimeFlow } from '../derivers/lifetimeFlow'
import { deriveYearAstro, type SolarReturnSummary } from '../derivers/yearAstro'
import { deriveMonthComparison } from '../derivers/monthComparison'
import { SIBSIN_CAT, deriveCycleTone, deriveAstroTone } from '../derivers/cycleTone'

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
  /**
   * 외행성 마일스톤(토성·목성·천왕성·해왕성·명왕성·카이런) 의 실제 transit
   * 기반 정확 연도. 미지정 시 deriveLifetimePivots 가 평균 나이대 테이블로
   * 폴백(옛 동작). 호출자(api/calendar)가 calculateOuterPlanetMilestones 로
   * 미리 계산해 전달한다 — 그래야 같은 출생연도 두 명의 토성 회귀가 다른
   * 연도로 표기되는 진짜 개인화가 발생.
   */
  astroMilestoneOverrides?: readonly LifecycleMilestoneOverride[]
  /**
   * Solar Return 요약 — 호출자(api/calendar)가 swisseph 기반으로 미리 계산해
   * 전달. yearAstro 한 줄 뒤에 "올해의 솔라 리턴: ASC … / 태양 …" 형태로 합성.
   * 미지정 시 솔라 리턴 라인 생략 (astroMilestoneOverrides 와 동일 패턴).
   */
  solarReturnSummary?: SolarReturnSummary
}): Interpretation {
  const {
    natal,
    cells,
    scope = 'monthly',
    lang = 'ko',
    prevCells,
    debug,
    astroMilestoneOverrides,
    solarReturnSummary,
  } = args

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
  const picked: typeof matched = []

  // 시간 cycle 섹션 cap. 대운/세운은 2줄(둘째가 다른 테마 — 귀인 등 — 으로 깊이↑).
  // 월운은 1줄: 간지 성격 룰(gwanseong-weak·summer-fire 등)이 모두 '{월간지} 월 —'
  // 접두를 달아 2줄이면 '계사 월 —'이 두 번 + 서로 polarity 가 어긋나 모순(부담↔우호)
  // 까지 났다. 순탄/고비 톤(deriveCycleTone)이 이미 '판정+조언'을 담으므로 월운은
  // 간지 성격 한 줄이면 충분.
  const SECTION_CAP: Record<string, number> = {
    daeun: 2,
    seun: 2,
    wolun: 1,
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

  // ── 톤 섹션 모순 방지 ──
  // 올해/이번달/대운 판정 섹션(seun/wolun/daeun)은 cap 이 2여도 "우호적"과
  // "부담"이 둘 다 fire 하면 한 섹션 안에서 자기모순이 난다(관살혼잡처럼 좋은
  // 신호·나쁜 신호가 공존하는 사주). 그래서 그 섹션 후보들의 우호(polarity≥1) vs
  // 주의(≤-1) *강도* 를 비교해 **지배적인 한 톤만** 허용한다. 중립(0)은 보강용으로
  // 통과(귀인·신살 등 둘째 줄). 한쪽만 있으면 필터 없음(정상). 동률이면 보수적으로
  // 주의 우선.
  const TONE_SECTIONS = new Set(['seun', 'wolun', 'daeun'])
  const toneAllowSign = new Map<string, 1 | -1>()
  for (const section of TONE_SECTIONS) {
    let posStr = 0
    let negStr = 0
    for (const m of matched) {
      if (m.rule.section !== section) continue
      if (m.polarity >= 1) posStr = Math.max(posStr, m.strength)
      else if (m.polarity <= -1) negStr = Math.max(negStr, m.strength)
    }
    if (posStr > 0 && negStr > 0) toneAllowSign.set(section, negStr >= posStr ? -1 : 1)
  }

  for (const m of matched) {
    if (usedRuleIds.has(m.rule.id)) continue
    // 회전 섹션이면 이번 달 회전 대상(앵커 + 회전 픽)만 통과.
    const allow = rotatedAllow.get(m.rule.section)
    if (allow && !allow.has(m.rule.id)) continue
    const cap = SECTION_CAP[m.rule.section] ?? 1
    const cur = sectionCount.get(m.rule.section) ?? 0
    if (cur >= cap) continue
    // 톤 섹션: 지배 톤과 반대 부호면 제외 (모순 방지). 중립은 통과.
    const allowSign = toneAllowSign.get(m.rule.section)
    if (allowSign != null) {
      const sign = m.polarity >= 1 ? 1 : m.polarity <= -1 ? -1 : 0
      if (sign !== 0 && sign !== allowSign) continue
    }
    picked.push(m)
    sectionCount.set(m.rule.section, cur + 1)
    usedRuleIds.add(m.rule.id)
  }

  // section별 정렬 (UI 순서) — context → trigger
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

  // ── 순탄/고비 톤 — 세운(올해)·월운(이달) 섹션 맨 앞에 한 줄 ──
  // 인생 흐름(대운)과 동일한 신강·신약 × 십신 규칙(cycleTone, SSOT)으로, 그 주기가
  // 우호적인지 힘에 부치는지 사람마다 다르게 표시. 세운/월운 십신은 신호에서 가져옴.
  if (lang === 'ko') {
    // 그 레이어 십신 + 오행(용신 판정용) — sibsin 있는 첫 신호에서.
    const layerInfo = (layer: ActiveSignal['layer']) => {
      for (const s of allSignals) {
        const sib = s.evidence?.sibsin as string | undefined
        if (s.layer === layer && sib && SIBSIN_CAT[sib]) {
          return { cat: SIBSIN_CAT[sib], element: s.evidence?.element as string | undefined }
        }
      }
      return undefined
    }
    const prepend = (sectionId: string, line?: string) => {
      if (!line) return
      const sec = sections.find((s) => s.section === sectionId)
      if (sec) sec.text = `${line}\n${sec.text}`
    }
    const strength = natal.saju?.strength
    const yong = natal.saju?.yongsin
    const yearI = layerInfo('yearly')
    const monthI = layerInfo('monthly')
    prepend('seun', deriveCycleTone('year', strength, yearI?.cat, yearI?.element, yong))
    prepend('wolun', deriveCycleTone('month', strength, monthI?.cat, monthI?.element, yong))
    // 점성도 사람마다 — 이달 transit 섹션 맨 앞에, 그 달 '본명에 닿는' 각도(개인
    // 차트 대비)의 우호/마찰을 한 줄로. 하늘 상태(만인 공통)가 아닌 natal aspect라
    // 사람마다 갈림. (올해=프로펙션 하우스, 오늘=일별 aspect 가 이미 개인화 담당)
    prepend('transit', deriveAstroTone('month', allSignals))
  }

  // 문체 — 한글 룰 템플릿에 하드코딩된 영어 행성/용어(Saturn Return, Jupiter…)를
  // 한글로 후처리(ko 출력 일관성). 룰 수백 개를 일일이 안 고쳐도 됨.
  // 이어서 생애 단계(미성년/노년)에 맞춰 어휘 보정 — 성인은 무변경.
  if (lang === 'ko') {
    const band = ((): AgeBand => {
      const birthYear = natal.input?.year
      const scopeYear = (() => {
        const iso = cells[0]?.datetime
        const d = iso ? new Date(iso) : null
        return d && !Number.isNaN(d.getTime()) ? d.getUTCFullYear() : new Date().getUTCFullYear()
      })()
      if (!birthYear) return 'adult'
      // 만 나이 기준 — 사주/점성 전체 컨벤션 일치 (2026-06: +1 한국나이 제거).
      // 임계값은 옛 한국나이 boundary(19/66)에서 −1 — 같은 사람을 같은 카테고리로
      // 분류 (born <= scopeYear-18 → minor, born <= scopeYear-65 → senior).
      const manAge = scopeYear - birthYear
      if (manAge < 18) return 'minor'
      if (manAge >= 65) return 'senior'
      return 'adult'
    })()
    for (const s of sections) s.text = koAgeAdjust(koAstroTerms(s.text), band)
  }

  const narrative = sections.map((s) => `**[${s.title}]**\n${s.text}`).join('\n\n')

  // 키 이벤트 3 — 월간일 때만 (일별 셀에서 베스트/강한구간/피할날 추출).
  const keyEvents = scope === 'monthly' ? deriveKeyEvents(cells) : undefined
  // 수렴 큰 날 — 무거운 이벤트가 점성·사주 겹치는 날 (keyEvents 와 별개, additive).
  const convergence = scope === 'monthly' ? deriveConvergence(cells, 5, lang) : undefined
  // 인생 분기점 — 점성 라이프사이클 × 대운 전환 (natal 스케일, 월과 무관하나
  // monthly 카드에 함께 노출). 순수 산술이라 매월 재계산해도 저렴.
  const lifetimePivots =
    scope === 'monthly' ? deriveLifetimePivots(natal, lang, astroMilestoneOverrides) : undefined
  const lifetimeFlow =
    scope === 'monthly' ? deriveLifetimeFlow(natal, lang, astroMilestoneOverrides) : undefined
  // 올해 점성 한 줄 (연간 프로펙션 + 순탄/고비) — seun(사주)에 점성 짝을 맞춰 교차.
  // 프로펙션(영역) 뒤에 본명 aspect 우호/시험(deriveAstroTone)을 이어 붙여 favorability 까지.
  const yearAstro = (() => {
    if (scope !== 'monthly') return undefined
    const year = Number(cells[0]?.datetime?.slice(0, 4)) || new Date().getFullYear()
    const base = deriveYearAstro(natal, year, lang, solarReturnSummary)
    if (!base) return undefined
    if (lang !== 'ko') return base
    const fav = deriveAstroTone('year', allSignals)
    return fav ? `${base} ${fav}` : base
  })()

  // 지난달 대비 — 월간 + prevCells 가 주어졌을 때만. 전체 흐름 점수(avg derivedScore)
  // delta 만 비교(테마 5버킷 축 제거).
  let monthComparison
  if (scope === 'monthly' && prevCells && prevCells.length > 0) {
    monthComparison = deriveMonthComparison({
      currCells: cells,
      prevCells,
    })
  }

  return {
    narrative,
    matchedRuleIds: picked.map((m) => m.rule.id),
    allMatchedRuleIds: debug ? matched.map((m) => m.rule.id) : undefined,
    sections,
    keyEvents,
    convergence,
    lifetimePivots,
    lifetimeFlow,
    yearAstro,
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
  // 그 달 평균 대비 *상대* 라벨 — derivedScore(raw)는 displayScore(표시)와 스케일이
  // 달라 절대 임계(75/60/45)를 쓰면 "전부 조심할 주"가 됐다. 주간 편차로만 판단해
  // 스케일에 무관하고, 그 달 안에서의 강약만 표시한다(혼란스런 raw 숫자도 제거).
  const monthAvg = dated.reduce((a, b) => a + b.score, 0) / dated.length
  const labelKo = (d: number) => (d >= 4 ? '좋은 주' : d <= -4 ? '주의 주' : '평이한 주')
  const labelEn = (d: number) => (d >= 4 ? 'good' : d <= -4 ? 'careful' : 'steady')
  const parts: string[] = []
  weeks.forEach((w, i) => {
    if (w.scores.length === 0) return
    const avg = w.scores.reduce((a, b) => a + b, 0) / w.scores.length
    const dev = avg - monthAvg
    parts.push(lang === 'en' ? `W${i + 1} ${labelEn(dev)}` : `${i + 1}주 ${labelKo(dev)}`)
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

// 영어 점성 용어 → 한글 (멀티워드 먼저). ko narrative 문체 일관용.
const ASTRO_KO_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSaturn Return\b/g, '토성 회귀'],
  [/\bJupiter Return\b/g, '목성 회귀'],
  [/\bSolar Return\b/g, '태양 회귀'],
  [/\bLunar Return\b/g, '달 회귀'],
  [/\bTrue Node\b/g, '북교점'],
  [/\bNorth Node\b/g, '북교점'],
  [/\bSouth Node\b/g, '남교점'],
  [/\bSun\b/g, '태양'],
  [/\bMoon\b/g, '달'],
  [/\bMercury\b/g, '수성'],
  [/\bVenus\b/g, '금성'],
  [/\bMars\b/g, '화성'],
  [/\bJupiter\b/g, '목성'],
  [/\bSaturn\b/g, '토성'],
  [/\bUranus\b/g, '천왕성'],
  [/\bNeptune\b/g, '해왕성'],
  [/\bPluto\b/g, '명왕성'],
  [/\bChiron\b/g, '카이런'],
  [/\bLilith\b/g, '릴리스'],
  [/\bAscendant\b/g, '상승점'],
  // aspect 명 (영어 잔존분)
  [/\bConjunction\b/gi, '컨정션'],
  [/\bOpposition\b/gi, '어포지션'],
  [/\bSquare\b/gi, '스퀘어'],
  [/\bTrine\b/gi, '트라인'],
  [/\bSextile\b/gi, '섹스타일'],
  [/\bQuintile\b/gi, '퀸타일'],
]
function koAstroTerms(text: string): string {
  let s = text
  for (const [re, ko] of ASTRO_KO_REPLACEMENTS) s = s.replace(re, ko)
  return s
}

// ── 나이·상황 맞춤 어휘 (ko) ──
// 룰 템플릿은 일하는 성인 기준으로 쓰여 있어, 미성년/노년 사용자에겐 어색한
// 용어(이직·창업·취업·현금흐름·포트폴리오…)가 그대로 나온다. 사주/점성 *판정*은
// 그대로 두고, 출력 *문구*만 생애 단계에 맞게 바꾼다(결정론적·LLM 무사용).
// 성인(19~65)은 무변경.
function lastCharHasJong(s: string): { jong: boolean; rieul: boolean } {
  const t = s.trim()
  if (!t) return { jong: false, rieul: false }
  const c = t.charCodeAt(t.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return { jong: false, rieul: false }
  const j = (c - 0xac00) % 28
  return { jong: j !== 0, rieul: j === 8 }
}
type JosaType = 'obj' | 'subj' | 'top' | 'and' | 'dir'
const JOSA_VAR: Record<string, JosaType> = {
  을: 'obj',
  를: 'obj',
  이: 'subj',
  가: 'subj',
  은: 'top',
  는: 'top',
  과: 'and',
  와: 'and',
  으로: 'dir',
  로: 'dir',
}
function josaFor(type: JosaType, word: string): string {
  const { jong, rieul } = lastCharHasJong(word)
  switch (type) {
    case 'obj':
      return jong ? '을' : '를'
    case 'subj':
      return jong ? '이' : '가'
    case 'top':
      return jong ? '은' : '는'
    case 'and':
      return jong ? '과' : '와'
    case 'dir':
      return !jong || rieul ? '로' : '으로'
  }
}
// 명사 치환 — 뒤따르는 가변 조사를 새 명사 받침에 맞게 다시 붙여 비문 방지.
function swapNoun(text: string, from: string, to: string): string {
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${esc}(으로|로|을|를|이|가|은|는|과|와)?`, 'g')
  return text.replace(re, (_m, josa?: string) => {
    if (josa && JOSA_VAR[josa]) return to + josaFor(JOSA_VAR[josa], to)
    return to + (josa ?? '')
  })
}
type AgeBand = 'minor' | 'adult' | 'senior'
// 복합어(생애 이벤트 묶음)를 먼저, 단일 명사를 나중에 — 전부 swapNoun 경유라
// 뒤따르는 조사를 새 어휘 받침에 맞춰 다시 붙인다(작품+를→작품을 식 비문 방지).
const AGE_ENTRIES: Record<Exclude<AgeBand, 'adult'>, Array<[string, string]>> = {
  minor: [
    ['계약·결혼·이직·창업', '새로운 도전'],
    ['이직·창업', '새 도전'],
    ['SNS·블로그·포트폴리오', '취미·기록·작품'],
    ['자격증·시험·전문성 강화', '공부·시험·실력 다지기'],
    ['수입 확보·자산 정리·계약', '용돈 관리·정리·약속'],
    ['큰 투자보다 현금흐름 안정', '욕심내기보다 차근차근 모으기'],
    ['현금흐름', '용돈'],
    ['취업', '진로'],
    ['이직', '진로 변화'],
    ['창업', '새 도전'],
    ['승진', '인정받기'],
    ['연봉', '성과'],
    ['면접', '시험·발표'],
    ['포트폴리오', '작품'],
  ],
  senior: [
    ['계약·결혼·이직·창업', '새로운 결정'],
    ['이직·창업', '새 역할·새 시작'],
    ['SNS·블로그·포트폴리오', '취미·기록·작품'],
    ['취업', '새 활동'],
    ['이직', '새 역할'],
    ['창업', '새 시작'],
    ['승진', '인정'],
    ['연봉', '보람'],
    ['면접', '만남'],
    ['포트폴리오', '기록'],
  ],
}
function koAgeAdjust(text: string, band: AgeBand): string {
  if (band === 'adult') return text
  let s = text
  for (const [from, to] of AGE_ENTRIES[band]) s = swapNoun(s, from, to)
  return s
}

function fillTemplate(template: string, vars: TemplateVars): string {
  const filled = template.replace(/\{(\w+)\}/g, (m, key) => {
    const v = vars[key as keyof TemplateVars]
    if (v == null) return m // 변수 없으면 원본 그대로 (디버그 용이)
    return String(v)
  })
  // 빈 변수(예: 월간지 미보유 신호)로 생긴 깨진 마크다운/공백 정리:
  //   '**{monthGanji}**' → '****' → 제거,  중복 스페이스/줄머리 공백 정돈.
  //   '**[제목]**' 처럼 내용 있는 bold 는 매칭 안 됨([ \t]* 는 같은 줄 빈 bold 만).
  return filled
    .replace(/\*\*[ \t]*\*\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+/gm, '')
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
  }
  const map = lang === 'en' ? en : ko
  return map[section] ?? section
}
