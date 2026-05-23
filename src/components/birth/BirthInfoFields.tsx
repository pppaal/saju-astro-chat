'use client'

import React from 'react'
import { useCitySearch } from '@/hooks/calendar/useCitySearch'
import { formatCityForDropdown } from '@/lib/cities/formatter'

/**
 * 공용 생년월일 입력 필드. 메인 홈의 BirthInfoModal 디자인을 표준으로 삼아
 * 프로필 / 지인 / 궁합상담사 폼이 모두 같은 구조·동작을 쓰도록 추출했다.
 *
 * 레이아웃(기준 폼과 동일):
 *   1) 생년월일 (date)
 *   2) [ 출생 시간 (time) + 시간 모름 체크 | 성별 (select) ]
 *   3) 출생 도시 (자동완성)
 *
 * 스타일은 `classes` 로 주입한다. 생략하면 기준 폼과 같은 다크 톤(보라 액센트)
 * Tailwind 기본값을 쓴다. 메인 홈은 .module.css 클래스를 넘겨 라이트 모드를
 * 그대로 유지한다.
 *
 * 도시를 고르면 onChange 로 city 표시문자열과 함께 latitude/longitude/timeZone
 * 까지 넘겨, 좌표를 저장하는 폼(지인·궁합)도 그대로 동작한다.
 */

export type BirthGender = 'male' | 'female' | ''

export interface BirthFieldsClasses {
  field?: string
  label?: string
  input?: string
  row?: string
  checkboxLabel?: string
  suggestionList?: string
  suggestionItem?: string
}

export interface BirthFieldsPatch {
  birthDate?: string
  birthTime?: string
  timeUnknown?: boolean
  gender?: BirthGender
  city?: string
  latitude?: number | null
  longitude?: number | null
  timeZone?: string | null
}

interface BirthInfoFieldsProps {
  locale?: 'ko' | 'en'
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  gender: BirthGender
  city: string
  onChange: (patch: BirthFieldsPatch) => void
  classes?: BirthFieldsClasses
  idPrefix?: string
  showCity?: boolean
}

export const birthFieldClasses: Required<BirthFieldsClasses> = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12.5px] font-semibold tracking-[0.02em] text-[rgba(229,231,240,0.78)]',
  input:
    'w-full rounded-xl border border-[rgba(167,139,250,0.22)] bg-[rgba(15,17,35,0.7)] px-3 py-2.5 text-[14px] text-white outline-none transition focus:border-[rgba(167,139,250,0.6)] disabled:cursor-not-allowed disabled:opacity-50',
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel:
    'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[rgba(220,215,255,0.78)]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-violet-400/30 bg-[#0c1024] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]',
  suggestionItem:
    'block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 transition hover:bg-violet-400/15',
}

export function BirthInfoFields({
  locale = 'ko',
  birthDate,
  birthTime,
  timeUnknown,
  gender,
  city,
  onChange,
  classes,
  idPrefix = 'birth',
  showCity = true,
}: BirthInfoFieldsProps) {
  const isKo = locale === 'ko'
  const c = { ...birthFieldClasses, ...classes }
  const id = (k: string) => `${idPrefix}-${k}`

  const {
    suggestions,
    openSug,
    setOpenSug,
    handleCityInputChange,
    handleCitySelect,
  } = useCitySearch(locale)

  const onCityInput = (val: string) => {
    onChange({ city: val, latitude: null, longitude: null, timeZone: null })
    handleCityInputChange(val)
  }
  const onCityPick = (hit: Parameters<typeof handleCitySelect>[0]) => {
    const enriched = handleCitySelect(hit)
    onChange({
      city: formatCityForDropdown(enriched.name, enriched.country, locale),
      latitude: enriched.lat,
      longitude: enriched.lon,
      timeZone: enriched.timezone ?? null,
    })
    setOpenSug(false)
  }

  return (
    <>
      <div className={c.field}>
        <label htmlFor={id('date')} className={c.label}>
          {isKo ? '생년월일' : 'Birth date'}
        </label>
        <input
          id={id('date')}
          type="date"
          className={c.input}
          value={birthDate}
          onChange={(e) => onChange({ birthDate: e.target.value })}
          min="1900-01-01"
          max="2100-12-31"
        />
      </div>

      <div className={c.row}>
        <div className={c.field}>
          <label htmlFor={id('time')} className={c.label}>
            {isKo ? '출생 시간' : 'Birth time'}
          </label>
          <input
            id={id('time')}
            type="time"
            className={c.input}
            value={birthTime}
            disabled={timeUnknown}
            onChange={(e) => {
              const v = e.target.value
              onChange(v ? { birthTime: v, timeUnknown: false } : { birthTime: v })
            }}
          />
          <label className={c.checkboxLabel}>
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) =>
                onChange(
                  e.target.checked ? { timeUnknown: true, birthTime: '' } : { timeUnknown: false },
                )
              }
              style={{ accentColor: '#a78bfa' }}
            />
            {isKo ? '시간 모름 (00:00 처리)' : 'Unknown time (use 00:00)'}
          </label>
        </div>

        <div className={c.field}>
          <label htmlFor={id('gender')} className={c.label}>
            {isKo ? '성별' : 'Gender'}
          </label>
          <select
            id={id('gender')}
            className={c.input}
            value={gender}
            onChange={(e) => onChange({ gender: e.target.value as BirthGender })}
          >
            <option value="">{isKo ? '선택' : 'Select'}</option>
            <option value="male">{isKo ? '남성' : 'Male'}</option>
            <option value="female">{isKo ? '여성' : 'Female'}</option>
          </select>
        </div>
      </div>

      {showCity && (
        <div className={c.field} style={{ position: 'relative' }}>
          <label htmlFor={id('city')} className={c.label}>
            {isKo ? '출생 도시 (선택)' : 'Birth city (optional)'}
          </label>
          <input
            id={id('city')}
            type="text"
            className={c.input}
            value={city}
            onChange={(e) => onCityInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpenSug(true)}
            onBlur={() => setTimeout(() => setOpenSug(false), 150)}
            placeholder={isKo ? '예: 서울' : 'e.g. Seoul'}
            autoComplete="off"
          />
          {openSug && suggestions.length > 0 && (
            <ul role="listbox" className={c.suggestionList} style={{ listStyle: 'none', margin: 0 }}>
              {suggestions.slice(0, 8).map((s, i) => (
                <li key={`${s.name}-${s.country}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onCityPick(s)}
                    className={c.suggestionItem}
                  >
                    {formatCityForDropdown(s.name, s.country, locale)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

export default BirthInfoFields
