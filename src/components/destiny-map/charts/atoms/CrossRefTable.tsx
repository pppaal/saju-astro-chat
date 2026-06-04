'use client'

import React from 'react'
import {
  getHanjaRich,
  getGeokgukRich,
  getPlanetCore,
  getHouseRich,
  type Lang,
  type HouseNumber,
  type HanjaStemLangEntry,
} from '@/lib/chart-dictionary'
import {
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalPersona,
  synthesize,
  normSajuElement,
  signToSajuElement,
  dominantSajuElement,
  dominantAstroElement,
  dominantSibsinGroup,
  type CrossVerdict,
  type CrossTone,
  type NatalSynthesis,
} from '@/lib/destiny-map/natalCross'
import { dignityOf } from '@/lib/astrology/foundation/dignities'

/**
 * 차트 모달 Level 2 — 사주 ↔ 점성 교차 raw 표.
 *
 * 동양 (사주) raw 와 서양 (점성) raw 를 같은 영역끼리 좌/우 나란히 보여줌.
 * 비전공자가 "내 정체성·욕망·역할·흐름" 등 7 영역에서 두 시스템이 일치(동조)
 * 하는지 보완하는지 즉시 파악.
 *
 * 보완 (예: 일간 金 ↔ 태양 Earth — 다른 결을 채워줌) → gold 하이라이트.
 * 동조 (예: 격국 정관격 ↔ MC 염소자리 — 같은 결 강조) → checkmark.
 * (충돌 감지는 다음 PR — 일단 보완·동조만.)
 */
interface CrossRefTableProps {
  saju: unknown
  astro: unknown
  lang?: Lang
}

// ── Narrow shape interfaces (둘 다 /api/* 응답 또는 NatalContext 모두 수용) ──
interface SajuLike {
  dayMaster?: { name?: string; element?: string }
  // 오행 분포 — 한/영 키 혼용 가능 (목/wood 등). 기질 교차에 사용.
  fiveElements?: Record<string, number>
  advancedAnalysis?: {
    geokguk?: { primary?: string }
    yongsin?: { primaryYongsin?: string }
    // 신강약 분석 — details 가 십신 5그룹 분포(비겁/인성/식상/재성/관성).
    strength?: { level?: string; details?: Record<string, number> }
  }
  table?: {
    byPillar?: {
      day?: {
        twelveStage?: string
        twelveShinsal?: string[] | string
        shinsal?: string[]
      }
    }
  }
  relations?: Array<{ kind?: string; detail?: string }>
}

interface PlanetLike {
  name?: string
  sign?: string
  house?: number
  formatted?: string
}

interface AstroLike {
  chartData?: {
    planets?: PlanetLike[]
    mc?: PlanetLike | { sign?: string; formatted?: string }
    ascendant?: PlanetLike
  }
  planets?: PlanetLike[]
  mc?: PlanetLike | { sign?: string; formatted?: string }
  ascendant?: PlanetLike
  advanced?: {
    points?: PlanetLike[]
  }
  aspects?: unknown[]
  chart?: {
    planets?: PlanetLike[]
    mc?: PlanetLike
    ascendant?: PlanetLike
    extraPoints?: { partOfFortune?: { sign?: string; house?: number } }
  }
  extraPoints?: { partOfFortune?: { sign?: string; house?: number } }
}

// ── Element 매핑 (서양 sign → 4원소, 표시용) ──────────────────────────────
// 사주 오행 ↔ 서양 원소의 생극 판정은 natalCross 평가기가 5원소 공간에서
// 처리한다. 여기 SIGN_TO_WESTERN_ELEMENT 는 우측(점성) 값에 원소 라벨을
// 붙이는 표시 목적으로만 남긴다.
const SIGN_TO_WESTERN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  // KO
  양자리: 'fire', 사자자리: 'fire', 사수자리: 'fire',
  황소자리: 'earth', 처녀자리: 'earth', 염소자리: 'earth',
  쌍둥이자리: 'air', 천칭자리: 'air', 물병자리: 'air',
  게자리: 'water', 전갈자리: 'water', 물고기자리: 'water',
  // EN
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

/** 점성 sign 영문 → 한국어. API 가 영문만 반환해 KO 모드에서 비전공자에 어색. */
const SIGN_EN_TO_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

/** 4 원소 영문 → 한국어. KO 모드 친화. */
const ELEMENT_EN_TO_KO: Record<string, string> = {
  fire: '불',
  earth: '흙',
  air: '공기',
  water: '물',
}

