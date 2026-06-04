/**
 * @file YearTier.tsx
 * destinypal 4-tier 의 두 번째 카드 — 1년 (YEARLY · profection year).
 *
 * 원본: destinypal-extracted/js/tiers/year.jsx (110 줄)
 * 디자인 ref: destinypal-extracted/css/tiers.css (.year-wrap 외)
 *
 * 포팅 + Phase 3 신호 보강:
 *  - 12-house wheel + 본명 행성 도트 + 외행성 transit 도트 (2 레이어)
 *  - Profection readout (KV + Lord-of-Year dignity + sect)
 *  - ZR Spirit/Fortune L1+L2 카드 (sign·ruler·duration·remain + LoB/Peak 마커)
 *  - Solar Return 카드 (ascSign · mcSign · exactDate — 백엔드가 채워주면)
 *  - 응용 패턴 칩 row (관인상생/재생관/상관견관 등)
 *  - Cross-activation 페어 카드 (정관(丙) × Saturn transit 등)
 *  - 세운 sajuNote (용신 점등 + 조후)
 *  - wheel 좌상단 Pivotal 배지 (LoB / Peak / Solar Arc conjunction 등)
 *
 * 다른 atom 신규 추가 X — 자체 SVG / 인라인 칩으로 처리.
 */

'use client'

import { useMemo, type ReactElement } from 'react'
import type {
  DestinyUserSummary,
  DestinyYear,
  DestinyDignityEntry,
  DestinyDecadeZRChapter,
  DestinyAppliedPattern,
  DestinyCrossActivation,
} from '@/types/destinypal'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import { Ganji, LayerTag } from '@/components/destinypal/atoms'
import styles from './YearTier.module.css'

// ============================================================================
// Props
// ============================================================================

export interface YearTierProps {
  /** 본명 카드 데이터 (12-house wheel 의 본명 행성 도트 출처). */
  user: DestinyUserSummary
  /** 1년 (세운) 카드 데이터. */
  year: DestinyYear
  /** 줌인 → MonthTier. */
  onDive: () => void
  /** 줌아웃 → LifetimeTier. */
  onRise: () => void
}

// ============================================================================
// Geometry — 360° → 12 house slice helpers.
// ============================================================================

const CX = 180
const CY = 180
const R = 150 // 외곽 둘레
const R_INNER = R - 44 // 안쪽 둘레
const R_NATAL_DOT = R - 18 // 본명 행성 도트 반경
const R_TRANSIT_DOT = R + 12 // transit 도트 반경 (외곽 밖)
const R_LABEL = R - 22 // 하우스 번호 라벨

/** 1..12 하우스를 12시 방향(=-90°) 기준 SVG 각도(라디안)로 변환. */
function houseToAngle(house: number, mid = false): number {
  const offset = mid ? -0.5 : -1
  return ((house + offset) / 12) * Math.PI * 2 - Math.PI / 2
}

/** sign 경계 0°(Aries 시작) 기준 sign+within-sign degree → 절대 0..360°. */
function signDegreeToAbsolute(sign: ZodiacKo, withinDegree: number): number {
  const SIGN_ORDER: ZodiacKo[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ]
  const idx = SIGN_ORDER.indexOf(sign)
  return idx * 30 + Math.max(0, Math.min(29.999, withinDegree))
}

/**
 * 절대 각도(0=Aries 시작) → wheel SVG 좌표.
 * SVG 는 시계방향 + 12시(-90°) 기준 — house 1 이 9시 (180°) 가 아니라 ASC 위치인
 * 점성 표준을 따른다. 여기서는 간단화: profection 휠이라 본명 차트와 1:1
 * 안배가 아니어도 되므로 "Aries=상단" 기준 시계방향으로 둔다.
 */
function absoluteToWheelPos(abs: number, radius: number): { x: number; y: number } {
  // 0° → 12시(상단). 시계방향.
  const rad = (abs / 360) * Math.PI * 2 - Math.PI / 2
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  }
}

// ============================================================================
// 본명 행성 도트 / Transit 도트 추출.
// ============================================================================

