'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  size?: 'xs' | 'sm'
  align?: 'left' | 'right'
}

export function InfoTooltip({ text, size = 'sm', align = 'right' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const iconSize = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label="설명 보기"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          // Only auto-close on mouse leave if not opened by click
          if (window.matchMedia('(hover: hover)').matches) setOpen(false)
        }}
        className="inline-flex items-center justify-center text-slate-500 transition hover:text-cyan-300"
      >
        <Info className={iconSize} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-[calc(100%+6px)] z-30 w-[220px] rounded-xl border border-white/15 bg-[rgba(15,20,32,0.96)] px-3 py-2 text-[12px] leading-relaxed text-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ wordBreak: 'keep-all' }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