/** sign 을 KO 모드면 한국어로, EN 모드면 영어 그대로. element 도 동일. */
function localizeSign(sign: string | undefined, lang: 'ko' | 'en'): string {
  if (!sign) return ''
  if (lang === 'en') return sign
  return SIGN_EN_TO_KO[sign] ?? sign
}
function localizeElement(el: string | undefined, lang: 'ko' | 'en'): string {
  if (!el) return ''
  if (lang === 'en') return el
  return ELEMENT_EN_TO_KO[el] ?? el
}

// 격국 → 점성 MC sign "동조" (책임/표현/조화 등 결 일치). 단순 가시화 휴리스틱.
const GEOKGUK_RESONANT_SIGNS: Record<string, string[]> = {
  정관격: ['염소자리', 'Capricorn', '천칭자리', 'Libra'],
  편관격: ['전갈자리', 'Scorpio', '양자리', 'Aries'],
  정인격: ['게자리', 'Cancer', '물고기자리', 'Pisces'],
  편인격: ['물병자리', 'Aquarius', '사수자리', 'Sagittarius'],
  식신격: ['황소자리', 'Taurus', '게자리', 'Cancer'],
  상관격: ['쌍둥이자리', 'Gemini', '사자자리', 'Leo'],
  정재격: ['황소자리', 'Taurus', '처녀자리', 'Virgo'],
  편재격: ['사수자리', 'Sagittarius', '쌍둥이자리', 'Gemini'],
}

// ── 도움 함수 ───────────────────────────────────────────────────────────
function findPlanet(astro: AstroLike, name: string): PlanetLike | undefined {
  const lists: Array<PlanetLike[] | undefined> = [
    astro.chartData?.planets,
    astro.planets,
    astro.advanced?.points,
    astro.chart?.planets,
  ]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    const hit = list.find((p) => p?.name === name)
    if (hit) return hit
  }
  return undefined
}

function getMc(astro: AstroLike): PlanetLike | undefined {
  const candidates = [astro.chartData?.mc, astro.mc, astro.chart?.mc]
  for (const c of candidates) {
    if (c && typeof c === 'object') return c as PlanetLike
  }
  return undefined
}

function getPof(astro: AstroLike): { sign?: string; house?: number } | undefined {
  return astro.extraPoints?.partOfFortune ?? astro.chart?.extraPoints?.partOfFortune
}

// ── Row 데이터 모델 ──────────────────────────────────────────────────────
// tone 은 평가기(natalCross)와 공유 — resonant·complement·tension·neutral.
type RowTone = CrossTone

interface CrossRow {
  category: string // "정체성" / "필요" 등
  leftLabel: string // "일간" / "용신"
  leftValue: string // "辛 (음·금)"
  leftHint?: string // 한자 의미 / tagline (mouseover 용 — title 속성)
  rightLabel: string // "태양 sign" / "달 sign"
  rightValue: string // "Virgo (Earth)"
  rightHint?: string
  tone: RowTone
  reason?: string // 교차 판정의 근거 한 줄 (왜 동조/보완/긴장인지)
}

// 점성 aspect 배열에서 조화각(trine·sextile) / 긴장각(square·opposition) 개수.
function countAspectTones(aspects: unknown[]): { harmonious: number; hard: number } {
  let harmonious = 0
  let hard = 0
  for (const a of aspects) {
    const t = (
      (a as { type?: string; aspect?: string; name?: string })?.type ??
      (a as { aspect?: string })?.aspect ??
      (a as { name?: string })?.name ??
      ''
    ).toLowerCase()
    if (t === 'trine' || t === 'sextile') harmonious++
    else if (t === 'square' || t === 'opposition') hard++
  }
  return { harmonious, hard }
}

// 차트 행성 중 essential dignity 가 가장 강한 것(입궁·고양)을 찾는다.
function findTopDignity(astro: AstroLike): { planet: string; status: string } | null {
  const lists: Array<PlanetLike[] | undefined> = [
    astro.chartData?.planets,
    astro.planets,
    astro.chart?.planets,
  ]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const p of list) {
      if (!p?.name || !p?.sign) continue
      const en = SIGN_KO_EN[p.sign] ?? p.sign
      const status = dignityOf(p.name, en)
      if (status === 'domicile' || status === 'exaltation') {
        return { planet: p.name, status }
      }
    }
  }
  return null
}

