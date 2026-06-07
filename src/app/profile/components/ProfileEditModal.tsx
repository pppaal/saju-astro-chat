'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { localizeStoredCity } from '@/lib/cities/formatter'
import { logger } from '@/lib/logger'
import { normalizeGender } from '@/lib/utils/gender'
import {
  BirthInfoFields,
  type BirthFieldsClasses,
  type BirthFieldsPatch,
} from '@/components/birth/BirthInfoFields'
import { useFocusTrap } from '@/hooks/useFocusTrap'

// Light field styling that matches the profile page's premium white
// surface. Passed to BirthInfoFields so the shared (dark-default) form
// reads correctly on white without touching its other usages.
const lightFieldClasses: Required<BirthFieldsClasses> = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12.5px] font-semibold tracking-[0.02em] text-[#57534e]',
  input:
    'w-full rounded-xl border border-[#e0ddd7] bg-white px-3 py-2.5 text-[16px] text-[#1c1917] outline-none transition placeholder:text-[#a8a29e] focus:border-[#a07a3c] disabled:cursor-not-allowed disabled:opacity-50',
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel: 'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[#57534e]',
  checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a07a3c] [color-scheme:light]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-[#e7e5e4] bg-white p-1 shadow-[0_16px_40px_rgba(28,25,23,0.12)]',
  suggestionItem:
    'block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#44403c] transition hover:bg-[#f5f4f1]',
}

interface ProfileEditModalProps {
  open: boolean
  onClose: () => void
  initial: {
    name?: string | null
    birthDate?: string | null
    birthTime?: string | null
    gender?: string | null
    birthCity?: string | null
    latitude?: number | null
    longitude?: number | null
    tzId?: string | null
  }
  locale: 'ko' | 'en'
  onSaved: () => void
}

/**
 * 내 정보 수정 모달 — 프로필 페이지 다크 톤(zinc/cyan)에 맞춘 모던 폼.
 * 옛 UnifiedBirthForm은 라이트 base + .module.css라 다크 모달과 안 맞았음.
 * 자체 markup으로 새로 작성하고 도시 검색만 useCitySearch 훅 재사용.
 */
export function ProfileEditModal({
  open,
  onClose,
  initial,
  locale,
  onSaved,
}: ProfileEditModalProps) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  const trapRef = useFocusTrap(open)

  const [name, setName] = useState(initial.name ?? '')
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? '')
  const [timeUnknown, setTimeUnknown] = useState(!initial.birthTime)
  const [birthTime, setBirthTime] = useState(initial.birthTime ?? '')
  const [gender, setGender] = useState<'M' | 'F'>(
    // The server may return any of 'M' / 'F' / 'Male' / 'Female' / 'male' /
    // 'female' depending on when the row was last written, so route every
    // shape through the central normalizer instead of hand-matching two
    // forms — the old check silently picked 'M' for women whose profile
    // had been written in the new 'female' form.
    normalizeGender(initial.gender) === 'female' ? 'F' : 'M'
  )
  const [birthCity, setBirthCity] = useState(localizeStoredCity(initial.birthCity, locale) ?? '')
  const [cityData, setCityData] = useState<{
    latitude?: number
    longitude?: number
    timezone?: string
  }>({
    // 기존 저장된 좌표를 시드 — 사용자가 도시를 다시 안 골라도 좌표가
    // 유지되어 저장 시 null 로 덮어쓰지 않는다 (도시 재선택 요구 방지).
    latitude: initial.latitude ?? undefined,
    longitude: initial.longitude ?? undefined,
    timezone: initial.tzId ?? undefined,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const canSubmit = !!birthDate && (timeUnknown || !!birthTime) && !saving

  const onBirthChange = (patch: BirthFieldsPatch) => {
    if (patch.birthDate !== undefined) setBirthDate(patch.birthDate)
    if (patch.birthTime !== undefined) setBirthTime(patch.birthTime)
    if (patch.timeUnknown !== undefined) setTimeUnknown(patch.timeUnknown)
    if (patch.gender) setGender(patch.gender === 'female' ? 'F' : 'M')
    if (patch.city !== undefined) setBirthCity(patch.city)
    if (
      patch.latitude !== undefined ||
      patch.longitude !== undefined ||
      patch.timeZone !== undefined
    ) {
      setCityData((prev) => ({
        latitude: patch.latitude !== undefined ? (patch.latitude ?? undefined) : prev.latitude,
        longitude: patch.longitude !== undefined ? (patch.longitude ?? undefined) : prev.longitude,
        timezone: patch.timeZone !== undefined ? (patch.timeZone ?? undefined) : prev.timezone,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        birthDate: birthDate || null,
        birthTime: timeUnknown ? null : birthTime || null,
        gender,
        birthCity: birthCity || null,
        // 좌표도 함께 저장 — 안 그러면 도시 이름만 남아 불러오기 시 "도시
        // 다시 선택" 이 떠서 메인페이지에서 도시 미설정으로 보였다.
        latitude: cityData.latitude ?? null,
        longitude: cityData.longitude ?? null,
        tzId: cityData.timezone || initial.tzId || null,
      }
      const trimmed = name.trim()
      if (trimmed && trimmed !== (initial.name ?? '')) body.name = trimmed

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
        t('저장에 실패했어요. 잠시 후 다시 시도해 주세요.', 'Failed to save. Please try again.')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(28,25,23,0.65)] sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-[#e7e5e4] bg-white shadow-[0_24px_48px_rgba(28,25,23,0.18)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#e7e5e4] px-5 py-4">
          <h2
            className="text-[16px] font-semibold tracking-[-0.01em] text-[#1c1917]"
            style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            {t('내 정보 수정', 'Edit my info')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            // 36×36 — 다른 모든 icon 버튼과 정렬 + touch target 가이드 (≥44 권장,
            // 36+padding ≈ 44 effective). 옛 p-1 (~24px) 폐기.
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#a8a29e] transition hover:bg-[#f5f4f1] hover:text-[#1c1917]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-5 py-5">
          {/* 이름 */}
          <div className={lightFieldClasses.field + ' mb-4'}>
            <label className={lightFieldClasses.label}>{t('이름', 'Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('표시될 이름', 'Display name')}
              className={lightFieldClasses.input}
              maxLength={64}
            />
          </div>

          <div className="mb-5 flex flex-col gap-4">
            <BirthInfoFields
              locale={locale}
              birthDate={birthDate}
              birthTime={birthTime}
              timeUnknown={timeUnknown}
              gender={gender === 'F' ? 'female' : 'male'}
              city={birthCity}
              onChange={onBirthChange}
              classes={lightFieldClasses}
            />
          </div>

          {error && (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-[#1c1917] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#3a3530] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
          </button>
        </form>
      </div>
    </div>
  )
}
