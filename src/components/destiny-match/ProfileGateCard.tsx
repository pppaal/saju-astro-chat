'use client'

import * as React from 'react'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import type { DMCopy } from './destiny-match-i18n'

interface ProfileGateCardProps {
  copy: DMCopy
}

// /api/destiny-match/profile GET 가 needsSetup=true 반환할 때 표시되는 카드.
// 실제 프로필 생성 폼은 별도 PR. 여기는 graceful gate + CTA 만.
export function ProfileGateCard({ copy }: ProfileGateCardProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-800/60 p-8 text-center text-white shadow-2xl backdrop-blur">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
        <UserPlus className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-xl font-bold">{copy.profileGateTitle}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{copy.profileGateBody}</p>
      <Link
        href="/destiny-match/profile"
        // 프로필 onboarding 페이지가 아직 없을 수 있음 — link 만 걸어두고
        // 별도 PR 에서 실제 페이지 만든다.
        className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98]"
      >
        {copy.profileGateCta}
      </Link>
    </div>
  )
}
