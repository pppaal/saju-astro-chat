import { redirect } from 'next/navigation'

// 지급은 '크레딧 관리'(/admin/credits) 페이지로 통합됨. 기존 링크/북마크 보존용.
export default function GrantCreditsRedirect() {
  redirect('/admin/credits?tab=grant')
}
