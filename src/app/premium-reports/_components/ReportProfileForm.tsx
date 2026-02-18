'use client'

import { useMemo, useState } from 'react'
import { UnifiedBirthForm, type BirthInfo } from '@/components/common/BirthForm'

export interface ReportProfileInput {
  name: string
  birthDate: string
  birthTime: string
  gender?: BirthInfo['gender']
  birthCity?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

interface ReportProfileFormProps {
  locale?: 'ko' | 'en'
  initialName?: string
  onSubmit: (profile: ReportProfileInput) => void
}

export function ReportProfileForm({
  locale = 'ko',
  initialName = '',
  onSubmit,
}: ReportProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [lastSaved, setLastSaved] = useState<ReportProfileInput | null>(null)

  const labels = useMemo(
    () =>
      locale === 'ko'
        ? {
            title: '분석 대상 정보',
            nameLabel: '이름 (선택)',
            namePlaceholder: '예: 홍길동',
            submitButton: '분석 정보 저장',
            savedTitle: '현재 저장된 입력',
          }
        : {
            title: 'Profile for Analysis',
            nameLabel: 'Name (optional)',
            namePlaceholder: 'e.g. Alex',
            submitButton: 'Save profile input',
            savedTitle: 'Saved input',
          },
    [locale]
  )

  const handleSubmit = (birth: BirthInfo) => {
    const payload: ReportProfileInput = {
      name: name.trim() || (locale === 'ko' ? '사용자' : 'User'),
      birthDate: birth.birthDate,
      birthTime: birth.birthTime || '12:00',
      gender: birth.gender,
      birthCity: birth.birthCity,
      latitude: birth.latitude,
      longitude: birth.longitude,
      timezone: birth.timezone,
    }

    setLastSaved(payload)
    onSubmit(payload)
  }

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">{labels.title}</h2>

      <div className="mb-4">
        <label className="mb-2 block text-sm text-slate-300">{labels.nameLabel}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/60 p-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <UnifiedBirthForm
        onSubmit={handleSubmit}
        locale={locale}
        includeProfileLoader={true}
        includeCity={false}
        includeCityToggle={true}
        allowTimeUnknown={true}
        includeGender={true}
        genderFormat="short"
        submitButtonText={labels.submitButton}
        submitButtonIcon=""
        showHeader={false}
      />

      {lastSaved && (
        <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          <p className="font-medium">{labels.savedTitle}</p>
          <p className="mt-1">
            {lastSaved.name} · {lastSaved.birthDate} {lastSaved.birthTime}
            {lastSaved.birthCity ? ` · ${lastSaved.birthCity}` : ''}
          </p>
        </div>
      )}
    </section>
  )
}