/** 본명 dignity 묶음에서 wheel 위 도트로 그릴 행성들. */
function natalDots(user: DestinyUserSummary): Array<{
  planet: string
  abs: number
  glyph: string
}> {
  const GLYPH: Record<string, string> = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  }
  // user.dignities 는 본명 행성 묶음 (sign/degree 포함). 외행성 4 개는 제외 — 본명
  // 도트는 personal planets 위주로.
  const PERSONAL = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])
  return user.dignities
    .filter((d: DestinyDignityEntry) => PERSONAL.has(String(d.planet)))
    .map((d) => ({
      planet: String(d.planet),
      abs: signDegreeToAbsolute(d.sign, d.degree),
      glyph: GLYPH[String(d.planet)] ?? '·',
    }))
}

/**
 * 외행성(Saturn/Uranus/Neptune/Pluto) 현재 transit 도트.
 *
 * 정식 transit 데이터는 백엔드에서 year 페이로드 확장 시 들어옴 — 현재 타입은
 * 노출하지 않으므로, year 페이로드에 `slowTransits` 필드가 있을 때만 그린다
 * (TypeScript 측에선 optional cast).
 */
interface SlowTransitDot {
  planet: string
  sign: ZodiacKo
  degree: number
}
function transitDots(year: DestinyYear): Array<{
  planet: string
  abs: number
  glyph: string
}> {
  const yWithExt = year as DestinyYear & { slowTransits?: SlowTransitDot[] }
  const slow = yWithExt.slowTransits
  if (!slow || !Array.isArray(slow)) return []
  const GLYPH: Record<string, string> = {
    Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  }
  return slow
    .filter((t) => GLYPH[t.planet])
    .map((t) => ({
      planet: t.planet,
      abs: signDegreeToAbsolute(t.sign, t.degree),
      glyph: GLYPH[t.planet],
    }))
}

// ============================================================================
// Lord-of-Year dignity (정통 보강) — profection ruler 의 본명 dignity 한 줄.
// ============================================================================

function lordOfYearDignity(year: DestinyYear, user: DestinyUserSummary): string | null {
  const ruler = year.profection.rulerEn
  const entry = user.dignities.find((d) => String(d.planet) === String(ruler))
  if (!entry) return null
  const tiers = entry.tiers
  const labels: string[] = []
  if (tiers.domicile) labels.push('domicile')
  if (tiers.exaltation) labels.push('exaltation')
  if (tiers.detriment) labels.push('detriment')
  if (tiers.fall) labels.push('fall')
  if (tiers.triplicity) labels.push('triplicity')
  if (tiers.term) labels.push('term')
  if (tiers.face) labels.push('face')
  const tierLine = labels.length > 0 ? labels.join(' · ') : 'peregrine'
  return `${ruler} · ${tierLine} (score ${entry.score})`
}

// ============================================================================
// ZR chapter 표시 헬퍼.
// ============================================================================

interface ZRDisplayRow {
  level: 'L1' | 'L2'
  sign: string
  ruler: string
  duration: string
  remain?: string
  isPeak: boolean
  isLoB: boolean
}

function zrChapterRows(
  chapters: DestinyDecadeZRChapter[],
  year: number,
): ZRDisplayRow[] {
  const rows: ZRDisplayRow[] = []
  for (const ch of chapters) {
    if (ch.calendarStartYear > year || ch.calendarEndYear <= year) continue
    rows.push({
      level: 'L1',
      sign: ch.sign,
      ruler: ch.ruler,
      duration: `${ch.calendarStartYear}–${ch.calendarEndYear}`,
      remain: `${Math.max(0, ch.calendarEndYear - year)}년 남음`,
      // L1 chapter 자체는 peak/LoB 마커가 없다 — sub-period 에만 있음.
      isPeak: false,
      isLoB: false,
    })
    if (ch.subPeriods) {
      // sub-period 의 startYear/endYear 는 calendar 가 아니라 본명 출생 기준
      // years (실수). 현재 calendar year 대비 비교는 birth offset 이 필요하지만,
      // 여기서는 sub.startYear / endYear 가 이미 calendar 로 환산되어 들어왔다는
      // adapter 의 약속을 따른다 (decade.ts 사양에 명시).
      for (const sub of ch.subPeriods) {
        if (sub.startYear > year || sub.endYear <= year) continue
        rows.push({
          level: 'L2',
          sign: String(sub.sign),
          ruler: String(sub.ruler),
          duration: `${sub.startYear}–${sub.endYear}`,
          remain: `${Math.max(0, sub.endYear - year)}년 남음`,
          isPeak: sub.isPeak,
          isLoB: sub.isLoosingOfTheBond,
        })
      }
    }
  }
  return rows
}

