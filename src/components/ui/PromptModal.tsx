'use client'

import * as React from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useModalDismiss } from '@/hooks/useModalA11y'

// 네이티브 window.prompt / window.confirm 대체용 인앱 모달.
//
// 일부 인앱 웹뷰(카카오/인스타 등)는 네이티브 prompt·confirm 을 막거나
// 스타일을 줄 수 없고 a11y 도 약하다. 이 모달은 두 가지 모드를 지원한다:
//
//   - mode="prompt"  : 텍스트 입력 1개 (예: 대화 이름 변경). onConfirm 에
//                      입력값(trim 된 문자열)을 넘긴다.
//   - mode="confirm" : 확인/취소만 (예: 삭제). onConfirm 인자 없음.
//
// 디자인·동선은 EmailCollectionModal 과 동일한 톤(white sheet, rounded-3xl).
// close 동선은 배경 클릭 + ESC + 취소 버튼 모두 지원. focus trap + body
// 스크롤 잠금은 공용 훅(useFocusTrap / useModalDismiss) 재사용.
type BaseProps = {
  open: boolean
  title: string
  /** 본문 설명(선택). confirm 모드에선 보통 여기에 안내 문구를 넣는다. */
  message?: string
  confirmLabel: string
  cancelLabel: string
  onClose: () => void
  /** confirm 버튼이 위험(삭제) 동작이면 true — 빨간 톤으로 강조. */
  danger?: boolean
}

type PromptProps = BaseProps & {
  mode: 'prompt'
  /** 입력 필드 라벨(접근성용). */
  inputLabel: string
  initialValue?: string
  placeholder?: string
  /** 비어 있는 값으로 확인 못 누르게. 기본 true. */
  requireValue?: boolean
  onConfirm: (value: string) => void
}

type ConfirmProps = BaseProps & {
  mode: 'confirm'
  onConfirm: () => void
}

export type PromptModalProps = PromptProps | ConfirmProps

export default function PromptModal(props: PromptModalProps) {
  const { open, title, message, confirmLabel, cancelLabel, onClose, danger } = props
  const isPrompt = props.mode === 'prompt'

  const trapRef = useFocusTrap(open, { autoFocus: !isPrompt })
  useModalDismiss(open, onClose)

  const [value, setValue] = React.useState(isPrompt ? (props.initialValue ?? '') : '')
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // 열릴 때마다 입력값을 initialValue 로 초기화하고, prompt 모드면 autofocus.
  const titleId = React.useId()
  const descId = React.useId()
  const inputId = React.useId()

  React.useEffect(() => {
    if (!open) return
    if (isPrompt) {
      setValue((props as PromptProps).initialValue ?? '')
      const tid = window.setTimeout(() => {
        const el = inputRef.current
        if (el) {
          el.focus()
          el.select()
        }
      }, 30)
      return () => window.clearTimeout(tid)
    }
    return undefined
    // initialValue 는 open 토글 시점 기준으로만 반영 — 입력 중 prop 변동으로
    // 덮어쓰지 않도록 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPrompt])

  if (!open) return null

  const trimmed = value.trim()
  const requireValue = isPrompt ? ((props as PromptProps).requireValue ?? true) : false
  const canConfirm = !isPrompt || !requireValue || trimmed.length > 0

  const handleConfirm = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!canConfirm) return
    if (isPrompt) {
      ;(props as PromptProps).onConfirm(trimmed)
    } else {
      ;(props as ConfirmProps).onConfirm()
    }
  }

  return (
    <div
      ref={trapRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={message ? descId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 pt-12 sm:items-center sm:p-6"
    >
      <form
        onSubmit={handleConfirm}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-stone-900 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>

        {message && (
          <p id={descId} className="mt-3 text-[14px] leading-relaxed text-stone-700">
            {message}
          </p>
        )}

        {isPrompt && (
          <div className="mt-4">
            <label htmlFor={inputId} className="block text-[13px] font-medium text-stone-700">
              {(props as PromptProps).inputLabel}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={(props as PromptProps).placeholder}
              maxLength={120}
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
            />
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className={
              danger
                ? 'flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none'
                : 'flex-1 rounded-full bg-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
