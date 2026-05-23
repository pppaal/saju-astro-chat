'use client'

import React from 'react'
import { Bookmark, RefreshCw, Check, Loader2 } from 'lucide-react'

interface ActionButtonsProps {
  language: string
  isSaved: boolean
  isSaving: boolean
  onSave: () => void
  onReset: () => void
}

export function ActionButtons({
  language,
  isSaved,
  isSaving,
  onSave,
  onReset,
}: ActionButtonsProps) {
  const isKo = language === 'ko'

  const saveLabel = isSaved
    ? isKo
      ? '저장됨'
      : 'Saved'
    : isSaving
      ? isKo
        ? '저장 중...'
        : 'Saving...'
      : isKo
        ? '저장하기'
        : 'Save Reading'

  return (
    <div className="space-y-3">
      <p
        className={`text-center text-xs ${
          isSaved ? 'text-slate-500' : 'text-amber-200/80 font-medium'
        }`}
      >
        {isSaved
          ? isKo
            ? '저장됨 · 내 리딩 보기에서 다시 볼 수 있어요.'
            : 'Saved · find it anytime in your readings.'
          : isKo
            ? '저장해야 「내 리딩 보기」에 남아요. 저장하면 리딩 변화 흐름도 비교할 수 있어요.'
            : 'Save it to keep it in your readings and compare your pattern over time.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button
          onClick={onSave}
          disabled={isSaved || isSaving}
          className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all ${
            isSaved
              ? 'px-6 py-3 text-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 cursor-default'
              : 'px-8 py-3.5 text-base bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-[0_0_28px_rgba(245,158,11,0.45)] hover:shadow-[0_0_40px_rgba(245,158,11,0.65)] hover:scale-[1.03] disabled:opacity-60'
          }`}
        >
          {isSaved ? (
            <Check className="w-4 h-4" />
          ) : isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
          {saveLabel}
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {isKo ? '새로 읽기' : 'New Reading'}
        </button>
      </div>
    </div>
  )
}
