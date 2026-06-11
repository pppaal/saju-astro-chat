/**
 * 현재 대운 + 10년 분리 + cross-activation decadal → destinypal `decade` 객체 adapter.
 *
 * destinypal decade:
 *   { gz, start, end, ageFrom, ageTo, sibsin, theme, themeEn, headline,
 *     pillar: { cheongan, jiji }, sewoonNow, years[10], body, hapchung,
 *     unseong, astro[], narrative[], focusYear,
 *     // Phase 3 신규
 *     geokgukStatus, crossActivations }
 *
 * 입력:
 *   - NatalContext (대운 리스트 + 일간 + 격국 status)
 *   - 현재 만 나이로 정렬된 "현재 대운" 인덱스
 *   - decadal 레이어의 ActiveSignal 풀 (cross-activation 포함)
 *   - 옵션 점수/내러티브
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ActiveSignal } from '@/lib/calendar-engine/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { STEM_KO, BRANCH_KO } from '@/lib/saju/ganjiKo'
import { getStemElement, getBranchElement } from '@/lib/saju/stemBranchUtils'
import { CHUNG, YUKHAP } from '@/lib/saju/constants'
import { getTwelveStage } from '@/lib/saju/shinsal'
import { getTwelveStageInterpretation } from '@/lib/saju/interpretations'
import { twelveStagePlain } from '@/lib/calendar-engine/derivers/plainLanguage'
import { toGanji, type Ganji, geokgukStatusLine, computeSewoonGanji } from './shared'

export interface DestinypalDecadePillar {
  cheongan: { hanja: string; sibsin: string; el: string; note?: string }
  jiji: { hanja: string; sibsin: string; el: string; note?: string }
}

export interface DestinypalDecadeYear {
  year: number
  gz: Ganji
  score: number
  now: boolean
  /** 그 해 세운 천간의 일간 기준 십신 ('비견' 등). 연도별로 진짜 달라지는 결. */
  sibsin?: string
}

export interface DestinypalDecadeNarrative {
  tag: string // "이 대운의 결" / "용신 흐름" 등
  body: string
}

export interface DestinypalDecadeAstroMark {
  label: string
  date: string // "2030.12" 또는 "2035"
  body: string
  kind?: string
}

export interface DestinypalDecadeRelation {
  title: string
  romaji?: string
  body: string
}

export interface DestinypalDecadeCrossActivation {
  signalId: string
  name: string
  /** 사주 신호 한 줄 + 점성 신호 한 줄 */
  sajuLine?: string
  astroLine?: string
  polarity: number
  /** 이 cross 활성이 가리키는 한 줄 의미 (있으면) */
  meaning?: string
}

export interface DestinypalDecade {
  gz: Ganji
  start: number // year
  end: number // year (exclusive)
  ageFrom: number
  ageTo: number
  sibsin: string // 대운 천간 십신 ("편재")
  theme: string // "현실 성취 · 재물의 무대"
  themeEn: string // "Wealth · Worldly Achievement"
  headline: string
  headlineEn: string
  pillar: DestinypalDecadePillar
  sewoonNow?: { gz: Ganji; sibsin: string }
  years: DestinypalDecadeYear[]
  body: string[]
  /** 본명 × 대운 지지 충·합 — 어댑터가 항상 채움(충·합 없으면 중립 라인). */
  hapchung: DestinypalDecadeRelation
  /** 대운 지지 12운성 — 어댑터가 항상 채움. */
  unseong: DestinypalDecadeRelation
  astro: DestinypalDecadeAstroMark[]
  narrative: DestinypalDecadeNarrative[]
  focusYear: number

  // ── Phase 3 정통화 ──
  /** 격국 status (대운 — 보통은 본명과 같지만 화기/잡기 변동 가능). */
  geokgukStatus?: string
  /** 이 대운에 활성된 cross-activation (사주×점성 동시 페어). */
  crossActivations: DestinypalDecadeCrossActivation[]
}

// ── 십신 → 테마 압축 ─────────────────────────────────────────────────────
const SIBSIN_THEME_KO: Record<
  string,
  { theme: string; themeEn: string; headline: string; headlineEn: string }
