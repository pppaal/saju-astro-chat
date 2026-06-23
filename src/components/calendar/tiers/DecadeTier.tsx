'use client'

/* ============================================================
   destinypal · DecadeTier — ② 10년 (DECADE · 대운) · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT — Month 티어와 한 가족):
     · 앱 셸은 다크 — 이 티어는 .decadeRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 大運 干支(甲戌)·십신(정재)·나이범위를 *표면에* 드러낸다(Month 의 月運처럼).
     · 10년 스트립(연도별 막대 + 지금/peak) · 한 줄 총평(verdict + term-tag) ·
       합충/12운성/외행성 섹션 · 사주×점성 ▲/▼ 교차 카드.

   PRESENTATION ONLY — 엔진/derivers/타입 미변경. props 시그니처 byte-for-byte 유지.
     · crossActivations 필드명 = signalId/name(En)/sajuLine(En)/astroLine(En)/
       polarity/meaning(En) — Month 의 saju/astro 와 다름! key=signalId.
     · *En 종종 부재(pillar.note, hapchung/unseong.title) → ?? ko 폴백.
     · years.score 는 평탄(전부 50) → 막대 균일 · peak=첫 해. romaji 부재 가드.
     · geokgukStatus 우선순위: decade.geokgukStatus ?? user.gyeokgukStatus ?? user.gyeokguk.
   ============================================================ */

import type { DestinyDecade, DestinyUserSummary } from '@/types/calendar'
import styles from './DecadeTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

// ============================================================================
// Props (계약 불변 — 셸 줌 네비게이션이 onDive/onRise 를 호출. showRise 없음)
// ============================================================================

export interface DecadeTierProps {
  /** 본명 — 격국 성패 frame, 일간 등. */
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
      /** 영문 이름 — 영문 로케일에서 사용. 미지정 시 name 으로 폴백. */
      nameEn?: string
      sajuLine?: string
      /** 영문 사주 라인 — 영문 로케일에서 사용. 미지정 시 sajuLine 으로 폴백. */
      sajuLineEn?: string
      astroLine?: string
      /** 영문 점성 라인 — 영문 로케일에서 사용. 미지정 시 astroLine 으로 폴백. */
      astroLineEn?: string
      polarity: number
      meaning?: string
      /** 영문 한 줄 의미 — 영문 로케일에서 사용. 미지정 시 meaning 으로 폴백. */
      meaningEn?: string
    }>
    /** Phase 3 — 격국 status (대운 — 보통 본명과 같으나 화기/잡기 변동 가능). */
    geokgukStatus?: string
  }
  /** Year tier 로 줌인. */
  onDive: () => void
  /** Lifetime tier 로 줌아웃. */
  onRise: () => void
}

// ============================================================================
// helpers
// ============================================================================

/** 십신 가족 → 인생의 계절(봄/여름/가을/겨울). 한 줄 보조 태그용. */
type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const SIBSIN_SEASON: Record<string, Season> = {
  비견: 'spring',
  겁재: 'spring',
  비겁: 'spring',
  식신: 'summer',
  상관: 'summer',
  식상: 'summer',
  편재: 'autumn',
  정재: 'autumn',
  재성: 'autumn',
  편관: 'autumn',
  정관: 'autumn',
  관성: 'autumn',
  편인: 'winter',
  정인: 'winter',
  인성: 'winter',
}

const SEASON_LABEL: Record<Season, { ko: string; en: string; sub: string; subEn: string }> = {
  spring: { ko: '봄', en: 'Spring', sub: '자라나는 때', subEn: 'a season of growth' },
  summer: { ko: '여름', en: 'Summer', sub: '펼치는 때', subEn: 'a season of expression' },
  autumn: { ko: '가을', en: 'Autumn', sub: '거두는 때', subEn: 'a season of harvest' },
  winter: { ko: '겨울', en: 'Winter', sub: '갈무리하는 때', subEn: 'a season of gathering in' },
}