// 점성 sign 한국어 → 영문 (dignityOf 영문 인식용).
const SIGN_KO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(SIGN_EN_TO_KO).map(([en, ko]) => [ko, en]),
)

// 강점 행 표시용 — 행성명·위신 라벨.
const PLANET_DISPLAY: Record<string, { ko: string; en: string }> = {
  Sun: { ko: '태양', en: 'Sun' },
  Moon: { ko: '달', en: 'Moon' },
  Mercury: { ko: '수성', en: 'Mercury' },
  Venus: { ko: '금성', en: 'Venus' },
  Mars: { ko: '화성', en: 'Mars' },
  Jupiter: { ko: '목성', en: 'Jupiter' },
  Saturn: { ko: '토성', en: 'Saturn' },
}
const DIGNITY_LABEL: Record<string, { ko: string; en: string }> = {
  domicile: { ko: '입궁', en: 'Domicile' },
  exaltation: { ko: '고양', en: 'Exaltation' },
}

// 차트의 모든 행성을 한 배열로 (source 별 경로 폴백).
function getAllPlanets(astro: AstroLike): PlanetLike[] {
  for (const list of [astro.chartData?.planets, astro.planets, astro.chart?.planets]) {
    if (Array.isArray(list) && list.length > 0) return list
  }
  return []
}

// ASC sign (여러 source 경로 폴백).
function getAscSign(astro: AstroLike): string | undefined {
  return astro.chartData?.ascendant?.sign ?? astro.ascendant?.sign ?? astro.chart?.ascendant?.sign
}

// 차트에서 "강조된" 행성 — 앵귤러 하우스(1·4·7·10) 또는 essential dignity(입궁·고양).
function emphasizedPlanets(astro: AstroLike): Set<string> {
  const out = new Set<string>()
  const ANGLES = new Set([1, 4, 7, 10])
  for (const p of getAllPlanets(astro)) {
    if (!p?.name) continue
    if (typeof p.house === 'number' && ANGLES.has(p.house)) out.add(p.name)
    if (p.sign) {
      const en = SIGN_KO_EN[p.sign] ?? p.sign
      const status = dignityOf(p.name, en)
      if (status === 'domicile' || status === 'exaltation') out.add(p.name)
    }
  }
  return out
}

// 5원소 표시 라벨.
const SAJU_EL_LABEL: Record<string, { ko: string; en: string }> = {
  wood: { ko: '목(나무)', en: 'Wood' },
  fire: { ko: '화(불)', en: 'Fire' },
  earth: { ko: '토(흙)', en: 'Earth' },
  metal: { ko: '금(쇠)', en: 'Metal' },
  water: { ko: '수(물)', en: 'Water' },
}
const SIBSIN_GROUP_LABEL: Record<string, { ko: string; en: string }> = {
  비겁: { ko: '비겁', en: 'Peers' },
  식상: { ko: '식상', en: 'Output' },
  재성: { ko: '재성', en: 'Wealth' },
  관성: { ko: '관성', en: 'Officer' },
  인성: { ko: '인성', en: 'Resource' },
}
function dominantElementLabel(
  counts: Record<string, number> | undefined,
  lang: Lang,
): string | undefined {
  const el = dominantSajuElement(counts)
  return el ? SAJU_EL_LABEL[el][lang] : undefined
}
function dominantAstroElementLabel(signs: string[], lang: Lang): string | undefined {
  const el = dominantAstroElement(signs)
  return el ? SAJU_EL_LABEL[el][lang] : undefined
}
function dominantGroupLabel(
  details: Record<string, number> | undefined,
  lang: Lang,
): string | undefined {
  const g = dominantSibsinGroup(details)
  return g ? SIBSIN_GROUP_LABEL[g]?.[lang] ?? g : undefined
}

