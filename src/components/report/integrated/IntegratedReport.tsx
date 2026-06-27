'use client'

/**
 * 통합 명식 리포트 — chart.zip 종이질감 껍데기 + 우리 엔진/데이터.
 * 5섹션: 사주명식 · 오행/용신 · 천궁도 · 어스펙트 · 통합테마(natalCross 교차).
 */
import React from 'react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import s from './IntegratedReport.module.css'
import {
  type ReportData,
  type BiLabel,
  ELEMENTS,
  ASPECT_META,
  SIGN_META,
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
  getHanjaRich,
  SIBSIN_NAME_TO_CATEGORY,
  type RelationCategory,
  type SibsinState,
  type HouseNumber,
} from '@/lib/chart-dictionary'
import {
  getShinsalInterpretation,
  shinsalDisplayText,
  getElementInterpretation,
} from '@/lib/saju/interpretations'
import { ELEMENT_REMEDY } from '../atoms/interpretations'
import {
  type Lang,
  type CrossRow,
  UI,
  relationTypeLabel,
  SIGN_TRAIT,
  TONE_LABEL,
  elClass,
  TONE_COLOR,
  stemEl,
  branchEl,
  abbr,
  polar,
  sibsinLabel,
  sibsinShort,
  stageLabel,
  planetHover,
  houseHover,
  aspectHover,
  hanjaHover,
  hanjaReading,
  dignityHover,
  stageHover,
  elementLabel,
  signLabel,
} from './integratedReportLabels'

import { GLOSSARY, type GlossarySection } from './reportGlossary'
import { groupByTheme, buildHealthCard, THEME_DEFS } from './reportThemes'
import PillarDetail from './detail/PillarDetail'
import InteractionDetail from './detail/InteractionDetail'
import ElementsDetail from './detail/ElementsDetail'
import PlanetDetail from './detail/PlanetDetail'
import HouseDetail from './detail/HouseDetail'
import AspectDetail from './detail/AspectDetail'
import ViralTopCard from './viral/ViralTopCard'
import { buildViralSummary } from './viral/viralArchetype'
import { ShareReportButton } from './viral/ShareReportButton'

export type { Lang } from './integratedReportLabels'

// 통합 교차 카테고리 → 평어 한 줄 뜻. 동·서양이 같이 가리키는 주제를 맨 위 훅과
// §05 목록에서 "라벨 — 쉬운 뜻"으로 읽히게 한다. 사용자별 하드코딩이 아니라
// 카테고리별 고정 의미(데이터). 키는 ko/en 라벨 문자열 둘 다(어댑터 CAT 라벨과 일치).
const CATEGORY_MEANING: Record<string, BiLabel> = {
  // identity
  정체성: { ko: '내가 나답게 느껴지는 핵심 결', en: 'the core that feels most like you' },
  Identity: { ko: '내가 나답게 느껴지는 핵심 결', en: 'the core that feels most like you' },
  // needs
  욕망: { ko: '마음 깊이 진짜로 채우고 싶은 것', en: 'what you most want filled inside' },
  Needs: { ko: '마음 깊이 진짜로 채우고 싶은 것', en: 'what you most want filled inside' },
  // socialRole
  사회역할: { ko: '밖에서 맡으면 빛나는 자리', en: 'the role that suits you in the world' },
  'Social Role': { ko: '밖에서 맡으면 빛나는 자리', en: 'the role that suits you in the world' },
  // fortune — 단정형 길흉이 아니라 '잘 풀리는 결' 경향으로 풀어쓴다(안전).
  길흉: { ko: '일이 비교적 잘 풀리는 흐름의 결', en: 'where things tend to flow your way' },
  Fortune: { ko: '일이 비교적 잘 풀리는 흐름의 결', en: 'where things tend to flow your way' },
  // relations
  관계: { ko: '사람과 이어지고 거리를 두는 방식', en: 'how you connect and keep distance' },
  Relationships: {
    ko: '사람과 이어지고 거리를 두는 방식',
    en: 'how you connect and keep distance',
  },
  // strength
  강점: { ko: '꾸준히 기댈 수 있는 단단한 힘', en: 'a steady strength you can lean on' },
  Strength: { ko: '꾸준히 기댈 수 있는 단단한 힘', en: 'a steady strength you can lean on' },
  // temperament
  기질: { ko: '평소 마음이 움직이는 기본 성향', en: 'your everyday inner temperament' },
  Temperament: { ko: '평소 마음이 움직이는 기본 성향', en: 'your everyday inner temperament' },
  // energy
  에너지: { ko: '힘을 주로 쏟는 방향', en: 'where your energy tends to flow' },
  Energy: { ko: '힘을 주로 쏟는 방향', en: 'where your energy tends to flow' },
  // drive
  추진력: { ko: '목표가 생기면 끝까지 미는 힘', en: 'the push to see a goal all the way through' },
  Drive: { ko: '목표가 생기면 끝까지 미는 힘', en: 'the push to see a goal all the way through' },
  // keyTrait
  '핵심 성향': { ko: '한마디로 요약되는 대표 색깔', en: 'the standout trait that defines you' },
  'Core Trait': { ko: '한마디로 요약되는 대표 색깔', en: 'the standout trait that defines you' },
  // romance
  '연애·매력': { ko: '사람을 끌고 사랑을 다루는 결', en: 'how you draw people in and love' },
  'Love & Magnetism': { ko: '사람을 끌고 사랑을 다루는 결', en: 'how you draw people in and love' },
  // expression
  '소통·표현': {
    ko: '생각을 말과 글로 나누는 방식',
    en: 'how you share ideas in words',
  },
  'Voice & Expression': {
    ko: '생각을 말과 글로 나누는 방식',
    en: 'how you share ideas in words',
  },
  // movement
  '이동·변화': { ko: '새 환경으로 옮겨가는 흐름', en: 'your pull toward change and new ground' },
  'Movement & Change': {
    ko: '새 환경으로 옮겨가는 흐름',
    en: 'your pull toward change and new ground',
  },
  // spirit
  '예술·영성': { ko: '아름다움과 깊은 의미를 향한 마음', en: 'a pull toward beauty and meaning' },
  'Art & Spirit': {
    ko: '아름다움과 깊은 의미를 향한 마음',
    en: 'a pull toward beauty and meaning',
  },
  // wealth
  '재물 그릇': { ko: '돈과 자원을 모으고 키우는 그릇', en: 'how you gather and grow resources' },
  'Wealth Capacity': {
    ko: '돈과 자원을 모으고 키우는 그릇',
    en: 'how you gather and grow resources',
  },
  // karma
  '공망/카르마': { ko: '타고나기보다 스스로 채워가는 영역', en: 'an area you build for yourself' },
  'Void / Karma': { ko: '타고나기보다 스스로 채워가는 영역', en: 'an area you build for yourself' },
  // growth
  '성장 방향': {
    ko: '평생에 걸쳐 자라나는 방향',
    en: 'the direction you grow toward over a lifetime',
  },
  'Growth Direction': {
    ko: '평생에 걸쳐 자라나는 방향',
    en: 'the direction you grow toward over a lifetime',
  },
  // yinYang
  '음양 리듬': { ko: '발산과 수렴을 오가는 리듬', en: 'your rhythm between outward and inward' },
  'Yin-Yang Rhythm': {
    ko: '발산과 수렴을 오가는 리듬',
    en: 'your rhythm between outward and inward',
  },
}

