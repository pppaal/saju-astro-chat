'use client'

/**
 * 통합 명식 리포트 — chart.zip 종이질감 껍데기 + 우리 엔진/데이터.
 * 5섹션: 사주명식 · 오행/용신 · 천궁도 · 어스펙트 · 통합테마(natalCross 교차).
 */
import React from 'react'
import s from './IntegratedReport.module.css'
import {
  type ReportData,
  type BiLabel,
  ELEMENTS,
  STEM_INFO,
  BRANCH_INFO,
  ASPECT_META,
  SIGN_META,
  SIGN_ABBR,
  DIGNITY_TIER_LABEL,
  DIGNITY_TIER_FRIENDLY,
  DIGNITY_TIER_TOOLTIP,
  ASPECT_FRIENDLY,
} from './reportTypes'
import {
  getGeokgukRich,
  getSibsinCategory,
  getIljuArchetype,
  getRelationMeaning,
  getPlanetCore,
  getHouseRich,
  getAspectMeaning,
  getAstroDignity,
  getHanjaRich,
  SIBSIN_NAME_TO_CATEGORY,
  type RelationCategory,
  type SibsinState,
  type HouseNumber,
  type DignityStatus,
} from '@/lib/chart-dictionary'
import {
  getSibsinInterpretation,
  getTwelveStageInterpretation,
  getShinsalInterpretation,
  getElementInterpretation,
} from '@/lib/saju/interpretations'
import { SIBSIN_SHORT } from '../atoms/interpretations'

export type Lang = 'ko' | 'en'

export interface CrossRow {
  category: string
  tone: 'resonant' | 'complement' | 'tension' | 'neutral'
  reason: string
  left?: string
  right?: string
}
export interface IntegratedReportProps {
  data: ReportData
  /** natalCross 교차 결과 — 섹션 5(통합 테마)에 렌더. 없으면 섹션 생략. */
  cross?: { synthesis?: string; rows: CrossRow[] }
  /** 표시 언어. EN 일 때 한글 0 렌더. */
  lang?: Lang
}

// ── i18n ───────────────────────────────────────────────────────────────
const UI: Record<string, BiLabel> = {
  eyebrow: { ko: '四柱 × 占星 · Integrated Reading', en: '四柱 × 占星 · Integrated Reading' },
  titlePre: { ko: '통합', en: 'Integrated' },
  titleAccent: { ko: '명식', en: 'Chart' },
  titlePost: { ko: '리포트', en: 'Report' },
  subtitle: {
    ko: '사주 명식과 출생 천궁도를 하나의 평면에서 교차 분석',
    en: 'Four Pillars and natal chart cross-read on a single plane',
  },
  male: { ko: '남', en: 'M' },
  female: { ko: '여', en: 'F' },
  metaBirth: { ko: '출생', en: 'Birth' },
  metaPlace: { ko: '장소', en: 'Place' },
  metaCoord: { ko: '좌표', en: 'Coords' },
  metaTz: { ko: '표준시', en: 'Time zone' },
  metaHouse: { ko: '하우스', en: 'Houses' },
  day: { ko: '주간', en: 'diurnal' },
  night: { ko: '야간', en: 'nocturnal' },
  pHour: { ko: '시', en: 'Hr' },
  pDay: { ko: '일', en: 'Day' },
  pMonth: { ko: '월', en: 'Mo' },
  pYear: { ko: '년', en: 'Yr' },
  dayBranchLabel: { ko: '日干', en: 'Day Master' },
  shinsalCap: { ko: '신살 · 神煞', en: 'Spirits · 神煞' },
  relCap: { ko: '본명 합충형파', en: 'Natal Interactions' },
  iljuCap: { ko: '일주 원형 · 日柱', en: 'Day-Pillar Archetype · 日柱' },
  sec02Title: { ko: '오행과 용신', en: 'Elements & Balance' },
  sec02Han: { ko: '五行·用神', en: '五行·用神' },
  elemDist: { ko: '오행 분포', en: 'Element Spread' },
  strongWeak: { ko: '신강 · 신약', en: 'Strong · Weak' },
  dayMasterLab: { ko: '일간', en: 'Day Master' },
  strong: { ko: '신강', en: 'Strong' },
  weak: { ko: '신약', en: 'Weak' },
  balanced: { ko: '중화', en: 'Balanced' },
  rootedYes: { ko: '뿌리 ✓', en: 'Rooted ✓' },
  rootedNo: { ko: '뿌리 ✗', en: 'Rooted ✗' },
  rootedYesTip: {
    ko: '통근 — 일간의 오행이 지지 지장간에 박혀있음. 일간 강도 보강.',
    en: 'Rooted — the Day Master element is lodged in the hidden stems, reinforcing its strength.',
  },
  rootedNoTip: {
    ko: '무근 — 일간 오행이 지지에 박혀있지 않음. 강도 약화 요인.',
    en: 'Unrooted — the Day Master element is not lodged in the branches, weakening its strength.',
  },
  gongmangLab: { ko: '공망', en: 'Void' },
  gongmangTip: {
    ko: '공망 — 일주 60갑자 그룹에서 비어있는 지지 2개. 해당 지지의 작용이 약함.',
    en: 'Void branches — the two empty branches of the day-pillar sexagenary group; their influence is muted.',
  },
  johuLab: { ko: '조후', en: 'Climate' },
  johuTip: {
    ko: '조후용신 — 계절 균형 관점의 보조 용신. 긴급도',
    en: 'Climatic useful god — a secondary balancer from the seasonal-climate view. Urgency',
  },
  yongLab: { ko: '용신', en: 'Useful' },
  giLab: { ko: '기신', en: 'Adverse' },
  yongTitle: { ko: '용신 · 희신 · 기신', en: 'Useful · Helpful · Adverse' },
  geokgukCap: { ko: '격국 풀이 · 格局', en: 'Structure · 格局' },
  geokPersonality: { ko: '성향', en: 'Personality' },
  geokStrength: { ko: '강점', en: 'Strengths' },
  geokWeakness: { ko: '약점', en: 'Watch-outs' },
  geokCareer: { ko: '직업', en: 'Careers' },
  geokLove: { ko: '연애', en: 'Love' },
  geokAdvice: { ko: '조언', en: 'Advice' },
  sibsinCap: { ko: '주도 십성 · 十星', en: 'Dominant Ten God · 十星' },
  sec03Title: { ko: '출생 천궁도', en: 'Natal Chart' },
  sec03Han: { ko: '本命 天宮圖', en: '本命 天宮圖' },
  planetsCap: { ko: '행성 위치 · Planets', en: 'Planet Positions · Planets' },
  sectLab: { ko: 'Sect', en: 'Sect' },
  houseLab: { ko: 'House', en: 'House' },
  sectDay: { ko: '주간 (晝)', en: 'Diurnal (晝)' },
  sectNight: { ko: '야간 (夜)', en: 'Nocturnal (夜)' },
  signSuffix: { ko: '자리', en: '' },
  sec04Title: { ko: '어스펙트', en: 'Aspects' },
  sec04Han: { ko: '行星 角度', en: '行星 角度' },
  legSoft: { ko: '잘 흘러요·도와줘요', en: 'Flows · helps' },
  legHard: { ko: '부딪혀요·맞서요', en: 'Clashes · opposes' },
  legNeutral: { ko: '같이 있어요', en: 'Together' },
  dignityCap: { ko: '위계 · Dignities', en: 'Dignities' },
  noDignity: {
    ko: '뚜렷한 위계 없음 — 행성이 모두 중립(peregrine) 자리예요.',
    en: 'No notable dignity — every planet sits in a neutral (peregrine) position.',
  },
  sec05Title: { ko: '통합 교차', en: 'Cross-System' },
  sec05Han: { ko: '交叉 統合', en: '交叉 統合' },
  synthLabel: { ko: '🧬 종합 정체성', en: '🧬 Synthesis' },
  sajuSide: { ko: '사주', en: 'Saju' },
  astroSide: { ko: '점성', en: 'Astro' },
  footBrain: {
    ko: '껍데기 chart.zip · 두뇌 natalCross',
    en: 'shell chart.zip · engine natalCross',
  },
  orb: { ko: 'orb', en: 'orb' },
}

