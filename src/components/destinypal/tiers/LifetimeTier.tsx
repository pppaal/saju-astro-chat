/**
 * LifetimeTier — destinypal 5-tier 의 최상위 (인생 84년) tsx 포팅.
 *
 * 원본: destinypal-extracted/js/tiers/lifetime.jsx (181줄)
 *
 * Phase B 적용 변형 7개:
 *   1. intro panel 하단 SectRow (Sect + sect light + lord of Asc 한 줄).
 *   2. 격국 chip 을 user.gyeokgukStatus 로 교체 (예: "정인격 · 반성반파").
 *   3. 재성 chip 을 user.rootStatus 로 교체 (예: "월령 寅 실령 · 통근 얇음").
 *   4. outer-row kind 매핑을 jupiter/saturn 외 pluto/uranus/neptune/chiron/
 *      progressed_moon glyph 까지 확장.
 *   5. detail 카드가 lifeStages 의 모든 단계에 대해 (detail!=null 인 경우) 렌더링.
 *   6. NatalLotsRow 섹션 — user.lots 7개 (Fortune/Spirit/Eros/Necessity/
 *      Courage/Victory/Nemesis) chip 그리드.
 *   7. ZR L1 챕터 carousel — lifetime.zrSpiritChapters / zrFortuneChapters
 *      두 lane 으로 표시. 정통 헬레니즘 핵심.
 *
 * NB. 본 컴포넌트는 atoms/* (Agent A) 가 noop 일 때도 컴파일·렌더 되도록
 *     필요 atom 의 최소 inline 버전을 동봉. Agent A 가 ships 하면
 *     `../atoms` import 로 한 줄 교체.
 */

'use client'

import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type {
  DestinyUserSummary,
  DestinyLifetime,
  DestinyDaewoon,
  DestinyLifeStage,
  DestinyMilestone,
  DestinyZRChapter,
  DestinyArabicLot,
  Ganji as GanjiData,
  ElementCounts,
} from '@/types/destinypal'
import styles from './LifetimeTier.module.css'

// ── Phase 3 정통화 확장: spec 이 요구하는 user.gyeokgukStatus / user.rootStatus
//    는 src/types/destinypal/user.ts 의 DestinyUserSummary 에 아직 미공개.
//    canonical 타입을 깨지 않으려고 LifetimeTier 의 prop 만 intersection 으로
//    옵셔널 확장. adapters/toUser.ts (Phase A) 가 항상 채워 보낸다.
export interface LifetimeTierUser extends DestinyUserSummary {
  /** 정통화 격국 상태 한 줄 — "정인격 · 반성반파 (+편인 보호 / -재성 분탈)". */
  gyeokgukStatus?: string
  /** 일간 뿌리 정통화 한 줄 — "월령 寅 실령 · 통근 얇음". */
  rootStatus?: string
}

export interface LifetimeTierProps {
  user: LifetimeTierUser
  lifetime: DestinyLifetime
  /** YearTier 로 줌인. constellation NOW 카드 + 하단 dive 버튼이 호출. */
  onDive: () => void
}

// ============================================================================
// Atoms — Agent A 가 ships 하면 `import { Ganji, ScoreOrb, ElementBars,
// LayerTag } from '../atoms'` 로 교체. 그 전까지 inline 동봉.
// ============================================================================

type LayerKind = 'saju' | 'astro'

