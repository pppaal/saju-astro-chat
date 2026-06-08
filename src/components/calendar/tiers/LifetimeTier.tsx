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

function LayerTag({ kind }: { kind: 'saju' | 'astro' }) {
  const isSaju = kind === 'saju'
  return (
    <span className={`${styles.layerTag} ${isSaju ? styles.saju : styles.astro}`}>
      <span className={styles.pip} /> {isSaju ? '사주 · SAJU' : '점성 · ASTRO'}
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

/** ZR sign Korean (zodiac signs). */
function zodiacKo(signEn: string): string {
  const m: Record<string, string> = {
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
  return m[signEn] ?? signEn
}

// ============================================================================
// LifeTimeline — 사주 대운 × 점성 ZR 을 한 나이축에 평행으로 (②)
// ============================================================================
function LifeTimeline({ lifetime }: { lifetime: DestinyLifetime }) {
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
        <h2 className={styles.sectionTitle}>인생 타임라인 · 대운 × 점성</h2>
        <span className={styles.tiny}>사주 10년운과 점성 ZR 챕터를 같은 나이축에 나란히</span>
      </div>
      <div className={styles.tlWrap} style={{ position: 'relative' }}>
        {/* 사주 대운 */}
        <div className={styles.tlRowLabel}>사주 대운</div>
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
        <div className={styles.tlRowLabel}>점성 ZR</div>
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
            {a}세
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
  const { lifeStages, daewoon, milestones, zrSpiritChapters, zrFortuneChapters } = lifetime

  // constellation node positions across the width (원본과 동일)
  const nodeX = [12, 38, 62, 88] // %
  const nodeY = [62, 38, 50, 70]

  // current life stage (Phase 3: 모든 stage detail 카드를 그릴 수 있도록 보존)
  // C5: lifeStages 빈 배열 가드 (adapter 실패 시 깨짐 방지)
  if (!lifeStages?.length) {
    return (
      <div className={styles.tier} data-screen-label="인생 84년">
        <p style={{ padding: 40, opacity: 0.6 }}>본명 정보를 불러오는 중...</p>
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
    ? `사주 8자 오행 분포 — ${dominantEl}(${EL_HANJA[dominantEl] ?? dominantEl}) 최다`
    : '사주 8자 오행 분포'

  // C1: astro 메타 한 줄 — 누락 세그먼트 hide
  const astroSegs = [
    user.astro?.sunEn && `Sun ${user.astro.sunEn}`,
    user.astro?.ascEn && `Asc ${user.astro.ascEn}`,
    user.astro?.mcEn && `MC ${user.astro.mcEn}`,
  ].filter(Boolean) as string[]

  // C4: rootStatus 있을 때만 "통근" 라벨, 없으면 "주십신"
  const hasRootStatus = !!user.rootStatus

  return (
    <div className={styles.tier} data-screen-label="인생 84년">
      {/* ============================================================
          intro
      ============================================================ */}
      <div className={styles.eyebrow}>인생 · LIFETIME · 84년</div>
      <h1 className={styles.display}>내 인생 전체 흐름</h1>
      <p className={`${styles.tiny} ${styles.headerMeta}`}>
        {user.birthKo} · {user.place} · {user.sex}
        {astroSegs.length > 0 ? (
          <>
            <span className={styles.pipe}>|</span>
            {astroSegs.join(' · ')}
          </>
        ) : null}
      </p>

      {/* 공유용 정체성 카드 (③) — 기존 데이터(일간·격국·인생유형·점성) 압축. */}
      {lifetime.lifePattern && (
        <div className={styles.idCard}>
          <div className={styles.idCardRow}>
            <span className={styles.idCardHan}>{user.ilgan.hanja}</span>
            <div className={styles.idCardMeta}>
              <div className={styles.idCardType}>{lifetime.lifePattern.ko}</div>
              <div className={styles.idCardSub}>
                {user.ilgan.kr} 일간 · {user.gyeokguk}
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
                <span className={styles.k}>일간</span>
                <span className={styles.han}>{user.ilgan.hanja}</span>
                <span className={styles.v}>{user.ilgan.kr}</span>
              </span>

              {/* ── Phase 3 보강 ②: 격국 chip → gyeokgukStatus ── */}
              <span className={styles.chip}>
                <span className={styles.k}>격국</span>
                <span className={styles.v}>{user.gyeokgukStatus ?? user.gyeokguk}</span>
              </span>

              <span className={styles.chip}>
                <span className={styles.k}>용신</span>
                <span className={styles.han}>{user.yongsin.hanja}</span>
              </span>
              <span className={styles.chip}>
                <span className={styles.k}>강약</span>
                <span className={styles.v}>{user.gangyak}</span>
              </span>

              {/* ── Phase 3 보강 ③: 재성 chip → rootStatus (C4: 라벨 조건부) ── */}
              <span className={styles.chip}>
                <span className={styles.k}>{hasRootStatus ? '통근' : '주십신'}</span>
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
            <h2 className={styles.sectionTitle}>인생 유형 · {lifetime.lifePattern.ko}</h2>
            <span className={styles.tiny}>신강약 기준 대운 흐름</span>
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
          <h2 className={styles.sectionTitle}>네 시기의 별자리</h2>
          <span className={styles.tiny}>0 → 84세 · 대운 10년 주기</span>
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
            >
              {s.now && <span className={styles.nowtag}>지금 · NOW</span>}
              <div className={styles.nm}>{s.name}</div>
              <div className={styles.age}>
                {s.ageFrom}–{s.ageTo}세 · {s.yearFrom}–{s.yearTo}
              </div>
              <div className={styles.tone}>{s.tone}</div>
              {s.now && <div className={styles.diveHint}>탭하면 올해로 줌인 ↘</div>}
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
        const sysOf = (k: string) => (k === 'saju' || k === 'daewoon' ? '사주' : '점성')
        return (
          <div className={styles.pivots}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>운명의 전환기</h2>
              <span className={styles.tiny}>지난 5년 → 앞으로 10년</span>
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
                        <small> · {m.age}세</small>
                      </span>
                      <span className={styles.pivotSys}>{sysOf(m.kind)}</span>
                      {past && <span className={styles.pivotTag}>지난 시기</span>}
                      {highlight && (
                        <span className={styles.pivotTagNow}>
                          {m.year === nowYear ? '올해' : '다가오는 시기'}
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
          <h2 className={styles.sectionTitle}>분기점 타임라인</h2>
          <span className={styles.tiny}>사주 · 점성 수렴 마디</span>
        </div>
        <div className={styles.mileTrack}>
          {milestones.map((m, i) => (
            <div key={`${m.year}-${i}`} className={`${styles.mile} ${m.now ? styles.now : ''}`}>
              <span className={styles.node} />
              <span className={styles.yr}>
                {m.year}
                <small>{m.age}세</small>
              </span>
              <span className={styles.lab}>
                {m.label}
                {m.now && <span className={styles.nowMark}>← 지금</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive} type="button">
          올해 {lifetime.currentYear}으로 줌인 <span className={styles.arrow}>↓</span>
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
  const detail = stage.detail
  if (!detail) return null

  // 이 stage 범위에 걸치는 대운만 추림 (전부 그리면 과부하)
  const stageDaewoon = daewoon.filter((dw) => dw.end > stage.yearFrom && dw.start <= stage.yearTo)

  const headerNote = isCurrent
    ? '지금의 결'
    : `${stage.ageFrom}–${stage.ageTo}세 · ${stage.yearFrom}–${stage.yearTo}`

  return (
    <div className={styles.stageDetail}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {stage.name} — {headerNote}
        </h2>
        <span className={styles.tiny}>
          {stage.ageFrom}–{stage.ageTo}세 · {stage.yearFrom}–{stage.yearTo}
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
                <span className={`${styles.glyphMini} ${styles.glyphEmber}`}>⚡</span> 합충 ·
                HAPCHUNG
              </>
            }
            chip={detail.hapchung}
          />
        )}
        {detail.shinsal && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphViolet}`}>✦</span> 신살 ·
                SHINSAL
              </>
            }
            chip={detail.shinsal}
          />
        )}
        {detail.unseong && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphDim}`}>◯</span> 12운성 · UNSEONG
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
            외행성 마디 · Outer-planet returns
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
  return (
    <div className={`${styles.block} ${styles.lotsWrap}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>본명 7대 점(點) · Arabic Lots</h2>
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
  return (
    <div className={styles.zrWrap}>
      <div className={styles.sectionHead}>
        <h2
          className={styles.sectionTitle}
          title="인생을 장(章)으로 나누는 점성 흐름 — 시기마다 무엇이 무대에 오르는지"
        >
          ZR L1 챕터 · Zodiacal Releasing
        </h2>
        <span className={styles.tiny}>Spirit 진로 · Fortune 체질</span>
      </div>
      <div className={styles.zrLanes}>
        <ZRLane
          title="Spirit Lot — 진로·외적 사건"
          kindLabel="SPIRIT"
          kindClass={styles.spirit}
          chapters={spirit}
        />
        <ZRLane
          title="Fortune Lot — 몸·물질·체질"
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
