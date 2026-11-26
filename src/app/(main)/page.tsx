import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import MainPageClient from './MainPageClient'
import { buildHomeDial } from './home/homeDial'
import { detectServerLocale } from '@/i18n/server'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { JsonLd } from '@/components/seo/JsonLd'
import V9Root from '@/components/v9/server/V9Root'
import { recordCounter } from '@/lib/metrics'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// v9 paper — 브라우저 UI(주소창·상태 막대)도 종이 색.
export const viewport: Viewport = { themeColor: '#F3EFE7' }

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
    'DestinyPal',
    'saju reading',
    'saju card',
    'four pillars of destiny',
    'korean astrology',
    'natal chart',
    'saju and astrology',
    'tarot reading',
    'compatibility test',
    'fortune calendar',
    'destiny counselor',
  ]

  // 문구 원칙: 판단(사주·별자리 계산과 교차 검증)은 엔진이 하고, 말은 상담사에서만 AI 가 한다.
  // 'AI 가 사주를 풀어 준다' 류 표현을 쓰지 않는다.
  const en = isReferral
    ? {
        title: 'Join me on DestinyPal — your free Saju Card',
        description:
          "I'm on DestinyPal. It computes your saju and your birth chart from the same birth data and shows where they agree. Open the link for your own free Saju Card.",
        keywords: enKeywords,
      }
    : {
        title: 'DestinyPal — Saju and the stars, computed and cross-checked',
        description:
          'Get your free Saju Card. Our engine computes your saju (Korean four pillars) and your birth chart separately, then shows where they agree and where they pull apart. Life flow, a fortune calendar, tarot and compatibility — and an AI counselor that puts it into words.',
        keywords: enKeywords,
      }

  return generateLocalizedMetadata(
    {
      en,
      ko: {
        title: 'DestinyPal — 사주와 별자리, 계산하고 교차 검증해요',
        description:
          '무료 사주 카드를 받아 보세요. 엔진이 사주와 출생 차트를 따로 계산하고, 둘이 어디서 맞고 어디서 갈리는지 보여 줘요. 인생 흐름 · 운세 달력 · 타로 · 궁합, 그리고 그 결과를 쉬운 말로 풀어 주는 AI 상담사까지.',
        keywords: [
          'DestinyPal',
          '데스티니팔',
          '무료 사주',
          '사주 카드',
          '사주풀이',
          '사주 별자리',
          '운세 캘린더',
          '타로',
          '궁합',
          '운명 상담',
        ],
      },
      canonicalUrl: baseUrl,
      // 카톡/와츠앱이 옛 og:image URL 의 "이미지 없음" 결과를 오래 캐시하는 회귀를
      // 우회하려고 파일명을 og-card-v2 로 바꿔 둔 그대로 쓴다.
      ogImage: '/og-card-v2.png',
    },
    locale
  )
}

