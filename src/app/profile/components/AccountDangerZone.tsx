'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Trash2 } from 'lucide-react'
import { clearClientCache } from '@/lib/auth/clearClientCache'
import { logger } from '@/lib/logger'
import { type Locale, ghostBtnCls, sectionLabelCls, serifStyle } from './profileShared'

interface Props {
  locale: Locale
  /** 계정 삭제 확인 문구: 이메일이 있으면 이메일, 없으면 "DELETE". */
  email: string | null | undefined
}

// 계정 위험 구역 — 계정 삭제 버튼 + 확인 모달. 삭제 상태는 전부 지역 상태.
export function AccountDangerZone({ locale, email }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // 계정 삭제 확인 문구: 이메일이 있으면 이메일, 없으면 "DELETE".
  const expectedConfirm = email || 'DELETE'
  const confirmMatches = deleteConfirm.trim().toLowerCase() === expectedConfirm.toLowerCase()

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/me/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deleteConfirm.trim() }),
      })
      if (res.ok) {
        // Account just got deleted; purge SW caches so nothing from
        // this user lingers in Cache Storage on the device.
        await clearClientCache()
        await signOut({ callbackUrl: '/' })
        return
      }
      const data = await res.json().catch(() => null)
      if (data?.error?.code === 'VALIDATION_ERROR') {
        setDeleteError(
          locale === 'ko' ? '확인 문구가 일치하지 않아요.' : 'Confirmation does not match.'
        )
      } else {
        setDeleteError(
          locale === 'ko'
            ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
            : 'Failed to delete. Please try again in a moment.'
        )
      }
    } catch (err) {
      logger.warn('[profile] account delete failed', err)
      setDeleteError(
        locale === 'ko'
          ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to delete. Please try again in a moment.'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <section className={`mt-9 rounded-3xl border border-[#e7c9c9] bg-white p-5 sm:p-6`}>
        <div className={sectionLabelCls}>
          <Trash2 className="h-3.5 w-3.5" />
          {locale === 'ko' ? '계정' : 'Account'}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#78716c]">
          {locale === 'ko'
            ? '계정을 삭제하면 프로필·지인·기록·크레딧 등 모든 데이터가 영구 삭제되며 되돌릴 수 없습니다.'
            : 'Deleting your account permanently removes all your data (profile, circle, history, credits) and cannot be undone.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirm('')
            setDeleteError(null)
            setDeleteOpen(true)
          }}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e0a3a3] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#b04242] transition hover:bg-[#fcf4f4]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {locale === 'ko' ? '계정 삭제' : 'Delete account'}
        </button>
      </section>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,25,23,0.45)] p-4"
          onClick={() => {
            if (!deleting) setDeleteOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'ko' ? '계정 삭제 확인' : 'Confirm account deletion'}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-[0_24px_48px_rgba(28,25,23,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold text-[#1c1917]" style={serifStyle}>
              {locale === 'ko' ? '정말 계정을 삭제할까요?' : 'Delete your account?'}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#57534e]">
              {locale === 'ko'
                ? '이 작업은 되돌릴 수 없어요. 모든 데이터가 영구적으로 삭제됩니다.'
                : 'This cannot be undone. All your data will be permanently deleted.'}
            </p>
            <p className="mt-3 text-[12px] text-[#78716c]">
              {locale === 'ko' ? (
                <>
                  확인을 위해 <b className="text-[#1c1917]">{expectedConfirm}</b> 를 입력하세요.
                </>
              ) : (
                <>
                  Type <b className="text-[#1c1917]">{expectedConfirm}</b> to confirm.
                </>
              )}
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => {
                setDeleteConfirm(e.target.value)
                if (deleteError) setDeleteError(null)
              }}
              placeholder={expectedConfirm}
              aria-label={locale === 'ko' ? '확인 문구' : 'Confirmation text'}
              className="mt-2 w-full rounded-lg border border-[#d8d5cf] bg-white px-3 py-2 text-[14px] text-[#1c1917] outline-none focus:border-[#a07a3c]"
            />
            {deleteError && (
              <p className="mt-2 text-[12px] text-red-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className={ghostBtnCls}
              >
                {locale === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || !confirmMatches}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#b04242] px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#963636] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? locale === 'ko'
                    ? '삭제 중…'
                    : 'Deleting…'
                  : locale === 'ko'
                    ? '영구 삭제'
                    : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
