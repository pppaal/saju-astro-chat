import type { Metadata } from 'next'
import MainPageClient from './MainPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'
import { JsonLd } from '@/components/seo/JsonLd'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = generateMetadata({
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
    'ai saju',
    'ai tarot',
    'horoscope today',
    'fortune calendar',
    'compatibility test',
  ],
  canonicalUrl: baseUrl,
})

export default async function MainPage() {
  const { locale, messages } = await getServerI18n()
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'DestinyPal — AI 사주·점성·타로·궁합·캘린더',
    description:
      'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 제공합니다.',
    url: baseUrl,
  })
  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: [
      {
        question: 'DestinyPal은 무엇인가요?',
        answer:
          'DestinyPal은 AI가 사주와 서양 점성을 함께 분석하는 운세 플랫폼입니다. 운명 상담, 운세 캘린더, 타로, 궁합, 프리미엄 리포트 — 5가지 도구로 결정의 순간에 흐름과 타이밍을 알려드립니다.',
      },
      {
        question: 'DestinyPal에서 무엇을 할 수 있나요?',
        answer:
          'AI 운명 상담사와 대화하고, 매일의 운세 캘린더를 보고, 타로 카드를 뽑고, 사주 기반 궁합을 보고, 깊이 있는 AI 프리미엄 리포트를 받아볼 수 있습니다.',
      },
      {
        question: '사주만 보나요? 점성술도 같이 보나요?',
        answer:
          '네, DestinyPal은 한국 사주와 서양 점성을 융합 분석합니다. 두 시스템을 교차 검증해 더 정확한 흐름과 타이밍을 알려드립니다.',
      },
      {
        question: '무료로 사용할 수 있나요?',
        answer:
          '회원가입 시 무료 크레딧을 드리며, 기본 운세·타로·궁합은 무료로 시작할 수 있습니다. 더 깊이 있는 AI 프리미엄 리포트는 유료입니다.',
      },
      {
        question: '한국어 사주 풀이도 정확한가요?',
        answer:
          '네, DestinyPal은 정통 한국 사주 명리(천간·지지·오행·십성·격국·용신)를 기반으로 분석합니다. 여기에 점성술 트랜짓과 어스펙트를 함께 보여 다층적 해석을 제공합니다.',
      },
    ],
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      <MainPageClient initialLocale={locale} initialMessages={messages} />
    </>
  )
}
