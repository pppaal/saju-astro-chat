/* eslint-disable @typescript-eslint/no-explicit-any --
 * 경계 어댑터: NatalContext 의 느슨하게 타입된 하위 shape(지장간·신살·관계 등)를
 * 방어적으로 매핑한다. 정확한 내부 타입에 강결합하지 않으려 의도적으로 any 허용. */
/**
 * 실데이터 어댑터 — NatalContext(buildNatalContext 결과) → ReportData(chart.zip shape).
 * 우리 shape 에 없는 일부 필드(지장간 가중치·신살 polarity·대운 십신)는 룩업/폴백.
 */
import type { ReportData, ReportPillar } from './reportTypes'
import { SIGN_ABBR, STEM_INFO } from './reportTypes'
import type { RelationCategory } from '@/lib/chart-dictionary'
import {
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalDrive,
  evalKeyAspect,
  evalRomance,
  evalMovement,
  evalSpirit,
  evalWealth,
  evalExpression,
  evalVoid,
  evalNorthNode,
  evalYinYang,
  synthesize,
  dominantSibsinGroup,
  type CrossVerdict,
} from '@/lib/report/natalCross'
import { getSouthNodeOppositeSign } from '@/lib/astrology/interpretations'
import { SIGN_KO_TO_EN } from '@/lib/astrology/signLabels'
import { getGongmang } from '@/lib/saju/pillarLookup'
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'
import { currentManAge } from '@/lib/datetime/currentAge'

/** 미성년 안전 모드 임계 — 만 14세 미만이면 연애·배우자·재물 콘텐츠를 연령 맞춤으로
 *  reframe/생략한다(아동 부적합 방지). 출생 시간대 미상이면 'UTC'로 근사(연 단위
 *  게이트라 자정 경계 오차는 무관). 생년월일 불완전 시 성인으로 간주(오탐 방지). */
export const MINOR_AGE_THRESHOLD = 14
function computeIsMinor(inp: any, now: Date): boolean {
  const y = Number(inp?.year)
  const m = Number(inp?.month)
  const d = Number(inp?.date)
  if (!y || !m || !d) return false
  try {
    const age = currentManAge({
      birthYear: y,
      birthMonth: m,
      birthDate: d,
      birthTimeZone: inp?.timeZone || 'UTC',
      now,
    })
    return age < MINOR_AGE_THRESHOLD
  } catch {
    return false
  }
}

// 5-tier (정통) → 단일 라벨. 우선순위는 score 절댓값과 일치.
// domicile/exaltation/detriment/fall 4 종을 먼저 — 라벨 자체가 강한 의미.
// 그 다음 triplicity/term/face — 약한 dignity. 모두 false 면 peregrine.
const topTier = (t: {
  domicile: boolean
  exaltation: boolean
  triplicity: boolean
  term: boolean
  face: boolean
  detriment: boolean
  fall: boolean
}): string =>
  t.domicile
    ? 'domicile'
    : t.exaltation
      ? 'exaltation'
      : t.detriment
        ? 'detriment'
        : t.fall
          ? 'fall'
          : t.triplicity
            ? 'triplicity'
            : t.term
              ? 'term'
              : t.face
                ? 'face'
                : 'peregrine'