// 관계 kind → 이중언어 라벨. EN 한글 누수 차단.
const RELATION_TYPE_LABEL: Record<string, BiLabel> = {
  천간합: { ko: '천간합', en: 'Stem Combine' },
  천간충: { ko: '천간충', en: 'Stem Clash' },
  지지육합: { ko: '지지육합', en: 'Six Harmony' },
  지지삼합: { ko: '지지삼합', en: 'Triple Harmony' },
  지지방합: { ko: '지지방합', en: 'Directional Harmony' },
  지지충: { ko: '지지충', en: 'Branch Clash' },
  지지형: { ko: '지지형', en: 'Punishment' },
  지지파: { ko: '지지파', en: 'Destruction' },
  지지해: { ko: '지지해', en: 'Harm' },
  원진: { ko: '원진', en: 'Resentment' },
  공망: { ko: '공망', en: 'Void' },
}
const relationTypeLabel = (kind: string, lang: Lang): string =>
  RELATION_TYPE_LABEL[kind]?.[lang] ?? kind

// 교차 tone → 친화 라벨 (이중언어).
const TONE_LABEL: Record<CrossRow['tone'], BiLabel> = {
  resonant: { ko: '잘 맞아요', en: 'In sync' },
  complement: { ko: '서로 채워줘요', en: 'Complementary' },
  tension: { ko: '부딪혀요', en: 'In tension' },
  neutral: { ko: '따로따로', en: 'Separate' },
}

// ── helpers ────────────────────────────────────────────────────────────
const elClass: Record<string, string> = {
  wood: s.elWood,
  fire: s.elFire,
  earth: s.elEarth,
  metal: s.elMetal,
  water: s.elWater,
}
const stemEl = (g: string) => STEM_INFO[g]?.el ?? ''
const branchEl = (b: string) => BRANCH_INFO[b]?.el ?? ''
const abbr = (sign: string) => SIGN_ABBR[sign] ?? sign

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)]
}

// 교차 tone → 테마카드 색.
const TONE_COLOR: Record<CrossRow['tone'], string> = {
  resonant: 'var(--el-wood)',
  complement: 'var(--gold)',
  tension: 'var(--el-fire)',
  neutral: 'var(--ink-3)',
}

// EN 표시용 라벨 헬퍼 — 사주 용어는 ko 한글, en 은 사전 룩업으로 영문화.
// 십성(정인…) → name_en, 12운성(쇠…) → name_en, 오행 → ELEMENTS ko/영문 키.
const sibsinLabel = (name: string, lang: Lang): string => {
  if (lang === 'ko') return name
  if (!name || name === '日干') return name === '日干' ? 'Day Master' : name
  return getSibsinInterpretation(name as never)?.name_en ?? name
}
// 십신 → 평이 한줄 글로스 (SIBSIN_SHORT 재사용). 명식 '쉬운 풀이' 행에 사용.
const sibsinShort = (name: string, lang: Lang): string => {
  if (!name || name === '日干') return ''
  return lang === 'ko' ? (SIBSIN_SHORT[name] ?? name) : sibsinLabel(name, 'en')
}
const stageLabel = (stage: string, lang: Lang): string => {
  if (lang === 'ko' || !stage) return stage
  return getTwelveStageInterpretation(stage as never)?.name_en ?? stage
}

