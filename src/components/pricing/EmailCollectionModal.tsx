'use client'

import * as React from 'react'

// /api/checkout 의 isValidEmail 과 동일한 정규식. zod 스키마 (서버) 와도
// 동일. 클라이언트에서 미리 invalid 를 거르고, 서버는 최종 가드.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

interface EmailCollectionModalProps {
  open: boolean
  // 모달 닫기 (배경 클릭, ESC, X, "취소"). 결제는 진행 안 됨.
  onClose: () => void
  // 이메일 저장 성공 시 호출. 호출자는 여기에 다음 단계 (보통
  // RefundConsentModal 오픈) 를 연결한다. 인자로 저장된 이메일을 넘겨서
  // 호출자가 즉시 UI 에 반영하거나 로깅하고 싶을 때 쓸 수 있게 함.
  onSaved: (email: string) => void
  locale: 'ko' | 'en'
}

// 결제 직전 이메일 보충 모달.
//
// 배경: 일부 OAuth 가입 흐름 (Apple private-relay 옵트아웃, 일부 Google
// scope 누락 등) 에서 User.email 이 비어 있는 상태로 로그인된 사용자가
// 있다. 그대로 /api/checkout 을 부르면 invalid_email 로 reject 되는데,
// pricing 페이지는 일반적인 "결제 서비스 일시 불가" toast 만 띄워 사용자가
// 영문도 모른 채 결제 실패로 인식하던 회귀가 있었다.
//
// 이 모달은 결제 버튼 클릭 시점에 session.user.email 이 비어 있으면 띄워,
// (1) 이메일 받고 → (2) PATCH /api/me/email 로 DB 갱신 → (3) useSession()
// .update() 로 세션 강제 갱신 → (4) RefundConsentModal 로 진행, 라는
// 흐름의 첫 단계를 담당한다.
//
// 디자인은 RefundConsentModal 과 동일한 톤 (white sheet, rounded-3xl,
// amber primary). close 동선은 배경 + ESC + X + 취소 4개 모두 지원.
export function EmailCollectionModal({
  open,
  onClose,
  onSaved,
  locale,
}: EmailCollectionModalProps) {
  const isKo = locale === 'ko'
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // 모달 close 시 state reset — 다음에 다시 열 때 깨끗하게.
  React.useEffect(() => {
    if (!open) {
      setEmail('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  // ESC 키 close
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 모달 오픈 시 input autofocus — 키보드 사용자 한 번 덜 누름.
  React.useEffect(() => {
    if (!open) return
    // 다음 tick 에 focus — 모달이 mount 된 직후엔 keyboard listener 가
    // 아직 attach 안 됐을 수 있어서.
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const trimmed = email.trim()
  const isFormatValid = EMAIL_REGEX.test(trimmed) && trimmed.length <= 254
  const canSubmit = isFormatValid && !submitting

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/me/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })

      // withApiMiddleware 봉투 (`{ success, data, error }`) 와 raw 응답 둘 다
      // 안전하게 처리. error.message 가 'email_in_use' 면 별도 카피로 안내.
      const json = (await res.json().catch(() => null)) as {
        success?: boolean
        data?: { email?: string }
        error?: { code?: string; message?: string }
      } | null

      if (!res.ok || !json || json.success === false) {
        const msg = json?.error?.message
        if (msg === 'email_in_use') {
          setError(
            isKo
              ? '이미 다른 계정에서 사용 중인 이메일이에요. 다른 주소를 입력해주세요.'
              : 'This email is already used by another account. Please try a different address.'
          )
        } else if (msg === 'invalid_email' || msg === 'invalid_email_format') {
          setError(isKo ? '이메일 형식이 올바르지 않아요.' : "That email doesn't look right.")
        } else {
          setError(
            isKo
              ? '저장에 실패했어요. 잠시 후 다시 시도해주세요.'
              : 'Could not save. Please try again in a moment.'
          )
        }
        setSubmitting(false)
        return
      }

      const saved = json.data?.email ?? trimmed
      onSaved(saved)
      // submitting 은 onSaved 후 호출자가 모달을 닫으면 useEffect 에서 reset 됨.
    } catch {
      setError(
        isKo ? '네트워크 오류가 발생했어요. 다시 시도해주세요.' : 'Network error. Please try again.'
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-collection-title"
      onClick={onClose}
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 pt-12 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white p-6 text-stone-900 shadow-2xl"
      >
        {/* X 버튼 — backdrop / ESC 와 동등한 close 동선 (UX 가이드 준수) */}
        <button
          type="button"
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <h2 id="email-collection-title" className="pr-8 text-lg font-bold">
          {isKo ? '영수증을 받을 이메일을 알려주세요' : 'Where should we send your receipt?'}
        </h2>

        <p className="mt-3 text-[14px] leading-relaxed text-stone-700">
          {isKo
            ? '결제 영수증과 주문 내역을 보내드리려면 이메일이 필요해요. 가입 시 이메일이 등록되지 않은 경우에만 한 번 입력하시면 돼요.'
            : "We need your email to send the receipt and order details. You'll only see this once if your account didn't include an email."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="email-collection-input"
            className="block text-[13px] font-medium text-stone-700"
          >
            {isKo ? '이메일 주소' : 'Email address'}
          </label>
          <input
            id="email-collection-input"
            ref={inputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
            placeholder={isKo ? 'you@example.com' : 'you@example.com'}
            maxLength={254}
            disabled={submitting}
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 disabled:cursor-not-allowed disabled:bg-stone-50"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'email-collection-error' : undefined}
          />
          {error && (
            <p id="email-collection-error" role="alert" className="mt-2 text-[13px] text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isKo ? '취소' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-[2] rounded-full bg-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
            >
              {submitting
                ? isKo
                  ? '저장 중…'
                  : 'Saving…'
                : isKo
                  ? '저장하고 결제 진행'
                  : 'Save and continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
