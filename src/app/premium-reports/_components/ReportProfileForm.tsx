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
            title: '??? ?? ??',
            subtitle: '?? ??? ?? ?? ??? ??? ?? ??? ????.',
            nameLabel: '?? (??)',
            namePlaceholder: '?: ???',
            submitButton: '?? ??',
            savedTitle: '?? ??? ??',
          }
        : {
            title: 'Report Profile',
            subtitle: 'Use this calendar-style form to build a stable analysis baseline.',
            nameLabel: 'Name (optional)',
            namePlaceholder: 'e.g. Alex',
            submitButton: 'Save Input',
            savedTitle: 'Saved input',
          },
    [locale]
  )

  const handleSubmit = (birth: BirthInfo) => {
    const payload: ReportProfileInput = {
      name: name.trim() || (locale === 'ko' ? '???' : 'User'),
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
    <section className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#08132a]/90 via-[#0d1e3f]/90 to-[#11123a]/90 p-6 shadow-[0_20px_55px_rgba(6,20,52,0.45)] backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight text-cyan-50">{labels.title}</h2>
        <p className="mt-1 text-sm leading-6 text-cyan-100/85">{labels.subtitle}</p>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-cyan-100">{labels.nameLabel}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          className="w-full rounded-xl border border-cyan-400/35 bg-[#091733]/80 px-4 py-3 text-base font-medium text-white placeholder:text-cyan-200/40 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
        />
      </div>

      <div className="rounded-2xl border border-cyan-300/25 bg-[#071127]/70 p-4">
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
      </div>

      {lastSaved && (
        <div className="mt-4 rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p className="font-medium">{labels.savedTitle}</p>
          <p className="mt-1">
            {lastSaved.name} ? {lastSaved.birthDate} {lastSaved.birthTime}
            {lastSaved.birthCity ? ` ? ${lastSaved.birthCity}` : ''}
          </p>
        </div>
      )}
    </section>
  )
}
