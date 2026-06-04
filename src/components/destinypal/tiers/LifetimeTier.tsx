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
// Light-tone (ink-on-hanji) palette. atoms not yet shipped → inline stubs
// (Ganji / ScoreOrb / ElementBars / LayerTag) gated by local primitives,
// to be replaced by `import { ... } from '@/components/destinypal/atoms'`
// once Agent A finishes.

import type { CSSProperties, ReactNode } from 'react'

import type {
  DestinyArabicLot,
  DestinyLifeStage,
  DestinyLifetime,
  DestinyUserSummary,
  DestinyZRChapter,
  ElementCounts,
  Ganji as GanjiData,
} from '@/types/destinypal'

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

function Ganji({
  data,
  size = 30,
  en = true,
}: {
  data: GanjiData
  size?: number
  en?: boolean
}) {
  return (
    <span className={styles.ganji}>
      <span className={styles.hanja} style={{ fontSize: size }}>
        {data.hanja}
      </span>
      <span
        className={styles.kr}
        style={{ fontSize: Math.max(10, size * 0.32) }}
      >
        {data.kr}
      </span>
      {en && (
        <span
          className={styles.en}
          style={{ fontSize: Math.max(9, size * 0.28) }}
        >
          {data.en}
        </span>
      )}
    </span>
  )
}

function ScoreOrb({
  score,
  grade,
  max = 100,
}: {
  score: number
  grade: string
  max?: number
}) {
  const r = 58
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / max))
  return (
    <div className={styles.scoreOrb}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs>
          <linearGradient id="dp-orbg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#222a4e" />
            <stop offset="1" stopColor="#4f5d96" />
          </linearGradient>
        </defs>
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="rgba(58,46,28,0.14)"
          strokeWidth="4"
        />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#dp-orbg)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 66 66)"
        />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2
          const on = i / 60 <= frac
          return (
            <circle
              key={i}
              cx={66 + Math.cos(a) * 50}
              cy={66 + Math.sin(a) * 50}
              r={on ? 0.9 : 0.5}
              fill={on ? '#4f5d96' : 'rgba(58,46,28,0.18)'}
            />
          )
        })}
      </svg>
      <div className={styles.num}>
        <b>{score}</b>
        <span>SCORE · {grade}</span>
      </div>
    </div>
  )
}

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
      {(Object.entries(elements) as Array<[keyof ElementCounts, number]>).map(
        ([k, v]) => (
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
        ),
      )}
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
// LifetimeTier
// ============================================================================