> = {
  비견: {
    theme: '주체·동료의 무대',
    themeEn: 'Self · Peer',
    headline: '비견 대운 — 같은 결의 사람들 속에서 내 자리를 짓는 10년.',
    headlineEn: 'Self cycle — a decade to build your place among your own kind.',
  },
  겁재: {
    theme: '경쟁·분탈의 무대',
    themeEn: 'Rivalry · Split',
    headline: '겁재 대운 — 경쟁과 협업이 동시에 치솟는 10년.',
    headlineEn: 'Rivalry cycle — a decade where competition and collaboration both surge.',
  },
  식신: {
    theme: '표현·창작의 무대',
    themeEn: 'Creativity · Output',
    headline: '식신 대운 — 끼와 표현이 자기 결을 만드는 10년.',
    headlineEn: 'Creativity cycle — a decade where your flair and expression shape your path.',
  },
  상관: {
    theme: '자유·재능의 무대',
    themeEn: 'Talent · Free Expression',
    headline: '상관 대운 — 재능이 자유롭게 뻗어가는 10년.',
    headlineEn: 'Talent cycle — a decade where your gifts stretch out freely.',
  },
  편재: {
    theme: '현실 성취 · 재물의 무대',
    themeEn: 'Wealth · Worldly Achievement',
    headline: '편재 대운 — 손에 잡히는 결실의 10년.',
    headlineEn: 'Wealth cycle — a decade of tangible results.',
  },
  정재: {
    theme: '꾸준한 축적의 무대',
    themeEn: 'Steady Accumulation',
    headline: '정재 대운 — 차근차근 자산이 쌓이는 10년.',
    headlineEn: 'Steady-wealth cycle — a decade where assets build up bit by bit.',
  },
  편관: {
    theme: '추진·도전의 무대',
    themeEn: 'Drive · Challenge',
    headline: '편관 대운 — 강하게 밀어붙이는 10년.',
    headlineEn: 'Drive cycle — a decade of pushing hard.',
  },
  정관: {
    theme: '책임·자리의 무대',
    themeEn: 'Duty · Position',
    headline: '정관 대운 — 사회적 자리를 다지는 10년.',
    headlineEn: 'Duty cycle — a decade for cementing your standing.',
  },
  편인: {
    theme: '독자적 사유의 무대',
    themeEn: 'Independent Mind',
    headline: '편인 대운 — 독학과 깊은 사고가 빛나는 10년.',
    headlineEn: 'Independent-mind cycle — a decade where self-study and deep thought shine.',
  },
  정인: {
    theme: '배움·지원의 무대',
    themeEn: 'Learning · Support',
    headline: '정인 대운 — 배움과 지원이 든든한 10년.',
    headlineEn: 'Learning cycle — a decade well-supported by study and backing.',
  },
}

// 천간/지지 한자→한글 음 — 정본(saju/ganjiKo) 재사용. KO→HAN 역맵은 파생.
const STEM_KO_TO_HAN: Record<string, string> = Object.fromEntries(
  Object.entries(STEM_KO).map(([h, k]) => [k, h])
)
const BRANCH_KO_TO_HAN: Record<string, string> = Object.fromEntries(
  Object.entries(BRANCH_KO).map(([h, k]) => [k, h])
)

// ── 60갑자 ↔ index helpers ──────────────────────────────────────────────
const BRANCH_POS_KO: Record<string, string> = { year: '연', month: '월', day: '일', time: '시' }

/**
 * 대운 지지 × 본명 4지지 충·합 — 이미 있는 충/합 정본표(CHUNG/YUKHAP)를 그대로
 * 룩업. 새 계산 없음. 일/시지 우선으로 가장 가까운 관계 하나를 한 줄로.
 * 충·합이 없으면 "뚜렷한 충·합 없음" 중립 라인(플레이스홀더 대신).
 */
function buildDecadeHapchung(natal: NatalContext, decadeBranch: string): DestinypalDecadeRelation {
  const pillars = (natal.saju?.pillars ?? {}) as unknown as Record<
    string,
    { earthlyBranch?: { name?: string } }
  >
  const ko = (b: string) => BRANCH_KO[b] ?? b
  const db = decadeBranch
  const hits: DestinypalDecadeRelation[] = []
  for (const key of ['day', 'time', 'month', 'year']) {
    const nb = pillars[key]?.earthlyBranch?.name
    if (!nb) continue
    const pos = BRANCH_POS_KO[key] ?? key
    if (CHUNG[db] === nb) {
      hits.push({
        title: `${nb}${db}충`,
        body: `본명 ${pos}지 ${nb}(${ko(nb)}) × 대운 ${db}(${ko(db)}) → ${nb}${db}충 — 이 영역에 변동·이동 압력이 실려요.`,
      })
    } else if (YUKHAP[db] === nb) {
      hits.push({
        title: `${nb}${db}육합`,
        body: `본명 ${pos}지 ${nb}(${ko(nb)}) × 대운 ${db}(${ko(db)}) → ${nb}${db}육합 — 환경이 손발을 맞춰줘요.`,
      })
    }
  }
  if (hits.length === 0) {
    return {
      title: '—',
      body: `본명 지지와 대운 ${db}(${ko(db)}) 사이 뚜렷한 충·합은 없어요 — 무난히 흘러가요.`,
    }
  }
  // 가장 가까운(일/시지) 관계를 title 로, 나머지는 본문에 이어 붙임.
  return {
    title: hits[0].title,
    body: hits.map((h) => h.body).join(' '),
  }
}

