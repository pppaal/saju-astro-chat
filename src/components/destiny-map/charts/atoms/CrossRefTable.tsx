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
 * 차트 모달 Level 2 — 사주 ↔ 점성 교차 표.
 *
 * 9개 삶의 영역에서 동·서양을 교차해 동조/보완/긴장/중립을 판정하고,
 * 각 행마다 "왜 그런지" 쉬운 말 한 줄 + 맨 위 종합 정체성 한 문장을 보여준다.
 * 판정 로직·문구는 모두 @/lib/destiny-map/natalCross 에 있다 (DB 의존 없음).
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

// ── 표시용 매핑 (우측 점성 값에 원소 라벨 붙이기) ───────────────────────────
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

/** 점성 sign 영문 → 한국어. */
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
const SIGN_KO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(SIGN_EN_TO_KO).map(([en, ko]) => [ko, en]),
)

/** 4 원소 영문 → 한국어. */
const ELEMENT_EN_TO_KO: Record<string, string> = {
  fire: '불',
  earth: '흙',
  air: '공기',
  water: '물',
}

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
// 5원소·십신그룹 표시 라벨.
const SAJU_EL_LABEL: Record<string, { ko: string; en: string }> = {
  wood: { ko: '목(나무)', en: 'Wood' },
  fire: { ko: '화(불)', en: 'Fire' },
  earth: { ko: '토(흙)', en: 'Earth' },
  metal: { ko: '금(쇠)', en: 'Metal' },
  water: { ko: '수(물)', en: 'Water' },
}
const SIBSIN_GROUP_LABEL: Record<string, { ko: string; en: string }> = {
  비겁: { ko: '주체성', en: 'Independence' },
  식상: { ko: '표현', en: 'Expression' },
  재성: { ko: '실리', en: 'Practicality' },
  관성: { ko: '책임', en: 'Duty' },
  인성: { ko: '배움', en: 'Learning' },
}

function dominantElementLabel(counts: Record<string, number> | undefined, lang: Lang): string | undefined {
  const el = dominantSajuElement(counts)
  return el ? SAJU_EL_LABEL[el][lang] : undefined
}
function dominantAstroElementLabel(signs: string[], lang: Lang): string | undefined {
  const el = dominantAstroElement(signs)
  return el ? SAJU_EL_LABEL[el][lang] : undefined
}
function dominantGroupLabel(details: Record<string, number> | undefined, lang: Lang): string | undefined {
  const g = dominantSibsinGroup(details)
  return g ? SIBSIN_GROUP_LABEL[g]?.[lang] ?? g : undefined
}

// 격국 → 점성 MC sign "동조" 폴백 휴리스틱 (평가기 매핑 미해당 시).
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

function getAllPlanets(astro: AstroLike): PlanetLike[] {
  for (const list of [astro.chartData?.planets, astro.planets, astro.chart?.planets]) {
    if (Array.isArray(list) && list.length > 0) return list
  }
  return []
}