// ============================================================================
// Solar Return / Applied Patterns / Cross Pairs (optional 확장).
// 백엔드가 year 페이로드에 붙여줄 때만 표시 — 타입 안전 옵셔널.
// ============================================================================

interface SolarReturnDataExt {
  ascSign?: ZodiacKo
  mcSign?: ZodiacKo
  exactDate?: string
}

function pickSolarReturn(year: DestinyYear): SolarReturnDataExt | null {
  const ext = year as DestinyYear & { solarReturn?: SolarReturnDataExt }
  return ext.solarReturn ?? null
}

function pickAppliedPatterns(year: DestinyYear): DestinyAppliedPattern[] {
  const ext = year as DestinyYear & { appliedPatterns?: DestinyAppliedPattern[] }
  return ext.appliedPatterns ?? []
}

function pickCrossPairs(year: DestinyYear): DestinyCrossActivation[] {
  const ext = year as DestinyYear & { crossPairs?: DestinyCrossActivation[] }
  return ext.crossPairs ?? []
}

interface PivotalBadgeData {
  label: string
}

function pickPivotal(year: DestinyYear): PivotalBadgeData | null {
  // ZR Sub-period 의 LoB / Peak 이 올해 들어오면 학파 중요 이벤트.
  const y = year.year
  const all = [...(year.zrSpiritChapters ?? []), ...(year.zrFortuneChapters ?? [])]
  for (const ch of all) {
    if (ch.calendarStartYear > y || ch.calendarEndYear <= y) continue
    if (ch.subPeriods) {
      for (const sub of ch.subPeriods) {
        if (sub.startYear > y || sub.endYear <= y) continue
        if (sub.isLoosingOfTheBond) return { label: 'Loosing of the Bond' }
        if (sub.isPeak) return { label: 'Peak Period' }
      }
    }
  }
  // Solar Arc conjunction 등 (백엔드가 채워줄 경우).
  const ext = year as DestinyYear & { pivotal?: PivotalBadgeData }
  if (ext.pivotal) return ext.pivotal
  return null
}

// ============================================================================
// Component
// ============================================================================

