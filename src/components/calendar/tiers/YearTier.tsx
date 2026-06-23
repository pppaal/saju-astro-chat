'use client'

/* ============================================================
   destinypal · YearTier — 1년(歲運) "올해의 모양" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT, MonthTier 가족):
     · 앱 셸은 다크 — 이 티어는 .yearRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 세운 간지(丙午)·세운 십신(정관)을 *표면에* 드러낸다(월의 甲午처럼).
     · 색 띠 12달 스트립(좋음/평이/조심) — 숫자 없음, monthlyScores 파생.
     · 올해의 무대(프로펙션 하우스/테마/룰러) + 황도분기 ZR L1.
     · 사주×점성 ▲/▼ 교차 카드(월의 .cross 패턴 재사용).

   PRESENTATION ONLY — 엔진/derivers/타입 미변경. props 시그니처 불변.
   ============================================================ */

import type { DestinyUserSummary, DestinyYear, DestinyDignityEntry } from '@/types/calendar'
import styles from './YearTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  sibsinArea,
  sibsinAreaEn,
  planetPlain,
  plainPairName,
  plainReason,
} from '@/lib/calendar-engine/derivers/plainLanguage'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import { ordinalEn } from '@/lib/calendar-engine/ordinal'

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

// ============================================================================
// Props (계약 불변 — 셸 줌 네비게이션이 onDive/onRise 를 호출. showRise 없음)
// ============================================================================

export interface YearTierProps {
  /** 본명 — 선택적 Lord-of-Year dignity 검색에 사용. */
  user: DestinyUserSummary
  /** 세운 + Profection. */
  year: DestinyYear
  /** 월(month) tier 로 다이브. */
  onDive: () => void
  /** Lifetime tier 로 라이즈. */
  onRise: () => void
}

// ============================================================================
// helpers (전문가용 dignity — 엔진 표면 아님, 표기용)
// ============================================================================

/** 본명 dignities 에서 행성 검색 (룰러 영문명). */
function findDignity(
  dignities: DestinyDignityEntry[] | undefined,
  planetName: string
): DestinyDignityEntry | undefined {
  if (!dignities) return undefined
  return dignities.find((d) => d.planet === planetName)
}

/** dignity entry → 한 줄 표기 ('domicile' 등) + polarity tone. */
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

// ── ZR 표기: 영문 별자리 → 한글, 룰러 → 일상 별명(ko). 의미는 새로 짓지 않음. ──
function zrSignKo(sign: string | undefined, ko: boolean): string {
  if (!sign) return ''
  return ko ? (SIGN_KO[sign] ?? sign) : sign
}
function zrRulerKo(ruler: string | undefined, ko: boolean): string {
  if (!ruler) return ''
  return ko ? planetPlain(ruler, true) : ruler
}

// ── 12달 색 띠 (월 달력처럼) — monthlyScores 톤으로 밴드. 숫자 없음. ──
type MonthTone = 'good' | 'steady' | 'caution'

