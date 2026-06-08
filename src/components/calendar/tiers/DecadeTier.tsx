'use client'

/* ============================================================
   destinypal · DecadeTier — ② 10년 (DECADE · 대운)
   Phase C 신규 — 5-tier 확장 (Lifetime → Decade → Year → Month → Day)

   data.js 의 decade 객체(137-174줄) shape 을 기반으로,
   LifetimeTier(ink-on-hanji) / YearTier 톤에 맞춰 신규 작성.

   화면 구성:
     · header (eyebrow · display · oneline)
     · 좌 — 사주 SAJU panel (Ganji + pillar 분리 cheongan/jiji)
     · 우 — 대운 십신의 10년 readout + KV (기간/십신/천간/지지/세운)
     · body paragraphs
     · 이 대운의 결 narrative 4개
     · hapchung · unseong 카드 (合·沖 / 12운성)
     · astro outer-row (Jupiter Return ③ / Neptune Square 등)
     · years[10] mini-graph chip row (각 연도 score)
     · Phase 3 정통 보완:
       - 격국 성패 frame chip (user.gyeokgukStatus) — 헤더 옆
       - 12운성 매트릭스 (본명 4기둥 × 대운 지지) — 1줄 chip row
       - cross-activation badge — decadal aggregate
   ============================================================ */

import type { DestinyDecade, DestinyUserSummary } from '@/types/calendar'

import { Ganji } from '../atoms/Ganji'
import { LayerTag } from '../atoms/LayerTag'
import { sibsinArea } from '@/lib/calendar-engine/derivers/plainLanguage'
import styles from './DecadeTier.module.css'

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

