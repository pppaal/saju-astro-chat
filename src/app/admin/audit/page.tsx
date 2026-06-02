import AuditClient from './AuditClient'

// 감사로그 — 어드민 액션(크레딧 지급/환불 등) 기록. 인증 가드는 layout.tsx 공통.
export const dynamic = 'force-dynamic'

export default function AdminAuditPage() {
  return <AuditClient />
}
