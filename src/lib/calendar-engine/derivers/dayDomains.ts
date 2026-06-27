/**
 * dayDomains — 그날(일진)의 십신 기운을 6개 생활 분야로 풀어주는 deriver (KO/EN).
 *
 * 새 점괘를 지어내지 않는다. 그날 *일진 십신*(일간 기준 그날 천간/지지의 십신)이
 * 어떤 기운인지 + 그 기운이 각 분야에 무슨 의미인지를 명리 표준 의미로 엮을 뿐.
 * 같은 토대(SIBSIN_GUIDE)와 톤을 공유한다.
 *
 * 분야: 연애 / 재물 / 직업 / 인간관계(귀인) / 공부·문서 / 건강.
 * 연애만 성별 의존(남=재성, 여=관성이 배우자성). 점수 구간(band)은 섹션 머리말
 * 한 줄로 톤을 잡고, 분야별 '오늘 켜짐(active)' 플래그로 강조한다.
 */

import { translateSignalLabel } from './signalI18n'
import { hashStringToInt, pickBySeed } from './personSeed'
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'
import {
  type Pair,
  type DayScoreBand,
  type SibsinCategory,
  SIBSIN_CATEGORY,
} from './dayDomains.types'
import { ADVICE, LOVE_POOLS, BAND_NOTE, CAUTION_BODY, BAND_DOMAIN_CLAUSE } from './dayDomains.copy'

// 공개 표면 유지 — DayScoreBand 는 이전처럼 이 모듈에서 노출(소비자 import 경로 불변).
export type { DayScoreBand } from './dayDomains.types'

/**
 * 같은 사람(seed)에게 같은 상태(key)면 항상 같은 변주, 다른 사람이면 다른 변주.
 * 변주 풀은 모두 *같은 명리 의미*를 다른 표현으로 옮긴 것이라 근거를 해치지 않는다.
 * pickBySeed 가 (seed + key) % len 으로 회전하므로, key 는 (분야·밴드 등) 상태별로
 * 안정적인 작은 정수면 된다.
 */
function pickPair(pool: readonly Pair[], seed: number, key: number, ko: boolean): string {
  const p = pickBySeed(pool, seed, key)
  return ko ? p.ko : p.en
}

/** 그날 실제 신호 한 개를 분야 근거로 표시 — 트랜짓·신살·교차. */
export interface DomainEvidence {
  /** 표시 텍스트 (호출 시 locale 반영해서 ko/en 중 하나). */
  text: string
  polarity: number
  /** 'astro'=트랜짓 · 'saju'=신살 · 'cross'=사주×점성 교차 · 'moon'=시별 달 절정. */
  kind: 'astro' | 'saju' | 'cross' | 'moon'
  /** moon 근거일 때만 — 시각 창(괄호 제거 전 원본). 본문에 시각을 엮을 때 읽는다. */
  when?: string
  whenEn?: string
}

export interface DayDomainAdvice {
  key: string
  icon: string
  label: string
  labelEn: string
  body: string
  bodyEn: string
  /** 오늘 이 분야가 켜졌는가 — 십신이 직접 관장하거나 실제 신호가 붙으면 true. */
  active: boolean
  /** 그날 실제로 이 분야에 떨어진 신호 근거 (없으면 빈 배열 = 십신 기본 조언만). */
  evidence: DomainEvidence[]
}

export interface DayDomainsResult {
  /** 점수 구간 머리말(순풍/평이/역풍). */
  bandNote: string
  bandNoteEn: string
  domains: DayDomainAdvice[]
}

const DOMAIN_META: Array<{ key: string; icon: string; ko: string; en: string }> = [
  { key: 'love', icon: '❤️', ko: '연애', en: 'Love' },
  { key: 'money', icon: '💰', ko: '재물·돈', en: 'Money' },
  { key: 'career', icon: '💼', ko: '직업·일', en: 'Career' },
  { key: 'people', icon: '🤝', ko: '인간관계·도와줄 사람', en: 'People & allies' },
  { key: 'study', icon: '📚', ko: '공부·문서', en: 'Study & papers' },
  { key: 'health', icon: '🌿', ko: '건강', en: 'Health' },
]


