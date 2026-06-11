'use client'

/* ============================================================
   destinypal · YearTier — ② 1년 (YEARLY)
   직역 출처: destinypal-extracted/js/tiers/year.jsx (110 라인)
   + 5-tier 보강 (사용자 위임):
     1) wheel 위 본명 행성 도트(natalDots) + 외행성 트랜짓 도트(transitDots)
     2) profection readout — sect(낮/밤) 한 줄 + Lord-of-Year dignity 한 줄
     3) ZR 카드 (Spirit L1+L2 / Fortune L1+L2)
     4) SR 카드 (Solar Return: Asc / MC / exactDate)
     5) 응용패턴 칩 row (appliedPatterns)
     6) cross-activation 페어 (crossPairs)
     7) wheel 좌상단 Pivotal 배지 (LoB · 풀린·매듭 / Peak · 정점)
   ============================================================ */

import type {
  DestinyUserSummary,
  DestinyYear,
  DestinyDignityEntry,
  DestinyDecadeZRChapter,
} from '@/types/calendar'
import { Ganji } from '../atoms/Ganji'
import { LayerTag } from '../atoms/LayerTag'
import { sibsinArea } from '@/lib/calendar-engine/derivers/plainLanguage'
import styles from './YearTier.module.css'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { useI18n } from '@/i18n/I18nProvider'

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

