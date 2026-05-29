import { getServerLocale } from '@/components/seo/SEO'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default async function NotFound() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  return (
    <ErrorScreen
      variant="dark"
      icon={
        <span aria-hidden="true" style={{ fontSize: 28 }}>
          🔮
        </span>
      }
      title={isKo ? '페이지를 찾을 수 없어요' : 'Page Not Found'}
      message={
        isKo
          ? '찾으시는 페이지가 없거나 이동되었어요.'
          : "The page you're looking for doesn't exist or has been moved."
      }
      secondaryAction={{
        label: isKo ? '홈으로' : 'Return Home',
        href: '/',
      }}
    />
  )
}
