'use client'

// destinypal · LifetimeTier — "계절의 길 (Seasons Path)" redesign
//
// 인생을 봄→여름→가을→겨울 의 색 구간을 지나는 길로 그린다. "지금 여기" 마커가
// 현재 시기를, 앞날은 흐리게(불확실) 표현한다. 메인 표면에는 용어(일간/격국/용신·
// 오행·ZR·Arabic Lots·대운 간지·Sun/Asc/MC)가 없다 — 전부 "자세한 신호 보기"
// <details> 폴드 안으로 들어간다.
//
// presentation only — lifetime shape / engine math 은 건드리지 않는다.
// Light-tone (ink-on-hanji) 팔레트. ko/en parity via useI18n.

import type { CSSProperties, ReactNode } from 'react'
import { SIGN_KO } from '@/lib/astrology/signLabels'

import type {
  DestinyArabicLot,
  DestinyLifeStage,
  DestinyLifetime,
  DestinyMilestone,
  DestinyUserSummary,
  DestinyZRChapter,
  ElementCounts,
  Ganji as GanjiData,
} from '@/types/calendar'

import styles from './LifetimeTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { TierFrame, Eyebrow, TierHero, Band } from '@/components/calendar/layout/TierFrame'

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
// Inline atom stubs (한자 chip / 오행 bar — 폴드 안에서만 쓰인다)
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const isSaju = kind === 'saju'
  return (
    <span className={`${styles.layerTag} ${isSaju ? styles.saju : styles.astro}`}>
      <span className={styles.pip} />{' '}
      {isSaju ? (ko ? '사주 · SAJU' : 'Saju · 四柱') : ko ? '점성 · ASTRO' : 'Astrology'}
    </span>
  )
}

// ============================================================================
// Helpers
// ============================================================================

/** 외행성 glyph 매핑 — 7가지 kind 모두. */
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

/** ZR sign Korean (zodiac signs). 정본(astrology/signLabels) 재사용. */
function zodiacKo(signEn: string): string {
  return SIGN_KO[signEn] ?? signEn
}

// 4구간 → felt 계절 테마. lifeStage.id 순서대로 봄·여름·가을·겨울.
// stage.name/tone 은 이미 plain-ish 이지만, 계절감(자라남·쌓음·거둠·갈무리)을
// 메인 표면 색·라벨로 입혀 용어 없이 "내 인생의 길"을 읽히게 한다.
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'
const SEASON_ORDER: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter']
const SEASON_META: Record<
  SeasonKey,
  { ko: string; en: string; themeKo: string; themeEn: string; color: string; soft: string }
> = {
  spring: {
    ko: '봄',
    en: 'Spring',
    themeKo: '싹트는 봄',
    themeEn: 'Sprouting spring',
    color: 'var(--el-wood)',
    soft: 'rgba(79,122,64,0.16)',
  },
  summer: {
    ko: '여름',
    en: 'Summer',
    themeKo: '쌓아가는 여름',
    themeEn: 'Building summer',
    color: 'var(--el-fire)',
    soft: 'rgba(189,71,43,0.16)',
  },
  autumn: {
    ko: '가을',
    en: 'Autumn',
    themeKo: '거두는 가을',
    themeEn: 'Harvesting autumn',
    color: 'var(--el-earth)',
    soft: 'rgba(179,135,58,0.18)',
  },
  winter: {
    ko: '겨울',
    en: 'Winter',
    themeKo: '갈무리하는 겨울',
    themeEn: 'Gathering winter',
    color: 'var(--el-water)',
    soft: 'rgba(52,90,134,0.16)',
  },
}

// ============================================================================
// SeasonsPath — 메인 hero. 4 lifeStages 를 길 위의 노드로, 색 구간으로.
// 지난 시기는 또렷이(solid), 앞날은 흐리게(faded) — 불확실성. "지금" 마커.
// ============================================================================