const SEASON_CLASS: Record<Season, string> = {
  spring: styles.seasonSpring,
  summer: styles.seasonSummer,
  autumn: styles.seasonAutumn,
  winter: styles.seasonWinter,
}

function seasonOf(sibsin: string | undefined): Season {
  return (sibsin && SIBSIN_SEASON[sibsin]) || 'autumn'
}

/** 외행성 glyph 매핑. */
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

// ============================================================================
// BigYearStrip — 이 10년 연도별 막대 띠. score(평탄 50) → 균일 막대. peak/now 강조.
// ============================================================================

function BigYearStrip({
  years,
  ko,
  peakYear,
}: {
  years: Array<{ year: number; score: number; now?: boolean }>
  ko: boolean
  peakYear: number
}) {
  const scores = years.map((y) => y.score)
  const maxScore = Math.max(...scores, 1)
  const minScore = Math.min(...scores, 0)
  const range = Math.max(maxScore - minScore, 1)
  return (
    <div className={styles.strip}>
      {years.map((y) => {
        const norm = (y.score - minScore) / range
        const barH = 18 + norm * 40
        const peak = y.year === peakYear
        const cls = [styles.byCell, y.now && styles.byCellNow, peak && styles.byCellPeak]
          .filter(Boolean)
          .join(' ')
        return (
          <div key={y.year} className={cls} title={`${y.year}`}>
            <div className={styles.byBar} style={{ height: `${barH}px` }} />
            <div className={styles.byYr}>{String(y.year).slice(2)}</div>
            {y.now && <div className={styles.byNow}>{ko ? '지금' : 'now'}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function DecadeTier({ user, decade, onDive, onRise }: DecadeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'

  // ── 大運 干支 — 표면 노출. ──
  const ganjiHanja = decade.gz.hanja
  const ganjiRead = ko ? decade.gz.kr : (decade.gz.en ?? decade.gz.kr)

  // ── 대운 십신 — 표면 노출 + 쉬운 area 테마. ──
  const sibsinRaw = String(decade.sibsin)
  const sibsinLabel = ko ? sibsinRaw : (SIBSIN_EN[sibsinRaw] ?? sibsinRaw)
  const areaTitle = ko ? sibsinArea(sibsinRaw) : sibsinAreaEn(sibsinRaw)
  const themeTitle = ko ? `${areaTitle}의 10년` : `A decade of ${areaTitle}`

  // ── 계절 보조 태그. ──
  const season = seasonOf(sibsinRaw)
  const seasonInfo = SEASON_LABEL[season]

  // ── 격국 — 우선순위 보존. ──
  const gyeokgukLine = decade.geokgukStatus ?? user.gyeokgukStatus ?? user.gyeokguk

  // ── 한 줄 총평 — headline + theme 보조. ──
  const verdictText = (ko ? decade.headline : (decade.headlineEn ?? decade.headline)) || themeTitle
  const themeSub = ko ? decade.theme : (decade.themeEn ?? decade.theme)

  // ── 10년 연도 스트립 — peak(score 최고, 평탄이면 첫 해). ──
  const years = decade.years ?? []
  const peakYearObj = years.reduce<(typeof years)[number] | null>((best, y) => {
    if (!best) return y
    return y.score > best.score ? y : best
  }, null)
  const peakYear = peakYearObj?.year ?? decade.start
  const turningLine = ko
    ? `이 10년 안에서는 ${peakYear}년 무렵이 가장 무르익는 해예요.`
    : `Within this decade, around ${peakYear} is when things ripen most.`

  // ── 합충 / 12운성 (이미 평문). titleEn 부재 → ?? ko. romaji 부재 가드. ──
  const hap = decade.hapchung
  const hapTitle = hap ? (ko ? hap.title : (hap.titleEn ?? hap.title)) : ''
  const hapBody = hap ? (ko ? hap.body : (hap.bodyEn ?? hap.body)) : ''
  const hapTone = hap && (hap.title?.includes('충') || /clash/i.test(hap.title ?? ''))
  const un = decade.unseong
  const unTitle = un ? (ko ? un.title : (un.titleEn ?? un.title)) : ''
  const unBody = un ? (ko ? un.body : (un.bodyEn ?? un.body)) : ''

  // ── 외행성 마디 (ko-only — *En 없음). ──
  const astro = decade.astro ?? []

  // ── 사주×점성 교차 — DECADE 필드명. hero = |polarity| 최대. ──
  const crossActs = decade.crossActivations ?? []
  const topCross = [...crossActs].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))[0]

  // ── dive 연도. ──
  const diveYear = decade.focusYear ?? decade.start

  return (
    <div className={styles.decadeRoot}>
      {/* ── zoom-out (rise) — 항상(showRise 없음) ── */}
      <button type="button" className={styles.rise} onClick={onRise}>
        ↑ {ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'}
      </button>

      {/* ── eyebrow ── */}
      <div className={styles.eyebrow}>
        <span>
          {ko ? '10년' : '10 Years'} · DECADE · {decade.start}–{decade.end}
        </span>
        <span className={styles.ebAge}>
          {decade.ageFrom}–{decade.ageTo}
          {ko ? '세' : ' yrs'}
        </span>
      </div>

      {/* ── ganzhi header ── */}
      <header className={styles.header}>
        <div className={styles.ganzhi}>{ganjiHanja}</div>
        <div className={styles.ganzhiRead}>
          {ganjiRead}
          {ko ? ' 대운' : ' decade'}
          <span className={styles.sibsinChip}>{sibsinLabel}</span>
        </div>
        <div className={styles.title}>
          {decade.start} – {decade.end}
          <span className={styles.titleKo}>{themeTitle}</span>
        </div>
        <div className={styles.counts}>
          <span className={styles.cAge}>
            {ko ? '나이' : 'age'}
            <b>
              {decade.ageFrom}–{decade.ageTo}
            </b>
          </span>
          <span className={`${styles.seasonTag} ${SEASON_CLASS[season]}`}>
            <span className={styles.seasonName}>{ko ? seasonInfo.ko : seasonInfo.en}</span>
            <span className={styles.seasonSub}>{ko ? seasonInfo.sub : seasonInfo.subEn}</span>
          </span>
        </div>
      </header>

      {/* ── 한 줄 총평 (verdict) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '이 10년의 한 줄' : 'In a line'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>In a line</span>
        </div>
        <p className={styles.verdict}>{verdictText}</p>
        {themeSub && <p className={styles.verdictSub2}>{themeSub}</p>}
        <div className={styles.verdictSub}>
          {[ganjiHanja, sibsinRaw, gyeokgukLine].filter(Boolean).map((t, i) => (
            <span className={styles.termTag} key={i}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── 이 10년 중 큰 해 — 연도 스트립 ── */}
      {years.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>
              {ko ? '이 10년의 흐름' : 'The decade at a glance'}
            </span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Years</span>
          </div>
          <BigYearStrip years={years} ko={ko} peakYear={peakYear} />
          <p className={styles.turningLine}>{turningLine}</p>
        </section>
      )}

      {/* ── 본명 × 대운 (합충 / 12운성) ── */}
      {(hap || un) && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '본명 × 대운' : 'Natal × Decade'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Relations</span>
          </div>
          {hap && (
            <div className={`${styles.relCard} ${hapTone ? styles.relClash : styles.relHarmony}`}>
              <div className={styles.relTop}>
                <span className={styles.relKind}>{ko ? '합·충' : 'Harmony / clash'}</span>
                <span className={styles.relTitle}>{hapTitle}</span>
              </div>
              {hapBody && <p className={styles.relBody}>{hapBody}</p>}
            </div>
          )}
          {un && (
            <div className={`${styles.relCard} ${styles.relStage}`}>
              <div className={styles.relTop}>
                <span className={styles.relKind}>{ko ? '12운성' : 'Twelve stages'}</span>
                <span className={styles.relTitle}>{unTitle}</span>
              </div>
              {unBody && <p className={styles.relBody}>{unBody}</p>}
            </div>
          )}
          {/* 12운성 매트릭스 — 본명 일간 × 대운 지지. */}
          <div className={styles.matrix}>
            <span className={styles.matrixChip}>
              <span className={styles.matrixHan}>{user.ilgan.hanja}</span>
              {ko ? '일간' : 'day master'}
            </span>
            <span className={styles.matrixX}>×</span>
            <span className={styles.matrixChip}>
              <span className={styles.matrixHan}>{decade.pillar.jiji.hanja}</span>
              {ko ? '대운 지지' : 'decade branch'}
            </span>
          </div>
        </section>
      )}

      {/* ── 외행성 마디 (astro · ko-only) ── */}
      {astro.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '하늘의 큰 마디' : 'Sky milestones'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Astro</span>
          </div>
          {astro.map((o, i) => {
            const glyph = OUTER_GLYPH[o.kind] ?? '★'
            return (
              <div className={styles.astroRow} key={`${o.label}-${i}`}>
                <span className={styles.astroGlyph} aria-hidden>
                  {glyph}
                </span>
                <span className={styles.astroDate}>{o.date}</span>
                <span className={styles.astroLabel}>{o.label}</span>
                {o.body && <span className={styles.astroBody}>{o.body}</span>}
              </div>
            )
          })}
        </section>
      )}

      {/* ── 겹치는 흐름 (cross-activations) — DECADE 필드명 사용 ── */}
      {crossActs.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '겹치는 흐름' : 'Crossings'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Crossings</span>
          </div>
          <div className={styles.crossLegend}>
            <span className={styles.clUp}>▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}</span>
            <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
          </div>
          {crossActs.slice(0, 6).map((c) => {
            const isHero = topCross != null && c === topCross
            const poleSym = c.polarity > 0 ? '▲' : c.polarity < 0 ? '▼' : '·'
            const poleCls = c.polarity > 0 ? styles.poleUp : c.polarity < 0 ? styles.poleDn : ''
            const sajuNm = ko ? c.sajuLine : (c.sajuLineEn ?? c.sajuLine)
            const astroNm = ko ? c.astroLine : (c.astroLineEn ?? c.astroLine)
            const head = ko ? c.name : (c.nameEn ?? c.name)
            const body = ko ? c.meaning : (c.meaningEn ?? c.meaning)
            return (
              <div
                className={`${styles.cross} ${isHero ? styles.crossHero : ''}`.trim()}
                key={c.signalId}
              >
                <div className={styles.crossTop}>
                  <span className={`${styles.pole} ${poleCls}`.trim()} aria-hidden>
                    {poleSym}
                  </span>
                  {sajuNm && (
                    <span className={`${styles.term} ${styles.termSaju}`}>
                      <span className={styles.termSys}>Saju</span>
                      <span className={styles.termNm}>{sajuNm}</span>
                    </span>
                  )}
                  {sajuNm && astroNm && (
                    <span className={styles.crossX} aria-hidden>
                      ×
                    </span>
                  )}
                  {astroNm && (
                    <span className={`${styles.term} ${styles.termAstro}`}>
                      <span className={styles.termSys}>Astro</span>
                      <span className={styles.termNm}>{astroNm}</span>
                    </span>
                  )}
                  {isHero && (
                    <span className={styles.crossFlag}>
                      {ko ? '가장 또렷한 흐름' : 'Strongest'}
                    </span>
                  )}
                </div>
                {head && <div className={styles.crossHead}>{head}</div>}
                {body && <div className={styles.crossBody}>{body}</div>}
              </div>
            )
          })}
        </section>
      )}

      {/* ── CTA (zoom-in) ── */}
      <button className={styles.cta} onClick={onDive} type="button">
        {ko ? `${diveYear}년으로 줌인 →` : `Zoom in to ${diveYear} →`}
      </button>
    </div>
  )
}