export interface DecadeTierProps {
  /** 본명 — 격국 성패 frame, 4기둥, 일간 등. */
  user: DestinyUserSummary & {
    /** 격국 상태 한 줄 — '정인격 · 반성반파 (+정인 / -재성)'. */
    gyeokgukStatus?: string
    /** 일간 통근 한 줄 — '월령 寅 실령 · 통근 얇음'. */
    rootStatus?: string
  }
  /** 10년 대운 데이터. */
  decade: DestinyDecade & {
    /** Phase 3 — cross-activation aggregate (decadal). */
    crossActivations?: Array<{
      signalId: string
      name: string
      sajuLine?: string
      astroLine?: string
      polarity: number
      meaning?: string
    }>
    /** Phase 3 — 격국 status (대운 — 보통 본명과 같으나 화기/잡기 변동 가능). */
    geokgukStatus?: string
  }
  /** Year tier 로 줌인. */
  onDive: () => void
  /** Lifetime tier 로 줌아웃. */
  onRise: () => void
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** 외행성 glyph 매핑 — Phase 3 보강: 7가지 kind 모두. */
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

/** 한자 4지지 → 한글 음. */
const BRANCH_KO: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function DecadeTier({ user, decade, onDive, onRise }: DecadeTierProps) {
  // years[10] mini graph — max/min 으로 scale.
  const scores = decade.years.map((y) => y.score)
  const maxScore = Math.max(...scores, 1)
  const minScore = Math.min(...scores, 0)
  const range = Math.max(maxScore - minScore, 1)

  // sewoonNow — 현재 연도 readout.
  const sewoonNow = decade.sewoonNow
  const focusYearLabel = decade.focusYear ?? decade.start

  // cross-activation (Phase 3) — decadal aggregate.
  const crossActs = decade.crossActivations ?? []

  // 격국 status — 본명 user.gyeokgukStatus 우선, 없으면 decade.geokgukStatus.
  const gyeokgukLine = decade.geokgukStatus ?? user.gyeokgukStatus ?? user.gyeokguk

  return (
    <div className={styles.tier} data-screen-label={`10년 ${decade.start}-${decade.end}`}>
      <button className={styles.rise} onClick={onRise} type="button">
        ↑ 인생으로 줌아웃
      </button>

      {/* ============================================================
          header — eyebrow / display / oneline
      ============================================================ */}
      <div className={styles.eyebrow}>
        10년 · DECADE · 대운 {decade.start}-{decade.end}
        {decade.ageFrom != null && decade.ageTo != null && (
          <span className={styles.ageRange}>
            · {decade.ageFrom}–{decade.ageTo}세
          </span>
        )}
      </div>
      <div className={styles.headerRow}>
        <h1 className={styles.display}>
          지금의 대운, <span className={styles.han}>{decade.gz.hanja}</span>
        </h1>
        {/* Phase 3 보강 #1 — 격국 성패 frame chip (헤더 옆). */}
        {gyeokgukLine && (
          <span className={styles.frameChip}>
            <span className={styles.frameChipLabel}>격국 frame</span>
            <span className={styles.frameChipValue}>{gyeokgukLine}</span>
          </span>
        )}
      </div>
      <p className={styles.oneline}>{decade.headline}</p>

      {/* ============================================================
          main grid — 좌(사주 SAJU pillar) / 우(십신 readout + KV)
      ============================================================ */}
      <div className={styles.mainGrid}>
        {/* ── 좌: 사주 panel ── */}
        <div className={styles.sajuPanel}>
          <LayerTag kind="saju" />
          <div className={styles.ganjiBig}>
            <Ganji data={decade.gz} size={62} />
          </div>

          <div className={styles.pillarSplit}>
            {/* 천간 — 전반 5년 */}
            <div className={styles.pillarCol}>
              <div className={styles.pillarHead}>
                <span className={styles.pillarTag}>천간 · 전반 5년</span>
                <span className={styles.pillarYears}>
                  {decade.start}–{decade.start + 4}
                </span>
              </div>
              <div className={styles.pillarHanja}>{decade.pillar.cheongan.hanja}</div>
              <div className={styles.pillarSibsin}>{decade.pillar.cheongan.sibsin}</div>
              <div className={styles.pillarEl}>{decade.pillar.cheongan.el}</div>
              {decade.pillar.cheongan.note && (
                <p className={styles.pillarNote}>{decade.pillar.cheongan.note}</p>
              )}
            </div>

            <div className={styles.pillarDivider} />

            {/* 지지 — 후반 5년 */}
            <div className={styles.pillarCol}>
              <div className={styles.pillarHead}>
                <span className={styles.pillarTag}>지지 · 후반 5년</span>
                <span className={styles.pillarYears}>
                  {decade.start + 5}–{decade.end - 1}
                </span>
              </div>
              <div className={styles.pillarHanja}>{decade.pillar.jiji.hanja}</div>
              <div className={styles.pillarSibsin}>{decade.pillar.jiji.sibsin}</div>
              <div className={styles.pillarEl}>{decade.pillar.jiji.el}</div>
              {decade.pillar.jiji.note && (
                <p className={styles.pillarNote}>{decade.pillar.jiji.note}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 우: 대운 십신 readout + KV ── */}
        <div className={styles.readoutPanel}>
          <LayerTag kind="saju" />
          <div className={styles.bigTitle}>
            {decade.sibsin} · {sibsinArea(decade.sibsin)}의 10년
          </div>
          <p className={styles.themeLine}>
            {decade.theme}
            <span className={styles.muted}> · {decade.themeEn}</span>
          </p>

          <dl className={styles.kv}>
            <dt>기간</dt>
            <dd>
              <b>
                {decade.start}–{decade.end}
              </b>
              <span className={styles.muted}>
                {' '}
                · {decade.ageFrom}–{decade.ageTo}세
              </span>
            </dd>
            <dt>대운 십신</dt>
            <dd>
              <b>{decade.sibsin}</b>
            </dd>
            <dt>천간</dt>
            <dd>
              <span className={styles.han}>{decade.pillar.cheongan.hanja}</span>{' '}
              {decade.pillar.cheongan.sibsin}{' '}
              <span className={styles.muted}>· {decade.pillar.cheongan.el}</span>
            </dd>
            <dt>지지</dt>
            <dd>
              <span className={styles.han}>{decade.pillar.jiji.hanja}</span>{' '}
              {decade.pillar.jiji.sibsin}{' '}
              <span className={styles.muted}>· {decade.pillar.jiji.el}</span>
            </dd>
            {sewoonNow && (
              <>
                <dt>세운 {focusYearLabel}</dt>
                <dd>
                  <span className={styles.han}>{sewoonNow.gz.hanja}</span>{' '}
                  <span className={styles.muted}>{sewoonNow.gz.kr}</span> ·{' '}
                  <b>{sewoonNow.sibsin}</b>
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* ============================================================
          body paragraphs
      ============================================================ */}
      {decade.body && decade.body.length > 0 && (
        <div className={styles.bodyBlock}>
          {decade.body.map((p, i) => (
            <p key={i} className={styles.lead}>
              {p}
            </p>
          ))}
        </div>
      )}

      {/* ============================================================
          이 대운의 결 — narrative 4개 (대운 결 / 용신 흐름 / 주의 / 정점)
      ============================================================ */}
      {decade.narrative && decade.narrative.length > 0 && (
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>이 대운의 결</h2>
            <span className={styles.tiny}>narrative · {decade.narrative.length}</span>
          </div>
          <div className={styles.narrativeGrid}>
            {decade.narrative.map((n, i) => (
              <div key={i} className={styles.narrativeCard}>
                <div className={styles.narrativeTag}>{n.tag}</div>
                <p className={styles.narrativeBody}>{n.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          합·충 (hapchung) + 12운성 (unseong) 카드 그리드
      ============================================================ */}
      {(decade.hapchung || decade.unseong) && (
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>본명 × 대운</h2>
            <span className={styles.tiny}>합·충 · 12운성</span>
          </div>
          <LayerTag kind="saju" />
          <div className={styles.relationGrid}>
            {decade.hapchung && (
              <div className={`${styles.dcard} ${styles.dcardEmber}`}>
                <div className={styles.dcardHead}>
                  <span className={`${styles.glyphMini} ${styles.glyphEmber}`}>⚡</span>
                  합충 · HAPCHUNG
                </div>
                <div className={styles.dcardTitle}>{decade.hapchung.title}</div>
                {decade.hapchung.romaji && (
                  <div className={styles.dcardRomaji}>{decade.hapchung.romaji}</div>
                )}
                <p className={styles.dcardBody}>{decade.hapchung.body}</p>
              </div>
            )}
            {decade.unseong && (
              <div className={`${styles.dcard} ${styles.dcardViolet}`}>
                <div className={styles.dcardHead}>
                  <span className={`${styles.glyphMini} ${styles.glyphViolet}`}>◯</span>
                  12운성 · UNSEONG
                </div>
                <div className={styles.dcardTitle}>{decade.unseong.title}</div>
                {decade.unseong.romaji && (
                  <div className={styles.dcardRomaji}>{decade.unseong.romaji}</div>
                )}
                <p className={styles.dcardBody}>{decade.unseong.body}</p>
              </div>
            )}
          </div>

          {/* Phase 3 보강 #2 — 12운성 매트릭스 (본명 4기둥 × 대운 지지) 1줄 chip row.
              data.js 에 명시 없는 신규 — 단순화: 본명 일간/시지/일지/월지 4개. */}
          <UnseongMatrix ilganHanja={user.ilgan.hanja} decadeBranch={decade.pillar.jiji.hanja} />
        </section>
      )}

      {/* ============================================================
          외행성 마디 (astro outer-row)
      ============================================================ */}
      {decade.astro && decade.astro.length > 0 && (
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>외행성 마디</h2>
            <span className={styles.tiny}>Outer-planet returns</span>
          </div>
          <LayerTag kind="astro" />
          <div className={styles.outerRow}>
            {decade.astro.map((o, i) => {
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
        </section>
      )}

      {/* ============================================================
          years[10] mini-graph — 10년 세운 score chip row
      ============================================================ */}
      {decade.years && decade.years.length > 0 && (
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>10년 흐름</h2>
            <span className={styles.tiny}>연도별 score · {decade.years.length}년</span>
          </div>
          <div className={styles.yearTrack}>
            {decade.years.map((y, i) => {
              const norm = (y.score - minScore) / range
              const barH = 14 + norm * 46
              return (
                <div
                  key={`${y.year}-${i}`}
                  className={`${styles.yearCell} ${y.now ? styles.yearCellNow : ''}`}
                >
                  <div className={styles.yearBar} style={{ height: `${barH}px` }} />
                  <div className={styles.yearGanji}>
                    <span className={styles.yearHan}>{y.gz.hanja}</span>
                  </div>
                  <div className={styles.yearLabel}>
                    {y.year}
                    {y.now && <span className={styles.yearNowMark}>지금</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          Phase 3 보강 #3 — cross-activation badge (decadal aggregate)
      ============================================================ */}
      {crossActs.length > 0 && (
        <section className={styles.block}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>사주 ↔ 점성 동시 활성</h2>
            <span className={styles.tiny}>Cross-activation · 10년 누적 {crossActs.length}건</span>
          </div>
          <div className={styles.crossBadgeRow}>
            {crossActs.slice(0, 6).map((c, i) => {
              const tone =
                c.polarity > 0
                  ? styles.crossPos
                  : c.polarity < 0
                    ? styles.crossNeg
                    : styles.crossNeu
              return (
                <div key={c.signalId || i} className={`${styles.crossBadge} ${tone}`}>
                  <div className={styles.crossBadgeName}>{c.name}</div>
                  {(c.sajuLine || c.astroLine) && (
                    <div className={styles.crossBadgeLines}>
                      {c.sajuLine && <span className={styles.crossBadgeSaju}>{c.sajuLine}</span>}
                      {c.sajuLine && c.astroLine && (
                        <span className={styles.crossBadgeArrow}>↔</span>
                      )}
                      {c.astroLine && <span className={styles.crossBadgeAstro}>{c.astroLine}</span>}
                    </div>
                  )}
                  {c.meaning && <p className={styles.crossBadgeMeaning}>{c.meaning}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          dive 버튼 — Year tier
      ============================================================ */}
      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive} type="button">
          {focusYearLabel}년으로 줌인 <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Phase 3 보강 #2 — 12운성 매트릭스 (본명 일간 × 대운 지지 단순 chip row)
// ============================================================
//
// 본명 4기둥 × 대운 지지 의 12운성 매트릭스는 정통 사주 응용 — adapter
// 가 정보 채워야 정확. 디자인 단계에서는 일간 × 대운 지지 1쌍만 시각적
// 표현 (관대/태/장생 등 일반 명칭은 derive 함수가 제공할 때 enrich).

function UnseongMatrix({ ilganHanja, decadeBranch }: { ilganHanja: string; decadeBranch: string }) {
  const branchKo = BRANCH_KO[decadeBranch] ?? decadeBranch
  return (
    <div className={styles.unseongMatrix}>
      <div className={styles.unseongMatrixLabel}>
        12운성 매트릭스 · 본명 일간({ilganHanja}) × 대운 지지({decadeBranch})
      </div>
      <div className={styles.unseongMatrixChips}>
        <span className={styles.unseongMatrixChip}>
          <span className={styles.unseongMatrixHan}>{ilganHanja}</span>
          일간
        </span>
        <span className={styles.unseongMatrixCross}>×</span>
        <span className={styles.unseongMatrixChip}>
          <span className={styles.unseongMatrixHan}>{decadeBranch}</span>
          대운 지지 · {branchKo}
        </span>
      </div>
    </div>
  )
}

export default DecadeTier
