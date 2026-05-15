'use client'

import { Star } from 'lucide-react'
import type { ImportantDate } from './types'

type MatchedPattern = NonNullable<ImportantDate['matchedPatterns']>[number]

interface Props {
  patterns: MatchedPattern[] | undefined
}

/**
 * 매칭 패턴 카드 — calendar-engine v2의 명명된 패턴 표시.
 *
 * 각 패턴마다:
 *  - headline: "오늘은 ... 발동!" (있을 때만)
 *  - name: 패턴 이름 (재물 황금주간 등)
 *  - action: 액션 추천 ("부탁·만남·...")
 *  - description: 근거 (작게)
 *  - strength: 강도 점수
 *
 * patterns가 비어있거나 undefined면 카드 자체 렌더 안 함.
 */
export default function MatchedPatternsCard({ patterns }: Props) {
  if (!patterns || patterns.length === 0) return null

  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-500/5">
      <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 fill-amber-400" />
        오늘 발동 ({patterns.length})
      </h3>
      <div className="space-y-3">
        {patterns.map((p) => (
          <div
            key={p.id}
            className="bg-zinc-950/60 rounded-xl p-3 border border-amber-500/10"
          >
            {/* 헤드라인 (강조) */}
            {p.headline && (
              <div className="text-sm font-bold text-amber-200 mb-1.5 flex items-center gap-1.5">
                <span className="text-amber-400">★</span>
                {p.headline}
              </div>
            )}

            {/* 패턴 이름 + strength */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-bold text-zinc-300">
                {p.name}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">
                강도 {p.strength}
              </div>
            </div>

            {/* 액션 (사용자가 뭘 하면 좋은지) */}
            {p.action && (
              <p className="text-xs text-zinc-300 leading-relaxed mb-1.5">
                {p.action}
              </p>
            )}

            {/* 근거 (작게, 명리 용어) */}
            {p.description && (
              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span className="text-zinc-600">근거:</span>
                {p.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
