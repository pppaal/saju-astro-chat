'use client'

import { Star } from 'lucide-react'
import type { ImportantDate } from './types'

type MatchedPattern = NonNullable<ImportantDate['matchedPatterns']>[number]

interface Props {
  patterns: MatchedPattern[] | undefined
}

/**
 * 매칭 패턴 카드 — calendar-engine v2의 명명된 패턴 표시.
 * "재물 황금주간", "귀인 강림" 등 신호 조합에서 자동 검출된 패턴.
 *
 * patterns가 비어있거나 undefined면 카드 자체 렌더 안 함.
 */
export default function MatchedPatternsCard({ patterns }: Props) {
  if (!patterns || patterns.length === 0) return null

  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-500/5">
      <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
        <Star className="w-4 h-4" />
        매칭 패턴 ({patterns.length})
      </h3>
      <div className="space-y-2">
        {patterns.map((p) => (
          <div
            key={p.id}
            className="bg-zinc-950/60 rounded-xl p-3 flex items-center justify-between border border-amber-500/10"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-zinc-100">{p.name}</div>
              {p.description && (
                <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{p.description}</div>
              )}
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="text-xs text-emerald-400 font-bold">strength {p.strength}</div>
              {p.themes.length > 0 && (
                <div className="text-[10px] text-amber-400/70">{p.themes.slice(0, 3).join(' · ')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