// 오행 한글 → 영문 키
const EL_KO_EN: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
// 한글 오행 → 영문 키. 값이 없으면 가짜('wood')를 넣지 말고 null 을 흘린다.
const elEn = (x: string | undefined | null) => (x ? (EL_KO_EN[x] ?? x.toLowerCase()) : null)

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☾',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  'North Node': '☊',
  Node: '☊',
  Chiron: '⚷',
  Lilith: '⚸',
}
const PLANET_KO: Record<string, string> = {
  ...PLANET_KO_BASE,
  'North Node': '북교점',
  'True Node': '북교점',
  'Mean Node': '북교점',
  'South Node': '남교점',
  Node: '북교점',
  Chiron: '카이런',
  Lilith: '릴리스',
}
// 점성 sign 한국어 → 영문 풀네임 (NatalContext 는 ZodiacKo 사용).
// 정본(astrology/signLabels) 의 KO→EN 역맵 재사용.
const SIGN_KO_FULL = SIGN_KO_TO_EN
const toAbbr = (sign: string | undefined): string => {
  if (!sign) return 'Ari'
  const full = SIGN_KO_FULL[sign] ?? sign
  return SIGN_ABBR[full] ?? (full.slice(0, 3) as string)
}
const fmtDeg = (lon: number | undefined): string => {
  if (typeof lon !== 'number') return ''
  const within = ((lon % 30) + 30) % 30
  const d = Math.floor(within)
  const m = Math.floor((within - d) * 60)
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′`
}
// 신살 길흉 polarity (대표 — 없으면 0)
const SHINSAL_POLARITY: Record<string, number> = {
  천을귀인: 3,
  문창귀인: 2,
  태극귀인: 2,
  천덕귀인: 2,
  월덕귀인: 2,
  학당귀인: 2,
  건록: 2,
  천을: 3,
  도화: 1,
  도화살: 1,
  역마: 1,
  역마살: 1,
  홍염살: 0,
  화개: 0,
  양인: -1,
  양인살: -2,
  백호: -2,
  괴강: -1,
  공망: -1,
  원진: -1,
  귀문: -1,
  현침: -1,
}

interface AnyCtx {
  input?: any
  saju?: any
  astro?: any
}

// 격국 신뢰도 메타 — reportTypes.ReportData 에는 없는 보조 정보라 어댑터에서
// 별도 채널로 흘려 §02 카드가 fallback/medium 일 때 헤딩을 약화하도록 한다.
export interface ReportGeokgukMeta {
  confidence?: 'high' | 'medium' | 'low'
  fallback: boolean
}
// ReportData 에 얹는 어댑터 전용 확장 필드(타입은 reportTypes 가 SSOT 라 손대지
// 않고 옵셔널로만 덧붙임). IntegratedReport 가 옵셔널로 읽는다.
export interface ReportDataExtras {
  geokgukMeta?: ReportGeokgukMeta
  sibsinCategoryCount?: Record<string, number>
  /** 만 14세 미만 — §01/§02 연애 슬롯을 연령 맞춤 문구로 reframe하고
   *  §05 교차의 연애·재물 축을 생략한다. */
  isMinor?: boolean
}

// 관계 detail 문자열에서 천간·지지 한자만 추출. 예: "亥-寅 육합" → "亥寅",
// "亥·卯·未 삼합(목)" → "亥卯未". 카테고리 한글어(육합/삼합/충…)는 한자가
// 아니므로 자동 제외됨.
const HANZI_BRANCH_STEM = new Set([
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
])
const extractPair = (detail: string | undefined): string => {
  if (!detail) return ''
  let out = ''
  for (const ch of detail) if (HANZI_BRANCH_STEM.has(ch)) out += ch
  return out
}
// natalCross / RelationHit 의 kind 는 RelationCategory 와 동일 문자열.
const RELATION_CATEGORIES = new Set<string>([
  '천간합',
  '천간충',
  '지지육합',
  '지지삼합',
  '지지방합',
  '지지충',
  '지지형',
  '지지파',
  '지지해',
  '원진',
])

/** NatalContext → ReportData (chart.zip 뷰모델). */
export function natalToReportData(
  ctx: AnyCtx,
  lang: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): ReportData & ReportDataExtras {
  const S = ctx.saju ?? {}
  const A = ctx.astro ?? {}
  const inp = ctx.input ?? {}
  const adv = S.analyses ?? {}
  const isMinor = computeIsMinor(inp, now)

  // 격국 신뢰도/폴백 플래그 — §02 카드가 "확정 정격"으로 단정하지 않도록 전달.
  // adv.geokguk(determineGeokgukAdvanced) 가 SSOT. 월령 본기 추정(fallback:true,
  // confidence:medium)은 카드에서 "추정 격국"으로 약화해 표시한다(CONVENTIONS §9).
  const geokgukMeta: ReportGeokgukMeta | undefined = adv.geokguk
    ? {
        confidence:
          adv.geokguk.confidence === 'high' ||
          adv.geokguk.confidence === 'medium' ||
          adv.geokguk.confidence === 'low'
            ? adv.geokguk.confidence
            : undefined,
        fallback: !!adv.geokguk.fallback,
      }
    : undefined
  // 십신 카테고리 카운트(비겁/식상/재성/관성/인성) — "주도 십성" 카드의 우세/부족
  // 상태를 일간 강약(S.strength)이 아니라 실제 카테고리 개수로 산출하기 위해 전달.
  const sibsinCategoryCount: Record<string, number> | undefined = adv.sibsin?.categoryCount
    ? { ...adv.sibsin.categoryCount }
    : undefined

  const date = `${String(inp.year).padStart(4, '0')}-${String(inp.month).padStart(2, '0')}-${String(inp.date).padStart(2, '0')}`
  const birthTimeUnknown = !!inp.birthTimeUnknown
  const time = birthTimeUnknown
    ? lang === 'en'
      ? 'unknown'
      : '미상'
    : `${String(inp.hour).padStart(2, '0')}:${String(inp.minute).padStart(2, '0')}`

  const mapPillar = (
    p: any,
    stages: Record<string, string>,
    key: string,
    isDay = false
  ): ReportPillar => {
    const jj = p?.jijanggan ?? {}
    // 본기(정기)·중기·여기(초기) 순. 깨진 분일수(days) 대신 '층'을 의미값으로 노출.
    const slots = [
      jj.jeonggi ? { sl: jj.jeonggi, layer: 'main' as const } : null,
      jj.junggi ? { sl: jj.junggi, layer: 'mid' as const } : null,
      jj.chogi ? { sl: jj.chogi, layer: 'sub' as const } : null,
    ].filter((x): x is { sl: any; layer: 'main' | 'mid' | 'sub' } => !!x)
    return {
      stem: p?.heavenlyStem?.name ?? '',
      branch: p?.earthlyBranch?.name ?? '',
      sibsinStem: isDay ? '日干' : (p?.heavenlyStem?.sibsin ?? ''),
      sibsinBranch: p?.earthlyBranch?.sibsin ?? '',
      jijanggan: slots.map(({ sl, layer }) => ({
        g: sl.name ?? sl.stem ?? sl.g ?? '',
        layer,
      })),
      twelveStage: stages?.[key] ?? '',
      isDay,
    }
  }
  const pillars = S.pillars ?? {}
  const stages: Record<string, string> = (S.twelveStages as Record<string, string>) ?? {}

  // 신살
  const natalShinsal = (S.natalShinsal ?? []).slice(0, 8).map((h: any) => {
    const kind = h.kind ?? h.name ?? ''
    const pillarKey = Array.isArray(h.pillars) ? h.pillars[0] : ''
    const pillar = PILLAR_KO[pillarKey] ?? ''
    const pillarEn = PILLAR_EN[pillarKey] ?? ''
    return {
      name: kind,
      ko: kind,
      pillar,
      pillarEn,
      sub: h.sub,
      polarity: h.polarity ?? SHINSAL_POLARITY[kind] ?? 0,
    }
  })
  // 관계 — type(kind 약칭), 한자 pair, 카테고리(getRelationMeaning 룩업용).
  const natalRelations = (S.natalRelations ?? []).slice(0, 6).map((r: any) => {
    const kind = String(r.kind ?? r.type ?? '')
    const tone: 'pos' | 'neg' | 'neutral' = kind.includes('합')
      ? 'pos'
      : kind.includes('충') || kind.includes('형') || kind.includes('파') || kind.includes('해')
        ? 'neg'
        : 'neutral'
    const detail = r.detail ?? r.basis ?? ''
    const category = RELATION_CATEGORIES.has(kind) ? (kind as RelationCategory) : undefined
    return { type: kind, detail, tone, category, pair: extractPair(detail) }
  })
  // 대운 (현재 여부는 NatalContext 에 없으면 false — 호출측에서 보강 가능)
  const daeun = (S.daeun ?? []).slice(0, 8).map((d: any) => ({
    age: d.startAge ?? d.age ?? 0,
    stem: d.stem ?? '',
    branch: d.branch ?? '',
    sibsin: d.sibsin ?? '',
    current: !!d.current,
  }))

  // 출생시각/출생지 미상 → 하우스·ASC·MC 는 자정/서울 폴백이라 신뢰 불가. _chart 에
  // 값이 있어도 리포트로 내보내지 않는다(0/null 로 비움). 행성 sign 은 유지(시각 의존 미미).
  const placeUnreliable = !!A.placeUnreliable
  // 점성 행성
  const planets = (A.chart?.planets ?? A.planets ?? []).map((p: any) => ({
    name: p.name,
    ko: PLANET_KO[p.name] ?? p.name,
    glyph: PLANET_GLYPH[p.name] ?? '●',
    lon: p.longitude ?? p.lon ?? 0,
    sign: toAbbr(p.sign),
    deg: fmtDeg(p.longitude ?? p.lon),
    house: placeUnreliable ? 0 : (p.house ?? 0),
    retro: typeof p.speed === 'number' ? p.speed < 0 : !!p.retrograde,
    speed: p.speed ?? 0,
  }))
  const extraPoints = (A.extraPoints ?? []).map((p: any) => ({
    name: p.name,
    ko: PLANET_KO[p.name] ?? p.name,
    glyph: PLANET_GLYPH[p.name] ?? '✦',
    lon: p.longitude ?? p.lon ?? 0,
    sign: toAbbr(p.sign),
    deg: fmtDeg(p.longitude ?? p.lon),
    house: p.house ?? 0,
  }))
  const houses = placeUnreliable
    ? []
    : (A.chart?.houses ?? A.houses ?? []).map((h: any, i: number) => ({
        i: h.index ?? h.i ?? i + 1,
        cusp: h.cusp ?? 0,
        sign: toAbbr(h.sign),
      }))
  // 본명 aspects — facts.hellenistic 가 major+minor 다 줌 (~30+ hits). 14 cap
  // 풀어 24 로 (UI 가 슬라이더/접고 펼침으로 처리). orb 작은 순.
  const aspects = (A.natalAspects ?? A.aspects ?? [])
    .slice()
    .sort((a: any, b: any) => (a.orb ?? 99) - (b.orb ?? 99))
    .slice(0, 24)
    .map((a: any) => ({
      a: a.from?.name ?? a.a ?? '',
      b: a.to?.name ?? a.b ?? '',
      type: a.type ?? 'conjunction',
      orb: a.orb ?? 0,
      applying: !!a.applying,
    }))

  // dignities — Phase B: facts.hellenistic.dignities (5-tier per planet) 를 그대로
  // 흡수. 옛 dignityOf 재계산 (단순 4-tier) 제거. peregrine 제외, score 절댓값
  // 기준 상위 8개 (정통 깊이 카드용 — 옛 6 보다 조금 넓힘).
  const dignities = (A.dignities ?? [])
    .map((d: any) => ({
      planet: d.planet,
      sign: toAbbr(d.sign),
      tier: topTier(d.tiers ?? {}),
      score: typeof d.score === 'number' ? d.score : 0,
    }))
    .filter((d: any) => d.tier !== 'peregrine')
    .sort((a: any, b: any) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 8)

  // Arabic Lots — 정통 7 lots (Fortune/Spirit/Eros/Necessity/Courage/Victory/
  // Nemesis). facts.hellenistic.lots 에서 받음.
  const lots = (A.lots ?? []).map((l: any) => ({
    name: l.name,
    sign: toAbbr(l.sign),
    deg: fmtDeg(l.longitude),
    house: l.house ?? 0,
  }))

  // Almuten Figuris — 주재 행성 (정통 Bonatti/Ibn Ezra 식). facts 가 winner +
  // winners + 행성별 누적 score 제공. UI Level 3 카드 용.
  const almuten = A.almutenFiguris
    ? {
        winner: A.almutenFiguris.winner ?? null,
        winners: A.almutenFiguris.winners ?? [],
        scores: A.almutenFiguris.scores ?? {},
      }
    : null

  // placeUnreliable 면 _chart 의 폴백 ASC/MC 를 무시하고 빈 값 → 아래에서 null 로.
  const asc = placeUnreliable ? {} : (A.chart?.ascendant ?? A.ascendant ?? {})
  const mc = placeUnreliable ? {} : (A.chart?.mc ?? A.mc ?? {})

  return {
    input: {
      name: inp.name ?? (lang === 'en' ? 'Client' : '내담자'),
      gender: inp.gender ?? 'male',
      calendar: lang === 'en' ? 'Gregorian' : '양력',
      date,
      time,
      place: inp.place ?? '',
      lat: inp.latitude ?? 0,
      lng: inp.longitude ?? 0,
      timeZone: inp.timeZone ?? '',
      isoUTC: inp.isoUTC ?? '',
      birthTimeUnknown,
    },
    saju: {
      dayMaster: S.dayMaster?.name ?? '',
      strength: S.strength ?? 'medium',
      geokguk: adv.geokguk?.primary ?? S.geokguk ?? '미정',
      yongsin: {
        primary: elEn(S.yongsin?.primary),
        secondary: (S.yongsin?.secondary ? elEn(S.yongsin.secondary) : undefined) ?? undefined,
        avoid: (S.yongsin?.avoid ?? [])
          .map((e: string | undefined | null) => elEn(e))
          .filter((x: string | null): x is string => !!x),
      },
      pillars: {
        hour: mapPillar(pillars.time, stages, 'time'),
        day: mapPillar(pillars.day, stages, 'day', true),
        month: mapPillar(pillars.month, stages, 'month'),
        year: mapPillar(pillars.year, stages, 'year'),
      },
      fiveElements: S.fiveElements ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      natalShinsal,
      natalRelations,
      daeun,
      // 회색 3 셀 해소 (RAW_DISTRIBUTION v5.4 — buildReportContext 가 흘려줌).
      rooted: typeof S.rooted === 'boolean' ? S.rooted : undefined,
      gongmang: Array.isArray(S.gongmang) ? S.gongmang : undefined,
      johuYongsin:
        S.johuYongsin && elEn(S.johuYongsin.primaryYongsin)
          ? {
              primary: elEn(S.johuYongsin.primaryYongsin) as string,
              rating: S.johuYongsin.rating ?? 0,
            }
          : null,
    },
    astro: {
      sect: A.sect ?? 'day',
      houseSystem: A.houseSystem ?? 'Placidus',
      // placeUnreliable(출생시각/출생지 미상) 면 facts 가 ascendant/mc 를 null 로 비워 보낸다
      // → 자정 폴백 각을 'Virgo'/'Gemini'/lon 0 으로 가짜로 채우지 않고 그대로 null 을 보존한다.
      ascendant: {
        lon: asc.longitude ?? asc.lon ?? null,
        sign: asc.sign ? (SIGN_KO_FULL[asc.sign] ?? asc.sign) : null,
        deg: fmtDeg(asc.longitude ?? asc.lon),
      },
      mc: {
        lon: mc.longitude ?? mc.lon ?? null,
        sign: mc.sign ? (SIGN_KO_FULL[mc.sign] ?? mc.sign) : null,
        deg: fmtDeg(mc.longitude ?? mc.lon),
      },
      planets,
      extraPoints,
      houses,
      aspects,
      dignities,
      lots,
      almuten,
    },
    geokgukMeta,
    sibsinCategoryCount,
    isMinor,
  }
}

const PILLAR_KO: Record<string, string> = {
  year: '年',
  month: '月',
  day: '日',
  time: '時',
  hour: '時',
}
// EN 리포트용 기둥 약칭 — 한자(年月日時)를 그대로 노출하지 않도록 짝을 둔다.
const PILLAR_EN: Record<string, string> = {
  year: 'Yr',
  month: 'Mo',
  day: 'Day',
  time: 'Hr',
  hour: 'Hr',
}

// ── 섹션 5: natalCross 교차 → 카드 rows ──────────────────────────────────
export interface CrossRowOut {
  category: string
  tone: CrossVerdict['tone']
  reason: string
  left?: string
  right?: string
  /** 공망/카르마(결핍 축) — resonant 톤이라도 '잘 맞아요' 집계에서 제외하기 위한 표식. */
  karmaAxis?: boolean
}
export function buildCrossRows(
  ctx: AnyCtx,
  lang: 'ko' | 'en' = 'ko',
  now: Date = new Date()
): { synthesis?: string; rows: CrossRowOut[] } {
  const S = ctx.saju ?? {}
  const A = ctx.astro ?? {}
  const adv = S.analyses ?? {}
  // 미성년 안전 모드: 연애·재물 교차 축은 verdict/synthesis 산출 전에 제거해
  // 그리드뿐 아니라 종합문에도 연애·배우자·재물 서술이 섞이지 않게 한다.
  const isMinor = computeIsMinor(ctx.input ?? {}, now)
  const planets = A.chart?.planets ?? A.planets ?? []
  const find = (n: string) => planets.find((p: any) => p.name === n)
  const dmEl = S.dayMaster?.element
  // placeUnreliable(출생시각/출생지 미상) 면 ASC/MC/하우스 의존 신호를 전부 차단 —
  // 자정/서울 폴백으로 만든 "그럴듯하지만 틀린" 사회역할·각도·angularity 누출 방지.
  const placeUnreliable = !!A.placeUnreliable
  const sunSign = find('Sun')?.sign
  const moonSign = find('Moon')?.sign
  const ascSign = placeUnreliable ? undefined : (A.chart?.ascendant ?? A.ascendant)?.sign
  const mcSign = placeUnreliable ? undefined : (A.chart?.mc ?? A.mc)?.sign
  const details = adv.sibsin?.categoryCount
  const crossGender: 'male' | 'female' =
    (ctx.input as { gender?: string } | undefined)?.gender === 'female' ? 'female' : 'male'

  // 강조 행성 + 최고 dignity — Phase B: facts.hellenistic.dignities (5-tier)
  // 활용. 옛 dignityOf 재계산 제거. 각 행성 angularity (1/4/7/10 하우스) + 강한
  // dignity (domicile/exaltation) → emphasized 집합. topDignity 는 첫 강한 hit.
  const ANGLES = new Set([1, 4, 7, 10])
  const emphasized = new Set<string>()
  let topDignity: { planet: string; status: string } | null = null
  const dignityIdx: Record<string, { domicile: boolean; exaltation: boolean }> = {}
  for (const d of (A.dignities ?? []) as Array<{
    planet: string
    tiers?: { domicile?: boolean; exaltation?: boolean }
  }>) {
    dignityIdx[d.planet] = { domicile: !!d.tiers?.domicile, exaltation: !!d.tiers?.exaltation }
  }
  for (const p of planets) {
    if (!p?.name) continue
    // angularity(1/4/7/10 하우스) emphasis 는 하우스가 신뢰 가능할 때만 — 미상이면 skip.
    if (!placeUnreliable && typeof p.house === 'number' && ANGLES.has(p.house))
      emphasized.add(p.name)
    const dg = dignityIdx[p.name]
    if (dg?.domicile || dg?.exaltation) {
      emphasized.add(p.name)
      if (!topDignity)
        topDignity = { planet: p.name, status: dg.domicile ? 'domicile' : 'exaltation' }
    }
  }
  // 행성 컨디션(dignity 강도): 본궁·고양=strong / 손상·쇠약=weak / 그 외 neutral.
  const planetCondition = (name: string): 'strong' | 'weak' | 'neutral' => {
    const d = (A.dignities ?? []).find((x: any) => x.planet === name) as
      | {
          tiers?: { domicile?: boolean; exaltation?: boolean; detriment?: boolean; fall?: boolean }
        }
      | undefined
    const t = d?.tiers ?? {}
    if (t.domicile || t.exaltation) return 'strong'
    if (t.detriment || t.fall) return 'weak'
    return 'neutral'
  }
  // 추진 행성: 화성 우선(행동), 없으면 태양.
  const driveCondition = emphasized.has('Mars')
    ? planetCondition('Mars')
    : emphasized.has('Sun')
      ? planetCondition('Sun')
      : 'neutral'
  const aspectsForKey = (A.natalAspects ?? A.aspects ?? []).map((a: any) => ({
    from: { name: a.from?.name ?? a.a },
    to: { name: a.to?.name ?? a.b },
    type: a.type,
    orb: a.orb,
  }))
  let harmonious = 0,
    hard = 0
  for (const a of A.natalAspects ?? A.aspects ?? []) {
    const t = String(a.type ?? '').toLowerCase()
    if (t === 'trine' || t === 'sextile') harmonious++
    else if (t === 'square' || t === 'opposition') hard++
  }
  const rels = S.natalRelations ?? []
  const hap = rels.filter((r: any) => String(r.kind ?? r.type).includes('합')).length
  const chung = rels.filter((r: any) => String(r.kind ?? r.type).includes('충')).length
  // 궁위 — 일지(日支)=배우자궁. *지지* 충/합이 일지에 걸리는지(pillars 에 'day').
  // 주의: '충'/'합' 부분일치는 천간충/천간합까지 잡아 일지(지지) 궁위에 잘못 귀속된다
  // (R5: 천간충 癸-丁이 일지 巳 충으로 날조됨). 반드시 지지 관계로만 한정한다.
  const dayBranchClash = rels.some(
    (r: any) => String(r.kind ?? r.type).includes('지지충') && (r.pillars ?? []).includes('day')
  )
  const dayBranchCombine = rels.some(
    (r: any) =>
      /지지(육합|삼합|방합|반합)/.test(String(r.kind ?? r.type)) && (r.pillars ?? []).includes('day')
  )
  const dayShinsal = (S.natalShinsal ?? [])
    .filter((h: any) => Array.isArray(h.pillars) && h.pillars.includes('day'))
    .map((h: any) => String(h.kind ?? h.name))
  const stage = S.twelveStages?.day
  const strength = adv.yongsin?.daymasterStrength ?? S.strength

  // 공망 × South Node 교차용 데이터 — 공망 지지(advanced 우선, 없으면 top-level)
  // + North Node sign 으로부터 South Node sign 유도. 둘 다 비면 evalVoid 가 null
  // 반환해 자동 행 생략.
  // 공망 지지: advanced/top-level 우선, 없으면 일주 간지로 정본 계산(getGongmang).
  const dayPillarGanji = `${S.pillars?.day?.heavenlyStem?.name ?? ''}${S.pillars?.day?.earthlyBranch?.name ?? ''}`
  const gongmangBranches =
    adv.gongmang?.gongmangBranches ??
    S.gongmang ??
    (dayPillarGanji.length === 2 ? (getGongmang(dayPillarGanji) ?? []) : [])
  // 차트의 북교점 행성명은 'True Node'(기본)·'Mean Node'·'North Node'·'Node' 등
  // 구현마다 다름. /node/ 로 매칭하되 'South Node' 는 제외(북교점만).
  const northNode = planets.find(
    (p: any) => /node/i.test(p.name ?? '') && !/south/i.test(p.name ?? '')
  )
  // 사우스노드 = 북교점 정반대 사인. getSouthNodeOppositeSign 은 *영어 사인*을
  // 받으므로 한글 풀네임(SIGN_KO_FULL)이 아니라 원본 영어 sign 을 넘긴다.
  const southNodeSign = northNode?.sign
    ? getSouthNodeOppositeSign(northNode.sign as never)
    : undefined

  // 생활영역 교차 입력 — 신살 존재 여부(전 기둥) + 하우스 점유 수 + 재성 비중.
  const allShinsal: string[] = (S.natalShinsal ?? []).map((h: any) => String(h.kind ?? h.name))
  const hasShinsal = (...names: string[]) =>
    names.some((n) => allShinsal.some((s) => s.includes(n)))
  const houseCount: Record<number, number> = {}
  for (const p of planets) {
    if (typeof p.house === 'number') houseCount[p.house] = (houseCount[p.house] ?? 0) + 1
  }
  const inHouses = (...hs: number[]) => hs.reduce((a, h) => a + (houseCount[h] ?? 0), 0)
  const jaeseongCount = details?.['재성'] ?? 0
  const siksangCount = details?.['식상'] ?? 0
  // 길흉: 일주 신살을 먼저, 없으면 다른 기둥 신살로 폴백 — 대부분의 사주에서
  // 행이 비지 않도록(이전엔 일주 신살에 매핑 가능한 게 없으면 통째로 누락).
  const fortuneShinsal = [...dayShinsal, ...allShinsal.filter((s) => !dayShinsal.includes(s))]

  // 교차 항목 카테고리 라벨 — 이중언어. key 로 행을 묶고 lang 으로 표시 텍스트 선택.
  const CAT: Record<string, { ko: string; en: string }> = {
    identity: { ko: '정체성', en: 'Identity' },
    needs: { ko: '욕망', en: 'Needs' },
    socialRole: { ko: '사회역할', en: 'Social Role' },
    fortune: { ko: '길흉', en: 'Fortune' },
    relations: { ko: '관계', en: 'Relationships' },
    strength: { ko: '강점', en: 'Strength' },
    temperament: { ko: '기질', en: 'Temperament' },
    energy: { ko: '에너지', en: 'Energy' },
    drive: { ko: '추진력', en: 'Drive' },
    keyTrait: { ko: '핵심 성향', en: 'Core Trait' },
    romance: { ko: '연애·매력', en: 'Love & Magnetism' },
    expression: { ko: '소통·표현', en: 'Voice & Expression' },
    movement: { ko: '이동·변화', en: 'Movement & Change' },
    spirit: { ko: '예술·영성', en: 'Art & Spirit' },
    wealth: { ko: '재물 그릇', en: 'Wealth Capacity' },
    karma: { ko: '공망/카르마', en: 'Void / Karma' },
    growth: { ko: '성장 방향', en: 'Growth Direction' },
    yinYang: { ko: '음양 리듬', en: 'Yin-Yang Rhythm' },
  }
  const items: Array<[keyof typeof CAT, CrossVerdict | null]> = [
    [
      'identity',
      evalIdentity(dmEl, sunSign, ascSign, (A.almutenFiguris?.winner ?? null) as string | null),
    ],
    [
      'needs',
      evalNeeds(S.yongsin?.primary, moonSign, S.yongsin?.avoid?.[0] as string | undefined, {
        el: S.johuYongsin?.primaryYongsin as string | undefined,
        climateKo: S.johuYongsin?.climate as string | undefined,
        climateEn: S.johuYongsin?.climate_en as string | undefined,
        rating: (S.johuYongsin?.rating as number | undefined) ?? 0,
      }),
    ],
    [
      'socialRole',
      adv.geokguk?.primary && mcSign ? evalSocialRole(adv.geokguk.primary, mcSign) : null,
    ],
    ['fortune', evalFortune(fortuneShinsal, emphasized)],
    [
      'relations',
      evalRelations(
        hap,
        chung,
        harmonious,
        hard,
        crossGender,
        // 자식성 — 남: 관성 / 여: 식상 (categoryCount 그룹).
        ((crossGender === 'female' ? details?.식상 : details?.관성) as number | undefined) ?? 0,
        isMinor // 미성년이면 자녀·후대 서술 생략
      ),
    ],
    [
      'strength',
      evalStrength(
        stage,
        topDignity,
        typeof S.rooted === 'boolean' ? S.rooted : undefined,
        A.sect === 'night' || A.sect === 'day' ? A.sect : undefined
      ),
    ],
    [
      'temperament',
      evalTemperament(S.fiveElements, planets.map((p: any) => p.sign).filter(Boolean)),
    ],
    ['energy', evalEnergyDirection(details, emphasized)],
    [
      'drive',
      evalDrive(
        strength,
        emphasized.has('Sun') || emphasized.has('Mars'),
        driveCondition,
        !!S.gwansalHonjap
      ),
    ],
    ['keyTrait', evalKeyAspect(aspectsForKey, dominantSibsinGroup(details))],
    [
      'romance',
      evalRomance(
        hasShinsal('도화', '홍염'),
        emphasized.has('Venus'),
        inHouses(5, 7),
        crossGender,
        // 배우자성 — 남: 재성 / 여: 관성 (categoryCount 그룹).
        ((crossGender === 'female' ? details?.관성 : details?.재성) as number | undefined) ?? 0,
        dayBranchClash,
        dayBranchCombine
      ),
    ],
    ['expression', evalExpression(siksangCount, emphasized.has('Mercury'), inHouses(3, 5))],
    ['movement', evalMovement(hasShinsal('역마'), inHouses(3, 9), emphasized.has('Jupiter'))],
    ['spirit', evalSpirit(hasShinsal('화개'), inHouses(12), emphasized.has('Neptune'))],
    [
      'wealth',
      evalWealth(
        jaeseongCount,
        inHouses(2, 8),
        emphasized.has('Venus') || emphasized.has('Jupiter')
      ),
    ],
    ['karma', evalVoid(gongmangBranches, southNodeSign)],
    ['growth', evalNorthNode(S.fiveElements, northNode?.sign)],
    ['yinYang', evalYinYang(STEM_INFO[S.dayMaster?.name ?? '']?.yy, A.sect)],
  ]
  const visibleItems = isMinor
    ? items.filter(([key]) => key !== 'romance' && key !== 'wealth')
    : items
  const verdicts = visibleItems.map(([, v]) => v).filter((v): v is CrossVerdict => !!v)
  const synth = synthesize(
    verdicts,
    undefined,
    S.fiveElements as Record<string, number> | undefined
  )
  const rows = visibleItems
    .filter((it): it is [keyof typeof CAT, CrossVerdict] => !!it[1])
    .map(([key, v]) => ({
      category: CAT[key][lang],
      tone: v.tone,
      reason: v.reason[lang],
      left: v.left?.[lang],
      right: v.right?.[lang],
      karmaAxis: v.karmaAxis,
    }))
  return { synthesis: synth?.text[lang], rows }
}
