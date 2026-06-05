import { redirect } from 'next/navigation'

// 커플 타로 비활성화 — 현재 미사용 기능. 메뉴 링크가 없어 직접 URL 로만
// 도달하던 페이지라, 진입 시 일반 타로로 돌려보낸다. 원본 구현은 git 이력에
// 보존되어 있으니 재활성화 시 복원하면 된다. (couple-reading API 도 함께 404.)
export default function CoupleTarotPage() {
  redirect('/tarot')
}