function isFemale(sex: string): boolean {
  return sex === '여' || /female|^f$/i.test(sex)
}
function isMale(sex: string): boolean {
  return sex === '남' || /male|^m$/i.test(sex)
}


/** 연애 분야 — 성별 의존(남=재성, 여=관성이 배우자·이성 인연). seed 로 표현만 개인화. */
function loveLine(cat: SibsinCategory, sex: string, ko: boolean, seed: number): string {
  const female = isFemale(sex)
  let poolKey: string
  switch (cat) {
    case 'wealth':
      poolKey = isMale(sex) ? 'wealth:m' : 'wealth:f'
      break
    case 'officer':
      poolKey = female ? 'officer:f' : 'officer:m'
      break
    case 'output':
      poolKey = 'output:neutral'
      break
    case 'self':
      poolKey = 'self:neutral'
      break
    case 'resource':
      poolKey = 'resource:neutral'
      break
  }
  const pool = LOVE_POOLS[poolKey!]
  return pickPair(pool, seed, hashStringToInt('love:' + poolKey!), ko)
}

/** 오늘 십신이 직접 켜는 분야 집합(강조용). 연애는 성별로 분기. */
function activeDomains(cat: SibsinCategory, sex: string): Set<string> {
  const s = new Set<string>()
  switch (cat) {
    case 'self':
      s.add('health').add('people')
      break
    case 'output':
      s.add('love').add('career')
      break
    case 'wealth':
      s.add('money')
      if (isMale(sex)) s.add('love')
      break
    case 'officer':
      s.add('career')
      if (isFemale(sex)) s.add('love')
      break
    case 'resource':
      s.add('study').add('people')
      break
  }
  return s
}


// ── 그날 실제 신호 → 분야 분류용 매핑 (행성·신살·교차). ─────────────────────
// 새 계산이 아니라, 이미 셀에 계산된 신호를 분야로 나눌 뿐. 사람마다 본명이
// 달라 트랜짓·신살이 다르므로 분야 근거도 1인 1결과가 된다.

// 행성 → 분야 (점성 표준 주관). day.transits.body 는 영문 행성명.
const PLANET_DOMAINS: Record<string, string[]> = {
  Venus: ['love', 'money'],
  Jupiter: ['money', 'career'],
  Saturn: ['career', 'health'], // 토성=제약·압박·만성피로·뼈 (공부는 수성/인성)
  Mercury: ['study', 'career'],
  Mars: ['health', 'career'],
  Sun: ['career', 'health'],
  Moon: ['health', 'people', 'love'], // 달=감정·대중·정서 교감
  Uranus: ['career'],
  Neptune: ['love', 'health'], // 해왕성=이상화된 연애·면역/수면 (명료한 학습과 상충)
  Pluto: ['money', 'career'],
}
// 행성 한글 라벨 — 공용 SSOT(planetNames)에서 파생(앵글 키는 안 쓰지만 무해).
const PLANET_KO_SHORT: Record<string, string> = { ...PLANET_KO_BASE }
// 엔진 신호의 aspectType 은 영문('trine'…)이라, KO 표시는 영문→한글로 옮긴다.
// (일부 경로는 한글일 수 있어 양방향 폴백.)
const ASPECT_EN: Record<string, string> = {
  합: 'conjunction',
  사각: 'square',
  삼각: 'trine',
  대립: 'opposition',
  섹스타일: 'sextile',
  퀸컹스: 'quincunx',
  반섹스타일: 'semisextile',
}
const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
  sextile: '육각',
  quincunx: '퀸컹스',
  semisextile: '반육각',
}