function getAscSign(astro: AstroLike): string | undefined {
  return astro.chartData?.ascendant?.sign ?? astro.ascendant?.sign ?? astro.chart?.ascendant?.sign
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

// 차트 행성 중 essential dignity 가 가장 강한 것(입궁·고양).
function findTopDignity(astro: AstroLike): { planet: string; status: string } | null {
  for (const p of getAllPlanets(astro)) {
    if (!p?.name || !p?.sign) continue
    const en = SIGN_KO_EN[p.sign] ?? p.sign
    const status = dignityOf(p.name, en)
    if (status === 'domicile' || status === 'exaltation') return { planet: p.name, status }
  }
  return null
}

// 차트에서 "강조된" 행성 — 앵귤러 하우스(1·4·7·10) 또는 dignity(입궁·고양).
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

// ── Row 데이터 모델 ──────────────────────────────────────────────────────
type RowTone = CrossTone

interface CrossRow {
  category: string
  leftLabel: string
  leftValue: string
  leftHint?: string
  rightLabel: string
  rightValue: string
  rightHint?: string
  tone: RowTone
  reason?: string // 교차 판정의 근거 한 줄 (쉬운 말)
}

// ── Row 빌더 ───────────────────────────────────────────────────────────
function buildRows(
  saju: SajuLike,
  astro: AstroLike,
  lang: Lang,
): { rows: CrossRow[]; synthesis: NatalSynthesis | null } {
  const rows: CrossRow[] = []
  const verdicts: CrossVerdict[] = []
  let sharedElement: ReturnType<typeof normSajuElement> = undefined

  // 1. 정체성: 일간 ↔ 태양
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
      const verdict = evalIdentity(dmEl, sun.sign)
      if (verdict) verdicts.push(verdict)
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

  // 2. 필요/욕망: 용신 ↔ 달
  {
    const yongsin = saju.advancedAnalysis?.yongsin?.primaryYongsin
    const moon = findPlanet(astro, 'Moon')
    if (yongsin && moon?.sign) {
      const moonWest = SIGN_TO_WESTERN_ELEMENT[moon.sign]
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

  // 3. 사회 역할: 격국 ↔ MC
  {
    const geokguk = saju.advancedAnalysis?.geokguk?.primary
    const mc = getMc(astro)
    if (geokguk && mc?.sign) {
      const taglineEntry = getGeokgukRich(geokguk, lang)
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

  // 4. 길흉: 일주 신살 ↔ 행운점
  {
    const dayCell = saju.table?.byPillar?.day
    const luckySource = dayCell?.shinsal ?? []
    const lucky = Array.isArray(luckySource) ? luckySource.filter(Boolean) : []
    const pof = getPof(astro)
    if (lucky.length > 0 || pof?.house || pof?.sign) {
      const right =
        pof && (pof.house || pof.sign)
          ? `${pof.sign ? localizeSign(pof.sign, lang) : ''}${pof.house ? ` ${pof.house}H` : ''}`.trim()
          : lang === 'ko' ? '아직 없음' : 'N/A'
      const houseHint =
        pof?.house && pof.house >= 1 && pof.house <= 12
          ? getHouseRich(pof.house as HouseNumber, lang)?.domain
          : undefined
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

  // 5. 관계: 합/충 ↔ aspect 조화/긴장
  {
    const relations = saju.relations ?? []
    const aspects = Array.isArray(astro.aspects) ? astro.aspects : []
    if (relations.length > 0 || aspects.length > 0) {
      const hapCount = relations.filter((r) => (r.kind ?? '').includes('합')).length
      const chungCount = relations.filter((r) => (r.kind ?? '').includes('충')).length
      const leftParts: string[] = []
      if (hapCount > 0) leftParts.push(lang === 'ko' ? `합 ${hapCount}` : `${hapCount} hap`)
      if (chungCount > 0) leftParts.push(lang === 'ko' ? `충 ${chungCount}` : `${chungCount} chung`)
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

  // 6. 강점: 12운성 ↔ 가장 위신 높은 행성
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

  // 7. 기질: 오행 분포(전체) ↔ 점성 원소 분포(전체)
  {
    const sajuCounts = saju.fiveElements
    const planets = getAllPlanets(astro)
    const astroSigns = planets.map((p) => p.sign).filter((s): s is string => !!s)
    const verdict = evalTemperament(sajuCounts, astroSigns)
    if (verdict) {
      verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '기질' : 'Temperament',
        leftLabel: lang === 'ko' ? '오행 분포' : 'Five-element mix',
        leftValue: dominantElementLabel(sajuCounts, lang) ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? '원소 분포' : 'Element mix',
        rightValue: dominantAstroElementLabel(astroSigns, lang) ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        tone: verdict.tone,
        reason: verdict.reason[lang],
      })
    }
  }

  // 8. 에너지 방향: 십신 우세 그룹(전체) ↔ 강조된 행성
  {
    const details = saju.advancedAnalysis?.strength?.details
    const emphasized = emphasizedPlanets(astro)
    const verdict = evalEnergyDirection(details, emphasized)
    if (verdict) {
      verdicts.push(verdict)
      rows.push({
        category: lang === 'ko' ? '에너지 방향' : 'Energy',
        leftLabel: lang === 'ko' ? '십신 우세' : 'Ten-god lead',
        leftValue: dominantGroupLabel(details, lang) ?? (lang === 'ko' ? '아직 없음' : 'N/A'),
        rightLabel: lang === 'ko' ? '강조 행성' : 'Emphasis',
        rightValue:
          [...emphasized]
            .map((p) => PLANET_DISPLAY[p]?.[lang] ?? p)
            .slice(0, 3)
            .join(' · ') || (lang === 'ko' ? '뚜렷한 강조 없음' : 'None'),
        tone: verdict.tone,
        reason: verdict.reason[lang],
      })
    }
  }

  // 9. 드러나는 나: 일간(본질) ↔ ASC(첫인상)
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

function toneBadgeColor(tone: RowTone): string {
  if (tone === 'tension') return 'rgba(248, 113, 113, 0.95)'
  if (tone === 'complement') return 'var(--ds-gold-on-dark)'
  return 'rgba(167, 139, 250, 0.95)'
}

// ── 용어 정의 사전 ──────────────────────────────────────────────────────
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
  '오행 분포': '사주 여덟 글자에 목·화·토·금·수가 각각 얼마나 있는지 — 타고난 기질의 균형.',
  '십신 우세': '사주에서 가장 강한 에너지 방향 (책임·실리·배움·표현·주체성 중 하나).',
  '일간 (본질)': '태어난 날의 천간 — 꾸미지 않은 속 모습.',
  'ASC (첫인상)': '태어난 순간 동쪽 지평선의 별자리 — 남에게 비치는 첫인상.',
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
  'Five-element mix': 'How much of each element (Wood/Fire/Earth/Metal/Water) your chart holds.',
  'Ten-god lead': 'Your strongest drive (duty, practicality, learning, expression, or independence).',
  Ascendant: 'The sign rising at birth — the first impression you give.',
}

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
            ? '같은 영역을 사주와 별자리가 어떻게 보는지 — 둘이 같은 결을 가리키면 동조, 다르게 채워주면 보완, 서로 당기면 긴장이에요.'
            : 'How each life area looks in both systems — same direction = resonant, fills a gap = complement, pulls apart = tension.'}
        </p>
        <p className="text-[10px] leading-snug" style={{ color: 'var(--ds-dark-text-muted)' }}>
          {lang === 'ko'
            ? '📍 동조 = 같은 결 강조 · 보완 = 부족한 결 채움 · 긴장 = 서로 당김'
            : '💡 resonant = same direction · complement = fills the gap · tension = pulling against'}
        </p>
      </div>

      {/* 종합 정체성 — 동·서 교차를 한 문장으로 요약 */}
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
          <p className="text-xs leading-snug sm:text-[13px]" style={{ color: 'var(--ds-dark-text)' }}>
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
                  <span className="text-[10px] font-medium" style={{ color: toneBadgeColor(row.tone) }}>
                    {badge}
                  </span>
                )}
              </div>

              <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                <div className="min-w-0">
                  <div className="text-[10px]" style={{ color: 'var(--ds-dark-text-muted)' }}>
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
                  <div className="text-[10px]" style={{ color: 'var(--ds-dark-text-muted)' }}>
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

              {/* 교차 판정의 근거 한 줄 — 쉬운 말 */}
              {row.reason && (
                <p
                  className="mt-1.5 border-t pt-1.5 text-[11px] leading-snug"
                  style={{ color: 'var(--ds-dark-text-muted)', borderColor: 'rgba(212, 181, 114, 0.15)' }}
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
