'use client'

import React from 'react'
import { Check, Loader2, RefreshCw } from 'lucide-react'

interface ActionButtonsProps {
  language: string
  isSaved: boolean
  isSaving: boolean
  /**
   * 자동 저장으로 통일됐지만 게스트 (로그인 안 된) 사용자가 직접 저장하고
   * 싶을 수 있어 콜백은 prop 으로 유지. 로그인 사용자는 isSaving/isSaved
   * 가 자동 토글되므로 버튼 자체는 노출 X.
   */
  onSave: () => void
  onReset: () => void
}

export function ActionButtons({ language, isSaved, isSaving, onReset }: ActionButtonsProps) {
  const isKo = language === 'ko'

  // 자동 저장 (PR 직후) — 별도 "저장하기" 버튼 없이 상태 인디케이터 + 새로
  // 읽기 버튼만. 운명·궁합 카운슬러가 이미 자동 저장이라 UX 일관성을 위해
  // 타로도 같은 결로 정리.
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300/80" />
            <span>{isKo ? '자동 저장 중…' : 'Auto-saving…'}</span>
          </>
        ) : isSaved ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>
              {isKo
                ? '자동 저장됨 · 「내 리딩 보기」에서 다시 볼 수 있어요'
                : 'Auto-saved · find it anytime in your readings'}
            </span>
          </>
        ) : (
          <span className="text-slate-500">
            {isKo
              ? '저장은 자동이에요. 보충 카드·이어진 대화도 같이 남아요.'
              : 'Saves are automatic — clarifier cards & follow-up chat included.'}
          </span>
        )}
      </p>
      <div className="flex justify-center">
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
