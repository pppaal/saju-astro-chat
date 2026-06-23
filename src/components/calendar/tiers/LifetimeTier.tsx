'use client'

/* ============================================================
   destinypal · LifetimeTier — 인생 전체(84년) "인생의 모양" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT) — 월(Month) 티어와 한 가족, novice-default:
     · 앱 셸은 다크 — 이 티어는 .lifeRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 기본(접힌 상태)은 한자·격국·용신·강약 같은 전문용어 0 — lifePattern
       타입/한 줄로 시작하는 일상어 결론만 크게.
     · SIGNATURE 는 기본에 유지: 大運 10개 가로 인생 타임라인 — favor 톤 밴드 +
       현재 대운 '지금 여기' 블루 하이라이트. 단 셀의 raw 십신은 sibsinArea
       평이 한 줄로(raw 명은 작은 태그로).
     · 계절 arc · 인생의 큰 마디는 기본 유지(평이).
     · 일간(辛)·격국·용신·강약 칩 / ZR 두 레인 / 본명 점(Lots) 은 전부
       `자세히` 폴드(.expertWrap) 안으로 — 사주를 아는 사람만 펼친다.

   PRESENTATION ONLY — 엔진/derivers/타입/어댑터 미변경. 살아있는 데이터만 사용.
   이 티어는 최상단 — onRise/showRise 없음(줌아웃 버튼 없음).
   ============================================================ */

