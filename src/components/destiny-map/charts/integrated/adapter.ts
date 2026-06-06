/* eslint-disable @typescript-eslint/no-explicit-any --
 * 경계 어댑터: NatalContext 의 느슨하게 타입된 하위 shape(지장간·신살·관계 등)를
 * 방어적으로 매핑한다. 정확한 내부 타입에 강결합하지 않으려 의도적으로 any 허용. */
/**
 * 실데이터 어댑터 — NatalContext(buildNatalContext 결과) → ReportData(chart.zip shape).
 * 우리 shape 에 없는 일부 필드(지장간 가중치·신살 polarity·대운 십신)는 룩업/폴백.
 */
import type { ReportData, ReportPillar } from './reportTypes'
import { SIGN_ABBR } from './reportTypes'
import {
  evalIdentity, evalNeeds, evalSocialRole, evalFortune, evalRelations, evalStrength,
  evalTemperament, evalEnergyDirection, evalPersona, evalDrive, evalKeyAspect,
  evalVoid,
  synthesize, dominantSibsinGroup, type CrossVerdict,
} from '@/lib/destiny-map/natalCross'
import { getSouthNodeOppositeSign } from '@/lib/astrology/interpretations'

// 5-tier (정통) → 단일 라벨. 우선순위는 score 절댓값과 일치.
// domicile/exaltation/detriment/fall 4 종을 먼저 — 라벨 자체가 강한 의미.
// 그 다음 triplicity/term/face — 약한 dignity. 모두 false 면 peregrine.
const topTier = (t: {
  domicile: boolean; exaltation: boolean; triplicity: boolean
  term: boolean; face: boolean; detriment: boolean; fall: boolean
}): string =>
  t.domicile ? 'domicile'
    : t.exaltation ? 'exaltation'
    : t.detriment ? 'detriment'
    : t.fall ? 'fall'
    : t.triplicity ? 'triplicity'
    : t.term ? 'term'
    : t.face ? 'face'
    : 'peregrine'

// 오행 한글 → 영문 키
const EL_KO_EN: Record<string, string> = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }
const elEn = (x: string | undefined) => (x ? EL_KO_EN[x] ?? x.toLowerCase() : 'wood')

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃',
  Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', 'North Node': '☊', Node: '☊', Chiron: '⚷', Lilith: '⚸',
}
const PLANET_KO: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성',
  Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성', 'North Node': '북교점', Node: '북교점',
  Chiron: '카이런', Lilith: '릴리스',
}
// 점성 sign 한국어 → 영문 풀네임 (NatalContext 는 ZodiacKo 사용)
const SIGN_KO_FULL: Record<string, string> = {
  양자리: 'Aries', 황소자리: 'Taurus', 쌍둥이자리: 'Gemini', 게자리: 'Cancer', 사자자리: 'Leo', 처녀자리: 'Virgo',
  천칭자리: 'Libra', 전갈자리: 'Scorpio', 사수자리: 'Sagittarius', 염소자리: 'Capricorn', 물병자리: 'Aquarius', 물고기자리: 'Pisces',
}
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
  천을귀인: 3, 문창귀인: 2, 태극귀인: 2, 천덕귀인: 2, 월덕귀인: 2, 학당귀인: 2, 건록: 2, 천을: 3,
  도화: 1, 도화살: 1, 역마: 1, 역마살: 1, 홍염살: 0, 화개: 0,
  양인: -1, 양인살: -2, 백호: -2, 괴강: -1, 공망: -1, 원진: -1, 귀문: -1, 현침: -1,
}

interface AnyCtx { input?: any; saju?: any; astro?: any }

