'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

interface ErrorScreenProps {
  /** 'dark' = 다크 cosmic (기본, /tarot · /destiny-map · /blog 등), 'light' = cream stone (/compatibility · /profile 등). */
  variant?: 'dark' | 'light'
  title: string
  message: string
  /** primary CTA (보통 '다시 시도') — 없으면 home 만 노출. */
  primaryAction?: {
    label: string
    onClick: () => void
  }
  /** secondary CTA. 기본은 홈으로 가는 Link. 다른 곳으로 보내고 싶으면 override. */
  secondaryAction?: {
    label: string
    href: string
  }
  /** `error.digest` 등 진단 식별자 — 디버그용 작은 텍스트. */
  diagnosticId?: string | null
  /** 아이콘 오버라이드 (기본: ⚠ glyph). 404 같은 곳에서 🔮 등으로 교체. */
  icon?: ReactNode
}

/**
 * 사이트 전체에서 공유하는 에러/404 화면 — design tokens 기반 통일된 톤.
 * variant 로 다크 cosmic / cream light 두 surface 표현. cinzel serif heading
 * + gold accent + 둥근 ink 버튼 (옛 indigo/purple 톤 제거).
 */
export function ErrorScreen({
  variant = 'dark',
  title,
  message,
  primaryAction,
  secondaryAction = { label: 'Home', href: '/' },
  diagnosticId,
  icon,
}: ErrorScreenProps) {
  const isLight = variant === 'light'

  const containerClass = isLight
    ? 'bg-[#fafaf9] text-[#1c1917]'
    : 'bg-[#07091a] text-[#f5f7fb]'

  const haloClass = isLight
    ? 'bg-[radial-gradient(800px_500px_at_50%_-10%,rgba(160,122,60,0.10),transparent)]'
    : 'bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(212,181,114,0.18),transparent),radial-gradient(700px_500px_at_80%_110%,rgba(212,181,114,0.08),transparent)]'

  const iconRingClass = isLight
    ? 'bg-[rgba(160,122,60,0.10)] ring-1 ring-[rgba(160,122,60,0.28)] text-[#a07a3c]'
    : 'bg-[rgba(212,181,114,0.10)] ring-1 ring-[rgba(212,181,114,0.32)] text-[#d4b572]'

  const messageClass = isLight ? 'text-[#57534e]' : 'text-[rgba(245,247,251,0.62)]'

  const primaryBtnClass = isLight
    ? 'bg-[#1c1917] text-white hover:bg-[#3a3530]'
    : 'bg-[#d4b572] text-[#1c1917] hover:bg-[#e8cc8a]'

  const secondaryBtnClass = isLight
    ? 'border border-[#e7e5e4] bg-white text-[#44403c] hover:bg-[#f5f5f4] hover:text-[#1c1917]'
    : 'border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] text-[rgba(245,247,251,0.85)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'

  const diagnosticClass = isLight ? 'text-[#a8a29e]' : 'text-[rgba(245,247,251,0.35)]'

  const defaultIcon = (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  )

  return (
    <div
      className={`relative min-h-screen flex items-center justify-center px-4 py-12 ${containerClass}`}
    >
      <div className={`absolute inset-0 pointer-events-none ${haloClass}`} aria-hidden="true" />
      <div className="relative text-center max-w-md mx-auto" role="alert">
        <div
          className={`mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full ${iconRingClass}`}
        >
          {icon ?? defaultIcon}
        </div>
        <h1
          className="text-[26px] sm:text-[28px] leading-tight font-semibold mb-3"
          style={{ fontFamily: 'var(--font-cinzel), Georgia, serif', letterSpacing: '0.01em' }}
        >
          {title}
        </h1>
        <p className={`text-[15px] leading-relaxed mb-8 ${messageClass}`}>{message}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`px-6 py-2.5 rounded-full font-medium text-[14px] transition-colors cursor-pointer ${primaryBtnClass}`}
            >
              {primaryAction.label}
            </button>
          )}
          <Link
            href={secondaryAction.href}
            className={`px-6 py-2.5 rounded-full font-medium text-[14px] transition-colors no-underline ${secondaryBtnClass}`}
          >
            {secondaryAction.label}
          </Link>
        </div>
        {diagnosticId && (
          <p className={`mt-6 text-[11px] tracking-wide ${diagnosticClass}`}>
            Error ID: {diagnosticId}
          </p>
        )}
      </div>
    </div>
  )
}
