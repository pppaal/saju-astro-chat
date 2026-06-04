import { redirect } from 'next/navigation'

// 커플 타로 상세 비활성화 — 현재 미사용 기능. 원본 구현은 git 이력에 보존.
// 재활성화 시 복원. (couple-reading API 도 함께 404.)
export default function CoupleReadingDetailPage() {
  redirect('/tarot')
}