function SeasonsPath({
  lifeStages,
  nowStageId,
  daeunFavor,
  onDive,
}: {
  lifeStages: DestinyLifeStage[]
  nowStageId?: string
  daeunFavor?: Array<{ startAge: number; favor: number }>
  onDive: () => void
}) {
  const { locale } = useI18n()
  const ko = locale === 'ko'

  const n = lifeStages.length
  const W = 100
  const H = 46
  const padX = 9
  // 노드 x — 폭에 고르게.
  const xAt = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2)
  // 노드 y — daeun favor 가 있으면 평균 favor 로 완만한 굴곡, 없으면 중앙 가까이.
  const stageFavor = (s: DestinyLifeStage): number => {
    if (!daeunFavor || daeunFavor.length === 0) return 0
    const inStage = daeunFavor.filter((d) => d.startAge >= s.ageFrom && d.startAge <= s.ageTo)
    const pool = inStage.length > 0 ? inStage : daeunFavor
    return pool.reduce((a, d) => a + d.favor, 0) / pool.length
  }
  const yAt = (favor: number) => {
    const t = (favor + 2) / 4 // 0..1, 좋음=위
    return 9 + (1 - t) * (H - 22)
  }
  const nodes = lifeStages.map((s, i) => ({
    stage: s,
    x: xAt(i),
    y: yAt(stageFavor(s)),
    now: s.id === nowStageId,
  }))
  const nowIndex = nodes.findIndex((nd) => nd.now)

  // 부드러운 길(Catmull-Rom → 베지어 근사).
  const pathD = nodes
    .map((p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      const prev = nodes[i - 1]
      const cx = (prev.x + p.x) / 2
      return `C ${cx.toFixed(1)} ${prev.y.toFixed(1)} ${cx.toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className={styles.seasons}>
      <div className={styles.seasonsRibbon} aria-hidden>
        {nodes.map((nd, i) => {
          const season = SEASON_META[SEASON_ORDER[i] ?? 'spring']
          const future = nowIndex >= 0 && i > nowIndex
          return (
            <span
              key={nd.stage.id}
              className={`${styles.seasonZone} ${future ? styles.seasonFuture : ''}`}
              style={{ background: season.soft }}
            />
          )
        })}
      </div>

      <svg
        className={styles.seasonsSvg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* 지나온 길 — solid. 앞으로의 길 — faded. nowIndex 기준 분리. */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--ink-faint)"
          strokeWidth="0.7"
          strokeDasharray="1.6 1.4"
          vectorEffect="non-scaling-stroke"
          opacity="0.5"
        />
        {nodes.map((nd, i) => {
          const season = SEASON_META[SEASON_ORDER[i] ?? 'spring']
          const future = nowIndex >= 0 && i > nowIndex
          return (
            <g key={nd.stage.id} opacity={future ? 0.4 : 1}>
              {nd.now && (
                <circle
                  cx={nd.x}
                  cy={nd.y}
                  r="3.4"
                  fill="none"
                  stroke="var(--ember)"
                  strokeWidth="0.5"
                  opacity="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <circle
                cx={nd.x}
                cy={nd.y}
                r={nd.now ? 2.1 : 1.5}
                fill={nd.now ? 'var(--ember)' : season.color}
                stroke={nd.now ? 'var(--ember-2)' : 'var(--void)'}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                style={nd.now ? { filter: 'drop-shadow(0 0 4px var(--ember-glow))' } : undefined}
              />
            </g>
          )
        })}
      </svg>

      <div className={styles.seasonCards}>
        {nodes.map((nd, i) => {
          const season = SEASON_META[SEASON_ORDER[i] ?? 'spring']
          const future = nowIndex >= 0 && i > nowIndex
          const interactive = nd.now
          // 라벨 — felt 계절 테마(용어 없음). stage.tone 은 plain-ish 라 부연으로.
          return (
            <div
              key={nd.stage.id}
              className={`${styles.seasonCard} ${nd.now ? styles.seasonNow : ''} ${
                future ? styles.seasonCardFuture : ''
              }`}
              style={{ '--season-c': season.color } as CSSProperties}
              onClick={interactive ? onDive : undefined}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onDive()
                      }
                    }
                  : undefined
              }
            >
              {nd.now && <span className={styles.seasonNowTag}>{ko ? '지금' : 'now'}</span>}
              <span className={styles.seasonGlyph} style={{ color: season.color }}>
                {ko ? season.ko : season.en}
              </span>
              <span className={styles.seasonTheme}>{ko ? season.themeKo : season.themeEn}</span>
              <span className={styles.seasonStageName}>
                {ko ? nd.stage.name : (nd.stage.nameEn ?? nd.stage.name)}
              </span>
              <span className={styles.seasonAge}>
                {nd.stage.ageFrom}–{nd.stage.ageTo}
                {ko ? '세' : ' yrs'}
              </span>
              <span className={styles.seasonTone}>
                {ko ? nd.stage.tone : (nd.stage.toneEn ?? nd.stage.tone)}
              </span>
              {nd.now && (
                <span className={styles.seasonDiveHint}>
                  {ko ? '탭하면 올해로 ↘' : 'Tap for this year ↘'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// LifeTimeline — 사주 대운 × 점성 ZR 을 한 나이축에 평행으로 (폴드 안)
// ============================================================================
function LifeTimeline({ lifetime }: { lifetime: DestinyLifetime }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
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
        <h2 className={styles.sectionTitle}>
          {ko ? '인생 타임라인 · 대운 × 점성' : 'Life timeline · Decades × Astrology'}
        </h2>
        <span className={styles.tiny}>
          {ko
            ? '사주 10년운과 점성 ZR 챕터를 같은 나이축에 나란히'
            : 'Saju decade luck and astro ZR chapters side by side on one age axis'}
        </span>
      </div>
      <div className={styles.tlWrap} style={{ position: 'relative' }}>
        {/* 사주 대운 */}
        <div className={styles.tlRowLabel}>{ko ? '사주 대운' : 'Saju decades'}</div>
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
        <div className={styles.tlRowLabel}>{ko ? '점성 ZR' : 'Astro ZR'}</div>
        <div className={styles.tlTrack} style={{ position: 'relative' }}>
          {spirit.map((c, i) =>
            seg(
              pct(c.calendarStartYear - by),
              pct(c.calendarEndYear - c.calendarStartYear || 1),
              !!c.now,
              ko ? zodiacKo(c.sign) : c.sign,
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
            {`${a}`}
            {ko ? '세' : ' yr'}
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const { lifeStages, daewoon, milestones, zrSpiritChapters, zrFortuneChapters } = lifetime

  // C5: lifeStages 빈 배열 가드 (adapter 실패 시 깨짐 방지)
  if (!lifeStages?.length) {
    return (
      <TierFrame screenLabel="인생 84년">
        <Eyebrow>{ko ? '인생 · LIFETIME · 84년' : 'LIFETIME · 84 years'}</Eyebrow>
        <TierHero
          lead={ko ? '내 인생의 길' : 'The path of my life'}
          sub={ko ? '본명 정보를 불러오는 중...' : 'Loading natal data...'}
        />
      </TierFrame>
    )
  }
  const nowStage = lifeStages.find((s) => s.now) ?? lifeStages[1] ?? lifeStages[0]

  // 오행 dominant (폴드 라벨용).
  const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
  const elementsEntries = Object.entries(user.elements || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  )
  const dominantEl = elementsEntries[0]?.[0]
  const elementsLabelText = dominantEl
    ? ko
      ? `사주 8자 오행 분포 — ${dominantEl}(${EL_HANJA[dominantEl] ?? dominantEl}) 최다`
      : `Eight-character element spread — ${dominantEl}(${EL_HANJA[dominantEl] ?? dominantEl}) dominant`
    : ko
      ? '사주 8자 오행 분포'
      : 'Eight-character element spread'

  // astro 메타 한 줄 — 폴드 안에서만. (메인 표면엔 Sun/Asc/MC 노출 금지)
  const astroSegs = [
    user.astro?.sunEn && `Sun ${user.astro.sunEn}`,
    user.astro?.ascEn && `Asc ${user.astro.ascEn}`,
    user.astro?.mcEn && `MC ${user.astro.mcEn}`,
  ].filter(Boolean) as string[]

  // C4: rootStatus 있을 때만 "통근" 라벨, 없으면 "주십신"
  const hasRootStatus = !!user.rootStatus

  // ── 인생의 큰 마디 — 용어(간지) 없는 plain 라벨 + 의미. labelEn/meaningEn for en. ──
  const mLabel = (m: DestinyMilestone) => (ko ? m.label : (m.labelEn ?? m.label))
  // 라벨에서 '—' 앞 핵심만 (간지/숫자가 섞이지 않은 plain head).
  const mHead = (m: DestinyMilestone) => {
    const l = mLabel(m)
    return l.includes('—') ? l.split('—')[0].trim() : l
  }
  const mMeaning = (m: DestinyMilestone) => {
    const baked = ko ? m.meaning : (m.meaningEn ?? m.meaning)
    if (baked) return baked
    const l = mLabel(m)
    return l.includes('—') ? l.split('—').slice(1).join('—').trim() : ''
  }

  // 큰 마디 리스트 — 과거/지금/미래. 미래는 흐리게.
  const turningItems = [...milestones]
    .sort((a, b) => a.year - b.year)
    .map((m) => {
      const past = m.year < lifetime.currentYear
      return {
        key: `${m.year}-${m.age}`,
        when: ko ? `${m.year} · ${m.age}세` : `${m.year} · age ${m.age}`,
        title: mHead(m),
        meaning: mMeaning(m),
        now: !!m.now,
        past,
        future: !past && !m.now,
      }
    })

  const patternHeadline =
    (ko ? lifetime.lifePattern?.ko : (lifetime.lifePattern?.en ?? lifetime.lifePattern?.ko)) ??
    (ko ? '내 인생 흐름' : 'My life flow')
  const patternLine = ko
    ? lifetime.lifePattern?.line
    : (lifetime.lifePattern?.lineEn ?? lifetime.lifePattern?.line)

  return (
    <TierFrame screenLabel="인생 84년">
      {/* ============================================================
          hero — 내 인생의 길 (lead = 평이한 제목, sub = 인생 유형 한 줄)
      ============================================================ */}
      <Eyebrow>{ko ? '인생 · LIFETIME · 84년' : 'LIFETIME · 84 years'}</Eyebrow>
      <TierHero lead={ko ? '내 인생의 길' : 'The path of my life'} sub={patternLine} />

      {/* 헤더 부연 + 인생 유형 헤드라인 — 이미 plain. */}
      <p className={`${styles.tiny} ${styles.headerMeta}`}>
        {ko
          ? '봄에서 겨울까지, 계절을 지나는 길. 지금 당신은 여기에 있어요.'
          : 'A path through the seasons, spring to winter. You are here, now.'}
      </p>
      <div className={styles.patternHero}>
        <h2 className={styles.patternHeadline}>{patternHeadline}</h2>
      </div>

      {/* 계절의 길 — 핵심 비주얼. 4 stages, 색 구간, 지금 마커, 미래 흐림 */}
      <Band>
        <SeasonsPath
          lifeStages={lifeStages}
          nowStageId={nowStage?.id}
          daeunFavor={lifetime.lifePattern?.daeun}
          onDive={onDive}
        />
      </Band>

      {/* 인생의 큰 마디 — plain 라벨 + 의미 (간지 없음) */}
      <Band
        title={ko ? '인생의 큰 마디' : 'Life’s major turns'}
        aside={ko ? '지나온 매듭과 다가올 매듭' : 'Turns behind and turns ahead'}
      >
        <ul className={styles.turnList}>
          {turningItems.map((t) => (
            <li
              key={t.key}
              className={`${styles.turnItem} ${t.now ? styles.turnNow : ''} ${
                t.past ? styles.turnPast : ''
              } ${t.future ? styles.turnFuture : ''}`}
            >
              <span className={styles.turnWhen}>
                {t.when}
                {t.now ? <em>{ko ? '지금' : 'now'}</em> : null}
              </span>
              <span className={styles.turnDot} aria-hidden />
              <div className={styles.turnBody}>
                <div className={styles.turnTitle}>{t.title}</div>
                {t.meaning ? <div className={styles.turnMeaning}>{t.meaning}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      </Band>

      {/* anti-fatalism footer — 짧고 중요하므로 jargon fold 밖 plain footer 로 유지 */}
      <p className={styles.forecast}>
        {ko
          ? '앞날은 정해진 운명이 아니라 지금 기운으로 본 계절 예보 — 길은 당신이 걷습니다.'
          : 'What lies ahead is not fixed fate but a seasonal forecast read from today’s weather — you walk the path.'}
      </p>

      {/* ============================================================
          자세한 신호 보기 — 모든 용어(일간/격국/용신·오행·ZR·Lots·대운 간지·
          Sun/Asc/MC)를 여기로. 메인 표면엔 노출하지 않는다.
      ============================================================ */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko
            ? '자세한 신호 보기 · 사주 원국과 근거'
            : 'See the detailed signals · natal chart & evidence'}
        </summary>

        <p className={`${styles.tiny} ${styles.headerMeta}`}>
          {user.birthKo} · {user.place} · {user.sex}
          {astroSegs.length > 0 ? (
            <>
              <span className={styles.pipe}>|</span>
              {astroSegs.join(' · ')}
            </>
          ) : null}
        </p>

        {/* 정체성 카드 — 일간·격국·인생유형·점성 압축. */}
        {lifetime.lifePattern && (
          <div className={styles.idCard}>
            <div className={styles.idCardRow}>
              <span className={styles.idCardHan}>{user.ilgan.hanja}</span>
              <div className={styles.idCardMeta}>
                <div className={styles.idCardType}>
                  {ko
                    ? lifetime.lifePattern.ko
                    : (lifetime.lifePattern.en ?? lifetime.lifePattern.ko)}
                </div>
                <div className={styles.idCardSub}>
                  {ko
                    ? `${user.ilgan.kr} 일간 · ${user.gyeokguk}`
                    : `${user.ilgan.kr} day master · ${user.gyeokguk}`}
                  {user.astro?.sun ? ` · ☉${user.astro.sun}` : ''}
                </div>
              </div>
            </div>
            <p className={styles.idCardLine}>
              {ko
                ? lifetime.lifePattern.line
                : (lifetime.lifePattern.lineEn ?? lifetime.lifePattern.line)}
            </p>
          </div>
        )}

        <div className={styles.introGrid}>
          <div>
            <p className={styles.lead}>{user.intro}</p>
            <p className={`${styles.lead} ${styles.leadEn}`}>{user.introEn}</p>
          </div>

          <div className={`${styles.panel} ${styles.introPanel}`}>
            <div className={styles.introPanelSide}>
              <div className={styles.idChips}>
                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '일간' : 'Day master'}</span>
                  <span className={styles.han}>{user.ilgan.hanja}</span>
                  <span className={styles.v}>{user.ilgan.kr}</span>
                </span>

                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '격국' : 'Structure'}</span>
                  <span className={styles.v}>{user.gyeokgukStatus ?? user.gyeokguk}</span>
                </span>

                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '용신' : 'Yongsin'}</span>
                  <span className={styles.han}>{user.yongsin.hanja}</span>
                </span>
                <span className={styles.chip}>
                  <span className={styles.k}>{ko ? '강약' : 'Strength'}</span>
                  <span className={styles.v}>{user.gangyak}</span>
                </span>

                <span className={styles.chip}>
                  <span className={styles.k}>
                    {hasRootStatus ? (ko ? '통근' : 'Rooted') : ko ? '주십신' : 'Main god'}
                  </span>
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

        {/* 인생 유형 — 신강약 기준 대운 흐름 (대운 간지 방향) */}
        {lifetime.lifePattern && (
          <div className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {ko
                  ? `인생 유형 · ${lifetime.lifePattern.ko}`
                  : `Life type · ${lifetime.lifePattern.en ?? lifetime.lifePattern.ko}`}
              </h2>
              <span className={styles.tiny}>
                {ko ? '신강약 기준 대운 흐름' : 'Decade flow by day-master strength'}
              </span>
            </div>
            <p className={styles.lead}>
              {ko
                ? lifetime.lifePattern.line
                : (lifetime.lifePattern.lineEn ?? lifetime.lifePattern.line)}
            </p>
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

        {/* 대운 × 점성(ZR) 평행 타임라인 */}
        <LifeTimeline lifetime={lifetime} />

        {/* stage detail blocks — 대운 간지 spine + 합충·신살·12운성 + 외행성 */}
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

        {/* Natal Lots row */}
        {user.lots && user.lots.length > 0 && <NatalLotsRow lots={user.lots} />}

        {/* ZR L1 carousel (Spirit / Fortune) */}
        {(zrSpiritChapters?.length > 0 || zrFortuneChapters?.length > 0) && (
          <ZRCarousel spirit={zrSpiritChapters ?? []} fortune={zrFortuneChapters ?? []} />
        )}

        {/* milestone timeline (간지·간격 포함 raw 타임라인) */}
        <div className={styles.miles}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{ko ? '분기점 타임라인' : 'Pivot timeline'}</h2>
            <span className={styles.tiny}>
              {ko ? '사주 · 점성 수렴 마디' : 'Saju · Astrology convergence points'}
            </span>
          </div>
          <div className={styles.mileTrack}>
            {milestones.map((m, i) => (
              <div key={`${m.year}-${i}`} className={`${styles.mile} ${m.now ? styles.now : ''}`}>
                <span className={styles.node} />
                <span className={styles.yr}>
                  {m.year}
                  <small>
                    {m.age}
                    {ko ? '세' : ' yrs'}
                  </small>
                </span>
                <span className={styles.lab}>
                  {mLabel(m)}
                  {m.now && <span className={styles.nowMark}>{ko ? '← 지금' : '← now'}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </details>

      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive} type="button">
          {ko ? `올해 ${lifetime.currentYear}으로 줌인` : `Zoom in to ${lifetime.currentYear}`}{' '}
          <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </TierFrame>
  )
}

// ============================================================================
// Stage detail block (대운 간지 spine + 합충·신살·12운성 + 외행성) — 폴드 안
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const detail = stage.detail
  if (!detail) return null

  // 이 stage 범위에 걸치는 대운만 추림 (전부 그리면 과부하)
  const stageDaewoon = daewoon.filter((dw) => dw.end > stage.yearFrom && dw.start <= stage.yearTo)

  const headerNote = isCurrent
    ? ko
      ? '지금의 결'
      : 'The grain of now'
    : ko
      ? `${stage.ageFrom}–${stage.ageTo}세 · ${stage.yearFrom}–${stage.yearTo}`
      : `${stage.ageFrom}–${stage.ageTo} yrs · ${stage.yearFrom}–${stage.yearTo}`

  return (
    <div className={styles.stageDetail}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {ko ? stage.name : (stage.nameEn ?? stage.name)} — {headerNote}
        </h2>
        <span className={styles.tiny}>
          {stage.ageFrom}–{stage.ageTo}
          {ko ? '세' : ' yrs'} · {stage.yearFrom}–{stage.yearTo}
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

      {(() => {
        const bodyLines = ko ? detail.body : detail.bodyEn?.length ? detail.bodyEn : detail.body
        return bodyLines.length > 0 ? (
          <p className={styles.lead} style={{ marginTop: 16 }}>
            {bodyLines.join(' ')}
          </p>
        ) : null
      })()}

      <div className={styles.detailGrid}>
        {detail.hapchung && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphEmber}`}>⚡</span>{' '}
                {ko ? '합충' : 'Harmony & clash'} · HAPCHUNG
              </>
            }
            chip={detail.hapchung}
          />
        )}
        {detail.shinsal && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphViolet}`}>✦</span>{' '}
                {ko ? '신살' : 'Shinsal'} · SHINSAL
              </>
            }
            chip={{
              // shinsal 칩의 generic title('신살 활성')은 kind 마커로 로케일 라벨 선택.
              ...detail.shinsal,
              title:
                detail.shinsal.kind === 'shinsal'
                  ? ko
                    ? '신살 활성'
                    : 'Shinsal active'
                  : detail.shinsal.title,
            }}
          />
        )}
        {detail.unseong && (
          <DetailCard
            heading={
              <>
                <span className={`${styles.glyphMini} ${styles.glyphDim}`}>◯</span>{' '}
                {ko ? '12운성' : 'Twelve stages'} · UNSEONG
              </>
            }
            chip={detail.unseong}
          />
        )}
      </div>

      {/* outer planets — 7가지 kind 모두 매핑 */}
      {detail.outer.length > 0 && (
        <div className={styles.outerWrap}>
          <LayerTag kind="astro" />
          <span className={`${styles.tiny} ${styles.outerLabel}`}>
            {ko ? '외행성 마디 · Outer-planet returns' : 'Outer-planet returns'}
          </span>
          <div className={styles.outerRow}>
            {detail.outer.map((o, i) => {
              const kind = o.kind ?? 'jupiter'
              const cls = OUTER_CLASS[kind] ?? styles.jupiter
              const glyph = OUTER_GLYPH[kind] ?? '★'
              const label = ko ? o.label : (o.labelEn ?? o.label)
              const body = ko ? o.body : (o.bodyEn ?? o.body)
              return (
                <div key={`${o.label}-${i}`} className={`${styles.outerChip} ${cls}`}>
                  <span className={styles.ic}>{glyph}</span>
                  <div className={styles.ot}>
                    <div className={styles.l}>{label}</div>
                    <div className={styles.d}>
                      {o.date} · {body}
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
  chip: { title: string; romaji?: string; body: string; bodyEn?: string }
}) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={styles.dcard}>
      <div className={styles.h}>{heading}</div>
      <div className={styles.t}>{chip.title}</div>
      {chip.romaji && <div className={styles.r}>{chip.romaji}</div>}
      <div className={styles.b}>{ko ? chip.body : (chip.bodyEn ?? chip.body)}</div>
    </div>
  )
}

// ============================================================================
// Natal Lots row (7개 gold chip) — 폴드 안
// ============================================================================

function NatalLotsRow({ lots }: { lots: DestinyArabicLot[] }) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={`${styles.block} ${styles.lotsWrap}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {ko ? '본명 7대 점(點) · Arabic Lots' : 'Seven natal Lots · Arabic Lots'}
        </h2>
        <span className={styles.tiny}>Hellenistic · sect-aware</span>
      </div>
      <LayerTag kind="astro" />
      <span className={`${styles.tiny} ${styles.lotsLabel}`}>
        Lots — Fortune · Spirit · Eros · Necessity · Courage · Victory · Nemesis
      </span>
      <div className={styles.lotsGrid}>
        {lots.map((lot) => {
          const mark = LOT_MARK[lot.name] ?? lot.name.charAt(0)
          const sign = ko ? zodiacKo(lot.sign) : lot.sign
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
// ZR L1 carousel — 폴드 안
// ============================================================================

function ZRCarousel({
  spirit,
  fortune,
}: {
  spirit: DestinyZRChapter[]
  fortune: DestinyZRChapter[]
}) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={styles.zrWrap}>
      <div className={styles.sectionHead}>
        <h2
          className={styles.sectionTitle}
          title={
            ko
              ? '인생을 장(章)으로 나누는 점성 흐름 — 시기마다 무엇이 무대에 오르는지'
              : 'Astrology that divides life into chapters — what comes on stage in each era'
          }
        >
          {ko ? 'ZR L1 챕터 · Zodiacal Releasing' : 'ZR L1 chapters · Zodiacal Releasing'}
        </h2>
        <span className={styles.tiny}>
          {ko ? 'Spirit 진로 · Fortune 체질' : 'Spirit path · Fortune body'}
        </span>
      </div>
      <div className={styles.zrLanes}>
        <ZRLane
          title={ko ? 'Spirit Lot — 진로·외적 사건' : 'Spirit Lot — path & outer events'}
          kindLabel="SPIRIT"
          kindClass={styles.spirit}
          chapters={spirit}
        />
        <ZRLane
          title={ko ? 'Fortune Lot — 몸·물질·체질' : 'Fortune Lot — body, matter & constitution'}
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
  const { locale } = useI18n()
  const ko = locale === 'ko'
  return (
    <div className={styles.zrLane}>
      <div className={styles.laneHead}>
        <span className={styles.laneTitle}>{title}</span>
        <span className={`${styles.laneKind} ${kindClass}`}>{kindLabel}</span>
      </div>
      <div className={styles.zrTrack}>
        {chapters.map((c, i) => {
          const sign = ko ? zodiacKo(c.sign) : c.sign
          return (
            <div
              key={`${kindLabel}-${c.calendarStartYear}-${i}`}
              className={`${styles.zrChapter} ${c.now ? styles.now : ''}`}
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
