import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { prisma } from '@/lib/db/prisma'
import { generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 공유 결과 페이지 — 사용자가 만든 1회성 콘텐츠라 search index 대상은 아니지만
// 카카오/슬랙/iMessage 등 링크 preview를 위해 OG title/description은 동적으로 설정.
// 실제 결과 데이터(title/type)가 있으면 우선 사용, 없으면 일반 fallback.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const locale = await getServerLocale()
  const { id } = await params

  let resultTitle: string | null = null
  let resultType: string | null = null

  try {
    const shared = await prisma.sharedResult.findUnique({
      where: { id },
      select: { title: true, resultType: true, expiresAt: true },
    })
    if (shared && (!shared.expiresAt || shared.expiresAt > new Date())) {
      resultTitle = shared.title
      resultType = shared.resultType
    }
  } catch {
    // DB 접근 실패 시 fallback metadata 만 반환 — preview는 못 띄워도 빌드/렌더는 살림
  }

  const enTypeLabel: Record<string, string> = {
    saju: 'Saju Analysis',
    tarot: 'Tarot Reading',
    astrology: 'Astrology Reading',
    compatibility: 'Compatibility Analysis',
    personality: 'Personality Analysis',
    persona: 'Personality Analysis',
    icp: 'ICP Analysis',
  }
  const koTypeLabel: Record<string, string> = {
    saju: '사주 분석',
    tarot: '타로 리딩',
    astrology: '별자리 운세',
    compatibility: '궁합 분석',
    personality: '성격 분석',
    persona: '성격 분석',
    icp: 'ICP 분석',
  }

  const enType = (resultType && enTypeLabel[resultType]) || 'Shared Reading'
  const koType = (resultType && koTypeLabel[resultType]) || '공유된 결과'

  const enTitle = resultTitle
    ? `${resultTitle} — Shared ${enType}`
    : `Shared ${enType} from DestinyPal`
  const koTitle = resultTitle ? `${resultTitle} — 공유된 ${koType}` : `DestinyPal에서 공유된 ${koType}`

  return {
    ...generateLocalizedMetadata(
      {
        en: {
          title: enTitle,
          description: `Someone shared their ${enType.toLowerCase()} from DestinyPal. Open the link to read it, then get your own free AI reading.`,
        },
        ko: {
          title: koTitle,
          description: `DestinyPal에서 누군가가 공유한 ${koType}. 링크를 열어 결과를 보고, 나도 무료 AI 운세를 받아보세요.`,
        },
        canonicalUrl: `${baseUrl}/shared/${id}`,
      },
      locale,
    ),
    // 1회성 공유 콘텐츠는 search index 제외 — 공유 링크가 검색 결과에 노출되는 건
    // 프라이버시 + SEO 양쪽 모두 부적절.
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
  }
}

export default function SharedResultLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
