'use client'

import React from 'react'
import { getAstroDignity } from '@/lib/chart-dictionary'

/**
 * Essential Dignity 칩 — 행성이 어느 sign 에 있을 때 전통 점성술 dignity 자동 판정.
 *
 * 5단계 상태:
 *  - Domicile (도미사일/집): 행성이 가장 자연스러운 sign — 강력
 *  - Exaltation (고양): 행성의 best quality 가 끌어올려지는 sign
 *  - Detriment (약화): Domicile 의 반대 sign — 표현 어려움
 *  - Fall (落): Exaltation 의 반대 sign — 가장 약화
 *  - Peregrine (방랑): 어느 dignity 도 없음 → 시각 클러터 줄이려고 표시 X (null)
 *
 * hover/tap → chart-dictionary 의 getAstroDignity() 호출해 상세 의미 tooltip.
 */

type DignityStatus = 'Domicile' | 'Exaltation' | 'Detriment' | 'Fall' | 'Peregrine'

interface DignityBadgeProps {
  planet: string // 'Sun' | 'Moon' | 'Mercury' | ...
  sign: string // 'Aries' | 'Taurus' | ...
  lang?: 'ko' | 'en'
  size?: 'xs' | 'sm'
  className?: string
}

// 전통 + 모던 (외행성: Domicile 만)
const DIGNITY_TABLE: Record<
  string,
  Partial<Record<'Domicile' | 'Exaltation' | 'Detriment' | 'Fall', string[]>>
> = {
  Sun: { Domicile: ['Leo'], Exaltation: ['Aries'], Detriment: ['Aquarius'], Fall: ['Libra'] },
  Moon: { Domicile: ['Cancer'], Exaltation: ['Taurus'], Detriment: ['Capricorn'], Fall: ['Scorpio'] },
  Mercury: {
    Domicile: ['Gemini', 'Virgo'],
    Exaltation: ['Virgo'],
    Detriment: ['Sagittarius', 'Pisces'],
    Fall: ['Pisces'],
  },
  Venus: {
    Domicile: ['Taurus', 'Libra'],
    Exaltation: ['Pisces'],
    Detriment: ['Aries', 'Scorpio'],
    Fall: ['Virgo'],
  },
  Mars: {
    Domicile: ['Aries', 'Scorpio'],
    Exaltation: ['Capricorn'],
    Detriment: ['Taurus', 'Libra'],
    Fall: ['Cancer'],
  },
  Jupiter: {
    Domicile: ['Sagittarius', 'Pisces'],
    Exaltation: ['Cancer'],
    Detriment: ['Gemini', 'Virgo'],
    Fall: ['Capricorn'],
  },
  Saturn: {
    Domicile: ['Capricorn', 'Aquarius'],
    Exaltation: ['Libra'],
    Detriment: ['Cancer', 'Leo'],
    Fall: ['Aries'],
  },
  Uranus: { Domicile: ['Aquarius'] },
  Neptune: { Domicile: ['Pisces'] },
  Pluto: { Domicile: ['Scorpio'] },
}

function dignityOf(planet: string, sign: string): DignityStatus {
  const planetDign = DIGNITY_TABLE[planet]
  if (!planetDign) return 'Peregrine'
  for (const [status, signs] of Object.entries(planetDign)) {
    if (signs?.includes(sign)) {
      return status as 'Domicile' | 'Exaltation' | 'Detriment' | 'Fall'
    }
  }
  return 'Peregrine'
}

const STATUS_STYLE: Record<
  Exclude<DignityStatus, 'Peregrine'>,
  { chip: string; label: { ko: string; en: string } }
> = {
  Domicile: {
    chip: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/30',
    label: { ko: '도미사일', en: 'Dom' },
  },
  Exaltation: {
    chip: 'bg-amber-500/20 text-amber-200 ring-amber-500/30',
    label: { ko: '고양', en: 'Exalt' },
  },
  Detriment: {
    chip: 'bg-slate-500/20 text-slate-200 ring-slate-500/30',
    label: { ko: '약화', en: 'Det' },
  },
  Fall: {
    chip: 'bg-rose-500/20 text-rose-200 ring-rose-500/30',
    label: { ko: '落', en: 'Fall' },
  },
}

export function DignityBadge({
  planet,
  sign,
  lang = 'ko',
  size = 'xs',
  className,
}: DignityBadgeProps) {
  const [open, setOpen] = React.useState(false)
  const status = dignityOf(planet, sign)

  // Peregrine 은 시각 클러터 줄이려고 표시 X
  if (status === 'Peregrine') return null

  const style = STATUS_STYLE[status]
  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  const detail = getAstroDignity(planet, status, lang)

  return (
    <span
      className={`relative inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <span
        className={`inline-block rounded-md font-medium ring-1 leading-tight ${style.chip} ${sizeClass}`}
      >
        {style.label[lang]}
      </span>
      {open && (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[240px] -translate-x-1/2
            rounded-md px-2 py-1.5 text-[11px] font-normal leading-snug"
          style={{
            background: 'rgba(20, 16, 32, 0.95)',
            color: 'rgba(245, 247, 251, 0.92)',
            border: '1px solid rgba(212, 181, 114, 0.4)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
          role="tooltip"
        >
          <span style={{ color: '#e8cc8a', fontWeight: 600 }}>
            {planet} in {sign}
          </span>
          <span className="ml-1">·</span>
          <span style={{ opacity: 0.75 }}>{style.label[lang]}</span>
          {detail?.text && <div className="mt-0.5">{detail.text}</div>}
        </span>
      )}
    </span>
  )
}
