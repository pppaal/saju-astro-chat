'use client'

// destinypal · LifetimeTier
//
// Ported from destinypal-extracted/js/tiers/lifetime.jsx (181 lines)
// — preserved structure (intro / constellation 4 nodes / now-stage detail /
//   daewoon spine / hapchung·shinsal·unseong cards / outer chip row /
//   milestones timeline / dive button)
// — added Phase 3 enrichments (sect row / gyeokguk·root status chips /
//   outer-row 7 kinds / all-stages detail cards / NatalLotsRow /
//   ZR L1 carousel).
// Light-tone (ink-on-hanji) palette. Uses inline primitives
// (Ganji / ScoreOrb / ElementBars / LayerTag) gated by local stubs.

import type { CSSProperties, ReactNode } from 'react'
import { SIGN_KO } from '@/lib/astrology/signLabels'

import type {
  DestinyArabicLot,
  DestinyLifeStage,
  DestinyLifetime,
  DestinyUserSummary,
  DestinyZRChapter,
  ElementCounts,
  Ganji as GanjiData,
} from '@/types/calendar'

import styles from './LifetimeTier.module.css'
import { TierSummary } from '@/components/calendar/atoms/TierSummary'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import { useI18n } from '@/i18n/I18nProvider'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'

// ============================================================================
// Props
// ============================================================================

export interface LifetimeTierProps {
  user: DestinyUserSummary & {
    /** 격국 상태 한 줄 — '정인격 · 반성반파 (+정인 / -재성)'. */
    gyeokgukStatus?: string
    /** 일간 통근 한 줄 — '월령 寅 실령 · 통근 얇음'. */
    rootStatus?: string
  }
  lifetime: DestinyLifetime
  onDive: () => void
}

// ============================================================================
// Inline atom stubs (Agent A 가 atoms barrel 을 deliver 하면 import 한 줄로 교체)
// ============================================================================

function Ganji({ data, size = 30, en = true }: { data: GanjiData; size?: number; en?: boolean }) {
  return (
    <span className={styles.ganji}>
      <span className={styles.hanja} style={{ fontSize: size }}>
        {data.hanja}
      </span>
      <span className={styles.kr} style={{ fontSize: Math.max(10, size * 0.32) }}>
        {data.kr}
      </span>
      {en && (
        <span className={styles.en} style={{ fontSize: Math.max(9, size * 0.28) }}>
          {data.en}
        </span>
      )}
    </span>
  )
}

// 옛 ScoreOrb — 사용자 점수/등급 표시 위젯이었으나, 그 점수 자체가 가짜
// "calculateComprehensiveScore" 의 산출물이라 2026-06-06 폐기. 사용자 호출처
// (LifetimeTier introPanel) 에서도 같이 제거.

const EL_META: Record<keyof ElementCounts, { c: string; en: string }> = {
  목: { c: 'var(--el-wood)', en: 'Wood' },
  화: { c: 'var(--el-fire)', en: 'Fire' },
  토: { c: 'var(--el-earth)', en: 'Earth' },
  금: { c: 'var(--el-metal)', en: 'Metal' },
  수: { c: 'var(--el-water)', en: 'Water' },
}

