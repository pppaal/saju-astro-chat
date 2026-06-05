import React, { useEffect } from 'react'
import { User, Users, ChevronDown, Download } from 'lucide-react'
import { type PersonForm, type Relation } from '../../lib/types'
import type { CirclePerson } from '@/hooks/useMyCircle'
import {
  BirthInfoFields,
  type BirthFieldsClasses,
  type BirthFieldsPatch,
} from '@/components/birth/BirthInfoFields'

/**
 * 메인 페이지 BirthInfoModal 과 동일한 "저장된 정보 불러오기" 패턴.
 * "내 정보" + 등록된 지인을 한 dropdown 에 묶어서 카드별로 단일 트리거.
 * 두 버튼 따로 두는 옛 패턴은 사용자가 "어디서 본인 정보를 불러와야 하는지"
 * 헷갈렸다.
 */
export interface LoadOption {
  key: string
  label: string
  sub?: string
  name: string
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  gender: 'male' | 'female' | ''
  city: string
  latitude?: number | null
  longitude?: number | null
  timeZone?: string | null
}

interface PersonCardProps {
  person: PersonForm
  index: number
  isAuthenticated: boolean
  /** 카드별 dropdown 옵션. CompatPersonPickerModal 에서 한 번만 fetch 해서 두 카드에 같이 넘김. */
  loadOptions: LoadOption[]
  showLoadDropdown: boolean
  locale: string
  t: (key: string, fallback: string) => string
  onUpdatePerson: <K extends keyof PersonForm>(idx: number, field: K, value: PersonForm[K]) => void
  onSetPersons: React.Dispatch<React.SetStateAction<PersonForm[]>>
  onToggleLoadDropdown: () => void
  /** 옛 API — circle 항목 1건 선택 시 호출. 새 'me' 항목은 onLoadOption 으로 분리. */
  onFillFromCircle: (idx: number, person: CirclePerson) => void
  /** 'me' 옵션 등 dropdown 항목 선택 시 호출. */
  onLoadOption: (idx: number, option: LoadOption) => void
}

/**
 * Compatibility 페이지의 한 사람 입력 카드.
 *
 * 핵심 필드는 공용 BirthInfoFields 로 통일 (메인 홈 BirthInfoModal 과 동일).
 * "저장된 정보 불러오기" 패턴도 메인과 동일 — 별도 "내 정보" / "내 지인"
 * 버튼 2개를 단일 dropdown 으로 통합.
 */
