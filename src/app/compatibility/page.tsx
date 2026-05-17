'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import ServicePageLayout from '@/components/ui/ServicePageLayout'
import { useI18n } from '@/i18n/I18nProvider'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import styles from './Compatibility.module.css'

import { useCompatibilityForm } from '@/hooks/useCompatibilityForm'
import { useCityAutocomplete } from '@/hooks/useCityAutocomplete'
import { useMyCircle } from '@/hooks/useMyCircle'
import { validatePersons } from './validatePersons'

import { PersonCard, SubmitButton } from './components'

const KO_COMPAT_FALLBACKS: Record<string, string> = {
  'compatibilityPage.analysisTitle': '궁합 분석',
  'compatibilityPage.analysisSubtitle': '점성술 출생 데이터를 통해 관계 궁합 알아보기',
  'compatibilityPage.backToForm': '뒤로',
  'compatibilityPage.title': '관계 궁합',
  'compatibilityPage.subtitle': '마음과 마음 사이의 우주적 연결을 탐험하세요',
  'compatibilityPage.loadingProfile': '불러오는 중...',
  'compatibilityPage.loadMyProfile': '내 프로필',
  'compatibilityPage.profileLoaded': '프로필을 불러왔습니다!',
}

export default function CompatPage() {
  const { t, locale } = useI18n()
  const normalizedLocale: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  const router = useRouter()
  const { data: session, status } = useSession()

  const { profile, loadProfile, loadingProfileBtn, profileLoadedMsg, profileLoadError } =
    useUserProfile({ skipAutoLoad: false })

  const { count, persons, setPersons, updatePerson, fillFromCircle, onPickCity } =
    useCompatibilityForm(2, normalizedLocale)

  useCityAutocomplete(persons, setPersons)

  const { circlePeople, showCircleDropdown, setShowCircleDropdown, circleError } =
    useMyCircle(status)

  // Form-level validation only — submit routes straight to
  // /compatibility/counselor instead of running an inline analysis.
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(() => {
    const errorMsg = validatePersons(persons, count, t)
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    setError(null)
    setSubmitting(true)

    const personsData = persons.slice(0, 2).map((p) => ({
      name: p.name,
      date: p.date,
      time: p.time || '12:00',
      city: p.cityQuery || '',
      latitude: p.lat ?? undefined,
      longitude: p.lon ?? undefined,
      timeZone: p.timeZone || 'Asia/Seoul',
      relation: p.relation,
      // 대운은 음양남녀에 따라 순행/역행이 갈리므로 gender가 반드시 따라가야 함.
      // 빠지면 buildPersonSeed가 default 'male'로 처리해 두 사람 대운이 같은 방향으로 잘못 계산됨.
      gender: p.gender,
    }))

    router.push(
      `/compatibility/counselor?persons=${encodeURIComponent(JSON.stringify(personsData))}`
    )
  }, [persons, count, t, router])

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  const handleLoadProfile = useCallback(async () => {
    const success = await loadProfile(locale)
    if (success && profile.birthDate) {
      setPersons((prev) => {
        const next = [...prev]
        next[0] = {
          ...next[0],
          name: profile.name || next[0].name,
          date: profile.birthDate || next[0].date,
          time: profile.birthTime || next[0].time,
          gender:
            profile.gender?.toLowerCase() === 'female' || profile.gender?.toLowerCase() === 'f'
              ? 'F'
              : profile.gender?.toLowerCase() === 'male' || profile.gender?.toLowerCase() === 'm'
                ? 'M'
                : next[0].gender,
          cityQuery: profile.birthCity || next[0].cityQuery,
          timeZone: profile.timezone || next[0].timeZone,
        }
        return next
      })
    }
  }, [loadProfile, locale, profile, setPersons])

  const compatT = useCallback(
    (key: string, fallback: string) => {
      if (normalizedLocale !== 'ko') {
        return t(key, fallback)
      }
      return t(key, KO_COMPAT_FALLBACKS[key] || fallback)
    },
    [normalizedLocale, t]
  )

  return (
    <ServicePageLayout
      title={compatT('compatibilityPage.analysisTitle', 'Compatibility Analysis')}
      onBack={handleBack}
      backLabel={compatT('compatibilityPage.backToForm', 'Back')}
      compact
    >
      <main className={`${styles.page} ${styles.entryOnly}`}>
        <div className={`${styles.formContainer} ${styles.fadeIn}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            {!profileLoadedMsg && (
              <button
                type="button"
                onClick={handleLoadProfile}
                disabled={loadingProfileBtn}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-[12px] text-indigo-100 transition-colors hover:border-indigo-300/60 hover:bg-indigo-500/25 disabled:opacity-50"
              >
                <span>{loadingProfileBtn ? '⏳' : '\u{1F464}'}</span>
                <span>
                  {loadingProfileBtn
                    ? compatT('compatibilityPage.loadingProfile', 'Loading...')
                    : compatT('compatibilityPage.loadMyProfile', 'Load My Profile')}
                </span>
              </button>
            )}

            {profileLoadedMsg && (
              <div className="mb-3 px-3 py-1.5 bg-green-600/20 border border-green-600/40 rounded-md text-green-400 text-[12px] text-center">
                {'✓'} {compatT('compatibilityPage.profileLoaded', 'Profile loaded!')}
              </div>
            )}

            {profileLoadError && (
              <div className="mb-3 px-3 py-1.5 bg-red-600/20 border border-red-600/40 rounded-md text-red-400 text-[12px]">
                {'⚠️'} {profileLoadError}
              </div>
            )}

            {circleError && (
              <div className="mb-5 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                {'⚠️'} {circleError}
              </div>
            )}

            <div className={styles.personCardsGrid}>
              {persons.slice(0, 2).map((p, idx) => (
                <PersonCard
                  key={idx}
                  person={p}
                  index={idx}
                  isAuthenticated={!!session}
                  circlePeople={circlePeople}
                  showCircleDropdown={showCircleDropdown === idx}
                  locale={normalizedLocale}
                  t={compatT}
                  onUpdatePerson={updatePerson}
                  onSetPersons={setPersons}
                  onPickCity={onPickCity}
                  onToggleCircleDropdown={() =>
                    setShowCircleDropdown(showCircleDropdown === idx ? null : idx)
                  }
                  onFillFromCircle={fillFromCircle}
                />
              ))}
            </div>

            <SubmitButton isLoading={submitting} t={compatT} />

            {error && <div className={styles.error}>{error}</div>}
          </form>
        </div>
      </main>
    </ServicePageLayout>
  )
}
