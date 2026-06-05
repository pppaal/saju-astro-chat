'use client'

import { getProviders } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import GoogleLoginPanel from './GoogleLoginPanel'

interface LoginRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  // 로그인 후 돌아올 경로. 없으면 현재 경로로 복귀.
  callbackUrl?: string
}

/**
 * 유료 서비스(궁합·운명·타로)를 비로그인 상태로 사용하려 할 때 뜨는 로그인
 * 모달. 화면 전체를 블러 처리하고(backdrop-blur) 가운데에 흰 카드 + Google
 * 로그인 패널을 띄운다. 닫기(X)로 액션을 취소할 수 있다(브라우징은 계속 가능).
 */
export default function LoginRequiredModal({
  isOpen,
  onClose,
  callbackUrl,
}: LoginRequiredModalProps) {
  const pathname = usePathname() ?? '/'
  const { locale } = useI18n()
  const normalizedLocale: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  const isKo = normalizedLocale === 'ko'

  const [providersReady, setProvidersReady] = useState(false)

  // 모달이 떠 있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    if (!isOpen) {return}
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // ESC 로 닫기.
  useEffect(() => {
    if (!isOpen) {return}
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose()}
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {return}
    void getProviders().then((p) => setProvidersReady(Boolean(p?.google)))
  }, [isOpen])

  if (!isOpen) {return null}

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '로그인 필요' : 'Sign in required'}
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center px-4 backdrop-blur-md"
      style={{ zIndex: 'var(--z-modal-backdrop)', backgroundColor: 'rgba(7, 9, 26, 0.55)' }}
    >
      {/* 카드 내부 클릭이 backdrop(onClose)로 버블링되지 않도록 차단 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600"
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {/* 상단 로그인 아이콘 배지 */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
          <svg
            viewBox="0 0 24 24"
            width={26}
            height={26}
            fill="none"
            stroke="#6d28d9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>

        {/* 서비스 카피 — 그라데이션 부제 */}
        <p className="text-center text-sm font-bold">
          <span className="text-violet-600">{isKo ? '사주' : 'Saju'}</span>
          <span className="text-slate-300"> · </span>
          <span className="text-indigo-500">{isKo ? '점성술' : 'Astrology'}</span>
          <span className="text-slate-300"> · </span>
          <span className="text-pink-500">{isKo ? '타로' : 'Tarot'}</span>
        </p>

        <h2 className="mt-2 text-center text-2xl font-extrabold text-slate-900">
          {isKo ? (
            <>
              지금 로그인하면 <span className="text-amber-500">무료!</span>
            </>
          ) : (
            <>
              Sign in — it&apos;s <span className="text-amber-500">FREE!</span>
            </>
          )}
        </h2>

        <p className="mt-2 text-center text-[13px] text-slate-500">
          {isKo
            ? '사주 · 점성술 · 타로, 로그인 후 바로 이용할 수 있어요.'
            : 'Sign in to use Saju, Astrology, and Tarot right away.'}
        </p>

        {/* Google 로그인 + 약관 동의 (기존 패널 재사용, 흰 배경용 light variant) */}
        <div className="mt-5">
          <GoogleLoginPanel
            locale={normalizedLocale}
            callbackUrl={callbackUrl || pathname}
            providersReady={providersReady}
            variant="light"
          />
        </div>
      </div>
    </div>
  )
}