// ── Row 빌더 ───────────────────────────────────────────────────────────
// rows + 종합(synthesis) 한 문장을 함께 반환.
function buildRows(
  saju: SajuLike,
  astro: AstroLike,
  lang: Lang,
): { rows: CrossRow[]; synthesis: NatalSynthesis | null } {
  const rows: CrossRow[] = []
  const verdicts: CrossVerdict[] = []
  let sharedElement: ReturnType<typeof normSajuElement> = undefined

  // 1. 정체성: 일간 ↔ 태양 sign
  {
    const dm = saju.dayMaster?.name
    const sun = findPlanet(astro, 'Sun')
    if (dm && sun?.sign) {
      const hanja = getHanjaRich(dm, lang)
      const stem = hanja && 'as_daymaster' in hanja ? (hanja as HanjaStemLangEntry) : undefined
      const dmEl = saju.dayMaster?.element ?? stem?.element
      const leftValue = stem
        ? `${dm} (${stem.yinYang}·${stem.element})`
        : `${dm}${dmEl ? ` (${dmEl})` : ''}`
      const sunWest = SIGN_TO_WESTERN_ELEMENT[sun.sign]
      // 오행 생극 기반 판정 (단순 일치 → 동조/보완/긴장으로 격상).
      const verdict = evalIdentity(dmEl, sun.sign)
      if (verdict) verdicts.push(verdict)
      // 종합용 공유 축 — 일간과 태양이 같은 5원소면 그 원소가 핵심 축.
      const dmSaju = normSajuElement(dmEl)
      const sunSaju = signToSajuElement(sun.sign)
      if (dmSaju && dmSaju === sunSaju) sharedElement = dmSaju
      rows.push({
        category: lang === 'ko' ? '정체성' : 'Identity',
        leftLabel: lang === 'ko' ? '일간 (나)' : 'Day Master',
        leftValue,
        leftHint: stem?.image,
        rightLabel: lang === 'ko' ? '태양 별자리' : 'Sun sign',
        rightValue: sunWest
          ? `${localizeSign(sun.sign, lang)} (${localizeElement(sunWest, lang)})`
          : localizeSign(sun.sign, lang),
        rightHint: getPlanetCore('Sun', lang)?.principle,
        tone: verdict?.tone ?? 'neutral',
        reason: verdict?.reason[lang],
      })
    }
  }

  // 2. 필요/욕망: 용신 ↔ 달 sign
  {
    const yongsin = saju.advancedAnalysis?.yongsin?.primaryYongsin
    const moon = findPlanet(astro, 'Moon')
    if (yongsin && moon?.sign) {
      const moonWest = SIGN_TO_WESTERN_ELEMENT[moon.sign]
      // 달이 '필요 원소(용신)'를 채우는가 — 생극으로 판정.
      const verdict = evalNeeds(yongsin, moon.sign)
      if (verdict) verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '필요·욕망' : 'Needs',
        leftLabel: lang === 'ko' ? '용신 (필요 원소)' : 'Yongsin',
        leftValue: yongsin,
        rightLabel: lang === 'ko' ? '달 별자리' : 'Moon sign',
        rightValue: moonWest
          ? `${localizeSign(moon.sign, lang)} (${localizeElement(moonWest, lang)})`
          : localizeSign(moon.sign, lang),
        rightHint: getPlanetCore('Moon', lang)?.principle,
        tone: verdict?.tone ?? 'neutral',
        reason: verdict?.reason[lang],
      })
    }
  }

  // 3. 사회 역할: 격국 ↔ MC sign
  {
    const geokguk = saju.advancedAnalysis?.geokguk?.primary
    const mc = getMc(astro)
    if (geokguk && mc?.sign) {
      const taglineEntry = getGeokgukRich(geokguk, lang)
      // 격국 대표 십신 → 행성 → MC sign 에서의 위신으로 동조/보완/긴장 판정.
      // 매핑 미해당 격국은 기존 resonant-list 휴리스틱으로 폴백.
      const verdict = evalSocialRole(geokguk, mc.sign)
      if (verdict) verdicts.push(verdict)
      const fallbackTone: RowTone = GEOKGUK_RESONANT_SIGNS[geokguk]?.includes(mc.sign)
        ? 'resonant'
        : 'neutral'
      rows.push({
        category: lang === 'ko' ? '사회 역할' : 'Social Role',
        leftLabel: lang === 'ko' ? '격국' : 'Geokguk',
        leftValue: geokguk,
        leftHint: taglineEntry?.tagline,
        rightLabel: lang === 'ko' ? 'MC (천직)' : 'MC',
        rightValue: localizeSign(mc.sign, lang),
        tone: verdict?.tone ?? fallbackTone,
        reason: verdict?.reason[lang],
      })
    }
  }

  // 5. 길흉: 12신살 (일주) ↔ POF house
  {
    const dayCell = saju.table?.byPillar?.day
    const luckySource = dayCell?.shinsal ?? []
    const lucky = Array.isArray(luckySource) ? luckySource.filter(Boolean) : []
    const pof = getPof(astro)
    if (lucky.length > 0 || pof?.house || pof?.sign) {
      const right =
        pof && (pof.house || pof.sign)
          ? `${pof.sign ? localizeSign(pof.sign, lang) : ''}${
              pof.house ? ` ${pof.house}H` : ''
            }`.trim()
          : lang === 'ko' ? '아직 없음' : 'N/A'
      const houseHint =
        pof?.house && pof.house >= 1 && pof.house <= 12
          ? getHouseRich(pof.house as HouseNumber, lang)?.domain
          : undefined
      // 신살 → 대응 행성(A급 매핑) polarity 로 길(동조)/흉(주의) 판정.
      const verdict = evalFortune(lucky)
      if (verdict) verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '길흉' : 'Fortune',
        leftLabel: lang === 'ko' ? '12 신살 (일주)' : 'Sinsal (day)',
        leftValue: lucky.length > 0 ? lucky.join(' · ') : lang === 'ko' ? '아직 없음' : 'N/A',
        rightLabel: lang === 'ko' ? '행운점 (POF)' : 'Part of Fortune',
        rightValue: right,
        rightHint: houseHint,
        tone: verdict?.tone ?? 'neutral',
        reason: verdict?.reason[lang],
      })
    }
  }

  // 6. 관계: 합/충 (사주 내) ↔ 주요 aspect (개수)
  {
    const relations = saju.relations ?? []
    const aspects = Array.isArray(astro.aspects) ? astro.aspects : []
    if (relations.length > 0 || aspects.length > 0) {
      const hapCount = relations.filter((r) => (r.kind ?? '').includes('합')).length
      const chungCount = relations.filter((r) => (r.kind ?? '').includes('충')).length
      const leftParts: string[] = []
      if (hapCount > 0) leftParts.push(lang === 'ko' ? `합 ${hapCount}` : `${hapCount} hap`)
      if (chungCount > 0) leftParts.push(lang === 'ko' ? `충 ${chungCount}` : `${chungCount} chung`)
      // 사주 합/충 우세 ↔ 점성 조화각/긴장각 우세 — 같은 방향이면 동조/긴장.
      const { harmonious, hard } = countAspectTones(aspects)
      const verdict = evalRelations(hapCount, chungCount, harmonious, hard)
      if (verdict) verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '관계' : 'Relations',
        leftLabel: lang === 'ko' ? '합·충 (사주 내)' : 'Hap/Chung',
        leftValue: leftParts.length > 0 ? leftParts.join(' · ') : lang === 'ko' ? '아직 없음' : 'N/A',
        rightLabel: lang === 'ko' ? '주요 aspect' : 'Major aspects',
        rightValue:
          aspects.length > 0
            ? lang === 'ko'
              ? `조화 ${harmonious} · 긴장 ${hard}`
              : `${harmonious} soft · ${hard} hard`
            : lang === 'ko' ? '아직 없음' : 'N/A',
        tone: verdict?.tone ?? 'neutral',
        reason: verdict?.reason[lang],
      })
    }
  }

  // 7. 강점: 12운성 (일주) ↔ 차트에서 가장 위신 높은 행성
  {
    const stage = saju.table?.byPillar?.day?.twelveStage
    const topDignity = findTopDignity(astro)
    if (stage || topDignity) {
      const verdict = evalStrength(stage, topDignity)
      if (verdict) verdicts.push(verdict)
      const rightValue = topDignity
        ? `${PLANET_DISPLAY[topDignity.planet]?.[lang] ?? topDignity.planet} (${DIGNITY_LABEL[topDignity.status]?.[lang] ?? topDignity.status})`
        : lang === 'ko' ? '뚜렷한 강세 없음' : 'No standout'
      rows.push({
        category: lang === 'ko' ? '강점' : 'Strength',
        leftLabel: lang === 'ko' ? '12 운성 (일주)' : 'Twelve Stage',
        leftValue: stage ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? '행성 위신' : 'Planet dignity',
        rightValue,
        tone: verdict?.tone ?? 'neutral',
        reason: verdict?.reason[lang],
      })
    }
  }

  // 8. 기질: 오행 분포(차트 전체) ↔ 점성 원소 분포(전체 행성)
  {
    const sajuCounts = saju.fiveElements
    const planets = getAllPlanets(astro)
    const astroSigns = planets.map((p) => p.sign).filter((s): s is string => !!s)
    const verdict = evalTemperament(sajuCounts, astroSigns)
    if (verdict) {
      verdicts.push(verdict)
      const sajuDom = dominantElementLabel(sajuCounts, lang)
      const astroDom = dominantAstroElementLabel(astroSigns, lang)
      rows.push({
        category: lang === 'ko' ? '기질' : 'Temperament',
        leftLabel: lang === 'ko' ? '오행 분포' : 'Five-element mix',
        leftValue: sajuDom ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? '원소 분포' : 'Element mix',
        rightValue: astroDom ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        tone: verdict.tone,
        reason: verdict.reason[lang],
      })
    }
  }

  // 9. 에너지 방향: 십신 우세 그룹(차트 전체) ↔ 강조된 행성
  {
    const details = saju.advancedAnalysis?.strength?.details
    const verdict = evalEnergyDirection(details, emphasizedPlanets(astro))
    if (verdict) {
      verdicts.push(verdict)
      const group = dominantGroupLabel(details, lang)
      rows.push({
        category: lang === 'ko' ? '에너지 방향' : 'Energy',
        leftLabel: lang === 'ko' ? '십신 우세' : 'Ten-god lead',
        leftValue: group ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? '강조 행성' : 'Emphasis',
        rightValue:
          [...emphasizedPlanets(astro)]
            .map((p) => PLANET_DISPLAY[p]?.[lang] ?? p)
            .slice(0, 3)
            .join(' · ') || (lang === 'ko' ? '뚜렷한 강조 없음' : 'None'),
        tone: verdict.tone,
        reason: verdict.reason[lang],
      })
    }
  }

  // 10. 드러나는 나: 일간(본질) ↔ ASC(첫인상)
  {
    const dmEl = saju.dayMaster?.element
    const ascSign = getAscSign(astro)
    const verdict = evalPersona(dmEl, ascSign)
    if (verdict) {
      verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '드러나는 나' : 'Persona',
        leftLabel: lang === 'ko' ? '일간 (본질)' : 'Day Master',
        leftValue: saju.dayMaster?.name ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? 'ASC (첫인상)' : 'Ascendant',
        rightValue: ascSign ? localizeSign(ascSign, lang) : lang === 'ko' ? '아직 없음' : 'N/A',
        tone: verdict.tone,
        reason: verdict.reason[lang],
      })
    }
  }

  const synthesis = synthesize(verdicts, sharedElement)
  return { rows, synthesis }
}

