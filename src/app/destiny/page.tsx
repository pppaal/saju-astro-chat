/* ============================================================
   /destiny — 인생 흐름 (인생 전체)
   ───────────────────────────────────────────────────────────
   v9.2 종이 문서(LifeFlow). 세션·본명 가드는 loadLifetimeData 로 캘린더와 규약을 공유하되,
   빌드는 연 cells 없는 경량 경로다. 뷰모델(buildLifetimeViewModel)은 서버에서 만든다 —
   astroDetail 이 천체력 캐시를 끌고 오므로 클라이언트 번들에 넣지 않는다. 올해(세운)
   부터는 캘린더가 담당 — 지금 대운 행의 '하루 단위로 보기'가 /calendar 로 건너간다.
   ============================================================ */

import type { Metadata } from 'next'
import BirthRequiredFallback from '../calendar/birth-required'
import BirthGate from '@/components/birth/BirthGate'
import {
  BIRTH_QUERY_KEYS,
  hasBirthQuery,
  loadLifetimeData,
  parseBirthOverride,
} from '../calendar/loadTierData'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { buildLifetimeViewModel } from '@/lib/calendar-view/lifetimeViewModel'
import { formatBirthStamp } from '@/lib/birth/format'
import { shareDomain } from '@/lib/share/site'
import { KO_TO_SAJU_ELEMENT } from '@/lib/saju/elementBridge'
import { getStemElement } from '@/lib/saju/stemBranchUtils'
import LifeFlow from './LifeFlow'
import { LIFE_COPY } from './lifeCopy'
import { splitRiver } from './sections/LifeHero'

// 서버 컴포넌트 — 세션/쿼리 기반이라 force-dynamic.
export const dynamic = 'force-dynamic'

type SP = Record<string, string | string[] | undefined>

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

/**
 * 로캘별 검색 메타 — 'Life Flow | DestinyPal' / '인생 흐름 | DestinyPal'(QA R-CA-9 · triage A4).
 * 출생 쿼리(?date=…) 보기는 다른 사람의 개인 결과일 수 있어 noindex, canonical 은 맨 경로.
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
        title: LIFE_COPY.metaTitle.en,
        description: LIFE_COPY.metaDescription.en,
        keywords: ['life flow', 'saju 10-year cycle', 'daeun', 'birth chart', 'DestinyPal'],
      },
      ko: {
        title: LIFE_COPY.metaTitle.ko,
        description: LIFE_COPY.metaDescription.ko,
        keywords: ['인생 흐름', '대운', '사주', '출생 차트', 'DestinyPal'],
      },
      canonicalUrl: `${baseUrl}/destiny`,
    },
    locale
  )
  return hasBirthQuery(sp) ? { ...meta, robots: { index: false, follow: false } } : meta
}

/** 캘린더로 넘길 출생 쿼리 — override(?date=…)로 연 사람은 같은 사람으로 캘린더를 연다. */

function calendarHrefFor(sp: SP, override: boolean): string {
  if (!override) return '/calendar'
  const q = new URLSearchParams()
  for (const k of BIRTH_QUERY_KEYS) {
    const v = sp[k]
    const one = Array.isArray(v) ? v[0] : v
    if (one) q.set(k, one)
  }
  const qs = q.toString()
  return qs ? `/calendar?${qs}` : '/calendar'
}

export default async function DestinyLifePage({ searchParams }: { searchParams: Promise<SP> }) {
  // ?date=&time=&lat=&lng=&tz=&gender= 가 있으면 로그인 없이 그 사람 기준으로.
  const sp = await searchParams
  const override = parseBirthOverride(sp)
  const data = await loadLifetimeData(override)
  if (data.kind === 'no-birth') return <BirthRequiredFallback reason="no-birth" />
  if (data.kind === 'rate-limited')
    return <BirthRequiredFallback reason="rate-limited" locale={data.lang} />
  if (data.kind === 'guest') return <BirthGate base="/destiny" locale={data.lang} />

  const { lang, user, lifetime, todayIso, birthStamp } = data
  const vm = buildLifetimeViewModel(
    { lifetime, user },
    { lang, todayIso, calendarHref: calendarHrefFor(sp, override != null) }
  )
  const stem = user.ilgan.hanja || data.topbar.ilganHanja
  const dayMaster = {
    stem,
    element: KO_TO_SAJU_ELEMENT[getStemElement(stem)] ?? ('water' as const),
  }
  return (
    <LifeFlow
      vm={vm}
      locale={lang}
      dayMaster={dayMaster}
      chipStamp={formatBirthStamp(birthStamp, lang, { time: false })}
      folioStamp={formatBirthStamp(birthStamp, lang)}
      folioRight={shareDomain()}
      river={splitRiver(user.iljuArchetype?.[lang]?.character)}
    />
  )
}
