'use client'

/* ============================================================
   destinypal · LifetimeTier — 인생 전체(84년) "인생의 모양" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT) — 월(Month) 티어와 한 가족:
     · 앱 셸은 다크 — 이 티어는 .lifeRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 일간(辛)·격국·인생패턴(대기만성형)을 *표면에* 드러낸다(월의 甲午처럼).
     · SIGNATURE: 大運 10개 가로 인생 타임라인 — favor 톤 밴드 + 현재 대운
       '지금 여기' 블루 하이라이트.
     · 계절 arc · 인생의 큰 마디 · 한 줄 총평 · ZR 두 레인 · 본명 점(Lots).

   PRESENTATION ONLY — 엔진/derivers/타입/어댑터 미변경. 살아있는 데이터만 사용.
   이 티어는 최상단 — onRise/showRise 없음(줌아웃 버튼 없음).
   ============================================================ */

import type { CSSProperties } from 'react'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import type {
  DestinyLifetime,
  DestinyUserSummary,
  DestinyMilestone,
  ElementCounts,
} from '@/types/calendar'
import styles from './LifetimeTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'

// ============================================================================
// Props (계약 불변 — byte-for-byte 보존. 최상단 티어 → onRise/showRise 없음)
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
// helpers
// ============================================================================

/** ZR sign English → 한국어. 정본(astrology/signLabels) 재사용. */
function zodiacKo(signEn: string): string {
  return SIGN_KO[signEn] ?? signEn
}

const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const EL_PLAIN: Record<string, { ko: string; en: string }> = {
  목: { ko: '자라남·뻗어나감', en: 'growth & reaching out' },
  화: { ko: '드러냄·열정', en: 'expression & passion' },
  토: { ko: '쌓음·지킴', en: 'building & holding' },
  금: { ko: '다듬음·결단', en: 'refining & resolve' },
  수: { ko: '흐름·헤아림', en: 'flow & depth' },
}

