import type { Metadata } from 'next'
import MainPageClient from './MainPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { JsonLd } from '@/components/seo/JsonLd'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'DestinyPal — AI Saju, Astrology, Tarot, Compatibility & Fortune Calendar',
        description:
          'AI reads your Saju (Korean Four Pillars) and natal astrology together — daily counsel, tarot, compatibility, and a fortune calendar. See the flow and timing when you need to decide.',
        keywords: [
          'DestinyPal',
          'ai saju',
          'saju reading',
          'four pillars of destiny',
          'ai astrology',
          'natal chart reading',
          'ai tarot reading',
          'horoscope today',
          'compatibility test',
          'synastry chart',
          'fortune calendar',
          'ai life counselor',
        ],
      },
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
    },
    locale
  )
}

export default async function MainPage() {
  const { locale, messages } = await getServerI18n()
  const isKo = locale === 'ko'

  // 구조화 데이터(JSON-LD)도 locale 맞춰 노출해야 영어 검색 결과에
  // 영문 스니펫이 잡힌다 — 이전엔 KR-only 라 영어 인덱싱 누락.
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo
      ? 'DestinyPal — AI 사주·점성·타로·궁합·캘린더'
      : 'DestinyPal — AI Saju, Astrology, Tarot, Compatibility & Fortune Calendar',
    description: isKo
      ? 'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 제공합니다.'
      : 'AI reads your Saju (Four Pillars) and natal astrology together — daily counsel, tarot, compatibility, calendar, and reports.',
    url: baseUrl,
  })
  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: isKo
      ? [
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
        ]
      : [
          {
            question: 'What is DestinyPal?',
            answer:
              'DestinyPal is an AI platform that reads your Saju (Korean Four Pillars) alongside Western astrology. Five tools — destiny counselor, fortune calendar, tarot, compatibility, and premium reports — give you flow and timing when a decision is on the table.',
          },
          {
            question: 'What can I do on DestinyPal?',
            answer:
              'Chat with an AI destiny counselor, see your daily fortune calendar, pull tarot cards, run Saju-based compatibility, and get deep AI premium reports.',
          },
          {
            question: 'Is it just Saju, or do you read astrology too?',
            answer:
              'Both. DestinyPal cross-reads Korean Saju with Western astrology so the two systems verify each other — sharper flow and timing than either alone.',
          },
          {
            question: 'Can I use it for free?',
            answer:
              'You get free credits at signup, and basic readings (fortune, tarot, compatibility) are free to start. Deeper AI premium reports are paid.',
          },
          {
            question: 'How accurate is the Saju reading?',
            answer:
              'DestinyPal is built on classical Korean Saju (Heavenly Stems, Earthly Branches, Five Elements, Ten Gods, formats, and Yongsin) and layered with astrological transits and aspects for multi-angle interpretation.',
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
