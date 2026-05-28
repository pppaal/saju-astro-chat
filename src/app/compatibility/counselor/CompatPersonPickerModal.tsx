'use client'

/**
 * 궁합 상담사 안 인라인 인물 picker — 채팅 페이지에 진입했을 때 두 사람이
 * 아직 안 골라진 상태(=신규 채팅 / 새 채팅 버튼 누른 직후)면 이 모달이
 * 떠서 두 카드 입력 + "분석 시작" 한 번에 처리. 이전엔 /compatibility
 * 별도 입력 페이지로 빠졌다가 다시 ?persons= 로 돌아오는 흐름이었는데
 * 같은 화면 안에서 picker → chat 으로 흐름이 끊기지 않게 모달로 통합.
 *
 * useCompatibilityForm + useCityAutocomplete + useMyCircle + PersonCard +
 * SubmitButton — 입력 페이지가 쓰던 hook / 컴포넌트 그대로 재사용.
 */

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { useCompatibilityForm } from '@/hooks/useCompatibilityForm'
import { useCityAutocomplete } from '@/hooks/useCityAutocomplete'
import { useMyCircle } from '@/hooks/useMyCircle'
import { validatePersons } from '../validatePersons'
import { PersonCard, SubmitButton } from '../components'
import compatStyles from '../Compatibility.module.css'
import styles from './CompatPersonPickerModal.module.css'

export interface PickedPersonData {
  name: string
  date: string
  time: string
  city: string
  latitude?: number
  longitude?: number
  timeZone: string
  relation?: string
  gender?: 'M' | 'F' | 'Male' | 'Female'
}

interface CompatPersonPickerModalProps {
  onSubmit: (persons: PickedPersonData[]) => void
  /** 모달 위에 띄우는 헤딩 — 신규 vs "다른 관계로 전환" 분기용 텍스트. */
  title?: string
  subtitle?: string
}

const KO_FALLBACKS: Record<string, string> = {
  'compatibilityPage.analysisTitle': '궁합 분석',
  'compatibilityPage.backToForm': '뒤로',
  'compatibilityPage.loadMyProfile': '내 정보',
}

export function CompatPersonPickerModal({
  onSubmit,
  title,
  subtitle,
}: CompatPersonPickerModalProps) {
  const { t, locale } = useI18n()
  const normalizedLocale: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  const isKo = normalizedLocale === 'ko'
  const { data: session, status } = useSession()

  const { count, persons, setPersons, updatePerson, fillFromCircle } = useCompatibilityForm(
    2,
    normalizedLocale
  )

  useCityAutocomplete(persons, setPersons)

  const { circlePeople, showCircleDropdown, setShowCircleDropdown, circleError } =
    useMyCircle(status)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const compatT = useCallback(
    (key: string, fallback: string) => {
      if (!isKo) return t(key, fallback)
      return t(key, KO_FALLBACKS[key] || fallback)
    },
    [isKo, t]
  )

  const handleSubmit = useCallback(() => {
    const errorMsg = validatePersons(persons, count, t)
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    setError(null)
    setSubmitting(true)

    const personsData: PickedPersonData[] = persons.slice(0, 2).map((p) => ({
      name: p.name,
      date: p.date,
      // 시간 모름 시 12:00 정오 기준 (입력 페이지와 동일 fallback).
      time: p.time || '12:00',
      city: p.cityQuery || '',
      latitude: p.lat ?? undefined,
      longitude: p.lon ?? undefined,
      timeZone: p.timeZone || 'Asia/Seoul',
      relation: p.relation,
      // gender 가 빠지면 대운 순/역행이 잘못 계산되므로 반드시 함께.
      gender: p.gender,
    }))

    onSubmit(personsData)
  }, [persons, count, t, onSubmit])

  return (
    <div className={styles.scrim}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {title ?? compatT('compatibilityPage.analysisTitle', 'Compatibility Analysis')}
          </h2>
          {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
        </div>

        <form
          className={styles.modalBody}
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {circleError && (
            <div className={styles.notice}>
              {'⚠️'} {circleError}
            </div>
          )}

          {session && circlePeople.length > 0 && (
            <div className={styles.hint}>
              {isKo
                ? '💡 각 카드 우측 상단의 "불러오기" 로 내 정보·지인 정보를 자동 채울 수 있어요.'
                : '💡 Tap "Load" at the top-right of each card to auto-fill from your profile or saved circle.'}
            </div>
          )}

          <div className={compatStyles.personCardsGrid}>
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
                onToggleCircleDropdown={() =>
                  setShowCircleDropdown(showCircleDropdown === idx ? null : idx)
                }
                onFillFromCircle={fillFromCircle}
              />
            ))}
          </div>

          <SubmitButton isLoading={submitting} t={compatT} />

          {error && <div className={compatStyles.error}>{error}</div>}
        </form>
      </div>
    </div>
  )
}
