'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import type { DMCopy } from './destiny-match-i18n'

interface EmptyDeckProps {
  copy: DMCopy
}

// 카드 deck 다 본 상태. /destiny-map 으로 되돌아가는 단순 빈 상태.
export function EmptyDeck({ copy }: EmptyDeckProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/60 p-8 text-center text-white shadow-2xl backdrop-blur">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-xl font-bold">{copy.emptyTitle}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{copy.emptyBody}</p>
      <Link
        href="/destiny-map"
        className="mt-6 inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-sm font-medium text-white/95 transition hover:bg-white/10"
      >
        {copy.emptyBack}
      </Link>
    </div>
  )
}
