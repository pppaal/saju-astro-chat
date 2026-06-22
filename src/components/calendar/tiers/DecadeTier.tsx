'use client'

/* ============================================================
   destinypal · DecadeTier — ② 10년 (DECADE · 대운)

   시안 리디자인 (2026-06): 메인 표면은 *인생의 계절* 로 — 전문용어 0.
     · headline — 쉬운 "X의 10년" 테마 + 계절 태그(봄/여름/가을/겨울) + 나이대
     · 이 시기에 일어나는 일 — 테마 + 가장 센 교차 의미 + 합충/12운성 쉬운 본문
     · 이렇게 보내면 좋아요 — 테마/톤에서 끌어낸 2–3줄 가이드
     · 이 10년 중 큰 해 — years[10] score 막대 띠 + 최고점 해 한 줄 (간지 없음)
     · 교차(있으면) — 쉬운 이름(area × planet) + 의미만
   모든 전문용어(大運 한자, 격국 frame, 기둥 천간/지지 한자+십신, 합충/12운성
   한자 카드, 외행성 glyph, 연도별 간지, 교차 raw 라인)는 하나의
   "자세한 신호 보기" <details> 안으로 — presentation only, 엔진 math/shape 불변.
   ============================================================ */

import type { DestinyDecade, DestinyUserSummary } from '@/types/calendar'

import { Ganji } from '../atoms/Ganji'
import { LayerTag } from '../atoms/LayerTag'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import styles from './DecadeTier.module.css'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

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

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** 외행성 glyph 매핑 — 상세 fold 전용. */
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
// 십신 가족 → 인생의 계절. 메인 표면은 전문용어 대신 이 계절로 프레임.
//   비겁·식상 = 봄·여름 (자라고 펼치는 때)
//   재성·관성 = 가을 (거두고 자리잡는 때)
//   인성     = 겨울 (안으로 갈무리·배우는 때)
// 한 단어 계절 + 쉬운 부제. ko/en 짝.
// ----------------------------------------------------------------
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

/** 계절별 "이렇게 보내면 좋아요" 가이드 2줄 — 쉬운 말, 전문용어 0. */
const SEASON_GUIDE: Record<Season, { ko: string[]; en: string[] }> = {
  spring: {
    ko: ['새로 시작하는 일에 힘을 실어도 좋은 때예요.', '내 편이 될 사람들과 발을 맞춰 보세요.'],
    en: [
      'A good time to put weight behind new beginnings.',
      'Move in step with the people on your side.',
    ],
  },
  summer: {
    ko: [
      '하고 싶은 표현·만들기를 미루지 말고 펼쳐 보세요.',
      '재능을 드러낼수록 기회가 따라옵니다.',
    ],
    en: [
      "Don't hold back what you want to make or express.",
      'The more you show your talent, the more chances follow.',
    ],
  },
  autumn: {
    ko: [
      '뿌려 둔 것을 거두는 때 — 마무리와 결실에 집중하세요.',
      '욕심내 벌이기보다 가진 것을 단단히 다지는 게 좋아요.',
    ],
    en: [
      'A time to reap what you sowed — focus on finishing and results.',
      'Better to firm up what you have than to overreach.',
    ],
  },
  winter: {
    ko: [
      '안으로 배우고 채우는 때 — 조급해하지 않아도 됩니다.',
      '쉼과 공부가 다음 봄의 밑천이 돼요.',
    ],
    en: [
      'A time to learn and refill inward — no need to rush.',
      'Rest and study become the seed money for the next spring.',
    ],
  },
}

