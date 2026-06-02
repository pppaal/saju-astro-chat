import WebhooksClient from './WebhooksClient'

// 결제·웹훅 오류 모니터. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminWebhooksPage() {
  return <WebhooksClient />
}
