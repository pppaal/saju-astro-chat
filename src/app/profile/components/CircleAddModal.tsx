'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { logger } from '@/lib/logger'
import { BirthInfoFields, birthFieldClasses, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'

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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0f1e] shadow-[0_-12px_60px_rgba(0,0,0,0.5)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            {t('지인 추가', 'Add to circle')}
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

        <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-5 py-5">
          {/* 이름 */}
          <div className={birthFieldClasses.field}>
            <label className={birthFieldClasses.label}>
              {t('이름', 'Name')}
              <span className="ml-1 text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('이 사람의 이름', "Person's name")}
              className={birthFieldClasses.input}
              maxLength={100}
              required
            />
          </div>

          {/* 관계 */}
          <div className={birthFieldClasses.field}>
            <label className={birthFieldClasses.label}>{t('관계', 'Relation')}</label>
            <div className="flex flex-wrap gap-2">
              {relations.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRelation(r.value)}
                  className={
                    relation === r.value
                      ? 'rounded-full border border-violet-300/45 bg-violet-400/15 px-3.5 py-1.5 text-[12.5px] text-white transition'
                      : 'rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-1.5 text-[12.5px] text-slate-300 transition hover:border-white/20'
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
          />

          {error && (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200">
              {error}
            </p>
          )}
          {justSaved && (
            <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-200">
              {t('저장되었어요.', 'Saved.')}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-[14px] font-semibold text-white transition hover:from-cyan-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t('추가 중…', 'Adding…') : t('지인 추가', 'Add to circle')}
          </button>
        </form>
      </div>
    </div>
  )
}
