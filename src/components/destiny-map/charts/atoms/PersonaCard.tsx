'use client'

import React from 'react'
import { computePersona, type PersonaSummary } from './personaCompute'

/**
 * 차트 모달 Level 0 — 표지 카드.
 *
 * 한 줄로 사용자 정체성 요약 (예: "정인격 · 신약 — 학자형").
 * 비전공자가 모달 열자마자 "내가 어떤 사람인지" 즉시 파악.
 *
 * Level 1+ (raw 데이터) 들어가기 전 큰 framing 제공.
 */
interface PersonaCardProps {
  saju?: unknown
  /** 미리 계산된 persona 가 있으면 사용. 없으면 saju 에서 도출. */
  persona?: PersonaSummary
  className?: string
}

export function PersonaCard({ saju, persona, className }: PersonaCardProps) {
  const computed = persona ?? computePersona(saju as Parameters<typeof computePersona>[0])

  return (
    <div
      className={`relative rounded-2xl p-5 text-center ${className ?? ''}`}
      style={{
        background:
          'linear-gradient(135deg, rgba(212,181,114,0.10) 0%, rgba(212,181,114,0.05) 50%, rgba(212,181,114,0.08) 100%)',
        border: '1px solid var(--ds-gold-line)',
      }}
    >
      <div
        className="mb-1 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--ds-gold-on-dark)' }}
      >
        당신은
      </div>
      <div
        className="text-lg font-semibold"
        style={{
          color: 'var(--ds-dark-text)',
          fontFamily: 'var(--font-cinzel), Georgia, serif',
          letterSpacing: '-0.01em',
        }}
      >
        {computed.label}
      </div>
      <div
        className="mt-2 text-sm leading-relaxed"
        style={{ color: 'var(--ds-dark-text-muted)' }}
      >
        {computed.tagline}
      </div>
      {computed.remedy && (
        <div
          className="mt-3 inline-block rounded-full px-3 py-1 text-xs"
          style={{
            background: 'rgba(212, 181, 114, 0.12)',
            color: 'var(--ds-gold-on-dark)',
            border: '1px solid rgba(212, 181, 114, 0.3)',
          }}
        >
          {computed.remedy}
        </div>
      )}
    </div>
  )
}
