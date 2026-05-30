'use client'

import React from 'react'
import { meaningOf } from './interpretations'

/**
 * 한자 한 글자에 long-press / hover 시 의미 bubble 띄움.
 * 모바일: long-press (300ms). 데스크탑: hover.
 * children 은 한자 자체 (예: "甲", "亥").
 *
 * 비전공자가 한자 보고 즉시 의미 파악할 수 있게 — 차트 모달의 모든 한자
 * 셀에 wrap. tooltip 텍스트는 interpretations.ts 의 meaningOf() 에서 가져옴.
 */
interface HanjaBubbleProps {
  hanja: string
  children: React.ReactNode
  className?: string
}

export function HanjaBubble({ hanja, children, className }: HanjaBubbleProps) {
  const [open, setOpen] = React.useState(false)
  const meaning = meaningOf(hanja)
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null)

  // 의미 없는 한자는 그냥 글자만 (bubble 없음).
  if (!meaning) {
    return <span className={className}>{children}</span>
  }

  const start = () => {
    longPressTimer.current = setTimeout(() => setOpen(true), 300)
  }
  const cancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  // unmount 시 timer 누수 방지.
  React.useEffect(() => {
    return () => cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span
      className={`relative inline-block ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={start}
      onTouchEnd={() => {
        cancel()
        // 짧은 탭은 그냥 무시, long-press 만 bubble.
      }}
      onTouchCancel={cancel}
      onClick={(e) => {
        // 모바일 long-press 후에는 click event 가 따라옴 — bubble 만 뜨고
        // 부모 셀(PillarDrawer trigger) 까지 전파되지 않도록 차단.
        if (open) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {children}
      {open && (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[240px] -translate-x-1/2
            rounded-md px-2.5 py-1.5 text-[11px] font-normal leading-snug"
          style={{
            background: 'rgba(20, 16, 32, 0.95)',
            color: 'rgba(245, 247, 251, 0.92)',
            border: '1px solid rgba(212, 181, 114, 0.4)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
          role="tooltip"
        >
          <span style={{ color: '#e8cc8a', fontWeight: 600 }}>{hanja}</span>
          <span className="ml-1.5">{meaning}</span>
        </span>
      )}
    </span>
  )
}
