'use client'

import React from 'react'
import { sibsinInfo } from './interpretations'

/**
 * 십성 칩 — 8글자 셀 아래에 색-coded chip 으로 십성 (편재·정인 등) 노출.
 *
 * 색 의미 (interpretations.ts 의 SIBSIN_COLOR 와 동일):
 *  🔵 비겁  🟢 식상  🟡 재성  🔴 관성  🟣 인성
 *
 * 사용자가 chip 색만 봐도 "내 사주에 노란 거(재성) 많네" 직관 파악.
 * tap → 1줄 설명 bubble (long-press 동일 패턴).
 */
interface SibsinChipProps {
  sibsin: string | undefined
  size?: 'xs' | 'sm'
  className?: string
}

export function SibsinChip({ sibsin, size = 'xs', className }: SibsinChipProps) {
  const [open, setOpen] = React.useState(false)
  const info = sibsinInfo(sibsin)

  if (!info || !sibsin) {
    return null
  }

  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <span
      className={`relative inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        // chip tap 은 자체 tooltip toggle 만 — 부모 셀(PillarDrawer trigger)
        // 까지 전파되지 않게 차단.
        e.stopPropagation()
        setOpen((o) => !o)
      }}
    >
      <span
        className={`inline-block whitespace-nowrap rounded-md font-medium ring-1 leading-tight ${info.color.bg} ${info.color.text} ${info.color.ring} ${sizeClass}`}
      >
        {sibsin}
      </span>
      {open && (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[200px] -translate-x-1/2
            rounded-md px-2 py-1.5 text-[11px] font-normal leading-snug"
          style={{
            background: 'rgba(20, 16, 32, 0.95)',
            color: 'rgba(245, 247, 251, 0.92)',
            border: '1px solid rgba(212, 181, 114, 0.4)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
          role="tooltip"
        >
          <span style={{ color: '#e8cc8a', fontWeight: 600 }}>{sibsin}</span>
          <span className="ml-1">·</span>
          <span style={{ opacity: 0.75 }}>{info.color.label}</span>
          <div className="mt-0.5">{info.meaning}</div>
        </span>
      )}
    </span>
  )
}
