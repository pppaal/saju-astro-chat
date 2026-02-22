'use client'

import React from 'react'
import { useCitySearch } from '@/hooks/calendar/useCitySearch'
import { formatCityForDropdown } from '@/lib/cities/formatter'
import styles from './CitySearchField.module.css'

interface CityHit {
  name: string
  country: string
  lat: number
  lon: number
  timezone?: string
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

interface CitySearchFieldProps {
  value: string
  onChange: (value: string) => void
  onCitySelect: (city: CityHit) => void
  locale?: 'ko' | 'en'
  required?: boolean
  label?: string
}

export function CitySearchField({
  value,
  onChange,
  onCitySelect,
  locale = 'ko',
  required = false,
  label,
}: CitySearchFieldProps) {
  const {
    suggestions,
    openSug,
    isUserTyping,
    cityErr,
    setOpenSug,
    setSelectedCity,
    handleCityInputChange,
    handleCitySelect,
  } = useCitySearch(locale)

  const defaultLabel = locale === 'ko' ? '출생 도시' : 'Birth City'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    // Call the hook's city search function to get suggestions
    handleCityInputChange(newValue)
  }

  const handleSelect = (city: CityHit) => {
    const enrichedCity = handleCitySelect(city)
    setSelectedCity(enrichedCity)
    const cityDisplay =
      locale === 'ko'
        ? city.displayKr || formatCityForDropdown(city.name, city.country, 'ko')
        : city.displayEn || `${city.name}, ${city.country}`
    onChange(cityDisplay)
    onCitySelect(enrichedCity)
  }

  return (
    <div className={styles.container} style={{ position: 'relative' }}>
      <label className={styles.label} htmlFor="birth-city-input">
        {label || defaultLabel}
        {required && (
          <span className={styles.required} aria-label="required">
            *
          </span>
        )}
      </label>
      <input
        id="birth-city-input"
        className={styles.input}
        placeholder={locale === 'ko' ? '도시를 입력하세요' : 'Enter your city'}
        value={value}
        onChange={handleChange}
        onBlur={() => {
          setTimeout(() => setOpenSug(false), 150)
        }}
        autoComplete="address-level2"
        inputMode="text"
        required={required}
        aria-required={required}
        aria-invalid={cityErr ? 'true' : 'false'}
        aria-describedby={cityErr ? 'city-error' : 'city-help'}
        role="combobox"
        aria-expanded={openSug && suggestions.length > 0}
        aria-controls="city-suggestions"
        aria-autocomplete="list"
      />
      {!cityErr && (
        <span id="city-help" className={styles.helpText}>
          {locale === 'ko' ? '도시명을 2글자 이상 입력하세요' : 'Enter at least 2 characters'}
        </span>
      )}
      {cityErr && (
        <div id="city-error" className={styles.error} role="alert">
          {cityErr}
        </div>
      )}
      {isUserTyping && (
        <div className={styles.dropdown} role="status" aria-live="polite">
          <div className={styles.dropdownItem}>
            {locale === 'ko' ? '도시를 찾는 중...' : 'Searching cities...'}
          </div>
        </div>
      )}
      {openSug && suggestions.length > 0 && (
        <ul id="city-suggestions" role="listbox" className={styles.dropdown}>
          {suggestions.map((s, idx) => {
            const formattedCity =
              locale === 'ko'
                ? s.displayKr || formatCityForDropdown(s.name, s.country, 'ko')
                : s.displayEn || formatCityForDropdown(s.name, s.country, 'en')
            return (
              <li
                key={`${s.name}-${s.country}-${idx}`}
                role="option"
                aria-selected="false"
                className={styles.dropdownItem}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(s)
                }}
              >
                {formattedCity}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
