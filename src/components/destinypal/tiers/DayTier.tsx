/* ============================================================
   destinypal — DayTier (1일 · DAILY)
   day.jsx (88 lines) 원본 포팅 + Phase 3 풀 시각화
   - head 보강: GeokgukStatusFrame chip + Gongmang banner
   - VoC banner (active 시 회색 띠)
   - transit-row 보강: 외행성 transit
   - 신규 5종: CrossActivationCard / AppliedPatternBadge / JijangganChips
                / TwelveStageMatrix / FixedStarRow / ArabicLotRow
   - 신호 stream 정렬: (layer priority desc, |polarity| desc, weight desc)
   - HourBreakdown 24h (footer 위)
   ============================================================ */
'use client'

import { useMemo } from 'react'
import type {
  DestinyDay,
  DestinySignal,
  SajuSignal,
  AstroSignal,
  CrossSignal,
} from '@/types/destinypal'
import type { SignalLayer, Polarity } from '@/lib/calendar-engine/types'
import s from './DayTier.module.css'

// ============================================================================
// HourSlot — DestinyDay 에는 아직 hours24 가 없어 prop 확장으로 받는다.
// ============================================================================

export interface HourSlot {
  /** 0..23 (子시=23~01, 표시 라벨은 hour 한자 사용). */
  hour: number
  /** 한자 시진 — '子' / '丑' / ... / '亥'. */
  branch: string
  /** 0..100 derivedScore. */
  score: number
  /** 5축 중 최상 도메인 — 'love' | 'money' | 'career' | 'health' | 'growth'. */
  topDomain?: string
  /** 5축 테마 점수. */
  themeScores?: Partial<Record<string, number>>
}

export interface DayTierProps {
  day: DestinyDay
  /** 24 시진 별 분해 — 옵션 (없으면 HourBreakdown 미렌더). */
  hours24?: HourSlot[]
  /** Void of Course 활성 여부 + 메시지 (옵션). */
  voc?: { active: boolean; from?: string; to?: string; note?: string }
  /** 줌아웃 → MonthTier. */
  onRise: () => void
}

// ============================================================================
// 신호 정렬 — (layer priority desc, |polarity| desc, weight desc).
// ============================================================================

const LAYER_PRIORITY: Record<SignalLayer, number> = {
  instant: 6,
  hourly: 5,
  daily: 4,
  monthly: 3,
  yearly: 2,
  decadal: 1,
}

function sortSignals(arr: readonly DestinySignal[]): DestinySignal[] {
  return [...arr].sort((a, b) => {
    const lp = (LAYER_PRIORITY[b.layer] ?? 0) - (LAYER_PRIORITY[a.layer] ?? 0)
    if (lp !== 0) return lp
    const ap = Math.abs(b.polarity) - Math.abs(a.polarity)
    if (ap !== 0) return ap
    return b.weight - a.weight
  })
}

function catLabel(cat: string): string {
  const tail = cat.split('/')[1]
  return tail ?? cat
}

function catClassFor(cat: string): string {
  if (cat.startsWith('cross')) return s.catCross ?? ''
  if (cat.startsWith('astro')) return s.catAstro ?? ''
  return s.catSaju ?? ''
}

// ============================================================================
// inline atoms (Agent A 미배포 fallback). 공통 atoms 패키지 도착 시 교체 가능.
// ============================================================================

function PolarityChip({ v }: { v: Polarity | number }) {
  const cls = v > 0 ? s.polPos : v < 0 ? s.polNeg : s.polNeu
  const txt = v > 0 ? `+${v}` : v < 0 ? `${v}` : '0'
  return <span className={`${s.pol} ${cls}`}>{txt}</span>
}