// 카르마/성장 축은 resonant·tension 같은 '톤'이 아니라 평생 숙제 축이라, 톤 막대·
// 톤별 조언·바이럴 요약에서 모두 빼야 한다. cross row 의 `karmaAxis` 플래그는
// 매칭 분기에서만 켜져 중립 카르마 행을 놓치므로, 카테고리 기반으로 일관 판정한다.
const KARMA_CATEGORIES = new Set(['공망/카르마', '성장 방향', 'Void / Karma', 'Growth Direction'])
const isKarmaRow = (r: { category: string }) => KARMA_CATEGORIES.has(r.category)
// 카테고리 라벨(이미 lang 해석됨) → 평어 한 줄. 매칭 없으면 빈 문자열.
const categoryMeaning = (category: string, lang: Lang): string =>
  CATEGORY_MEANING[category]?.[lang] ?? ''

// 초보자용 용어 풀이 — 사주·점성 용어를 모르는 사람을 위해 각 섹션의 용어를
// 한 줄로 풀어준다. 제목 바로 아래 "한 줄 리드"(첫 글로서리 항목의 body)는 항상
// 보이게 노출하고, 전체 용어 목록은 네이티브 <details>("쉽게 풀이/더보기")에 접어둔다.
// lead=false 면 리드 없이 전체 목록만 접어둔다(리포트 도입부 intro 용).
function Explain({
  section,
  lang,
  lead = true,
}: {
  section: GlossarySection
  lang: Lang
  lead?: boolean
}) {
  const entries = GLOSSARY[section]
  if (!entries?.length) return null
  const leadText = lead ? entries[0]?.body[lang] : ''
  return (
    <>
      {leadText && <p className={s.sub}>{leadText}</p>}
      <details className={s.explain}>
        <summary>
          {lang === 'en' ? '❓ In plain words — more terms' : '❓ 쉽게 풀이 — 용어 더보기'}
        </summary>
        <dl className={s.explainBody}>
          {entries.map((e, i) => (
            <div className={s.explainRow} key={i}>
              <dt className={s.explainTerm}>{e.term[lang]}</dt>
              <dd className={s.explainDef}>{e.body[lang]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  )
}

export interface IntegratedReportProps {
  data: ReportData
  /** natalCross 교차 결과 — 섹션 5(통합 테마)에 렌더. 없으면 섹션 생략. */
  cross?: { synthesis?: string; rows: CrossRow[] }
  /** 표시 언어. EN 일 때 한글 0 렌더. */
  lang?: Lang
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
function Wheel({
  astro,
  lang,
  isMinor = false,
}: {
  astro: ReportData['astro']
  lang: Lang
  isMinor?: boolean
}) {
  const SZ = 360,
    cx = SZ / 2,
    cy = SZ / 2
  const rOuter = 168,
    rSign = 150,
    rInner = 120,
    rPlanet = 100
  // ASC 가 null(출생시각 미상)이면 차트를 ASC 기준으로 돌릴 수 없으니 0°(양자리 좌측
  // 고정)로 그리고 ASC/MC 축은 생략한다 — 가짜 상승점을 그리지 않는다.
  const ascLon = astro.ascendant.lon ?? 0
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
      {/* ASC / MC 축 — lon 이 null(출생시각 미상)인 축은 생략(가짜 각 안 그림) */}
      {(
        [
          [lang === 'en' ? 'First impression' : '첫인상', astro.ascendant.lon],
          [lang === 'en' ? 'Public face' : '사회적 위치', astro.mc.lon],
        ] as Array<[string, number | null]>
      )
        .filter((e): e is [string, number] => e[1] != null)
        .map(([lab, lon]) => {
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
            <title>{planetHover(p.name, lang, isMinor)}</title>
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
                  <span className={s.agOrb}>{a.orb.toFixed(1)}°</span>
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
// 미성년(만 14세 미만) 안전 모드 — 연애·배우자 슬롯에 들어갈 연령 맞춤 문구.
// 슬롯을 숨기지 않고(reframe) 같은 자리에 발달 단계에 맞는 안내를 보여준다.
const MINOR_RELATION_LABEL: Record<Lang, string> = {
  ko: '관계 성향',
  en: 'How you connect',
}
const MINOR_RELATION_NOTE: Record<Lang, string> = {
  ko: '지금은 친구·가족과 어울리며 마음을 표현하는 법을 배우는 시기예요. 연애나 결혼 같은 주제는 더 자란 뒤에 살펴보는 게 좋아요.',
  en: 'Right now is a time for making friends and learning to express your feelings. Topics like romance and marriage are best explored when you are older.',
}
// 미성년 — 구체적 직업 리스트·돈 조언 대신 발달 단계에 맞는 '재능 키우기' 안내로 reframe.
const MINOR_TALENT_LABEL: Record<Lang, string> = {
  ko: '타고난 재능',
  en: 'Natural talents',
}
const MINOR_TALENT_NOTE: Record<Lang, string> = {
  ko: '지금은 여러 가지를 해보며 좋아하고 잘하는 걸 찾아가는 시기예요. 타고난 강점을 놀이처럼 즐겁게 키워가면 돼요. 구체적인 직업은 더 자란 뒤에 천천히 골라도 늦지 않아요.',
  en: 'Right now is a time to try many things and discover what you love and do well. Grow your natural strengths through play — specific careers can be chosen slowly when you are older.',
}

export function IntegratedReport({ data, cross, lang = 'ko' }: IntegratedReportProps) {
  // 통합 리포트(사주 포함) 조회 — 핵심 기능 사용 측정(동의 시에만 전송).
  React.useEffect(() => {
    analytics.checkSaju()
  }, [])
  const { input, saju: S, astro: A } = data
  // 어댑터 전용 확장 필드(reportTypes 에 없는 보조 정보) — 옵셔널로 읽는다.
  const extras = data as typeof data & {
    geokgukMeta?: { confidence?: 'high' | 'medium' | 'low'; fallback?: boolean }
    sibsinCategoryCount?: Record<string, number>
    isMinor?: boolean
  }
  const geokgukMeta = extras.geokgukMeta
  const sibsinCategoryCount = extras.sibsinCategoryCount
  // 만 14세 미만 — 연애/배우자 슬롯을 연령 맞춤 문구로 reframe(아동 부적합 방지).
  const isMinor = !!extras.isMinor
  const t = (k: keyof typeof UI): string => UI[k][lang]
  // KO 가시 텍스트 라틴 0 — 하우스 시스템·표준시를 한글/숫자로 현지화.
  const HOUSE_SYS_KO: Record<string, string> = {
    Placidus: '플라시더스',
    'Whole Sign': '홀사인',
    'Whole-Sign': '홀사인',
    Koch: '코흐',
    'Equal House': '등분하우스',
    Equal: '등분하우스',
    Regiomontanus: '레기오몬타누스',
    Campanus: '캄파누스',
    Porphyry: '포르피리우스',
  }
  const houseSysLabel = (hs: string): string => (lang === 'en' ? hs : (HOUSE_SYS_KO[hs] ?? hs))
  // 표준시: KO 는 IANA 식별자(Asia/Seoul) 를 빼고 UTC 오프셋만 노출.
  const tzLabel = (tz: string): string => {
    if (lang === 'en') return tz
    const m = tz.match(/UTC[+\-−]?\d+(?::?\d+)?/i)
    return m ? m[0] : tz.replace(/[A-Za-z_/]+/g, '').trim() || tz
  }
  const pillarsArr: Array<
    [BiLabel, ReportData['saju']['pillars'][keyof ReportData['saju']['pillars']]]
  > = [
    [UI.pHour, S.pillars.hour],
    [UI.pDay, S.pillars.day],
    [UI.pMonth, S.pillars.month],
    [UI.pYear, S.pillars.year],
  ]
  const strengthPct = S.strength === 'strong' ? 76 : S.strength === 'weak' ? 28 : 52

  // §02 격국 풀이 — geokguk-rich 사전. '미정' 이거나 매칭 없으면 자동 생략.
  const geok = S.geokguk && S.geokguk !== '미정' ? getGeokgukRich(S.geokguk, lang) : null
  // §02 격국 신뢰도 — fallback(월령 본기 추정)/medium 이면 헤딩을 "추정 격국"으로
  // 약화해 확정 정격으로 단정하지 않는다(CONVENTIONS §9).
  const geokTentative = !!geokgukMeta?.fallback || geokgukMeta?.confidence === 'medium'
  // §02 일지(배우자궁) 십성 — 일지 십성 카테고리(정/편 통합).
  // 주의: 일지는 배우자궁 자리이지 월령 기반 "주도 십성"이 아니므로(C1) 카드 라벨을
  // 정직하게 "일지(배우자궁) 십성"으로 단다. 우세/부족 상태는 일간 강약이 아니라
  // 해당 카테고리의 실제 개수(sibsinCategoryCount)로 산출한다(C1-a).
  const domSibsinName = S.pillars.day.sibsinBranch || S.pillars.month.sibsinBranch || ''
  const domCategory = SIBSIN_NAME_TO_CATEGORY[domSibsinName]
  const domCategoryCount = domCategory
    ? (sibsinCategoryCount?.[domCategory] ?? undefined)
    : undefined
  // 카테고리 개수 기반 상태: 0개=부족 / 3개 이상=우세 / 그 외=균형.
  // 카운트 정보가 없으면(구데이터) 균형으로 안전 폴백.
  const sibsinState: SibsinState =
    domCategoryCount === undefined
      ? 'balanced'
      : domCategoryCount === 0
        ? 'missing'
        : domCategoryCount >= 3
          ? 'dominant'
          : 'balanced'
  const sibsinBlock = domCategory ? getSibsinCategory(domCategory, sibsinState, lang) : null
  // §01 일주 원형 — 일간+일지 간지 → ilju-60 사전.
  const dayGanji = `${S.pillars.day.stem}${S.pillars.day.branch}`
  const ilju = getIljuArchetype(dayGanji, lang)

  // ── 바이럴 "한 장 요약" — 맨 위 임팩트 카드. 일간 유형 + 강점 + 동·서양
  //    일치 + 궁합. 한자/전문용어는 아래 섹션에 그대로, 여기선 평어만. ──
  const viralStrengths = (() => {
    const dmx = getHanjaRich(S.dayMaster, lang) as { strength?: string[] } | null
    const set = Array.from(
      new Set([...(dmx?.strength ?? []), ...((geok?.strength as string[]) ?? [])].filter(Boolean))
    )
    return set.slice(0, 3)
  })()
  const viral = buildViralSummary({
    dayMaster: S.dayMaster,
    ascTrait: A.ascendant.sign ? (SIGN_TRAIT[abbr(A.ascendant.sign)]?.[lang] ?? null) : null,
    strengths: viralStrengths,
    resonant: (cross?.rows ?? [])
      .filter((r) => r.tone === 'resonant' && !isKarmaRow(r))
      .map((r) => r.category),
    yongsinElement: S.yongsin.primary,
    lang,
  })

  // ── 테마별 풀이 — 교차 판정을 삶의 주제(나·연애·일·돈·성장·건강)로 묶어 리포트
  //    맨 앞에 둔다. 명식·천궁도·어스펙트는 아래 '근거 자료'(접이식)로 내려, 읽는
  //    흐름이 "내 얘기 → 그 근거" 순서가 되게 한다. 판단은 그대로 엔진(cross)이 낸다. ──
  type ThemeCard = {
    category: string
    tone: 'resonant' | 'complement' | 'tension' | 'neutral'
    left?: string
    right?: string
    reason: string
  }
  const themesSection =
    cross && cross.rows.length > 0 ? (
      <section className={s.section}>
        <div className={s.secHead}>
          <span className={s.secTitle}>{lang === 'en' ? 'Your life themes' : '테마별 풀이'}</span>
          {lang === 'en' && <span className={s.secEn}>By Theme</span>}
        </div>
        <p className={s.chapterLead}>{t('sec05Lead')}</p>
        <Explain section="s05" lang={lang} />
        {/* 톤 분포 막대 — 사주×별자리가 얼마나 같은/다른 결인지 한눈에. */}
        {(() => {
          const counts = { resonant: 0, complement: 0, tension: 0, neutral: 0 }
          cross.rows.forEach((r) => {
            if (isKarmaRow(r)) return
            counts[r.tone]++
          })
          const segs = (['resonant', 'complement', 'tension', 'neutral'] as const).filter(
            (k) => counts[k] > 0
          )
          if (!segs.length) return null
          return (
            <div className={s.crossTally}>
              <div className={s.crossBar}>
                {segs.map((k) => (
                  <div
                    key={k}
                    className={s.crossSeg}
                    style={{ flexGrow: counts[k], background: TONE_COLOR[k] }}
                    title={`${TONE_LABEL[k][lang]} ${counts[k]}`}
                  />
                ))}
              </div>
              <div className={s.crossLegend}>
                {segs.map((k) => (
                  <span className={s.crossLeg} key={k}>
                    <i style={{ background: TONE_COLOR[k] }} />
                    {TONE_LABEL[k][lang]} {counts[k]}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}
        {/* 테마 그룹 — 6개 큰 주제로 묶고, 건강은 오행 기반 카드로 합류. */}
        {(() => {
          const groups = groupByTheme(cross.rows)
          const health = buildHealthCard(S.fiveElements, S.yongsin?.primary, lang)
          const healthDef = THEME_DEFS.find((d) => d.key === 'health')
          const all: Array<{ def: (typeof THEME_DEFS)[number]; rows: ThemeCard[] }> =
            health && healthDef ? [...groups, { def: healthDef, rows: [health] }] : groups
          return all.map((g) => (
            <div className={s.themeGroup} key={g.def.key}>
              <div className={s.themeGroupHead}>
                <span className={s.themeGroupTitle}>
                  {g.def.emoji} {g.def.title[lang]}
                </span>
                <span className={s.themeGroupLead}>{g.def.lead[lang]}</span>
              </div>
              <div className={s.themes}>
                {g.rows.map((r, i) => (
                  <div
                    className={s.theme}
                    key={i}
                    style={{ ['--tc' as string]: TONE_COLOR[r.tone] }}
                  >
                    <div className={s.themeHead}>
                      <span className={s.themeName}>
                        {r.category}
                        {categoryMeaning(r.category, lang) && (
                          <span className={s.themeGloss}>{categoryMeaning(r.category, lang)}</span>
                        )}
                      </span>
                      <span className={s.themeBadge}>{TONE_LABEL[r.tone][lang]}</span>
                    </div>
                    {r.left && r.right && (
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
            </div>
          ))
        })()}
        {/* 💡 실천 — 진단을 처방으로. */}
        {(() => {
          const reson = cross.rows
            .filter((r) => r.tone === 'resonant' && !isKarmaRow(r))
            .map((r) => r.category)
          const tens = cross.rows
            .filter((r) => r.tone === 'tension' && !isKarmaRow(r))
            .map((r) => r.category)
          const karma = cross.rows.filter((r) => isKarmaRow(r)).map((r) => r.category)
          return (
            <div className={s.crossAdvice}>
              <div className={s.crossAdviceHead}>
                {lang === 'en' ? '💡 How to live with it' : '💡 이렇게 살면 좋아요'}
              </div>
              <ul className={s.crossAdviceList}>
                {reson.length > 0 && (
                  <li>
                    <b>{lang === 'en' ? 'The real you' : '진짜 나다운 점'}</b>{' '}
                    {lang === 'en'
                      ? 'East and West agree on '
                      : '동양 사주와 서양 별자리가 똑같이 짚는 '}
                    <b>{reson.join(' · ')}</b>
                    {lang === 'en'
                      ? ' — when both ways of reading you say the same thing, it is one of your steadiest, most "really you" parts, so lean on it in what you do and how you show up.'
                      : '은(는) 따로따로 봤는데도 똑같이 나온 부분이라, 좀처럼 흔들리지 않는 가장 너다운 점이에요. 무언가 할 때나 나를 드러낼 때 이 점을 믿고 살리면 좋아요.'}
                  </li>
                )}
                {tens.length > 0 && (
                  <li>
                    <b>{lang === 'en' ? 'Balance' : '다루는 법'}</b>{' '}
                    {lang === 'en' ? 'Where they clash (' : '부딪히는 '}
                    <b>{tens.join(' · ')}</b>
                    {lang === 'en'
                      ? ') — alternate between the two instead of suppressing one.'
                      : '은(는) 한쪽을 누르기보다 상황 따라 번갈아 쓰면 오히려 강점이 돼요.'}
                  </li>
                )}
                {karma.length > 0 && (
                  <li>
                    <b>{lang === 'en' ? 'Lifelong work' : '평생 숙제'}</b>{' '}
                    {lang === 'en'
                      ? 'Both systems point to '
                      : '동·서양이 똑같이 "스스로 채워야 한다"고 짚는 '}
                    <b>{karma.join(' · ')}</b>
                    {lang === 'en'
                      ? ' — neither system gives this; it is yours to build by hand. Fill it in small, steady steps over the years.'
                      : '은(는) 타고나는 게 아니라 직접 만들어가는 영역 — 조급해 말고 해마다 조금씩 채워가면 가장 단단한 자산이 돼요.'}
                  </li>
                )}
              </ul>
            </div>
          )
        })()}
      </section>
    ) : null

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
            [
              t('metaCoord'),
              // 부호로 반구 분기 — 남반구(-lat)는 S, 서경(-lng)은 W (C7).
              `${Math.abs(input.lat).toFixed(2)}°${input.lat < 0 ? 'S' : 'N'} · ${Math.abs(input.lng).toFixed(2)}°${input.lng < 0 ? 'W' : 'E'}`,
            ],
            [t('metaTz'), tzLabel(input.timeZone)],
            [
              t('metaHouse'),
              `${houseSysLabel(A.houseSystem)} · ${A.sect === 'day' ? t('day') : t('night')}`,
            ],
          ].map(([k, v]) => (
            <div className={s.metaCell} key={k}>
              <span className={s.metaK}>{k}</span>
              <span className={s.metaV}>{v}</span>
            </div>
          ))}
        </div>
        {/* 메타 그리드 안내 — 숫자·전문어가 겁주지 않게 한 줄. */}
        <p className={s.metaNote}>{t('metaNote')}</p>

        {/* 출생시각 미상 경고 — ASC/MC/하우스 의존 해석이 근사치임을 고지 */}
        {input.birthTimeUnknown && (
          <div className={s.timeUnknownNote} role="note">
            <b>⚠ {t('timeUnknownTitle')}</b>
            <span>{t('timeUnknownBody')}</span>
          </div>
        )}

        {/* ── 바이럴 한 장 요약 — 유형 별명 + 소름 한 줄 + 동·서양 일치 + 궁합.
            매칭(일간 10간) 없으면 자동 생략하고 기존 히어로만 노출. ── */}
        {viral && (
          <ViralTopCard
            summary={viral}
            lang={lang}
            action={
              <ShareReportButton
                summary={viral}
                name={input.name}
                dateLabel={input.date}
                isKo={lang === 'ko'}
              />
            }
          />
        )}

        {/* ── 한눈에 (결론 먼저) — 종합 교차 + 강점 + 가장 필요한 기운.
            암호 같던 한자 별명 줄은 위 ViralTopCard 가 평어로 대체. ── */}
        <div className={s.hero}>
          {cross?.synthesis && <p className={s.heroSummary}>{cross.synthesis}</p>}
          {/* 정체성 화해 한 줄(I1) — 바이럴 일간 별명(겉)과 격국 유형(판 짜는 방식)이
              다른 사람처럼 읽히지 않도록 둘을 잇는다. 둘 다 있을 때만. */}
          {viral && geok?.tagline && (
            <p className={s.heroSummary}>
              {lang === 'en'
                ? `On the outside you read as "${viral.name}"; underneath, you move like "${geok.tagline}" — two layers of the same person.`
                : `겉으론 '${viral.name}'처럼 보이고, 속은 '${geok.tagline}' 쪽이에요 — 둘 다 한 사람의 다른 겹이에요.`}
            </p>
          )}
          {(() => {
            // 강점은 위 ViralTopCard 해시태그로 이동 — 여기선 '주의(약점)'만 남겨
            // 중복 제거. (Opus: top 카드 ↔ 히어로 강점 이중 노출 정리.)
            const dmx = getHanjaRich(S.dayMaster, lang) as { weakness?: string[] } | null
            const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).slice(0, 4)
            const weak = uniq([...(dmx?.weakness ?? []), ...((geok?.weakness as string[]) ?? [])])
            if (!weak.length) return null
            return (
              <div className={s.heroSW}>
                <div>
                  <b>{lang === 'en' ? 'Watch for' : '주의'}</b> {weak.join(' · ')}
                </div>
              </div>
            )
          })()}
          {(() => {
            const yp = S.yongsin.primary
            if (!yp) return null // 용신 미산출 시 가짜 처방을 만들지 않는다
            const yk = ELEMENTS[yp]?.ko
            const rem = yk ? ELEMENT_REMEDY[yk] : undefined
            if (!rem) return null
            return (
              <div className={s.heroRemedy}>
                <b className={elClass[yp]}>
                  {lang === 'en' ? 'What you need most' : '가장 필요한 기운'}: {ELEMENTS[yp]?.han}{' '}
                  {elementLabel(yp, lang)}
                </b>
                <span>
                  🎨 {rem.color[lang]} · 🧭 {rem.direction[lang]} · ✨ {rem.activity[lang]}
                </span>
              </div>
            )
          })()}
        </div>

        {/* 오리엔테이션 — "이게 뭐고 어떻게 읽는지" 항상 보이게(초보자 길잡이). */}
        <div className={s.howToRead}>
          <div className={s.howToReadTitle}>{t('howToReadTitle')}</div>
          <p className={s.howToReadBody}>{t('howToReadBody')}</p>
          <div className={s.howToReadJourney}>{t('howToReadJourney')}</div>
        </div>

        {/* 입문 용어 풀이 — 사주팔자/천궁도가 뭔지부터 (도입부라 리드 없이 더보기만) */}
        <Explain section="intro" lang={lang} lead={false} />

        {themesSection}

        {/* ── 근거 자료(접이식) — 명식·천궁도·어스펙트·하우스. 도표를 원하는 사람만
            펼쳐 본다. 테마별 풀이가 본문, 이건 그 근거. ── */}
        <details className={s.evidence}>
          <summary className={s.evidenceSummary}>
            {lang === 'en'
              ? '📊 The data behind it — chart, planets, aspects'
              : '📊 근거 자료 — 명식·천궁도·어스펙트'}
          </summary>

          {/* 01 사주 명식 */}
          <section className={s.section}>
            <div className={s.secHead}>
              <span className={s.secNum}>01</span>
              <span className={s.secTitle}>
                {lang === 'en' ? 'Your birth makeup' : '타고난 나는 어떤 사람일까?'}
              </span>
              {lang === 'en' && <span className={s.secEn}>Four Pillars</span>}
            </div>
            <p className={s.chapterLead}>{t('sec01Lead')}</p>
            <Explain section="s01" lang={lang} />
            {/* 일간(나) 카드 — hanja-rich 의 일간성격·강점·약점·직업을 hover→본문으로. */}
            {(() => {
              const dm = getHanjaRich(S.dayMaster, lang) as {
                nature?: string
                as_daymaster?: string
                strength?: string[]
                weakness?: string[]
                career?: string[]
              } | null
              return (
                <div className={s.dmCard}>
                  <div className={s.dmHead}>
                    <b className={elClass[stemEl(S.dayMaster)]}>
                      {S.dayMaster}
                      <i className={s.hanRead}>{hanjaReading(S.dayMaster, lang)}</i>
                    </b>
                    <span>{lang === 'en' ? 'Your day character' : '태어난 날의 나'}</span>
                  </div>
                  <div className={s.dmBody}>{dm?.as_daymaster ?? dm?.nature ?? ''}</div>
                  {/* 강점/약점은 상단 히어로에 일간+격국 종합으로 한 번만 노출(중복 제거). */}
                  {!isMinor && dm?.career?.length ? (
                    <div className={s.dmRow}>
                      <b>{lang === 'en' ? 'Careers' : '직업'}</b> {dm.career.join(', ')}
                    </div>
                  ) : null}
                </div>
              )
            })()}
            <details className={s.l2}>
              <summary>{t('l2Pillars')}</summary>
              <div className={`${s.pillars} ${s.l2Body}`}>
                {pillarsArr.map(([head, p]) => (
                  <div className={`${s.pillar} ${p.isDay ? s.isDay : ''}`} key={head.ko}>
                    {p.isDay && <span className={s.dayTag}>{lang === 'en' ? 'Self' : '日干'}</span>}
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
                      <div className={s.gzRead}>{hanjaReading(p.stem, lang)}</div>
                    </div>
                    <div className={`${s.gz} ${s.branch}`}>
                      <div
                        className={`${s.gzHan} ${elClass[branchEl(p.branch)]}`}
                        title={hanjaHover(p.branch, lang)}
                      >
                        {p.branch}
                      </div>
                      <div className={s.gzRead}>{hanjaReading(p.branch, lang)}</div>
                    </div>
                    <div className={s.sib}>{sibsinLabel(p.sibsinBranch, lang)}</div>
                    <div className={s.jjg}>
                      {p.jijanggan.map((j, i) => (
                        <div className={s.jjgI} key={i}>
                          <b className={elClass[stemEl(j.g)]} title={hanjaHover(j.g, lang)}>
                            {j.g}
                          </b>
                          <i>
                            {(lang === 'en'
                              ? { main: 'main', mid: 'mid', sub: 'sub' }[j.layer]
                              : { main: '본', mid: '중', sub: '여' }[j.layer]) ?? ''}{' '}
                            {hanjaReading(j.g, lang)}
                          </i>
                        </div>
                      ))}
                    </div>
                    <div className={s.stage} title={stageHover(p.twelveStage, lang)}>
                      {stageLabel(p.twelveStage, lang)}
                    </div>
                  </div>
                ))}
              </div>
            </details>
            {/* 쉬운 풀이 (Level 1) — 한자/십신을 평이한 한 줄로. 위 전문 그리드는 더보기 안. */}
            <div className={s.plainPillars}>
              <p className={s.rowLead}>{t('plainPillarsLead')}</p>
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
                      <i className={s.hanRead}>{hanjaReading(p.stem, lang)}</i>{' '}
                      <span className={elClass[branchEl(p.branch)]}>{p.branch}</span>
                      <i className={s.hanRead}>{hanjaReading(p.branch, lang)}</i>
                    </b>
                    <span className={s.plainMeaning}>
                      {[stemG, branchG].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )
              })}
            </div>
            <PillarDetail pillars={S.pillars} lang={lang} />
            <div className={s.row2}>
              <div>
                <div className={s.subcap}>{t('shinsalCap')}</div>
                <p className={s.rowLead}>{t('shinsalLead')}</p>
                <div className={s.chips}>
                  {[...S.natalShinsal]
                    .sort((a, b) => (b.polarity ?? 0) - (a.polarity ?? 0))
                    .map((sh, i) => {
                      const interp = getShinsalInterpretation(sh.ko)
                      const label = lang === 'en' ? (interp?.name_en ?? sh.ko) : sh.ko
                      const tip = interp
                        ? shinsalDisplayText(interp, sh.ko, lang, isMinor)
                        : undefined
                      return (
                        <span
                          className={`${s.chip} ${sh.polarity > 0 ? s.pos : sh.polarity < 0 ? s.neg : s.neu}`}
                          key={i}
                          title={tip}
                        >
                          <b>{label}</b>
                          <i>
                            {lang === 'en' ? (sh.pillarEn ?? sh.pillar) : sh.pillar}
                            {sh.sub ? `·${sh.sub}` : ''}
                          </i>
                        </span>
                      )
                    })}
                </div>
              </div>
              <div>
                <div className={s.subcap}>{t('relCap')}</div>
                <p className={s.rowLead}>{t('relationsLead')}</p>
                <div className={s.relations}>
                  {S.natalRelations.map((r, i) => {
                    // 합충형파 의미 — relations-pairs 사전(category + 한자 pair). 없으면 detail 폴백.
                    const rel =
                      r.category && r.pair
                        ? getRelationMeaning(r.category as RelationCategory, r.pair, lang)
                        : null
                    const tip = rel?.meaning ?? undefined
                    // EN 일 때 detail(한글 섞임)을 한자 pair 로 대체해 한글 누수 차단.
                    // pair 가 비어도 detail 로 폴백하지 않는다 — 폴백하면 한글이 샌다.
                    const body = lang === 'en' ? r.pair : r.detail
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
                  {!isMinor && ilju.career && (
                    <div className={s.themeReason} style={{ marginTop: 4 }}>
                      <b>{t('geokCareer')}</b> {ilju.career}
                    </div>
                  )}
                  {ilju.love && (
                    <div className={s.themeReason} style={{ marginTop: 4 }}>
                      <b>{isMinor ? MINOR_RELATION_LABEL[lang] : t('geokLove')}</b>{' '}
                      {isMinor ? MINOR_RELATION_NOTE[lang] : ilju.love}
                    </div>
                  )}
                </div>
              </>
            )}
            <InteractionDetail
              shinsal={S.natalShinsal}
              relations={S.natalRelations}
              lang={lang}
              isMinor={isMinor}
            />
          </section>

          {/* 02 오행과 용신 */}
          <section className={s.section}>
            <div className={s.secHead}>
              <span className={s.secNum}>02</span>
              <span className={s.secTitle}>{t('sec02Title')}</span>
              {lang === 'en' && <span className={s.secEn}>Elements & Balance</span>}
            </div>
            <p className={s.chapterLead}>{t('sec02Lead')}</p>
            <Explain section="s02" lang={lang} />
            <div className={s.gridElem}>
              <div className={`${s.card} ${s.cardPad}`}>
                <div className={s.subcap}>{t('elemDist')}</div>
                <Pentagon fe={S.fiveElements} />
              </div>
              <div className={`${s.card} ${s.cardPad} ${s.elemSide}`}>
                <div>
                  <div className={s.subcap}>{t('strongWeak')}</div>
                  <div className={s.gaugeHead}>
                    {/* 격국 정체성은 아래 전용 '격국 풀이' 카드에 있으므로 여기선 생략(중복 제거). */}
                    <span>
                      {t('dayMasterLab')} {S.dayMaster}
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
                  {(S.rooted !== undefined ||
                    (S.gongmang && S.gongmang.length) ||
                    S.johuYongsin) && (
                    <details className={s.l2}>
                      <summary>{t('l2Sub')}</summary>
                      <div className={`${s.gaugeScale} ${s.gaugeScaleRow} ${s.l2Body}`}>
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
                    </details>
                  )}
                </div>
                <div>
                  <div className={s.subcap}>{t('yongTitle')}</div>
                  <div className={s.yongRow}>
                    <span className={s.yongLab}>{t('yongLab')}</span>
                    {S.yongsin.primary ? (
                      <span className={`${s.yong} ${s.yongPri} ${elClass[S.yongsin.primary]}`}>
                        {ELEMENTS[S.yongsin.primary]?.han}
                        <i>{elementLabel(S.yongsin.primary, lang)}</i>
                      </span>
                    ) : (
                      <span className={s.yong}>{lang === 'en' ? 'N/A' : '미산출'}</span>
                    )}
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
                  {/* 오행 카운트는 펜타곤 꼭짓점에 이미 표시되므로 텍스트 반복 제거(중복 제거). */}
                  {/* 용신 '왜 필요한가' — fiveElements 사전에서 성질+부족시 증상 연결. */}
                  {(() => {
                    const yk = S.yongsin.primary ? ELEMENTS[S.yongsin.primary]?.ko : undefined
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
                      // 용신 원소명은 바로 위 용신 행에 있으므로 반복하지 않고 성질만 설명(중복 제거).
                      <div className={s.yongWhy}>
                        {nature}
                        {lack ? ` · ${lang === 'en' ? 'lacking: ' : '부족하면 '}${lack}` : ''}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
            {/* 격국 풀이 — geokguk-rich 사전. '미정'/매칭 없으면 자동 생략.
              fallback/medium(월령 본기 추정·투출 미확인)이면 헤딩을 "추정 격국"으로
              약화하고 안내 줄을 덧붙여 확정 정격으로 단정하지 않는다(C2). */}
            {geok && (
              <div className={`${s.card} ${s.cardPad}`} style={{ marginTop: 16 }}>
                <div className={s.subcap} title={lang === 'ko' ? S.geokguk : undefined}>
                  {geokTentative
                    ? lang === 'en'
                      ? 'Tentative structure'
                      : '추정 큰 틀'
                    : t('geokgukCap')}
                </div>
                <div className={s.gaugeHead}>
                  <b>{geok.tagline}</b>
                </div>
                {geokTentative && (
                  <div className={s.themeReason} style={{ marginTop: 6, color: 'var(--ink-3)' }}>
                    {lang === 'en'
                      ? 'Estimated from the month-branch main qi (no confirmed reveal) — read as a tentative direction, not a settled verdict.'
                      : '월지 본기로 추정한 격(투출 미확인)이에요 — 확정된 격이라기보다 대략의 방향으로 참고해 주세요.'}
                  </div>
                )}
                <div className={s.themeReason} style={{ marginTop: 6 }}>
                  <b>{t('geokPersonality')}</b> {geok.personality}
                </div>
                {/* 강점/약점은 상단 히어로에 종합되어 있어 카드에서는 생략(중복 제거). */}
                {isMinor ? (
                  <div className={s.themeReason} style={{ marginTop: 4 }}>
                    <b>{MINOR_TALENT_LABEL[lang]}</b> {MINOR_TALENT_NOTE[lang]}
                  </div>
                ) : (
                  geok.career &&
                  geok.career.length > 0 && (
                    <div className={s.themeReason} style={{ marginTop: 4 }}>
                      <b>{t('geokCareer')}</b> {geok.career.join(', ')}
                    </div>
                  )
                )}
                {geok.love && (
                  <div className={s.themeReason} style={{ marginTop: 4 }}>
                    <b>{isMinor ? MINOR_RELATION_LABEL[lang] : t('geokLove')}</b>{' '}
                    {isMinor ? MINOR_RELATION_NOTE[lang] : geok.love}
                  </div>
                )}
                {/* 미성년에겐 사업·돈 운용 조언(geok.advice)을 숨긴다 — 연령 부적합 */}
                {!isMinor && (
                  <div className={s.themeReason} style={{ marginTop: 4 }}>
                    <b>{t('geokAdvice')}</b> {geok.advice}
                  </div>
                )}
              </div>
            )}
            {/* 일지(배우자궁) 십성 — sibsin-category 사전. 매칭 없으면 자동 생략.
              일지는 배우자궁 자리라 월령 기반 "주도 십성"이 아니므로(C1) 라벨을
              정직하게 "일지(배우자궁) 십성"으로 둔다. */}
            {sibsinBlock && (
              <div className={`${s.card} ${s.cardPad}`} style={{ marginTop: 16 }}>
                <div className={s.subcap}>
                  {lang === 'en'
                    ? isMinor
                      ? 'Day-Branch (Relationship Seat) Ten God'
                      : 'Day-Branch (Spouse Palace) Ten God'
                    : isMinor
                      ? '일지(관계 자리) 십성 · 十星'
                      : '일지(배우자궁) 십성 · 十星'}
                </div>
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
            <ElementsDetail saju={S} lang={lang} />
          </section>

          {/* 03 천궁도 */}
          <section className={s.section}>
            <div className={s.secHead}>
              <span className={s.secNum}>03</span>
              <span className={s.secTitle}>
                {lang === 'en' ? 'Your birth sky' : '하늘이 본 나'}
              </span>
              {lang === 'en' && <span className={s.secEn}>Natal Chart</span>}
            </div>
            <p className={s.chapterLead}>{t('sec03Lead')}</p>
            <Explain section="s03" lang={lang} />
            <div className={s.gridChart}>
              <div className={`${s.card} ${s.wheelCard}`}>
                <Wheel astro={A} lang={lang} isMinor={isMinor} />
                <p className={s.wheelCaption}>
                  {lang === 'en'
                    ? 'A round map of the sky at the moment you were born. The outer rim is the 12 zodiac signs, the dots inside are the planets, and the lines connect planets that influence each other.'
                    : '태어난 순간의 하늘을 둥글게 그린 지도예요. 바깥 테두리는 12별자리, 안쪽 점은 행성, 점을 잇는 선은 서로 영향을 주는 행성끼리의 관계예요.'}
                </p>
              </div>
              <details className={s.l2}>
                <summary>{t('l2Planets')}</summary>
                <div className={s.l2Body}>
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
                            title={[
                              planetHover(p.name, lang, isMinor),
                              p.house ? houseHover(p.house, lang) : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          >
                            <td className={s.plG}>{p.glyph}</td>
                            <td className={s.plN}>{lang === 'en' ? p.name : p.ko}</td>
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
                  <div className={s.miniLegend}>
                    <b>℞</b>
                    {t('retroLegend')}
                  </div>
                  <div className={s.axes}>
                    {[
                      [lang === 'en' ? 'First impression' : '첫인상', A.ascendant],
                      [lang === 'en' ? 'Public face' : '사회적 위치', A.mc],
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
                      <b>{houseSysLabel(A.houseSystem)}</b>
                    </div>
                  </div>
                  {/* 6하우스 그리드 제거 — 아래 HouseDetail 이 12하우스 전체를 풀이로 대체. */}
                </div>
              </details>
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
                    glyph: lang === 'en' ? 'Asc' : '↑',
                    label: lang === 'en' ? 'First impression' : '첫인상',
                    core: getPlanetCore('Ascendant', lang),
                    sign: asc.sign,
                    deg: asc.deg,
                    house: 0,
                  },
                  ...(
                    [
                      ['Mercury', '☿', '수성'],
                      ['Venus', '♀', '금성'],
                      ['Mars', '♂', '화성'],
                    ] as const
                  ).map(([nm, gl, ko]) => {
                    const p = find(nm)
                    return p
                      ? {
                          glyph: gl,
                          label: lang === 'en' ? nm : ko,
                          core: getPlanetCore(nm, lang, isMinor),
                          sign: p.sign,
                          deg: p.deg,
                          house: p.house,
                        }
                      : null
                  }),
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
                  // 별자리를 못 구하는 유일한 케이스 = 출생 시각 미상의 상승궁(첫인상).
                  // 빈 헤더·빈 풀이 카드가 나가면 "설명이 없다"는 인상을 주므로,
                  // 별자리·도수 대신 왜 비었는지/어떻게 채우는지 한 줄로 안내한다.
                  const hasSign = !!sk
                  return (
                    <div className={s.bigCard} key={cd.label}>
                      <div className={s.bigHead}>
                        <b className={elClass[sk?.el ?? '']}>
                          {cd.glyph} {cd.label}
                        </b>
                        {hasSign && (
                          <i>
                            {signLabel(abbr(cd.sign), lang)} {cd.deg}
                          </i>
                        )}
                      </div>
                      <div className={s.bigPrin}>{cd.core.principle}</div>
                      {(() => {
                        if (!hasSign) {
                          // 상승궁은 정확한 출생 시각이 있어야 계산된다.
                          const note =
                            lang === 'en'
                              ? "Your birth time is missing, so this sign can't be calculated yet — add an exact birth time to reveal it."
                              : '출생 시각이 없어 별자리를 계산할 수 없어요 — 정확한 출생 시각을 넣으면 나타나요.'
                          return <div className={s.bigRead}>{note}</div>
                        }
                        // 점성 해석 — 행성(역할) × 별자리(색) × 하우스(무대)를 한 문장으로.
                        const tr = SIGN_TRAIT[abbr(cd.sign)]
                        const sgn = signLabel(abbr(cd.sign), lang)
                        const h = cd.house ? getHouseRich(cd.house as HouseNumber, lang) : null
                        const dom = h ? h.domain.split('·')[0].trim() : ''
                        if (!tr) return null
                        const read =
                          lang === 'en'
                            ? `In ${sgn}, your ${cd.label} comes through as ${tr.en}` +
                              (h ? `, and plays out mainly in matters of ${dom}.` : '.')
                            : `${sgn} 자리라 ${cd.label}이 ${tr.ko} 색으로 드러나` +
                              (h ? `고, ${dom} 쪽 일에서 주로 펼쳐져요.` : '요.')
                        return <div className={s.bigRead}>{read}</div>
                      })()}
                      <div className={s.bigMean}>{cd.core.meaning}</div>
                    </div>
                  )
                })
              })()}
            </div>
            {/* bigThree(태양·달·상승·수·금·화)는 위에서 이미 본문 해석 → 제외해 중복 방지. */}
            <PlanetDetail
              astro={A}
              lang={lang}
              exclude={['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']}
              isMinor={isMinor}
            />
            <HouseDetail astro={A} lang={lang} isMinor={isMinor} />
          </section>

          {/* 04 어스펙트 */}
          <section className={s.section}>
            <div className={s.secHead}>
              <span className={s.secNum}>04</span>
              <span className={s.secTitle}>
                {lang === 'en' ? 'How your forces interact' : '내 안의 기운들, 서로 잘 지내나?'}
              </span>
              {lang === 'en' && <span className={s.secEn}>Aspects</span>}
            </div>
            <p className={s.chapterLead}>{t('sec04Lead')}</p>
            <Explain section="s04" lang={lang} />
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
                <details className={s.l2}>
                  <summary>{t('l2Aspects')}</summary>
                  <div className={s.l2Body}>
                    <p className={s.gridCaption}>
                      {lang === 'en'
                        ? 'Each cell is where two planets meet. The symbol shows whether they flow (△), clash (□), or sit together (☌); the small number is how exact the angle is (closer to 0° = stronger).'
                        : '각 칸은 두 행성이 만나는 지점이에요. 기호는 둘 사이가 잘 흐르는지(△)·부딪히는지(□)·붙어 있는지(☌)를, 아래 숫자는 그 각이 얼마나 딱 맞는지(0°에 가까울수록 강해요)를 뜻해요.'}
                    </p>
                    <AspectGrid astro={A} lang={lang} />
                  </div>
                </details>
              </div>
              <details className={s.l2}>
                <summary>{t('l2Dignity')}</summary>
                <div className={`${s.l2Body} ${s.card} ${s.cardPad} ${s.digList}`}>
                  {A.dignities.length === 0 && (
                    <div className={s.digRow} style={{ color: 'var(--ink-3)' }}>
                      {t('noDignity')}
                    </div>
                  )}
                  {A.dignities.map((d, i) => {
                    const p = A.planets.find((x) => x.name === d.planet)
                    const friendly = (DIGNITY_TIER_FRIENDLY[d.tier] ?? DIGNITY_TIER_LABEL[d.tier])[
                      lang
                    ]
                    const tooltip = (DIGNITY_TIER_TOOLTIP[d.tier] ?? DIGNITY_TIER_LABEL[d.tier])[
                      lang
                    ]
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
              </details>
            </div>
            <AspectDetail astro={A} lang={lang} />
          </section>
        </details>
        {/* /근거 자료 */}

        {/* 면책 — 항상 노출(C3). 자기 이해용 참고일 뿐 전문 조언이 아님을 고지. */}
        <div
          className={s.foot}
          role="note"
          style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)' }}
        >
          {lang === 'en'
            ? 'This report is for self-reflection only and is not a substitute for professional medical, legal, or financial advice.'
            : '이 리포트는 자기 이해를 돕는 참고용이에요. 의료·법률·재무 같은 전문적인 판단을 대신하지 않으니 참고로만 봐 주세요.'}
        </div>

        <div className={s.foot}>
          <span>
            {lang === 'en' ? `Saju × Tropical astrology` : `동양 사주 × 서양 점성(트로피컬)`}
          </span>
          <span className={s.mono}>{t('footBrain')}</span>
        </div>
      </div>
    </div>
  )
}
