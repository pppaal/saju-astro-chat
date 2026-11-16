import type { Metadata } from 'next'
import MainPageClient from './MainPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { JsonLd } from '@/components/seo/JsonLd'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 영어 우선(북미·인도) 홈 카피 — 사주가 아니라 검색량이 큰 "free birth chart /
// daily horoscope / compatibility" 로 시작하고, 차별점(실제 행성 위치로 계산 →
// 쉬운 영어로 설명)을 한 문장에 담는다. 한국어 카피는 그대로 둔다.
const EN_HOME_TITLE = 'DestinyPal — Free Birth Chart, Daily Horoscope & Compatibility'
const EN_HOME_DESCRIPTION =
  'Your birth chart, daily horoscope and compatibility, computed from real planetary positions, then explained in plain English. Free tools, no login — plus Korean Four Pillars (Saju) and tarot.'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const sp = await searchParams
  // 레퍼럴 링크(?ref=코드)는 카톡/와츠앱 등에서 미리보기 문구가 갈리지 않게
  // 영어 초대 OG 로 통일한다 — 공유 text('Join me on DestinyPal!')와 톤 일치.
  // (카톡은 보낸 text 대신 링크 OG 로 카드를 만들기 때문.) 그 외 진입은 기존 locale 기반.
  const isReferral = typeof sp?.ref === 'string' && sp.ref.length > 0
  const locale = isReferral ? 'en' : await getServerLocale()

  const enKeywords = [
    'free birth chart',
    'daily horoscope',
    'zodiac compatibility',
    'birth chart calculator',
    'DestinyPal',
    'natal chart reading',
    'ai astrology',
    'ai tarot reading',
    'horoscope today',
    'compatibility test',
    'synastry chart',
    'ai saju',
    'saju reading',
    'four pillars of destiny',
    'fortune calendar',
    'ai life counselor',
  ]

  const en = isReferral
    ? {
        title: 'Join me on DestinyPal — Free Birth Chart, Horoscope & Tarot',
        description:
          "I'm on DestinyPal! Get your free birth chart, daily horoscope and compatibility, computed from real planetary positions and explained in plain English. Open the link for your own free reading.",
        keywords: enKeywords,
      }
    : {
        title: EN_HOME_TITLE,
        description: EN_HOME_DESCRIPTION,
        keywords: enKeywords,
      }

  return generateLocalizedMetadata(
    {
      en,
      ko: {
        title: 'DestinyPal — AI 사주·점성·타로·궁합·캘린더',
        description:
          'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 한 곳에서 제공합니다. 결정이 필요한 순간 흐름과 타이밍을 알려드립니다.',
        keywords: [
          'DestinyPal',
          '데스티니팔',
          'AI 사주',
          '사주풀이',
          '오늘의 운세',
          'AI 타로',
          'AI 궁합',
          '운세 캘린더',
          'AI 운명 상담',
        ],
      },
      canonicalUrl: baseUrl,
      // 새 DestinyPal 헥사곤 로고 (1200×630, RGB). 카톡/와츠앱이 옛 og:image
      // URL 의 "이미지 없음" 결과를 며칠~몇 주 캐시하는 회귀를 우회하기 위해
      // 파일명을 og-card-v2 로 변경 — 크롤러 입장에서 완전 새 URL = 새 fetch.
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function MainPage() {
  const { locale, messages } = await getServerI18n()
  const isKo = locale === 'ko'

  // 구조화 데이터(JSON-LD)도 locale 맞춰 노출해야 영어 검색 결과에
  // 영문 스니펫이 잡힌다 — 이전엔 KR-only 라 영어 인덱싱 누락.
  //
  // FAQPage JSON-LD 는 두지 않는다 — 홈 화면에 보이는 FAQ 가 없고, 구조화 데이터는
  // 화면에 실제로 보이는 콘텐츠와 일치해야 한다(불일치는 리치결과 거부·수동 조치 사유).
  // FAQ 스키마는 FAQ 가 실제로 렌더되는 /faq 가 책임진다.
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? 'DestinyPal — AI 사주·점성·타로·궁합·캘린더' : EN_HOME_TITLE,
    description: isKo
      ? 'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 제공합니다.'
      : EN_HOME_DESCRIPTION,
    url: baseUrl,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <MainPageClient initialLocale={locale} initialMessages={messages} />
    </>
  )
}