function LayerTag({ kind }: { kind: LayerKind }) {
  const isSaju = kind === 'saju'
  const pipStyle: CSSProperties = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: isSaju ? 'var(--destinypal-ember, #c89a3a)' : 'var(--destinypal-accent, #b8442a)',
    boxShadow: isSaju
      ? '0 0 8px rgba(217,168,74,0.42)'
      : '0 0 8px rgba(184,68,42,0.32)',
    display: 'inline-block',
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--destinypal-mono, monospace)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--destinypal-ink-mute, #8b7660)',
      }}
    >
      <span style={pipStyle} /> {isSaju ? '사주 · SAJU' : '점성 · ASTRO'}
    </span>
  )
}

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
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        lineHeight: 1,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--destinypal-serif, serif)',
          fontSize: size,
          color: 'var(--destinypal-ember-2, #e0b653)',
          letterSpacing: '0.02em',
        }}
      >
        {data.hanja}
      </span>
      <span
        style={{
          fontFamily: 'var(--destinypal-mono, monospace)',
          color: 'var(--destinypal-ink-mute, #8b7660)',
          letterSpacing: '0.04em',
          fontSize: Math.max(10, size * 0.32),
          marginTop: 5,
        }}
      >
        {data.kr}
      </span>
      {en ? (
        <span
          style={{
            fontFamily: 'var(--destinypal-mono, monospace)',
            color: 'var(--destinypal-ink-faint, #b8a78c)',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
            fontSize: Math.max(9, size * 0.28),
            marginTop: 2,
          }}
        >
          {data.en}
        </span>
      ) : null}
    </span>
  )
}

function ScoreOrb({ score, grade }: { score: number; grade: string }) {
  const r = 58
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / 100))
  return (
    <div
      style={{
        position: 'relative',
        width: 132,
        height: 132,
        flex: 'none',
      }}
    >
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs>
          <linearGradient id="lifetime-orb-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--destinypal-accent, #b8442a)" />
            <stop offset="1" stopColor="var(--destinypal-accent-2, #d65a3b)" />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(80,50,30,0.10)" strokeWidth="4" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#lifetime-orb-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <b
          style={{
            fontFamily: 'var(--destinypal-serif, serif)',
            fontSize: 46,
            lineHeight: 1,
            color: 'var(--destinypal-ink, #2a1f15)',
          }}
        >
          {score}
        </b>
        <span
          style={{
            fontFamily: 'var(--destinypal-mono, monospace)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--destinypal-ink-mute, #8b7660)',
            marginTop: 4,
          }}
        >
          SCORE · {grade}
        </span>
      </div>
    </div>
  )
}

const ELEMENT_COLORS: Record<keyof ElementCounts, string> = {
  목: 'var(--destinypal-el-wood, #5fae6a)',
  화: 'var(--destinypal-el-fire, #e0654f)',
  토: 'var(--destinypal-el-earth, #cda14e)',
  금: 'var(--destinypal-el-metal, #9aa0b0)',
  수: 'var(--destinypal-el-water, #4f86d6)',
}

