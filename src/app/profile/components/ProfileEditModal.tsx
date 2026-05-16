'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { UnifiedBirthForm, type BirthInfo } from '@/components/common/BirthForm'
import { logger } from '@/lib/logger'

interface ProfileEditModalProps {
  open: boolean
  onClose: () => void
  /** Pre-fill values pulled from /api/me/profile. */
  initial: {
    name?: string | null
    birthDate?: string | null
    birthTime?: string | null
    gender?: string | null
    birthCity?: string | null
    tzId?: string | null
  }
  locale: 'ko' | 'en'
  onSaved: () => void
}

/**
 * Edit *my own* birth info + display name. The birth-info side reuses
 * UnifiedBirthForm so the city autocomplete + timezone resolution are
 * the same as everywhere else in the app. Name lives in a separate
 * input above the form because it is not part of BirthInfo.
 */
export function ProfileEditModal({
  open,
  onClose,
  initial,
  locale,
  onSaved,
}: ProfileEditModalProps) {
  const [name, setName] = useState(initial.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (info: BirthInfo) => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        birthDate: info.birthDate || null,
        birthTime: info.birthTime || null,
        // UnifiedBirthForm emits 'M'/'F' or 'Male'/'Female'. Profile
        // schema accepts a wider set, but normalize to single-letter
        // for storage consistency with the rest of the codebase.
        gender: info.gender
          ? info.gender.charAt(0).toUpperCase()
          : null,
        birthCity: info.birthCity || null,
        tzId: info.timezone || null,
      }
      const trimmedName = name.trim()
      if (trimmedName && trimmedName !== (initial.name ?? '')) {
        body.name = trimmedName
      }

      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `HTTP ${res.status}`)
      }
      onSaved()
      onClose()
    } catch (err) {
      logger.warn('[profile/edit] save failed', err)
      setError(
        locale === 'ko'
          ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to save. Please try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0f1e] shadow-[0_-12px_60px_rgba(0,0,0,0.5)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            {locale === 'ko' ? '내 정보 수정' : 'Edit my info'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">
          <div className="mb-5">
            <label className="block text-[11.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {locale === 'ko' ? '이름' : 'Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === 'ko' ? '표시될 이름' : 'Display name'}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              maxLength={64}
            />
          </div>

          <UnifiedBirthForm
            locale={locale}
            includeProfileLoader={false}
            includeCity={true}
            includeTime={true}
            includeGender={true}
            allowTimeUnknown={true}
            initialData={{
              birthDate: initial.birthDate ?? undefined,
              birthTime: initial.birthTime ?? undefined,
              gender:
                initial.gender === 'M' || initial.gender === 'Male'
                  ? 'M'
                  : initial.gender === 'F' || initial.gender === 'Female'
                    ? 'F'
                    : undefined,
              birthCity: initial.birthCity ?? undefined,
              timezone: initial.tzId ?? undefined,
            }}
            onSubmit={handleSubmit}
            submitButtonText={
              saving
                ? locale === 'ko'
                  ? '저장 중...'
                  : 'Saving...'
                : locale === 'ko'
                  ? '저장'
                  : 'Save'
            }
            showHeader={false}
          />

          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
