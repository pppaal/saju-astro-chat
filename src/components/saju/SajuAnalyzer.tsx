// components/saju/SajuAnalyzer.tsx

'use client'

import { useState, useEffect, FormEvent, useMemo, useCallback } from 'react'
import SajuResultDisplay from './SajuResultDisplay'
import { useUserProfile } from '@/hooks/useUserProfile'
import { saveUserProfile } from '@/lib/userProfile'
import { ProfileLoader } from '@/components/common/BirthForm'
import { searchCities } from '@/lib/cities'
import tzLookup from 'tz-lookup'
import DateTimePicker from '@/components/ui/DateTimePicker'
import TimePicker from '@/components/ui/TimePicker'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getSupportedTimezones,
  getUserTimezone,
  getOffsetMinutes,
  formatOffset,
  type DayMaster,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
  type PillarData,
} from '../../lib/Saju'

interface CityResult {
  name: string
  country: string
  lat: number
  lon: number
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

interface ApiFullResponse {
  birthYear: number
  yearPillar: PillarData
  monthPillar: PillarData
  dayPillar: PillarData
  timePillar: PillarData
  daeun: { daeunsu: number; cycles: DaeunData[] }
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number }
  dayMaster: DayMaster
  yeonun: YeonunData[]
  wolun: WolunData[]
  iljin: IljinData[]
  gptPrompt: string
}