// ── 차트 인자 hover 해석 (양언어) — 글자/도수만 뜨던 차트 요소에 의미 툴팁 ──
const NODE_CORE_KEY: Record<string, string> = {
  'True Node': 'NorthNode',
  'Mean Node': 'NorthNode',
  'North Node': 'NorthNode',
}
function planetHover(name: string, lang: Lang): string {
  const c = getPlanetCore(NODE_CORE_KEY[name] ?? name, lang)
  if (!c) return ''
  return c.keywords?.length ? `${c.principle} · ${c.keywords.slice(0, 4).join(', ')}` : c.principle
}
function houseHover(n: number, lang: Lang): string {
  const h = getHouseRich(n as HouseNumber, lang)
  return h ? `${h.name} · ${h.domain}` : ''
}
const ASPECT_DICT_KEY: Record<string, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  quincunx: 'Quincunx',
  semisextile: 'Semi-sextile',
  'semi-sextile': 'Semi-sextile',
  semisquare: 'Semi-square',
  sesquiquadrate: 'Sesquiquadrate',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}
function aspectHover(type: string, lang: Lang): string {
  const a = getAspectMeaning(ASPECT_DICT_KEY[String(type).toLowerCase()] ?? '', lang)
  return a ? `${a.label} — ${a.meaning}` : ''
}
function hanjaHover(ch: string, lang: Lang): string {
  const h = getHanjaRich(ch, lang) as { name?: string; element?: string; nature?: string } | null
  if (!h) return ''
  return h.nature ? `${h.name} · ${h.element} · ${h.nature}` : (h.name ?? '')
}
const DIGNITY_STATUS_KEY: Record<string, DignityStatus> = {
  domicile: 'Domicile',
  exaltation: 'Exaltation',
  detriment: 'Detriment',
  fall: 'Fall',
  peregrine: 'Peregrine',
}
function dignityHover(planet: string, tier: string, lang: Lang): string {
  const st = DIGNITY_STATUS_KEY[String(tier).toLowerCase()]
  if (!st) return ''
  return getAstroDignity(NODE_CORE_KEY[planet] ?? planet, st, lang)?.text ?? ''
}
function stageHover(stage: string, lang: Lang): string {
  const SYN: Record<string, string> = { 임관: '건록', 왕지: '제왕', 양생: '장생' }
  const it = getTwelveStageInterpretation((SYN[stage] ?? stage) as never)
  if (!it) return ''
  return lang === 'en' ? (it.meaning_en ?? '') : (it.meaning ?? '')
}
const elementLabel = (key: string, lang: Lang): string => {
  const e = ELEMENTS[key]
  if (!e) return key
  return lang === 'en' ? key.charAt(0).toUpperCase() + key.slice(1) : e.ko
}
const signLabel = (abbrKey: string, lang: Lang): string => {
  const m = SIGN_META[abbrKey]
  if (!m) return abbrKey
  return lang === 'en' ? abbrKey : m.ko
}

