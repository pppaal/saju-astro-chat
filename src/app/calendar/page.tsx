/* ============================================================
   /calendar — v9.2 운세 달력(실 사용자 본명)
   ───────────────────────────────────────────────────────────
   세션·본명 가드 + NatalContext + cells + tier 어셈블은 loadTierData()
   로 공유한다. 이 라우트는 월간 · 일간 두 탭을 한 종이 문서로 렌더한다 — 인생 전체는
   /destiny 로 분리. 항상 '그 달'만 빌드한다(저비용).

   뷰모델(buildMonthViewModel · buildDayViewModel)은 여기(서버)서 만든다 — 천체력 캐시·
   절기표를 끌고 오므로 클라이언트 번들에 넣지 않는다. 상담사 CTA 는 각 탭 흐름 안에 있고,
   아침 푸시 배너만 푸터 아래에 둔다(오너 결정).
   ============================================================ */

import type { Metadata } from 'next'
import CalendarClient from './CalendarClient'
import BirthRequiredFallback from './birth-required'
import BirthGate from '@/components/birth/BirthGate'
import DailyFortunePushBanner from '@/components/push/DailyFortunePushBanner'
import { hasBirthQuery, loadTierData, parseBirthOverride } from './loadTierData'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { CAL_COPY } from '@/components/calendar/v9/calendarCopy'
import { buildMonthViewModel } from '@/lib/calendar-view/monthViewModel'
import { buildDayViewModel } from '@/lib/calendar-view/dayViewModel'
import { formatBirthStamp } from '@/lib/birth/format'
import { shareDomain } from '@/lib/share/site'
import { KO_TO_SAJU_ELEMENT } from '@/lib/saju/elementBridge'
import { getStemElement } from '@/lib/saju/stemBranchUtils'

// 서버 컴포넌트 — Swiss Ephemeris 비용 서버에서 한 번에 치름.
// 세션/쿼리 기반이므로 force-dynamic 필수 (정적 캐시 금지).
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

/**
 * 로캘별 검색 메타 — 'Fortune Calendar | DestinyPal' / '운세 달력 | DestinyPal'(QA R-CA-9 · triage
 * A4). 출생 쿼리(?date=…) 보기는 다른 사람의 개인 결과일 수 있어 noindex, canonical 은 맨 경로.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>
}): Promise<Metadata> {
  const sp = await searchParams
  const locale = await getServerLocale()
  const meta = generateLocalizedMetadata(
    {
      en: {
        title: CAL_COPY.metaTitle.en,
        description: CAL_COPY.metaDescription.en,
        keywords: ['fortune calendar', 'saju calendar', 'good days', 'astrology', 'DestinyPal'],
      },
      ko: {
        title: CAL_COPY.metaTitle.ko,
        description: CAL_COPY.metaDescription.ko,
        keywords: ['운세 달력', '운세 캘린더', '좋은 날', '사주', 'DestinyPal'],
      },
      canonicalUrl: `${baseUrl}/calendar`,
    },
    locale
  )
  return hasBirthQuery(sp) ? { ...meta, robots: { index: false, follow: false } } : meta
}

export default async function DestinypalPage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const override = parseBirthOverride(await searchParams)
  const data = await loadTierData(override)
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'rate-limited')
    return <BirthRequiredFallback reason="rate-limited" locale={data.lang} />
  if (data.kind === 'guest') return <BirthGate base="/calendar" locale={data.lang} />

  const { topbar, user, month, day, lang, birthStamp } = data
  const monthVm = buildMonthViewModel(month, day, { lang, isMinor: !!day.isMinor })
  const dayVm = buildDayViewModel(day, { lang, sex: user.sex, isToday: true })
  const stem = user.ilgan?.hanja || topbar.ilganHanja
  const element = stem ? KO_TO_SAJU_ELEMENT[getStemElement(stem)] : undefined
  return (
    <>
      <CalendarClient
        locale={lang}
        monthVm={monthVm}
        dayVm={dayVm}
        chipStamp={formatBirthStamp(birthStamp, lang, { time: false })}
        folioStamp={formatBirthStamp(birthStamp, lang)}
        folioRight={shareDomain()}
        dayMaster={stem && element ? { stem, element } : undefined}
        // override 보기(?date=…)는 다른 사람일 수 있다 — 저장된 본명과 같을 때만 차트 질문(QA-8).
        ctaSubject={
          override
            ? {
                birthDate: override.birthDate,
                birthTime: override.birthTime,
                timeUnknown: override.timeUnknown,
                gender: override.gender,
                ...(override.cityUnknown
                  ? {}
                  : { latitude: override.latitude, longitude: override.longitude }),
                timeZone: override.timeZone,
              }
            : undefined
        }
      />
      {/* 매일 아침 오늘의 운세 푸시 옵트인 — VAPID 미설정/미지원이면 스스로 숨음 */}
      <DailyFortunePushBanner locale={lang} />
    </>
  )
}