// 신살 이름(부분일치) → 분야. 명리 표준 의미.
const SHINSAL_DOMAINS: Array<{ match: string; domains: string[] }> = [
  { match: '도화', domains: ['love'] },
  { match: '홍염', domains: ['love'] },
  { match: '금여', domains: ['love'] },
  { match: '역마', domains: ['career'] },
  { match: '문창', domains: ['study'] },
  { match: '학당', domains: ['study'] },
  { match: '화개', domains: ['study'] },
  { match: '귀인', domains: ['people'] }, // 천을·천덕·월덕·복성·태극귀인 등
  { match: '천덕', domains: ['people'] }, // '천덕'(단독) — '귀인' 미부착 출력 대비
  { match: '월덕', domains: ['people'] },
  { match: '태극', domains: ['people'] },
  { match: '복성', domains: ['people'] },
  { match: '양인', domains: ['health'] },
  { match: '백호', domains: ['health'] },
  { match: '괴강', domains: ['career'] },
  { match: '재고', domains: ['money'] },
]

// 교차활성 텍스트 키워드 → 분야 (사주측·점성측·뜻을 한데 스캔).
const CROSS_KEYWORDS: Array<{ keys: string[]; domain: string }> = [
  {
    keys: ['도화', '홍염', '금성', 'Venus', '연애', '배우자', '합', '삼합', '육합'],
    domain: 'love',
  },
  { keys: ['재성', '재물', '편재', '정재', '목성', 'Jupiter'], domain: 'money' },
  // '편관'은 1차 직업(七殺=권력·책임). '충'=직업변동. '직'은 오탐 줄이려 '직업/직장'으로.
  {
    keys: ['관성', '정관', '편관', '토성', 'Saturn', '태양', 'Sun', '명예', '직업', '직장', '충'],
    domain: 'career',
  },
  { keys: ['인성', '정인', '편인', '수성', 'Mercury', '문서', '문창'], domain: 'study' },
  // 합=협력/인연, 충=관계균열, 형=마찰 — 모두 사람 축에도 작용.
  { keys: ['귀인', '비견', '겁재', '합', '충', '형', 'Moon'], domain: 'people' },
  // 형=수술·사고, 화성=다툼·열 — 건강. ('편관'은 직업으로 일원화, '충'은 직업/관계로 이동.)
  { keys: ['화성', 'Mars', '형'], domain: 'health' },
]
function crossDomains(hay: string): string[] {
  const out = new Set<string>()
  for (const rule of CROSS_KEYWORDS) {
    if (rule.keys.some((k) => hay.includes(k))) out.add(rule.domain)
  }
  return [...out]
}

export interface DayEvidenceInput {
  transits: Array<{ body?: string; aspect?: string; polarity: number }>
  shinsal: string[]
  crossActivations: Array<{
    sajuSide: string
    astroSide: string
    /** 분야 라우팅용 KO 텍스트(로케일 무관). 없으면 sajuSide/astroSide 로 폴백. */
    route?: string
    meaning?: string
    polarity: number
  }>
  /** 시(時)별 달 절정 — 본명 점(body)으로 분야 라우팅 + 시각 칩. */
  moon?: Array<{
    body: string // 'Venus'·'Sun'·'Ascendant'…
    aspectKo: string
    aspectEn: string
    when: string // '13-15시 (미시)'
    whenEn: string
    polarity: number
  }>
}

// 달이 건드린 본명 점 → 분야 (행성은 PLANET_DOMAINS 재사용 + 앵글 보강).
const MOON_POINT_DOMAINS: Record<string, string[]> = {
  ...{
    Venus: ['love', 'money'],
    Jupiter: ['money', 'career'],
    Saturn: ['career', 'health'],
    Mercury: ['study', 'career'],
    Mars: ['health', 'career'],
    Sun: ['career', 'health'],
    Moon: ['health', 'people', 'love'],
    Uranus: ['career'],
    Neptune: ['love', 'health'],
    Pluto: ['money', 'career'],
  },
  Ascendant: ['health'],
  MC: ['career'],
}