/** NatalContext → ReportData (chart.zip 뷰모델). */
export function natalToReportData(ctx: AnyCtx): ReportData {
  const S = ctx.saju ?? {}
  const A = ctx.astro ?? {}
  const inp = ctx.input ?? {}
  const adv = S.analyses ?? {}

  const date = `${String(inp.year).padStart(4, '0')}-${String(inp.month).padStart(2, '0')}-${String(inp.date).padStart(2, '0')}`
  const time = `${String(inp.hour).padStart(2, '0')}:${String(inp.minute).padStart(2, '0')}`

  const mapPillar = (p: any, stages: Record<string, string>, key: string, isDay = false): ReportPillar => {
    const jj = p?.jijanggan ?? {}
    const slots = [jj.chogi, jj.junggi, jj.jeonggi].filter(Boolean)
    return {
      stem: p?.heavenlyStem?.name ?? '',
      branch: p?.earthlyBranch?.name ?? '',
      sibsinStem: isDay ? '日干' : p?.heavenlyStem?.sibsin ?? '',
      sibsinBranch: p?.earthlyBranch?.sibsin ?? '',
      jijanggan: slots.map((sl: any) => ({ g: sl.name ?? sl.stem ?? sl.g ?? '', d: sl.days ?? sl.weight ?? sl.d ?? 0 })),
      twelveStage: stages?.[key] ?? '',
      isDay,
    }
  }
  const pillars = S.pillars ?? {}
  const stages: Record<string, string> = (S.twelveStages as Record<string, string>) ?? {}

  // 신살
  const natalShinsal = (S.natalShinsal ?? []).slice(0, 8).map((h: any) => {
    const kind = h.kind ?? h.name ?? ''
    const pillar = Array.isArray(h.pillars) ? PILLAR_KO[h.pillars[0]] ?? '' : ''
    return { name: kind, ko: kind, pillar, sub: h.sub, polarity: h.polarity ?? SHINSAL_POLARITY[kind] ?? 0 }
  })
  // 관계
  const natalRelations = (S.natalRelations ?? []).slice(0, 6).map((r: any) => {
    const kind = String(r.kind ?? r.type ?? '')
    const tone: 'pos' | 'neg' | 'neutral' = kind.includes('합') ? 'pos' : kind.includes('충') || kind.includes('형') || kind.includes('파') || kind.includes('해') ? 'neg' : 'neutral'
    return { type: kind, detail: r.detail ?? r.basis ?? '', tone }
  })
  // 대운 (현재 여부는 NatalContext 에 없으면 false — 호출측에서 보강 가능)
  const daeun = (S.daeun ?? []).slice(0, 8).map((d: any) => ({
    age: d.startAge ?? d.age ?? 0,
    stem: d.stem ?? '', branch: d.branch ?? '',
    sibsin: d.sibsin ?? '',
    current: !!d.current,
  }))

  // 점성 행성
  const planets = (A.chart?.planets ?? A.planets ?? []).map((p: any) => ({
    name: p.name,
    ko: PLANET_KO[p.name] ?? p.name,
    glyph: PLANET_GLYPH[p.name] ?? '●',
    lon: p.longitude ?? p.lon ?? 0,
    sign: toAbbr(p.sign),
    deg: fmtDeg(p.longitude ?? p.lon),
    house: p.house ?? 0,
    retro: typeof p.speed === 'number' ? p.speed < 0 : !!p.retrograde,
    speed: p.speed ?? 0,
  }))
  const extraPoints = (A.extraPoints ?? []).map((p: any) => ({
    name: p.name, ko: PLANET_KO[p.name] ?? p.name, glyph: PLANET_GLYPH[p.name] ?? '✦',
    lon: p.longitude ?? p.lon ?? 0, sign: toAbbr(p.sign), deg: fmtDeg(p.longitude ?? p.lon), house: p.house ?? 0,
  }))
  const houses = (A.chart?.houses ?? A.houses ?? []).map((h: any, i: number) => ({
    i: h.index ?? h.i ?? i + 1, cusp: h.cusp ?? 0, sign: toAbbr(h.sign),
  }))
  // 본명 aspects — facts.hellenistic 가 major+minor 다 줌 (~30+ hits). 14 cap
  // 풀어 24 로 (UI 가 슬라이더/접고 펼침으로 처리). orb 작은 순.
  const aspects = (A.natalAspects ?? A.aspects ?? [])
    .slice()
    .sort((a: any, b: any) => (a.orb ?? 99) - (b.orb ?? 99))
    .slice(0, 24)
    .map((a: any) => ({
      a: a.from?.name ?? a.a ?? '', b: a.to?.name ?? a.b ?? '',
      type: a.type ?? 'conjunction', orb: a.orb ?? 0, applying: !!a.applying,
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

  const asc = A.chart?.ascendant ?? A.ascendant ?? {}
  const mc = A.chart?.mc ?? A.mc ?? {}

  return {
    input: {
      name: inp.name ?? '내담자', gender: inp.gender ?? 'male', calendar: '양력', date, time,
      place: inp.place ?? '', lat: inp.latitude ?? 0, lng: inp.longitude ?? 0,
      timeZone: inp.timeZone ?? '', isoUTC: inp.isoUTC ?? '',
    },
    saju: {
      dayMaster: S.dayMaster?.name ?? '',
      strength: S.strength ?? 'medium',
      geokguk: adv.geokguk?.primary ?? S.geokguk ?? '미정',
      yongsin: {
        primary: elEn(S.yongsin?.primary), secondary: S.yongsin?.secondary ? elEn(S.yongsin.secondary) : undefined,
        avoid: (S.yongsin?.avoid ?? []).map(elEn),
      },
      pillars: {
        hour: mapPillar(pillars.time, stages, 'time'),
        day: mapPillar(pillars.day, stages, 'day', true),
        month: mapPillar(pillars.month, stages, 'month'),
        year: mapPillar(pillars.year, stages, 'year'),
      },
      fiveElements: S.fiveElements ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      natalShinsal, natalRelations, daeun,
    },
    astro: {
      sect: A.sect ?? 'day', houseSystem: A.houseSystem ?? 'Placidus',
      ascendant: { lon: asc.longitude ?? asc.lon ?? 0, sign: SIGN_KO_FULL[asc.sign] ?? asc.sign ?? 'Virgo', deg: fmtDeg(asc.longitude ?? asc.lon) },
      mc: { lon: mc.longitude ?? mc.lon ?? 0, sign: SIGN_KO_FULL[mc.sign] ?? mc.sign ?? 'Gemini', deg: fmtDeg(mc.longitude ?? mc.lon) },
      planets, extraPoints, houses, aspects, dignities,
      lots, almuten,
    },
  }
}

const PILLAR_KO: Record<string, string> = { year: '年', month: '月', day: '日', time: '時', hour: '時' }

// ── 섹션 5: natalCross 교차 → 카드 rows ──────────────────────────────────
export interface CrossRowOut { category: string; tone: CrossVerdict['tone']; reason: string }
export function buildCrossRows(ctx: AnyCtx, lang: 'ko' | 'en' = 'ko'): { synthesis?: string; rows: CrossRowOut[] } {
  const S = ctx.saju ?? {}
  const A = ctx.astro ?? {}
  const adv = S.analyses ?? {}
  const planets = A.chart?.planets ?? A.planets ?? []
  const find = (n: string) => planets.find((p: any) => p.name === n)
  const dmEl = S.dayMaster?.element
  const sunSign = find('Sun')?.sign
  const moonSign = find('Moon')?.sign
  const ascSign = (A.chart?.ascendant ?? A.ascendant)?.sign
  const mcSign = (A.chart?.mc ?? A.mc)?.sign
  const details = adv.sibsin?.categoryCount

  // 강조 행성 + 최고 dignity — Phase B: facts.hellenistic.dignities (5-tier)
  // 활용. 옛 dignityOf 재계산 제거. 각 행성 angularity (1/4/7/10 하우스) + 강한
  // dignity (domicile/exaltation) → emphasized 집합. topDignity 는 첫 강한 hit.
  const ANGLES = new Set([1, 4, 7, 10])
  const emphasized = new Set<string>()
  let topDignity: { planet: string; status: string } | null = null
  const dignityIdx: Record<string, { domicile: boolean; exaltation: boolean }> = {}
  for (const d of (A.dignities ?? []) as Array<{ planet: string; tiers?: { domicile?: boolean; exaltation?: boolean } }>) {
    dignityIdx[d.planet] = { domicile: !!d.tiers?.domicile, exaltation: !!d.tiers?.exaltation }
  }
  for (const p of planets) {
    if (!p?.name) continue
    if (typeof p.house === 'number' && ANGLES.has(p.house)) emphasized.add(p.name)
    const dg = dignityIdx[p.name]
    if (dg?.domicile || dg?.exaltation) {
      emphasized.add(p.name)
      if (!topDignity) topDignity = { planet: p.name, status: dg.domicile ? 'domicile' : 'exaltation' }
    }
  }
  const aspectsForKey = (A.natalAspects ?? A.aspects ?? []).map((a: any) => ({ from: { name: a.from?.name ?? a.a }, to: { name: a.to?.name ?? a.b }, type: a.type, orb: a.orb }))
  let harmonious = 0, hard = 0
  for (const a of A.natalAspects ?? A.aspects ?? []) {
    const t = String(a.type ?? '').toLowerCase()
    if (t === 'trine' || t === 'sextile') harmonious++
    else if (t === 'square' || t === 'opposition') hard++
  }
  const rels = S.natalRelations ?? []
  const hap = rels.filter((r: any) => String(r.kind ?? r.type).includes('합')).length
  const chung = rels.filter((r: any) => String(r.kind ?? r.type).includes('충')).length
  const dayShinsal = (S.natalShinsal ?? []).filter((h: any) => Array.isArray(h.pillars) && h.pillars.includes('day')).map((h: any) => String(h.kind ?? h.name))
  const stage = S.twelveStages?.day
  const strength = adv.yongsin?.daymasterStrength ?? S.strength

  // 공망 × South Node 교차용 데이터 — 공망 지지(advanced 우선, 없으면 top-level)
  // + North Node sign 으로부터 South Node sign 유도. 둘 다 비면 evalVoid 가 null
  // 반환해 자동 행 생략.
  const gongmangBranches = adv.gongmang?.gongmangBranches ?? S.gongmang ?? []
  const northNode = planets.find((p: any) => p.name === 'North Node' || p.name === 'Node')
  const northSignFull = northNode?.sign ? (SIGN_KO_FULL[northNode.sign] ?? northNode.sign) : undefined
  const southNodeSign = northSignFull ? getSouthNodeOppositeSign(northSignFull as never) : undefined

  const items: Array<[string, CrossVerdict | null]> = [
    ['정체성', evalIdentity(dmEl, sunSign)],
    ['욕망', evalNeeds(S.yongsin?.primary, moonSign)],
    ['사회역할', adv.geokguk?.primary && mcSign ? evalSocialRole(adv.geokguk.primary, mcSign) : null],
    ['길흉', evalFortune(dayShinsal)],
    ['관계', evalRelations(hap, chung, harmonious, hard)],
    ['강점', evalStrength(stage, topDignity)],
    ['기질', evalTemperament(S.fiveElements, planets.map((p: any) => p.sign).filter(Boolean))],
    ['에너지', evalEnergyDirection(details, emphasized)],
    ['드러나는 나', evalPersona(dmEl, ascSign)],
    ['추진력', evalDrive(strength, emphasized.has('Sun') || emphasized.has('Mars'))],
    ['핵심 성향', evalKeyAspect(aspectsForKey, dominantSibsinGroup(details))],
    ['공망/카르마', evalVoid(gongmangBranches, southNodeSign)],
  ]
  const verdicts = items.map(([, v]) => v).filter((v): v is CrossVerdict => !!v)
  const synth = synthesize(verdicts)
  const rows = items
    .filter((it): it is [string, CrossVerdict] => !!it[1])
    .map(([category, v]) => ({ category, tone: v.tone, reason: v.reason[lang] }))
  return { synthesis: synth?.text[lang], rows }
}
