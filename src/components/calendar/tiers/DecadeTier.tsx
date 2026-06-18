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
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
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
// SibsinStrip — 10년 세운 십신 흐름 띠. 십신 가족별 색.
// 비겁=쪽빛 / 식상=청록 / 재성=금 / 관성=적 / 인성=보라.
// ----------------------------------------------------------------
// 십신 가족 — *카테고리* 색. 길흉 valence 색(좋음=쪽빛/주의=주황/피함=적/
// 수렴=금)과 겹치지 않는 별도 팔레트로 충돌 방지 (특히 관성을 적색에서 뺌).
const SIBSIN_FAMILY_COLOR: Record<string, string> = {
  비견: '#6c8aa6', // 비겁 — 스틸 블루
  겁재: '#6c8aa6',
  식신: '#4a9d8e', // 식상 — 청록
  상관: '#4a9d8e',
  편재: '#7d9d4a', // 재성 — 올리브 그린 (금색 회피)
  정재: '#7d9d4a',
  편관: '#9d6a8a', // 관성 — 모브 (적색 회피)
  정관: '#9d6a8a',
  편인: '#7a6aa6', // 인성 — 보라
  정인: '#7a6aa6',
}
function SibsinStrip({
  years,
  ko,
  label,
}: {
  years: Array<{ year: number; sibsin?: string; now?: boolean; gz: { hanja: string } }>
  ko: boolean
  label: string
}) {
  return (
    <div className={styles.stripWrap}>
      <div className={styles.stripLabel}>{label}</div>
      <div className={styles.strip}>
        {years.map((y) => (
          <div
            className={`${styles.stripCell} ${y.now ? styles.stripCellNow : ''}`}
            key={y.year}
            title={`${y.year} · ${y.gz.hanja}${y.sibsin ? ` · ${y.sibsin}` : ''}`}
            style={{ background: (y.sibsin && SIBSIN_FAMILY_COLOR[y.sibsin]) || '#9aa0b4' }}
          >
            <span className={styles.stripHan}>{y.gz.hanja[0]}</span>
            <span className={styles.stripYr}>{`'${String(y.year).slice(2)}`}</span>
          </div>
        ))}
      </div>
      <div className={styles.stripLegend}>
        {(
          [
            [ko ? '비겁' : 'Self', '#6c8aa6'],
            [ko ? '식상' : 'Output', '#4a9d8e'],
            [ko ? '재성' : 'Wealth', '#7d9d4a'],
            [ko ? '관성' : 'Officer', '#9d6a8a'],
            [ko ? '인성' : 'Resource', '#7a6aa6'],
          ] as Array<[string, string]>
        ).map(([t, c]) => (
          <span className={styles.stripLegItem} key={t}>
            <span className={styles.stripSw} style={{ background: c }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function DecadeTier({ user, decade, onDive, onRise }: DecadeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
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

  // ── 이 대운의 사주 × 점성 교차 '구간' — 메인. ──
  // 사주 측은 이 대운(예: 甲戌)이라는 10년 프레임이 상수, 점성 측은 이 10년 안에
  // 떨어지는 외행성 회귀·사각·ZR 전환(decade.astro). 그 두 개가 만나는 해가
  // 곧 '교차되는 구간'. 가짜 세운 점수 나열 대신 이것만 메인에 보여준다.
  const dgz = decade.gz.hanja
  const cy = decade.focusYear ?? decade.start
  const astroMarks = decade.astro ?? []
  // 제목엔 변하는 쪽(점성 마디)만. 대운(甲戌)은 heading 에 이미 있어 매 줄 반복은
  // 정보량 0 → 접두사 제거. 사주 측(대운)은 heading 이 담당.
  const decadeSpanItems = [
    {
      // 시작 앵커 — headline 은 바로 위 oneline 에 이미 있어 중복 표기하지 않음.
      when: `${decade.start}`,
      title: ko ? `${dgz} 대운 진입` : `Entering the ${dgz} cycle`,
      now: cy <= decade.start,
      past: false,
    },
    ...astroMarks.map((a) => ({
      when: a.date,
      title: a.label,
      detail: a.body || undefined,
      now: a.date === `${cy}`,
      past: Number(a.date) < cy,
    })),
  ]

  // ── (상세) 10년 세운 결 — 연도별 세운 십신. 교차는 아니라 상세로 내림. ──
  const SIBSIN_YEAR_THEME: Record<string, { ko: string; en: string }> = {
    비견: { ko: '주체·동료의 해', en: 'Self & peers' },
    겁재: { ko: '경쟁·분탈의 해', en: 'Rivalry & loss' },
    식신: { ko: '표현·창작의 해', en: 'Expression & making' },
    상관: { ko: '재능·자유의 해', en: 'Talent & freedom' },
    편재: { ko: '재물·기회의 해', en: 'Wealth & opportunity' },
    정재: { ko: '꾸준한 축적의 해', en: 'Steady building' },
    편관: { ko: '도전·추진의 해', en: 'Challenge & drive' },
    정관: { ko: '책임·자리의 해', en: 'Duty & position' },
    편인: { ko: '독학·사유의 해', en: 'Study & reflection' },
    정인: { ko: '배움·지원의 해', en: 'Learning & support' },
  }
  const decadeItems = decade.years.map((y) => ({
    when: `${y.year}`,
    title:
      (y.sibsin && SIBSIN_YEAR_THEME[y.sibsin]?.[ko ? 'ko' : 'en']) ||
      (ko ? '한 해의 흐름' : 'The year ahead'),
    detail: `${y.gz.hanja}${y.gz.kr ? ` (${y.gz.kr})` : ''}${y.sibsin ? ` · ${ko ? '세운' : 'annual'} ${ko ? y.sibsin : (SIBSIN_EN[y.sibsin] ?? y.sibsin)}` : ''}`,
    now: !!y.now,
    past: y.year < (decade.focusYear ?? decade.start),
  }))

  // ── (상세) 이 대운에 켜진 사주 × 점성 교차 페어 — 톤(길/주의/중립). ──
  const decadeCrossItems = crossActs.map((c) => ({
    when:
      c.polarity > 0
        ? ko
          ? '길'
          : 'good'
        : c.polarity < 0
          ? ko
            ? '주의'
            : 'caution'
          : ko
            ? '중립'
            : 'neutral',
    title: c.name,
    detail: c.meaning,
  }))

  return (
    <div className={styles.tier} data-screen-label={`10년 ${decade.start}-${decade.end}`}>
      <button className={styles.rise} onClick={onRise} type="button">
        ↑ {ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'}
      </button>

      {/* ============================================================
          header — eyebrow / display / oneline
      ============================================================ */}
      <div
        className={styles.eyebrow}
        title={
          ko ? '대운 — 10년 단위로 바뀌는 인생의 큰 흐름' : "Decade — life's big 10-year currents"
        }
      >
        {ko ? '10년 · DECADE · 대운' : '10 YEARS · DECADE'} {decade.start}-{decade.end}
        {decade.ageFrom != null && decade.ageTo != null && (
          <span className={styles.ageRange}>
            · {decade.ageFrom}–{decade.ageTo}
            {ko ? '세' : ' yrs'}
          </span>
        )}
      </div>
      <div className={styles.headerRow}>
        <h1 className={styles.display}>
          {ko ? '지금의 대운, ' : 'Current cycle, '}
          <span className={styles.han}>{decade.gz.hanja}</span>
        </h1>
        {/* Phase 3 보강 #1 — 격국 성패 frame chip (헤더 옆). 격국 status 문구가
            한국어 전용 전문용어라, 영문 모드에선 숨긴다(자세히 보기에서 다룸). */}
        {ko && gyeokgukLine && (
          <span className={styles.frameChip}>
            <span className={styles.frameChipLabel}>격국 frame</span>
            <span className={styles.frameChipValue}>{gyeokgukLine}</span>
          </span>
        )}
      </div>
      <p className={styles.oneline}>
        {ko ? decade.headline : (decade.headlineEn ?? decade.headline)}
      </p>

      {/* 메인 — 이 대운 안에서 사주(대운) × 점성(외행성 마디)이 교차되는 구간만. */}
      <CrossingList
        heading={
          ko
            ? `이 대운의 사주 × 점성 교차 · ${decade.start}–${decade.end}`
            : `Saju × Astrology in this cycle · ${decade.start}–${decade.end}`
        }
        items={decadeSpanItems}
      />

      {decade.years && decade.years.length > 0 && (
        <SibsinStrip years={decade.years} ko={ko} label={ko ? '10년 세운 흐름' : '10-year flow'} />
      )}

      {/* ── 전문가용 상세 — 세운 흐름·교차 페어·사주 기둥 전부 접어 둠 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세히 보기 · 사주·점성 근거' : 'Details · Saju & Astrology'}
        </summary>

        {/* 10년 세운 결 — 연도별 세운 십신 (교차는 아님). */}
        <CrossingList
          heading={
            ko
              ? `10년 세운 흐름 · ${decade.start}–${decade.end}`
              : `Year-by-year · ${decade.start}–${decade.end}`
          }
          items={decadeItems}
        />

        {/* 이 대운에 켜진 사주 × 점성 교차 페어 (톤). */}
        {decadeCrossItems.length > 0 && (
          <CrossingList
            heading={
              ko ? '이 대운에 작동하는 사주 × 점성 교차 페어' : 'Active Saju × Astrology pairs'
            }
            items={decadeCrossItems}
          />
        )}

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
                  <span className={styles.pillarTag}>
                    {ko ? '천간 · 전반 5년' : 'stems · first 5 yrs'}
                  </span>
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
                  <span className={styles.pillarTag}>
                    {ko ? '지지 · 후반 5년' : 'branches · last 5 yrs'}
                  </span>
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
              {ko
                ? `${decade.sibsin} · ${sibsinArea(decade.sibsin)}의 10년`
                : `${decade.sibsin} · ${sibsinArea(decade.sibsin)} decade`}
            </div>
            <p className={styles.themeLine}>
              {decade.theme}
              <span className={styles.muted}> · {decade.themeEn}</span>
            </p>

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
                <b>{decade.sibsin}</b>
              </dd>
              <dt>{ko ? '천간' : 'Stem'}</dt>
              <dd>
                <span className={styles.han}>{decade.pillar.cheongan.hanja}</span>{' '}
                {decade.pillar.cheongan.sibsin}{' '}
                <span className={styles.muted}>· {decade.pillar.cheongan.el}</span>
              </dd>
              <dt>{ko ? '지지' : 'Branch'}</dt>
              <dd>
                <span className={styles.han}>{decade.pillar.jiji.hanja}</span>{' '}
                {decade.pillar.jiji.sibsin}{' '}
                <span className={styles.muted}>· {decade.pillar.jiji.el}</span>
              </dd>
              {sewoonNow && (
                <>
                  <dt>{ko ? `세운 ${focusYearLabel}` : `Annual ${focusYearLabel}`}</dt>
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
              <h2 className={styles.sectionTitle}>
                {ko ? '이 대운의 결' : 'The grain of this cycle'}
              </h2>
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
                    {ko ? '12운성 · UNSEONG' : 'Twelve stages · UNSEONG'}
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

        {/* ============================================================
          years[10] mini-graph — 10년 세운 score chip row
      ============================================================ */}
        {decade.years && decade.years.length > 0 && (
          <section className={styles.block}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{ko ? '10년 흐름' : '10-year flow'}</h2>
              <span className={styles.tiny}>
                {ko
                  ? `연도별 score · ${decade.years.length}년`
                  : `yearly score · ${decade.years.length} yrs`}
              </span>
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
                      {y.now && <span className={styles.yearNowMark}>{ko ? '지금' : 'now'}</span>}
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
                    <div className={styles.crossBadgeName}>{c.name}</div>
                    {(c.sajuLine || c.astroLine) && (
                      <div className={styles.crossBadgeLines}>
                        {c.sajuLine && <span className={styles.crossBadgeSaju}>{c.sajuLine}</span>}
                        {c.sajuLine && c.astroLine && (
                          <span className={styles.crossBadgeArrow}>↔</span>
                        )}
                        {c.astroLine && (
                          <span className={styles.crossBadgeAstro}>{c.astroLine}</span>
                        )}
                      </div>
                    )}
                    {c.meaning && <p className={styles.crossBadgeMeaning}>{c.meaning}</p>}
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
// Phase 3 보강 #2 — 12운성 매트릭스 (본명 일간 × 대운 지지 단순 chip row)
// ============================================================
//
// 본명 4기둥 × 대운 지지 의 12운성 매트릭스는 정통 사주 응용 — adapter
// 가 정보 채워야 정확. 디자인 단계에서는 일간 × 대운 지지 1쌍만 시각적
// 표현 (관대/태/장생 등 일반 명칭은 derive 함수가 제공할 때 enrich).

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