function ElementBars({ elements }: { elements: ElementCounts }) {
  const entries = Object.entries(elements) as Array<[keyof ElementCounts, number]>
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
        alignItems: 'flex-end',
        height: 46,
        marginTop: 6,
      }}
    >
      {entries.map(([k, v]) => {
        const col = ELEMENT_COLORS[k]
        return (
          <div
            key={k}
            style={{
              flex: 1,
              borderRadius: '4px 4px 2px 2px',
              position: 'relative',
              minHeight: 6,
              opacity: 0.9,
              height: 16 + (v / max) * 30,
              background: `linear-gradient(180deg, ${col}, rgba(0,0,0,0.04))`,
              boxShadow: `0 0 12px -2px ${col}`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -17,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--destinypal-serif, serif)',
                fontSize: 13,
                color: col,
              }}
            >
              {k}
            </span>
            <small
              style={{
                position: 'absolute',
                bottom: -16,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--destinypal-mono, monospace)',
                fontSize: 9,
                color: 'var(--destinypal-ink-faint, #b8a78c)',
              }}
            >
              {v}
            </small>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// 헬퍼
// ============================================================================

/** 한자 → 한글 lord-of-asc 이름. ('Saturn'/'토성' 둘 다 받아냄.) */
const PLANET_KO_FALLBACK: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
}
function planetKo(name: string | undefined): string {
  if (!name) return ''
  return PLANET_KO_FALLBACK[name] ?? name
}

/** outer-row kind 매핑 확장 — destinypal demo 의 jupiter/saturn 외 정통 신호. */
type OuterKind =
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'chiron'
  | 'progressed_moon'
  | 'astro'
  | 'unknown'

const OUTER_GLYPH: Record<OuterKind, string> = {
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  chiron: '⚷',
  progressed_moon: '☾',
  astro: '✦',
  unknown: '·',
}

function normalizeOuterKind(raw: string | undefined): OuterKind {
  if (!raw) return 'unknown'
  const k = raw.toLowerCase().replace(/[-\s]/g, '_')
  if (
    k === 'jupiter' ||
    k === 'saturn' ||
    k === 'uranus' ||
    k === 'neptune' ||
    k === 'pluto' ||
    k === 'chiron' ||
    k === 'progressed_moon'
  ) {
    return k
  }
  if (k === 'astro') return 'astro'
  return 'unknown'
}

/** 카드 클래스 분기 — module CSS 키 누락 시 폴백. */
function outerChipClass(kind: OuterKind): string {
  const map: Record<OuterKind, string | undefined> = {
    jupiter: styles.jupiter,
    saturn: styles.saturn,
    uranus: styles.uranus,
    neptune: styles.neptune,
    pluto: styles.pluto,
    chiron: styles.chiron,
    progressed_moon: styles.progressed_moon ?? styles.progressedMoon,
    astro: styles.astro,
    unknown: styles.unknown,
  }
  return [styles.outerChip, map[kind]].filter(Boolean).join(' ')
}

/** ArabicLot name → 한국어 라벨. */
const LOT_KO: Record<string, string> = {
  Fortune: '복점·재물',
  Spirit: '영혼·소명',
  Eros: '에로스·욕망',
  Necessity: '필요·운명',
  Courage: '용기·전투',
  Victory: '승리·성취',
  Nemesis: '응보·시험',
}

/** chapter 표시 라벨 보정. */
function zrLaneTitle(startLot: 'Spirit' | 'Fortune'): {
  ko: string
  en: string
} {
  if (startLot === 'Spirit') return { ko: '영혼 · Spirit', en: '진로·외적 사건' }
  return { ko: '복점 · Fortune', en: '몸·물질·체질' }
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function LifetimeTier({ user, lifetime, onDive }: LifetimeTierProps) {
  const { lifeStages, daewoon, milestones } = lifetime

  // constellation node positions across the width — lifetime.jsx:10-11
  const nodeX = [12, 38, 62, 88] // %
  const nodeY = [62, 38, 50, 70]

  // 정통화 라벨 폴백
  const gyeokgukLabel = user.gyeokgukStatus ?? user.gyeokguk
  const rootStatusLabel =
    user.rootStatus ??
    (user.dominantSibsin
      ? `${user.dominantSibsin.name} ${user.dominantSibsin.pct}%`
      : '')

  // Sect 한 줄
  const sectLine = useMemo(() => buildSectLine(user), [user])

  // detail 이 채워진 stage 들 (변형 5: 모든 단계가 detail 받게)
  const stagesWithDetail = lifeStages.filter((s) => s.detail != null)

  // 현재 진행 stage (가장 우선 — onDive 표지 + dive 버튼 라벨 보조)
  const currentStage = lifeStages.find((s) => s.now)

  // milestone 의 next-up 표시 연도 (dive 버튼 라벨 보조)
  const targetYear = lifetime.currentYear

  return (
    <div className={styles.root}>
      <div className={styles.inner} data-screen-label="인생 84년">
        {/* ---------- intro ---------- */}
        <div className={styles.eyebrow}>인생 · LIFETIME · 84년</div>
        <h1 className={styles.display}>내 인생 전체 흐름</h1>
        <p className={`${styles.tiny} ${styles.metaLine}`}>
          {user.birthKo} · {user.place} · {user.sex} &nbsp;|&nbsp; Sun {user.astro.sunEn} · Asc {user.astro.ascEn} · MC {user.astro.mcEn}
        </p>

        <div className={styles.introGrid}>
          <div>
            <p className={styles.lead}>{user.intro}</p>
            {user.introEn ? <p className={styles.leadEn}>{user.introEn}</p> : null}

            {/* (변형 1) Sect 한 줄 — intro 좌측, lead 본문 아래 */}
            {sectLine ? (
              <div className={styles.sectRow}>
                <b>Sect</b> {sectLine}
              </div>
            ) : null}
          </div>

          <div className={`${styles.panel} ${styles.panelLifetime}`}>
            <ScoreOrb score={user.score} grade={user.grade} />
            <div className={styles.introRight}>
              <div className={styles.idChips}>
                <span className={styles.chip}>
                  <span className="k">일간</span>
                  <span className="han">{user.ilgan.hanja}</span>
                  <span className="v">{user.ilgan.kr}</span>
                </span>

                {/* (변형 2) 격국 → gyeokgukStatus. F등급 라벨 표기 없음. */}
                <span className={styles.chip}>
                  <span className="k">격국</span>
                  <span className="v">{gyeokgukLabel}</span>
                </span>

                <span className={styles.chip}>
                  <span className="k">용신</span>
                  {user.yongsin?.hanja ? <span className="han">{user.yongsin.hanja}</span> : null}
                </span>

                <span className={styles.chip}>
                  <span className="k">강약</span>
                  <span className="v">{user.gangyak}</span>
                </span>

                {/* (변형 3) 재성 → rootStatus (월령/통근). */}
                {rootStatusLabel ? (
                  <span className={styles.chip}>
                    <span className="k">뿌리</span>
                    <span className="v">{rootStatusLabel}</span>
                  </span>
                ) : null}
              </div>
              <div className={styles.elementsBox}>
                <div className={`${styles.tiny} ${styles.elementsCaption}`}>
                  사주 8자 오행 분포 {dominantElementLabel(user.elements)}
                </div>
                <ElementBars elements={user.elements} />
              </div>
            </div>
          </div>
        </div>

        {/* (변형 6) ---------- Natal Lots row ---------- */}
        {user.lots && user.lots.length > 0 ? (
          <div className={styles.lotsRow}>
            <div className={styles.lotsRowHead}>
              <b>Arabic Lots · 7대 점성 점</b>
              <span>본명 sect 적용</span>
            </div>
            <div className={styles.lotsGrid}>
              {user.lots.map((lot) => (
                <LotChip key={lot.name} lot={lot} />
              ))}
            </div>
          </div>
        ) : null}

        {/* ---------- constellation of life stages ---------- */}
        <div className={styles.block}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>네 시기의 별자리</h2>
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
                stroke="rgba(184,68,42,0.35)"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 1.5"
              />
              {lifeStages.map((s, i) => (
                <g key={s.id}>
                  <circle
                    cx={nodeX[i] ?? 0}
                    cy={nodeY[i] ?? 0}
                    r={s.now ? 3.2 : 2}
                    fill={s.now ? 'var(--destinypal-accent, #b8442a)' : 'rgba(80,50,30,0.06)'}
                    stroke={
                      s.now
                        ? 'var(--destinypal-accent-2, #d65a3b)'
                        : 'var(--destinypal-ink-faint, #b8a78c)'
                    }
                    strokeWidth={s.now ? 1 : 0.6}
                    vectorEffect="non-scaling-stroke"
                    style={
                      s.now
                        ? {
                            filter:
                              'drop-shadow(0 0 5px rgba(184,68,42,0.45))',
                          }
                        : undefined
                    }
                  />
                  {s.now ? (
                    <circle
                      cx={nodeX[i] ?? 0}
                      cy={nodeY[i] ?? 0}
                      r="5.5"
                      fill="none"
                      stroke="var(--destinypal-accent, #b8442a)"
                      strokeWidth="0.4"
                      opacity="0.55"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                </g>
              ))}
            </svg>
          </div>

          <div className={styles.stageCards}>
            {lifeStages.map((s) => (
              <StageCard
                key={s.id}
                stage={s}
                onDive={s.now ? onDive : undefined}
              />
            ))}
          </div>
        </div>

        {/* (변형 5) ---------- per-stage detail (모든 detail!=null 단계) ---------- */}
        {stagesWithDetail.map((stage) => (
          <StageDetail
            key={stage.id}
            stage={stage}
            daewoon={daewoon}
            isCurrent={stage.now}
          />
        ))}

        {/* (변형 7) ---------- ZR L1 챕터 carousel ---------- */}
        {(lifetime.zrSpiritChapters?.length || lifetime.zrFortuneChapters?.length) ? (
          <div className={styles.zrSection}>
            <div className={styles.secHead}>
              <h2 className={styles.secTitle}>Zodiacal Releasing · 챕터</h2>
              <span className={styles.tiny}>Hellenistic L1 — Spirit / Fortune</span>
            </div>
            <div className={styles.zrLanes}>
              <ZRLane
                lane="Spirit"
                chapters={lifetime.zrSpiritChapters}
                currentYear={lifetime.currentYear}
                birthYear={lifetime.birthYear}
              />
              <ZRLane
                lane="Fortune"
                chapters={lifetime.zrFortuneChapters}
                currentYear={lifetime.currentYear}
                birthYear={lifetime.birthYear}
              />
            </div>
          </div>
        ) : null}

        {/* ---------- milestone timeline ---------- */}
        <div className={styles.miles}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>분기점 타임라인</h2>
            <span className={styles.tiny}>사주 · 점성 수렴 마디</span>
          </div>
          <div className={styles.mileTrack}>
            {milestones.map((m) => (
              <MilestoneRow key={`${m.year}-${m.kind}`} m={m} />
            ))}
          </div>
        </div>

        <div className={styles.diveWrap}>
          <button type="button" className={styles.dive} onClick={onDive}>
            {`${targetYear}${currentStage ? ` · ${currentStage.name}` : ''} 으로 줌인`}{' '}
            <span className={styles.diveArrow}>↓</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LifetimeTier

// ============================================================================
// Sub-components
// ============================================================================

function StageCard({
  stage,
  onDive,
}: {
  stage: DestinyLifeStage
  onDive?: () => void
}) {
  const isNow = stage.now
  return (
    <div
      className={`${styles.stageCard} ${isNow ? styles.stageCardNow : ''}`}
      onClick={onDive}
      role={onDive ? 'button' : undefined}
      tabIndex={onDive ? 0 : undefined}
      onKeyDown={
        onDive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onDive()
              }
            }
          : undefined
      }
    >
      {isNow ? <span className={styles.stageNowTag}>지금 · NOW</span> : null}
      <div className={styles.stageName}>{stage.name}</div>
      <div className={styles.stageAge}>
        {stage.ageFrom}–{stage.ageTo}세 · {stage.yearFrom}–{stage.yearTo}
      </div>
      <div className={styles.stageTone}>{stage.tone}</div>
      {isNow ? (
        <div className={`${styles.tiny} ${styles.stageDiveHint}`}>
          탭하면 올해로 줌인 ↘
        </div>
      ) : null}
    </div>
  )
}

function StageDetail({
  stage,
  daewoon,
  isCurrent,
}: {
  stage: DestinyLifeStage
  daewoon: DestinyDaewoon[]
  isCurrent: boolean
}) {
  const detail = stage.detail
  if (!detail) return null

  // 현재 stage 만 전체 대운 스파인 노출. 과거 stage 는 stage 본인 ageRange 와
  // 교차하는 대운만 추려 시각화. data 가 작아 단순 필터로 충분.
  const relevantDaewoon: DestinyDaewoon[] = isCurrent
    ? daewoon
    : daewoon.filter(
        (d) => d.start <= stage.yearTo && d.end >= stage.yearFrom,
      )

  return (
    <div className={styles.stageDetail}>
      <div className={styles.secHead}>
        <h2 className={styles.secTitle}>
          {stage.name} — {isCurrent ? '지금의 결' : '그 시기의 결'}
        </h2>
        <span className={styles.tiny}>
          {stage.ageFrom}–{stage.ageTo}세 · {stage.yearFrom}–{stage.yearTo}
        </span>
      </div>

      {/* daewoon spine */}
      {relevantDaewoon.length > 0 ? (
        <div className={`${styles.panel} ${styles.daewoonPanel}`}>
          <LayerTag kind="saju" />
          <div className={styles.daewoonRow}>
            {relevantDaewoon.map((dw, i) => (
              <div className={styles.daewoonItem} key={`${dw.gz.hanja}-${dw.start}`}>
                <div className={styles.daewoonCell}>
                  <Ganji data={dw.gz} size={30} />
                  <div className={`${styles.tiny} ${styles.daewoonRange}`}>
                    {dw.start}–{dw.end}
                  </div>
                  {dw.sibsin !== '—' ? (
                    <div className={styles.daewoonSibsin}>{dw.sibsin}</div>
                  ) : null}
                </div>
                {i < relevantDaewoon.length - 1 ? (
                  <span className={styles.daewoonArrow}>→</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {detail.body && detail.body.length > 0 ? (
        <p className={styles.lead} style={{ marginTop: 16 }}>
          {detail.body.join(' ')}
        </p>
      ) : null}

      {detail.hapchung || detail.shinsal || detail.unseong ? (
        <div className={styles.detailGrid}>
          {detail.hapchung ? (
            <DCard
              icon="⚡"
              iconColor="var(--destinypal-accent-2, #d65a3b)"
              head="합충 · HAPCHUNG"
              chip={detail.hapchung}
            />
          ) : null}
          {detail.shinsal ? (
            <DCard
              icon="✦"
              iconColor="var(--destinypal-violet-2, #9b6dde)"
              head="신살 · SHINSAL"
              chip={detail.shinsal}
            />
          ) : null}
          {detail.unseong ? (
            <DCard
              icon="◯"
              iconColor="var(--destinypal-ink-dim, #5a4a38)"
              head="12운성 · UNSEONG"
              chip={detail.unseong}
            />
          ) : null}
        </div>
      ) : null}

      {/* (변형 4) outer planets — kind 매핑 확장 */}
      {detail.outer && detail.outer.length > 0 ? (
        <div className={styles.outerWrap}>
          <LayerTag kind="astro" />
          <span className={`${styles.tiny} ${styles.outerHead}`}>
            외행성 마디 · Outer-planet returns
          </span>
          <div className={styles.outerRow}>
            {detail.outer.map((o, i) => {
              const kind = normalizeOuterKind(o.kind)
              return (
                <div
                  key={`${o.label}-${i}`}
                  className={outerChipClass(kind)}
                >
                  <span className="ic">{OUTER_GLYPH[kind]}</span>
                  <div className="ot">
                    <div className="l">{o.label}</div>
                    <div className="d">
                      {o.date ? `${o.date} · ` : ''}
                      {o.body}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DCard({
  icon,
  iconColor,
  head,
  chip,
}: {
  icon: ReactNode
  iconColor: string
  head: string
  chip: { title: string; romaji?: string; body: string }
}) {
  return (
    <div className={styles.dcard}>
      <div className="h">
        <span className={styles.glyphMini} style={{ color: iconColor }}>
          {icon}
        </span>{' '}
        {head}
      </div>
      <div className="t">{chip.title}</div>
      {chip.romaji ? <div className="r">{chip.romaji}</div> : null}
      <div className="b">{chip.body}</div>
    </div>
  )
}

function MilestoneRow({ m }: { m: DestinyMilestone }) {
  return (
    <div className={`${styles.mile} ${m.now ? styles.mileNow : ''}`}>
      <span className={styles.mileNode} />
      <span className={styles.mileYr}>
        {m.year}
        <small>{m.age}세</small>
      </span>
      <span className={styles.mileLab}>
        {m.label}
        {m.now ? <span className={styles.mileNowMark}>← 지금</span> : null}
      </span>
    </div>
  )
}

function LotChip({ lot }: { lot: DestinyArabicLot }) {
  const koLabel = lot.korean ?? LOT_KO[lot.name] ?? lot.name
  return (
    <div className={styles.lotChip}>
      <span className={styles.lotName}>{lot.name}</span>
      <span className={styles.lotSign}>
        {lot.sign} · {koLabel}
      </span>
      <span className={styles.lotMeta}>
        {Math.round(lot.degree)}° · {lot.house}H
      </span>
    </div>
  )
}

function ZRLane({
  lane,
  chapters,
  currentYear,
  birthYear,
}: {
  lane: 'Spirit' | 'Fortune'
  chapters: DestinyZRChapter[] | undefined
  currentYear: number
  birthYear: number
}) {
  if (!chapters || chapters.length === 0) return null
  const title = zrLaneTitle(lane)
  return (
    <div className={styles.zrLane}>
      <div className={styles.zrLaneHead}>
        <b>{title.ko}</b>
        <span>{title.en}</span>
      </div>
      <div className={styles.zrCarousel}>
        {chapters.map((ch, i) => {
          const startYear = ch.calendarStartYear ?? birthYear + ch.startYear
          const endYear = ch.calendarEndYear ?? birthYear + ch.endYear
          const isNow = ch.now
          const remain = isNow ? Math.max(0, endYear - currentYear) : null
          return (
            <div
              key={`${lane}-${i}-${ch.sign}-${startYear}`}
              className={`${styles.zrCard} ${isNow ? styles.zrCardNow : ''}`}
            >
              <span className={styles.zrSignLine}>
                {ch.sign}
              </span>
              <span className={styles.zrRulerLine}>
                {planetKo(ch.ruler)} · {ch.ruler}
              </span>
              <span className={styles.zrYearLine}>
                {startYear}–{endYear} · {Math.round(ch.durationYears)}yr
              </span>
              {isNow ? (
                <>
                  <span className={styles.zrNowTag}>NOW · 현재 챕터</span>
                  {remain != null ? (
                    <span className={styles.zrRemainLine}>
                      남은 {remain}년
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// 라벨 헬퍼
// ============================================================================

function dominantElementLabel(elements: ElementCounts): string {
  const entries = Object.entries(elements) as Array<
    [keyof ElementCounts, number]
  >
  if (entries.length === 0) return ''
  entries.sort((a, b) => b[1] - a[1])
  const [top] = entries
  if (!top || top[1] <= 0) return ''
  const elementEn: Record<keyof ElementCounts, string> = {
    목: 'Wood',
    화: 'Fire',
    토: 'Earth',
    금: 'Metal',
    수: 'Water',
  }
  return `— ${top[0]}(${elementEn[top[0]]}) 최다`
}

function buildSectLine(user: DestinyUserSummary): string | null {
  const sectKo = user.sect === 'day' ? '낮(Day)' : user.sect === 'night' ? '밤(Night)' : null
  if (!sectKo) return null
  const sectLight = user.sect === 'day' ? 'Sun' : 'Moon'
  const sectLightKo = user.sect === 'day' ? '태양' : '달'
  // Lord of Asc — almutenFiguris.planet 사용 (Asc dispositor 대체 — Phase A
  // 의 toUser 는 dignities 최대값 행성을 채워두므로 Lord of Asc 와 유사한
  // signal 로 활용. 정확한 Asc ruler 가 추후 들어오면 그때 교체.)
  const lordAsc = user.almutenFiguris?.planet
  const lordKo = planetKo(lordAsc)
  const parts: string[] = []
  parts.push(sectKo)
  parts.push(`Sect light = ${sectLight} (${sectLightKo})`)
  if (lordAsc) parts.push(`Lord of Asc ≈ ${lordKo} (${lordAsc})`)
  return parts.join(' · ')
}