// ── Tone 별 styling ─────────────────────────────────────────────────────
function toneStyle(tone: RowTone): { background: string; border: string } {
  if (tone === 'complement' || tone === 'resonant') {
    return {
      background: 'rgba(212, 181, 114, 0.08)',
      border: '1px solid rgba(212, 181, 114, 0.35)',
    }
  }
  if (tone === 'tension') {
    // 상충 — 금색이 아닌 따뜻한 경고색(앰버-로즈)으로 결을 구분.
    return {
      background: 'rgba(248, 113, 113, 0.07)',
      border: '1px solid rgba(248, 113, 113, 0.32)',
    }
  }
  return {
    background: 'var(--ds-dark-surface)',
    border: '1px solid var(--ds-dark-border)',
  }
}

function toneBadge(tone: RowTone, lang: Lang): string | null {
  if (tone === 'complement') return lang === 'ko' ? '보완' : 'complement'
  if (tone === 'resonant') return lang === 'ko' ? '동조 ✓' : 'resonant ✓'
  if (tone === 'tension') return lang === 'ko' ? '긴장 ⚡' : 'tension ⚡'
  return null
}

// 배지 색 — 긴장은 로즈, 그 외(동조/보완)는 골드/퍼플.
function toneBadgeColor(tone: RowTone): string {
  if (tone === 'tension') return 'rgba(248, 113, 113, 0.95)'
  if (tone === 'complement') return 'var(--ds-gold-on-dark)'
  return 'rgba(167, 139, 250, 0.95)'
}

