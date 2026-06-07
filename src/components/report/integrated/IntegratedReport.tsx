'use client'

/**
 * 통합 명식 리포트 — chart.zip 종이질감 껍데기 + 우리 엔진/데이터.
 * 5섹션: 사주명식 · 오행/용신 · 천궁도 · 어스펙트 · 통합테마(natalCross 교차).
 */
import React from 'react'
import s from './IntegratedReport.module.css'
import {
  type ReportData,
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

// 교차 tone → 테마카드 색·라벨
const TONE: Record<CrossRow['tone'], { color: string; label: string }> = {
  resonant: { color: 'var(--el-wood)', label: '잘 맞아요' },
  complement: { color: 'var(--gold)', label: '서로 채워줘요' },
  tension: { color: 'var(--el-fire)', label: '부딪혀요' },
  neutral: { color: 'var(--ink-3)', label: '따로따로' },
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
function Wheel({ astro }: { astro: ReportData['astro'] }) {
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
          />
        )
      })}
      {/* 행성 */}
      {planetsSorted.map((p) => {
        const [px, py] = polar(cx, cy, rPlanet, screen(p.lon))
        return (
          <g key={p.name}>
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
function AspectGrid({ astro }: { astro: ReportData['astro'] }) {
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
              const koRow = astro.planets.find((p) => p.name === row)?.ko ?? row
              const koCol = astro.planets.find((p) => p.name === col)?.ko ?? col
              const friendly = ASPECT_FRIENDLY[a.type]
              const tooltip = friendly
                ? `${koRow} ↔ ${koCol}: ${friendly.label}\n${friendly.tooltip} · orb ${a.orb.toFixed(1)}°`
                : `${koRow} ↔ ${koCol}: ${meta?.ko ?? a.type} · orb ${a.orb.toFixed(1)}°`
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
export function IntegratedReport({ data, cross }: IntegratedReportProps) {
  const { input, saju: S, astro: A } = data
  const pillarsArr: Array<
    ['시' | '일' | '월' | '년', ReportData['saju']['pillars'][keyof ReportData['saju']['pillars']]]
  > = [
    ['시', S.pillars.hour],
    ['일', S.pillars.day],
    ['월', S.pillars.month],
    ['년', S.pillars.year],
  ]
  const feMax = Math.max(1, ...Object.values(S.fiveElements))
  const strengthPct = S.strength === 'strong' ? 76 : S.strength === 'weak' ? 28 : 52

  return (
    <div className={s.report}>
      <div className={s.wrap}>
        {/* 헤더 */}
        <header className={s.reportHead}>
          <div className={s.rhLeft}>
            <div className={s.eyebrow}>四柱 × 占星 · Integrated Reading</div>
            <h1>
              통합 <span className={s.accent}>명식</span> 리포트
            </h1>
            <div className={s.sub}>사주 명식과 출생 천궁도를 하나의 평면에서 교차 분석</div>
          </div>
          <div className={s.rhRight}>
            <div>
              {input.name} · <b>{input.gender === 'male' ? '남' : '여'}</b>
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
            ['출생', `${input.calendar} ${input.date.replace(/-/g, '.')} · ${input.time}`],
            ['장소', input.place],
            ['좌표', `${input.lat}°N · ${input.lng}°E`],
            ['표준시', input.timeZone],
            ['하우스', `${A.houseSystem} · ${A.sect === 'day' ? '주간' : '야간'}`],
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
              사주 명식<span className={s.han}>四柱命式</span>
            </span>
            <span className={s.secEn}>Four Pillars</span>
          </div>
          <div className={s.pillars}>
            {pillarsArr.map(([head, p]) => (
              <div className={`${s.pillar} ${p.isDay ? s.isDay : ''}`} key={head}>
                <div className={s.pillarHead}>{head}</div>
                <div className={`${s.sib} ${s.sibTop}`}>{p.sibsinStem}</div>
                <div className={s.gz}>
                  <div className={`${s.gzHan} ${elClass[stemEl(p.stem)]}`}>{p.stem}</div>
                </div>
                <div className={`${s.gz} ${s.branch}`}>
                  <div className={`${s.gzHan} ${elClass[branchEl(p.branch)]}`}>{p.branch}</div>
                </div>
                <div className={s.sib}>{p.sibsinBranch}</div>
                <div className={s.jjg}>
                  {p.jijanggan.map((j, i) => (
                    <div className={s.jjgI} key={i}>
                      <b className={elClass[stemEl(j.g)]}>{j.g}</b>
                      <i>{j.d}</i>
                    </div>
                  ))}
                </div>
                <div className={s.stage}>{p.twelveStage}</div>
              </div>
            ))}
          </div>
          <div className={s.row2}>
            <div>
              <div className={s.subcap}>신살 · 神煞</div>
              <div className={s.chips}>
                {S.natalShinsal.map((sh, i) => (
                  <span
                    className={`${s.chip} ${sh.polarity > 0 ? s.pos : sh.polarity < 0 ? s.neg : s.neu}`}
                    key={i}
                  >
                    <b>{sh.ko}</b>
                    <i>
                      {sh.pillar}
                      {sh.sub ? `·${sh.sub}` : ''}
                    </i>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className={s.subcap}>본명 합충형파</div>
              <div className={s.relations}>
                {S.natalRelations.map((r, i) => (
                  <div
                    className={`${s.rel} ${r.tone === 'pos' ? s.relPos : r.tone === 'neg' ? s.relNeg : ''}`}
                    key={i}
                  >
                    <b>{r.type}</b>
                    {r.detail}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={s.subcap} style={{ marginTop: 24 }}>
            대운 · 大運
          </div>
          <div className={s.daeun}>
            {S.daeun.map((d) => (
              <div className={`${s.du} ${d.current ? s.duNow : ''}`} key={d.age}>
                <div className={s.duAge}>{d.age}</div>
                <div className={s.duGz}>
                  <b className={elClass[stemEl(d.stem)]}>{d.stem}</b>
                  <b className={elClass[branchEl(d.branch)]}>{d.branch}</b>
                </div>
                <div className={s.duSib}>{d.sibsin}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 오행과 용신 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>02</span>
            <span className={s.secTitle}>
              오행과 용신<span className={s.han}>五行·用神</span>
            </span>
            <span className={s.secEn}>Elements & Balance</span>
          </div>
          <div className={s.gridElem}>
            <div className={`${s.card} ${s.cardPad}`}>
              <div className={s.subcap}>오행 분포</div>
              <Pentagon fe={S.fiveElements} />
            </div>
            <div className={`${s.card} ${s.cardPad} ${s.elemSide}`}>
              <div>
                <div className={s.subcap}>신강 · 신약</div>
                <div className={s.gaugeHead}>
                  <span>
                    일간 {S.dayMaster} · {S.geokguk}
                  </span>
                  <b>
                    {S.strength === 'strong' ? '신강' : S.strength === 'weak' ? '신약' : '중화'}
                  </b>
                </div>
                <div className={s.gauge}>
                  <div className={s.gaugeFill} style={{ width: `${strengthPct}%` }} />
                </div>
                <div className={s.gaugeScale}>
                  <i>신약</i>
                  <i>중화</i>
                  <i>신강</i>
                </div>
                {/* 회색 3 셀 (RAW_DISTRIBUTION v5.4): 통근 / 공망 / 조후 — 정통
                    사주 보조 정보. 한 줄 노출 + title 툴팁. 없으면 자동 생략. */}
                {(S.rooted !== undefined || (S.gongmang && S.gongmang.length) || S.johuYongsin) && (
                  <div className={s.gaugeScale} style={{ marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
                    {S.rooted !== undefined && (
                      <i
                        title={
                          S.rooted
                            ? '통근 — 일간의 오행이 지지 지장간에 박혀있음. 일간 강도 보강.'
                            : '무근 — 일간 오행이 지지에 박혀있지 않음. 강도 약화 요인.'
                        }
                      >
                        {S.rooted ? '뿌리 ✓' : '뿌리 ✗'}
                      </i>
                    )}
                    {S.gongmang && S.gongmang.length > 0 && (
                      <i title="공망 — 일주 60갑자 그룹에서 비어있는 지지 2개. 해당 지지의 작용이 약함.">
                        공망 {S.gongmang.join(' · ')}
                      </i>
                    )}
                    {S.johuYongsin && (
                      <i
                        className={elClass[S.johuYongsin.primary]}
                        title={`조후용신 — 계절 균형 관점의 보조 용신. 긴급도 ${S.johuYongsin.rating}/5.`}
                      >
                        조후 {ELEMENTS[S.johuYongsin.primary]?.han ?? S.johuYongsin.primary}
                        {S.johuYongsin.rating >= 4 && ' ⚡'}
                      </i>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className={s.subcap}>용신 · 희신 · 기신</div>
                <div className={s.yongRow}>
                  <span className={s.yongLab}>용신</span>
                  <span className={`${s.yong} ${s.yongPri} ${elClass[S.yongsin.primary]}`}>
                    {ELEMENTS[S.yongsin.primary]?.han}
                    <i>{ELEMENTS[S.yongsin.primary]?.ko}</i>
                  </span>
                  {S.yongsin.secondary && (
                    <span className={`${s.yong} ${s.yongSec} ${elClass[S.yongsin.secondary]}`}>
                      {ELEMENTS[S.yongsin.secondary]?.han}
                      <i>{ELEMENTS[S.yongsin.secondary]?.ko}</i>
                    </span>
                  )}
                </div>
                <div className={s.yongRow}>
                  <span className={s.yongLab}>기신</span>
                  {S.yongsin.avoid.map((a) => (
                    <span className={`${s.yong} ${s.yongAvo} ${elClass[a]}`} key={a}>
                      {ELEMENTS[a]?.han}
                      <i>{ELEMENTS[a]?.ko}</i>
                    </span>
                  ))}
                </div>
                <div className={s.gaugeScale} style={{ marginTop: 8 }}>
                  {(['wood', 'fire', 'earth', 'metal', 'water'] as const).map((k) => (
                    <i key={k} className={elClass[k]}>
                      {ELEMENTS[k].ko} {S.fiveElements[k]}
                    </i>
                  ))}
                  <i style={{ color: 'var(--ink-4)' }}>/ max {feMax}</i>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 03 천궁도 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>03</span>
            <span className={s.secTitle}>
              출생 천궁도<span className={s.han}>本命 天宮圖</span>
            </span>
            <span className={s.secEn}>Natal Chart</span>
          </div>
          <div className={s.gridChart}>
            <div className={`${s.card} ${s.wheelCard}`}>
              <Wheel astro={A} />
            </div>
            <div>
              <div className={`${s.card} ${s.cardPad}`}>
                <div className={s.subcap}>행성 위치 · Planets</div>
                <table className={s.planetTable}>
                  <tbody>
                    {[
                      ...A.planets,
                      ...A.extraPoints.map((e) => ({ ...e, retro: false, speed: 0 })),
                    ].map((p) => (
                      <tr key={p.name}>
                        <td className={s.plG}>{p.glyph}</td>
                        <td className={s.plN}>
                          {p.ko}
                          <i>{p.name}</i>
                        </td>
                        <td className={`${s.plS} ${elClass[SIGN_META[abbr(p.sign)]?.el]}`}>
                          {SIGN_META[abbr(p.sign)]?.glyph} {SIGN_META[abbr(p.sign)]?.ko}
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
                  <span>Sect</span>
                  <b>{A.sect === 'day' ? '주간 (晝)' : '야간 (夜)'}</b>
                </div>
                <div className={s.axisItem}>
                  <span>House</span>
                  <b>{A.houseSystem}</b>
                </div>
              </div>
              <div className={s.daeun} style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
                {A.houses.slice(0, 6).map((h) => (
                  <div className={s.du} key={h.i}>
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
        </section>

        {/* 04 어스펙트 */}
        <section className={s.section}>
          <div className={s.secHead}>
            <span className={s.secNum}>04</span>
            <span className={s.secTitle}>
              어스펙트<span className={s.han}>行星 角度</span>
            </span>
            <span className={s.secEn}>Aspects</span>
          </div>
          <div className={s.gridAsp}>
            <div>
              <div className={s.aspLegend}>
                <span
                  className={`${s.leg} ${s.legSoft}`}
                  title={`${ASPECT_FRIENDLY.trine.tooltip} / ${ASPECT_FRIENDLY.sextile.tooltip}`}
                >
                  <b>△</b>잘 흘러요·도와줘요
                </span>
                <span
                  className={`${s.leg} ${s.legHard}`}
                  title={`${ASPECT_FRIENDLY.square.tooltip} / ${ASPECT_FRIENDLY.opposition.tooltip}`}
                >
                  <b>□</b>부딪혀요·맞서요
                </span>
                <span
                  className={`${s.leg} ${s.legNeutral}`}
                  title={ASPECT_FRIENDLY.conjunction.tooltip}
                >
                  <b>☌</b>같이 있어요
                </span>
              </div>
              <AspectGrid astro={A} />
            </div>
            <div className={`${s.card} ${s.cardPad} ${s.digList}`}>
              <div className={s.subcap}>위계 · Dignities</div>
              {A.dignities.length === 0 && (
                <div className={s.digRow} style={{ color: 'var(--ink-3)' }}>
                  뚜렷한 위계 없음 — 행성이 모두 중립(peregrine) 자리예요.
                </div>
              )}
              {A.dignities.map((d, i) => {
                const p = A.planets.find((x) => x.name === d.planet)
                const sg = SIGN_META[abbr(d.sign)]
                const friendly = DIGNITY_TIER_FRIENDLY[d.tier] ?? DIGNITY_TIER_LABEL[d.tier]
                const tooltip = DIGNITY_TIER_TOOLTIP[d.tier] ?? DIGNITY_TIER_LABEL[d.tier]
                return (
                  <div className={s.digRow} key={i} title={tooltip}>
                    <span className={s.dg}>{p?.glyph}</span>
                    <span className={s.dn}>{p?.ko}</span>
                    <span className={elClass[sg?.el]} style={{ fontSize: 11.5 }}>
                      {sg?.ko}자리
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
                통합 교차<span className={s.han}>交叉 統合</span>
              </span>
              <span className={s.secEn}>Cross-System</span>
            </div>
            {cross.synthesis && (
              <div className={s.synthBanner}>
                <div className={s.synthK}>🧬 종합 정체성</div>
                <div className={s.synthV}>{cross.synthesis}</div>
              </div>
            )}
            <div className={s.themes}>
              {cross.rows.map((r, i) => {
                const t = TONE[r.tone]
                return (
                  <div className={s.theme} key={i} style={{ ['--tc' as string]: t.color }}>
                    <div className={s.themeHead}>
                      <span className={s.themeName}>{r.category}</span>
                      <span className={s.themeBadge}>{t.label}</span>
                    </div>
                    {(r.left || r.right) && (
                      <div className={s.themeCross}>
                        <div className={s.themeSide}>
                          <div className={s.themeSideK}>사주</div>
                          <div className={s.themeSideV}>{r.left}</div>
                        </div>
                        <div className={s.themeSide}>
                          <div className={s.themeSideK}>점성</div>
                          <div className={s.themeSideV}>{r.right}</div>
                        </div>
                      </div>
                    )}
                    <div className={s.themeReason}>{r.reason}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className={s.foot}>
          <span>四柱命理 × Tropical Natal · {A.houseSystem} House System</span>
          <span className={s.mono}>껍데기 chart.zip · 두뇌 natalCross</span>
        </div>
      </div>
    </div>
  )
}