export function YearTier(props: YearTierProps): ReactElement {
  const { user, year, onDive, onRise } = props
  const p = year.profection

  // wheel slices — 12 hardcoded.
  const houses = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])

  const natal = useMemo(() => natalDots(user), [user])
  const transits = useMemo(() => transitDots(year), [year])
  const lordDignity = useMemo(() => lordOfYearDignity(year, user), [year, user])

  const zrSpiritRows = useMemo(
    () => zrChapterRows(year.zrSpiritChapters ?? [], year.year),
    [year],
  )
  const zrFortuneRows = useMemo(
    () => zrChapterRows(year.zrFortuneChapters ?? [], year.year),
    [year],
  )
  const solarReturn = useMemo(() => pickSolarReturn(year), [year])
  const appliedPatterns = useMemo(() => pickAppliedPatterns(year), [year])
  const crossPairs = useMemo(() => pickCrossPairs(year), [year])
  const pivotal = useMemo(() => pickPivotal(year), [year])

  return (
    <div className={styles.root} data-screen-label={`1년 ${year.year}`}>
      <button type="button" className={styles.rise} onClick={onRise} aria-label="인생으로 줌아웃">
        ↑ 인생으로 줌아웃
      </button>

      <div className={styles.eyebrow}>1년 · YEARLY · {year.year}</div>
      <h1 className={styles.display}>올해의 흐름</h1>
      <p className={styles.headline}>{year.headline}</p>

      <div className={styles.wrap}>
        {/* === 12-house wheel === */}
        <div className={styles.wheelBox}>
          {pivotal && (
            <div className={styles.pivotalBadge} title={pivotal.label}>
              {pivotal.label}
            </div>
          )}
          <svg className={styles.wheel} viewBox="0 0 360 360" role="img" aria-label="12 하우스 휠">
            <defs>
              <radialGradient id="dp-year-wheelglow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="rgba(91,141,239,0.12)" />
                <stop offset="1" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* glow + 둘레 */}
            <circle cx={CX} cy={CY} r={R} fill="url(#dp-year-wheelglow)" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line)" strokeWidth="1" />
            <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="var(--line-soft)" strokeWidth="1" />

            {/* houses */}
            {houses.map((h) => {
              const a0 = houseToAngle(h)
              const a1 = houseToAngle(h + 1)
              const mid = (a0 + a1) / 2
              const active = h === p.house
              const lx = CX + Math.cos(mid) * R_LABEL
              const ly = CY + Math.sin(mid) * R_LABEL
              const sx = CX + Math.cos(a0) * R
              const sy = CY + Math.sin(a0) * R

              return (
                <g key={`house-${h}`}>
                  <line x1={CX} y1={CY} x2={sx} y2={sy} stroke="var(--line-soft)" strokeWidth="0.7" />
                  {active && (() => {
                    const steps = 18
                    const pts: Array<[number, number]> = [[CX, CY]]
                    for (let s = 0; s <= steps; s++) {
                      const a = a0 + (a1 - a0) * (s / steps)
                      pts.push([CX + Math.cos(a) * R, CY + Math.sin(a) * R])
                    }
                    return (
                      <polygon
                        points={pts.map((pt) => pt.join(',')).join(' ')}
                        fill="rgba(91,141,239,0.2)"
                        stroke="var(--accent)"
                        strokeWidth="1"
                      />
                    )
                  })()}
                  <text
                    x={lx}
                    y={ly}
                    className={active ? styles.houseNumActive : styles.houseNum}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {h}
                  </text>
                </g>
              )
            })}

            {/* === natal planet dots (inside ring) === */}
            {natal.map((dot) => {
              const pos = absoluteToWheelPos(dot.abs, R_NATAL_DOT)
              return (
                <g key={`natal-${dot.planet}`}>
                  <circle cx={pos.x} cy={pos.y} r={6.5} fill="rgba(217,168,74,0.18)" stroke="var(--ember-2)" strokeWidth="1" />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="9"
                    fill="var(--ember-2)"
                    style={{ fontFamily: 'var(--serif)' }}
                  >
                    {dot.glyph}
                  </text>
                </g>
              )
            })}

            {/* === outer (slow) transit dots (outside ring) === */}
            {transits.map((dot) => {
              const pos = absoluteToWheelPos(dot.abs, R_TRANSIT_DOT)
              return (
                <g key={`transit-${dot.planet}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={7}
                    fill="rgba(155,109,222,0.16)"
                    stroke="var(--violet-2)"
                    strokeWidth="1"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="9.5"
                    fill="var(--violet-2)"
                    style={{ fontFamily: 'var(--serif)' }}
                  >
                    {dot.glyph}
                  </text>
                </g>
              )
            })}

            {/* center label */}
            <text x={CX} y={CY - 6} textAnchor="middle" className={styles.wheelCenterLabel}>house</text>
            <text x={CX} y={CY + 18} textAnchor="middle" className={styles.wheelCenterValue}>{p.house}</text>
          </svg>
        </div>

        {/* === readouts: astro + saju === */}
        <div>
          <LayerTag kind="astro" />
          <div>
            <div className={styles.big}>{p.house}번째 영역이 무대</div>
            <p className={styles.lead}>
              {p.theme} <span className={styles.muted}>· {p.themeEn}</span>
            </p>
            <dl className={styles.kv}>
              <dt>profection</dt>
              <dd><b>{p.house}하우스</b> 활성</dd>
              <dt>cusp</dt>
              <dd>{p.cusp} <span className={styles.muted}>{p.cuspEn}</span></dd>
              <dt>ruler</dt>
              <dd><b>{p.ruler}</b> <span className={styles.muted}>{p.rulerEn}</span></dd>
              <dt>ruler 본명</dt>
              <dd>{p.rulerNatal}</dd>
              {lordDignity && (
                <>
                  <dt>Lord dignity</dt>
                  <dd className={styles.muted}>{lordDignity}</dd>
                </>
              )}
              <dt>Lord 본명 sect</dt>
              <dd>
                {user.sect === 'day' ? '낮 출생 (diurnal)' : '밤 출생 (nocturnal)'}
              </dd>
            </dl>
            <p className={styles.astroNote}>{year.astroNote}</p>
          </div>

          <hr className={styles.hr} />

          <LayerTag kind="saju" />
          <div className={styles.sajuRow}>
            <Ganji data={year.sewoonGz ?? year.sewoon.gz} size={42} accent="ember" />
            <div>
              <div className={styles.sajuLabel}>
                세운 {year.year} · {year.sewoonSibsin}
              </div>
              <p className={styles.sajuNote}>{year.sajuNote}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === Phase 3 보강 카드들 === */}
      <div className={styles.cardsGrid}>
        {/* ZR Spirit + Fortune */}
        {(zrSpiritRows.length > 0 || zrFortuneRows.length > 0) && (
          <div className={`${styles.card} ${styles.astro}`}>
            <span className={styles.cardLabel}>ZR · Zodiacal Releasing</span>
            <div className={styles.cardTitle}>이번 해의 챕터</div>
            {zrSpiritRows.length > 0 && (
              <>
                <p className={styles.cardBody}>
                  <b>Spirit</b> <span className={styles.muted}>· 영혼·진로</span>
                </p>
                <div className={styles.zrRow}>
                  {zrSpiritRows.map((r, i) => (
                    <div key={`spirit-${i}`} className={styles.zrLine}>
                      <span>
                        {r.level}: {r.sign} / {r.ruler} · {r.duration}
                        {r.remain ? <span className={styles.muted}> ({r.remain})</span> : null}
                      </span>
                      {r.isPeak && <span className={styles.zrMark}>Peak</span>}
                      {r.isLoB && <span className={styles.zrMark}>LoB</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {zrFortuneRows.length > 0 && (
              <>
                <p className={styles.cardBody} style={{ marginTop: 12 }}>
                  <b>Fortune</b> <span className={styles.muted}>· 몸·물질</span>
                </p>
                <div className={styles.zrRow}>
                  {zrFortuneRows.map((r, i) => (
                    <div key={`fortune-${i}`} className={styles.zrLine}>
                      <span>
                        {r.level}: {r.sign} / {r.ruler} · {r.duration}
                        {r.remain ? <span className={styles.muted}> ({r.remain})</span> : null}
                      </span>
                      {r.isPeak && <span className={styles.zrMark}>Peak</span>}
                      {r.isLoB && <span className={styles.zrMark}>LoB</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Solar Return */}
        {solarReturn && (solarReturn.ascSign || solarReturn.mcSign || solarReturn.exactDate) && (
          <div className={`${styles.card} ${styles.astro}`}>
            <span className={styles.cardLabel}>SR · Solar Return</span>
            <div className={styles.cardTitle}>이번 해의 회귀도</div>
            <dl className={styles.kv}>
              {solarReturn.ascSign && (
                <>
                  <dt>SR ASC</dt>
                  <dd><b>{solarReturn.ascSign}</b></dd>
                </>
              )}
              {solarReturn.mcSign && (
                <>
                  <dt>SR MC</dt>
                  <dd><b>{solarReturn.mcSign}</b></dd>
                </>
              )}
              {solarReturn.exactDate && (
                <>
                  <dt>정확일</dt>
                  <dd className={styles.muted}>{solarReturn.exactDate}</dd>
                </>
              )}
            </dl>
          </div>
        )}

        {/* 응용 패턴 */}
        {appliedPatterns.length > 0 && (
          <div className={`${styles.card} ${styles.saju}`}>
            <span className={`${styles.cardLabel} ${styles.ember}`}>응용 격국 · APPLIED</span>
            <div className={styles.cardTitle}>이 해 활성 패턴</div>
            <div className={styles.chipRow}>
              {appliedPatterns.map((ap) => {
                const polClass = ap.polarity > 0 ? styles.p : ap.polarity < 0 ? styles.n : ''
                const polText = ap.polarity > 0 ? `+${ap.polarity}` : String(ap.polarity)
                return (
                  <span key={ap.id} className={styles.chip} title={ap.rule}>
                    {ap.korean} <span className={styles.muted}>({ap.name})</span>
                    <span className={`${styles.pol} ${polClass}`}>{polText}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Cross activation */}
        {crossPairs.length > 0 && (
          <div className={`${styles.card} ${styles.saju}`}>
            <span className={`${styles.cardLabel} ${styles.ember}`}>Cross · 사주 × 점성</span>
            <div className={styles.cardTitle}>동시 활성 페어</div>
            {crossPairs.map((c) => (
              <div key={c.id} className={styles.crossPair}>
                <span>{c.sajuSide}</span>
                <span className={styles.arrow}>×</span>
                <span>{c.astroSide}</span>
                <span className={styles.meaning}>{c.meaning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.diveWrap}>
        <button type="button" className={styles.dive} onClick={onDive}>
          이번 달로 줌인 <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

export default YearTier