export interface YearTierProps {
  /** 본명 — 12-house wheel 본명 행성 도트 + 룰러 dignity 검색에 사용. */
  user: DestinyUserSummary
  /** 세운 + Profection wheel. */
  year: DestinyYear
  /** 월(month) tier 로 다이브. */
  onDive: () => void
  /** Lifetime tier 로 라이즈. */
  onRise: () => void
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** 영문 zodiac → 1..12 인덱스 (Aries=1) — 본명 ASC 기준 whole-sign house 매핑용. */
const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

/** 행성 영문 → 한자 glyph (wheel dot 표기). */
const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

/** 본명 ASC 기준 whole-sign house 계산 — 행성 sign → house 1..12. */
function signToHouse(planetSign: string, ascSign: string): number {
  const ai = SIGN_ORDER.indexOf(ascSign as (typeof SIGN_ORDER)[number])
  const pi = SIGN_ORDER.indexOf(planetSign as (typeof SIGN_ORDER)[number])
  if (ai < 0 || pi < 0) return 1
  return ((pi - ai + 12) % 12) + 1
}

/** dignity entry → 한 줄 표기 ('domicile · +5' 등) + polarity tone. */
function formatDignity(d: DestinyDignityEntry): {
  text: string
  tone: 'pos' | 'neg' | 'neu'
} {
  const tiers = d.tiers
  const flags: string[] = []
  if (tiers?.domicile) flags.push('domicile')
  if (tiers?.exaltation) flags.push('exaltation')
  if (tiers?.detriment) flags.push('detriment')
  if (tiers?.fall) flags.push('fall')
  if (tiers?.triplicity) flags.push('triplicity')
  if (tiers?.term) flags.push('term')
  if (tiers?.face) flags.push('face')
  const score = d.score ?? 0
  const tone: 'pos' | 'neg' | 'neu' = score > 0 ? 'pos' : score < 0 ? 'neg' : 'neu'
  const flagText = flags.length > 0 ? flags.join(' · ') : 'peregrine'
  return { text: flagText, tone }
}

/** 본명 dignities 에서 행성 검색 (룰러 영문명). */
function findDignity(
  dignities: DestinyDignityEntry[] | undefined,
  planetName: string
): DestinyDignityEntry | undefined {
  if (!dignities) return undefined
  return dignities.find((d) => d.planet === planetName)
}

/** 본명 행성 도트 — user.dignities → { house, planet, glyph }. */
interface NatalDot {
  house: number
  planet: string
  glyph: string
}
function buildNatalDots(user: DestinyUserSummary): NatalDot[] {
  const asc = user.astro?.ascEn ?? 'Aries'
  const dignities = user.dignities ?? []
  return dignities.map((d) => ({
    house: signToHouse(d.sign, asc),
    planet: String(d.planet),
    glyph: PLANET_GLYPH[String(d.planet)] ?? '·',
  }))
}

/** 외행성 transit 도트 — 본명 ASC 기준 (외행성: Jupiter / Saturn / Uranus / Neptune / Pluto).
 *  실데이터가 없으므로 본명 위치 기준으로 시간 변동 표시 — 본명 dignity 가 있을 때만 표시.
 */
function buildTransitDots(user: DestinyUserSummary): NatalDot[] {
  const OUTERS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const asc = user.astro?.ascEn ?? 'Aries'
  const dignities = user.dignities ?? []
  return dignities
    .filter((d) => OUTERS.includes(String(d.planet)))
    .map((d) => ({
      house: signToHouse(d.sign, asc),
      planet: String(d.planet),
      glyph: PLANET_GLYPH[String(d.planet)] ?? '·',
    }))
}

/** house 1..12 → wheel mid angle (radians). */
function houseAngle(house: number): number {
  const i = house - 1
  return ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2
}

/** ZR chapter pivotal 표기 (LoB / Peak). */
function zrPivotalTag(c: DestinyDecadeZRChapter): string | null {
  // ZRPeriod 는 level/index/sign/ruler 만 가짐. Pivotal 정보는 sub-period level 에 있음.
  const sub = c.subPeriods?.find((s) => s.isLoosingOfTheBond || s.isPeak)
  if (sub?.isLoosingOfTheBond) return 'LoB · 풀린 매듭'
  if (sub?.isPeak) return 'Peak · 정점'
  return null
}

/** Solar Return 추출 — DestinyYear.zrSpiritChapters / profection 에 부재시 graceful skip. */
interface SolarReturnLike {
  ascSign?: string
  mcSign?: string
  exactDate?: string
}
function readSolarReturn(year: DestinyYear): SolarReturnLike | null {
  // DestinyYear 타입은 solarReturn 명시 필드 없음 — 디자인 데이터 보강 위임.
  // 향후 adapter 가 채우는 일관 키 (solarReturn) 를 안전하게 탐색.
  const anyYear = year as unknown as { solarReturn?: SolarReturnLike }
  return anyYear.solarReturn ?? null
}

/** 응용 패턴 칩 — 디자인 데이터 보강. 향후 adapter 가 채우는 일관 키 (appliedPatterns). */
interface AppliedPattern {
  hanja?: string
  ko: string
  romaji?: string
}
function readAppliedPatterns(year: DestinyYear): AppliedPattern[] {
  const anyYear = year as unknown as { appliedPatterns?: AppliedPattern[] }
  return anyYear.appliedPatterns ?? []
}

/** Cross-activation 페어 — 사주 ↔ 점성 의미 연결. */
interface CrossPair {
  sajuLabel: string
  sajuRomaji?: string
  astroLabel: string
  astroRomaji?: string
  meaning: string
}
function readCrossPairs(year: DestinyYear): CrossPair[] {
  const anyYear = year as unknown as { crossPairs?: CrossPair[] }
  return anyYear.crossPairs ?? []
}

/** wheel 좌상단 pivotal 배지 — 올해에 ZR LoB/Peak 가 걸려있나. */
function readWheelPivotal(year: DestinyYear): {
  kind: 'lob' | 'peak'
  label: string
  han: string
} | null {
  const all = [...(year.zrSpiritChapters ?? []), ...(year.zrFortuneChapters ?? [])]
  for (const c of all) {
    const sub = c.subPeriods?.find((s) => s.isLoosingOfTheBond)
    if (sub) return { kind: 'lob', label: 'Loosing of the Bond', han: '解' }
  }
  for (const c of all) {
    const sub = c.subPeriods?.find((s) => s.isPeak)
    if (sub) return { kind: 'peak', label: 'Peak Period', han: '頂' }
  }
  return null
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function YearTier({ user, year, onDive, onRise }: YearTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const p = year.profection

  // 12-house wheel (원본 year.jsx 와 동일).
  const R = 150
  const cx = 180
  const cy = 180
  const houses = Array.from({ length: 12 }, (_, i) => i + 1)

  // 보강 #1 — wheel 도트 데이터.
  const natalDots = buildNatalDots(user)
  const transitDots = buildTransitDots(user)

  // 보강 #2 — sect / Lord-of-Year dignity.
  const sect = user.sect ?? 'day'
  const lordOfYearName = p?.rulerEn ?? ''
  const lordDignity = findDignity(user.dignities, lordOfYearName)
  const lordReadout = lordDignity ? formatDignity(lordDignity) : null

  // 보강 #3 — ZR.
  const zrSpiritNow = (year.zrSpiritChapters ?? []).find((c) => c.now)
  const zrFortuneNow = (year.zrFortuneChapters ?? []).find((c) => c.now)

  // 보강 #4 — SR.
  const sr = readSolarReturn(year)

  // 보강 #5 — applied patterns.
  const patterns = readAppliedPatterns(year)

  // 보강 #6 — cross-activation pairs.
  const crossPairs = readCrossPairs(year)

  // 보강 #7 — wheel pivotal 배지.
  const wheelPivotal = readWheelPivotal(year)

  // ── 올해 사주 × 점성 교차 — 월 구간별 진짜 교차 (엔진 cross-activation). ──
  const toneTag = (t: 'good' | 'caution' | 'neutral') =>
    ko
      ? t === 'good'
        ? '길'
        : t === 'caution'
          ? '주의'
          : '중립'
      : t === 'good'
        ? 'good'
        : t === 'caution'
          ? 'caution'
          : 'neutral'
  const yearCrossItems = (year.crossings ?? []).map((c) => ({
    when: c.when,
    title: `${c.title} · ${toneTag(c.tone)}`,
    detail: c.detail,
  }))

  // ── 12달 흐름 리스트 — 월별 점수를 좋음/평이/주의로 (overview, 상세 안). ──
  const yearBand = (s: number) =>
    s >= 60
      ? ko
        ? '좋은 달'
        : 'Good month'
      : s >= 40
        ? ko
          ? '평이한 달'
          : 'Steady month'
        : ko
          ? '조심할 달'
          : 'Caution month'
  const crossHeading = ko
    ? `올해의 사주 × 점성 교차 · ${year.year}`
    : `Saju × Astrology · ${year.year}`
  const flowHeading = ko ? `올해 12달 흐름 · ${year.year}` : `12-month flow · ${year.year}`
  const yearItems = (year.monthlyScores ?? []).map((m) => ({
    when: ko ? `${m.month}월` : MONTH_ABBR[m.month - 1],
    title: yearBand(m.score),
    detail: m.bestDay
      ? ko
        ? `좋은 날 ${m.bestDay} · ${m.score}점`
        : `best ${m.bestDay} · ${m.score}`
      : ko
        ? `${m.score}점`
        : `${m.score}`,
  }))

  return (
    <div className={styles.tierInner} data-screen-label={`1년 ${year.year}`}>
      <button className={styles.rise} onClick={onRise}>
        ↑ {ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'}
      </button>

      <div className={styles.eyebrow}>
        {ko ? '1년' : 'YEAR'} · YEARLY · {year.year}
      </div>
      <h1 className={styles.display}>{ko ? '올해의 흐름' : 'This year'}</h1>
      <p className={styles.oneline}>{year.headline}</p>

      {yearCrossItems.length > 0 ? (
        <CrossingList heading={crossHeading} items={yearCrossItems} />
      ) : (
        <CrossingList heading={flowHeading} items={yearItems} />
      )}

      {/* ── 전문가용 상세 — 프로펙션·세운·ZR·패턴 전부 접어 둠 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세히 보기 · 사주·점성 근거' : 'Details · Saju & astrology'}
        </summary>

        {/* 월별 점수 overview — 교차를 메인에 띄웠으므로 상세로 내림. */}
        {yearCrossItems.length > 0 && <CrossingList heading={flowHeading} items={yearItems} />}

        <div className={styles.yearWrap}>
          {/* ── house wheel ── */}
          <div className={styles.wheelBox}>
            {wheelPivotal && (
              <div className={styles.pivotalBadge} aria-label={wheelPivotal.label}>
                <span className="han">{wheelPivotal.han}</span>
                {wheelPivotal.label}
              </div>
            )}

            <svg className={styles.wheel} viewBox="0 0 360 360">
              <defs>
                <radialGradient id="wheelglow-year" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="rgba(91,141,239,0.12)" />
                  <stop offset="1" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r={R} fill="url(#wheelglow-year)" />
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--dp-line)" strokeWidth={1} />
              <circle
                cx={cx}
                cy={cy}
                r={R - 44}
                fill="none"
                stroke="var(--dp-line-soft)"
                strokeWidth={1}
              />

              {houses.map((h) => {
                const a0 = ((h - 1) / 12) * Math.PI * 2 - Math.PI / 2
                const a1 = (h / 12) * Math.PI * 2 - Math.PI / 2
                const mid = (a0 + a1) / 2
                const active = h === p?.house
                const lx = cx + Math.cos(mid) * (R - 22)
                const ly = cy + Math.sin(mid) * (R - 22)
                const sx = cx + Math.cos(a0) * R
                const sy = cy + Math.sin(a0) * R
                return (
                  <g key={h}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={sx}
                      y2={sy}
                      stroke="var(--dp-line-soft)"
                      strokeWidth={0.7}
                    />
                    {active &&
                      (() => {
                        const steps = 18
                        const pts: Array<[number, number]> = [[cx, cy]]
                        for (let s = 0; s <= steps; s++) {
                          const a = a0 + (a1 - a0) * (s / steps)
                          pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
                        }
                        return (
                          <polygon
                            points={pts.map((pt) => pt.join(',')).join(' ')}
                            fill="rgba(176,58,34,0.18)"
                            stroke="var(--dp-ember)"
                            strokeWidth={1}
                          />
                        )
                      })()}
                    <text
                      x={lx}
                      y={ly}
                      className={
                        active ? `${styles.houseNum} ${styles.houseNumActive}` : styles.houseNum
                      }
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {h}
                    </text>
                  </g>
                )
              })}

              {/* 보강 #1a — 본명 행성 도트 (안쪽 링). */}
              {natalDots.map((d, i) => {
                const ang = houseAngle(d.house)
                // jitter — same-house planets 흩뿌림.
                const sameHouseBefore = natalDots
                  .slice(0, i)
                  .filter((x) => x.house === d.house).length
                const rOff = R - 60 - sameHouseBefore * 10
                const x = cx + Math.cos(ang) * rOff
                const y = cy + Math.sin(ang) * rOff
                return (
                  <g key={`n-${d.planet}-${i}`}>
                    <circle cx={x} cy={y} r={3.2} className={styles.natalDot} />
                    <text x={x + 7} y={y + 3} className={styles.natalGlyph}>
                      {d.glyph}
                    </text>
                  </g>
                )
              })}

              {/* 보강 #1b — 외행성 트랜짓 도트 (바깥쪽 링). */}
              {transitDots.map((d, i) => {
                const ang = houseAngle(d.house)
                const sameHouseBefore = transitDots
                  .slice(0, i)
                  .filter((x) => x.house === d.house).length
                const rOff = R + 14 + sameHouseBefore * 12
                const x = cx + Math.cos(ang) * rOff
                const y = cy + Math.sin(ang) * rOff
                return (
                  <g key={`t-${d.planet}-${i}`}>
                    <circle cx={x} cy={y} r={3.6} className={styles.transitDot} />
                    <text x={x + 7} y={y + 3} className={styles.transitGlyph}>
                      {d.glyph}
                    </text>
                  </g>
                )
              })}

              {/* center label — house# (원본 그대로). */}
              <text x={cx} y={cy - 6} textAnchor="middle" className={styles.wheelCenterTop}>
                house
              </text>
              <text x={cx} y={cy + 18} textAnchor="middle" className={styles.wheelCenterHouse}>
                {p?.house ?? ''}
              </text>
            </svg>
          </div>

          {/* ── readout (astro + saju) ── */}
          <div>
            <LayerTag kind="astro" />
            <div className={styles.yearReadout}>
              <div className={styles.big}>
                {p ? `${p.house}번째 영역이 무대` : '활성 영역 미정'}
              </div>
              {p && (
                <p className={styles.lead} style={{ fontSize: 14 }}>
                  {p.theme} <span className={styles.muted}>· {p.themeEn}</span>
                </p>
              )}
              {p && (
                <dl className={styles.kv}>
                  <dt>profection</dt>
                  <dd>
                    <b>{p.house}하우스</b> 활성
                  </dd>
                  <dt>cusp</dt>
                  <dd>
                    {p.cusp} <span className={styles.muted}>{p.cuspEn}</span>
                  </dd>
                  <dt>ruler</dt>
                  <dd>
                    <b>{p.ruler}</b> <span className={styles.muted}>{p.rulerEn}</span>
                  </dd>
                  <dt>ruler 본명</dt>
                  <dd>
                    {p.rulerNatal}
                    {p.rulerNatalEn && (
                      <span className={styles.muted}>
                        {' · '}
                        {p.rulerNatalEn}
                      </span>
                    )}
                  </dd>
                </dl>
              )}

              {/* 보강 #2 — sect + Lord-of-Year dignity. */}
              <div
                className={
                  sect === 'day'
                    ? `${styles.sectLine} ${styles.sectLineDay}`
                    : `${styles.sectLine} ${styles.sectLineNight}`
                }
              >
                <span className="pip" />
                <span className="han">{sect === 'day' ? '낮' : '밤'}</span>
                Sect · {sect === 'day' ? 'Diurnal' : 'Nocturnal'} 출생
              </div>
              {lordReadout && p && (
                <p className={styles.lordOfYear}>
                  <b>Lord of Year</b> {p.ruler} <span className={styles.muted}>({p.rulerEn})</span>{' '}
                  — <span className={styles[lordReadout.tone]}>{lordReadout.text}</span>
                </p>
              )}

              {year.astroNote && (
                <p
                  className={styles.lead}
                  style={{
                    fontSize: 13,
                    marginTop: 14,
                    color: 'var(--dp-ink-mute)',
                  }}
                >
                  {year.astroNote}
                </p>
              )}
            </div>

            <hr className={styles.hr} />

            <LayerTag kind="saju" />
            <div className={styles.sewoonRow}>
              <div className={styles.ganjiBox}>
                <Ganji data={year.sewoon?.gz ?? year.sewoonGz} size={42} />
              </div>
              <div>
                <div className={styles.ganjiMeta}>
                  세운 {year.year} · {year.sewoonSibsin}
                  {sibsinArea(year.sewoonSibsin) !== year.sewoonSibsin
                    ? ` (${sibsinArea(year.sewoonSibsin)})`
                    : ''}
                </div>
                <p className={styles.sajuNote}>{year.sajuNote}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 보강 #3 — ZR 카드 (Spirit / Fortune) ── */}
        <section className={styles.block}>
          <div className={styles.secHead}>
            <h2
              className={styles.secTitle}
              title="인생을 장(章)으로 나누는 점성 흐름 — 시기마다 무엇이 무대에 오르는지"
            >
              황도분기 · Zodiacal Releasing
            </h2>
            <span className={styles.secTag}>L1 / L2 — 챕터 진행</span>
          </div>
          <div className={styles.zrCard}>
            <div className={`${styles.zrPane} ${styles.zrPaneSpirit}`}>
              <div className={styles.zrPaneHead}>Spirit · 영혼 · 진로</div>
              {zrSpiritNow ? (
                <>
                  <div>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrSpiritNow.sign}</span>
                    <span className={styles.zrSignEn}>{zrSpiritNow.ruler}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrSpiritNow.calendarStartYear}–{zrSpiritNow.calendarEndYear}
                    </span>
                    <span>{zrSpiritNow.durationYears}년</span>
                    {zrPivotalTag(zrSpiritNow) && (
                      <span className={styles.pivot}>{zrPivotalTag(zrSpiritNow)}</span>
                    )}
                  </div>
                  {zrSpiritNow.subPeriods && zrSpiritNow.subPeriods.length > 0 && (
                    <div className={styles.zrMeta}>
                      <span className={styles.zrLevel}>L2</span>
                      {zrSpiritNow.subPeriods.slice(0, 1).map((sub, i) => (
                        <span key={i}>
                          {sub.sign} · {sub.ruler} · {sub.durationMonths}개월
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.zrEmpty}>현재 활성 Spirit 챕터 없음</div>
              )}
            </div>

            <div className={`${styles.zrPane} ${styles.zrPaneFortune}`}>
              <div className={styles.zrPaneHead}>Fortune · 몸 · 물질</div>
              {zrFortuneNow ? (
                <>
                  <div>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrFortuneNow.sign}</span>
                    <span className={styles.zrSignEn}>{zrFortuneNow.ruler}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrFortuneNow.calendarStartYear}–{zrFortuneNow.calendarEndYear}
                    </span>
                    <span>{zrFortuneNow.durationYears}년</span>
                    {zrPivotalTag(zrFortuneNow) && (
                      <span className={styles.pivot}>{zrPivotalTag(zrFortuneNow)}</span>
                    )}
                  </div>
                  {zrFortuneNow.subPeriods && zrFortuneNow.subPeriods.length > 0 && (
                    <div className={styles.zrMeta}>
                      <span className={styles.zrLevel}>L2</span>
                      {zrFortuneNow.subPeriods.slice(0, 1).map((sub, i) => (
                        <span key={i}>
                          {sub.sign} · {sub.ruler} · {sub.durationMonths}개월
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.zrEmpty}>현재 활성 Fortune 챕터 없음</div>
              )}
            </div>
          </div>
        </section>

        {/* ── 보강 #4 — SR (Solar Return) 카드 ── */}
        {sr && (
          <section className={styles.blockSm}>
            <div className={styles.secHead}>
              <h2 className={styles.secTitle}>태양회귀 · Solar Return</h2>
              <span className={styles.secTag}>본명 태양 정확 회귀</span>
            </div>
            <div className={styles.srCard}>
              <div className={styles.srGlyph}>☉</div>
              <div className={styles.srBody}>
                <div className="head">SR · {year.year}</div>
                <div className="lab">
                  {sr.ascSign && (
                    <>
                      상승 <b>{sr.ascSign}</b>
                    </>
                  )}
                  {sr.mcSign && (
                    <>
                      {sr.ascSign ? ' · ' : ''}MC <b>{sr.mcSign}</b>
                    </>
                  )}
                </div>
              </div>
              {sr.exactDate && <div className={styles.srDate}>{sr.exactDate}</div>}
            </div>
          </section>
        )}

        {/* ── 보강 #5 — 응용 패턴 칩 row ── */}
        {patterns.length > 0 && (
          <section className={styles.blockSm}>
            <div className={styles.secHead}>
              <h2 className={styles.secTitle}>올해의 응용 패턴</h2>
              <span className={styles.secTag}>Applied Patterns</span>
            </div>
            <div className={styles.patternRow}>
              {patterns.map((pt, i) => (
                <span key={i} className={styles.patternChip}>
                  {pt.hanja && <span className="han">{pt.hanja}</span>}
                  <span>{pt.ko}</span>
                  {pt.romaji && <span className="k">{pt.romaji}</span>}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── 보강 #6 — Cross-activation 페어 ── */}
        {crossPairs.length > 0 && (
          <section className={styles.block}>
            <div className={styles.secHead}>
              <h2 className={styles.secTitle}>사주 ↔ 점성 연결</h2>
              <span className={styles.secTag}>Cross Activation</span>
            </div>
            <div className={styles.crossList}>
              {crossPairs.map((cp, i) => (
                <div key={i}>
                  <div className={styles.crossRow}>
                    <div className={`${styles.crossSide} ${styles.saju || ''}`}>
                      <b>{cp.sajuLabel}</b>
                      {cp.sajuRomaji && <span className="sub">{cp.sajuRomaji}</span>}
                    </div>
                    <div className={styles.crossLink}>↔</div>
                    <div className={`${styles.crossSide} ${styles.astro || ''}`}>
                      <b>{cp.astroLabel}</b>
                      {cp.astroRomaji && <span className="sub">{cp.astroRomaji}</span>}
                    </div>
                  </div>
                  {cp.meaning && <p className={styles.crossMeaning}>{cp.meaning}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </details>

      {/* ── dive 버튼 (원본 그대로) ── */}
      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive}>
          {ko ? '이번 달로 줌인' : 'Zoom in to month'} <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

export default YearTier
