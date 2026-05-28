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
        <label htmlFor={id('date-year')} className={c.label}>
          {isKo ? '생년월일' : 'Birth date'}
        </label>
        <DateThreeSelect
          locale={locale}
          idPrefix={id('date')}
          value={birthDate}
          onChange={(v) => onChange({ birthDate: v })}
          inputClass={c.input}
          popoverListClass={c.suggestionList}
          popoverItemClass={c.suggestionItem}
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
 * 연/월/일 커스텀 dropdown 3칸. native <select> 가 아니라 button +
 * popover 로 직접 구현 — iOS Safari 가 backdrop-filter 부모 안의 native
 * <select> picker 를 안 열어주는 버그(모달 안에서 탭해도 무반응) 회피.
 * 모든 모바일 브라우저에서 동일하게 동작.
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
  popoverListClass,
  popoverItemClass,
}: {
  locale: 'ko' | 'en'
  idPrefix: string
  value: string
  onChange: (v: string) => void
  inputClass: string
  popoverListClass: string
  popoverItemClass: string
}) {
  const isKo = locale === 'ko'
  const parsed = parseISODate(value)
  const year = parsed?.y ?? ''
  const month = parsed?.m ?? ''
  const day = parsed?.d ?? ''

  const currentYear = new Date().getFullYear()
  // 1900 ~ 올해. 출생연도이므로 미래는 불필요. 최신 연도부터 내려가게 정렬.
  const years: number[] = []
  for (let y = currentYear; y >= 1900; y--) years.push(y)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const maxDay = year && month ? daysInMonth(Number(year), Number(month)) : 31
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  const emit = (y: number | '', m: number | '', d: number | '') => {
    if (y === '' || m === '' || d === '') {
      onChange('')
      return
    }
    // month 변경으로 day 가 새 maxDay 를 넘으면 clamp.
    const dMax = daysInMonth(Number(y), Number(m))
    const dClamped = Math.min(Number(d), dMax)
    onChange(
      `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(dClamped).padStart(2, '0')}`
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <DateDropdown
        id={`${idPrefix}-year`}
        ariaLabel={isKo ? '년' : 'Year'}
        placeholder={isKo ? '년' : 'Year'}
        value={year}
        options={years.map((y) => ({ value: y, label: String(y) }))}
        onSelect={(v) =>
          emit(v as number, month === '' ? '' : Number(month), day === '' ? '' : Number(day))
        }
        inputClass={inputClass}
        listClass={popoverListClass}
        itemClass={popoverItemClass}
      />
      <DateDropdown
        id={`${idPrefix}-month`}
        ariaLabel={isKo ? '월' : 'Month'}
        placeholder={isKo ? '월' : 'Month'}
        value={month}
        options={months.map((m) => ({ value: m, label: isKo ? `${m}월` : String(m) }))}
        onSelect={(v) =>
          emit(year === '' ? '' : Number(year), v as number, day === '' ? '' : Number(day))
        }
        inputClass={inputClass}
        listClass={popoverListClass}
        itemClass={popoverItemClass}
      />
      <DateDropdown
        id={`${idPrefix}-day`}
        ariaLabel={isKo ? '일' : 'Day'}
        placeholder={isKo ? '일' : 'Day'}
        value={day}
        options={days.map((d) => ({ value: d, label: isKo ? `${d}일` : String(d) }))}
        onSelect={(v) =>
          emit(year === '' ? '' : Number(year), month === '' ? '' : Number(month), v as number)
        }
        inputClass={inputClass}
        listClass={popoverListClass}
        itemClass={popoverItemClass}
      />
    </div>
  )
}

/**
 * 단일 dropdown — button 탭 시 popover 가 열리고 옵션 리스트 노출.
 * suggestionList/suggestionItem 클래스(도시 자동완성 팝오버와 동일)를
 * 받아서 light/dark 톤 자동 매칭.
 */
function DateDropdown({
  id,
  ariaLabel,
  placeholder,
  value,
  options,
  onSelect,
  inputClass,
  listClass,
  itemClass,
}: {
  id: string
  ariaLabel: string
  placeholder: string
  value: number | ''
  options: ReadonlyArray<{ value: number; label: string }>
  onSelect: (v: number) => void
  inputClass: string
  listClass: string
  itemClass: string
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  // 바깥 탭 / Escape 닫기.
  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 열릴 때 현재 선택 항목으로 스크롤 (년도처럼 126 개 있을 때 필수).
  React.useEffect(() => {
    if (!open || value === '' || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-v="${value}"]`)
    if (el) el.scrollIntoView({ block: 'center' })
  }, [open, value])

  const display = value === '' ? placeholder : options.find((o) => o.value === value)?.label ?? ''

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        // w-full 명시 — native <select> 는 form control 기본 동작으로 grid 셀을
        // 채웠지만 <button> 은 intrinsic width 라 "년 ▾" 만큼만 작게 그려져
        // 사용자가 셀 빈 공간 탭하면 미스. width:100% 로 셀 전체를 tap 영역으로.
        className={`${inputClass} flex w-full items-center justify-between text-left`}
      >
        <span style={{ opacity: value === '' ? 0.6 : 1 }}>{display}</span>
        <span aria-hidden="true" style={{ opacity: 0.6, marginLeft: 6 }}>
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className={listClass}
          style={{ listStyle: 'none', margin: 0 }}
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                data-v={opt.value}
                onClick={() => {
                  onSelect(opt.value)
                  setOpen(false)
                }}
                className={itemClass}
                style={value === opt.value ? { fontWeight: 600 } : undefined}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
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
