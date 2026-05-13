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
      <p className="text-center text-xs text-slate-500">
        {isKo
          ? '저장하면 나중에 리딩 변화 흐름을 비교할 수 있어요.'
          : 'Save this reading to compare your pattern over time.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onSave}
          disabled={isSaved || isSaving}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            isSaved
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 cursor-default'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-100 disabled:opacity-60'
          }`}
        >
          {isSaved ? (
            <Check className="w-4 h-4" />
          ) : isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
          {saveLabel}
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {isKo ? '새로 읽기' : 'New Reading'}
        </button>
      </div>
    </div>
  )
}