/**
 * 대운 지지의 일간 기준 12운성 — 이미 있는 getTwelveStage + 해석사전 룩업. 새 계산 없음.
 */
function buildDecadeUnseong(dm: string, decadeBranch: string): DestinypalDecadeRelation {
  const stage = getTwelveStage(dm, decadeBranch)
  const ko = BRANCH_KO[decadeBranch] ?? decadeBranch
  // 쉬운말 우선: "막 자리를 잡아가는 기세" — 못 찾으면 해석사전 meaning 폴백.
  const plain = twelveStagePlain(stage)
  const interp = getTwelveStageInterpretation(stage as never)
  const desc = plain || interp?.meaning || ''
  return {
    title: stage,
    body: desc
      ? `대운 자리(${decadeBranch}·${ko})는 ${stage} — ${desc}`
      : `대운 자리(${decadeBranch}·${ko})는 ${stage}예요.`,
  }
}

export interface ToDecadeOptions {
  /** 현재 만 나이 (어느 대운이 "현재"인지 결정). 미지정 시 첫 대운. */
  currentAge?: number
  /** 현재 연도 (focusYear 기본값 + sewoonNow 산출). 미지정 시 첫 대운 시작연도. */
  currentYear?: number
  /** decadal 레이어의 ActiveSignal — cross-activation 포함. */
  decadalSignals?: ActiveSignal[]
  /** 10년 연간 점수 배열 (선택). 없으면 50으로 채움. */
  yearScores?: number[]
  /** 본문 body 문장 (선택). */
  body?: string[]
  /** 추가 narrative — 키워드 태그/본문 쌍. */
  narrative?: DestinypalDecadeNarrative[]
  /** 외부 행성 마디 (선택) — destinypal demo 식 "세 번째 목성 회귀 2030.12" 등. */
  astroMarks?: DestinypalDecadeAstroMark[]
  /** hapchung / unseong 라인 — derive 함수가 만든 결과 직주입. */
  hapchung?: DestinypalDecadeRelation
  unseong?: DestinypalDecadeRelation
  /** focusYear — 어느 해를 펼쳐 보일지. 미지정 시 currentYear. */
  focusYear?: number
}

/**
 * 현재 대운 + 10년 분리 + cross-activation decadal → destinypal decade 객체.
 *
 * 흐름:
 *  1. NatalContext.daeun 에서 currentAge 가 들어있는 대운을 찾는다 (대표 대운).
 *  2. 일간 기준 천간 십신 + 지지 십신(지지 본기 천간 기준) 산출.
 *  3. SIBSIN_THEME_KO 에서 theme/themeEn/headline 가져온다.
 *  4. years[10] — 대표 대운 시작연도부터 +9 년의 세운 ganji (60갑자 shift).
 *  5. sewoonNow — 현재 연도가 들어있는 years 항목.
 *  6. crossActivations — decadalSignals 에서 kind === 'cross-activation' 만 추출.
 *  7. geokgukStatus — 본명 status 재사용 (대운 변형은 future work).
 */
