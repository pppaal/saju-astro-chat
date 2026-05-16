'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCitySearch } from '@/hooks/calendar/useCitySearch'
import { formatCityForDropdown, localizeStoredCity } from '@/lib/cities/formatter'
import { logger } from '@/lib/logger'

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

  // 도시 검색 — debounce 내장 훅 (suggestions + openSug + 입력 핸들러 제공)
  const {
    suggestions,
    openSug,
    setOpenSug,
    handleCityInputChange,
    handleCitySelect: pickCity,
  } = useCitySearch(locale)

  if (!open) return null

  const canSubmit = !!birthDate && (timeUnknown || !!birthTime) && !saving

  const onCityInput = (value: string) => {
    setBirthCity(value)
    handleCityInputChange(value)
  }

  const onCityPick = (city: Parameters<typeof pickCity>[0]) => {
    const enriched = pickCity(city)
    setBirthCity(formatCityForDropdown(enriched.name, enriched.country, locale))
    setCityData({ latitude: enriched.lat, longitude: enriched.lon, timezone: enriched.timezone })
    setOpenSug(false)
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
          <Field label={t('이름', 'Name')}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('표시될 이름', 'Display name')}
              className={inputClass}
              maxLength={64}
            />
          </Field>

          {/* 생년월일 */}
          <Field label={t('생년월일', 'Birth Date')} required>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          {/* 성별 */}
          <Field label={t('성별', 'Gender')} required>
            <div className="grid grid-cols-2 gap-2">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={
                    gender === g
                      ? 'rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-[14px] font-medium text-cyan-200 transition'
                      : 'rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[14px] text-slate-300 transition hover:border-white/20 hover:text-white'
                  }
                >
                  {g === 'M' ? t('남자', 'Male') : t('여자', 'Female')}
                </button>
              ))}
            </div>
          </Field>

          {/* 출생 시간 */}
          <Field label={t('태어난 시간', 'Birth Time')}>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={timeUnknown}
              className={inputClass + (timeUnknown ? ' opacity-50' : '')}
            />
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12.5px] text-slate-400">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => {
                  setTimeUnknown(e.target.checked)
                  if (e.target.checked) setBirthTime('')
                }}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-cyan-400"
              />
              <span>{t('출생 시간을 모름 (정오 12:00으로 설정됨)', 'Time unknown (uses 12:00 noon)')}</span>
            </label>
          </Field>

          {/* 출생 도시 */}
          <Field label={t('태어난 도시', 'Birth City')}>
            <div className="relative">
              <input
                type="text"
                value={birthCity}
                onChange={(e) => onCityInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setOpenSug(true)}
                placeholder={t('도시명 입력 (예: Seoul)', 'City name (e.g., Seoul)')}
                className={inputClass}
                autoComplete="off"
              />
              {openSug && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-[#0e1426] shadow-lg">
                  {suggestions.slice(0, 8).map((city, idx) => (
                    <li key={`${city.name}-${city.country}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => onCityPick(city)}
                        className="block w-full px-3 py-2 text-left text-[13px] text-slate-200 transition hover:bg-white/[0.06]"
                      >
                        {formatCityForDropdown(city.name, city.country, locale)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

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

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none disabled:cursor-not-allowed'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-[11.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  )
}
