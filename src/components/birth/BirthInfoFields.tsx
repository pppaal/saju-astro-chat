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
  // 체크박스 input 자체 className. light 카드(궁합)에선 흰 박스 + 골드
  // 체크가 자연스럽고, dark 폼에선 보라 accent 가 어울림.
  checkbox?: string
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
  // iOS Safari 는 font-size < 16px input/select 를 탭하면 자동 줌인 처리하는데,
  // 이 과정에서 첫 탭이 picker 열기로 안 이어지고 무시되는 케이스가 있다.
  // 16px 로 맞춰 줌 자체를 방지 — Apple HIG 권장.
  input:
    'w-full rounded-xl border border-[rgba(167,139,250,0.22)] bg-[rgba(15,17,35,0.7)] px-3 py-2.5 text-[16px] text-white outline-none transition focus:border-[rgba(167,139,250,0.6)] disabled:cursor-not-allowed disabled:opacity-50',
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel:
    'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[rgba(220,215,255,0.78)]',
  checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a78bfa]',
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

  const { suggestions, openSug, setOpenSug, handleCityInputChange, handleCitySelect } =
    useCitySearch(locale)
  // 도시 dropdown 선택 시 키보드(모바일 soft keyboard)를 닫기 위해 input
  // 자체 ref. 사용자: "도시 선택하면 키보드 없어져야하는데" — focus 가
  // input 에 남아 있어서 키보드가 계속 떠 있던 회귀.
  const cityInputRef = React.useRef<HTMLInputElement>(null)

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
    // 모바일 키보드 dismiss — 도시 확정 후 다음 필드로 자연스럽게 넘어가게.
    cityInputRef.current?.blur()
  }

  return (
    <>
      <div className={c.field}>
        <label htmlFor={id('date-year')} className={c.label}>
          {isKo ? '생년월일' : 'Birth date'}
        </label>
        <DateThreeSelect
          locale={locale}
          idPrefix={id('date')}
          value={birthDate}
          onChange={(v) => onChange({ birthDate: v })}
          inputClass={c.input}
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
              className={c.checkbox}
              checked={timeUnknown}
              onChange={(e) =>
                onChange(
                  e.target.checked ? { timeUnknown: true, birthTime: '' } : { timeUnknown: false }
                )
              }
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
            ref={cityInputRef}
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
            <ul
              role="listbox"
              className={c.suggestionList}
              style={{ listStyle: 'none', margin: 0 }}
            >
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

/**
 * Native <select> 3 칸으로 연/월/일 입력. 커스텀 button+popover 로
 * 바꿔봤으나 일부 Android 브라우저에서 안 눌리는 회귀가 있어 native
 * 로 복귀. iOS 의 backdrop-filter+select picker 버그는 모달 overlay
 * 의 backdrop-filter 를 제거하는 방향으로 별도 해결.
 *
 * 외부 인터페이스: ISO 'YYYY-MM-DD' 문자열을 in/out 으로 그대로 사용 →
 * 상위 폼 로직은 변경 없음.
 */
function DateThreeSelect({
  locale,
  idPrefix,
  value,
  onChange,
  inputClass,
}: {
  locale: 'ko' | 'en'
  idPrefix: string
  value: string
  onChange: (v: string) => void
  inputClass: string
}) {
  const isKo = locale === 'ko'

  // 핵심: y/m/d 부분 상태를 component 안에 유지한다. 상위 폼은 ISO 한
  // 줄("YYYY-MM-DD") 로만 받기 때문에, 사용자가 년만 골랐을 때
  // onChange('') 로 다시 리셋하면 선택이 즉시 사라져 "선택이 안 된다"는
  // 증상이 나옴. 부분 상태는 local 로 갖고 3 개 다 채워졌을 때만 ISO 로
  // emit. 부모가 외부에서 birthDate 를 set 하면 sync.
  const [year, setYear] = React.useState<number | ''>('')
  const [month, setMonth] = React.useState<number | ''>('')
  const [day, setDay] = React.useState<number | ''>('')

  // 부모의 value 가 바뀌면 local 동기화. ISO 문자열이 있으면 파싱해서
  // y/m/d 채우고, 비어있으면 local 도 비움.
  React.useEffect(() => {
    const parsed = parseISODate(value)
    setYear(parsed?.y ?? '')
    setMonth(parsed?.m ?? '')
    setDay(parsed?.d ?? '')
  }, [value])

  const currentYear = new Date().getFullYear()
  // 1900 ~ 올해. 출생연도이므로 미래는 불필요. 최신 연도부터 내려가게 정렬.
  const years: number[] = []
  for (let y = currentYear; y >= 1900; y--) years.push(y)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const maxDay = year && month ? daysInMonth(Number(year), Number(month)) : 31
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  const emit = (y: number | '', m: number | '', d: number | '') => {
    setYear(y)
    setMonth(m)
    setDay(d)
    if (y === '' || m === '' || d === '') {
      // 부분 선택 — 상위로는 전달 안 함 (이전 값이 있더라도 일부러 안 지우는
      // 게 자연스럽지만, "Year 만 다시 골랐을 때 이전 month/day 가 살아있는"
      // 상태 일관성이 더 중요해서 비어있다고 알려준다).
      onChange('')
      return
    }
    // month 변경으로 day 가 새 maxDay 를 넘으면 clamp.
    const dMax = daysInMonth(Number(y), Number(m))
    const dClamped = Math.min(Number(d), dMax)
    if (dClamped !== Number(d)) setDay(dClamped)
    onChange(
      `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(dClamped).padStart(2, '0')}`
    )
  }

  // CSS module 의 .modalInput 는 width:100% 가 없어서 native <select> 가
  // intrinsic width 로 작게 보일 수 있음 → 모든 select 에 inline width:100%
  // 명시. 데스크탑/모바일 일관 동작.
  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        id={`${idPrefix}-year`}
        className={inputClass}
        style={{ width: '100%' }}
        value={year}
        onChange={(e) =>
          emit(
            e.target.value ? Number(e.target.value) : '',
            month === '' ? '' : Number(month),
            day === '' ? '' : Number(day)
          )
        }
        aria-label={isKo ? '년' : 'Year'}
      >
        <option value="">{isKo ? '년' : 'Year'}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-month`}
        className={inputClass}
        style={{ width: '100%' }}
        value={month}
        onChange={(e) =>
          emit(
            year === '' ? '' : Number(year),
            e.target.value ? Number(e.target.value) : '',
            day === '' ? '' : Number(day)
          )
        }
        aria-label={isKo ? '월' : 'Month'}
      >
        <option value="">{isKo ? '월' : 'Month'}</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {isKo ? `${m}월` : m}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-day`}
        className={inputClass}
        style={{ width: '100%' }}
        value={day}
        onChange={(e) =>
          emit(
            year === '' ? '' : Number(year),
            month === '' ? '' : Number(month),
            e.target.value ? Number(e.target.value) : ''
          )
        }
        aria-label={isKo ? '일' : 'Day'}
      >
        <option value="">{isKo ? '일' : 'Day'}</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {isKo ? `${d}일` : d}
          </option>
        ))}
      </select>
    </div>
  )
}

function parseISODate(v: string): { y: number; m: number; d: number } | null {
  if (!v) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || !mo || !d) return null
  return { y, m: mo, d }
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export default BirthInfoFields
