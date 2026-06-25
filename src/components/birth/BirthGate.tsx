'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BirthInfoModal from '@/app/(main)/components/BirthInfoModal'
import {
  getStoredBirthInfo,
  buildReportBirthQuery,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'

/**
 * 로그인 없이 열람 가능한 생일 기반 페이지(통합 리포트·운흐름 캘린더·운명)가
 * 생년월일 입력을 못 받았을 때, 임의 샘플로 풀이를 띄우는 대신 이 게이트를
 * 보여준다 — "왜 임의로 나와, 생년월일을 물어봐야지" 회귀 방지.
 *
 *  1) localStorage 에 저장된 생일이 있으면 → 그 파라미터로 같은 페이지를 다시
 *     열어(자동 리다이렉트) 사용자는 폼을 볼 일이 없다. 서버 컴포넌트는
 *     localStorage 를 못 읽으므로 이 다리를 클라이언트에서 놓아야 한다.
 *  2) 없으면 → 생년월일 입력 폼(BirthInfoModal)을 바로 띄우고, 저장하는 즉시
 *     그 파라미터로 페이지를 연다. 저장본은 localStorage 에 남아 다음부터는
 *     자동 경로(1)를 탄다.
 */
export default function BirthGate({
  base,
  locale,
  title,
  subtitle,
}: {
  base: string
  locale: 'ko' | 'en'
  title?: string
  subtitle?: string
}) {
  const router = useRouter()
  const isKo = locale === 'ko'
  // 'checking' = localStorage 확인·리다이렉트 중, 'form' = 입력 폼 노출.
  const [phase, setPhase] = useState<'checking' | 'form'>('checking')
  const redirected = useRef(false)

  const go = (info: StoredBirthInfo) => {
    if (redirected.current) return
    redirected.current = true
    router.replace(`${base}?${buildReportBirthQuery(info, locale)}`)
  }

  useEffect(() => {
    const info = getStoredBirthInfo()
    if (info?.birthDate) go(info)
    else setPhase('form')
    // 마운트 시 1회만 — go/router 는 안정적이므로 의존성 생략.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'checking') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-sm opacity-70">
        {isKo ? '불러오는 중…' : 'Loading…'}
      </main>
    )
  }

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="max-w-md text-lg font-semibold">
        {title ??
          (isKo
            ? '생년월일을 입력하면 바로 풀이가 나와요'
            : 'Enter your birth info to see your reading')}
      </h1>
      <p className="mt-2 max-w-md text-sm opacity-70">
        {subtitle ??
          (isKo
            ? '로그인 없이도 볼 수 있어요. 태어난 시간을 모르면 ‘시간 모름’을 선택하세요.'
            : 'No login needed. If you don’t know your birth time, check “time unknown”.')}
      </p>
      <BirthInfoModal
        open
        initial={null}
        locale={locale}
        onClose={() => router.push('/')}
        onSaved={go}
        title={isKo ? '생년월일 입력' : 'Enter birth info'}
        submitLabel={isKo ? '입력하고 보기' : 'See my reading'}
      />
    </main>
  )
}
