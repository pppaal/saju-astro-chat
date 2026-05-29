'use client'

import { useState } from 'react'
import { MenuDrawerPanel } from '@/components/ui/MenuDrawerPanel'

interface HamburgerDrawerProps {
  locale: 'en' | 'ko'
  /** 라이트 페이지 위에 떴을 때 ink 톤으로 전환. 기본값 'dark' (다크 cosmic 페이지). */
  variant?: 'light' | 'dark'
}

/**
 * GlobalHeader 의 햄버거 트리거 버튼.
 * 드로어 패널 내용은 MenuDrawerPanel 공유 컴포넌트로 위임 — 메인 페이지의
 * 햄버거와 동일한 메뉴 구조를 유지하기 위함.
 *
 * 햄버거 바 색은 variant 토큰만 본다 — 다른 페이지에서는 로그인 여부와
 * 무관하게 흰색/잉크 색. (메인 페이지의 골드 강조는 메인 페이지 자체 버튼
 * 에서만 노출.)
 */
export function HamburgerDrawer({ locale, variant = 'dark' }: HamburgerDrawerProps) {
  const [open, setOpen] = useState(false)
  const isKo = locale === 'ko'
  const barColorClass = variant === 'light' ? 'bg-[#1c1917]' : 'bg-white'

  return (
    <>
      <button
        type="button"
        data-icon-only="true"
        onClick={() => setOpen(true)}
        aria-label={isKo ? '메뉴 열기' : 'Open menu'}
        className={`inline-flex flex-col items-center justify-center gap-[4px]
          w-9 h-9 rounded-full cursor-pointer transition-colors
          border-0 outline-none bg-transparent p-0 shadow-none ${
            variant === 'light' ? 'hover:bg-stone-100/60' : 'hover:bg-white/10'
          }`}
      >
        <span className={`block w-[14px] h-[2px] rounded ${barColorClass}`} />
        <span className={`block w-[14px] h-[2px] rounded ${barColorClass}`} />
        <span className={`block w-[14px] h-[2px] rounded ${barColorClass}`} />
      </button>

      <MenuDrawerPanel
        open={open}
        onClose={() => setOpen(false)}
        locale={locale}
        variant={variant}
      />
    </>
  )
}
