import React, { useState, useCallback, useEffect } from 'react'
import { User, Users, ChevronDown, Loader2 } from 'lucide-react'
import { type PersonForm, type Relation } from '../../lib/types'
import type { CirclePerson } from '@/hooks/useMyCircle'
import { BirthInfoFields, type BirthFieldsClasses, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'

interface PersonCardProps {
  person: PersonForm
  index: number
  isAuthenticated: boolean
  circlePeople: CirclePerson[]
  showCircleDropdown: boolean
  locale: string
  t: (key: string, fallback: string) => string
  onUpdatePerson: <K extends keyof PersonForm>(idx: number, field: K, value: PersonForm[K]) => void
  onSetPersons: React.Dispatch<React.SetStateAction<PersonForm[]>>
  onToggleCircleDropdown: () => void
  onFillFromCircle: (idx: number, person: CirclePerson) => void
}

/**
 * Compatibility 페이지의 한 사람 입력 카드.
 *
 * 이전엔 Compatibility.module.css의 light/legacy 디자인을 썼지만 페이지
 * 톤이 다크라 시각이 어긋났음. ProfileEditModal / CircleAddModal과 동일한
 * 패턴(Tailwind dark + Field 헬퍼 + useCitySearch 직접)으로 재작성.
 *
 * 보존 기능:
 *  - 내 프로필 불러오기 (idx === 0만)
 *  - 내 지인 불러오기 dropdown
 *  - 시간 모름 옵션
 *  - 도시 autocomplete (useCitySearch)
 *  - 두 번째 사람: 관계 + 메모
 */
export const PersonCard = React.memo<PersonCardProps>(
  ({
    person,
    index,
    isAuthenticated,
    circlePeople,
    showCircleDropdown,
    locale,
    t,
    onUpdatePerson,
    onSetPersons,
    onToggleCircleDropdown,
    onFillFromCircle,
  }) => {
    const idx = index
    const isKo = locale === 'ko' || locale.startsWith('ko')
    const [profileLoading, setProfileLoading] = useState(false)
    const timeUnknown = person.timeUnknown ?? (!person.time || person.time === '00:00')
    useEffect(() => {
      if (timeUnknown && person.time !== '00:00') {
        onUpdatePerson(idx, 'time', '00:00')
      }
    }, [timeUnknown, person.time, idx, onUpdatePerson])

    const genderForField =
      person.gender === 'F' || person.gender === 'Female'
        ? 'female'
        : person.gender === 'M' || person.gender === 'Male'
          ? 'male'
          : ''

    // 공용 BirthInfoFields → PersonForm 매핑. 도시 좌표(lat/lon/timeZone)는
    // 사용자가 자동완성에서 도시를 고르면 patch 로 함께 들어온다.
    const onBirthChange = (patch: BirthFieldsPatch) => {
      onSetPersons((prev) => {
        const next = [...prev]
        const p = { ...next[idx] }
        if (patch.birthDate !== undefined) p.date = patch.birthDate
        if (patch.birthTime !== undefined) p.time = patch.birthTime
        if (patch.timeUnknown !== undefined) p.timeUnknown = patch.timeUnknown
        if (patch.gender) p.gender = patch.gender === 'female' ? 'F' : 'M'
        if (patch.city !== undefined) p.cityQuery = patch.city
        if (patch.latitude !== undefined) p.lat = patch.latitude
        if (patch.longitude !== undefined) p.lon = patch.longitude
        if (patch.timeZone !== undefined && patch.timeZone) p.timeZone = patch.timeZone
        next[idx] = p
        return next
      })
    }

    const loadMyProfile = useCallback(async () => {
      setProfileLoading(true)
      try {
        const res = await fetch('/api/me/profile')
        if (!res.ok) return
        const data = await res.json()
        const user = data.user
        if (!user) return

        // 텍스트 필드는 즉시 채운다 — 도시 지오코딩(lat/lon)을 기다리지 않음.
        // 프로필엔 좌표가 저장돼 있지 않아 매번 /api/cities 를 호출해야 하는데,
        // 그걸 await 하면 폼이 그만큼 늦게 채워져 "느리게" 느껴짐.
        onSetPersons((prev) => {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            name: user.name || next[idx].name,
            date: user.birthDate || '',
            time: user.birthTime || '',
            gender:
              user.gender === 'female' || user.gender === 'F'
                ? 'F'
                : user.gender === 'male' || user.gender === 'M'
                  ? 'M'
                  : next[idx].gender,
            cityQuery: user.birthCity || '',
            lat: null,
            lon: null,
            timeZone: user.tzId || next[idx].timeZone,
          }
          return next
        })

        // 좌표는 백그라운드로 해석 후 패치 — 스피너/폼을 막지 않는다.
        if (user.birthCity) {
          void (async () => {
            try {
              const cityRes = await fetch(
                `/api/cities?q=${encodeURIComponent(user.birthCity)}&limit=1`,
                { headers: { 'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '' } },
              )
              if (!cityRes.ok) return
              const cityData = await cityRes.json()
              const cities = cityData.results || cityData.cities || cityData.data || []
              if (!Array.isArray(cities) || cities.length === 0) return
              const lat = cities[0].lat ?? cities[0].latitude ?? null
              const lon = cities[0].lon ?? cities[0].longitude ?? null
              onSetPersons((prev) => {
                const next = [...prev]
                // 사용자가 그새 도시를 바꿨으면 덮어쓰지 않는다.
                if (next[idx].cityQuery !== user.birthCity) return prev
                next[idx] = { ...next[idx], lat, lon }
                return next
              })
            } catch { /* ignore */ }
          })()
        }
      } catch { /* ignore */ } finally {
        setProfileLoading(false)
      }
    }, [idx, onSetPersons])

    const personLabel = idx === 0 ? t('compatibilityPage.person1', '나') : t('compatibilityPage.person2', '상대')

    // Person 1 = rose, Person 2 = sky — the same A/B encoding used by the
    // chart overlays, so the form and the chart read as the same two people.
    const avatarTone = idx === 0 ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'

    return (
      <div className="rounded-[22px] border border-[#e7e4df] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_rgba(28,25,23,0.06)]">
        {/* 헤더 — 라벨 + 불러오기 버튼. 라이트 프리미엄 톤(화이트 카드,
            잉크 텍스트, 헤어라인 보더). 지인 추가 CTA 는 /profile 로 분리. */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarTone}`}>
              {idx === 0 ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <h3 className="text-[15px] font-semibold text-[#1c1917]">
              {personLabel}
            </h3>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-1.5">
              {idx === 0 && (
                <button
                  type="button"
                  onClick={loadMyProfile}
                  disabled={profileLoading}
                  className="inline-flex items-center gap-1 rounded-full border border-[#e0ddd7] bg-white px-3 py-1 text-[11.5px] font-medium text-[#44403c] transition hover:border-[#c9c4bc] hover:bg-[#faf9f7] disabled:opacity-50"
                >
                  {profileLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {t('compatibilityPage.loadMyProfile', '내 프로필')}
                </button>
              )}
              {/* `data-circle-dropdown` 필수: useMyCircle 의 document
                  click listener 가 이 attr 의 ancestor 아니면 dropdown
                  닫음. 빼면 첫 클릭에 닫혀서 selection 실패. */}
              <div className="relative" data-circle-dropdown>
                <button
                  type="button"
                  onClick={onToggleCircleDropdown}
                  className="inline-flex items-center gap-1 rounded-full border border-[#e0ddd7] bg-white px-3 py-1 text-[11.5px] font-medium text-[#44403c] transition hover:border-[#c9c4bc] hover:bg-[#faf9f7]"
                >
                  <Users className="h-3 w-3" />
                  {t('compatibilityPage.fromCircle', 'My people')}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showCircleDropdown && (
                  <ul className="absolute right-0 z-20 mt-1 max-h-56 w-56 overflow-auto rounded-xl border border-[#e7e4df] bg-white shadow-[0_16px_40px_rgba(28,25,23,0.12)]">
                    {circlePeople.length === 0 ? (
                      <li className="px-3 py-2.5 text-[12px] leading-relaxed text-[#a8a29e]">
                        {isKo
                          ? '저장된 지인이 없어요. 내 프로필에서 지인을 추가해 보세요.'
                          : 'No saved people yet. Add people from your profile.'}
                      </li>
                    ) : (
                      circlePeople.map((cp) => (
                        <li key={cp.id}>
                          <button
                            type="button"
                            onClick={() => onFillFromCircle(idx, cp)}
                            className="block w-full px-3 py-2 text-left text-[13px] text-[#44403c] transition hover:bg-[#f5f4f1]"
                          >
                            <span className="font-medium">{cp.name}</span>
                            {cp.relation && (
                              <span className="ml-1.5 text-[11px] text-[#a8a29e]">· {cp.relation}</span>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* 이름 */}
          <Field label={t('compatibilityPage.name', '이름')} required>
            <input
              type="text"
              value={person.name}
              onChange={(e) => onUpdatePerson(idx, 'name', e.target.value)}
              placeholder={t('compatibilityPage.namePlaceholder', '이름')}
              className={inputClass}
              required
            />
          </Field>

          {/* 생년월일 / 시간+성별 / 도시 — 메인 홈 BirthInfoModal 과 동일한
              공용 컴포넌트(네이티브 date/time + 성별 select). */}
          <BirthInfoFields
            locale={isKo ? 'ko' : 'en'}
            idPrefix={`person-${idx}`}
            birthDate={person.date}
            birthTime={timeUnknown ? '' : person.time}
            timeUnknown={timeUnknown}
            gender={genderForField}
            city={person.cityQuery}
            onChange={onBirthChange}
            classes={lightFieldClasses}
          />

          {/* 두 번째 사람 — 관계 + 메모 */}
          {idx > 0 && (
            <>
              <Field label={t('compatibilityPage.relationToPerson1', '나와의 관계')}>
                <select
                  value={person.relation ?? ''}
                  onChange={(e) => onUpdatePerson(idx, 'relation', e.target.value as Relation)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="">{t('compatibilityPage.selectRelation', '선택')}</option>
                  <option value="lover">{t('compatibilityPage.partnerLover', '연인 💕')}</option>
                  <option value="spouse">{t('compatibilityPage.spouse', '배우자 💍')}</option>
                  <option value="family">{t('compatibilityPage.family', '가족 🏠')}</option>
                  <option value="sibling">{t('compatibilityPage.sibling', '형제자매 👯')}</option>
                  <option value="friend">{t('compatibilityPage.friend', '친구 🤝')}</option>
                  <option value="colleague">{t('compatibilityPage.colleague', '동료 💼')}</option>
                  <option value="other">{t('compatibilityPage.other', '기타 ✨')}</option>
                </select>
              </Field>
              <Field label={t('compatibilityPage.relationNote', '메모 (선택)')}>
                <input
                  type="text"
                  value={person.relationNote ?? ''}
                  onChange={(e) => onUpdatePerson(idx, 'relationNote', e.target.value)}
                  placeholder={t('compatibilityPage.shortNote', '짧은 메모')}
                  className={inputClass}
                  maxLength={60}
                />
              </Field>
            </>
          )}
        </div>
      </div>
    )
  },
)

PersonCard.displayName = 'PersonCard'

// Premium light field styling — white inputs, hairline borders, ink text.
// Matches the profile modals; passed to BirthInfoFields so the shared
// (dark-default) form reads correctly on the white card.
const inputClass =
  'w-full rounded-xl border border-[#e0ddd7] bg-white px-3 py-2.5 text-[14px] text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#a07a3c] focus:outline-none disabled:cursor-not-allowed transition'

const lightFieldClasses: Required<BirthFieldsClasses> = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12px] font-semibold tracking-[0.02em] text-[#57534e]',
  input: inputClass,
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel: 'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[#57534e]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-[#e7e4df] bg-white p-1 shadow-[0_16px_40px_rgba(28,25,23,0.12)]',
  suggestionItem:
    'block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#44403c] transition hover:bg-[#f5f4f1]',
}

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
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.02em] text-[#57534e]">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}