// ── 용어 정의 사전 ──────────────────────────────────────────────────────
// 비전공자가 모르는 동·서양 차트 전문 용어를 한 줄 정의로 노출.
// `row.leftLabel` / `row.rightLabel` 의 문자열과 정확히 일치해야 매핑됨.
const TERM_DEFINITION_KO: Record<string, string> = {
  '일간 (나)': '사주 4 기둥 중 태어난 날의 천간 — 나 자신을 대표하는 한 글자.',
  '용신 (필요 원소)': '사주의 균형을 잡아주는 핵심 원소 — 인생의 보약 같은 존재.',
  격국: '사주의 본질 구조 — 한 단어로 요약한 인생 패턴 (정관격·정인격 등).',
  '12 신살 (일주)': '일주에 깃든 길흉의 별 — 천을귀인(귀인의 도움) 같은 의미 부여.',
  '12 운성 (일주)': '일간이 지지에서 어느 단계인지 — 장생(시작)~묘(끝) 12 단계.',
  '행운점 (POF)': 'Part of Fortune — 점성에서 영혼·몸·정신이 만나는 행운 지점.',
  'MC (천직)': '점성 차트 천정 — 사회적 자아·직업·평판 영역.',
  '주요 aspect': '점성 행성끼리의 각도 — 합·삼각·직각·대립 등 관계.',
  '합·충 (사주 내)': '사주 글자끼리 짝지어(합) 또는 부딪혀(충) 만드는 관계.',
  '태양 별자리': '태어난 순간 태양이 머문 별자리 — 핵심 자아·정체성.',
  '달 별자리': '태어난 순간 달이 머문 별자리 — 감정·내면의 필요.',
  '행성 위신': '행성이 자기 별자리에 있을 때 가지는 힘 — dignity (입묘·격락 등).',
}
const TERM_DEFINITION_EN: Record<string, string> = {
  'Day Master': "The day-of-birth heavenly stem — your core 'I' character.",
  Yongsin: 'The element that balances your chart — your inner remedy.',
  Geokguk: "Your chart's primary structure — life pattern in one label.",
  'Sinsal (day)': 'Auspicious/inauspicious stars on your day pillar — e.g. Nobleman.',
  'Twelve Stage': 'Where your Day Master sits in the 12-stage life cycle (birth → grave).',
  'Part of Fortune': 'Arabic part where soul, body, and mind meet — your luck point.',
  MC: 'Midheaven — your career, reputation, and social self in astrology.',
  'Major aspects': 'Angles between planets — conjunction, trine, square, opposition.',
  'Hap/Chung': 'How saju characters bond (hap) or clash (chung) with each other.',
  'Sun sign': 'The zodiac the Sun was in at birth — core identity.',
  'Moon sign': 'The zodiac the Moon was in at birth — emotions and inner needs.',
  'Planet dignity': 'A planet’s strength based on the sign it sits in.',
}