export function toDecade(natal: NatalContext, opts: ToDecadeOptions = {}): DestinypalDecade | null {
  const daeunList = natal.saju?.daeun ?? []
  const dm = natal.saju?.dayMaster?.name
  if (daeunList.length === 0 || !dm) return null

  const currentAge = opts.currentAge ?? daeunList[0].startAge
  const currentYear = opts.currentYear ?? daeunList[0].startYear

  // 현재 대운
  const current =
    daeunList.find((d) => currentAge >= d.startAge && currentAge < d.startAge + 10) ?? daeunList[0]

  const sibsinStem = safeSibsin(dm, current.stem)
  // 지지의 본기(정기) 천간을 통해 지지 십신 — 간단히 지지 오행 → 일간과의 관계.
  const sibsinBranch = deriveBranchSibsin(dm, current.branch)

  const theme = SIBSIN_THEME_KO[sibsinStem] ?? {
    theme: `${sibsinStem} 흐름`,
    themeEn: sibsinStem,
    headline: `${current.stem}${current.branch} 대운 — ${sibsinStem} 흐름의 10년.`,
    headlineEn: `${current.stem}${current.branch} luck cycle — a ${sibsinStem} decade.`,
  }

  // years[10] — 각 해의 *세운*(연도 고유 60갑자). 대운 간지를 굴리면 안 됨
  // (세운은 대운과 무관) → computeSewoonGanji 로 연도별 진짜 세운을 쓴다.
  const yearsArr: DestinypalDecadeYear[] = []
  for (let i = 0; i < 10; i++) {
    const y = current.startYear + i
    const sr = computeSewoonGanji(y)
    yearsArr.push({
      year: y,
      gz: toGanji(sr.stem, sr.branch),
      score: opts.yearScores?.[i] ?? 50,
      now: y === currentYear,
      sibsin: safeSibsin(dm, sr.stem),
    })
  }

  // sewoonNow — focusYear 의 진짜 세운 (YearTier 와 동일 계산, 단일 소스).
  let sewoonNow: DestinypalDecade['sewoonNow']
  const focusYear = opts.focusYear ?? currentYear
  const yearItem = yearsArr.find((y) => y.year === focusYear)
  if (yearItem) {
    const sr = computeSewoonGanji(focusYear)
    sewoonNow = { gz: yearItem.gz, sibsin: safeSibsin(dm, sr.stem) }
  }

  // cross-activation 풀에서 decadal layer 만 — 같은 페어가 여러 날 중복되므로
  // 이름으로 dedup, 의미는 신호의 korean(매핑 meaning.ko)에서 가져온다.
  const crossSeen = new Map<string, DestinypalDecadeCrossActivation>()
  for (const s of opts.decadalSignals ?? []) {
    if (s.kind !== 'cross-activation' || s.layer !== 'decadal') continue
    if (crossSeen.has(s.name)) {
      // 가장 강한 polarity 를 대표로.
      const cur = crossSeen.get(s.name)!
      if (Math.abs(s.polarity) > Math.abs(cur.polarity)) cur.polarity = s.polarity
      continue
    }
    crossSeen.set(s.name, {
      signalId: s.id,
      name: s.name,
      sajuLine: extractEvidenceField(s, 'sajuKey'),
      astroLine: extractEvidenceField(s, 'astroKey'),
      polarity: s.polarity,
      meaning: s.korean ?? extractEvidenceField(s, 'meaning'),
    })
  }
  const crossActivations: DestinypalDecadeCrossActivation[] = [...crossSeen.values()].sort(
    (a, b) => Math.abs(b.polarity) - Math.abs(a.polarity)
  )

  // 격국 status (현 단계는 본명 status 재사용)
  const advanced = natal.saju.analyses
  const statusResult = advanced?.geokguk?.statusResult
  const geokgukStatus = geokgukStatusLine(
    advanced?.geokguk?.primary && advanced.geokguk.primary !== '미정'
      ? advanced.geokguk.primary
      : undefined,
    statusResult?.status,
    statusResult?.factors?.positive,
    statusResult?.factors?.negative
  )

  // pillar 정통화 — 한자/한글 음 모두 노출
  const stemHan = STEM_KO_TO_HAN[current.stem] ?? current.stem
  const branchHan = BRANCH_KO_TO_HAN[current.branch] ?? current.branch
  const stemElement = safeStemElement(current.stem)
  const branchElement = safeBranchElement(current.branch)
  const pillar: DestinypalDecadePillar = {
    cheongan: {
      hanja: stemHan,
      sibsin: sibsinStem,
      el: `${stemElement}(${ELEMENT_HAN[stemElement] ?? ''})`,
      note: PILLAR_STEM_NOTE[sibsinStem],
    },
    jiji: {
      hanja: branchHan,
      sibsin: sibsinBranch,
      el: `${branchElement}(${ELEMENT_HAN[branchElement] ?? ''})`,
      note: PILLAR_BRANCH_NOTE[sibsinBranch],
    },
  }

  return {
    gz: toGanji(current.stem, current.branch),
    start: current.startYear,
    end: current.startYear + 10,
    ageFrom: current.startAge,
    ageTo: current.startAge + 10,
    sibsin: sibsinStem,
    theme: theme.theme,
    themeEn: theme.themeEn,
    headline: theme.headline,
    headlineEn: theme.headlineEn,
    pillar,
    sewoonNow,
    years: yearsArr,
    body: opts.body ?? [theme.headline],
    hapchung: opts.hapchung ?? buildDecadeHapchung(natal, current.branch),
    unseong: opts.unseong ?? buildDecadeUnseong(dm, current.branch),
    astro: opts.astroMarks ?? [],
    narrative: opts.narrative ?? [],
    focusYear,
    geokgukStatus,
    crossActivations,
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
const PILLAR_STEM_NOTE: Record<string, string> = {
  비견: '주체성 천간 — 같은 결의 동료/경쟁',
  겁재: '경쟁 천간 — 동료지만 분탈 우려',
  식신: '표현 천간 — 끼와 창작 동력',
  상관: '재능 천간 — 자유로운 표현',
  편재: '재성 천간 — 바깥세상·돈·연애의 동력',
  정재: '재성 천간 — 안정적 축적',
  편관: '관성 천간 — 강한 추진·도전',
  정관: '관성 천간 — 책임·자리',
  편인: '인성 천간 — 독자적 사유',
  정인: '인성 천간 — 배움·지원',
}
const PILLAR_BRANCH_NOTE: Record<string, string> = {
  비견: '동료 지지 — 자기 결의 무대',
  겁재: '경쟁 지지 — 분탈 가능',
  식신: '표현 지지 — 창작이 뿌리내림',
  상관: '재능 지지 — 자유롭게 펼침',
  편재: '재성 지지 — 활동성 강한 토양',
  정재: '재성 지지 — 꾸준한 축적의 뿌리',
  편관: '관성 지지 — 강한 압력의 토대',
  정관: '관성 지지 — 사회적 자리의 뿌리',
  편인: '인성 지지 — 독자적 학습의 토양',
  정인: '인성 지지 — 배움·지원·안정의 뿌리',
}

const ELEMENT_HAN: Record<string, string> = {
  목: '木',
  화: '火',
  토: '土',
  금: '金',
  수: '水',
}

function safeSibsin(dm: string, stem: string): string {
  try {
    return getSibsinKo(dm, stem) || '—'
  } catch {
    return '—'
  }
}
function safeStemElement(stem: string): string {
  try {
    return getStemElement(stem) ?? ''
  } catch {
    return ''
  }
}
function safeBranchElement(branch: string): string {
  try {
    return getBranchElement(branch) ?? ''
  } catch {
    return ''
  }
}

/**
 * 지지 십신 — 지지 오행을 일간 오행과의 관계로 압축.
 * 같은 오행 → 비견/겁재 (음양 같으면 비견)
 * 일간 생 → 식신/상관
 * 일간 극 → 정재/편재
 * 일간 극당함 → 정관/편관
 * 일간 생받음 → 정인/편인
 */
function deriveBranchSibsin(dm: string, branch: string): string {
  try {
    const dmEl = getStemElement(dm)
    const brEl = getBranchElement(branch)
    if (!dmEl || !brEl) return '—'
    // simplified — 양/음 구분 안 함 (정통은 지지 본기 천간 거쳐야 함). 빠진 경우
    // 사이드카 derive 함수(saju-jijanggan extractor) 가 그쪽을 채운다.
    if (dmEl === brEl) return '비견'
    if (generates(dmEl, brEl)) return '식신' // dm → br
    if (generates(brEl, dmEl)) return '정인' // br → dm
    if (overcomes(dmEl, brEl)) return '정재' // dm overcomes br
    if (overcomes(brEl, dmEl)) return '정관' // br overcomes dm
    return '—'
  } catch {
    return '—'
  }
}

const ELEMENT_CYCLE = ['목', '화', '토', '금', '수']
function generates(a: string, b: string): boolean {
  const i = ELEMENT_CYCLE.indexOf(a)
  const j = ELEMENT_CYCLE.indexOf(b)
  if (i < 0 || j < 0) return false
  return (i + 1) % 5 === j
}
function overcomes(a: string, b: string): boolean {
  const i = ELEMENT_CYCLE.indexOf(a)
  const j = ELEMENT_CYCLE.indexOf(b)
  if (i < 0 || j < 0) return false
  return (i + 2) % 5 === j
}

function extractEvidenceField(s: ActiveSignal, key: string): string | undefined {
  const v = s.evidence?.detail?.[key]
  return typeof v === 'string' ? v : undefined
}