export default async function MainPage() {
  const locale = await detectServerLocale()
  const isKo = locale === 'ko'

  // 다이얼 · 카드 뒷면의 '지금' 세운 — 보는 사람 시간대의 오늘(오너 결정 17). 요청 시간대는
  // Vercel 지오 헤더에서 읽고, 없거나 깨졌으면 dialModel 규칙대로 UTC. 페이지는 locale 때문에
  // 이미 요청마다 렌더되므로(headers) 立春 이 지나면 다음 요청부터 새 해가 보인다.
  const requestHeaders = await headers()
  const home = buildHomeDial({
    now: new Date(),
    timeZone: requestHeaders.get('x-vercel-ip-timezone'),
  })

  // 퍼널 — 홈 노출(옛 /free 허브의 funnel.free_hub.viewed 자리).
  recordCounter('funnel.home.viewed', 1)

  // 구조화 데이터(JSON-LD)도 locale 맞춰 노출해야 영어 검색 결과에 영문 스니펫이 잡힌다.
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo
      ? 'DestinyPal — 사주와 별자리, 계산하고 교차 검증해요'
      : 'DestinyPal — Saju and the stars, computed and cross-checked',
    description: isKo
      ? '엔진이 사주와 출생 차트를 따로 계산하고, 둘이 어디서 맞고 갈리는지 보여 주는 무료 사주 카드.'
      : 'A free Saju Card: our engine computes your saju and your birth chart separately and shows where they agree and where they pull apart.',
    url: baseUrl,
  })
  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: isKo
      ? [
          {
            question: 'DestinyPal은 무엇인가요?',
            answer:
              'DestinyPal은 한국 사주와 서양 점성술을 같은 생년월일로 따로 계산하고, 두 체계가 어디서 맞고 어디서 갈리는지 보여 주는 서비스예요. 무료 사주 카드에서 시작해 인생 흐름, 운세 달력, 타로, 궁합, 운명 상담사로 이어져요.',
          },
          {
            question: 'AI가 사주를 풀어 주나요?',
            answer:
              '아니요. 어떤 신호가 중요한지, 사주와 별자리가 서로 맞는지, 타이밍이 언제인지는 결정론적 엔진이 계산해요. 같은 생년월일이면 언제나 같은 결과예요. AI는 운명 상담사에서 그 결과를 쉬운 말로 옮길 때만 써요.',
          },
          {
            question: '사주만 보나요? 점성술도 같이 보나요?',
            answer:
              '둘 다 봐요. 사주(천간·지지·오행·십성·격국·용신)와 출생 차트(Swiss Ephemeris)를 따로 계산하고 특성마다 같음 · 서로 도움 · 두 결 · 무관으로 나눠요. 타이밍 신호는 두 체계가 같은 쪽을 가리킬 때만 보여 드려요.',
          },
          {
            question: '무료로 사용할 수 있나요?',
            answer:
              '사주 카드, 인생 흐름, 운세 달력, 궁합, 사주 × 점성술 리포트는 가입 없이 무료예요. 타로 스프레드와 운명 상담사는 크레딧을 써요 — 한 번 결제하는 크레딧 팩이고 구독은 없어요.',
          },
          {
            question: '출생 시간을 모르면요?',
            answer:
              '시간을 모르면 연·월·일 세 기둥만으로 읽고, 시주나 상승궁 같은 값을 지어내지 않아요.',
          },
        ]
      : [
          {
            question: 'What is DestinyPal?',
            answer:
              'DestinyPal computes your Korean saju (four pillars) and your Western birth chart from the same birth data, separately, and shows where the two systems agree and where they pull apart. Start with a free Saju Card, then go on to life flow, a fortune calendar, tarot, compatibility and the destiny counselor.',
          },
          {
            question: 'Does an AI read my saju?',
            answer:
              'No. Which signals matter, whether saju and astrology agree, and when the timing is — a deterministic engine computes all of it, so the same birth data always gives the same result. AI is used only in the counselor, to put that result into plain words.',
          },
          {
            question: 'Is it just saju, or do you read astrology too?',
            answer:
              'Both. Your saju (stems, branches, five elements, ten gods, structure and useful element) and your birth chart (Swiss Ephemeris) are computed separately, and every trait is sorted as same, supportive, two pulls or unrelated. Timing signals reach you only when both systems agree.',
          },
          {
            question: 'Can I use it for free?',
            answer:
              'The Saju Card, life flow, fortune calendar, compatibility and the saju × astrology report are free with no sign-up. Tarot spreads and the destiny counselor use credits — one-time credit packs, no subscription.',
          },
          {
            question: "What if I don't know my birth time?",
            answer:
              'Without a birth time we read the year, month and day pillars only and never invent an hour pillar or a rising sign.',
          },
        ],
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      <V9Root>
        <MainPageClient initialLocale={locale} dial={home.dial} backYear={home.backYear} />
      </V9Root>
    </>
  )
}
