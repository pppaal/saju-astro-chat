'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { logger } from '@/lib/logger'
import { BirthInfoFields, type BirthFieldsClasses, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'

// Light field styling matching the profile page's premium white surface.
const lightFieldClasses: Required<BirthFieldsClasses> = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12.5px] font-semibold tracking-[0.02em] text-[#57534e]',
  input:
    'w-full rounded-xl border border-[#e0ddd7] bg-white px-3 py-2.5 text-[16px] text-[#1c1917] outline-none transition placeholder:text-[#a8a29e] focus:border-[#a07a3c] disabled:cursor-not-allowed disabled:opacity-50',
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel:
    'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[#57534e]',
  checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a07a3c] [color-scheme:light]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-[#e7e4df] bg-white p-1 shadow-[0_16px_40px_rgba(28,25,23,0.12)]',
  suggestionItem:
    'block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#44403c] transition hover:bg-[#f5f4f1]',
}

interface CircleAddModalProps {
  open: boolean
  onClose: () => void
  locale: 'ko' | 'en'
  onAdded: () => void
}

// Keep this in lockstep with src/app/compatibility/lib/types.ts Relation
// and the <select> options in compatibility/components/form/PersonCard.tsx.
const RELATION_OPTIONS_KO = [
  { value: 'lover', label: '연인 💕' },
  { value: 'spouse', label: '배우자 💍' },
  { value: 'family', label: '가족 🏠' },
  { value: 'sibling', label: '형제자매 👯' },
  { value: 'friend', label: '친구 🤝' },
  { value: 'colleague', label: '동료 💼' },
  { value: 'other', label: '기타 ✨' },
] as const

const RELATION_OPTIONS_EN = [
  { value: 'lover', label: 'Lover 💕' },
  { value: 'spouse', label: 'Spouse 💍' },
  { value: 'family', label: 'Family 🏠' },
  { value: 'sibling', label: 'Sibling 👯' },
  { value: 'friend', label: 'Friend 🤝' },
  { value: 'colleague', label: 'Colleague 💼' },
  { value: 'other', label: 'Other ✨' },
] as const

/**
 * Add a new SavedPerson to "내 지인". Self-contained dark form (mirrors
 * ProfileEditModal) instead of the old light UnifiedBirthForm — the old
 * form's light styling was effectively invisible against the dark modal
 * background, so users couldn't see field state and assumed the submit
 * button was non-responsive.
 */
export function CircleAddModal({
  open,
  onClose,
  locale,
  onAdded,
}: CircleAddModalProps) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en)

  const [name, setName] = useState('')
  const [relation, setRelation] = useState<string>('friend')
  const [birthDate, setBirthDate] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(true)
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [birthCity, setBirthCity] = useState('')
  const [cityData, setCityData] = useState<{
    latitude?: number
    longitude?: number
    timezone?: string
  }>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  if (!open) return null

  const relations = locale === 'ko' ? RELATION_OPTIONS_KO : RELATION_OPTIONS_EN

  // birth는 *옵션* — 이름 + 관계만 있어도 저장 가능 (사주/점성 분석 없이 카드만).
  const canSubmit = !!name.trim() && !saving

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
      const body = {
        name: name.trim(),
        relation,
        birthDate: birthDate || null,
        birthTime: timeUnknown ? null : birthTime || null,
        gender: gender === 'F' ? 'female' : 'male',
        birthCity: birthCity || null,
        latitude: cityData.latitude ?? null,
        longitude: cityData.longitude ?? null,
        tzId: cityData.timezone || null,
      }

      const res = await fetch('/api/me/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let apiMessage = ''
        try {
          const json = (await res.clone().json()) as {
            error?: { code?: string; message?: string } | string
            message?: string
          }
          if (typeof json.error === 'string') apiMessage = json.error
          else if (json.error?.message) apiMessage = `${json.error.code || ''}: ${json.error.message}`.trim()
          else if (json.message) apiMessage = json.message
        } catch {
          apiMessage = await res.clone().text().catch(() => '')
        }
        throw new Error(apiMessage ? `HTTP ${res.status} — ${apiMessage}` : `HTTP ${res.status}`)
      }
      // Reset
      setName('')
      setRelation('friend')
      setBirthDate('')
      setBirthTime('')
      setTimeUnknown(true)
      setBirthCity('')
      setCityData({})
      setJustSaved(true)
      setTimeout(() => {
        setJustSaved(false)
        onAdded()
        onClose()
      }, 700)
    } catch (err) {
      logger.warn('[profile/circle] add failed', err)
      const rawMsg = err instanceof Error ? err.message : String(err)
      const base = t('추가에 실패했어요.', 'Failed to add.')
      setError(rawMsg ? `${base} [${rawMsg}]` : base)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(28,25,23,0.45)] backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-[#e7e4df] bg-white shadow-[0_24px_48px_rgba(28,25,23,0.18)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#eee9e3] px-5 py-4">
          <h2
            className="text-[16px] font-semibold tracking-[-0.01em] text-[#1c1917]"
            style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            {t('지인 추가', 'Add to circle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#a8a29e] transition hover:bg-[#f5f4f1] hover:text-[#1c1917]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-5 py-5">
          {/* 이름 */}
          <div className={lightFieldClasses.field}>
            <label className={lightFieldClasses.label}>
              {t('이름', 'Name')}
              <span className="ml-1 text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('이 사람의 이름', "Person's name")}
              className={lightFieldClasses.input}
              maxLength={100}
              required
            />
          </div>

          {/* 관계 */}
          <div className={lightFieldClasses.field}>
            <label className={lightFieldClasses.label}>{t('관계', 'Relation')}</label>
            <div className="flex flex-wrap gap-2">
              {relations.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRelation(r.value)}
                  className={
                    relation === r.value
                      ? 'rounded-full border border-[rgba(160,122,60,0.4)] bg-[rgba(160,122,60,0.10)] px-3.5 py-1.5 text-[12.5px] font-medium text-[#8a6722] transition'
                      : 'rounded-full border border-[#e0ddd7] bg-white px-3.5 py-1.5 text-[12.5px] text-[#57534e] transition hover:border-[#c9c4bc]'
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

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

          {error && (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-600">
              {error}
            </p>
          )}
          {justSaved && (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
              {t('저장되었어요.', 'Saved.')}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-[#1c1917] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#3a3530] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? t('추가 중…', 'Adding…') : t('지인 추가', 'Add to circle')}
          </button>
        </form>
      </div>
    </div>
  )
}
