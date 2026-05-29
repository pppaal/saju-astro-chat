'use client'

import React from 'react'
import { computeInsights, type Insight } from './personaCompute'

/**
 * 차트 모달 Level 1 — 핵심 3 줄.
 *
 * PersonaCard (한 줄) 다음 — 그 한 줄을 뒷받침하는 3 가지 핵심 신호.
 * 각 줄은 emoji + title + 근거 한 줄. 비전공자가 차트 깊이로 들어가기 전
 * 머릿속에 "이 사람 = X, Y, Z" 가 박힘.
 */
interface InsightStripProps {
  saju?: unknown
  insights?: Insight[]
  className?: string
}

export function InsightStrip({ saju, insights, className }: InsightStripProps) {
  const list = insights ?? computeInsights(saju as Parameters<typeof computeInsights>[0])

  if (list.length === 0) return null

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div
        className="px-1 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--ds-gold-on-dark)' }}
      >
        핵심 신호
      </div>
      <ul className="space-y-1.5">
        {list.map((insight, idx) => (
          <li
            key={idx}
            className="rounded-lg px-3 py-2"
            style={{
              background: 'var(--ds-dark-surface)',
              border: '1px solid var(--ds-dark-border)',
            }}
          >
            <div
              className="flex items-start gap-2 text-sm"
              style={{ color: 'var(--ds-dark-text)' }}
            >
              <span aria-hidden="true">{insight.emoji}</span>
              <span className="flex-1 leading-snug">{insight.title}</span>
            </div>
            {insight.evidence && (
              <div
                className="mt-1 pl-7 text-[11px]"
                style={{ color: 'var(--ds-dark-text-muted)' }}
              >
                {insight.evidence}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