// ── 펜타곤(오행) ────────────────────────────────────────────────────────
function Pentagon({ fe }: { fe: ReportData['saju']['fiveElements'] }) {
  const order: Array<keyof typeof fe> = ['wood', 'fire', 'earth', 'metal', 'water']
  const cx = 140,
    cy = 132,
    R = 86
  const max = Math.max(2, ...order.map((k) => fe[k]))
  const angleAt = (i: number) => 90 + i * 72 // 위 꼭짓점부터 시계방향
  const grid = [0.33, 0.66, 1].map((f) =>
    order.map((_, i) => polar(cx, cy, R * f, angleAt(i)).join(',')).join(' ')
  )
  const dataPts = order
    .map((k, i) => polar(cx, cy, R * (fe[k] / max), angleAt(i)).join(','))
    .join(' ')
  return (
    <svg viewBox="0 0 280 264" className={s.pentagon}>
      {grid.map((p, i) => (
        <polygon key={i} points={p} className={s.pentGrid} />
      ))}
      {order.map((_, i) => {
        const [x, y] = polar(cx, cy, R, angleAt(i))
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={s.pentSpoke} />
      })}
      <polygon points={dataPts} className={s.pentData} />
      {order.map((k, i) => {
        const [lx, ly] = polar(cx, cy, R + 22, angleAt(i))
        return (
          <text key={k} x={lx} y={ly} className={`${s.pentLabel} ${elClass[k]}`}>
            {ELEMENTS[k].han}
            <tspan className={s.pentCnt} dx="3">
              {fe[k]}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}

// ── 천궁도 휠 ───────────────────────────────────────────────────────────
function Wheel({ astro, lang }: { astro: ReportData['astro']; lang: Lang }) {
  const SZ = 360,
    cx = SZ / 2,
    cy = SZ / 2
  const rOuter = 168,
    rSign = 150,
    rInner = 120,
    rPlanet = 100
  const ascLon = astro.ascendant.lon
  // 황경 → 화면각: ASC 를 왼쪽(180°)에 고정, 반시계.
  const screen = (lon: number) => 180 + (lon - ascLon)
  const SIGN_ORDER = [
    'Ari',
    'Tau',
    'Gem',
    'Can',
    'Leo',
    'Vir',
    'Lib',
    'Sco',
    'Sag',
    'Cap',
    'Aqu',
    'Pis',
  ]
  const planetsSorted = [...astro.planets].sort((a, b) => a.lon - b.lon)
  return (
    <svg viewBox={`0 0 ${SZ} ${SZ}`} className={s.pentagon} style={{ maxWidth: 360 }}>
      <circle cx={cx} cy={cy} r={rOuter} className={s.pentGrid} fill="none" />
      <circle cx={cx} cy={cy} r={rInner} className={s.pentGrid} fill="none" />
      <circle cx={cx} cy={cy} r={rPlanet} className={s.pentSpoke} fill="none" opacity={0.5} />
      {/* 12 사인 칸 + glyph */}
      {SIGN_ORDER.map((sg, i) => {
        const start = i * 30
        const [x1, y1] = polar(cx, cy, rInner, screen(start))
        const [x2, y2] = polar(cx, cy, rOuter, screen(start))
        const [gx, gy] = polar(cx, cy, rSign, screen(start + 15))
        const meta = SIGN_META[sg]
        return (
          <g key={sg}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={s.pentGrid} />
            <text
              x={gx}
              y={gy}
              textAnchor="middle"
              dominantBaseline="central"
              className={elClass[meta.el]}
              style={{ fontSize: 17, fontFamily: 'var(--sym)' }}
            >
              {meta.glyph}
            </text>
          </g>
        )
      })}
      {/* ASC / MC 축 */}
      {[
        ['ASC', ascLon],
        ['MC', astro.mc.lon],
      ].map(([lab, lon]) => {
        const [x1, y1] = polar(cx, cy, rInner, screen(lon as number))
        const [x2, y2] = polar(cx, cy, rOuter + 6, screen(lon as number))
        return (
          <g key={lab as string}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-2)" strokeWidth={1.3} />
            <text
              x={x2}
              y={y2}
              textAnchor="middle"
              className={s.mono}
              style={{ fontSize: 10, fill: 'var(--ink-2)', fontWeight: 600 }}
            >
              {lab as string}
            </text>
          </g>
        )
      })}
      {/* 어스펙트 선 */}
      {astro.aspects.map((a, i) => {
        const pa = astro.planets.find((p) => p.name === a.a)
        const pb = astro.planets.find((p) => p.name === a.b)
        if (!pa || !pb) return null
        const [x1, y1] = polar(cx, cy, rPlanet, screen(pa.lon))
        const [x2, y2] = polar(cx, cy, rPlanet, screen(pb.lon))
        const cls = ASPECT_META[a.type]?.cls ?? 'neutral'
        const stroke =
          cls === 'hard'
            ? 'var(--asp-hard)'
            : cls === 'soft'
              ? 'var(--asp-soft)'
              : 'var(--asp-neutral)'
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth={1}
            opacity={0.55}
          >
            <title>{aspectHover(a.type, lang)}</title>
          </line>
        )
      })}
      {/* 행성 */}
      {planetsSorted.map((p) => {
        const [px, py] = polar(cx, cy, rPlanet, screen(p.lon))
        return (
          <g key={p.name}>
            <title>{planetHover(p.name, lang)}</title>
            <circle
              cx={px}
              cy={py}
              r={11}
              fill="var(--card)"
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={px}
              y={py}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontFamily: 'var(--sym)', fontSize: 14, fill: 'var(--ink)' }}
            >
              {p.glyph}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── 어스펙트 그리드 ─────────────────────────────────────────────────────
function AspectGrid({ astro, lang }: { astro: ReportData['astro']; lang: Lang }) {
  const order = [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
  ]
  const present = order.filter((n) => astro.planets.some((p) => p.name === n))
  const find = (a: string, b: string) =>
    astro.aspects.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))
  const glyph = (n: string) => astro.planets.find((p) => p.name === n)?.glyph ?? ''
  return (
    <table className={s.aspgrid}>
      <tbody>
        {present.map((row, ri) => (
          <tr key={row}>
            {present.map((col, ci) => {
              if (ci > ri) return <td key={col} className={s.agEmpty} />
              if (ci === ri)
                return (
                  <td key={col} className={s.agDiag}>
                    {glyph(row)}
                  </td>
                )
              const a = find(row, col)
              if (!a) return <td key={col} />
              const meta = ASPECT_META[a.type]
              const cls =
                meta?.cls === 'hard' ? s.agHard : meta?.cls === 'soft' ? s.agSoft : s.agNeutral
              const nameRow =
                lang === 'en' ? row : (astro.planets.find((p) => p.name === row)?.ko ?? row)
              const nameCol =
                lang === 'en' ? col : (astro.planets.find((p) => p.name === col)?.ko ?? col)
              const friendly = ASPECT_FRIENDLY[a.type]
              const tooltip = friendly
                ? `${nameRow} ↔ ${nameCol}: ${friendly.label[lang]}\n${friendly.tooltip[lang]} · ${UI.orb[lang]} ${a.orb.toFixed(1)}°`
                : `${nameRow} ↔ ${nameCol}: ${lang === 'en' ? a.type : (meta?.ko ?? a.type)} · ${UI.orb[lang]} ${a.orb.toFixed(1)}°`
              return (
                <td key={col} className={`${s.agCell} ${cls}`} title={tooltip}>
                  <span className={s.agGly}>{meta?.glyph}</span>
                  <span className={s.agOrb}>{a.orb.toFixed(1)}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── 메인 ────────────────────────────────────────────────────────────────
export function IntegratedReport({ data, cross, lang = 'ko' }: IntegratedReportProps) {
  const { input, saju: S, astro: A } = data
  const t = (k: keyof typeof UI): string => UI[k][lang]
  const pillarsArr: Array<
    [BiLabel, ReportData['saju']['pillars'][keyof ReportData['saju']['pillars']]]
  > = [
    [UI.pHour, S.pillars.hour],
    [UI.pDay, S.pillars.day],
    [UI.pMonth, S.pillars.month],
    [UI.pYear, S.pillars.year],
  ]
  const feMax = Math.max(1, ...Object.values(S.fiveElements))
  const strengthPct = S.strength === 'strong' ? 76 : S.strength === 'weak' ? 28 : 52
  const strengthState: SibsinState =
    S.strength === 'strong' ? 'dominant' : S.strength === 'weak' ? 'missing' : 'balanced'

  // §02 격국 풀이 — geokguk-rich 사전. '미정' 이거나 매칭 없으면 자동 생략.
  const geok = S.geokguk && S.geokguk !== '미정' ? getGeokgukRich(S.geokguk, lang) : null
  // §02 주도 십성 — 일지 십성 카테고리(정/편 통합) → 우세 상태 의미.
  const domSibsinName = S.pillars.day.sibsinBranch || S.pillars.month.sibsinBranch || ''
  const domCategory = SIBSIN_NAME_TO_CATEGORY[domSibsinName]
  const sibsinBlock = domCategory ? getSibsinCategory(domCategory, strengthState, lang) : null
  // §01 일주 원형 — 일간+일지 간지 → ilju-60 사전.
  const dayGanji = `${S.pillars.day.stem}${S.pillars.day.branch}`
  const ilju = getIljuArchetype(dayGanji, lang)

  return (
    <div className={s.report}>
      <div className={s.wrap}>
        {/* 헤더 */}
        <header className={s.reportHead}>
          <div className={s.rhLeft}>
            <div className={s.eyebrow}>{t('eyebrow')}</div>
            <h1>
              {t('titlePre')} <span className={s.accent}>{t('titleAccent')}</span> {t('titlePost')}
            </h1>
            <div className={s.sub}>{t('subtitle')}</div>
          </div>
          <div className={s.rhRight}>
            <div>
              {input.name} · <b>{input.gender === 'male' ? t('male') : t('female')}</b>
            </div>
            <div>
              {input.calendar} <b>{input.date}</b>
            </div>
            <div>{input.place}</div>
          </div>
        </header>

        {/* 메타 */}
        <div className={s.metaGrid}>
          {[
            [t('metaBirth'), `${input.calendar} ${input.date.replace(/-/g, '.')} · ${input.time}`],
            [t('metaPlace'), input.place],
            [t('metaCoord'), `${input.lat}°N · ${input.lng}°E`],
            [t('metaTz'), input.timeZone],
            [t('metaHouse'), `${A.houseSystem} · ${A.sect === 'day' ? t('day') : t('night')}`],
            ['UTC', input.isoUTC],
          ].map(([k, v]) => (
            <div className={s.metaCell} key={k}>
              <span className={s.metaK}>{k}</span>
              <span className={s.metaV}>{v}</span>
            </div>
          ))}
        </div>

        {/* 01 사주 명식 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>01</span>
            <span className={s.secTitle}>
              {lang === 'en' ? 'Four Pillars' : '사주 명식'}
              <span className={s.han}>四柱命式</span>
            </span>
            <span className={s.secEn}>Four Pillars</span>
          </div>
          {/* 일간(나) 한 줄 풀이 — hover 로만 뜨던 의미를 모바일에서도 보이게 노출. */}
          <p className={s.dmIntro}>
            {lang === 'en' ? 'Day Master' : '일간(나)'}{' '}
            <b className={elClass[stemEl(S.dayMaster)]}>{S.dayMaster}</b> —{' '}
            {hanjaHover(S.dayMaster, lang)}
          </p>
          <div className={s.pillars}>
            {pillarsArr.map(([head, p]) => (
              <div className={`${s.pillar} ${p.isDay ? s.isDay : ''}`} key={head.ko}>
                <div className={s.pillarHead}>{head[lang]}</div>
                <div className={`${s.sib} ${s.sibTop}`}>
                  {p.isDay ? t('dayBranchLabel') : sibsinLabel(p.sibsinStem, lang)}
                </div>
                <div className={s.gz}>
                  <div
                    className={`${s.gzHan} ${elClass[stemEl(p.stem)]}`}
                    title={hanjaHover(p.stem, lang)}
                  >
                    {p.stem}
                  </div>
                </div>
                <div className={`${s.gz} ${s.branch}`}>
                  <div
                    className={`${s.gzHan} ${elClass[branchEl(p.branch)]}`}
                    title={hanjaHover(p.branch, lang)}
                  >
                    {p.branch}
                  </div>
                </div>
                <div className={s.sib}>{sibsinLabel(p.sibsinBranch, lang)}</div>
                <div className={s.jjg}>
                  {p.jijanggan.map((j, i) => (
                    <div className={s.jjgI} key={i}>
                      <b className={elClass[stemEl(j.g)]} title={hanjaHover(j.g, lang)}>
                        {j.g}
                      </b>
                      <i>{j.d}</i>
                    </div>
                  ))}
                </div>
                <div className={s.stage} title={stageHover(p.twelveStage, lang)}>
                  {stageLabel(p.twelveStage, lang)}
                </div>
              </div>
            ))}
          </div>
          {/* 쉬운 풀이 (Level 1) — 한자/십신을 평이한 한 줄로. 위 그리드는 전문(Level 2). */}
          <div className={s.plainPillars}>
            {pillarsArr.map(([head, p]) => {
              const stemG = p.isDay
                ? lang === 'en'
                  ? 'You (Day Master)'
                  : '나 자신'
                : sibsinShort(p.sibsinStem, lang)
              const branchG = sibsinShort(p.sibsinBranch, lang)
              return (
                <div className={s.plainRow} key={head.ko}>
                  <span className={s.plainHead}>{head[lang]}</span>
                  <b className={s.plainGz}>
                    <span className={elClass[stemEl(p.stem)]}>{p.stem}</span>
                    <span className={elClass[branchEl(p.branch)]}>{p.branch}</span>
                  </b>
                  <span className={s.plainMeaning}>
                    {[stemG, branchG].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )
            })}
          </div>
          <div className={s.row2}>
            <div>
              <div className={s.subcap}>{t('shinsalCap')}</div>
              <div className={s.chips}>
                {S.natalShinsal.map((sh, i) => {
                  const interp = getShinsalInterpretation(sh.ko)
                  const label = lang === 'en' ? (interp?.name_en ?? sh.ko) : sh.ko
                  const tip =
                    lang === 'en'
                      ? interp
                        ? `${interp.meaning_en} ${interp.effect_en}`
                        : undefined
                      : interp
                        ? `${interp.meaning} ${interp.effect}`
                        : undefined
                  return (
                    <span
                      className={`${s.chip} ${sh.polarity > 0 ? s.pos : sh.polarity < 0 ? s.neg : s.neu}`}
                      key={i}
                      title={tip}
                    >
                      <b>{label}</b>
                      <i>
                        {sh.pillar}
                        {sh.sub ? `·${sh.sub}` : ''}
                      </i>
                    </span>
                  )
                })}
              </div>
            </div>
            <div>
              <div className={s.subcap}>{t('relCap')}</div>
              <div className={s.relations}>
                {S.natalRelations.map((r, i) => {
                  // 합충형파 의미 — relations-pairs 사전(category + 한자 pair). 없으면 detail 폴백.
                  const rel =
                    r.category && r.pair
                      ? getRelationMeaning(r.category as RelationCategory, r.pair, lang)
                      : null
                  const tip = rel?.meaning ?? undefined
                  // EN 일 때 detail(한글 섞임)을 한자 pair 로 대체해 한글 누수 차단.
                  const body = lang === 'en' ? r.pair || r.detail : r.detail
                  return (
                    <div
                      className={`${s.rel} ${r.tone === 'pos' ? s.relPos : r.tone === 'neg' ? s.relNeg : ''}`}
                      key={i}
                      title={tip}
                    >
                      <b>{relationTypeLabel(r.type, lang)}</b>
                      {body}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {/* 일주 원형 카드 — ilju-60 사전. 매칭 없으면 자동 생략. */}
          {ilju && (
            <>
              <div className={s.subcap} style={{ marginTop: 24 }}>
                {t('iljuCap')}
              </div>
              <div className={`${s.card} ${s.cardPad}`}>
                <div className={s.gaugeHead}>
                  <span className={s.mono}>{dayGanji}</span>
                  <b>{ilju.character}</b>
                </div>
                <div className={s.themeReason} style={{ marginTop: 6 }}>
                  <b>{t('geokStrength')}</b> {ilju.strength}
                </div>
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokWeakness')}</b> {ilju.weakness}
                </div>
              </div>
            </>
          )}
        </section>

        {/* 02 오행과 용신 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>02</span>
            <span className={s.secTitle}>
              {t('sec02Title')}
              <span className={s.han}>{UI.sec02Han.ko}</span>
            </span>
            <span className={s.secEn}>Elements & Balance</span>
          </div>
          <div className={s.gridElem}>
            <div className={`${s.card} ${s.cardPad}`}>
              <div className={s.subcap}>{t('elemDist')}</div>
              <Pentagon fe={S.fiveElements} />
            </div>
            <div className={`${s.card} ${s.cardPad} ${s.elemSide}`}>
              <div>
                <div className={s.subcap}>{t('strongWeak')}</div>
                <div className={s.gaugeHead}>
                  <span>
                    {t('dayMasterLab')} {S.dayMaster}
                    {lang === 'ko' ? ` · ${S.geokguk}` : geok ? ` · ${geok.tagline}` : ''}
                  </span>
                  <b>
                    {S.strength === 'strong'
                      ? t('strong')
                      : S.strength === 'weak'
                        ? t('weak')
                        : t('balanced')}
                  </b>
                </div>
                <div className={s.gauge}>
                  <div className={s.gaugeFill} style={{ width: `${strengthPct}%` }} />
                </div>
                <div className={s.gaugeScale}>
                  <i>{t('weak')}</i>
                  <i>{t('balanced')}</i>
                  <i>{t('strong')}</i>
                </div>
                {/* 회색 3 셀 (RAW_DISTRIBUTION v5.4): 통근 / 공망 / 조후 — 정통
                    사주 보조 정보. 한 줄 노출 + title 툴팁. 없으면 자동 생략. */}
                {(S.rooted !== undefined || (S.gongmang && S.gongmang.length) || S.johuYongsin) && (
                  <div className={s.gaugeScale} style={{ marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
                    {S.rooted !== undefined && (
                      <i title={S.rooted ? t('rootedYesTip') : t('rootedNoTip')}>
                        {S.rooted ? t('rootedYes') : t('rootedNo')}
                      </i>
                    )}
                    {S.gongmang && S.gongmang.length > 0 && (
                      <i title={t('gongmangTip')}>
                        {t('gongmangLab')} {S.gongmang.join(' · ')}
                      </i>
                    )}
                    {S.johuYongsin && (
                      <i
                        className={elClass[S.johuYongsin.primary]}
                        title={`${t('johuTip')} ${S.johuYongsin.rating}/5.`}
                      >
                        {t('johuLab')}{' '}
                        {ELEMENTS[S.johuYongsin.primary]?.han ?? S.johuYongsin.primary}
                        {S.johuYongsin.rating >= 4 && ' ⚡'}
                      </i>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className={s.subcap}>{t('yongTitle')}</div>
                <div className={s.yongRow}>
                  <span className={s.yongLab}>{t('yongLab')}</span>
                  <span className={`${s.yong} ${s.yongPri} ${elClass[S.yongsin.primary]}`}>
                    {ELEMENTS[S.yongsin.primary]?.han}
                    <i>{elementLabel(S.yongsin.primary, lang)}</i>
                  </span>
                  {S.yongsin.secondary && (
                    <span className={`${s.yong} ${s.yongSec} ${elClass[S.yongsin.secondary]}`}>
                      {ELEMENTS[S.yongsin.secondary]?.han}
                      <i>{elementLabel(S.yongsin.secondary, lang)}</i>
                    </span>
                  )}
                </div>
                <div className={s.yongRow}>
                  <span className={s.yongLab}>{t('giLab')}</span>
                  {S.yongsin.avoid.map((a) => (
                    <span className={`${s.yong} ${s.yongAvo} ${elClass[a]}`} key={a}>
                      {ELEMENTS[a]?.han}
                      <i>{elementLabel(a, lang)}</i>
                    </span>
                  ))}
                </div>
                <div className={s.gaugeScale} style={{ marginTop: 8 }}>
                  {(['wood', 'fire', 'earth', 'metal', 'water'] as const).map((k) => (
                    <i key={k} className={elClass[k]}>
                      {elementLabel(k, lang)} {S.fiveElements[k]}
                    </i>
                  ))}
                  <i style={{ color: 'var(--ink-4)' }}>/ max {feMax}</i>
                </div>
                {/* 용신 '왜 필요한가' — fiveElements 사전에서 성질+부족시 증상 연결. */}
                {(() => {
                  const yk = ELEMENTS[S.yongsin.primary]?.ko
                  const yi = yk
                    ? (getElementInterpretation(yk as never) as {
                        nature?: string
                        nature_en?: string
                        deficiency?: string
                        deficiency_en?: string
                      } | null)
                    : null
                  if (!yi) return null
                  const nature = lang === 'en' ? yi.nature_en : yi.nature
                  const lack = lang === 'en' ? yi.deficiency_en : yi.deficiency
                  return (
                    <div className={s.yongWhy}>
                      <b className={elClass[S.yongsin.primary]}>
                        {ELEMENTS[S.yongsin.primary]?.han} {elementLabel(S.yongsin.primary, lang)}
                      </b>{' '}
                      — {nature}
                      {lack ? ` · ${lang === 'en' ? 'lacking: ' : '부족하면 '}${lack}` : ''}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          {/* 격국 풀이 — geokguk-rich 사전. '미정'/매칭 없으면 자동 생략. */}
          {geok && (
            <div className={`${s.card} ${s.cardPad}`} style={{ marginTop: 16 }}>
              <div className={s.subcap}>{t('geokgukCap')}</div>
              <div className={s.gaugeHead}>
                {lang === 'ko' && <span className={s.mono}>{S.geokguk}</span>}
                <b>{geok.tagline}</b>
              </div>
              <div className={s.themeReason} style={{ marginTop: 6 }}>
                <b>{t('geokPersonality')}</b> {geok.personality}
              </div>
              {geok.strength.length > 0 && (
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokStrength')}</b> {geok.strength.join(', ')}
                </div>
              )}
              {geok.weakness.length > 0 && (
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokWeakness')}</b> {geok.weakness.join(', ')}
                </div>
              )}
              {geok.career && geok.career.length > 0 && (
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokCareer')}</b> {geok.career.join(', ')}
                </div>
              )}
              {geok.love && (
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokLove')}</b> {geok.love}
                </div>
              )}
              <div className={s.themeReason} style={{ marginTop: 4 }}>
                <b>{t('geokAdvice')}</b> {geok.advice}
              </div>
            </div>
          )}
          {/* 주도 십성 — sibsin-category 사전. 매칭 없으면 자동 생략. */}
          {sibsinBlock && (
            <div className={`${s.card} ${s.cardPad}`} style={{ marginTop: 16 }}>
              <div className={s.subcap}>{t('sibsinCap')}</div>
              <div className={s.gaugeHead}>
                <span>{sibsinLabel(domSibsinName, lang)}</span>
                <b>{sibsinBlock.title}</b>
              </div>
              <div className={s.themeReason} style={{ marginTop: 6 }}>
                {sibsinBlock.meaning}
              </div>
              {sibsinBlock.advice && (
                <div className={s.themeReason} style={{ marginTop: 4 }}>
                  <b>{t('geokAdvice')}</b> {sibsinBlock.advice}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 03 천궁도 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>03</span>
            <span className={s.secTitle}>
              {lang === 'en' ? 'Natal Chart' : '출생 천궁도'}
              <span className={s.han}>本命 天宮圖</span>
            </span>
            <span className={s.secEn}>Natal Chart</span>
          </div>
          <div className={s.gridChart}>
            <div className={`${s.card} ${s.wheelCard}`}>
              <Wheel astro={A} lang={lang} />
            </div>
            <div>
              <div className={`${s.card} ${s.cardPad}`}>
                <div className={s.subcap}>{t('planetsCap')}</div>
                <table className={s.planetTable}>
                  <tbody>
                    {[
                      ...A.planets,
                      ...A.extraPoints.map((e) => ({ ...e, retro: false, speed: 0 })),
                    ].map((p) => (
                      <tr
                        key={p.name}
                        title={[planetHover(p.name, lang), p.house ? houseHover(p.house, lang) : '']
                          .filter(Boolean)
                          .join(' · ')}
                      >
                        <td className={s.plG}>{p.glyph}</td>
                        <td className={s.plN}>
                          {lang === 'en' ? p.name : p.ko}
                          {lang === 'en' ? null : <i>{p.name}</i>}
                        </td>
                        <td className={`${s.plS} ${elClass[SIGN_META[abbr(p.sign)]?.el]}`}>
                          {SIGN_META[abbr(p.sign)]?.glyph} {signLabel(abbr(p.sign), lang)}
                        </td>
                        <td className={s.plD}>{p.deg}</td>
                        <td className={s.plH}>{p.house}H</td>
                        <td className={s.plR}>{'retro' in p && p.retro ? '℞' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={s.axes}>
                {[
                  ['ASC', A.ascendant],
                  ['MC', A.mc],
                ].map(([lab, ax]) => {
                  const a = ax as { sign: string; deg: string }
                  return (
                    <div className={s.axisItem} key={lab as string}>
                      <span>{lab as string}</span>
                      <b className={elClass[SIGN_META[abbr(a.sign)]?.el]}>
                        {SIGN_META[abbr(a.sign)]?.glyph} {a.deg}
                      </b>
                    </div>
                  )
                })}
                <div className={s.axisItem}>
                  <span>{t('sectLab')}</span>
                  <b>{A.sect === 'day' ? t('sectDay') : t('sectNight')}</b>
                </div>
                <div className={s.axisItem}>
                  <span>{t('houseLab')}</span>
                  <b>{A.houseSystem}</b>
                </div>
              </div>
              <div className={s.houses}>
                {A.houses.slice(0, 6).map((h) => (
                  <div className={s.du} key={h.i} title={houseHover(h.i, lang)}>
                    <div className={s.duAge}>{h.i}H</div>
                    <div
                      className={`${s.gzHan ?? ''}`}
                      style={{ fontSize: 14, fontFamily: 'var(--sym)' }}
                    >
                      <span className={elClass[SIGN_META[h.sign]?.el]}>
                        {SIGN_META[h.sign]?.glyph}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 핵심 3행성 — planet-core DB 의 원리·의미를 hover→본문으로 (태양·달·상승). */}
          <div className={s.bigThree}>
            {(() => {
              const find = (n: string) => A.planets.find((p) => p.name === n)
              const sun = find('Sun')
              const moon = find('Moon')
              const asc = A.ascendant
              const cards = [
                sun && {
                  glyph: '☉',
                  label: lang === 'en' ? 'Sun' : '태양',
                  core: getPlanetCore('Sun', lang),
                  sign: sun.sign,
                  deg: sun.deg,
                  house: sun.house,
                },
                moon && {
                  glyph: '☾',
                  label: lang === 'en' ? 'Moon' : '달',
                  core: getPlanetCore('Moon', lang),
                  sign: moon.sign,
                  deg: moon.deg,
                  house: moon.house,
                },
                asc && {
                  glyph: 'Asc',
                  label: lang === 'en' ? 'Rising' : '상승',
                  core: getPlanetCore('Ascendant', lang),
                  sign: asc.sign,
                  deg: asc.deg,
                  house: 0,
                },
              ].filter(Boolean) as Array<{
                glyph: string
                label: string
                core: ReturnType<typeof getPlanetCore>
                sign: string
                deg: string
                house: number
              }>
              return cards.map((cd) => {
                if (!cd.core) return null
                const sk = SIGN_META[abbr(cd.sign)]
                return (
                  <div className={s.bigCard} key={cd.label}>
                    <div className={s.bigHead}>
                      <b className={elClass[sk?.el ?? '']}>
                        {cd.glyph} {cd.label}
                      </b>
                      <i>
                        {signLabel(abbr(cd.sign), lang)} {cd.deg}
                        {cd.house ? ` · ${cd.house}H` : ''}
                      </i>
                    </div>
                    <div className={s.bigPrin}>{cd.core.principle}</div>
                    <div className={s.bigMean}>{cd.core.meaning}</div>
                  </div>
                )
              })
            })()}
          </div>
        </section>

        {/* 04 어스펙트 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>04</span>
            <span className={s.secTitle}>
              {lang === 'en' ? 'Aspects' : '어스펙트'}
              <span className={s.han}>行星 角度</span>
            </span>
            <span className={s.secEn}>Aspects</span>
          </div>
          <div className={s.gridAsp}>
            <div>
              <div className={s.aspLegend}>
                <span
                  className={`${s.leg} ${s.legSoft}`}
                  title={`${ASPECT_FRIENDLY.trine.tooltip[lang]} / ${ASPECT_FRIENDLY.sextile.tooltip[lang]}`}
                >
                  <b>△</b>
                  {t('legSoft')}
                </span>
                <span
                  className={`${s.leg} ${s.legHard}`}
                  title={`${ASPECT_FRIENDLY.square.tooltip[lang]} / ${ASPECT_FRIENDLY.opposition.tooltip[lang]}`}
                >
                  <b>□</b>
                  {t('legHard')}
                </span>
                <span
                  className={`${s.leg} ${s.legNeutral}`}
                  title={ASPECT_FRIENDLY.conjunction.tooltip[lang]}
                >
                  <b>☌</b>
                  {t('legNeutral')}
                </span>
              </div>
              <AspectGrid astro={A} lang={lang} />
            </div>
            <div className={`${s.card} ${s.cardPad} ${s.digList}`}>
              <div className={s.subcap}>{t('dignityCap')}</div>
              {A.dignities.length === 0 && (
                <div className={s.digRow} style={{ color: 'var(--ink-3)' }}>
                  {t('noDignity')}
                </div>
              )}
              {A.dignities.map((d, i) => {
                const p = A.planets.find((x) => x.name === d.planet)
                const friendly = (DIGNITY_TIER_FRIENDLY[d.tier] ?? DIGNITY_TIER_LABEL[d.tier])[lang]
                const tooltip = (DIGNITY_TIER_TOOLTIP[d.tier] ?? DIGNITY_TIER_LABEL[d.tier])[lang]
                return (
                  <div
                    className={s.digRow}
                    key={i}
                    title={[tooltip, dignityHover(d.planet, d.tier, lang)]
                      .filter(Boolean)
                      .join(' — ')}
                  >
                    <span className={s.dg}>{p?.glyph}</span>
                    <span className={s.dn}>{lang === 'en' ? p?.name : p?.ko}</span>
                    <span
                      className={elClass[SIGN_META[abbr(d.sign)]?.el]}
                      style={{ fontSize: 11.5 }}
                    >
                      {signLabel(abbr(d.sign), lang)}
                      {t('signSuffix')}
                    </span>
                    <span className={s.dsc}>{friendly}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 05 통합 테마 — natalCross 교차 */}
        {cross && cross.rows.length > 0 && (
          <section className={s.section}>
            <div className={s.secHead}>
              <span className={s.secNum}>05</span>
              <span className={s.secTitle}>
                {lang === 'en' ? 'Cross-System' : '통합 교차'}
                <span className={s.han}>交叉 統合</span>
              </span>
              <span className={s.secEn}>Cross-System</span>
            </div>
            {cross.synthesis && (
              <div className={s.synthBanner}>
                <div className={s.synthK}>{t('synthLabel')}</div>
                <div className={s.synthV}>{cross.synthesis}</div>
              </div>
            )}
            <div className={s.themes}>
              {cross.rows.map((r, i) => (
                <div className={s.theme} key={i} style={{ ['--tc' as string]: TONE_COLOR[r.tone] }}>
                  <div className={s.themeHead}>
                    <span className={s.themeName}>{r.category}</span>
                    <span className={s.themeBadge}>{TONE_LABEL[r.tone][lang]}</span>
                  </div>
                  {(r.left || r.right) && (
                    <div className={s.themeCross}>
                      <div className={s.themeSide}>
                        <div className={s.themeSideK}>{t('sajuSide')}</div>
                        <div className={s.themeSideV}>{r.left}</div>
                      </div>
                      <div className={s.themeSide}>
                        <div className={s.themeSideK}>{t('astroSide')}</div>
                        <div className={s.themeSideV}>{r.right}</div>
                      </div>
                    </div>
                  )}
                  <div className={s.themeReason}>{r.reason}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={s.foot}>
          <span>四柱命理 × Tropical Natal · {A.houseSystem} House System</span>
          <span className={s.mono}>{t('footBrain')}</span>
        </div>
      </div>
    </div>
  )
}
