import V9Root from '@/components/v9/server/V9Root'
import V9Skeleton from '@/components/v9/V9Skeleton'
import { getServerLocale } from '@/components/seo/SEO'

// 홈(v9 paper) 로딩 — 종이 뼈대(내비 · 폴리오 · 제목 · CTA · 카드 자리). 도착 화면과 같은
// 토큰 루트 안에서 그려 배경색이 번쩍이지 않는다.
export default async function Loading() {
  const locale = await getServerLocale()
  return (
    <V9Root>
      <V9Skeleton variant="home" locale={locale} />
    </V9Root>
  )
}