// favor(0/1/2) → 톤 밴드 클래스. 0=중립 / 1=오름(lift) / 2=풍요(boon).
function favorClass(favor: number, base: typeof styles): string {
  if (favor >= 2) return base.dwBoon
  if (favor >= 1) return base.dwLift
  return base.dwNeutral
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function LifetimeTier({ user, lifetime, onDive }: LifetimeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const { lifeStages, daewoon, milestones, zrSpiritChapters, zrFortuneChapters, lifePattern } =
    lifetime

  // lifeStages 빈 배열 가드 (adapter 실패 시 깨짐 방지) — 로딩.
  if (!lifeStages?.length) {
    return (
      <div className={styles.lifeRoot}>
        <div className={styles.eyebrow}>
          <span>{ko ? '인생' : 'Lifetime'} · LIFETIME</span>
          <span aria-hidden />
        </div>
        <header className={styles.header}>
          <div className={styles.title}>
            <span className={styles.titleKo}>
              {ko ? '본명 정보를 불러오는 중…' : 'Loading natal data…'}
            </span>
          </div>
        </header>
      </div>
    )
  }

  const birthYear = lifetime.birthYear
  const currentYear = lifetime.currentYear
  const lifeSpanTo = birthYear + 84

  // ── 정체성 헤더 — 일간 / 인생패턴(표면). ──
  const ilganHanja = user.ilgan.hanja
  const ilganRead = ko ? user.ilgan.kr : (user.ilgan.en ?? user.ilgan.kr)
  const patternKo = lifePattern
    ? ko
      ? lifePattern.ko
      : (lifePattern.en ?? lifePattern.ko)
    : ko
      ? '내 인생 흐름'
      : 'My life flow'
  const patternLine = lifePattern
    ? ko
      ? lifePattern.line
      : (lifePattern.lineEn ?? lifePattern.line)
    : ''
  const gyeokgukLabel = ko ? user.gyeokguk : user.gyeokgukEn || user.gyeokguk
  const yongsinLabel = ko ? user.yongsin.kr : (user.yongsin.en ?? user.yongsin.kr)
  const statusTag = user.gyeokgukStatus || user.rootStatus || ''

  // ── 오행 — dominant(최다). 0 가능 → Math.max(...,1). ──
  const elementsEntries = Object.entries(user.elements || {}) as Array<
    [keyof ElementCounts, number]
  >
  const dominantEl =
    [...elementsEntries].sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? undefined
  const dominantPlain = dominantEl ? EL_PLAIN[dominantEl] : undefined

  // ── 大運 10개 — favor 밴드(lifePattern.daeun, startAge 정렬) + now 하이라이트. ──
  const daeunFavorByAge = new Map<number, number>(
    (lifePattern?.daeun ?? []).map((d) => [d.startAge, d.favor])
  )

  // ── 계절 arc — lifeStages[4] favor 평균(없으면 0)으로 Y 굴곡. now=stage.now. ──
  const stageFavor = (ageFrom: number, ageTo: number): number => {
    const daeun = lifePattern?.daeun ?? []
    if (daeun.length === 0) return 0
    const inStage = daeun.filter((d) => d.startAge >= ageFrom && d.startAge <= ageTo)
    const pool = inStage.length > 0 ? inStage : daeun
    return pool.reduce((a, d) => a + d.favor, 0) / pool.length
  }
  const stageNowIndex = lifeStages.findIndex((s) => s.now)

  // ── 인생의 큰 마디 — 연도순. meaning '' (대운 kind) 가드 → 라벨에서 — 뒤 폴백. ──
  const mLabel = (m: DestinyMilestone) => (ko ? m.label : (m.labelEn ?? m.label))
  const mHead = (m: DestinyMilestone) => {
    const l = mLabel(m)
    return l.includes('—') ? l.split('—')[0].trim() : l
  }
  const mMeaning = (m: DestinyMilestone) => {
    const baked = ko ? m.meaning : (m.meaningEn ?? m.meaning)
    if (baked && baked.trim()) return baked
    const l = mLabel(m)
    return l.includes('—') ? l.split('—').slice(1).join('—').trim() : ''
  }
  const turningItems = [...milestones]
    .sort((a, b) => a.year - b.year)
    .map((m) => {
      const past = m.year < currentYear
      return {
        key: `${m.year}-${m.age}`,
        when: ko ? `${m.year} · ${m.age}세` : `${m.year} · age ${m.age}`,
        title: mHead(m),
        meaning: mMeaning(m),
        now: !!m.now,
        past: past && !m.now,
      }
    })

  // ── 한 줄 총평(verdict) — lifePattern.line + termTag. ──
  const verdictText =
    patternLine ||
    (ko ? '계절을 따라 흐르는 인생의 길이에요.' : 'A path that moves with the seasons.')
  const verdictTags = [
    ko ? lifePattern?.ko : (lifePattern?.en ?? lifePattern?.ko),
    user.gangyak,
    dominantEl ? `${EL_HANJA[dominantEl] ?? dominantEl}${ko ? ' 왕' : ' dominant'}` : '',
  ].filter(Boolean) as string[]

  // ── ZR 레인 axis — C 와 같은 나이축. birthYear 기준 calendar*Year. ──
  const zrAllYears = [
    ...(zrSpiritChapters ?? []).map((c) => c.calendarEndYear),
    ...(zrFortuneChapters ?? []).map((c) => c.calendarEndYear),
  ]
  const zrSpanYear = Math.max(lifeSpanTo, ...zrAllYears, currentYear)
  const zrPct = (year: number) =>
    Math.max(0, Math.min(100, ((year - birthYear) / Math.max(1, zrSpanYear - birthYear)) * 100))

  // ── 인생 풀이 — 정의 신호 합성한 평이한 문장(표면용). ──
  const lifeRead = ko
    ? `타고난 바탕은 ‘${user.ilgan.kr}’의 결이고, 삶에 가장 굵게 흐르는 기운은 ‘${
        dominantPlain?.ko ?? '균형'
      }’이에요. 정해진 운명이 아니라, 이 결을 알고 걸으면 한결 수월해지는 길이에요.`
    : `Your core nature runs as ${user.ilgan.en}, and the thickest energy through the life is ${
        dominantPlain?.en ?? 'balance'
      }. It isn't fixed fate — knowing this grain just makes the walk easier.`

  return (
    <div className={styles.lifeRoot}>
      {/* ── A. eyebrow ── */}
      <div className={styles.eyebrow}>
        <span>
          {ko ? '인생' : 'Lifetime'} · LIFETIME · {birthYear}–{lifeSpanTo}
        </span>
        <span aria-hidden />
      </div>

      {/* ── B. 정체성 헤더 — 일간 + 인생패턴 ── */}
      <header className={styles.header}>
        <div className={styles.ganzhi}>{ilganHanja}</div>
        <div className={styles.ganzhiRead}>
          {ko ? `${ilganRead} 일간` : `${ilganRead} day master`}
        </div>
        <div className={styles.title}>
          {patternKo}
          {patternLine && <span className={styles.titleKo}>{patternLine}</span>}
        </div>
        <div className={styles.counts}>
          <span className={styles.cIlgan}>
            {ko ? '일간' : 'Day'}
            <b>{ilganHanja}</b>
          </span>
          <span>
            {ko ? '격국' : 'Structure'}
            <b className={styles.cText}>{gyeokgukLabel}</b>
          </span>
          <span>
            {ko ? '강약' : 'Strength'}
            <b className={styles.cText}>{user.gangyak}</b>
          </span>
          <span className={styles.cYongsin}>
            {ko ? '용신' : 'Yongsin'}
            <b className={styles.cText}>{yongsinLabel}</b>
          </span>
        </div>
        {statusTag && (
          <div className={styles.headTags}>
            <span className={styles.termTag}>{statusTag}</span>
          </div>
        )}
      </header>

      {/* ── C. 大運 10개 가로 인생 타임라인 (SIGNATURE) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '대운 10년 흐름' : 'The decade timeline'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>大運 · DECADES</span>
        </div>
        <div className={styles.dwLegend}>
          <span className={styles.dwLegBoon}>
            <i />
            {ko ? '풍요' : 'Boon'}
          </span>
          <span className={styles.dwLegLift}>
            <i />
            {ko ? '오름' : 'Lift'}
          </span>
          <span className={styles.dwLegNeutral}>
            <i />
            {ko ? '잔잔' : 'Calm'}
          </span>
          <span className={styles.dwLegNow}>
            <i />
            {ko ? '지금' : 'Now'}
          </span>
        </div>
        <div className={styles.dwRow}>
          {daewoon.map((d, i) => {
            const favor = daeunFavorByAge.get(d.startAge) ?? 0
            const cls = [styles.dwCell, favorClass(favor, styles), d.now && styles.dwNow]
              .filter(Boolean)
              .join(' ')
            const sibsin = d.sibsin && d.sibsin !== '—' ? String(d.sibsin) : ''
            return (
              <div className={cls} key={`dw-${d.startAge}-${i}`}>
                {d.now && (
                  <span className={styles.dwNowTag}>{ko ? '지금 여기' : 'you are here'}</span>
                )}
                <span className={styles.dwGz}>{d.gz.hanja}</span>
                <span className={styles.dwAge}>
                  {d.startAge}–{d.endAge}
                  {ko ? '세' : ''}
                </span>
                <span className={styles.dwYear}>
                  {d.start}–{d.end}
                </span>
                {sibsin && <span className={styles.dwSibsin}>{sibsin}</span>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── D. 인생의 계절 (4 stages) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '인생의 네 계절' : 'Four seasons of life'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>SEASONS</span>
        </div>
        <div className={styles.seasonRow}>
          {lifeStages.map((s, i) => {
            const favor = stageFavor(s.ageFrom, s.ageTo)
            const future = stageNowIndex >= 0 && i > stageNowIndex
            const cls = [
              styles.seasonCard,
              s.now && styles.seasonNow,
              future && styles.seasonFuture,
            ]
              .filter(Boolean)
              .join(' ')
            const interactive = s.now
            return (
              <div
                key={s.id}
                className={cls}
                style={{ '--season-favor': String(favor) } as CSSProperties}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={interactive ? onDive : undefined}
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
                {s.now && <span className={styles.seasonNowTag}>{ko ? '지금' : 'now'}</span>}
                <span className={styles.seasonName}>{ko ? s.name : (s.nameEn ?? s.name)}</span>
                <span className={styles.seasonAge}>
                  {s.ageFrom}–{s.ageTo}
                  {ko ? '세' : ' yrs'}
                </span>
                <span className={styles.seasonTone}>{ko ? s.tone : (s.toneEn ?? s.tone)}</span>
                {s.now && (
                  <span className={styles.seasonHint}>
                    {ko ? '탭하면 올해로 ↘' : 'Tap for this year ↘'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── E. 인생의 큰 마디 (milestones) ── */}
      {turningItems.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '인생의 큰 마디' : 'Life’s major turns'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>TURNS</span>
          </div>
          <ul className={styles.turnList}>
            {turningItems.map((t) => (
              <li
                key={t.key}
                className={`${styles.turnItem} ${t.now ? styles.turnNow : ''} ${
                  t.past ? styles.turnPast : ''
                }`.trim()}
              >
                <span className={styles.turnStar} aria-hidden>
                  ✦
                </span>
                <span className={styles.turnWhen}>{t.when}</span>
                <div className={styles.turnBody}>
                  <div className={styles.turnTitle}>
                    {t.title}
                    {t.now && <span className={styles.turnNowPill}>{ko ? '지금' : 'now'}</span>}
                  </div>
                  {t.meaning && <div className={styles.turnMeaning}>{t.meaning}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── F. 한 줄 총평 (verdict) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '인생의 한 줄' : 'In a line'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>In a line</span>
        </div>
        <p className={styles.verdict}>{verdictText}</p>
        <p className={styles.verdictRead}>{lifeRead}</p>
        {verdictTags.length > 0 && (
          <div className={styles.verdictSub}>
            {verdictTags.map((tag) => (
              <span className={styles.termTag} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── G. ZR 두 레인 (Spirit / Fortune) ── */}
      {((zrSpiritChapters?.length ?? 0) > 0 || (zrFortuneChapters?.length ?? 0) > 0) && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '점성 인생 장(章)' : 'Astrology chapters'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>ZR · ZODIACAL RELEASING</span>
          </div>
          {[
            {
              chapters: zrSpiritChapters ?? [],
              label: ko ? 'Spirit · 진로' : 'Spirit · path',
              cls: styles.zrSpirit,
            },
            {
              chapters: zrFortuneChapters ?? [],
              label: ko ? 'Fortune · 체질' : 'Fortune · body',
              cls: styles.zrFortune,
            },
          ].map((lane) =>
            lane.chapters.length > 0 ? (
              <div className={styles.zrLane} key={lane.label}>
                <div className={`${styles.zrLaneLabel} ${lane.cls}`}>{lane.label}</div>
                <div className={styles.zrTrack}>
                  {lane.chapters.map((c, i) => {
                    const left = zrPct(c.calendarStartYear)
                    const width = Math.max(4, zrPct(c.calendarEndYear) - zrPct(c.calendarStartYear))
                    return (
                      <div
                        className={`${styles.zrChapter} ${c.now ? styles.zrNow : ''}`.trim()}
                        key={`${lane.label}-${c.calendarStartYear}-${i}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${zodiacKo(c.sign)} · ${c.ruler} · ${c.calendarStartYear}–${c.calendarEndYear}`}
                      >
                        <span className={styles.zrSign}>{ko ? zodiacKo(c.sign) : c.sign}</span>
                        <span className={styles.zrMeta}>
                          {c.ruler} · {c.durationYears}
                          {ko ? '년' : 'y'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null
          )}
        </section>
      )}

      {/* ── H. 본명 7대 점(Lots) ── */}
      {user.lots && user.lots.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '본명 7대 점' : 'Seven natal Lots'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>ARABIC LOTS</span>
          </div>
          <div className={styles.lotsGrid}>
            {user.lots.map((lot) => (
              <div className={styles.lotChip} key={lot.name}>
                <span className={styles.lotName}>{ko ? (lot.korean ?? lot.name) : lot.name}</span>
                <span className={styles.lotPos}>
                  {ko ? zodiacKo(lot.sign) : lot.sign} {Math.floor(lot.degree)}° · {lot.house}H
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── I. anti-fatalism footer + CTA(zoom-in) ── */}
      <p className={styles.forecast}>
        {ko
          ? '앞날은 정해진 운명이 아니라 지금 기운으로 본 계절 예보 — 길은 당신이 걷습니다.'
          : 'What lies ahead is not fixed fate but a seasonal forecast read from today’s weather — you walk the path.'}
      </p>
      <button className={styles.cta} onClick={onDive} type="button">
        {ko ? `올해 ${currentYear}으로 줌인 ↓` : `Zoom in to ${currentYear} ↓`}
      </button>
    </div>
  )
}