/** 그날 실제 신호를 분야별 근거로 분류 (locale 반영 텍스트). */
function classifyEvidence(input: DayEvidenceInput, ko: boolean): Record<string, DomainEvidence[]> {
  const out: Record<string, DomainEvidence[]> = {
    love: [],
    money: [],
    career: [],
    people: [],
    study: [],
    health: [],
  }
  // 트랜짓 (점성)
  for (const t of input.transits) {
    const body = t.body ?? ''
    const doms = PLANET_DOMAINS[body]
    if (!doms) continue
    const aspect = t.aspect ?? ''
    const text = ko
      ? `${PLANET_KO_SHORT[body] ?? body} ${ASPECT_KO[aspect] ?? aspect}`.trim()
      : `${body} ${ASPECT_EN[aspect] ?? aspect}`.trim()
    for (const d of doms) out[d].push({ text, polarity: t.polarity, kind: 'astro' })
  }
  // 신살 (사주) — EN 로케일에선 신살명을 영문으로(원문 한글 누출 방지).
  for (const s of input.shinsal) {
    const label = ko ? s : translateSignalLabel(s, 'en')
    for (const rule of SHINSAL_DOMAINS) {
      if (s.includes(rule.match)) {
        for (const d of rule.domains) out[d].push({ text: label, polarity: 0, kind: 'saju' })
      }
    }
  }
  // 사주 × 점성 교차
  for (const c of input.crossActivations) {
    // 라우팅은 KO route 로(로케일 무관) — EN 표시일 때도 분야 분류가 동일해야
    // 같은 차트가 KO/EN 에서 정반대 톤이 되는 버그가 안 난다.
    const doms = crossDomains(c.route ?? `${c.sajuSide} ${c.astroSide} ${c.meaning ?? ''}`)
    const text = `${c.sajuSide} ↔ ${c.astroSide}`
    for (const d of doms) out[d].push({ text, polarity: c.polarity, kind: 'cross' })
  }
  // 시(時)별 달 절정 — 달이 건드린 본명 점으로 분야 라우팅, 칩에 시각 포함.
  for (const mn of input.moon ?? []) {
    const doms = MOON_POINT_DOMAINS[mn.body]
    if (!doms) continue
    const short = (ko ? mn.when : mn.whenEn).replace(/\s*\(.*\)/, '').trim()
    const text = ko ? `${short} 달${mn.aspectKo}` : `${short} Moon ${mn.aspectEn}`
    for (const d of doms)
      out[d].push({ text, polarity: mn.polarity, kind: 'moon', when: mn.when, whenEn: mn.whenEn })
  }
  // 분야별 중복 제거 + |polarity| 높은 순 4개(시각 달 칩 자리 확보).
  // astro 칩은 *행성* 기준으로 묶는다 — 같은 행성이 여러 각(수성 사각·육각·삼각)
  // 으로 동시에 잡히면 한 행성당 가장 센 한 칩만 남겨 중복·기하 모순을 없앤다.
  const dedupKey = (e: DomainEvidence) =>
    e.kind === 'astro' ? `astro:${e.text.split(' ')[0]}` : `${e.kind}:${e.text}`
  for (const d of Object.keys(out)) {
    const seen = new Set<string>()
    const sorted = out[d]
      .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))
      .filter((e) => {
        const k = dedupKey(e)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    const capped = sorted.slice(0, 4)
    // 시별 달(moon) 칩은 |polarity| 가 낮아 4개 컷에 잘 밀려난다. 본문 시각 클로즈
    // + 🌙 칩이 사라지지 않게, 4개 안에 moon 이 없으면 가장 센 moon 한 개를 보장.
    if (!capped.some((e) => e.kind === 'moon')) {
      const moon = sorted.find((e) => e.kind === 'moon')
      if (moon) {
        if (capped.length >= 4) capped[3] = moon
        else capped.push(moon)
      }
    }
    out[d] = capped
  }
  return out
}



/**
 * 분야별 band-aware 한 줄. 주의 본문 가지(caution)면 band 무관하게 누른 톤을 쓴다.
 * 머리말과 겹치지 않게 짧고 분야 한정으로. seed 로 사람마다 표현만 회전.
 */
