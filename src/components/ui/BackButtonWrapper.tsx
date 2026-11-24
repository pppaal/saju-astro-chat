'use client'

import { usePathname } from 'next/navigation'
import { shouldShowBackButton } from '@/lib/routing/chromeRoutes'
import BackButton from './BackButton'

// 홈·v9 화면과 자체 뒤로가기/커스텀 헤더를 가진 페이지에서는 전역 뒤로가기를
// 숨긴다. 경로 목록(+ /ko 프리픽스 처리)은 lib/routing/chromeRoutes 에 있다.
export default function BackButtonWrapper() {
  const pathname = usePathname()

  if (!shouldShowBackButton(pathname)) {
    return null
  }
  return <BackButton />
}
