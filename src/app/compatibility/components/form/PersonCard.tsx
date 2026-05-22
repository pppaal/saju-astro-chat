import React, { useState, useCallback, useEffect } from 'react'
import { User, Users, ChevronDown, Loader2 } from 'lucide-react'
import { type PersonForm, type Relation } from '../../lib/types'
import { useCitySearch } from '@/hooks/calendar/useCitySearch'
import { formatCityForDropdown } from '@/lib/cities/formatter'
import type { CirclePerson } from '@/hooks/useMyCircle'
import type { CityResult } from '@/lib/cities/types'
import DateTimePicker from '@/components/ui/DateTimePicker'
import TimePicker from '@/components/ui/TimePicker'

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
  onPickCity: (idx: number, city: CityResult) => void
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
    onPickCity,
    onToggleCircleDropdown,
    onFillFromCircle,
  }) => {
    const idx = index
    const isKo = locale === 'ko' || locale.startsWith('ko')
    const [profileLoading, setProfileLoading] = useState(false)
    const timeUnknown = person.timeUnknown ?? (!person.time || person.time === '00:00')
    const setTimeUnknown = useCallback(
      (value: boolean) => onUpdatePerson(idx, 'timeUnknown', value),
      [idx, onUpdatePerson],
    )
    useEffect(() => {
      if (timeUnknown && person.time !== '00:00') {
        onUpdatePerson(idx, 'time', '00:00')
      }
    }, [timeUnknown, person.time, idx, onUpdatePerson])

    // City autocomplete — 우리 hook 직접 사용. PersonForm.suggestions를 같이
    // sync해서 onSetPersons 흐름과 충돌 X. blur 시 dropdown 닫힘.
    const {
      suggestions: hookSuggestions,
      openSug,
      setOpenSug,
      handleCityInputChange,
      handleCitySelect: pickCity,
    } = useCitySearch(locale)

    const onCityInput = (val: string) => {
      onSetPersons((prev) => {
        const next = [...prev]
        next[idx] = { ...next[idx], cityQuery: val, lat: null, lon: null }
        return next
      })
      handleCityInputChange(val)
    }
    const onCityPick = (city: Parameters<typeof pickCity>[0]) => {
      const enriched = pickCity(city)
      // 기존 onPickCity 흐름 유지 — useCompatibilityForm이 lat/lon/timeZone을 채움.
      onPickCity(idx, {
        name: enriched.name,
        country: enriched.country,
        lat: enriched.lat,
        lon: enriched.lon,
        timezone: enriched.timezone,
      } as unknown as CityResult)
      setOpenSug(false)
    }

    const loadMyProfile = useCallback(async () => {
      setProfileLoading(true)
      try {
        const res = await fetch('/api/me/profile')
        if (!res.ok) return
        const data = await res.json()
        const user = data.user
        if (!user) return

        let lat: number | null = null
        let lon: number | null = null
        if (user.birthCity) {
          try {
            const cityRes = await fetch(
              `/api/cities?q=${encodeURIComponent(user.birthCity)}&limit=1`,
              { headers: { 'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '' } },
            )
            if (cityRes.ok) {
              const cityData = await cityRes.json()
              const cities = cityData.results || cityData.cities || cityData.data || []
              if (Array.isArray(cities) && cities.length > 0) {
                lat = cities[0].lat ?? cities[0].latitude ?? null
                lon = cities[0].lon ?? cities[0].longitude ?? null
              }
            }
          } catch { /* ignore */ }
        }

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
            lat,
            lon,
            timeZone: user.tzId || next[idx].timeZone,
          }
          return next
        })
      } catch { /* ignore */ } finally {
        setProfileLoading(false)
      }
    }, [idx, onSetPersons])

    const personLabel = idx === 0 ? t('compatibilityPage.person1', '나') : t('compatibilityPage.person2', '상대')

    return (
      <div className="rounded-[22px] border border-violet-400/25 bg-gradient-to-b from-[#0c1024] to-[#07091a] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        {/* 헤더 — 라벨 + 불러오기 버튼들. 톤은 BirthInfoModal 매칭
            (보라 그라데이션, 진한 navy 카드). 지인 추가 CTA 는 제거
            (불러오기만 유지) — /profile 에서 추가하도록 분리. */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white">
              {idx === 0 ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <h3 className="text-[15px] font-semibold text-white">
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
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11.5px] font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-400/15 disabled:opacity-50"
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
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[11.5px] font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-400/15"
                >
                  <Users className="h-3 w-3" />
                  {t('compatibilityPage.fromCircle', 'My people')}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showCircleDropdown && (
                  <ul className="absolute right-0 z-20 mt-1 max-h-56 w-56 overflow-auto rounded-xl border border-violet-400/25 bg-[#0c1024] shadow-xl">
                    {circlePeople.length === 0 ? (
                      <li className="px-3 py-2.5 text-[12px] leading-relaxed text-slate-400">
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
                            className="block w-full px-3 py-2 text-left text-[13px] text-slate-200 transition hover:bg-violet-400/10"
                          >
                            <span className="font-medium">{cp.name}</span>
                            {cp.relation && (
                              <span className="ml-1.5 text-[11px] text-slate-400">· {cp.relation}</span>
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

          {/* 생년월일 — 운명상담사 입장폼과 동일한 wheel picker로 통일.
              type='date' native picker는 iOS Safari에서 회색 줄에 가까운
              모양이라 "옛날 폼" 인상을 줬음. */}
          <Field label={t('compatibilityPage.dateOfBirth', '생년월일')} required>
            <DateTimePicker
              value={person.date}
              onChange={(date) => onUpdatePerson(idx, 'date', date)}
              locale={isKo ? 'ko' : 'en'}
            />
          </Field>

          {/* 성별 */}
          <Field label={t('compatibilityPage.gender', '성별')} required>
            <div className="grid grid-cols-2 gap-2">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onUpdatePerson(idx, 'gender', g as PersonForm['gender'])}
                  className={
                    person.gender === g
                      ? 'rounded-xl border-none bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] px-4 py-2.5 text-[14px] font-semibold text-white shadow transition'
                      : 'rounded-xl border border-violet-400/15 bg-white/[0.03] px-4 py-2.5 text-[14px] text-slate-300 transition hover:border-violet-400/35 hover:text-white'
                  }
                >
                  {g === 'M' ? t('compatibilityPage.male', '남자') : t('compatibilityPage.female', '여자')}
                </button>
              ))}
            </div>
          </Field>

          {/* 시간 — 운명상담사와 동일한 12시간 wheel picker */}
          <Field label={t('compatibilityPage.timeOfBirth', '태어난 시간')}>
            <TimePicker
              value={timeUnknown ? '' : person.time}
              onChange={(time) => onUpdatePerson(idx, 'time', time)}
              disabled={timeUnknown}
              locale={isKo ? 'ko' : 'en'}
            />
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12.5px] text-slate-300">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-violet-400"
              />
              <span>{t('compatibilityPage.timeUnknown', '시간 모름 (00:00 처리)')}</span>
            </label>
          </Field>

          {/* 도시 */}
          <Field label={t('compatibilityPage.birthCity', '태어난 도시')}>
            <div className="relative">
              <input
                type="text"
                value={person.cityQuery}
                onChange={(e) => onCityInput(e.target.value)}
                onFocus={() => hookSuggestions.length > 0 && setOpenSug(true)}
                placeholder={t('compatibilityPage.cityPlaceholder', '도시명 (예: Seoul)')}
                className={inputClass}
                autoComplete="off"
              />
              {openSug && hookSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-violet-400/25 bg-[#0c1024] shadow-lg">
                  {hookSuggestions.slice(0, 8).map((city, i) => (
                    <li key={`${city.name}-${city.country}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onCityPick(city)}
                        className="block w-full px-3 py-2 text-left text-[13px] text-slate-200 transition hover:bg-violet-400/10"
                      >
                        {formatCityForDropdown(city.name, city.country, isKo ? 'ko' : 'en')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

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

// BirthInfoModal 의 .modalInput 톤 매칭 — 보라 액센트, 진한 navy bg.
const inputClass =
  'w-full rounded-xl border border-violet-400/22 bg-[rgba(15,17,35,0.7)] px-3 py-2.5 text-[14px] text-white placeholder:text-slate-400 focus:border-violet-300/60 focus:outline-none disabled:cursor-not-allowed transition'

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
      <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.02em] text-slate-200/85">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  )
}