function ElementBars({ elements }: { elements: ElementCounts }) {
  const values = Object.values(elements)
  const max = Math.max(...values, 1)
  return (
    <div className={styles.elementRow}>
      {(Object.entries(elements) as Array<[keyof ElementCounts, number]>).map(([k, v]) => (
        <div
          className={styles.elBar}
          key={k}
          style={{
            height: 16 + (v / max) * 30,
            background: `linear-gradient(180deg, ${EL_META[k].c}, rgba(255,251,242,0.04))`,
            boxShadow: `0 0 12px -2px ${EL_META[k].c}`,
          }}
        >
          <span style={{ color: EL_META[k].c }}>{k}</span>
          <small>{v}</small>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// LifeCurve — 인생 운세 기복 곡선 (대운별 favor −2~+2 를 0→84세 축에).
// 히트맵 색 언어: 좋음=쪽빛, 주의=주황·적, 중립=옅게. 지금 나이 마커.
// ============================================================================
function LifeCurve({
  daeun,
  nowAge,
  ko,
}: {
  daeun: Array<{ startAge: number; favor: number }>
  nowAge: number
  ko: boolean
}) {
  if (!daeun || daeun.length < 2) return null
  const W = 320
  const H = 84
  const padX = 10
  const padTop = 10
  const padBot = 18
  const ageMax = Math.max(84, daeun[daeun.length - 1].startAge + 10)
  const x = (age: number) => padX + (age / ageMax) * (W - padX * 2)
  // favor −2..+2 → y (위가 좋음). 대운은 10년 폭의 중간점에 찍는다.
  const y = (favor: number) => {
    const t = (favor + 2) / 4 // 0..1
    return padTop + (1 - t) * (H - padTop - padBot)
  }
  const pts = daeun.map((d) => ({ px: x(d.startAge + 5), py: y(d.favor), favor: d.favor }))
  // 부드러운 선 (Catmull-Rom → 베지어 근사)
  const linePath = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.px.toFixed(1)} ${p.py.toFixed(1)}`
      const prev = pts[i - 1]
      const cx = (prev.px + p.px) / 2
      return `C ${cx.toFixed(1)} ${prev.py.toFixed(1)} ${cx.toFixed(1)} ${p.py.toFixed(1)} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`
    })
    .join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].px.toFixed(1)} ${H - padBot} L ${pts[0].px.toFixed(1)} ${H - padBot} Z`
  const midY = y(0)
  const nowX = x(Math.min(nowAge, ageMax))
  const ticks = [0, 20, 40, 60, 80].filter((t) => t <= ageMax)
  return (
    <div className={styles.lifeCurveWrap}>
      <div className={styles.lifeCurveLabel}>
        {ko ? '인생 곡선 · 운세 기복' : 'Life curve · the arc of fortune'}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.lifeCurveSvg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(79,93,150,0.30)" />
            <stop offset="100%" stopColor="rgba(79,93,150,0.02)" />
          </linearGradient>
        </defs>
        {/* 중립선 */}
        <line
          x1={padX}
          y1={midY}
          x2={W - padX}
          y2={midY}
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <path d={areaPath} fill="url(#lcFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgba(79,93,150,0.9)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* 대운 점 — 좋음/주의 색 */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.px}
            cy={p.py}
            r={2.6}
            fill={p.favor > 0 ? '#4f5d96' : p.favor < 0 ? '#c0741f' : '#9aa0b4'}
          />
        ))}
        {/* 지금 */}
        <line
          x1={nowX}
          y1={padTop - 2}
          x2={nowX}
          y2={H - padBot}
          stroke="var(--dp-accent)"
          strokeWidth={1.4}
        />
        <circle cx={nowX} cy={padTop - 2} r={2.4} fill="var(--dp-accent)" />
        {/* 나이 눈금 */}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 5} className={styles.lifeCurveTick} textAnchor="middle">
            {t}
          </text>
        ))}
        <text x={nowX} y={H - 5} className={styles.lifeCurveNow} textAnchor="middle">
          {ko ? '지금' : 'now'}
        </text>
      </svg>
    </div>
  )
}

