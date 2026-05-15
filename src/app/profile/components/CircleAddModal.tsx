'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { UnifiedBirthForm, type BirthInfo } from '@/components/common/BirthForm'
import { logger } from '@/lib/logger'

interface CircleAddModalProps {
  open: boolean
  onClose: () => void
  locale: 'ko' | 'en'
  onAdded: () => void
}

const RELATION_OPTIONS_KO = [
  { value: 'family', label: '가족' },
  { value: 'friend', label: '친구' },
  { value: 'partner', label: '연인' },
  { value: 'colleague', label: '동료' },
] as const

const RELATION_OPTIONS_EN = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner' },
  { value: 'colleague', label: 'Colleague' },
] as const

/**
 * Add a new SavedPerson to "내 지인". Form is name + relation (chip
 * picker) + UnifiedBirthForm for birth info. Submit posts to
 * /api/me/circle.
 */
export function CircleAddModal({
  open,
  onClose,
  locale,
  onAdded,
}: CircleAddModalProps) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState<string>('friend')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const relations = locale === 'ko' ? RELATION_OPTIONS_KO : RELATION_OPTIONS_EN

  const handleSubmit = async (info: BirthInfo) => {
    if (!name.trim()) {
      setError(locale === 'ko' ? '이름을 입력해 주세요.' : 'Please enter a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: name.trim(),
        relation,
        birthDate: info.birthDate || null,
        birthTime: info.birthTime || null,
        gender:
          info.gender === 'M' || info.gender === 'Male'
            ? 'male'
            : info.gender === 'F' || info.gender === 'Female'
              ? 'female'
              : null,
        birthCity: info.birthCity || null,
        latitude: info.latitude ?? null,
        longitude: info.longitude ?? null,
        tzId: info.timezone || null,
      }

      const res = await fetch('/api/me/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `HTTP ${res.status}`)
      }
      // Reset for next add
      setName('')
      setRelation('friend')
      onAdded()
      onClose()
    } catch (err) {
      logger.warn('[profile/circle] add failed', err)
      setError(
        locale === 'ko'
          ? '추가에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to add. Please try again in a moment.',
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
            {locale === 'ko' ? '지인 추가' : 'Add to circle'}
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
          <div className="mb-4">
            <label className="block text-[11.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {locale === 'ko' ? '이름' : 'Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === 'ko' ? '이 사람의 이름' : "Person's name"}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              maxLength={100}
            />
          </div>

          <div className="mb-5">
            <label className="block text-[11.5px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {locale === 'ko' ? '관계' : 'Relation'}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {relations.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRelation(r.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
                    relation === r.value
                      ? 'border-cyan-300/40 bg-cyan-300/10 text-white'
                      : 'border-white/12 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <UnifiedBirthForm
            locale={locale}
            includeProfileLoader={false}
            includeCity={true}
            includeTime={true}
            includeGender={true}
            allowTimeUnknown={true}
            onSubmit={handleSubmit}
            submitButtonText={
              saving
                ? locale === 'ko'
                  ? '추가 중...'
                  : 'Adding...'
                : locale === 'ko'
                  ? '지인 추가'
                  : 'Add to circle'
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
