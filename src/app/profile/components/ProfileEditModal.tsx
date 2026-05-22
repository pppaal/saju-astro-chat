'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { localizeStoredCity } from '@/lib/cities/formatter'
import { logger } from '@/lib/logger'
import { BirthInfoFields, birthFieldClasses, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'

interface ProfileEditModalProps {
  open: boolean
  onClose: () => void
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

  const [name, setName] = useState(initial.name ?? '')
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? '')
  const [timeUnknown, setTimeUnknown] = useState(!initial.birthTime)
  const [birthTime, setBirthTime] = useState(initial.birthTime ?? '')
  const [gender, setGender] = useState<'M' | 'F'>(
    initial.gender === 'F' || initial.gender === 'Female' ? 'F' : 'M',
  )
  const [birthCity, setBirthCity] = useState(localizeStoredCity(initial.birthCity, locale) ?? '')
  const [cityData, setCityData] = useState<{
    latitude?: number
    longitude?: number
    timezone?: string
  }>({
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
    if (patch.latitude !== undefined || patch.longitude !== undefined || patch.timeZone !== undefined) {
      setCityData((prev) => ({
        latitude: patch.latitude !== undefined ? patch.latitude ?? undefined : prev.latitude,
        longitude: patch.longitude !== undefined ? patch.longitude ?? undefined : prev.longitude,
        timezone: patch.timeZone !== undefined ? patch.timeZone ?? undefined : prev.timezone,
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
      setError(t('저장에 실패했어요. 잠시 후 다시 시도해 주세요.', 'Failed to save. Please try again.'))
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
            {t('내 정보 수정', 'Edit my info')}
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

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-5 py-5">
          {/* 이름 */}
          <div className={birthFieldClasses.field + ' mb-4'}>
            <label className={birthFieldClasses.label}>{t('이름', 'Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('표시될 이름', 'Display name')}
              className={birthFieldClasses.input}
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
            />
          </div>

          {error && (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-[14px] font-semibold text-white transition hover:from-cyan-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
          </button>
        </form>
      </div>
    </div>
  )
}