export const PersonCard = React.memo<PersonCardProps>(
  ({
    person,
    index,
    isAuthenticated,
    loadOptions,
    showLoadDropdown,
    locale,
    t,
    onUpdatePerson,
    onSetPersons,
    onToggleLoadDropdown,
    onFillFromCircle,
    onLoadOption,
  }) => {
    const idx = index
    const isKo = locale === 'ko' || locale.startsWith('ko')
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

    const personLabel =
      idx === 0 ? t('compatibilityPage.person1', 'Me') : t('compatibilityPage.person2', 'Partner')

    // Person 1 = rose, Person 2 = sky — the same A/B encoding used by the
    // chart overlays, so the form and the chart read as the same two people.
    const avatarTone = idx === 0 ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'

    return (
      <div className="rounded-[22px] border border-[#e7e5e4] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_rgba(28,25,23,0.06)]">
        {/* 헤더 — 라벨 + 불러오기 dropdown. 메인 홈 BirthInfoModal 과 동일
            패턴 (단일 트리거 + dropdown). 옛 두 버튼 ('내 정보' + '내 지인')
            은 사용자가 헷갈려서 단일화. */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarTone}`}>
              {idx === 0 ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <h3 className="text-[15px] font-semibold text-[#1c1917]">{personLabel}</h3>
          </div>

          {isAuthenticated && loadOptions.length > 0 && (
            <div className="relative" data-circle-dropdown>
              <button
                type="button"
                onClick={onToggleLoadDropdown}
                className="inline-flex items-center gap-1 rounded-full border border-[#e0ddd7] bg-white px-3 py-1 text-[11.5px] font-medium text-[#44403c] transition hover:border-[#c9c4bc] hover:bg-[#faf9f7]"
              >
                <Download className="h-3 w-3" />
                {t('compatibilityPage.loadSaved', 'Load saved info')}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showLoadDropdown && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-20 mt-1 max-h-56 w-60 overflow-auto rounded-xl border border-[#e7e5e4] bg-white shadow-[0_16px_40px_rgba(28,25,23,0.12)]"
                >
                  {loadOptions.map((o) => (
                    <li key={o.key}>
                      <button
                        type="button"
                        onClick={() => {
                          // 'me' 옵션은 새 onLoadOption (로컬 + DB 통합), 나머지
                          // (지인) 는 옛 onFillFromCircle 경로로 유지 — 지인
                          // 측은 SavedPerson 매핑 / 관계 매핑 로직이 따로라
                          // 1:1 교체가 위험.
                          if (o.key === 'me') {
                            onLoadOption(idx, o)
                          } else {
                            const circle: CirclePerson = {
                              id: o.key.replace(/^circle-/, ''),
                              name: o.name,
                              relation: o.sub || '',
                              birthDate: o.birthDate || null,
                              birthTime: o.timeUnknown ? null : o.birthTime || null,
                              gender: o.gender || null,
                              birthCity: o.city || null,
                              latitude: o.latitude ?? null,
                              longitude: o.longitude ?? null,
                              tzId: o.timeZone ?? null,
                            }
                            onFillFromCircle(idx, circle)
                          }
                          onToggleLoadDropdown()
                        }}
                        className="block w-full px-3 py-2 text-left text-[13px] text-[#44403c] transition hover:bg-[#f5f4f1]"
                      >
                        <span className="font-medium">{o.label}</span>
                        {o.sub && (
                          <span className="ml-1.5 text-[11px] text-[#a8a29e]">· {o.sub}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* 이름 */}
          <Field label={t('compatibilityPage.name', 'Name')} required>
            <input
              type="text"
              value={person.name}
              onChange={(e) => onUpdatePerson(idx, 'name', e.target.value)}
              placeholder={t('compatibilityPage.namePlaceholder', 'Name')}
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
            latitude={person.lat}
            onChange={onBirthChange}
            classes={lightFieldClasses}
          />

          {/* 두 번째 사람 — 관계 선택. '기타'를 고를 때만 자유 서술 필드를
              노출하고, 그 텍스트가 그대로 상담 프롬트에 들어간다
              (route.ts relationLabel 가 other일 때 note 를 사용). */}
          {idx > 0 && (
            <>
              <Field label={t('compatibilityPage.relationToPerson1', 'Relation to Person 1')}>
                <select
                  value={person.relation ?? ''}
                  onChange={(e) => onUpdatePerson(idx, 'relation', e.target.value as Relation)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="">{t('compatibilityPage.selectRelation', 'Select')}</option>
                  <option value="lover">
                    {t('compatibilityPage.partnerLover', 'Partner / Lover 💕')}
                  </option>
                  <option value="crush">{t('compatibilityPage.crush', 'Crush / Talking 💗')}</option>
                  <option value="spouse">{t('compatibilityPage.spouse', 'Spouse 💍')}</option>
                  <option value="engaged">{t('compatibilityPage.engaged', 'Engaged 💐')}</option>
                  <option value="ex">{t('compatibilityPage.ex', 'Ex 💔')}</option>
                  <option value="family">{t('compatibilityPage.family', 'Family 🏠')}</option>
                  <option value="sibling">{t('compatibilityPage.sibling', 'Sibling 👯')}</option>
                  <option value="friend">{t('compatibilityPage.friend', 'Friend 🤝')}</option>
                  <option value="colleague">
                    {t('compatibilityPage.colleague', 'Colleague 💼')}
                  </option>
                  <option value="business">
                    {t('compatibilityPage.business', 'Business partner 🤝')}
                  </option>
                  <option value="other">
                    {t('compatibilityPage.other', 'Other / describe freely ✨')}
                  </option>
                </select>
              </Field>
              {person.relation === 'other' && (
                <Field label={t('compatibilityPage.relationNote', 'Describe the relationship')}>
                  <textarea
                    value={person.relationNote ?? ''}
                    onChange={(e) => onUpdatePerson(idx, 'relationNote', e.target.value)}
                    placeholder={t(
                      'compatibilityPage.shortNote',
                      'Describe how you two relate (used in the reading)'
                    )}
                    className={inputClass + ' min-h-[84px] resize-none leading-relaxed'}
                    rows={3}
                    maxLength={300}
                  />
                </Field>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
)

PersonCard.displayName = 'PersonCard'

// Premium light field styling — white inputs, hairline borders, ink text.
// Matches the profile modals; passed to BirthInfoFields so the shared
// (dark-default) form reads correctly on the white card.
// 16px — iOS Safari 자동 줌(< 16px) 으로 select 첫 탭이 무시되는 버그 방지.
const inputClass =
  'w-full rounded-xl border border-[#e0ddd7] bg-white px-3 py-2.5 text-[16px] text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#a07a3c] focus:outline-none disabled:cursor-not-allowed transition'

const lightFieldClasses: Required<BirthFieldsClasses> = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12px] font-semibold tracking-[0.02em] text-[#57534e]',
  input: inputClass,
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel: 'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[#57534e]',
  // 흰 카드와 어울리도록 흰 박스 + 골드 accent. [color-scheme:light] 로
  // OS 다크모드에서도 흰색 native 체크박스를 강제.
  checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a07a3c] [color-scheme:light]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-[#e7e5e4] bg-white p-1 shadow-[0_16px_40px_rgba(28,25,23,0.12)]',
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
