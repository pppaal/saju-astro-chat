'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'

interface ActionButtonsProps {
  language: string
  isSaved: boolean
  isSaving: boolean
  /**
   * 자동 저장으로 통일됐고 인디케이터도 제거 — 현재 컴포넌트에서는 호출 X.
   * 미래에 명시 저장 UI 부활 시 재사용 가능하도록 prop 만 유지.
   */
  onSave: () => void
  onReset: () => void
}

// 자동 저장 도입 후 "저장하기" 버튼 + "자동 저장됨" 인디케이터 둘 다
// 제거. 운명·궁합 카운슬러 채팅이 별도 표시 없이 자동 저장되는 것과 결을
// 맞춤. 사용자가 명시적으로 액션 할 거리는 "새로 읽기" 하나뿐.
export function ActionButtons({
  language,
  onReset,
  // 자동 저장 통일 후 미사용 — 호환성 prop.
  isSaved: _isSaved,
  isSaving: _isSaving,
  onSave: _onSave,
}: ActionButtonsProps) {
  const isKo = language === 'ko'

  return (
    <div className="flex justify-center">
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        {isKo ? '새로 읽기' : 'New Reading'}
      </button>
    </div>
  )
}