function ScoreDial({ score, label = '종합' }: { score: number; label?: string }) {
  const r = 40
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / 100))
  const col =
    score >= 60 ? 'var(--pos, #57d6a6)' : score >= 35 ? 'var(--ember, #d9a84a)' : 'var(--neg, #e0735f)'
  return (
    <div className={s.scoreDial}>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 6px ${col})` }}
        />
      </svg>
      <div className={s.scoreDialInner}>
        <b>{score}</b>
        <span>{label}</span>
      </div>
    </div>
  )
}

function ThemeBars({ items }: { items: DestinyDay['themes'] }) {
  return (
    <div className={s.themebars}>
      {items.map((t) => (
        <div className={s.tbRow} key={t.key}>
          <span className={s.lbl}>{t.ko}</span>
          <span className={s.tbTrack}>
            <span className={s.tbFill} style={{ width: `${t.v}%` }} />
          </span>
          <span className={s.val}>{t.v}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 새 컴포넌트 5종 + HourBreakdown.
// ============================================================================

/** GeokgukStatusFrame — 격국명 + 성패 chip. */
function GeokgukStatusFrame({ status }: { status: DestinyDay['geokgukStatus'] }) {
  if (!status?.name) return null
  const statusLabel =
    status.status === '성격'
      ? '성격'
      : status.status === '파격'
        ? '파격'
        : '반성반파'
  return (
    <div className={s.chipRow}>
      <span className={s.statusChip}>
        <span className={s.k}>격국</span>
        <span className={s.v}>{status.name}</span>
        <span className={s.k}>·</span>
        <span className={s.v}>{statusLabel}</span>
      </span>
    </div>
  )
}

/** GongmangBanner — 활성 공망 지지. */
function GongmangBanner({ gongmang }: { gongmang: DestinyDay['gongmang'] }) {
  if (!gongmang || !gongmang.activeBranches || gongmang.activeBranches.length === 0) return null
  return (
    <div className={s.gongmangBanner}>
      <b>공망 활성</b>
      <span className={s.branches}>{gongmang.activeBranches.join('·')}</span>
      <span>{gongmang.note ?? '본명 일주 공망 지지가 오늘 시기에 닿음'}</span>
    </div>
  )
}

/** VocBanner — Void of Course Moon. */
function VocBanner({ voc }: { voc?: DayTierProps['voc'] }) {
  if (!voc?.active) return null
  return (
    <div className={s.vocBanner}>
      <span className={s.glyph}>☾∅</span>
      <span>
        Void of Course
        {voc.from || voc.to ? ` · ${voc.from ?? ''}${voc.from && voc.to ? ' ~ ' : ''}${voc.to ?? ''}` : ''}
        {voc.note ? ` — ${voc.note}` : ' — 새로운 시작 보류'}
      </span>
    </div>
  )
}

/** CrossActivationCard — 사주×점성 A등급 페어 그리드. */
function CrossActivationCard({ crosses }: { crosses: DestinyDay['crossActivations'] }) {
  if (!crosses || crosses.length === 0) return null
  return (
    <section className={s.crossSection}>
      <div className={s.secHead}>
        <h3 className={s.secTitle}>Cross Activation</h3>
        <span className={s.tiny}>사주×점성 A등급 페어 {crosses.length}건</span>
      </div>
      <div className={s.crossList}>
        {crosses.map((c) => (
          <div className={s.crossCard} key={c.id}>
            <div className={s.crossGrid}>
              <div className={`${s.crossSide}`}>
                <span className={s.handle}>◆ 사주</span>
                <span className={s.label}>{c.sajuSide}</span>
              </div>
              <span className={s.crossMark}>×</span>
              <div className={`${s.crossSide} ${s.astro}`}>
                <span className={s.handle}>✦ 점성</span>
                <span className={s.label}>{c.astroSide}</span>
              </div>
            </div>
            <div className={s.crossMeaning}>{c.meaning}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** AppliedPatternBadge — 8종 응용격국 (재생관·식신제살 등). */
function AppliedPatternBadges({ patterns }: { patterns: DestinyDay['appliedPatterns'] }) {
  if (!patterns || patterns.length === 0) return null
  return (
    <div className={s.patternRow}>
      {patterns.map((p) => {
        const tone = p.polarity > 0 ? s.pos : p.polarity < 0 ? s.neg : ''
        return (
          <span className={`${s.patternBadge} ${tone}`} key={p.id}>
            <span className={s.hanja}>{p.name}</span>
            <span className={s.ko}>{p.korean}</span>
            <PolarityChip v={p.polarity} />
          </span>
        )
      })}
    </div>
  )
}

/** JijangganChips — 정기/중기/여기 3층 stack. */
function JijangganChips({ jijanggan }: { jijanggan: DestinyDay['jijanggan'] }) {
  if (!jijanggan) return null
  const layers = [
    { key: 'jeonggi', label: '정기 · primary', data: jijanggan.jeonggi, primary: true },
    { key: 'junggi', label: '중기 · middle', data: jijanggan.junggi, primary: false },
    { key: 'yeogi', label: '여기 · residual', data: jijanggan.yeogi, primary: false },
  ] as const
  return (
    <div className={s.jijangganRow}>
      {layers.map((l) =>
        l.data ? (
          <div className={`${s.jjLayer} ${l.primary ? s.primary : ''}`} key={l.key}>
            <span className={s.layerLabel}>{l.label}</span>
            <span className={s.stem}>{l.data.stem}</span>
            <span className={s.sibsin}>{l.data.sibsin}</span>
            <span className={s.element}>{l.data.element}</span>
          </div>
        ) : null,
      )}
    </div>
  )
}

/** TwelveStageMatrix — 본명 4기둥 vs 일진 지지 12운성 미니. */
export interface TwelveStageEntry {
  pillar: '연주' | '월주' | '일주' | '시주'
  stage: string // 한자 — '長生' 등
  stageEn?: string // 'long-life' 등
}
function TwelveStageMatrix({ entries }: { entries?: TwelveStageEntry[] }) {
  if (!entries || entries.length === 0) return null
  return (
    <div className={s.twelveMatrix}>
      {entries.map((e) => (
        <div className={s.twelveCell} key={e.pillar}>
          <span className={s.pillar}>{e.pillar}</span>
          <span className={s.stage}>{e.stage}</span>
          {e.stageEn ? <span className={s.stageEn}>{e.stageEn}</span> : null}
        </div>
      ))}
    </div>
  )
}

/** FixedStarRow — 정통 Hellenistic (orb ≤1°). */
function FixedStarRow({ signals }: { signals: readonly DestinySignal[] }) {
  const stars = signals.filter((x) => x.cat === 'astro/fixed-star')
  if (stars.length === 0) return null
  return (
    <div className={s.fixedStarRow}>
      {stars.map((star) => (
        <span className={s.fixedStar} key={star.id}>
          <span className={s.glyph}>★</span>
          <span>{star.label}</span>
          <PolarityChip v={star.polarity} />
        </span>
      ))}
    </div>
  )
}

/** ArabicLotRow — 7개 활성 Lot. */
function ArabicLotRow({ signals }: { signals: readonly DestinySignal[] }) {
  const lots = signals.filter((x) => x.cat === 'astro/arabic-part').slice(0, 7)
  if (lots.length === 0) return null
  return (
    <div className={s.lotRow}>
      {lots.map((lot) => (
        <span className={s.lotPill} key={lot.id}>
          <span className={s.glyph}>⊕</span>
          <span>{lot.label}</span>
          <PolarityChip v={lot.polarity} />
        </span>
      ))}
    </div>
  )
}

/** HourBreakdown — 24시진 mini-strip. */
function HourBreakdown({ hours }: { hours: HourSlot[] }) {
  if (hours.length === 0) return null
  return (
    <section className={s.hourBlock}>
      <div className={s.secHead}>
        <h3 className={s.secTitle}>24시진 분해</h3>
        <span className={s.tiny}>시진별 score · top domain</span>
      </div>
      <div className={s.hourStrip}>
        {hours.map((h) => {
          const tone = h.score >= 60 ? s.good : h.score <= 35 ? s.bad : ''
          return (
            <div className={`${s.hourCell} ${tone}`} key={`${h.hour}-${h.branch}`}>
              <span className={s.ji}>{h.branch}</span>
              <span className={s.label}>{h.hour.toString().padStart(2, '0')}</span>
              <span className={s.score}>{h.score}</span>
              {h.topDomain ? <span className={s.label}>{h.topDomain}</span> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================================
// DayTier — 메인.
// ============================================================================

export default function DayTier({ day, hours24, voc, onRise }: DayTierProps) {
  // 모든 신호 (사주 + 점성 + cross) 정렬 + cat 색 매핑.
  const sortedSignals = useMemo<DestinySignal[]>(() => {
    const all: DestinySignal[] =
      day.allSignals && day.allSignals.length > 0
        ? day.allSignals
        : [
            ...(day.signals as SajuSignal[]),
            ...(day.transits as AstroSignal[]),
            ...(day.crossSignals as CrossSignal[]),
          ]
    return sortSignals(all)
  }, [day.allSignals, day.signals, day.transits, day.crossSignals])

  // 헤더용 발췌 — 핵심 12개.
  const headlineSignals = sortedSignals.slice(0, 12)
  const remainder = Math.max(day.totalSignals - headlineSignals.length, 0)

  return (
    <div className={s.inner} data-screen-label={`1일 ${day.date}`}>
      <button className={s.rise} onClick={onRise} type="button">
        ↑ 이번 달로 줌아웃
      </button>

      <div className={s.eyebrow}>
        1일 · DAILY · <span>{day.date}</span> · <span>{day.dateKo}</span>
      </div>

      {/* head: iljin + score + oneLine */}
      <div className={s.head}>
        <div className={s.iljinBig}>
          <span className={s.han}>{day.iljin.hanja}</span>
          <div className={s.meta}>
            <div className={s.kr}>{day.iljin.kr}</div>
            <div className={s.en}>{day.iljin.en}</div>
            <div className={s.ss}>
              일진 · 일간 기준 {day.iljinSibsin}
            </div>
          </div>
        </div>
        <div className={s.dayScore}>
          <ScoreDial score={day.score} label="종합" />
          <p className={s.oneline}>{day.oneLine}</p>
        </div>
      </div>

      {/* GeokgukStatus chip + Gongmang banner + VoC banner */}
      <GeokgukStatusFrame status={day.geokgukStatus} />
      <GongmangBanner gongmang={day.gongmang} />
      <VocBanner voc={voc} />

      {/* split: theme bars + transits */}
      <div className={s.split}>
        <div className={`${s.panel} ${s.panelSaju}`}>
          <div className={`${s.eyebrow} ${s.eyebrowEmber}`} style={{ marginBottom: 16 }}>
            오늘 테마 점수
          </div>
          <ThemeBars items={day.themes} />
        </div>
        <div className={`${s.panel} ${s.panelAstro}`}>
          <div className={s.eyebrow} style={{ marginBottom: 12 }}>
            점성 트랜짓 · 본명과의 각도
          </div>
          <div className={s.transitRow}>
            {day.transits.map((t) => {
              const isOuter =
                !!t.body &&
                (['Saturn', 'Uranus', 'Neptune', 'Pluto'] as const).includes(
                  t.body as 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto',
                )
              return (
                <div
                  className={`${s.transit} ${isOuter ? s.transitOuter : ''}`}
                  key={t.id}
                >
                  <span className={s.g}>{t.glyph}</span>
                  <div className={s.tt}>
                    <div className={s.a}>
                      {t.body} {t.aspect}{' '}
                      <span className={s.target}>→ {t.target}</span>
                    </div>
                    <div className={s.s}>{t.aspect}</div>
                  </div>
                  <PolarityChip v={t.polarity} />
                </div>
              )
            })}
          </div>
          <hr className={s.hr} />
          <div className={`${s.layerTag}`}>
            <span className={s.glyph}>✦</span> 일진 신살 활성
          </div>
          <div className={s.shinsalRow}>
            {day.shinsalActive.map((name) => (
              <span className={s.ssPill} key={name}>
                {name}
              </span>
            ))}
          </div>

          {/* 정통 Hellenistic — orb ≤ 1° fixed stars + 7 lots */}
          <FixedStarRow signals={sortedSignals} />
          <ArabicLotRow signals={sortedSignals} />
        </div>
      </div>

      {/* Cross Activation 카드 그리드 */}
      <CrossActivationCard crosses={day.crossActivations} />

      {/* 응용 격국 badge 라인 */}
      <section className={s.blockSm}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>응용 격국</h3>
          <span className={s.tiny}>오늘 발동한 패턴</span>
        </div>
        <AppliedPatternBadges patterns={day.appliedPatterns} />
      </section>

      {/* 지장간 3층 */}
      <section className={s.blockSm}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>본명 일주 지장간</h3>
          <span className={s.tiny}>정기 / 중기 / 여기 · 일간 기준 십신</span>
        </div>
        <JijangganChips jijanggan={day.jijanggan} />
      </section>

      {/* 12 운성 미니 */}
      <section className={s.blockSm}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>12 운성</h3>
          <span className={s.tiny}>본명 4기둥 vs 일진 지지</span>
        </div>
        <TwelveStageMatrix entries={undefined /* Phase D 데이터 노드 도착 시 주입 */} />
      </section>

      {/* signal stream */}
      <section className={s.block}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>오늘의 신호</h3>
          <span className={s.tiny}>
            총 {day.totalSignals}개 중 핵심 발췌 · polarity −3 ~ +3
          </span>
        </div>
        <div className={s.signalStream}>
          {headlineSignals.map((sig) => (
            <div className={s.sig} key={sig.id}>
              <span className={`${s.cat} ${catClassFor(sig.cat)}`}>
                {catLabel(sig.cat)}
              </span>
              <div className={s.body}>
                <span className={s.lb}>{sig.label}</span>
                {sig.romaji ? <span className={s.rm}> · {sig.romaji}</span> : null}
              </div>
              <PolarityChip v={sig.polarity} />
            </div>
          ))}
          {remainder > 0 ? (
            <div className={s.sigMore}>
              … 외 {remainder}개 (transit aspects · 시진별 십신 · 외행성)
            </div>
          ) : null}
        </div>
      </section>

      {/* 24h hour breakdown */}
      {hours24 && hours24.length > 0 ? <HourBreakdown hours={hours24} /> : null}

      <div className={s.footerRise}>
        <button className={s.rise} onClick={onRise} type="button">
          ↑ 다시 위로 — 줌아웃
        </button>
      </div>
    </div>
  )
}