/**
 * 용어 옆에 작은 ⓘ 아이콘 — tap (모바일) / hover (데스크탑) 시 popover.
 * `title` 속성은 모바일에서 dead 라서 직접 popover 를 띄움.
 */
function TermHint({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <span className="relative inline-flex items-center gap-0.5">
      <span>{term}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label={`${term} 설명 보기`}
        className="inline-flex h-3 w-3 items-center justify-center rounded-full text-[8px] leading-none opacity-60 hover:opacity-100"
        style={{ background: 'rgba(212,181,114,0.18)', color: '#d4b572' }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-50 mt-1 w-max max-w-[220px] rounded-md px-2 py-1.5 text-[11px] leading-snug"
          style={{
            background: 'rgba(20,16,32,0.95)',
            color: 'rgba(245,247,251,0.92)',
            border: '1px solid rgba(212,181,114,0.4)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {definition}
        </span>
      )}
    </span>
  )
}

/** 라벨 → 해당 lang 의 정의 lookup. 없으면 undefined. */
function lookupDefinition(label: string, lang: Lang): string | undefined {
  const dict = lang === 'ko' ? TERM_DEFINITION_KO : TERM_DEFINITION_EN
  return dict[label]
}

// ── Component ──────────────────────────────────────────────────────────
export function CrossRefTable({ saju, astro, lang = 'ko' }: CrossRefTableProps) {
  if (!saju || !astro) return null
  const { rows, synthesis } = buildRows(saju as SajuLike, astro as AstroLike, lang)
  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="space-y-1 px-1">
        <div
          className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ds-gold-on-dark)' }}
        >
          <span>{lang === 'ko' ? '사주 ↔ 점성 교차' : 'Saju ↔ Astrology'}</span>
          <span style={{ color: 'var(--ds-dark-text-muted)', fontSize: 10 }}>
            {lang === 'ko' ? '동양 (좌) ↔ 서양 (우)' : 'East ↔ West'}
          </span>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: 'var(--ds-dark-text-muted)' }}>
          {lang === 'ko'
            ? '같은 영역을 두 시스템에서 어떻게 보는지 — 금색 박스(✓)는 두 시스템이 같은 결을 가리킬 때 표시돼요.'
            : 'How each life area looks in both systems — gold boxes (✓) mark where they point to the same thing.'}
        </p>
        <p className="text-[10px] leading-snug" style={{ color: 'var(--ds-dark-text-muted)' }}>
          {lang === 'ko'
            ? '📍 보완 = 부족한 결을 채움 · 동조 = 같은 결 강조 · 긴장 = 서로 당김'
            : '💡 complement = fills the gap · resonant = same direction · tension = pulling against'}
        </p>
      </div>

      {/* 종합 정체성 — 동·서 교차를 한 문장으로 요약 (원국 고정 정체성) */}
      {synthesis && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            background:
              synthesis.tone === 'tension'
                ? 'rgba(248, 113, 113, 0.08)'
                : 'rgba(212, 181, 114, 0.10)',
            border:
              synthesis.tone === 'tension'
                ? '1px solid rgba(248, 113, 113, 0.30)'
                : '1px solid rgba(212, 181, 114, 0.30)',
          }}
        >
          <div
            className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--ds-gold-on-dark)' }}
          >
            {lang === 'ko' ? '🧬 종합 정체성' : '🧬 Identity synthesis'}
          </div>
          <p
            className="text-xs leading-snug sm:text-[13px]"
            style={{ color: 'var(--ds-dark-text)' }}
          >
            {synthesis.text[lang]}
          </p>
        </div>
      )}

      <ul className="space-y-1.5">
        {rows.map((row, idx) => {
          const style = toneStyle(row.tone)
          const badge = toneBadge(row.tone, lang)
          return (
            <li
              key={idx}
              className="relative rounded-lg px-3 py-2"
              style={{ background: style.background, border: style.border }}
            >
              {/* 카테고리 칩 + tone 배지 (우상단) */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: 'rgba(212, 181, 114, 0.12)',
                    color: 'var(--ds-gold-on-dark)',
                    border: '1px solid rgba(212, 181, 114, 0.25)',
                  }}
                >
                  {row.category}
                </span>
                {badge && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: toneBadgeColor(row.tone) }}
                  >
                    {badge}
                  </span>
                )}
              </div>

              {/* 좌 (사주) ↔ 우 (점성) */}
              <div
                className="grid items-start gap-2"
                style={{ gridTemplateColumns: '1fr auto 1fr' }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--ds-dark-text-muted)' }}
                  >
                    {lookupDefinition(row.leftLabel, lang) ? (
                      <TermHint
                        term={row.leftLabel}
                        definition={lookupDefinition(row.leftLabel, lang) as string}
                      />
                    ) : (
                      row.leftLabel
                    )}
                  </div>
                  <div
                    className="text-xs leading-snug sm:text-sm"
                    style={{ color: 'var(--ds-dark-text)' }}
                    title={row.leftHint}
                  >
                    {row.leftValue}
                  </div>
                </div>

                <div
                  className="select-none px-1 text-base"
                  style={{ color: 'var(--ds-gold-on-dark)', lineHeight: '1.6' }}
                  aria-hidden="true"
                >
                  ↔
                </div>

                <div className="min-w-0 text-right">
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--ds-dark-text-muted)' }}
                  >
                    {lookupDefinition(row.rightLabel, lang) ? (
                      <TermHint
                        term={row.rightLabel}
                        definition={lookupDefinition(row.rightLabel, lang) as string}
                      />
                    ) : (
                      row.rightLabel
                    )}
                  </div>
                  <div
                    className="text-xs leading-snug sm:text-sm"
                    style={{ color: 'var(--ds-dark-text)' }}
                    title={row.rightHint}
                  >
                    {row.rightValue}
                  </div>
                </div>
              </div>

              {/* 교차 판정의 근거 한 줄 — 왜 동조/보완/긴장인지 */}
              {row.reason && (
                <p
                  className="mt-1.5 border-t pt-1.5 text-[11px] leading-snug"
                  style={{
                    color: 'var(--ds-dark-text-muted)',
                    borderColor: 'rgba(212, 181, 114, 0.15)',
                  }}
                >
                  {row.reason}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
