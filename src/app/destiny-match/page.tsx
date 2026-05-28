'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { useI18n } from '@/i18n/I18nProvider'
import { pickDMCopy } from '@/components/destiny-match/destiny-match-i18n'
import { SwipeScreen } from '@/components/destiny-match/SwipeScreen'

// /destiny-match — Tinder/Bumble 식 스와이프 화면.
// 백엔드(api, prisma, 궁합 엔진)는 이미 완성. 이 페이지는 UI 만.
//
// 로그인 가드: 비로그인 시 sign-in 으로 callback 으로 돌려보낸다.
// 프로필 가드 / 빈 deck / 매치 modal 은 SwipeScreen 내부에서 처리.
export default function DestinyMatchPage() {
  const router = useRouter()
  const { status } = useSession()
  const { locale } = useI18n()
  const copy = React.useMemo(() => pickDMCopy(locale), [locale])

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(buildSignInUrl('/destiny-match'))
    }
  }, [status, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#0f0a1e] via-[#1a1035] to-[#0d1b2a] px-6 text-white">
        <p className="text-sm text-white/70">{copy.loading}</p>
      </main>
    )
  }

  return <SwipeScreen />
}
