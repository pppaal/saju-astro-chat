import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Sign-in error · DestinyPal',
  // 에러 페이지는 검색 노출 대상이 아님.
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AuthErrorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