// ----------------------------------------------------------------
// BigYearStrip — 이 10년 중 큰 해. years[10] score 막대 띠. 간지 없음.
// 최고점 해를 강조. 메인 표면 전용 (전문용어 0).
// ----------------------------------------------------------------
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
    <div className={styles.bigYearStrip}>
      {years.map((y) => {
        const norm = (y.score - minScore) / range
        const barH = 18 + norm * 44
        const peak = y.year === peakYear
        return (
          <div
            key={y.year}
            className={`${styles.byCell} ${y.now ? styles.byCellNow : ''} ${peak ? styles.byCellPeak : ''}`}
            title={`${y.year}`}
          >
            <div className={styles.byBar} style={{ height: `${barH}px` }} />
            <div className={styles.byYr}>
              {String(y.year).slice(2)}
              {y.now && <span className={styles.byNow}>{ko ? '지금' : 'now'}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function DecadeTier({ user, decade, onDive, onRise }: DecadeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'

  // ── 계절 프레임 — 대운 십신 가족 → 봄/여름/가을/겨울. ──
  const season = seasonOf(decade.sibsin)
  const seasonInfo = SEASON_LABEL[season]

  // ── 쉬운 테마 타이틀 — "X의 10년" (전문용어 없는 area 단어). ──
  const areaTitle = ko ? sibsinArea(decade.sibsin) : sibsinAreaEn(decade.sibsin)
  const themeTitle = ko ? `${areaTitle}의 10년` : `A decade of ${areaTitle}`

  // sewoonNow / focus.
  const focusYearLabel = decade.focusYear ?? decade.start

  // cross-activation (Phase 3) — decadal aggregate.
  const crossActs = decade.crossActivations ?? []

  // 가장 센 교차(절대값 polarity) — '이 시기 일어나는 일' 한 줄에 차용.
  const strongestCross = crossActs.reduce<(typeof crossActs)[number] | null>((best, c) => {
    if (!best) return c
    return Math.abs(c.polarity) > Math.abs(best.polarity) ? c : best
  }, null)
  const strongestMeaning = strongestCross
    ? ko
      ? strongestCross.meaning
      : (strongestCross.meaningEn ?? strongestCross.meaning)
    : undefined

  // 합충/12운성 쉬운 본문 (이미 평문) — '일어나는 일' 줄에 차용.
  const hapBody = decade.hapchung
    ? ko
      ? decade.hapchung.body
      : (decade.hapchung.bodyEn ?? decade.hapchung.body)
    : undefined
  const unBody = decade.unseong
    ? ko
      ? decade.unseong.body
      : (decade.unseong.bodyEn ?? decade.unseong.body)
    : undefined

  // 테마 본문 (이미 평문).
  const themeBody = ko ? decade.theme : (decade.themeEn ?? decade.theme)

  // ── 이 시기에 일어나는 일 — 2–3 평문 줄. ──
  const happenLines = [themeBody, strongestMeaning, hapBody ?? unBody].filter(
    (s): s is string => !!s && s.trim().length > 0
  )

  // ── 이렇게 보내면 좋아요 — 계절 가이드 2–3줄. ──
  const guideLines = SEASON_GUIDE[season][ko ? 'ko' : 'en']

  // ── 이 10년 중 큰 해 — years[10] 최고점. ──
  const years = decade.years ?? []
  const peakYearObj = years.reduce<(typeof years)[number] | null>((best, y) => {
    if (!best) return y
    return y.score > best.score ? y : best
  }, null)
  const peakYear = peakYearObj?.year ?? decade.start
  const turningLine = ko
    ? `이 10년 안에서는 ${peakYear}년 무렵이 가장 무르익는 해예요.`
    : `Within this decade, around ${peakYear} is when things ripen most.`

  // ── 메인 교차 (있으면) — 쉬운 이름 + 의미만. ──
  const plainCross = crossActs
    .map((c) => ({
      key: c.signalId || c.name,
      name: ko ? c.name : (c.nameEn ?? c.name),
      meaning: ko ? c.meaning : (c.meaningEn ?? c.meaning),
      polarity: c.polarity,
    }))
    .slice(0, 4)

  // ── (상세) 외행성/격국/기둥 — fold 전용. ──
  const gyeokgukLine = decade.geokgukStatus ?? user.gyeokgukStatus ?? user.gyeokguk
  const minScore = Math.min(...years.map((y) => y.score), 0)
  const range = Math.max(Math.max(...years.map((y) => y.score), 1) - minScore, 1)

  // body paragraphs — fold.
  const bodyParas = ko ? decade.body : (decade.bodyEn ?? decade.body)

  return (
    <div className={styles.tier} data-screen-label={`10년 ${decade.start}-${decade.end}`}>
      <button className={styles.rise} onClick={onRise} type="button">
        ↑ {ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'}
      </button>

      {/* ============================================================
          header — 계절 프레임. 전문용어 0.
      ============================================================ */}
      <div className={styles.eyebrow}>
        {ko ? '지금의 계절 · 10년' : 'This season · 10 years'} {decade.start}-{decade.end}
        {decade.ageFrom != null && decade.ageTo != null && (
          <span className={styles.ageRange}>
            · {decade.ageFrom}–{decade.ageTo}
            {ko ? '세' : ' yrs'}
          </span>
        )}
      </div>

      <div className={styles.headerRow}>
        <h1 className={styles.display}>{themeTitle}</h1>
        <span className={`${styles.seasonTag} ${SEASON_CLASS[season]}`}>
          <span className={styles.seasonTagName}>{ko ? seasonInfo.ko : seasonInfo.en}</span>
          <span className={styles.seasonTagSub}>{ko ? seasonInfo.sub : seasonInfo.subEn}</span>
        </span>
      </div>

      <p className={styles.oneline}>
        {ko ? decade.headline : (decade.headlineEn ?? decade.headline)}
      </p>

      {/* ── 이 시기에 일어나는 일 ── */}
      {happenLines.length > 0 && (
        <section className={styles.plainBlock}>
          <h2 className={styles.plainHead}>
            {ko ? '이 시기에 일어나는 일' : 'What this season brings'}
          </h2>
          <ul className={styles.plainList}>
            {happenLines.slice(0, 3).map((line, i) => (
              <li key={i} className={styles.plainItem}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 이렇게 보내면 좋아요 ── */}
      <section className={styles.plainBlock}>
        <h2 className={styles.plainHead}>{ko ? '이렇게 보내면 좋아요' : 'How to spend it well'}</h2>
        <ul className={`${styles.plainList} ${styles.guideList}`}>
          {guideLines.slice(0, 3).map((line, i) => (
            <li key={i} className={styles.plainItem}>
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* ── 이 10년 중 큰 해 ── */}
      {years.length > 0 && (
        <section className={styles.plainBlock}>
          <h2 className={styles.plainHead}>
            {ko ? '이 10년 중 큰 해' : 'The big years in this decade'}
          </h2>
          <BigYearStrip years={years} ko={ko} peakYear={peakYear} />
          <p className={styles.turningLine}>{turningLine}</p>
        </section>
      )}

      {/* ── 교차 (있으면) — 쉬운 이름 + 의미만 ── */}
      {plainCross.length > 0 && (
        <section className={styles.plainBlock}>
          <h2 className={styles.plainHead}>
            {ko ? '겹쳐서 도드라지는 신호' : 'Signals that stand out together'}
          </h2>
          <div className={styles.crossPlainRow}>
            {plainCross.map((c) => {
              const tone =
                c.polarity > 0
                  ? styles.crossPos
                  : c.polarity < 0
                    ? styles.crossNeg
                    : styles.crossNeu
              return (
                <div key={c.key} className={`${styles.crossPlainCard} ${tone}`}>
                  <div className={styles.crossPlainName}>{c.name}</div>
                  {c.meaning && <p className={styles.crossPlainMeaning}>{c.meaning}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          자세한 신호 보기 — 모든 전문용어를 이 fold 안으로.
      ============================================================ */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세한 신호 보기 · 사주·점성 근거' : 'See the detailed signals · Saju & Astrology'}
        </summary>

        {/* 격국 frame + 대운 한자 — 전문용어. */}
        <div className={styles.foldHeadRow}>
          <span className={styles.foldGanji}>
            {ko ? '대운' : 'Decade pillar'} <span className={styles.han}>{decade.gz.hanja}</span>
          </span>
          {gyeokgukLine && (
            <span className={styles.frameChip}>
              <span className={styles.frameChipLabel}>{ko ? '격국 frame' : 'gyeokguk frame'}</span>
              <span className={styles.frameChipValue}>{gyeokgukLine}</span>
            </span>
          )}
        </div>

        {/* main grid — 좌(사주 SAJU pillar) / 우(십신 readout + KV) */}
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
                  <span className={styles.pillarTag}>
                    {ko ? '천간 · 전반 5년' : 'stems · first 5 yrs'}
                  </span>
                  <span className={styles.pillarYears}>
                    {decade.start}–{decade.start + 4}
                  </span>
                </div>
                <div className={styles.pillarHanja}>{decade.pillar.cheongan.hanja}</div>
                <div className={styles.pillarSibsin}>
                  {ko
                    ? decade.pillar.cheongan.sibsin
                    : (SIBSIN_EN[decade.pillar.cheongan.sibsin] ?? decade.pillar.cheongan.sibsin)}
                </div>
                <div className={styles.pillarEl}>{decade.pillar.cheongan.el}</div>
                {(ko
                  ? decade.pillar.cheongan.note
                  : (decade.pillar.cheongan.noteEn ?? decade.pillar.cheongan.note)) && (
                  <p className={styles.pillarNote}>
                    {ko
                      ? decade.pillar.cheongan.note
                      : (decade.pillar.cheongan.noteEn ?? decade.pillar.cheongan.note)}
                  </p>
                )}
              </div>

              <div className={styles.pillarDivider} />

              {/* 지지 — 후반 5년 */}
              <div className={styles.pillarCol}>
                <div className={styles.pillarHead}>
                  <span className={styles.pillarTag}>
                    {ko ? '지지 · 후반 5년' : 'branches · last 5 yrs'}
                  </span>
                  <span className={styles.pillarYears}>
                    {decade.start + 5}–{decade.end - 1}
                  </span>
                </div>
                <div className={styles.pillarHanja}>{decade.pillar.jiji.hanja}</div>
                <div className={styles.pillarSibsin}>
                  {ko
                    ? decade.pillar.jiji.sibsin
                    : (SIBSIN_EN[decade.pillar.jiji.sibsin] ?? decade.pillar.jiji.sibsin)}
                </div>
                <div className={styles.pillarEl}>{decade.pillar.jiji.el}</div>
                {(ko
                  ? decade.pillar.jiji.note
                  : (decade.pillar.jiji.noteEn ?? decade.pillar.jiji.note)) && (
                  <p className={styles.pillarNote}>
                    {ko
                      ? decade.pillar.jiji.note
                      : (decade.pillar.jiji.noteEn ?? decade.pillar.jiji.note)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 우: 대운 십신 readout + KV ── */}
          <div className={styles.readoutPanel}>
            <LayerTag kind="saju" />
            <div className={styles.bigTitle}>
              {ko
                ? `${decade.sibsin} · ${sibsinArea(decade.sibsin)}의 10년`
                : `${SIBSIN_EN[decade.sibsin] ?? decade.sibsin} · ${sibsinAreaEn(decade.sibsin)} decade`}
            </div>
            <p className={styles.themeLine}>{ko ? decade.theme : decade.themeEn}</p>

            <dl className={styles.kv}>
              <dt>{ko ? '기간' : 'Period'}</dt>
              <dd>
                <b>
                  {decade.start}–{decade.end}
                </b>
                <span className={styles.muted}>
                  {' '}
                  {ko
                    ? `· ${decade.ageFrom}–${decade.ageTo}세`
                    : `· ages ${decade.ageFrom}–${decade.ageTo}`}
                </span>
              </dd>
              <dt>{ko ? '대운 십신' : 'Decade ten-god'}</dt>
              <dd>
                <b>{ko ? decade.sibsin : (SIBSIN_EN[decade.sibsin] ?? decade.sibsin)}</b>
              </dd>
              <dt>{ko ? '천간' : 'Stem'}</dt>
              <dd>
                <span className={styles.han}>{decade.pillar.cheongan.hanja}</span>{' '}
                {ko
                  ? decade.pillar.cheongan.sibsin
                  : (SIBSIN_EN[decade.pillar.cheongan.sibsin] ??
                    decade.pillar.cheongan.sibsin)}{' '}
                <span className={styles.muted}>· {decade.pillar.cheongan.el}</span>
              </dd>
              <dt>{ko ? '지지' : 'Branch'}</dt>
              <dd>
                <span className={styles.han}>{decade.pillar.jiji.hanja}</span>{' '}
                {ko
                  ? decade.pillar.jiji.sibsin
                  : (SIBSIN_EN[decade.pillar.jiji.sibsin] ?? decade.pillar.jiji.sibsin)}{' '}
                <span className={styles.muted}>· {decade.pillar.jiji.el}</span>
              </dd>
              {decade.sewoonNow && (
                <>
                  <dt>{ko ? `세운 ${focusYearLabel}` : `Annual ${focusYearLabel}`}</dt>
                  <dd>
                    <span className={styles.han}>{decade.sewoonNow.gz.hanja}</span>{' '}
                    <span className={styles.muted}>{decade.sewoonNow.gz.kr}</span> ·{' '}
                    <b>
                      {ko
                        ? decade.sewoonNow.sibsin
                        : (SIBSIN_EN[decade.sewoonNow.sibsin] ?? decade.sewoonNow.sibsin)}
                    </b>
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* body paragraphs */}
        {bodyParas && bodyParas.length > 0 && (
          <div className={styles.bodyBlock}>
            {bodyParas.map((p, i) => (
              <p key={i} className={styles.lead}>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* 이 대운의 결 — narrative */}
        {decade.narrative && decade.narrative.length > 0 && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {ko ? '이 대운의 결' : 'The grain of this cycle'}
              </h2>
              <span className={styles.tiny}>narrative · {decade.narrative.length}</span>
            </div>
            <div className={styles.narrativeGrid}>
              {decade.narrative.map((n, i) => (
                <div key={i} className={styles.narrativeCard}>
                  <div className={styles.narrativeTag}>{n.tag}</div>
                  <p className={styles.narrativeBody}>{ko ? n.body : (n.bodyEn ?? n.body)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 합·충 (hapchung) + 12운성 (unseong) 카드 그리드 */}
        {(decade.hapchung || decade.unseong) && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{ko ? '본명 × 대운' : 'Natal × Decade'}</h2>
              <span className={styles.tiny}>
                {ko ? '합·충 · 12운성' : 'harmony & clash · twelve stages'}
              </span>
            </div>
            <LayerTag kind="saju" />
            <div className={styles.relationGrid}>
              {decade.hapchung && (
                <div className={`${styles.dcard} ${styles.dcardEmber}`}>
                  <div className={styles.dcardHead}>
                    <span className={`${styles.glyphMini} ${styles.glyphEmber}`}>⚡</span>
                    {ko ? '합충 · HAPCHUNG' : 'Harmony & clash · HAPCHUNG'}
                  </div>
                  <div className={styles.dcardTitle}>
                    {ko
                      ? decade.hapchung.title
                      : (decade.hapchung.titleEn ?? decade.hapchung.title)}
                  </div>
                  {decade.hapchung.romaji && (
                    <div className={styles.dcardRomaji}>{decade.hapchung.romaji}</div>
                  )}
                  <p className={styles.dcardBody}>
                    {ko ? decade.hapchung.body : (decade.hapchung.bodyEn ?? decade.hapchung.body)}
                  </p>
                </div>
              )}
              {decade.unseong && (
                <div className={`${styles.dcard} ${styles.dcardViolet}`}>
                  <div className={styles.dcardHead}>
                    <span className={`${styles.glyphMini} ${styles.glyphViolet}`}>◯</span>
                    {ko ? '12운성 · UNSEONG' : 'Twelve stages · UNSEONG'}
                  </div>
                  <div className={styles.dcardTitle}>
                    {ko ? decade.unseong.title : (decade.unseong.titleEn ?? decade.unseong.title)}
                  </div>
                  {decade.unseong.romaji && (
                    <div className={styles.dcardRomaji}>{decade.unseong.romaji}</div>
                  )}
                  <p className={styles.dcardBody}>
                    {ko ? decade.unseong.body : (decade.unseong.bodyEn ?? decade.unseong.body)}
                  </p>
                </div>
              )}
            </div>

            {/* 12운성 매트릭스 (본명 일간 × 대운 지지). */}
            <UnseongMatrix ilganHanja={user.ilgan.hanja} decadeBranch={decade.pillar.jiji.hanja} />
          </section>
        )}

        {/* 외행성 마디 (astro outer-row) */}
        {decade.astro && decade.astro.length > 0 && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{ko ? '외행성 마디' : 'Outer-planet returns'}</h2>
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

        {/* years[10] mini-graph — 연도별 간지 + score chip row */}
        {years.length > 0 && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {ko ? '10년 흐름 · 연도별 간지' : '10-year flow · yearly ganji'}
              </h2>
              <span className={styles.tiny}>
                {ko ? `연도별 score · ${years.length}년` : `yearly score · ${years.length} yrs`}
              </span>
            </div>
            <div className={styles.yearTrack}>
              {years.map((y, i) => {
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
                      {y.now && <span className={styles.yearNowMark}>{ko ? '지금' : 'now'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* cross-activation badge (decadal aggregate) — raw saju/astro 라인 포함. */}
        {crossActs.length > 0 && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {ko ? '사주 ↔ 점성 동시 활성' : 'Saju ↔ Astrology co-activation'}
              </h2>
              <span className={styles.tiny}>
                {ko
                  ? `Cross-activation · 10년 누적 ${crossActs.length}건`
                  : `Cross-activation · ${crossActs.length} over 10 yrs`}
              </span>
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
                    <div className={styles.crossBadgeName}>
                      {ko ? c.name : (c.nameEn ?? c.name)}
                    </div>
                    {(c.sajuLine || c.astroLine) && (
                      <div className={styles.crossBadgeLines}>
                        {c.sajuLine && (
                          <span className={styles.crossBadgeSaju}>
                            {ko ? c.sajuLine : (c.sajuLineEn ?? c.sajuLine)}
                          </span>
                        )}
                        {c.sajuLine && c.astroLine && (
                          <span className={styles.crossBadgeArrow}>↔</span>
                        )}
                        {c.astroLine && (
                          <span className={styles.crossBadgeAstro}>
                            {ko ? c.astroLine : (c.astroLineEn ?? c.astroLine)}
                          </span>
                        )}
                      </div>
                    )}
                    {(ko ? c.meaning : (c.meaningEn ?? c.meaning)) && (
                      <p className={styles.crossBadgeMeaning}>
                        {ko ? c.meaning : (c.meaningEn ?? c.meaning)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </details>

      {/* ============================================================
          dive 버튼 — Year tier
      ============================================================ */}
      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive} type="button">
          {ko ? `${focusYearLabel}년으로 줌인` : `Zoom in to ${focusYearLabel}`}{' '}
          <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 12운성 매트릭스 (본명 일간 × 대운 지지 단순 chip row) — fold 전용.
// ============================================================
function UnseongMatrix({ ilganHanja, decadeBranch }: { ilganHanja: string; decadeBranch: string }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const branchKo = BRANCH_KO[decadeBranch] ?? decadeBranch
  return (
    <div className={styles.unseongMatrix}>
      <div className={styles.unseongMatrixLabel}>
        {ko
          ? `12운성 매트릭스 · 본명 일간(${ilganHanja}) × 대운 지지(${decadeBranch})`
          : `Twelve-stage matrix · natal day master (${ilganHanja}) × decade branch (${decadeBranch})`}
      </div>
      <div className={styles.unseongMatrixChips}>
        <span className={styles.unseongMatrixChip}>
          <span className={styles.unseongMatrixHan}>{ilganHanja}</span>
          {ko ? '일간' : 'Day master'}
        </span>
        <span className={styles.unseongMatrixCross}>×</span>
        <span className={styles.unseongMatrixChip}>
          <span className={styles.unseongMatrixHan}>{decadeBranch}</span>
          {ko ? `대운 지지 · ${branchKo}` : `Decade branch · ${branchKo}`}
        </span>
      </div>
    </div>
  )
}