export function LifetimeTier({ user, lifetime, onDive }: LifetimeTierProps) {
  const { lifeStages, daewoon, milestones, zrSpiritChapters, zrFortuneChapters } =
    lifetime

  // constellation node positions across the width (원본과 동일)
  const nodeX = [12, 38, 62, 88] // %
  const nodeY = [62, 38, 50, 70]

  // current life stage (Phase 3: 모든 stage detail 카드를 그릴 수 있도록 보존)
  const nowStage =
    lifeStages.find((s) => s.now) ?? lifeStages[1] ?? lifeStages[0]

  return (
    <div className={styles.tier} data-screen-label="인생 84년">
      {/* ============================================================
          intro
      ============================================================ */}
      <div className={styles.eyebrow}>인생 · LIFETIME · 84년</div>
      <h1 className={styles.display}>내 인생 전체 흐름</h1>
      <p className={`${styles.tiny} ${styles.headerMeta}`}>
        {user.birthKo} · {user.place} · {user.sex}
        <span className={styles.pipe}>|</span>
        Sun {user.astro.sunEn} · Asc {user.astro.ascEn} · MC {user.astro.mcEn}
      </p>

      <div className={styles.introGrid}>
        <div>
          <p className={styles.lead}>{user.intro}</p>
          <p className={`${styles.lead} ${styles.leadEn}`}>{user.introEn}</p>

          {/* ── Phase 3 보강 ①: Sect 한 줄 ── */}
          {user.sect ? <SectRow user={user} /> : null}
        </div>

        <div className={`${styles.panel} ${styles.introPanel}`}>
          <ScoreOrb score={user.score} grade={user.grade} />
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
                <span className={styles.v}>
                  {user.gyeokgukStatus ?? user.gyeokguk}
                </span>
              </span>

              <span className={styles.chip}>
                <span className={styles.k}>용신</span>
                <span className={styles.han}>{user.yongsin.hanja}</span>
              </span>
              <span className={styles.chip}>
                <span className={styles.k}>강약</span>
                <span className={styles.v}>{user.gangyak}</span>
              </span>

              {/* ── Phase 3 보강 ③: 재성 chip → rootStatus ── */}
              <span className={styles.chip}>
                <span className={styles.k}>통근</span>
                <span className={styles.v}>
                  {user.rootStatus ??
                    `${user.dominantSibsin.name} ${user.dominantSibsin.pct}%`}
                </span>
              </span>
            </div>

            <div className={styles.elementsWrap}>
              <div className={`${styles.tiny} ${styles.elementsLabel}`}>
                사주 8자 오행 분포 — 목(木) 최다
              </div>
              <ElementBars elements={user.elements} />
            </div>
          </div>
        </div>
      </div>

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
            preserveAspectRatio="none"
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
                  style={
                    s.now
                      ? { filter: 'drop-shadow(0 0 5px var(--ember-glow))' }
                      : undefined
                  }
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
              {s.now && (
                <div className={styles.diveHint}>탭하면 올해로 줌인 ↘</div>
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
      {user.lots && user.lots.length > 0 && (
        <NatalLotsRow lots={user.lots} />
      )}

      {/* ============================================================
          Phase 3 보강 ⑦: ZR L1 carousel (Spirit / Fortune)
      ============================================================ */}
      {(zrSpiritChapters?.length > 0 || zrFortuneChapters?.length > 0) && (
        <ZRCarousel
          spirit={zrSpiritChapters ?? []}
          fortune={zrFortuneChapters ?? []}
        />
      )}

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
            <div
              key={`${m.year}-${i}`}
              className={`${styles.mile} ${m.now ? styles.now : ''}`}
            >
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
          올해 {lifetime.currentYear}으로 줌인{' '}
          <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Phase 3 보강 ①: Sect Row
// ============================================================================

function SectRow({ user }: { user: DestinyUserSummary }) {
  const isNight = user.sect === 'night'
  const sectKo = isNight ? '밤' : '낮'
  const sectEn = isNight ? 'Night' : 'Day'
  const sectLight = isNight ? 'Moon' : 'Sun'
  // Lord of Asc — DestinyDignityEntry 에서 직접 매핑 못 하니 기본 라벨만.
  // 백엔드에서 adapter 가 채워줄 자리 (없을 때 graceful fallback).
  const ascSign = user.astro.asc
  const lordOfAsc = ascSignRuler(user.astro.ascEn)

  return (
    <div className={styles.sectRow}>
      <span>
        <span className={styles.sectMark}>Sect</span>{' '}
        {sectKo}({sectEn})
      </span>
      <span className={styles.sectSep} />
      <span>Sect light = {sectLight}</span>
      {lordOfAsc && (
        <>
          <span className={styles.sectSep} />
          <span>
            Lord of Asc = {lordOfAsc} ({ascSign})
          </span>
        </>
      )}
    </div>
  )
}

/** ZodiacKo 영문 → traditional ruler. */
function ascSignRuler(sign: string): string | null {
  const m: Record<string, string> = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Mars',
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Saturn',
    Pisces: 'Jupiter',
  }
  return m[sign] ?? null
}

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
  const stageDaewoon = daewoon.filter(
    (dw) => dw.end > stage.yearFrom && dw.start <= stage.yearTo,
  )

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
                {dw.sibsin !== '—' && (
                  <div className={styles.daewoonSibsin}>{dw.sibsin}</div>
                )}
              </div>
              {i < stageDaewoon.length - 1 && (
                <span className={styles.daewoonArrow}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className={styles.lead} style={{ marginTop: 16 }}>
        {detail.body.join(' ')}
      </p>

      <div className={styles.detailGrid}>
        {detail.hapchung && (
          <DetailCard
            heading={
              <>
                <span
                  className={`${styles.glyphMini} ${styles.glyphEmber}`}
                >
                  ⚡
                </span>{' '}
                합충 · HAPCHUNG
              </>
            }
            chip={detail.hapchung}
          />
        )}
        {detail.shinsal && (
          <DetailCard
            heading={
              <>
                <span
                  className={`${styles.glyphMini} ${styles.glyphViolet}`}
                >
                  ✦
                </span>{' '}
                신살 · SHINSAL
              </>
            }
            chip={detail.shinsal}
          />
        )}
        {detail.unseong && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphDim}`}>
                  ◯
                </span>{' '}
                12운성 · UNSEONG
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
                <div
                  key={`${o.label}-${i}`}
                  className={`${styles.outerChip} ${cls}`}
                >
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
                <span className={styles.nm}>
                  {lot.korean ?? lot.name}
                </span>
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
        <h2 className={styles.sectionTitle}>ZR L1 챕터 · Zodiacal Releasing</h2>
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
          const cellStyle: CSSProperties | undefined = c.now
            ? undefined
            : undefined
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