export default function SajuAnalyzer() {
  const { locale } = useI18n()
  const userTz = useMemo(() => getUserTimezone(), [])
  const tzList: string[] = useMemo(() => getSupportedTimezones(), [])
  const baseInstant = useMemo(() => new Date(), [])
  const [tzQuery, setTzQuery] = useState('')
  const {
    profile,
    isLoading: profileLoading,
    loadProfile,
    loadingProfileBtn,
    profileLoadedMsg,
    profileLoadError,
  } = useUserProfile({ skipAutoLoad: false })
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [timeUnknown, setTimeUnknown] = useState(false)

  const [formData, setFormData] = useState({
    calendarType: 'solar' as 'solar' | 'lunar',
    birthDate: '',
    birthTime: '',
    gender: 'male' as 'male' | 'female',
    timezone: userTz,
  })

  const [sajuResult, setSajuResult] = useState<ApiFullResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('')

  useEffect(() => {
    const q = cityQuery.trim()
    if (q.length < 2) {
      setCitySuggestions([])
      return
    }
    const tmr = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 20 })) as CityResult[]
        setCitySuggestions(items)
        setShowCitySuggestions(true)
      } catch {
        setCitySuggestions([])
      }
    }, 150)
    return () => clearTimeout(tmr)
  }, [cityQuery])

  const handleCitySelect = useCallback(
    (city: CityResult) => {
      // 한국어 표시 우선, 없으면 영어
      const displayName =
        locale === 'ko' && city.displayKr
          ? city.displayKr
          : city.displayEn || `${city.name}, ${city.country}`
      setSelectedCity(displayName)
      setCityQuery(displayName)
      setShowCitySuggestions(false)

      try {
        const tz = tzLookup(city.lat, city.lon)
        if (tz && typeof tz === 'string') {
          setFormData((prev) => ({ ...prev, timezone: tz }))
        }
      } catch {
        // ignore
      }
    },
    [locale]
  )

  useEffect(() => {
    if (profileLoading || profileLoaded) {
      return
    }
    if (profile.birthDate || profile.birthTime || profile.gender) {
      setFormData((prev) => ({
        ...prev,
        birthDate: profile.birthDate || prev.birthDate,
        birthTime: profile.birthTime || prev.birthTime,
        gender: (profile.gender === 'Male'
          ? 'male'
          : profile.gender === 'Female'
            ? 'female'
            : prev.gender) as 'male' | 'female',
        timezone: profile.timezone || prev.timezone,
      }))
      if (profile.birthCity) {
        setCityQuery(profile.birthCity)
        setSelectedCity(profile.birthCity)
      }
    }
    setProfileLoaded(true)
  }, [profile, profileLoading, profileLoaded])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const filteredTz: string[] = useMemo(() => {
    const q = tzQuery.trim().toLowerCase()
    if (!q) {
      return tzList.slice(0, 200)
    }
    return tzList.filter((t: string) => t.toLowerCase().includes(q)).slice(0, 200)
  }, [tzList, tzQuery])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSajuResult(null)

    try {
      // 출생시간 모름이면 12:00으로 설정
      const effectiveBirthTime = formData.birthTime || '12:00'
      const payload = { ...formData, birthTime: effectiveBirthTime, userTimezone: userTz }
      const response = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || 'An unknown server error occurred.')
      }
      setSajuResult(data as ApiFullResponse)

      saveUserProfile({
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        gender: formData.gender === 'male' ? 'Male' : 'Female',
        timezone: formData.timezone,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis data.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadProfile = async () => {
    const success = await loadProfile(locale)
    if (success && profile.birthDate) {
      setFormData((prev) => ({
        ...prev,
        birthDate: profile.birthDate || prev.birthDate,
        birthTime: profile.birthTime || prev.birthTime,
        gender: (profile.gender === 'Male'
          ? 'male'
          : profile.gender === 'Female'
            ? 'female'
            : prev.gender) as 'male' | 'female',
        timezone: profile.timezone || prev.timezone,
      }))
      if (profile.birthCity) {
        setCityQuery(profile.birthCity)
        setSelectedCity(profile.birthCity)
      }
    }
  }

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-xl border border-slate-600 mb-8"
        aria-label="사주 분석 입력 폼"
      >
        {/* Profile Loader */}
        <ProfileLoader
          status={profileLoading ? 'loading' : 'authenticated'}
          onLoadClick={handleLoadProfile}
          onReloadClick={handleLoadProfile}
          isLoading={loadingProfileBtn}
          isLoaded={profileLoadedMsg}
          error={profileLoadError}
          locale={locale as 'ko' | 'en'}
        />

        {/* 양력/음력 */}
        <div className="mb-5">
          <label htmlFor="calendarType" className="block font-medium mb-2 text-gray-200">
            양력/음력
          </label>
          <select
            id="calendarType"
            name="calendarType"
            value={formData.calendarType}
            onChange={handleInputChange}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        {/* 생년월일 */}
        <div className="mb-5">
          <DateTimePicker
            value={formData.birthDate}
            onChange={(date) => setFormData((prev) => ({ ...prev, birthDate: date }))}
            label={locale === 'ko' ? '생년월일' : 'Birth Date'}
            required
            locale={locale}
          />
        </div>

        {/* 태어난 시간 */}
        <div className="mb-5">
          <TimePicker
            value={formData.birthTime}
            onChange={(time) => setFormData((prev) => ({ ...prev, birthTime: time }))}
            label={locale === 'ko' ? '태어난 시간' : 'Birth Time'}
            required={!timeUnknown}
            disabled={timeUnknown}
            locale={locale}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer text-gray-400 text-sm">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => {
                setTimeUnknown(e.target.checked)
                if (e.target.checked) {
                  setFormData((prev) => ({ ...prev, birthTime: '' }))
                }
              }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
            />
            <span>
              {locale === 'ko'
                ? '출생 시간을 모름 (정오 12:00으로 설정됩니다)'
                : 'Time unknown (will use 12:00 noon)'}
            </span>
          </label>
        </div>

        {/* 성별 */}
        <div className="mb-5">
          <label className="block font-medium mb-2 text-gray-200">
            {locale === 'ko' ? '성별' : 'Gender'}
            <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gender: 'male' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                ${
                  formData.gender === 'male'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-slate-600 bg-slate-900 text-gray-400 hover:border-slate-500'
                }`}
            >
              <span>👨</span>
              <span>{locale === 'ko' ? '남성' : 'Male'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gender: 'female' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                ${
                  formData.gender === 'female'
                    ? 'border-pink-500 bg-pink-500/20 text-white'
                    : 'border-slate-600 bg-slate-900 text-gray-400 hover:border-slate-500'
                }`}
            >
              <span>👩</span>
              <span>{locale === 'ko' ? '여성' : 'Female'}</span>
            </button>
          </div>
        </div>

        {/* 출생 도시 */}
        <div className="mb-5 relative">
          <label htmlFor="birthCity" className="block font-medium mb-2 text-gray-200">
            출생 도시 (영문)
          </label>
          <input
            id="birthCity"
            name="birthCity"
            type="text"
            autoComplete="off"
            placeholder="예: Seoul, Tokyo, New York"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
            onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
            className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby={selectedCity ? 'selected-city-info' : undefined}
            aria-autocomplete="list"
            aria-controls="city-suggestions"
            aria-expanded={showCitySuggestions}
            role="combobox"
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
            <ul
              id="city-suggestions"
              role="listbox"
              className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-600
                rounded-md max-h-[200px] overflow-y-auto z-50 mt-1"
            >
              {citySuggestions.map((city, idx) => {
                // 한국어 표시명 (있으면) + 영어 표시명
                const displayKr = city.displayKr
                const displayEn = city.displayEn || `${city.name}, ${city.country}`
                return (
                  <li
                    key={`${city.name}-${city.country}-${idx}`}
                    role="option"
                    aria-selected="false"
                    className="px-4 py-3 cursor-pointer text-gray-200 border-b border-slate-600
                      hover:bg-slate-700 transition-colors last:border-b-0"
                    onMouseDown={() => handleCitySelect(city)}
                  >
                    {displayKr ? (
                      <span>
                        <span className="font-medium">{displayKr}</span>
                        <span className="text-gray-400 text-sm ml-2">({displayEn})</span>
                      </span>
                    ) : (
                      displayEn
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {selectedCity && (
            <p id="selected-city-info" className="text-sm text-blue-400 mt-1">
              ✓ 선택됨: {selectedCity} → 타임존 자동 설정됨
            </p>
          )}
        </div>

        {/* 타임존 */}
        <div className="mb-8">
          <label className="block font-medium mb-2 text-gray-200">타임존</label>
          <details className="mb-2">
            <summary className="cursor-pointer text-gray-400 text-sm hover:text-gray-300">
              고급: 타임존 직접 선택
            </summary>
            <input
              placeholder="타임존 검색 (예: seoul, new_york)"
              value={tzQuery}
              onChange={(e) => setTzQuery(e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white mt-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="타임존 검색"
            />
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white mt-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="타임존 선택"
            >
              {filteredTz.map((tz: string) => {
                const off = formatOffset(getOffsetMinutes(baseInstant, tz))
                return (
                  <option key={tz} value={tz}>
                    {tz} ({off})
                  </option>
                )
              })}
            </select>
          </details>
          <p className="text-sm text-gray-400">
            현재: <strong className="text-yellow-400">{formData.timezone}</strong> (
            {formatOffset(getOffsetMinutes(baseInstant, formData.timezone))})
          </p>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full p-4 rounded-md text-lg font-bold text-white transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800
            ${
              isLoading
                ? 'bg-slate-700 cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
            }`}
          aria-busy={isLoading}
        >
          {isLoading ? '분석 중...' : '사주 분석하기'}
        </button>
      </form>

      {error && (
        <p className="text-red-400 mt-4 text-center" role="alert">
          오류: {error}
        </p>
      )}
      {sajuResult && <SajuResultDisplay result={sajuResult} />}
    </div>
  )
}
