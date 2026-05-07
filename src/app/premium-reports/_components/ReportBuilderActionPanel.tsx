'use client'

import type { ReactNode } from 'react'
import { ReportProfileForm, type ReportProfileInput } from '@/app/premium-reports/_components'

type Accent = 'violet' | 'cyan' | 'amber' | 'emerald'

type ReportBuilderActionPanelProps = {
  accent?: Accent
  initialName?: string
  onProfileSubmit: (profile: ReportProfileInput) => void
  actionLabel: string
  onAction: () => void
  disabled?: boolean
  error?: string | null
  helperText?: string
  children?: ReactNode
  /**
   * When true, the birth-info form is hidden and only the action button
   * is shown — used when the page already has birth info from the home
   * modal / user profile / URL params and the form would just nag the
   * user. Defaults to false to preserve guest-flow behavior.
   */
  hasProfile?: boolean
  /** Optional summary line rendered in place of the form when hasProfile. */
  profileSummary?: string
}

const BUTTON_CLASSES: Record<Accent, string> = {
  violet: 'from-violet-500 to-fuchsia-500',
  cyan: 'from-cyan-500 to-sky-500',
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500',
}

export default function ReportBuilderActionPanel({
  accent = 'violet',
  initialName,
  onProfileSubmit,
  actionLabel,
  onAction,
  disabled = false,
  error,
  helperText,
  children,
  hasProfile = false,
  profileSummary,
}: ReportBuilderActionPanelProps) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,14,24,0.82),rgba(4,8,15,0.78))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      {children}

      {hasProfile ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-white font-medium">출생 정보 사용 중</p>
            {profileSummary ? (
              <p className="text-xs text-slate-400 mt-1 font-mono">{profileSummary}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">홈에서 입력한 정보로 자동 적용됩니다.</p>
            )}
          </div>
          <a
            href="/?openBirth=1"
            className="text-xs text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline"
          >
            수정
          </a>
        </div>
      ) : (
        <ReportProfileForm locale="ko" initialName={initialName} onSubmit={onProfileSubmit} />
      )}

      {error ? (
        <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button
        onClick={onAction}
        disabled={disabled}
        className={`min-h-12 w-full rounded-2xl px-4 py-4 text-sm font-semibold text-white transition ${
          disabled
            ? 'cursor-not-allowed bg-slate-700 text-slate-300'
            : `bg-gradient-to-r ${BUTTON_CLASSES[accent]} shadow-[0_16px_40px_rgba(0,0,0,0.24)] hover:brightness-110`
        }`}
      >
        {actionLabel}
      </button>

      {helperText ? <p className="text-center text-xs text-slate-400">{helperText}</p> : null}
    </section>
  )
}