import type { CSSProperties } from 'react'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import { sibsinArea, sibsinAreaEn, planetPlain } from '@/lib/calendar-engine/derivers/plainLanguage'
import { getZRChapterTheme } from '@/lib/astrology/foundation/zodiacalReleasing'
import {
  getGeokgukRich,
  getSibsinCategory,
  SIBSIN_NAME_TO_CATEGORY,
  type SibsinCategory,
} from '@/lib/chart-dictionary'
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

  // ── 정체성 — 일간 / 인생패턴 (lifePattern 옵셔널 가드). ──
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

  // ── 오행 — dominant(최다). 0 가능 → 빈배열 가드. ──
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

  // ── 계절 arc — daeun favor 평균(없으면 0)으로 Y 굴곡. now=stage.now. ──
  const stageFavor = (ageFrom: number, ageTo: number): number => {
    const daeun = lifePattern?.daeun ?? []
    if (daeun.length === 0) return 0
    const inStage = daeun.filter((d) => d.startAge >= ageFrom && d.startAge <= ageTo)
    const pool = inStage.length > 0 ? inStage : daeun
    return pool.reduce((a, d) => a + d.favor, 0) / pool.length
  }
  const stageNowIndex = lifeStages.findIndex((s) => s.now)

  // ── 인생의 큰 마디 — 연도순.
  //   감사 #2: 제목은 평이 meaning 이 주인공. astro/간지 원명(明王星·甲戌)은
  //   작은 secondary 태그로 강등. novice 제목이 raw 한자/별자리 용어가 되면 안 됨.
  const mLabel = (m: DestinyMilestone) => (ko ? m.label : (m.labelEn ?? m.label))
  // 원명 — label 의 — 앞쪽(甲戌 대운 / 명왕성 사각). 없으면 label 전체.
  const mRawName = (m: DestinyMilestone) => {
    const l = mLabel(m)
    return l.includes('—') ? l.split('—')[0].trim() : l
  }
  // 평이 의미 — meaning 우선, 없으면 label 의 — 뒤쪽 폴백.
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
      const meaning = mMeaning(m)
      const rawName = mRawName(m)
      // 제목 = 평이 의미(있으면). 없으면 원명으로 폴백(최후의 수단).
      const title = meaning || rawName
      // secondary 태그 = 원명. 단 제목으로 이미 쓴 경우(의미 결손) 중복 표기 안 함.
      const tag = meaning && rawName && rawName !== title ? rawName : ''
      return {
        key: `${m.year}-${m.age}`,
        when: ko ? `${m.year} · ${m.age}세` : `${m.year} · age ${m.age}`,
        title,
        tag,
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

  // ── ZR 레인 axis — 같은 나이축. birthYear 기준 calendar*Year. ──
  const zrAllYears = [
    ...(zrSpiritChapters ?? []).map((c) => c.calendarEndYear),
    ...(zrFortuneChapters ?? []).map((c) => c.calendarEndYear),
  ]
  const zrSpanYear = Math.max(lifeSpanTo, ...zrAllYears, currentYear)
  const zrPct = (year: number) =>
    Math.max(0, Math.min(100, ((year - birthYear) / Math.max(1, zrSpanYear - birthYear)) * 100))

  // ── 감사 #3: "지금 여기 → 다음 마디" 한 줄(hero→timeline→milestones 연결). ──
  //   현재 나이 = currentYear - birthYear. 현재 계절명 + 다음 큰 마디 나이/제목.
  const nowAge = currentYear - birthYear
  const nowStage = lifeStages.find((s) => s.now)
  const nowStageName = nowStage ? (ko ? nowStage.name : (nowStage.nameEn ?? nowStage.name)) : ''
  const nextMilestone = [...milestones]
    .sort((a, b) => a.year - b.year)
    .find((m) => m.year > currentYear)
  // 계절명이 없어도(어떤 단계도 now 가 아니면) "지금 N세" + 다음 마디는 항상 보인다
  // — 예전엔 nowStageName 이 비면 이 연결 한 줄이 통째로 사라졌다(감사 H3).
  const youAreHere = (() => {
    if (nowAge <= 0) return ''
    const nextKo = nextMilestone ? ` 다음 큰 마디는 ${nextMilestone.age}세예요.` : ''
    const nextEn = nextMilestone ? ` The next major turn is at age ${nextMilestone.age}.` : ''
    if (nowStageName) {
      return ko
        ? `지금 ${nowAge}세, ‘${nowStageName}’를 살고 있어요.${nextKo}`
        : `You're ${nowAge} now, living your '${nowStageName}'.${nextEn}`
    }
    return ko ? `지금 ${nowAge}세를 지나고 있어요.${nextKo}` : `You're ${nowAge} now.${nextEn}`
  })()

  // ── 감사 #5: 리포트 전용 DB 3종을 정체성 폴드로 끌어옴(가드+폴백). ──
  const lang = ko ? 'ko' : 'en'
  // (a) geokguk-rich — 격국 평이 read (tagline · personality · advice).
  const geokgukRich =
    user.gyeokguk && user.gyeokguk !== '미정' ? getGeokgukRich(user.gyeokguk, lang) : null
  // (b) sibsin-category — 가장 두드러진 십성(dominant) 평이 read (title · meaning · warning).
  const sibsinCategory: SibsinCategory | null =
    user.dominantSibsin?.name && user.dominantSibsin.pct > 0
      ? ((SIBSIN_NAME_TO_CATEGORY[user.dominantSibsin.name] ??
          (user.dominantSibsin.name as SibsinCategory)) as SibsinCategory)
      : null
  const sibsinRich = sibsinCategory ? getSibsinCategory(sibsinCategory, 'dominant', lang) : null
  // (c) ilju-60 — 본명 일주 아키타입(어댑터가 채워줌, 없으면 생략).
  const iljuRich = user.iljuArchetype ? (ko ? user.iljuArchetype.ko : user.iljuArchetype.en) : null

  // ── 인생 풀이 — 정의 신호 합성한 평이한 문장(폴드용). ──
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

      {/* ── novice 기본: 한자·용어 없는 일상어 결론 ── */}
      <header className={styles.novice}>
        <div className={styles.novToneWord}>{ko ? `${patternKo} 타입` : `${patternKo} type`}</div>
        {patternLine && <p className={styles.novLine}>{patternLine}</p>}
        {/* 일주 아키타입 character — novice-grade 평이 프로즈(있으면). */}
        {iljuRich?.character && <p className={styles.novLine}>{iljuRich.character}</p>}
      </header>

      {/* ── 감사 #3: 지금 여기 → 다음 마디 한 줄(hero·timeline·milestones 연결) ── */}
      {youAreHere && <p className={styles.youAreHere}>{youAreHere}</p>}

      {/* ── 자세히 ① 정체성 — 일간·격국·용신·강약 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '왜 이런가요? · 본명 정체성 보기' : 'Why? · natal identity'}
        </summary>

        {/* 감사: 폴드 ① lede */}
        <p className={styles.foldLede}>
          {ko
            ? '쉽게 말하면, 타고난 ‘나의 바탕 기운(일간)’과 그 성격·균형을 사주 용어로 정리한 칸이에요.'
            : 'In plain terms — this panel sums up your innate core energy (day master), its character and balance, in Saju terms.'}
        </p>

        {/* ── 감사 #5: 리치 DB read — "이게 당신이에요" ── */}
        {(geokgukRich || sibsinRich || iljuRich) && (
          <div className={styles.dbWrap}>
            {/* (c) 일주 아키타입 — character 는 위 hero 에, 나머지는 여기에. */}
            {iljuRich && (
              <div className={styles.dbBlock}>
                <div className={styles.dbTitle}>
                  {ko ? '타고난 일주 결' : 'Your day-pillar grain'}
                </div>
                {/* character 는 novice 히어로에 이미 노출 — 폴드에는 나머지 4종만. */}
                <div className={styles.dbPair}>
                  {iljuRich.strength && (
                    <span>
                      <b>{ko ? '강점 ' : 'Strength '}</b>
                      {iljuRich.strength}
                    </span>
                  )}
                  {iljuRich.weakness && (
                    <span>
                      <b>{ko ? '약점 ' : 'Watch '}</b>
                      {iljuRich.weakness}
                    </span>
                  )}
                  {iljuRich.career && (
                    <span>
                      <b>{ko ? '일 ' : 'Work '}</b>
                      {iljuRich.career}
                    </span>
                  )}
                  {iljuRich.love && (
                    <span>
                      <b>{ko ? '사랑 ' : 'Love '}</b>
                      {iljuRich.love}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* (a) 격국 평이 read — tagline · personality · advice. */}
            {geokgukRich && (
              <div className={styles.dbBlock}>
                <div className={styles.dbTitle}>
                  {geokgukRich.tagline || (ko ? '격국 결' : 'Structure')}
                </div>
                {geokgukRich.personality && (
                  <p className={styles.dbBody}>{geokgukRich.personality}</p>
                )}
                {geokgukRich.advice && (
                  <p className={`${styles.dbBody} ${styles.dbCare}`}>{geokgukRich.advice}</p>
                )}
              </div>
            )}

            {/* (b) 십성 dominant 평이 read — title · meaning · warning. */}
            {sibsinRich && (
              <div className={styles.dbBlock}>
                <div className={styles.dbTitle}>
                  {sibsinRich.title || (ko ? '가장 두드러진 기운' : 'Strongest pull')}
                </div>
                {sibsinRich.meaning && <p className={styles.dbBody}>{sibsinRich.meaning}</p>}
                {sibsinRich.warning && (
                  <p className={`${styles.dbBody} ${styles.dbCare}`}>{sibsinRich.warning}</p>
                )}
              </div>
            )}
          </div>
        )}

        <header className={styles.header}>
          <div className={styles.ganzhi}>{ilganHanja}</div>
          <div className={styles.ganzhiRead}>
            {ko ? `${ilganRead} 일간` : `${ilganRead} day master`}
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

        {/* 인생 풀이 + 정의 태그 */}
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
      </details>

      {/* ── C. 大運 10개 가로 인생 타임라인 (SIGNATURE — 기본 유지) ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '대운 10년 흐름' : 'The decade timeline'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>DECADES</span>
        </div>
        {/* 감사 #4: 개념 primer — "10년마다 바뀌는 인생의 날씨". */}
        <p className={styles.conceptNote}>
          {ko
            ? '10년마다 바뀌는 인생의 ‘날씨’ — 색이 진할수록 힘 실리는 시기예요.'
            : "Life's 'weather' shifts every ten years — the deeper the colour, the more wind at your back."}
        </p>
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
            const sibsinGloss = sibsin ? (ko ? sibsinArea(sibsin) : sibsinAreaEn(sibsin)) : ''
            const gzKr = d.gz.kr // 한국어 음(갑술) — secondary 표기.
            return (
              <div
                className={cls}
                key={`dw-${d.startAge}-${i}`}
                title={gzKr ? `${gzKr} (${d.gz.hanja})` : d.gz.hanja}
              >
                {d.now && (
                  <span className={styles.dwNowTag}>{ko ? '지금 여기' : 'you are here'}</span>
                )}
                {/* 감사: 평이 영역(생활영역)이 헤드라인 — bare 한자로 시작하지 않음. */}
                {sibsinGloss && <span className={styles.dwGloss}>{sibsinGloss}</span>}
                {/* 기본뷰는 읽을 수 있는 한글 음(갑술)만 — raw 간지 한자(甲戌)는 hover
                    title 로만 보존(0지식 유저에겐 외계문자 노이즈라 표면에서 뺀다). */}
                {gzKr && <span className={styles.dwKr}>{gzKr}</span>}
                <span className={styles.dwAge}>
                  {d.startAge}–{d.endAge}
                  {ko ? '세' : ''}
                </span>
                <span className={styles.dwYear}>
                  {d.start}–{d.end}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── D. 인생의 계절 (4 stages) — 기본 유지 ── */}
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

      {/* ── E. 인생의 큰 마디 (milestones) — 기본 유지(평이) ── */}
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
                title={t.tag || undefined}
              >
                <span className={styles.turnStar} aria-hidden>
                  ✦
                </span>
                <span className={styles.turnWhen}>{t.when}</span>
                <div className={styles.turnBody}>
                  <div className={styles.turnTitle}>
                    {/* 제목 = 평이 의미만. 간지·astro 원명(甲戌 대운·명왕성 사각)은
                        0지식 유저에겐 노이즈라 표면에서 빼고 hover title 로만 보존. */}
                    {t.title}
                    {t.now && <span className={styles.turnNowPill}>{ko ? '지금' : 'now'}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── F. 한 줄 총평 (verdict) — 평이, 기본 유지 ── */}
      <section className={styles.sec}>
        <div className={styles.secH}>
          <span className={styles.secLbl}>{ko ? '인생의 한 줄' : 'In a line'}</span>
          <span className={styles.secLn} />
          <span className={styles.secLat}>In a line</span>
        </div>
        <p className={styles.verdict}>{verdictText}</p>
      </section>

      {/* ── 자세히 ② 점성 인생 장(ZR) · 본명 점(Lots) (사주·점성을 아는 사람용) ── */}
      {((zrSpiritChapters?.length ?? 0) > 0 ||
        (zrFortuneChapters?.length ?? 0) > 0 ||
        (user.lots && user.lots.length > 0)) && (
        <details className={styles.expertWrap}>
          <summary className={styles.expertSummary}>
            {ko ? '점성 인생 장 · 본명 점 자세히' : 'Astrology chapters · natal Lots'}
          </summary>

          {/* 감사: 폴드 ② lede */}
          <p className={styles.foldLede}>
            {ko
              ? '쉽게 말하면, 점성술이 인생을 여러 ‘장’으로 나눠 본 큰 흐름과, 타고난 행운·인연의 자리를 보여드려요.'
              : 'In plain terms — these are the big "chapters" astrology splits your life into, plus the seats of your innate fortune and bonds.'}
          </p>

          {/* G. ZR 두 레인 (Spirit / Fortune) */}
          {((zrSpiritChapters?.length ?? 0) > 0 || (zrFortuneChapters?.length ?? 0) > 0) && (
            <section className={styles.sec}>
              <div className={styles.secH}>
                <span className={styles.secLbl}>
                  {ko ? '점성 인생 장(章)' : 'Astrology chapters'}
                </span>
                <span className={styles.secLn} />
                <span className={styles.secLat}>ZR · ZODIACAL RELEASING</span>
              </div>
              {[
                {
                  chapters: zrSpiritChapters ?? [],
                  label: ko ? '진로·방향' : 'Spirit · path',
                  cls: styles.zrSpirit,
                },
                {
                  chapters: zrFortuneChapters ?? [],
                  label: ko ? '현실·체질' : 'Fortune · body',
                  cls: styles.zrFortune,
                },
              ].map((lane) =>
                lane.chapters.length > 0 ? (
                  <div className={styles.zrLane} key={lane.label}>
                    <div className={`${styles.zrLaneLabel} ${lane.cls}`}>{lane.label}</div>
                    {(() => {
                      // 지금 챕터의 *평이 테마* 한 줄 — raw 라틴어 별자리 대신 의미를 보인다.
                      const nowChapter = lane.chapters.find((c) => c.now)
                      if (!nowChapter) return null
                      const theme = getZRChapterTheme(nowChapter.sign, ko ? 'ko' : 'en')
                      if (!theme) return null
                      return (
                        <div className={styles.zrNowTheme}>
                          {ko ? `지금은 ${theme}예요.` : `Right now: ${theme}.`}
                        </div>
                      )
                    })()}
                    <div className={styles.zrTrack}>
                      {lane.chapters.map((c, i) => {
                        const left = zrPct(c.calendarStartYear)
                        const width = Math.max(
                          4,
                          zrPct(c.calendarEndYear) - zrPct(c.calendarStartYear)
                        )
                        // KO: 영어 별자리·룰러 금지 → 한글 별자리 + 룰러 일상 별명.
                        const sign = ko ? zodiacKo(c.sign) : c.sign
                        const ruler = ko ? planetPlain(c.ruler, true) : c.ruler
                        return (
                          <div
                            className={`${styles.zrChapter} ${c.now ? styles.zrNow : ''}`.trim()}
                            key={`${lane.label}-${c.calendarStartYear}-${i}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${sign} · ${ruler} · ${c.calendarStartYear}–${c.calendarEndYear}${
                              getZRChapterTheme(c.sign, ko ? 'ko' : 'en')
                                ? ` · ${getZRChapterTheme(c.sign, ko ? 'ko' : 'en')}`
                                : ''
                            }`}
                          >
                            <span className={styles.zrSign}>{sign}</span>
                            <span className={styles.zrMeta}>
                              {ruler} · {c.durationYears}
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

          {/* H. 본명 7대 점(Lots) */}
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
                    <span className={styles.lotName}>
                      {ko ? (lot.korean ?? lot.name) : lot.name}
                    </span>
                    <span className={styles.lotPos}>
                      {ko ? zodiacKo(lot.sign) : lot.sign} {Math.floor(lot.degree)}° · {lot.house}H
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </details>
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
