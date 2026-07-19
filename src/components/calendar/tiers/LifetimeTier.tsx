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
import { ShareLifeButton } from '@/components/calendar/ShareLifeButton'
import { ReferralInviteButton } from '@/components/referral/ReferralInviteButton'
import { lifeShareHook } from '@/lib/share/shareHook'
import { lifeTypeStyle } from '@/components/calendar/lifeTypeStyle'

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
  // 연속 밴드(±2, 곡선 유래)와 정수 favor(±2, 폴백) 둘 다 같은 버킷으로.
  if (favor >= 1.2) return base.dwBoon
  if (favor >= 0.35) return base.dwLift
  if (favor <= -1.2) return base.dwTrough
  if (favor <= -0.35) return base.dwDip
  return base.dwNeutral
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function LifetimeTier({ user, lifetime, onDive }: LifetimeTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const {
    lifeStages,
    daewoon,
    milestones,
    zrSpiritChapters,
    zrFortuneChapters,
    lifePattern,
    lifeCurve,
    thisYear,
    decadeCross,
  } = lifetime

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

  // ── 10년 막대·계절 arc 의 Y 굴곡은 *인생 곡선(거시)* 과 같은 출처·같은 기준선으로 ──
  //   예전엔 막대를 *10개 대운 평균* 기준으로 재정규화해 ±2 로 폈다 → 평생 역풍인
  //   사주도 "제일 덜 나쁜" 대운이 금색(풍요)으로 강제됐고, 단계 톤(stageCurveLevel,
  //   평생 평균 기준 z)과 baseline 이 달라 "막대 저점인데 같은 시기 단계 톤 good" 모순도
  //   났다. 이제 단계 톤과 *동일한* (평생 macro 평균/표준편차) z 를 쓴다 — 절대 길흉을
  //   보존(역풍 인생엔 금색 막대 0)하고 막대·단계가 부호로 못 어긋난다. 곡선 없으면 favor 폴백.
  const decadeBandByAge = (() => {
    const m = new Map<number, number>()
    const pts = lifeCurve?.points
    if (!pts || pts.length < 10) return m
    // 곡선(value)의 평생 평균/표준편차 = 단계 톤과 같은 *인생 전체* 기준선.
    const all = pts.map((p) => p.value)
    const lifeMean = all.reduce((s, v) => s + v, 0) / all.length
    const lifeStd = Math.sqrt(all.reduce((s, v) => s + (v - lifeMean) ** 2, 0) / all.length) || 1
    const avgFor = (a0: number): number | null => {
      const seg = pts.filter((p) => p.age >= a0 && p.age < a0 + 10)
      return seg.length ? seg.reduce((s, p) => s + p.value, 0) / seg.length : null
    }
    for (const d of daewoon) {
      const avg = avgFor(d.startAge)
      if (avg == null) continue
      const z = (avg - lifeMean) / lifeStd
      // 평생 z 를 막대 스케일(±2)로. 단계 톤(±0.35)과 부호·문턱이 정렬됨.
      m.set(d.startAge, Math.max(-2, Math.min(2, z * 1.1)))
    }
    return m
  })()
  // 막대/계절이 쓰는 단일 신호 — 곡선 밴드 우선, 없으면 대운 favor.
  const bandForAge = (startAge: number): number =>
    decadeBandByAge.get(startAge) ?? daeunFavorByAge.get(startAge) ?? 0

  // ── 계절 arc — 곡선 밴드(없으면 favor) 평균으로 Y 굴곡. now=stage.now. ──
  const stageFavor = (ageFrom: number, ageTo: number): number => {
    const daeun = lifePattern?.daeun ?? []
    if (daeun.length === 0) return 0
    const inStage = daeun.filter((d) => d.startAge >= ageFrom && d.startAge <= ageTo)
    const pool = inStage.length > 0 ? inStage : daeun
    return pool.reduce((a, d) => a + bandForAge(d.startAge), 0) / pool.length
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
  //   현재 나이 = 만 나이 SSOT — lifetime.nowAge(서버 currentManAge) 우선, 곡선
  //   nowAge, 최후에만 연차 나이 폴백(감사 G4: 에페메리스 실패로 곡선이 없어도
  //   달력 나이(생일 전 +1)로 안 떨어지게 — 대운 하이라이트와 텍스트가 어긋나던 것).
  const nowAge = lifetime.nowAge ?? lifetime.lifeCurve?.nowAge ?? currentYear - birthYear
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

  // ── 인생 굴곡 곡선 SVG geometry (사주 다층 + 외행성 트랜짓 중첩). ──
  const CW = 320
  const CH = 76
  const PAD_X = 8
  const PAD_TOP = 10
  const PAD_BOT = 16
  const curve = (() => {
    const pts = lifeCurve?.points ?? []
    if (pts.length < 2) return null
    const maxAge = pts[pts.length - 1].age || 88
    const x = (age: number) => PAD_X + (age / maxAge) * (CW - 2 * PAD_X)
    const y = (v: number) => PAD_TOP + (1 - v) * (CH - PAD_TOP - PAD_BOT)
    const line = pts
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)} ${y(p.value).toFixed(1)}`)
      .join(' ')
    const area = `${line} L${x(pts[pts.length - 1].age).toFixed(1)} ${CH - PAD_BOT} L${x(pts[0].age).toFixed(1)} ${CH - PAD_BOT} Z`
    const valAt = (age: number) =>
      pts.reduce((b, p) => (Math.abs(p.age - age) < Math.abs(b.age - age) ? p : b), pts[0]).value
    return { pts, maxAge, x, y, line, area, valAt }
  })()

  // ── 공유용 인생 곡선 데이터(숫자·연도 라벨만 — 원국/생년월일은 안 보냄) ──
  const lifeShare = (() => {
    const pts = lifeCurve?.points ?? []
    if (pts.length < 2) return null
    const curveScores = pts.map((p) => Math.round(Math.max(0, Math.min(1, p.value)) * 100))
    const nowAge = lifeCurve?.nowAge ?? -1
    const markerIndex =
      nowAge >= 0
        ? pts.reduce(
            (best, p, i) =>
              Math.abs(p.age - nowAge) < Math.abs(pts[best].age - nowAge) ? i : best,
            0
          )
        : undefined
    // 피크 = value 최댓값 인덱스.
    let peakIndex = 0
    for (let i = 1; i < pts.length; i++) if (pts[i].value > pts[peakIndex].value) peakIndex = i
    // 축 라벨 — 곡선 양 끝과 1/3·2/3 지점의 실제 연도 4개.
    const at = (f: number) => pts[Math.round(f * (pts.length - 1))]?.year
    const axisLabels = [at(0), at(1 / 3), at(2 / 3), at(1)]
      .filter((y): y is number => typeof y === 'number')
      .map((y) => `${y}`)
    // 공유 카드는 더 센 후크(피크/추세 기반). 인앱 결론(patternLine)은 그대로.
    const hook = lifeShareHook({
      slope: lifeCurve?.now?.slope ?? 'plateau',
      nowAge,
      peakAge: pts[peakIndex]?.age ?? -1,
      peakYear: pts[peakIndex]?.year ?? 0,
      seed: birthYear,
      ko,
    })
    return {
      isKo: ko,
      // 인생유형 별명을 카드 주인공 배지로(대기만성형 등) — MBTI 풍 공유 훅.
      typeName: lifePattern ? patternKo : undefined,
      rangeLabel: `${birthYear}–${lifeSpanTo}`,
      headline: hook.headline,
      subline: hook.subline || youAreHere || undefined,
      curve: curveScores,
      axisLabels,
      markerIndex,
      peakIndex,
    }
  })()

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
        {/* 인생유형 결과카드 — 이모지·유형명·태그를 배지처럼(캡처·공유 훅). lifePattern
            결손(드문 케이스)이면 격국 라벨을 히어로로 폴백. */}
        {lifePattern ? (
          <div
            className={styles.typeCard}
            style={{ ['--tAccent']: lifeTypeStyle(lifePattern.key).accent } as CSSProperties}
          >
            <span className={styles.typeEmoji} aria-hidden>
              {lifeTypeStyle(lifePattern.key).emoji}
            </span>
            <span className={styles.typeName}>{patternKo}</span>
            <span className={styles.typeTag}>
              {ko
                ? lifeTypeStyle(lifePattern.key).taglineKo
                : lifeTypeStyle(lifePattern.key).taglineEn}
            </span>
          </div>
        ) : (
          <div className={styles.novToneWord}>{gyeokgukLabel || patternKo}</div>
        )}
        {patternLine && <p className={styles.novLine}>{patternLine}</p>}
        {/* 일주 아키타입 character — novice-grade 평이 프로즈(있으면). */}
        {iljuRich?.character && <p className={styles.novLine}>{iljuRich.character}</p>}
        {/* 지금 여기 → 다음 마디: 월 티어 verdict 카드(.doBox)와 동일 형식(레이아웃 통일) */}
        {youAreHere && (
          <div className={styles.doBox}>
            <span className={styles.doLbl}>{ko ? '지금' : 'Now'}</span>
            <span className={styles.doText}>{youAreHere}</span>
          </div>
        )}
      </header>

      {/* ── B2. 인생 굴곡 곡선 — 사주(대운·세운·충합) + 외행성 트랜짓 중첩 ── */}
      {curve && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '인생 굴곡' : 'The life curve'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>CURVE</span>
          </div>
          <svg
            className={styles.curveSvg}
            viewBox={`0 0 ${CW} ${CH}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={ko ? '인생 굴곡 곡선' : 'Life curve'}
          >
            <line
              className={styles.curveMid}
              x1={PAD_X}
              x2={CW - PAD_X}
              y1={curve.y(0.5)}
              y2={curve.y(0.5)}
            />
            <path className={styles.curveArea} d={curve.area} />
            <path className={styles.curveLine} d={curve.line} />
            {lifeCurve!.troughs.map((t) => (
              <circle
                key={`tr-${t.age}`}
                className={styles.curveTrough}
                cx={curve.x(t.age)}
                cy={curve.y(curve.valAt(t.age))}
                r={3}
              />
            ))}
            {lifeCurve!.peaks.map((p) => (
              <circle
                key={`pk-${p.age}`}
                className={styles.curvePeak}
                cx={curve.x(p.age)}
                cy={curve.y(curve.valAt(p.age))}
                r={3}
              />
            ))}
            {lifeCurve!.nowAge >= 0 && lifeCurve!.nowAge <= curve.maxAge && (
              <line
                className={styles.curveNow}
                x1={curve.x(lifeCurve!.nowAge)}
                x2={curve.x(lifeCurve!.nowAge)}
                y1={PAD_TOP - 4}
                y2={CH - PAD_BOT}
              />
            )}
          </svg>
          <div className={styles.curveAxis}>
            {[0, 20, 40, 60, 80].map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
          {lifeCurve!.now && (
            <div className={styles.curveNowLine}>
              {(() => {
                const n = lifeCurve!.now!
                const head = ko
                  ? n.slope === 'rising'
                    ? '지금은 흐름이 차오르는 중이에요.'
                    : n.slope === 'falling'
                      ? '지금은 흐름이 한 박자 가라앉는 구간이에요.'
                      : '지금은 흐름이 고른 구간이에요.'
                  : n.slope === 'rising'
                    ? 'Right now the flow is on the rise.'
                    : n.slope === 'falling'
                      ? 'Right now the flow eases off a beat.'
                      : 'Right now the flow is even.'
                const tail = n.nextPeak
                  ? ko
                    ? ` 다음 마루는 ${n.nextPeak.age}세(${n.nextPeak.year}년) 무렵.`
                    : ` Next crest around age ${n.nextPeak.age} (${n.nextPeak.year}).`
                  : n.nextTrough
                    ? ko
                      ? ` 다음 저점은 ${n.nextTrough.age}세(${n.nextTrough.year}년) 무렵 — 지나면 다시 올라가요.`
                      : ` Next dip around age ${n.nextTrough.age} (${n.nextTrough.year}) — it climbs again after.`
                    : ''
                return head + tail
              })()}
            </div>
          )}
          <div className={styles.curveCap}>
            {ko
              ? '대운·세운·충합(사주)과 외행성 트랜짓(점성)을 겹쳐 본 평생 흐름 — ● 마루 ● 골, 세로선이 지금.'
              : 'Saju cycles (daeun·year·clash) layered with outer-planet transits — ● peaks ● troughs, the line is now.'}
          </div>
        </section>
      )}

      {lifeShare && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            marginTop: 14,
          }}
        >
          <ShareLifeButton data={lifeShare} />
          {/* 결과 자랑(위)과 별개로 "친구 데려오면 크레딧" 동기 — 로그인 유저만 렌더됨. */}
          <ReferralInviteButton isKo={ko} />
        </div>
      )}

      {/* ── B3. 이 10년의 사주×점성 교차 (대운층 cross-activation) ──
          층마다 자기 티어에서 발화하는 구조의 인생 스케일 — 일 화면 감사 #12 로
          일 화면에선 뺀 배경(decadal) 교차의 원래 집. 경쟁사에 없는 이중 근거. */}
      {decadeCross && decadeCross.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '이 10년의 겹침' : "This decade's overlap"}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>SAJU × ASTRO</span>
          </div>
          <div className={styles.crossList}>
            {decadeCross.map((c, i) => {
              const meaning = ko ? c.meaning : (c.meaningEn ?? c.meaning)
              const saju = ko ? c.saju : (c.sajuEn ?? c.saju)
              const astro = ko ? c.astro : (c.astroEn ?? c.astro)
              const pos = c.polarity > 0
              return (
                <div key={i} className={styles.crossRow}>
                  <span className={styles.crossPair}>
                    {saju} <i>×</i> {astro}
                  </span>
                  <span className={pos ? styles.crossPos : styles.crossNeg}>{pos ? '▲' : '▼'}</span>
                  <p className={styles.crossMeaning}>{meaning}</p>
                </div>
              )
            })}
          </div>
          <p className={styles.crossNote}>
            {ko
              ? '사주 대운과 외행성 트랜짓이 같은 방향을 가리킬 때만 여기 올라와요.'
              : 'These surface only when your saju decade and outer-planet transits point the same way.'}
          </p>
        </section>
      )}

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
          <span className={styles.dwLegDown}>
            <i />
            {ko ? '하락' : 'Dip'}
          </span>
          <span className={styles.dwLegNow}>
            <i />
            {ko ? '지금' : 'Now'}
          </span>
        </div>
        <div className={styles.dwRow}>
          {daewoon.map((d, i) => {
            // 막대 = 인생 곡선과 같은 출처(거시 밴드, ±2). 곡선 없으면 favor 폴백.
            const band = bandForAge(d.startAge)
            const cls = [styles.dwCell, favorClass(band, styles), d.now && styles.dwNow]
              .filter(Boolean)
              .join(' ')
            // 밴드 크기를 셀 바닥 fill 높이로(±2→100%) — 연속값이라 곡선의 굴곡이
            // 막대에도 그대로 보인다. 위(순풍)는 금색, 아래(역풍)는 식은색.
            const fillH = Math.round((Math.min(Math.abs(band), 2) / 2) * 52)
            const fillCls = band > 0.15 ? styles.dwFillUp : band < -0.15 ? styles.dwFillDown : ''
            const sibsin = d.sibsin && d.sibsin !== '—' ? String(d.sibsin) : ''
            const sibsinGloss = sibsin ? (ko ? sibsinArea(sibsin) : sibsinAreaEn(sibsin)) : ''
            // 읽을 수 있는 간지 표기 — KO 는 한글 음(갑술), EN 은 로마자(gapsul).
            // 옛 코드는 EN 에도 한글 음을 노출해 영문 사용자가 외계문자를 봤다(감사 G1).
            const gzRead = ko ? d.gz.kr : d.gz.en
            return (
              <div
                className={cls}
                key={`dw-${d.startAge}-${i}`}
                title={gzRead ? `${gzRead} (${d.gz.hanja})` : d.gz.hanja}
              >
                {fillCls && (
                  <span
                    className={`${styles.dwFill} ${fillCls}`.trim()}
                    style={{ height: `${fillH}%` }}
                    aria-hidden
                  />
                )}
                {d.now && (
                  <span className={styles.dwNowTag}>{ko ? '지금 여기' : 'you are here'}</span>
                )}
                {/* 감사: 평이 영역(생활영역)이 헤드라인 — bare 한자로 시작하지 않음. */}
                {sibsinGloss && <span className={styles.dwGloss}>{sibsinGloss}</span>}
                {/* 기본뷰는 읽을 수 있는 음(KO 갑술 / EN gapsul)만 — raw 한자(甲戌)는
                    hover title 로만 보존(0지식 유저에겐 외계문자 노이즈). */}
                {gzRead && <span className={styles.dwKr}>{gzRead}</span>}
                {/* endAge/end 는 배타적(startAge+10) — 표시는 포함 범위(−1)로 해
                    인접 대운이 경계 나이(예: 26)를 이중 표기하지 않게(감사 G3). */}
                <span className={styles.dwAge}>
                  {d.startAge}–{d.endAge - 1}
                  {ko ? '세' : ''}
                </span>
                <span className={styles.dwYear}>
                  {d.start}–{d.end - 1}
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
            const past = stageNowIndex >= 0 && i < stageNowIndex
            const cls = [
              styles.seasonCard,
              s.now && styles.seasonNow,
              future && styles.seasonFuture,
              past && styles.seasonPast,
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
                {past && <span className={styles.seasonPastTag}>{ko ? '지나온' : 'past'}</span>}
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

      {/* ── H2. 이 흐름에서 올해(세운) → 캘린더 퍼널 ──
          인생(장기) 화면은 한 번 보면 끝이라 리텐션이 없다. 세운 한 줄로
          "이 흐름에서 올해는" 를 짚고 매일 도는 캘린더로 내려보낸다(전환 지표). */}
      {thisYear && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>
              {ko ? '이 흐름에서, 올해' : 'This year, within it'}
            </span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>{currentYear}</span>
          </div>
          <p className={styles.yearLine}>
            {ko ? (
              <>
                올해는 <b title={thisYear.gz}>{thisYear.gzKr || thisYear.gz}</b> 세운 —{' '}
                {thisYear.area ? `‘${thisYear.area}’ ` : ''}결이 한 해를 물들여요.
              </>
            ) : (
              <>
                This year runs on <b title={thisYear.gz}>{thisYear.gzEn || thisYear.gz}</b>
                {thisYear.areaEn ? ` — a year tinted by "${thisYear.areaEn}".` : '.'}
              </>
            )}
          </p>
        </section>
      )}

      {/* ── I. anti-fatalism footer + CTA(zoom-in) ── */}
      <p className={styles.forecast}>
        {ko
          ? '앞날은 정해진 운명이 아니라 지금 기운으로 본 계절 예보 — 길은 당신이 걷습니다.'
          : 'What lies ahead is not fixed fate but a seasonal forecast read from today’s weather — you walk the path.'}
      </p>
      <button className={styles.cta} onClick={onDive} type="button">
        {ko ? `올해를 달·일로 보기 → 운흐름 캘린더 ↓` : `See this year day by day → calendar ↓`}
      </button>
    </div>
  )
}
