'use client'

/**
 * 궁합 상담사 안 인라인 인물 picker — 채팅 페이지에 진입했을 때 두 사람이
 * 아직 안 골라진 상태(=신규 채팅 / 새 채팅 버튼 누른 직후)면 이 모달이
 * 떠서 두 카드 입력 + "분석 시작" 한 번에 처리.
 *
 * "저장된 정보 불러오기" dropdown 은 메인 BirthInfoModal 과 동일 패턴 —
 * 단일 트리거 + 내 정보 + 등록된 지인 한 곳에. 두 버튼 따로 두던 옛
 * 패턴은 사용자가 "어디서 본인 정보를 불러와야 하는지" 헷갈렸다.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { useCompatibilityForm } from '@/hooks/useCompatibilityForm'
import { useCityAutocomplete } from '@/hooks/useCityAutocomplete'
import { getStoredBirthInfo, normGender, timeToState } from '@/app/(main)/birthInfoStorage'
import { validatePersons } from '../validatePersons'
import { PersonCard, SubmitButton, type LoadOption } from '../components'
import { useFocusTrap } from '@/hooks/useFocusTrap'
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
  'compatibilityPage.loadSaved': '저장된 정보 불러오기',
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
  // 부모가 조건부 mount 하므로 mount=open. 언제나 true 로 전달.
  // autoFocus: false — 폼이 뜨자마자 첫 입력(이름)에 focus 가 가면 모바일
  // 키보드가 자동으로 올라온다("궁합폼 열면 키보드 자동으로 뜸"). 대신
  // 모달 컨테이너(tabIndex=-1)에 focus 를 둬 trap 만 건다.
  const trapRef = useFocusTrap(true, { autoFocus: false })

  const { count, persons, setPersons, updatePerson, fillFromCircle } = useCompatibilityForm(
    2,
    normalizedLocale
  )

  useCityAutocomplete(persons, setPersons)

  // "저장된 정보 불러오기" dropdown 옵션 — 메인 BirthInfoModal 과 동일하게
  // 내 정보 (DB 프로필 우선 + 로컬 fallback) + 등록된 지인 한 list 로.
  const [loadOptions, setLoadOptions] = useState<LoadOption[]>([])
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      // 비로그인은 dropdown 자체 미노출. 로컬 birth-info 가 있어도 buttonless
      // — 비로그인 사용자는 메인 페이지에서만 입력 / 저장.
      setLoadOptions([])
      return
    }
    let cancelled = false

    // 즉시 로컬 seed — DB 응답 기다리지 않게.
    const localSeed = getStoredBirthInfo()
    if (localSeed?.birthDate) {
      setLoadOptions([
        {
          key: 'me',
          label: isKo ? '내 정보' : 'My info',
          name: localSeed.name || '',
          birthDate: localSeed.birthDate,
          birthTime:
            localSeed.birthTime && localSeed.birthTime !== '00:00' ? localSeed.birthTime : '',
          timeUnknown: localSeed.birthTimeUnknown === true || localSeed.birthTime === '00:00',
          gender: localSeed.gender || '',
          city: localSeed.city || '',
          latitude: localSeed.latitude ?? null,
          longitude: localSeed.longitude ?? null,
          timeZone: localSeed.timeZone ?? null,
        },
      ])
    }

    const collect = async () => {
      const opts: LoadOption[] = []

      // 내 정보 — DB 프로필 우선
      try {
        const res = await fetch('/api/me/profile')
        if (res.ok) {
          const data = await res.json()
          const u = data?.user
          if (u && (u.birthDate || u.birthTime)) {
            opts.push({
              key: 'me',
              label: isKo ? '내 정보' : 'My info',
              sub: u.name || undefined,
              name: u.name || '',
              birthDate: u.birthDate || '',
              ...timeToState(u.birthTime),
              gender: normGender(u.gender),
              city: u.birthCity || '',
              // 좌표도 같이 실어야 "내 정보" 불러오기 시 도시가 유효하게 들어온다.
              // (빠지면 lat/lon=null → BirthInfoFields 가 "도시 다시 선택" 경고)
              latitude: u.latitude ?? null,
              longitude: u.longitude ?? null,
              timeZone: u.tzId || null,
            })
          }
        }
      } catch {
        /* fall through to local seed */
      }
      if (!opts.some((o) => o.key === 'me')) {
        const local = getStoredBirthInfo()
        if (local?.birthDate) {
          opts.push({
            key: 'me',
            label: isKo ? '내 정보' : 'My info',
            name: local.name || '',
            birthDate: local.birthDate,
            birthTime: local.birthTime && local.birthTime !== '00:00' ? local.birthTime : '',
            timeUnknown: local.birthTimeUnknown === true || local.birthTime === '00:00',
            gender: local.gender || '',
            city: local.city || '',
            latitude: local.latitude ?? null,
            longitude: local.longitude ?? null,
            timeZone: local.timeZone ?? null,
          })
        }
      }

      // 등록된 지인
      try {
        const res = await fetch('/api/me/circle?limit=50')
        if (res.ok) {
          const data = await res.json()
          const people = data?.data?.people
          if (Array.isArray(people)) {
            for (const p of people) {
              if (!p?.name) continue
              opts.push({
                key: `circle-${p.id}`,
                label: p.name,
                sub: p.relation || undefined,
                name: p.name || '',
                birthDate: p.birthDate || '',
                ...timeToState(p.birthTime),
                gender: normGender(p.gender),
                city: p.birthCity || '',
                latitude: p.latitude ?? null,
                longitude: p.longitude ?? null,
                timeZone: p.tzId || null,
              })
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setLoadOptions(opts)
    }

    void collect()
    return () => {
      cancelled = true
    }
  }, [status, isKo])

  // 카드 외부 click 시 dropdown 닫기 — useMyCircle 의 기존 동작 보존.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-circle-dropdown]')) {
        setOpenDropdownIdx(null)
      }
    }
    if (openDropdownIdx !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdownIdx])

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const compatT = useCallback(
    (key: string, fallback: string) => {
      if (!isKo) return t(key, fallback)
      return t(key, KO_FALLBACKS[key] || fallback)
    },
    [isKo, t]
  )

  // 'me' 등 dropdown 옵션을 카드에 그대로 적용. 좌표는 옵션에 함께 들어
  // 있으면 사용 (로컬 birth-info 는 좌표까지 저장하므로). 없으면 카드의
  // 도시 자동완성에서 다시 고르면 됨.
  const handleLoadOption = useCallback(
    (cardIdx: number, opt: LoadOption) => {
      setPersons((prev) => {
        const next = [...prev]
        if (!next[cardIdx]) return prev
        next[cardIdx] = {
          ...next[cardIdx],
          name: opt.name,
          date: opt.birthDate,
          time: opt.timeUnknown ? '00:00' : opt.birthTime,
          timeUnknown: opt.timeUnknown,
          gender:
            opt.gender === 'female' ? 'F' : opt.gender === 'male' ? 'M' : next[cardIdx].gender,
          cityQuery: opt.city,
          lat: opt.latitude ?? null,
          lon: opt.longitude ?? null,
          timeZone: opt.timeZone || next[cardIdx].timeZone,
        }
        return next
      })
    },
    [setPersons]
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
      // 시간 모름 시 '00:00'(자정) 기준 — 앱 전체 컨벤션(types.ts/useCompatibilityForm).
      time: p.time || '00:00',
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
      <div ref={trapRef} className={styles.modal} role="dialog" aria-modal="true" tabIndex={-1}>
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
          <div className={compatStyles.personCardsGrid}>
            {persons.slice(0, 2).map((p, idx) => (
              <PersonCard
                key={idx}
                person={p}
                index={idx}
                isAuthenticated={!!session}
                loadOptions={loadOptions}
                showLoadDropdown={openDropdownIdx === idx}
                locale={normalizedLocale}
                t={compatT}
                onUpdatePerson={updatePerson}
                onSetPersons={setPersons}
                onToggleLoadDropdown={() =>
                  setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)
                }
                onFillFromCircle={fillFromCircle}
                onLoadOption={handleLoadOption}
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
