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
import { getShinsalInterpretation, getElementInterpretation } from '@/lib/saju/interpretations'
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
  dignityHover,
  stageHover,
  elementLabel,
  signLabel,
} from './integratedReportLabels'

import { GLOSSARY, type GlossarySection } from './reportGlossary'
import PillarDetail from './detail/PillarDetail'
import InteractionDetail from './detail/InteractionDetail'
import ElementsDetail from './detail/ElementsDetail'
import PlanetDetail from './detail/PlanetDetail'
import HouseDetail from './detail/HouseDetail'
import AspectDetail from './detail/AspectDetail'
import ViralTopCard from './viral/ViralTopCard'
import { buildViralSummary } from './viral/viralArchetype'
import { ShareReportButton } from './viral/ShareReportButton'

export type { Lang, CrossRow } from './integratedReportLabels'

// 초보자용 "쉽게 풀이" 더보기 — 사주·점성 용어를 모르는 사람을 위해 각 섹션의
// 용어를 한 줄로 풀어준다. 네이티브 <details> 라 모바일/접근성 OK, 기본 접힘.
function Explain({ section, lang }: { section: GlossarySection; lang: Lang }) {
  const entries = GLOSSARY[section]
  if (!entries?.length) return null
  return (
    <details className={s.explain}>
      <summary>{lang === 'en' ? '❓ In plain words' : '❓ 쉽게 풀이 — 용어가 궁금하면'}</summary>
      <dl className={s.explainBody}>
        {entries.map((e, i) => (
          <div className={s.explainRow} key={i}>
            <dt className={s.explainTerm}>{e.term[lang]}</dt>
            <dd className={s.explainDef}>{e.body[lang]}</dd>
          </div>
        ))}
      </dl>
    </details>
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
    ascTrait: A.ascendant ? (SIGN_TRAIT[abbr(A.ascendant.sign)]?.[lang] ?? null) : null,
    strengths: viralStrengths,
    resonant: (cross?.rows ?? []).filter((r) => r.tone === 'resonant').map((r) => r.category),
    yongsinElement: S.yongsin.primary,
    lang,
  })

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
            const yk = ELEMENTS[S.yongsin.primary]?.ko
            const rem = yk ? ELEMENT_REMEDY[yk] : undefined
            if (!rem) return null
            return (
              <div className={s.heroRemedy}>
                <b className={elClass[S.yongsin.primary]}>
                  {lang === 'en' ? 'What you need most' : '가장 필요한 기운'}:{' '}
                  {ELEMENTS[S.yongsin.primary]?.han} {elementLabel(S.yongsin.primary, lang)}
                </b>
                <span>
                  🎨 {rem.color[lang]} · 🧭 {rem.direction[lang]} · ✨ {rem.activity[lang]}
                </span>
              </div>
            )
          })()}
        </div>

        {/* 입문 용어 풀이 — 사주팔자/천궁도가 뭔지부터 */}
        <Explain section="intro" lang={lang} />

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
                  <b className={elClass[stemEl(S.dayMaster)]}>{S.dayMaster}</b>
                  <span>{lang === 'en' ? 'Day Master · You' : '일간 · 나'}</span>
                </div>
                <div className={s.dmBody}>{dm?.as_daymaster ?? dm?.nature ?? ''}</div>
                {/* 강점/약점은 상단 히어로에 일간+격국 종합으로 한 번만 노출(중복 제거). */}
                {dm?.career?.length ? (
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
          </details>
          {/* 쉬운 풀이 (Level 1) — 한자/십신을 평이한 한 줄로. 위 전문 그리드는 더보기 안. */}
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
          <PillarDetail pillars={S.pillars} lang={lang} />
          <div className={s.row2}>
            <div>
              <div className={s.subcap}>{t('shinsalCap')}</div>
              <div className={s.chips}>
                {[...S.natalShinsal]
                  .sort((a, b) => (b.polarity ?? 0) - (a.polarity ?? 0))
                  .map((sh, i) => {
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
                {ilju.career && (
                  <div className={s.themeReason} style={{ marginTop: 4 }}>
                    <b>{t('geokCareer')}</b> {ilju.career}
                  </div>
                )}
                {ilju.love && (
                  <div className={s.themeReason} style={{ marginTop: 4 }}>
                    <b>{t('geokLove')}</b> {ilju.love}
                  </div>
                )}
              </div>
            </>
          )}
          <InteractionDetail shinsal={S.natalShinsal} relations={S.natalRelations} lang={lang} />
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
                {(S.rooted !== undefined || (S.gongmang && S.gongmang.length) || S.johuYongsin) && (
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
                {/* 오행 카운트는 펜타곤 꼭짓점에 이미 표시되므로 텍스트 반복 제거(중복 제거). */}
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
              {/* 강점/약점은 상단 히어로에 종합되어 있어 카드에서는 생략(중복 제거). */}
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
          <ElementsDetail saju={S} lang={lang} />
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
          <Explain section="s03" lang={lang} />
          <div className={s.gridChart}>
            <div className={`${s.card} ${s.wheelCard}`}>
              <Wheel astro={A} lang={lang} />
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
                            planetHover(p.name, lang),
                            p.house ? houseHover(p.house, lang) : '',
                          ]
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
                <div className={s.miniLegend}>
                  <b>℞</b>
                  {t('retroLegend')}
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
                  glyph: 'Asc',
                  label: lang === 'en' ? 'Rising' : '상승',
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
                        core: getPlanetCore(nm, lang),
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
                    {(() => {
                      // 점성 해석 — 행성(역할) × 별자리(색) × 하우스(무대)를 한 문장으로.
                      const tr = SIGN_TRAIT[abbr(cd.sign)]
                      const sgn = signLabel(abbr(cd.sign), lang)
                      const h = cd.house ? getHouseRich(cd.house as HouseNumber, lang) : null
                      const dom = h ? h.domain.split('·')[0].trim() : ''
                      if (!tr) return null
                      const ord = (n: number) => {
                        const v = n % 100
                        const suf =
                          v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'
                        return `${n}${suf}`
                      }
                      const read =
                        lang === 'en'
                          ? `In ${sgn}, your ${cd.label} comes through ${tr.en}` +
                            (h
                              ? `, and plays out mainly in the ${ord(cd.house)} house of ${dom}.`
                              : '.')
                          : `${sgn} 자리라 ${cd.label}이 ${tr.ko} 색으로 드러나` +
                            (h ? `고, ${cd.house}하우스(${dom}) 무대에서 주로 펼쳐져요.` : '요.')
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
          />
          <HouseDetail astro={A} lang={lang} />
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
            </details>
          </div>
          <AspectDetail astro={A} lang={lang} />
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
            <Explain section="s05" lang={lang} />
            {/* 종합 문장은 상단 히어로로 이동(중복 제거). 여기선 톤 분포 막대만. */}
            {/* 교차 그림 — 톤 분포(잘맞음/채워줌/부딪힘) 한눈에. */}
            {(() => {
              const counts = { resonant: 0, complement: 0, tension: 0, neutral: 0 }
              cross.rows.forEach((r) => {
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
            <div className={s.themes}>
              {cross.rows.map((r, i) => (
                <div className={s.theme} key={i} style={{ ['--tc' as string]: TONE_COLOR[r.tone] }}>
                  <div className={s.themeHead}>
                    <span className={s.themeName}>{r.category}</span>
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
            {/* 💡 실천 — 진단을 처방으로 (Opus: 그래서 어떻게). */}
            {(() => {
              // 카르마류(공망/카르마·성장 방향)는 '강점 코어'도 '충돌'도 아닌 평생 숙제
              // 축이라 별도 줄로 뺀다 — 코어 버킷에 섞이면 "브랜딩 중심축으로" 같은
              // 엉뚱한 처방이 붙는다.
              const KARMA = new Set([
                '공망/카르마',
                '성장 방향',
                'Void / Karma',
                'Growth Direction',
              ])
              const reson = cross.rows
                .filter((r) => r.tone === 'resonant' && !KARMA.has(r.category))
                .map((r) => r.category)
              const tens = cross.rows
                .filter((r) => r.tone === 'tension' && !KARMA.has(r.category))
                .map((r) => r.category)
              const karma = cross.rows.filter((r) => KARMA.has(r.category)).map((r) => r.category)
              return (
                <div className={s.crossAdvice}>
                  <div className={s.crossAdviceHead}>
                    {lang === 'en' ? '💡 How to live with it' : '💡 이렇게 살면 좋아요'}
                  </div>
                  <ul className={s.crossAdviceList}>
                    {reson.length > 0 && (
                      <li>
                        <b>{lang === 'en' ? 'Core' : '정체성 코어'}</b>{' '}
                        {lang === 'en' ? 'East and West agree on ' : '동·서양이 똑같이 가리키는 '}
                        <b>{reson.join(' · ')}</b>
                        {lang === 'en'
                          ? ' — two systems converging means this is your most unshakable core. Make it the center of your work and brand.'
                          : '은(는) 두 점술이 독립적으로 합의한 지점 — 가장 흔들리지 않는 정체성 코어예요. 직업·브랜딩의 중심축으로 삼으세요.'}
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
                        {lang === 'en' ? '' : '동·서양이 똑같이 "스스로 채워야 한다"고 짚는 '}
                        <b>{karma.join(' · ')}</b>
                        {lang === 'en'
                          ? ' — both systems flag this as not-given, to be built by hand. Fill it in small, steady steps over the years.'
                          : '은(는) 타고나는 게 아니라 직접 만들어가는 영역 — 조급해 말고 해마다 조금씩 채워가면 가장 단단한 자산이 돼요.'}
                      </li>
                    )}
                  </ul>
                </div>
              )
            })()}
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