function monthTone(score: number): MonthTone {
  if (score >= 60) return 'good'
  if (score >= 40) return 'steady'
  return 'caution'
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function YearTier({ user, year, onDive, onRise }: YearTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const p = year.profection

  // ── 세운 간지(표면 노출, 월의 甲午처럼). ──
  const gz = year.sewoonGz ?? year.sewoon?.gz
  const ganjiHanja = gz?.hanja ?? ''
  const ganjiRead = ko ? (gz?.kr ?? '') : (gz?.en ?? gz?.kr ?? '')
  const sewoonSibsin = year.sewoonSibsin ? String(year.sewoonSibsin) : ''
  const sewoonAreaPlain = sewoonSibsin
    ? ko
      ? sibsinArea(sewoonSibsin)
      : sibsinAreaEn(sewoonSibsin)
    : ''

  // ── 헤드라인(En 신뢰 금지 → ?? ko, 없으면 프로펙션에서 합성). ──
  const headlineText = ko
    ? year.headline
    : (year.headlineEn ??
      (p
        ? `This year leans toward your ${ordinalEn(p.house)} house${p.themeEn ? ` — ${p.themeEn.toLowerCase()}` : ''}.`
        : year.headline))

  // ── 12달 색 띠 — monthlyScores → 톤. ──
  const byMonth = new Map((year.monthlyScores ?? []).map((m) => [m.month, m]))
  const stripItems = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const m = byMonth.get(month)
    const score = m?.score ?? 0
    return { month, tone: monthTone(score), bestDay: m?.bestDay }
  })
  const hasMonths = (year.monthlyScores?.length ?? 0) > 0
  // near-uniform 가드 — 한 달만 톤이 다르면(현재 달 score 0 등) "큰 달/조심" 문구를 억제.
  const distinctTones = new Set(stripItems.map((s) => s.tone)).size
  const goodMonths = stripItems.filter((s) => s.tone === 'good').map((s) => s.month)
  const cautionMonths = stripItems.filter((s) => s.tone === 'caution').map((s) => s.month)
  // good/caution 중 더 적은 쪽만 신호로 본다(11×good + 1×caution → caution 한 달이 신호).
  const minorityCaution = cautionMonths.length > 0 && cautionMonths.length <= 3 ? cautionMonths : []
  const minorityGood = goodMonths.length > 0 && goodMonths.length <= 3 ? goodMonths : []
  const showBandPhrase =
    distinctTones > 1 && (minorityCaution.length > 0 || minorityGood.length > 0)
  const monthLbl = (m: number) => (ko ? `${m}월` : MONTH_ABBR[m - 1])
  const joinMonths = (ms: number[]) => ms.map(monthLbl).join(', ')

  // ── 올해 풀이 — 세운 영역 + 프로펙션 테마 합성(평문 2~3줄). ──
  const yearReadingParts: string[] = []
  if (sewoonAreaPlain) {
    yearReadingParts.push(
      ko
        ? `올해는 ‘${sewoonAreaPlain}’의 결이 한 해의 바탕을 이뤄요.`
        : `This year, ${sewoonAreaPlain} forms the underlying grain.`
    )
  }
  if (p) {
    yearReadingParts.push(
      ko
        ? `무게중심은 ‘${p.theme}’ 쪽으로 기울어, 그 결의 일이 가장 또렷하게 움직여요.`
        : `The weight tilts toward your ${ordinalEn(p.house)} house (${p.themeEn.toLowerCase()}) — that’s where things move most clearly.`
    )
  }
  if (showBandPhrase && minorityCaution.length > 0) {
    yearReadingParts.push(
      ko
        ? `다만 ${joinMonths(minorityCaution)}은 한 박자 쉬어 가세요.`
        : `That said, ease off around ${joinMonths(minorityCaution)}.`
    )
  }
  const yearReading = yearReadingParts.slice(0, 3).join(' ')

  // ── 올해의 무대 (프로펙션). ──
  const sect = user.sect ?? 'day'
  const lordOfYearName = p?.rulerEn ?? ''
  const lordDignity = findDignity(user.dignities, lordOfYearName)
  const lordReadout = lordDignity ? formatDignity(lordDignity) : null
  const astroNoteText = ko ? year.astroNote : (year.astroNoteEn ?? year.astroNote)

  // profectionWheel — 활성 하우스 슬라이스(natalPlanets 가드).
  const activeSlice = (year.profectionWheel ?? []).find((s) => s.active)
  const activePlanets = activeSlice?.natalPlanets ?? []

  // ── 겹치는 흐름 (crossings) — tone good→▲ / caution→▼ / neutral→· ──
  //    when 이 전부 같으면(전부 "6월") 반복이라 de-emphasize. non-neutral 우선 정렬 후 CAP 6.
  const allCross = year.crossings ?? []
  const sortedCross = [...allCross].sort((a, b) => {
    const w = (t: 'good' | 'caution' | 'neutral') => (t === 'neutral' ? 0 : 1)
    return w(b.tone) - w(a.tone)
  })
  const yearCross = sortedCross.slice(0, 6)
  const topCross = yearCross.find((c) => c.tone !== 'neutral') ?? null
  const distinctWhen = new Set(allCross.map((c) => c.when)).size
  const repeatedWhen = distinctWhen <= 1 // 전부 같은 when 이면 칩 숨김

  // ── 사주 한 줄. ──
  const sajuNoteText = ko ? year.sajuNote : (year.sajuNoteEn ?? year.sajuNote)

  // ── 황도분기 ZR — 현재 활성(now) 챕터. L2/LoB/Peak 없음(subPeriods 미신뢰). ──
  const zrSpiritNow = (year.zrSpiritChapters ?? []).find((c) => c.now)
  const zrFortuneNow = (year.zrFortuneChapters ?? []).find((c) => c.now)

  const toneSym = (t: 'good' | 'caution' | 'neutral') =>
    t === 'good' ? '▲' : t === 'caution' ? '▼' : '·'
  const toneCls = (t: 'good' | 'caution' | 'neutral') =>
    t === 'good' ? styles.poleUp : t === 'caution' ? styles.poleDn : ''
  const toneTag = (t: 'good' | 'caution' | 'neutral') =>
    ko ? (t === 'good' ? '길' : t === 'caution' ? '주의' : '중립') : t

  return (
    <div className={styles.yearRoot}>
      {/* ── zoom-out (rise → lifetime) ── */}
      <button type="button" className={styles.rise} onClick={onRise}>
        ↑ {ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'}
      </button>

      {/* ── eyebrow ── */}
      <div className={styles.eyebrow}>
        <span>
          {ko ? '1년' : '1 Year'} · YEARLY · {year.year}
        </span>
        <span aria-hidden />
      </div>

      {/* ── 세운 간지 header ── */}
      <header className={styles.header}>
        <div className={styles.ganzhi}>{ganjiHanja}</div>
        {ganjiRead && (
          <div className={styles.ganzhiRead}>{ko ? `${ganjiRead} 세운` : ganjiRead}</div>
        )}
        <div className={styles.title}>
          {year.year}
          <span className={styles.titleKo}>
            {ko ? `${year.year}년의 모양` : `The shape of ${year.year}`}
          </span>
        </div>
        {(sewoonSibsin || sewoonAreaPlain) && (
          <div className={styles.counts}>
            {sewoonAreaPlain ? (
              <span className={styles.cArea}>
                {ko ? '올해의 결' : 'Annual'}
                <b>{sewoonAreaPlain}</b>
              </span>
            ) : (
              <span className={styles.cSibsin}>
                {ko ? '세운 십신' : 'Annual'}
                <b>{sewoonSibsin}</b>
              </span>
            )}
            {sewoonAreaPlain && sewoonSibsin && (
              <span className={styles.cSibsin}>
                {ko ? '십신' : 'sibsin'}
                <b>{sewoonSibsin}</b>
              </span>
            )}
            {p && (
              <span className={styles.cHouse}>
                {ko ? '무대' : 'house'}
                <b>{p.house}</b>
              </span>
            )}
          </div>
        )}
      </header>

      {/* ── headline ── */}
      {headlineText && <p className={styles.headline}>{headlineText}</p>}

      {/* ── 열두 달 색 띠 (숫자 없음) ── */}
      {hasMonths && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '열두 달의 흐름' : 'Twelve months'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>12 months</span>
          </div>
          <div className={styles.strip}>
            {stripItems.map((it) => {
              const cls = [
                styles.stripCell,
                it.tone === 'good' && styles.cellGood,
                it.tone === 'caution' && styles.cellCaution,
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div className={cls} key={it.month}>
                  <span className={styles.stripNum}>{it.month}</span>
                  {it.tone === 'good' && (
                    <span className={styles.star} aria-hidden>
                      ✦
                    </span>
                  )}
                  {it.bestDay && (
                    <span className={styles.stripBest} aria-hidden title={it.bestDay} />
                  )}
                </div>
              )
            })}
          </div>
          <div className={styles.legend}>
            <span className={`${styles.lg} ${styles.lgGood}`}>
              <i />
              {ko ? '좋은 달' : 'Good'}
            </span>
            <span className={`${styles.lg} ${styles.lgCare}`}>
              <i />
              {ko ? '평이한 달' : 'Steady'}
            </span>
            <span className={`${styles.lg} ${styles.lgAvoid}`}>
              <i />
              {ko ? '조심할 달' : 'Careful'}
            </span>
          </div>
          {showBandPhrase && (
            <p className={styles.bandPhrase}>
              {minorityGood.length > 0 && (
                <span className={styles.bpGood}>
                  <b>{ko ? '좋은 달' : 'Good'}</b> {joinMonths(minorityGood)}
                </span>
              )}
              {minorityGood.length > 0 && minorityCaution.length > 0 && (
                <span className={styles.bpSep}> · </span>
              )}
              {minorityCaution.length > 0 && (
                <span className={styles.bpCare}>
                  <b>{ko ? '조심' : 'Careful'}</b> {joinMonths(minorityCaution)}
                </span>
              )}
            </p>
          )}
        </section>
      )}

      {/* ── 올해 풀이 (verdict) ── */}
      {yearReading && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '올해 풀이' : 'Reading the year'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>In a line</span>
          </div>
          <p className={styles.verdict}>{yearReading}</p>
          {(ganjiHanja || sewoonSibsin) && (
            <div className={styles.verdictSub}>
              <span className={styles.termTag}>
                {[ganjiHanja, sewoonSibsin].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── 올해의 무대 (프로펙션) ── */}
      {p && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '올해의 무대' : 'This year’s stage'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Profection</span>
          </div>
          <div className={styles.stage}>
            <p className={styles.stageTheme}>{ko ? p.theme : p.themeEn}</p>
            <p className={styles.stageLead}>
              {ko
                ? '올해는 이 결이 한 해의 중심 무대가 돼요.'
                : `This is the year’s ${ordinalEn(p.house)}-house stage.`}
            </p>
            <div className={styles.stageTags}>
              <span className={styles.termTag}>
                {ko ? `${p.house}번째 영역` : `${ordinalEn(p.house)} house`}
              </span>
              <span className={styles.termTag}>{ko ? `자리 ${p.cusp}` : `cusp ${p.cuspEn}`}</span>
              <span className={styles.termTag}>
                {ko ? `주관 별 ${p.ruler}` : `ruler ${p.rulerEn}`}
              </span>
            </div>
            <dl className={styles.dl}>
              <dt>{ko ? '주관 별의 본명 자리' : 'ruler (natal)'}</dt>
              <dd>{ko ? p.rulerNatal : p.rulerNatalEn}</dd>
              {activePlanets.length > 0 && (
                <>
                  <dt>{ko ? '본명 행성' : 'natal here'}</dt>
                  <dd>{activePlanets.join(' · ')}</dd>
                </>
              )}
            </dl>
            <div
              className={
                sect === 'day'
                  ? `${styles.sectPill} ${styles.sectDay}`
                  : `${styles.sectPill} ${styles.sectNight}`
              }
            >
              {ko
                ? sect === 'day'
                  ? '낮 출생 · Diurnal'
                  : '밤 출생 · Nocturnal'
                : sect === 'day'
                  ? 'Diurnal · day birth'
                  : 'Nocturnal · night birth'}
            </div>
            {lordReadout && (
              <p className={styles.lordOfYear}>
                <b>{ko ? '올해의 주관 별' : 'Lord of Year'}</b> {ko ? p.ruler : p.rulerEn} —{' '}
                <span className={styles[lordReadout.tone]}>{lordReadout.text}</span>
              </p>
            )}
            {astroNoteText && <p className={styles.stageNote}>{astroNoteText}</p>}
          </div>
        </section>
      )}

      {/* ── 올해 무엇이 겹치나 (crossings) — ▲/▼ 패턴 ── */}
      {yearCross.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '올해 무엇이 겹치나' : 'What overlaps'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Crossings</span>
          </div>
          <div className={styles.crossLegend}>
            <span className={styles.clUp}>▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}</span>
            <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
          </div>
          {yearCross.map((c, i) => {
            const isHero = topCross != null && c === topCross
            const when = ko ? c.when : (c.whenEn ?? c.when)
            const head = plainPairName(ko ? c.title : (c.titleEn ?? c.title), ko)
            const body = plainReason(ko ? c.detail : (c.detailEn ?? c.detail), ko)
            return (
              <div className={`${styles.cross} ${isHero ? styles.crossHero : ''}`.trim()} key={i}>
                <div className={styles.crossTop}>
                  <span className={`${styles.pole} ${toneCls(c.tone)}`.trim()} aria-hidden>
                    {toneSym(c.tone)}
                  </span>
                  <span className={styles.crossHead}>{head}</span>
                  {!repeatedWhen && when && <span className={styles.whenPill}>{when}</span>}
                  {isHero && (
                    <span className={styles.crossFlag}>
                      {ko ? `${toneTag(c.tone)} · 핵심` : `${toneTag(c.tone)} · key`}
                    </span>
                  )}
                </div>
                {body && <div className={styles.crossBody}>{body}</div>}
              </div>
            )
          })}
          {repeatedWhen && allCross[0]?.when && (
            <p className={styles.crossWhen}>
              {ko
                ? `이 흐름들은 ${allCross[0].when}에 한꺼번에 겹쳐요.`
                : `These concentrate around ${allCross[0].whenEn ?? allCross[0].when}.`}
            </p>
          )}
        </section>
      )}

      {/* ── 사주 한 줄 ── */}
      {(sajuNoteText || ganjiHanja) && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '사주 한 줄' : 'Saju in a line'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Saju</span>
          </div>
          <div className={styles.sajuRow}>
            <span className={styles.sajuGz}>{ganjiHanja}</span>
            <div className={styles.sajuText}>
              <div className={styles.sajuMeta}>
                {ko ? '세운 ' : 'Annual '}
                {year.year}
                {sewoonSibsin ? ` · ${sewoonSibsin}` : ''}
                {sewoonAreaPlain && sewoonAreaPlain !== sewoonSibsin ? ` (${sewoonAreaPlain})` : ''}
              </div>
              {sajuNoteText && <p className={styles.sajuNote}>{sajuNoteText}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── 황도분기 ZR (L1 — 현재 챕터) ── */}
      {(zrSpiritNow || zrFortuneNow) && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '황도분기' : 'Zodiacal Releasing'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>ZR · L1</span>
          </div>
          <div className={styles.zrCard}>
            <div className={`${styles.zrPane} ${styles.zrPaneSpirit}`}>
              <div className={styles.zrPaneHead}>
                {ko ? '진로·방향 (영점)' : 'Spirit · soul · path'}
              </div>
              {zrSpiritNow ? (
                <>
                  <div className={styles.zrLine}>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrSignKo(zrSpiritNow.sign, ko)}</span>
                    <span className={styles.zrRuler}>{zrRulerKo(zrSpiritNow.ruler, ko)}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrSpiritNow.calendarStartYear}–{zrSpiritNow.calendarEndYear}
                    </span>
                    <span>
                      {zrSpiritNow.durationYears}
                      {ko ? '년' : 'y'}
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.zrEmpty}>
                  {ko ? '지금 진행 중인 진로·방향 장이 없어요' : 'No active Spirit chapter'}
                </div>
              )}
            </div>

            <div className={`${styles.zrPane} ${styles.zrPaneFortune}`}>
              <div className={styles.zrPaneHead}>
                {ko ? '현실·체질 (복점)' : 'Fortune · body · matter'}
              </div>
              {zrFortuneNow ? (
                <>
                  <div className={styles.zrLine}>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrSignKo(zrFortuneNow.sign, ko)}</span>
                    <span className={styles.zrRuler}>{zrRulerKo(zrFortuneNow.ruler, ko)}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrFortuneNow.calendarStartYear}–{zrFortuneNow.calendarEndYear}
                    </span>
                    <span>
                      {zrFortuneNow.durationYears}
                      {ko ? '년' : 'y'}
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.zrEmpty}>
                  {ko ? '지금 진행 중인 현실·체질 장이 없어요' : 'No active Fortune chapter'}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA (zoom-in → month) ── */}
      <button className={styles.cta} onClick={onDive} type="button">
        {ko ? '이번 달로 줌인 →' : 'Zoom in to this month →'}
      </button>
    </div>
  )
}