function bandDomainClause(band: DayScoreBand, caution: boolean, ko: boolean, seed: number): string {
  const branch: DayScoreBand | 'caution' = caution ? 'caution' : band
  const pool = BAND_DOMAIN_CLAUSE[branch]
  return pickPair(pool, seed, hashStringToInt('bdc:' + branch), ko)
}

/**
 * 그 분야의 *가장 센 실제 신호*(|polarity| 최대, moon 제외 — moon 은 moonTimeClause 가
 * 따로 시각으로 엮음)를 산문 한 줄로 엮는다. 동적 텍스트(예: '편재 ↔ 금성', '천을귀인',
 * '토성 사각')에 한국어 주격/목적격 조사(이/가·을/를·은/는)를 직접 붙이면 비문이 되므로,
 * em-dash·콜론·쉼표 구조로만 잇는다. 방향(부호)에 따라 동사를 고른다.
 */
function strongSignalClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind === 'moon') continue
    if (e.polarity === 0) continue // 신살(중립 polarity 0)은 방향이 없어 산문화 보류
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const text = best.text.trim()
  if (!text) return ''
  if (best.polarity > 0) {
    // 동적 텍스트 뒤에 조사 없이 em-dash 로 이어 받침 유무와 무관하게 자연스럽게.
    return ko
      ? ` 오늘은 ${text} — 이 분야를 밀어주는 신호예요.`
      : ` Today, ${text} is the signal pushing this area forward.`
  }
  return ko
    ? ` 다만 ${text} — 이 분야에 마찰을 더하니 살펴보세요.`
    : ` That said, ${text} adds friction here, so keep an eye on it.`
}

/**
 * 분야 근거 중 시별 달(moon) 신호가 있으면, 가장 센(|polarity| 최대) 달의 시각을
 * 본문에 한 줄로 엮는다. 시각 창만 남기고 "달…" 꼬리는 떼어 시간만 보이게 한다.
 * (예: "21-23시 달삼각" → "21-23시"). 차트별 신호가 달라 1인 1결과로 일반화된다.
 */
function moonTimeClause(ev: DomainEvidence[], ko: boolean): string {
  let best: DomainEvidence | null = null
  for (const e of ev) {
    if (e.kind !== 'moon') continue
    if (!best || Math.abs(e.polarity) > Math.abs(best.polarity)) best = e
  }
  if (!best) return ''
  const raw = (ko ? best.when : best.whenEn) ?? best.text
  const time = raw.replace(/\s*\(.*\)/, '').trim()
  if (!time) return ''
  if (best.polarity >= 0) {
    return ko ? ` 특히 ${time}에 흐름이 살아나요.` : ` Especially ${time} the flow picks up.`
  }
  return ko ? ` ${time}엔 한 박자 늦추세요.` : ` Around ${time}, ease off a beat.`
}

