'use client'

import * as React from 'react'
import { logger } from '@/lib/logger'
import {
  REPORT_CATEGORIES,
  reportCategoryLabel,
  type DMCopy,
  type ReportCategory,
} from './destiny-match-i18n'

interface ReportModalProps {
  copy: DMCopy
  open: boolean
  // 신고 대상의 User id (profileId 가 아님 — block API 와 동일하게 userId).
  reportedUserId: string | null
  // 모달 헤더에 표시할 상대 이름.
  reportedName: string
  onClose: () => void
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

// 세 군데(swipe / profile / chat) 진입점에서 공유하는 신고 모달.
// 중복 구현 대신 단일 컴포넌트로 DRY.
export function ReportModal({ copy, open, reportedUserId, reportedName, onClose }: ReportModalProps) {
  const [category, setCategory] = React.useState<ReportCategory>('inappropriate')
  const [description, setDescription] = React.useState('')
  const [state, setState] = React.useState<SubmitState>('idle')
  const [errorText, setErrorText] = React.useState<string | null>(null)

  // 모달이 새로 열릴 때마다 입력값 초기화.
  React.useEffect(() => {
    if (open) {
      setCategory('inappropriate')
      setDescription('')
      setState('idle')
      setErrorText(null)
    }
  }, [open])

  if (!open || !reportedUserId) return null

  const submitting = state === 'submitting'

  const handleSubmit = async () => {
    if (submitting) return
    setState('submitting')
    setErrorText(null)
    try {
      const res = await fetch('/api/destiny-match/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId,
          category,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        // 24시간 중복 신고 등은 400 — 이미 신고됨 메시지로 안내.
        setState('error')
        setErrorText(res.status === 400 ? copy.reportAlready : copy.reportError)
        return
      }
      setState('success')
      // 성공 피드백을 잠깐 보여준 뒤 닫는다.
      window.setTimeout(() => onClose(), 1400)
    } catch (err) {
      logger.warn('[destiny-match] report failed', {
        err: err instanceof Error ? err.message : String(err),
      })
      setState('error')
      setErrorText(copy.reportError)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.reportTitle}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-6 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <h2 className="text-lg font-semibold">{copy.reportTitle}</h2>
        <p className="mt-1 text-sm text-white/70">{copy.reportBody(reportedName)}</p>

        {state === 'success' ? (
          <p role="status" className="mt-6 text-sm font-medium text-emerald-400">
            {copy.reportSuccess}
          </p>
        ) : (
          <>
            <fieldset className="mt-5">
              <legend className="text-xs font-medium uppercase tracking-wide text-white/60">
                {copy.reportCategoryLabel}
              </legend>
              <div className="mt-2 space-y-2">
                {REPORT_CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    <input
                      type="radio"
                      name="report-category"
                      value={c}
                      checked={category === c}
                      onChange={() => setCategory(c)}
                      className="h-4 w-4 accent-rose-500"
                    />
                    <span>{reportCategoryLabel(copy, c)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                {copy.reportDescriptionLabel}
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder={copy.reportDescriptionPlaceholder}
                className="mt-1.5 w-full resize-none rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:bg-white/10 focus:outline-none"
              />
            </label>

            {errorText && (
              <p role="alert" className="mt-3 text-sm text-rose-400">
                {errorText}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-full border border-white/25 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
              >
                {copy.reportCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-1 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] hover:bg-rose-600 disabled:opacity-50"
              >
                {submitting ? copy.reportSubmitting : copy.reportSubmit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