function LayerTag({ kind }: { kind: 'saju' | 'astro' }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const isSaju = kind === 'saju'
  return (
    <span className={`${styles.layerTag} ${isSaju ? styles.saju : styles.astro}`}>
      <span className={styles.pip} />{' '}
      {isSaju ? (ko ? '사주 · SAJU' : 'Saju · 四柱') : ko ? '점성 · ASTRO' : 'Astrology'}
    </span>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/** 외행성 glyph 매핑 — Phase 3 확장: 7가지 kind 모두. */
const OUTER_GLYPH: Record<string, string> = {
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  chiron: '⚷',
  progressed_moon: '☾',
  progressedMoon: '☾',
}

const OUTER_CLASS: Record<string, string> = {
  jupiter: styles.jupiter,
  saturn: styles.saturn,
  uranus: styles.uranus,
  neptune: styles.neptune,
  pluto: styles.pluto,
  chiron: styles.chiron,
  progressed_moon: styles.progressedMoon,
  progressedMoon: styles.progressedMoon,
}

/** Lot 이름 → 한자 1글자 짧은 마크. */
const LOT_MARK: Record<string, string> = {
  Fortune: '福',
  Spirit: '神',
  Eros: '愛',
  Necessity: '必',
  Courage: '勇',
  Victory: '勝',
  Nemesis: '罰',
}

/** ZR sign Korean (zodiac signs). 정본(astrology/signLabels) 재사용. */
function zodiacKo(signEn: string): string {
  return SIGN_KO[signEn] ?? signEn
}

// ============================================================================
// LifeTimeline — 사주 대운 × 점성 ZR 을 한 나이축에 평행으로 (②)
// ============================================================================
function LifeTimeline({ lifetime }: { lifetime: DestinyLifetime }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const by = lifetime.birthYear
  const dw = lifetime.daewoon ?? []
  const spirit = lifetime.zrSpiritChapters ?? []
  if (dw.length === 0 && spirit.length === 0) return null
  const ages = [
    ...dw.map((d) => d.endAge ?? d.startAge + 10),
    ...spirit.map((c) => c.calendarEndYear - by),
  ]
  const span = Math.max(85, ...ages)
  const pct = (a: number) => Math.max(0, Math.min(100, (a / span) * 100))
  const nowAge = lifetime.currentYear - by

  const seg = (
    left: number,
    width: number,
    now: boolean,
    head: string,
    sub?: string,
    key?: string
  ): ReactNode => (
    <div
      key={key}
      className={styles.tlSeg}
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: `${width}%`,
        ...(now ? { outline: '2px solid var(--dp-pos, #2dbd7f)', zIndex: 2 } : {}),
      }}
      title={`${head}${sub ? ' · ' + sub : ''}`}
    >
      <span className={styles.tlHead}>{head}</span>
      {sub ? <span className={styles.tlSub}>{sub}</span> : null}
    </div>
  )

  return (
    <div className={styles.block}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {ko ? '인생 타임라인 · 대운 × 점성' : 'Life timeline · Decades × Astrology'}
        </h2>
        <span className={styles.tiny}>
          {ko
            ? '사주 10년운과 점성 ZR 챕터를 같은 나이축에 나란히'
            : 'Saju decade luck and astro ZR chapters side by side on one age axis'}
        </span>
      </div>
      <div className={styles.tlWrap} style={{ position: 'relative' }}>
        {/* 사주 대운 */}
        <div className={styles.tlRowLabel}>{ko ? '사주 대운' : 'Saju decades'}</div>
        <div className={styles.tlTrack} style={{ position: 'relative' }}>
          {dw.map((d, i) =>
            seg(
              pct(d.startAge),
              pct((d.endAge ?? d.startAge + 10) - d.startAge),
              !!d.now,
              d.gz.hanja,
              d.sibsin !== '—' ? d.sibsin : undefined,
              `dw-${d.startAge}-${i}`
            )
          )}
        </div>
        {/* 점성 ZR (Spirit = 진로·정체) */}
        <div className={styles.tlRowLabel}>{ko ? '점성 ZR' : 'Astro ZR'}</div>
        <div className={styles.tlTrack} style={{ position: 'relative' }}>
          {spirit.map((c, i) =>
            seg(
              pct(c.calendarStartYear - by),
              pct(c.calendarEndYear - c.calendarStartYear || 1),
              !!c.now,
              zodiacKo(c.sign),
              undefined,
              `zr-${c.calendarStartYear}-${i}`
            )
          )}
        </div>
        {/* 지금 마커 */}
        <div
          className={styles.tlNow}
          style={{ position: 'absolute', left: `${pct(nowAge)}%`, top: 0, bottom: 0 }}
          aria-hidden
        />
      </div>
      <div className={styles.tlAxis}>
        {[0, Math.round(span / 3), Math.round((span * 2) / 3), span].map((a) => (
          <span key={a} style={{ position: 'absolute', left: `${pct(a)}%` }}>
            {`${a}`}
            {ko ? '세' : ' yr'}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// LifetimeTier
// ============================================================================

export function LifetimeTier({ user, lifetime, onDive }: LifetimeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const { lifeStages, daewoon, milestones, zrSpiritChapters, zrFortuneChapters } = lifetime

  // constellation node positions across the width (원본과 동일)
  const nodeX = [12, 38, 62, 88] // %
  const nodeY = [62, 38, 50, 70]

  // current life stage (Phase 3: 모든 stage detail 카드를 그릴 수 있도록 보존)
  // C5: lifeStages 빈 배열 가드 (adapter 실패 시 깨짐 방지)
  if (!lifeStages?.length) {
    return (
      <div className={styles.tier} data-screen-label="인생 84년">
        <p style={{ padding: 40, opacity: 0.6 }}>
          {ko ? '본명 정보를 불러오는 중...' : 'Loading natal data...'}
        </p>
      </div>
    )
  }
  const nowStage = lifeStages.find((s) => s.now) ?? lifeStages[1] ?? lifeStages[0]

  // C2: dominant 오행 계산 (하드코딩 "목 최다" 제거)
  const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
  const elementsEntries = Object.entries(user.elements || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  )
  const dominantEl = elementsEntries[0]?.[0]
  const elementsLabelText = dominantEl
    ? ko
      ? `사주 8자 오행 분포 — ${dominantEl}(${EL_HANJA[dominantEl] ?? dominantEl}) 최다`
      : `Eight-character element spread — ${dominantEl}(${EL_HANJA[dominantEl] ?? dominantEl}) dominant`
    : ko
      ? '사주 8자 오행 분포'
      : 'Eight-character element spread'

  // C1: astro 메타 한 줄 — 누락 세그먼트 hide
  const astroSegs = [
    user.astro?.sunEn && `Sun ${user.astro.sunEn}`,
    user.astro?.ascEn && `Asc ${user.astro.ascEn}`,
    user.astro?.mcEn && `MC ${user.astro.mcEn}`,
  ].filter(Boolean) as string[]

  // C4: rootStatus 있을 때만 "통근" 라벨, 없으면 "주십신"
  const hasRootStatus = !!user.rootStatus

  // 교차 창 — 인생 전체(출생 ~ 마지막 대운 끝). 지금±N 으로 좁히지 않아야
  // '인생 전체 흐름' tier 가 실제로 84년 호를 보여주고 10년 tier 와 안 겹친다.
  const dwList = lifetime.daewoon ?? []
  const lastDw = dwList[dwList.length - 1]
  const dwStartY = (d: DestinyLifetime['daewoon'][number]) => lifetime.birthYear + d.startAge
  const tlStart = lifetime.birthYear
  const tlEnd = lastDw ? lifetime.birthYear + lastDw.startAge + 10 : lifetime.birthYear + 90
  // 교차 구간 — 사주 사건(대운 경계·사주 매듭)과 점성 사건(회귀·ZR 챕터 경계)이
  // ±2년 내로 가까운 시기. 인접하면 하나로 병합. = 두 시스템이 동시에 꿈틀하는 때.
  const NEAR = 2
  const inWin = (y: number) => y >= tlStart - NEAR && y <= tlEnd + NEAR
  const sajuYears = [
    ...(lifetime.daewoon ?? []).map(dwStartY),
    ...lifetime.milestones.filter((m) => m.kind === 'saju').map((m) => m.year),
  ].filter(inWin)
  const astroYears = [
    ...lifetime.milestones
      .filter((m) => m.kind !== 'daewoon' && m.kind !== 'saju')
      .map((m) => m.year),
    ...(lifetime.zrSpiritChapters ?? []).map((c) => c.calendarStartYear),
  ].filter(inWin)
  const rawCross: Array<[number, number]> = []
  for (const sy of sajuYears) {
    for (const ay of astroYears) {
      if (Math.abs(ay - sy) <= NEAR) rawCross.push([Math.min(sy, ay), Math.max(sy, ay)])
    }
  }
  const crossings: Array<{ startYear: number; endYear: number }> = []
  for (const [s, e] of rawCross
    .map(([s, e]) => [Math.max(s, tlStart), Math.min(e, tlEnd)] as [number, number])
    .filter(([s, e]) => e >= s)
    .sort((a, b) => a[0] - b[0])) {
    const last = crossings[crossings.length - 1]
    if (last && s <= last.endYear + 1) last.endYear = Math.max(last.endYear, e)
    else crossings.push({ startYear: s, endYear: e })
  }

  // ── 교차 리스트 — "언제 · 무엇이 교차 · 근거" 한 줄씩. 캘린더의 본질. ──
  const evHead = (label: string) => (label.includes('—') ? label.split('—')[0].trim() : label)
  const evWhy = (label: string) =>
    label.includes('—') ? label.split('—').slice(1).join('—').trim() : ''
  const crossingItems: Array<{
    sort: number
    when: string
    title: string
    detail?: string
    now?: boolean
    past?: boolean
  }> = []
  for (const c of crossings) {
    const near = (y: number) => y >= c.startYear - 1 && y <= c.endYear + 1
    const sj = lifetime.milestones.filter(
      (m) => (m.kind === 'daewoon' || m.kind === 'saju') && near(m.year)
    )
    const as = lifetime.milestones.filter(
      (m) => m.kind !== 'daewoon' && m.kind !== 'saju' && near(m.year)
    )
    const all = [...sj, ...as]
    if (all.length === 0) continue
    // '×' 는 사주·점성 *양쪽* 마디가 실제로 있을 때만 — 한쪽뿐이면 '·' 병기
    // (단일 시스템 마디를 교차로 과장하지 않기, Day tier 와 같은 원칙).
    const bothSystems = sj.length > 0 && as.length > 0
    crossingItems.push({
      sort: c.startYear,
      when: c.startYear === c.endYear ? `${c.startYear}` : `${c.startYear}–${c.endYear}`,
      title: all
        .map((m) => evHead(m.label))
        .slice(0, 3)
        .join(bothSystems ? ' × ' : ' · '),
      detail: all.map((m) => evWhy(m.label)).find(Boolean),
      past: c.endYear < lifetime.currentYear,
    })
  }
  // "지금" — 현재 대운 × 현재 ZR 챕터 (둘 다 지나는 중인 구간)
  const nowDw = (lifetime.daewoon ?? []).find((d) => d.now)
  const nowCh = (lifetime.zrSpiritChapters ?? []).find((c) => c.now)
  if (nowDw || nowCh) {
    crossingItems.push({
      sort: lifetime.currentYear + 0.1,
      when: `${lifetime.currentYear}`,
      title: [
        nowDw ? (ko ? `${nowDw.gz.hanja} 대운` : `${nowDw.gz.hanja} cycle`) : '',
        nowCh ? (ko ? `${zodiacKo(nowCh.sign)} 흐름` : `${nowCh.sign} chapter`) : '',
      ]
        .filter(Boolean)
        .join(' × '),
      detail: ko
        ? '지금 지나는 사주×점성 구간 — 이 흐름 안에서 위아래 교차점이 펼쳐져요.'
        : 'The Saju × Astrology window you’re in now — its crossings unfold from here.',
      now: true,
    })
  }
  crossingItems.sort((a, b) => a.sort - b.sort)

  return (
    <div className={styles.tier} data-screen-label="인생 84년">
      {/* ============================================================
          intro
      ============================================================ */}
      <div className={styles.eyebrow}>{ko ? '인생 · LIFETIME · 84년' : 'LIFETIME · 84 years'}</div>
      <h1 className={styles.display}>{ko ? '내 인생 전체 흐름' : 'My whole life'}</h1>
      <p className={`${styles.tiny} ${styles.headerMeta}`}>
        {user.birthKo} · {user.place} · {user.sex}
        {astroSegs.length > 0 ? (
          <>
            <span className={styles.pipe}>|</span>
            {astroSegs.join(' · ')}
          </>
        ) : null}
      </p>

      {/* ── 한 줄 요약 + 교차 리스트. 그게 전부. ── */}
      <TierSummary
        headline={
          (ko
            ? lifetime.lifePattern?.ko
            : (lifetime.lifePattern?.en ?? lifetime.lifePattern?.ko)) ??
          (ko ? '내 인생 흐름' : 'My life flow')
        }
        sub={
          ko
            ? lifetime.lifePattern?.line
            : (lifetime.lifePattern?.lineEn ?? lifetime.lifePattern?.line)
        }
      />
      {lifetime.lifePattern?.daeun && lifetime.lifePattern.daeun.length >= 2 && (
        <LifeCurve
          daeun={lifetime.lifePattern.daeun}
          nowAge={lifetime.currentYear - lifetime.birthYear}
          ko={ko}
        />
      )}
      <CrossingList
        heading={ko ? '인생의 큰 마디 · 사주와 점성' : 'Life’s major turns · Saju & Astrology'}
        items={crossingItems}
      />

      {/* ── 전문가용 상세 — 사주 원국·대운·신살·12운성·점성 일체를 접어 둔다. ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세히 보기 · 사주 원국과 근거' : 'Details · natal chart & evidence'}
        </summary>

        {/* 공유용 정체성 카드 (③) — 기존 데이터(일간·격국·인생유형·점성) 압축. */}
        {lifetime.lifePattern && (
          <div className={styles.idCard}>
            <div className={styles.idCardRow}>
              <span className={styles.idCardHan}>{user.ilgan.hanja}</span>
              <div className={styles.idCardMeta}>
                <div className={styles.idCardType}>{lifetime.lifePattern.ko}</div>
                <div className={styles.idCardSub}>
                  {ko
                    ? `${user.ilgan.kr} 일간 · ${user.gyeokguk}`
                    : `${user.ilgan.kr} day master · ${user.gyeokguk}`}
                  {user.astro?.sun ? ` · ☉${user.astro.sun}` : ''}
                </div>
              </div>
            </div>
            <p className={styles.idCardLine}>{lifetime.lifePattern.line}</p>
          </div>
        )}

        <div className={styles.introGrid}>
          <div>
            <p className={styles.lead}>{user.intro}</p>
            <p className={`${styles.lead} ${styles.leadEn}`}>{user.introEn}</p>
            {/* Sect/Lord-of-Asc 행 제거 — 정적 본명 메타(헬레니즘 섹트)는 타이밍
              흐름과 무관, 리포트(본명 해설)감이라 흐름에서 뺀다. */}
          </div>

          <div className={`${styles.panel} ${styles.introPanel}`}>
            <div className={styles.introPanelSide}>
              <div className={styles.idChips}>
                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '일간' : 'Day master'}</span>
                  <span className={styles.han}>{user.ilgan.hanja}</span>
                  <span className={styles.v}>{user.ilgan.kr}</span>
                </span>

                {/* ── Phase 3 보강 ②: 격국 chip → gyeokgukStatus ── */}
                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '격국' : 'Structure'}</span>
                  <span className={styles.v}>{user.gyeokgukStatus ?? user.gyeokguk}</span>
                </span>

                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '용신' : 'Yongsin'}</span>
                  <span className={styles.han}>{user.yongsin.hanja}</span>
                </span>
                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '강약' : 'Strength'}</span>
                  <span className={styles.v}>{user.gangyak}</span>
                </span>

                {/* ── Phase 3 보강 ③: 재성 chip → rootStatus (C4: 라벨 조건부) ── */}
                <span className={styles.chip}>
                  <span className={styles.k}>
                    {hasRootStatus ? (ko ? '통근' : 'Rooted') : ko ? '주십신' : 'Main god'}
                  </span>
                  <span className={styles.v}>
                    {user.rootStatus ?? `${user.dominantSibsin.name} ${user.dominantSibsin.pct}%`}
                  </span>
                </span>
              </div>

              <div className={styles.elementsWrap}>
                <div className={`${styles.tiny} ${styles.elementsLabel}`}>{elementsLabelText}</div>
                <ElementBars elements={user.elements} />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
          인생 유형 — 신강약 기준 대운 흐름 (대기만성/초년발복/…)
      ============================================================ */}
        {lifetime.lifePattern && (
          <div className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {ko
                  ? `인생 유형 · ${lifetime.lifePattern.ko}`
                  : `Life type · ${lifetime.lifePattern.en ?? lifetime.lifePattern.ko}`}
              </h2>
              <span className={styles.tiny}>
                {ko ? '신강약 기준 대운 흐름' : 'Decade flow by day-master strength'}
              </span>
            </div>
            <p className={styles.lead}>{lifetime.lifePattern.line}</p>
            <div className={styles.daewoonRow}>
              {lifetime.lifePattern.daeun.map((d, i) => (
                <span className={styles.daewoonCell} key={`${d.startAge}-${i}`}>
                  <span className={styles.tiny}>{d.startAge}</span>
                  <span aria-hidden>{d.favor > 0 ? '↑' : d.favor < 0 ? '↓' : '·'}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 대운 × 점성(ZR) 평행 타임라인 (②) */}
        <LifeTimeline lifetime={lifetime} />

        {/* ============================================================
          constellation of life stages
      ============================================================ */}
        <div className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {ko ? '네 시기의 별자리' : 'The stars of four eras'}
            </h2>
            <span className={styles.tiny}>
              {ko ? '0 → 84세 · 대운 10년 주기' : '0 → 84 yrs · 10-year decades'}
            </span>
          </div>

          <div className={styles.constellation}>
            <svg
              className={styles.constSvg}
              viewBox="0 0 100 150"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* connecting line */}
              <polyline
                points={nodeX.map((x, i) => `${x},${nodeY[i]}`).join(' ')}
                fill="none"
                stroke="rgba(52,64,111,0.45)"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 1.5"
              />
              {lifeStages.map((s, i) => (
                <g key={s.id}>
                  <circle
                    cx={nodeX[i] ?? 50}
                    cy={nodeY[i] ?? 50}
                    r={s.now ? 3.2 : 2}
                    fill={s.now ? 'var(--ember)' : 'var(--bg-3)'}
                    stroke={s.now ? 'var(--ember-2)' : 'var(--ink-faint)'}
                    strokeWidth={s.now ? 1 : 0.6}
                    vectorEffect="non-scaling-stroke"
                    style={s.now ? { filter: 'drop-shadow(0 0 5px var(--ember-glow))' } : undefined}
                  />
                  {s.now && (
                    <circle
                      cx={nodeX[i] ?? 50}
                      cy={nodeY[i] ?? 50}
                      r="5.5"
                      fill="none"
                      stroke="var(--ember)"
                      strokeWidth="0.4"
                      opacity="0.55"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className={styles.stageCards}>
            {lifeStages.map((s) => (
              <div
                key={s.id}
                className={`${styles.stageCard} ${s.now ? styles.now : ''}`}
                onClick={s.now ? onDive : undefined}
                role={s.now ? 'button' : undefined}
                tabIndex={s.now ? 0 : undefined}
                onKeyDown={
                  s.now
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onDive()
                        }
                      }
                    : undefined
                }
              >
                {s.now && <span className={styles.nowtag}>{ko ? '지금 · NOW' : 'now · NOW'}</span>}
                <div className={styles.nm}>{s.name}</div>
                <div className={styles.age}>
                  {ko
                    ? `${s.ageFrom}–${s.ageTo}세 · ${s.yearFrom}–${s.yearTo}`
                    : `${s.ageFrom}–${s.ageTo} yrs · ${s.yearFrom}–${s.yearTo}`}
                </div>
                <div className={styles.tone}>{s.tone}</div>
                {s.now && (
                  <div className={styles.diveHint}>
                    {ko ? '탭하면 올해로 줌인 ↘' : 'Tap to zoom into this year ↘'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================
          stage detail blocks
          (원본: 청년기 detail 만. Phase 3 보강 ④: detail 있는 모든 stage)
      ============================================================ */}
        {lifeStages
          .filter((s) => s.detail !== null)
          .map((stage) => (
            <StageDetailBlock
              key={stage.id}
              stage={stage}
              daewoon={daewoon}
              isCurrent={stage.id === nowStage?.id}
            />
          ))}

        {/* ============================================================
          Phase 3 보강 ⑥: Natal Lots row
      ============================================================ */}
        {user.lots && user.lots.length > 0 && <NatalLotsRow lots={user.lots} />}

        {/* ============================================================
          Phase 3 보강 ⑦: ZR L1 carousel (Spirit / Fortune)
      ============================================================ */}
        {(zrSpiritChapters?.length > 0 || zrFortuneChapters?.length > 0) && (
          <ZRCarousel spirit={zrSpiritChapters ?? []} fortune={zrFortuneChapters ?? []} />
        )}

        {/* ============================================================
          운명의 전환기 — 지난 5년 → 앞으로 10년 (세로 작대기 창)
          프리미엄 LifetimeView 의 windowed pivot 뷰 포팅. 기존 가로 "분기점
          타임라인"(전 생애)과 별개로, *근미래에 집중한* 세로 타임라인.
      ============================================================ */}
        {(() => {
          const nowYear = lifetime.currentYear
          const win = milestones
            .filter((m) => m.year >= nowYear - 5 && m.year <= nowYear + 10)
            .sort((a, b) => a.year - b.year)
          if (win.length === 0) return null
          // 하이라이트 = 올해 또는 가장 가까운 다가오는 전환점. 없으면 마지막.
          const hi = (() => {
            const i = win.findIndex((m) => m.year >= nowYear)
            return i === -1 ? win.length - 1 : i
          })()
          const sysOf = (k: string) =>
            k === 'saju' || k === 'daewoon' ? (ko ? '사주' : 'Saju') : ko ? '점성' : 'Astrology'
          return (
            <div className={styles.pivots}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{ko ? '운명의 전환기' : 'Turning points'}</h2>
                <span className={styles.tiny}>
                  {ko ? '지난 5년 → 앞으로 10년' : 'Past 5 yrs → next 10 yrs'}
                </span>
              </div>
              <div className={styles.pivotList}>
                {win.map((m, idx) => {
                  const past = m.year < nowYear
                  const highlight = idx === hi
                  const [titleRaw, ...rest] = m.label.split('—')
                  const meaning = rest.join('—').trim()
                  return (
                    <div
                      key={`pv-${m.year}-${idx}`}
                      className={`${styles.pivot} ${past ? styles.pivotPast : ''} ${
                        highlight ? styles.pivotNow : ''
                      }`}
                    >
                      <span className={styles.pivotDot} />
                      <div className={styles.pivotHead}>
                        <span className={styles.pivotYear}>
                          {m.year}
                          <small>
                            {' '}
                            · {m.age}
                            {ko ? '세' : ' yrs'}
                          </small>
                        </span>
                        <span className={styles.pivotSys}>{sysOf(m.kind)}</span>
                        {past && (
                          <span className={styles.pivotTag}>{ko ? '지난 시기' : 'past'}</span>
                        )}
                        {highlight && (
                          <span className={styles.pivotTagNow}>
                            {m.year === nowYear
                              ? ko
                                ? '올해'
                                : 'this year'
                              : ko
                                ? '다가오는 시기'
                                : 'upcoming'}
                          </span>
                        )}
                      </div>
                      <div className={styles.pivotTitle}>{titleRaw.trim()}</div>
                      {meaning && <div className={styles.pivotMeaning}>{meaning}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ============================================================
          milestone timeline
      ============================================================ */}
        <div className={styles.miles}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{ko ? '분기점 타임라인' : 'Pivot timeline'}</h2>
            <span className={styles.tiny}>
              {ko ? '사주 · 점성 수렴 마디' : 'Saju · Astrology convergence points'}
            </span>
          </div>
          <div className={styles.mileTrack}>
            {milestones.map((m, i) => (
              <div key={`${m.year}-${i}`} className={`${styles.mile} ${m.now ? styles.now : ''}`}>
                <span className={styles.node} />
                <span className={styles.yr}>
                  {m.year}
                  <small>
                    {m.age}
                    {ko ? '세' : ' yrs'}
                  </small>
                </span>
                <span className={styles.lab}>
                  {m.label}
                  {m.now && <span className={styles.nowMark}>{ko ? '← 지금' : '← now'}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </details>

      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive} type="button">
          {ko ? `올해 ${lifetime.currentYear}으로 줌인` : `Zoom in to ${lifetime.currentYear}`}{' '}
          <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 보강 ①: Sect Row
// ============================================================================

// (SectRow / ascSignRuler 제거됨 — 정적 헬레니즘 섹트 메타는 타이밍 흐름과
//  무관, 리포트감이라 흐름 화면에서 뺀다.)

// ============================================================================
// Stage detail block (원본 youth-detail 섹션 + Phase 3: 모든 detail stage)
// ============================================================================

function StageDetailBlock({
  stage,
  daewoon,
  isCurrent,
}: {
  stage: DestinyLifeStage
  daewoon: DestinyLifetime['daewoon']
  isCurrent: boolean
}) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const detail = stage.detail
  if (!detail) return null

  // 이 stage 범위에 걸치는 대운만 추림 (전부 그리면 과부하)
  const stageDaewoon = daewoon.filter((dw) => dw.end > stage.yearFrom && dw.start <= stage.yearTo)

  const headerNote = isCurrent
    ? ko
      ? '지금의 결'
      : 'The grain of now'
    : ko
      ? `${stage.ageFrom}–${stage.ageTo}세 · ${stage.yearFrom}–${stage.yearTo}`
      : `${stage.ageFrom}–${stage.ageTo} yrs · ${stage.yearFrom}–${stage.yearTo}`

  return (
    <div className={styles.stageDetail}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {stage.name} — {headerNote}
        </h2>
        <span className={styles.tiny}>
          {stage.ageFrom}–{stage.ageTo}
          {ko ? '세' : ' yrs'} · {stage.yearFrom}–{stage.yearTo}
        </span>
      </div>

      {/* daewoon spine */}
      <div className={`${styles.panel} ${styles.daewoonSpine}`}>
        <LayerTag kind="saju" />
        <div className={styles.daewoonRow}>
          {stageDaewoon.map((dw, i) => (
            <div key={`${dw.start}-${i}`} className={styles.daewoonCell}>
              <div className={styles.daewoonCellInner}>
                <Ganji data={dw.gz} size={30} />
                <div className={styles.daewoonRange}>
                  {dw.start}–{dw.end}
                </div>
                {dw.sibsin !== '—' && <div className={styles.daewoonSibsin}>{dw.sibsin}</div>}
              </div>
              {i < stageDaewoon.length - 1 && <span className={styles.daewoonArrow}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {detail.body.length > 0 && (
        <p className={styles.lead} style={{ marginTop: 16 }}>
          {detail.body.join(' ')}
        </p>
      )}

      <div className={styles.detailGrid}>
        {detail.hapchung && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphEmber}`}>⚡</span>{' '}
                {ko ? '합충' : 'Harmony & clash'} · HAPCHUNG
              </>
            }
            chip={detail.hapchung}
          />
        )}
        {detail.shinsal && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphViolet}`}>✦</span>{' '}
                {ko ? '신살' : 'Shinsal'} · SHINSAL
              </>
            }
            chip={detail.shinsal}
          />
        )}
        {detail.unseong && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphDim}`}>◯</span>{' '}
                {ko ? '12운성' : 'Twelve stages'} · UNSEONG
              </>
            }
            chip={detail.unseong}
          />
        )}
      </div>

      {/* outer planets — Phase 3 보강 ⑤: 7가지 kind 모두 매핑 */}
      {detail.outer.length > 0 && (
        <div className={styles.outerWrap}>
          <LayerTag kind="astro" />
          <span className={`${styles.tiny} ${styles.outerLabel}`}>
            {ko ? '외행성 마디 · Outer-planet returns' : 'Outer-planet returns'}
          </span>
          <div className={styles.outerRow}>
            {detail.outer.map((o, i) => {
              const kind = o.kind ?? 'jupiter'
              const cls = OUTER_CLASS[kind] ?? styles.jupiter
              const glyph = OUTER_GLYPH[kind] ?? '★'
              return (
                <div key={`${o.label}-${i}`} className={`${styles.outerChip} ${cls}`}>
                  <span className={styles.ic}>{glyph}</span>
                  <div className={styles.ot}>
                    <div className={styles.l}>{o.label}</div>
                    <div className={styles.d}>
                      {o.date} · {o.body}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailCard({
  heading,
  chip,
}: {
  heading: ReactNode
  chip: { title: string; romaji?: string; body: string }
}) {
  return (
    <div className={styles.dcard}>
      <div className={styles.h}>{heading}</div>
      <div className={styles.t}>{chip.title}</div>
      {chip.romaji && <div className={styles.r}>{chip.romaji}</div>}
      <div className={styles.b}>{chip.body}</div>
    </div>
  )
}

// ============================================================================
// Phase 3 보강 ⑥: Natal Lots row (7개 gold chip)
// ============================================================================

function NatalLotsRow({ lots }: { lots: DestinyArabicLot[] }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={`${styles.block} ${styles.lotsWrap}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {ko ? '본명 7대 점(點) · Arabic Lots' : 'Seven natal Lots · Arabic Lots'}
        </h2>
        <span className={styles.tiny}>Hellenistic · sect-aware</span>
      </div>
      <LayerTag kind="astro" />
      <span className={`${styles.tiny} ${styles.lotsLabel}`}>
        Lots — Fortune · Spirit · Eros · Necessity · Courage · Victory · Nemesis
      </span>
      <div className={styles.lotsGrid}>
        {lots.map((lot) => {
          const mark = LOT_MARK[lot.name] ?? lot.name.charAt(0)
          const sign = zodiacKo(lot.sign)
          return (
            <div key={lot.name} className={styles.lotChip}>
              <span className={styles.ic}>{mark}</span>
              <div className={styles.meta}>
                <span className={styles.nm}>{lot.korean ?? lot.name}</span>
                <span className={styles.pos}>
                  {sign} {Math.floor(lot.degree)}° · {lot.house}H
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 보강 ⑦: ZR L1 carousel
// ============================================================================

function ZRCarousel({
  spirit,
  fortune,
}: {
  spirit: DestinyZRChapter[]
  fortune: DestinyZRChapter[]
}) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={styles.zrWrap}>
      <div className={styles.sectionHead}>
        <h2
          className={styles.sectionTitle}
          title={
            ko
              ? '인생을 장(章)으로 나누는 점성 흐름 — 시기마다 무엇이 무대에 오르는지'
              : 'Astrology that divides life into chapters — what comes on stage in each era'
          }
        >
          {ko ? 'ZR L1 챕터 · Zodiacal Releasing' : 'ZR L1 chapters · Zodiacal Releasing'}
        </h2>
        <span className={styles.tiny}>
          {ko ? 'Spirit 진로 · Fortune 체질' : 'Spirit path · Fortune body'}
        </span>
      </div>
      <div className={styles.zrLanes}>
        <ZRLane
          title={ko ? 'Spirit Lot — 진로·외적 사건' : 'Spirit Lot — path & outer events'}
          kindLabel="SPIRIT"
          kindClass={styles.spirit}
          chapters={spirit}
        />
        <ZRLane
          title={ko ? 'Fortune Lot — 몸·물질·체질' : 'Fortune Lot — body, matter & constitution'}
          kindLabel="FORTUNE"
          kindClass={styles.fortune}
          chapters={fortune}
        />
      </div>
    </div>
  )
}

function ZRLane({
  title,
  kindLabel,
  kindClass,
  chapters,
}: {
  title: string
  kindLabel: string
  kindClass: string
  chapters: DestinyZRChapter[]
}) {
  return (
    <div className={styles.zrLane}>
      <div className={styles.laneHead}>
        <span className={styles.laneTitle}>{title}</span>
        <span className={`${styles.laneKind} ${kindClass}`}>{kindLabel}</span>
      </div>
      <div className={styles.zrTrack}>
        {chapters.map((c, i) => {
          const sign = zodiacKo(c.sign)
          const cellStyle: CSSProperties | undefined = c.now ? undefined : undefined
          return (
            <div
              key={`${kindLabel}-${c.calendarStartYear}-${i}`}
              className={`${styles.zrChapter} ${c.now ? styles.now : ''}`}
              style={cellStyle}
            >
              <span className={styles.sign}>{sign}</span>
              <span className={styles.ruler}>{c.ruler}</span>
              <span className={styles.years}>
                {c.calendarStartYear}–{c.calendarEndYear}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LifetimeTier