export function deriveDayDomains(args: {
  iljinSibsin: string
  sex: string
  scoreBand: DayScoreBand
  /** 그날 실제 신호 — 주면 분야별 근거가 붙고, 없으면 십신 기본 조언만. */
  evidence?: DayEvidenceInput
  /** evidence 텍스트 locale (기본 ko). */
  ko?: boolean
  /**
   * 본명(natal)에서 뽑은 개인 시드 — 고정 문구 풀을 회전해 사람마다 다른 표현을
   * 결정론적으로 고른다(같은 시드+입력 → 같은 출력). 판단(점수·신호)은 안 바꾸고
   * 표현만 개인화한다. 기본 0(레거시: 변주 풀의 첫 항목).
   */
  seed?: number
}): DayDomainsResult | null {
  const cat = SIBSIN_CATEGORY[args.iljinSibsin]
  if (!cat) return null
  const seed = args.seed ?? 0
  const activeDomainSet = activeDomains(cat, args.sex)
  const evidenceByDomain = args.evidence ? classifyEvidence(args.evidence, args.ko !== false) : null
  const domains: DayDomainAdvice[] = DOMAIN_META.map((d) => {
    const ev = evidenceByDomain?.[d.key] ?? []
    // 근거 극성 합 — 톤·배지를 그날 *그 분야의 실제 신호*에 맞춘다. 같은 일진이라도
    // 본명이 다르면 분야별 신호(트랜짓)가 달라 결과가 사람마다 갈린다(개인화).
    const polaritySum = ev.reduce((s, e) => s + e.polarity, 0)
    // 본문: 근거가 뚜렷이 부정적(합 ≤ -2)이면 긍정 십신 조언 대신 '주의' 본문으로
    // 바꿔, 칩(긴장 신호)과 글의 톤이 어긋나지 않게 한다(모순 제거).
    const caution = polaritySum <= -2
    let body: string
    let bodyEn: string
    if (caution) {
      // 주의 본문 풀 — 분야(d.key)를 키로 섞어 같은 분야라도 사람마다 다른 표현.
      const cKey = hashStringToInt('caution:' + d.key)
      body = pickPair(CAUTION_BODY[d.key], seed, cKey, true)
      bodyEn = pickPair(CAUTION_BODY[d.key], seed, cKey, false)
    } else if (d.key === 'love') {
      body = loveLine(cat, args.sex, true, seed)
      bodyEn = loveLine(cat, args.sex, false, seed)
    } else {
      // ADVICE 풀 — (cat, domain) 을 키로 섞어 같은 일진·분야라도 사람마다 다른 표현.
      const aKey = hashStringToInt('advice:' + cat + ':' + d.key)
      body = pickPair(ADVICE[cat][d.key], seed, aKey, true)
      bodyEn = pickPair(ADVICE[cat][d.key], seed, aKey, false)
    }
    // (2) band-aware 한 줄 — 점수 구간에 맞춰 톤을 잡는다. 주의(caution) 가지면
    // 순풍이라도 "밀어붙이라" 대신 누른 톤을 써 칩과 모순이 안 나게 한다.
    body += bandDomainClause(args.scoreBand, caution, true, seed)
    bodyEn += bandDomainClause(args.scoreBand, caution, false, seed)
    // (3) 그 분야의 가장 센 실제 신호를 산문 한 줄로 — 조사 없이 em-dash 로 이어
    // 동적 텍스트의 한국어 받침 문제를 피한다(particle-safe).
    body += strongSignalClause(ev, true)
    bodyEn += strongSignalClause(ev, false)
    // 시별 달 근거가 있으면 실제 절정 시각을 본문에 엮어 더 구체적으로(KO/EN).
    const koClause = moonTimeClause(ev, true)
    const enClause = moonTimeClause(ev, false)
    if (koClause) body += koClause
    if (enClause) bodyEn += enClause
    // '주목' 배지 = 그날 *십신이 관장하는* 분야(=오늘의 테마) 1~2개만 — 단,
    // 근거가 net-negative 면(긴장 분야) 배지를 달지 않는다(긍정 강조와 모순 방지).
    // 트랜짓은 매일 거의 모든 분야에 깔려 배지로 쓰면 다 켜져버리므로, 실제
    // 신호는 배지 대신 분야별 '근거' 칩으로 보여준다(분리).
    const active = activeDomainSet.has(d.key) && (ev.length === 0 || polaritySum >= 0)
    return {
      key: d.key,
      icon: d.icon,
      label: d.ko,
      labelEn: d.en,
      body,
      bodyEn,
      active,
      evidence: ev,
    }
  })
  // 섹션 머리말도 풀에서 — band 를 키로 섞어 같은 밴드라도 사람마다 다른 표현.
  const bnKey = hashStringToInt('band:' + args.scoreBand)
  return {
    bandNote: pickPair(BAND_NOTE[args.scoreBand], seed, bnKey, true),
    bandNoteEn: pickPair(BAND_NOTE[args.scoreBand], seed, bnKey, false),
    domains,
  }
}
