'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '../main-page.module.css'
import { saveBirthInfo, type StoredBirthInfo } from '../birthInfoStorage'

interface BirthInfoModalProps {
  open: boolean
  initial: StoredBirthInfo | null
  onClose: () => void
  onSaved: (info: StoredBirthInfo) => void
  locale?: 'ko' | 'en'
}

interface CitySuggestion {
  name: string
  country: string
  displayKr?: string
  displayEn?: string
}

export default function BirthInfoModal({ open, initial, onClose, onSaved, locale = 'ko' }: BirthInfoModalProps) {
  const isKo = locale === 'ko'
  const cityLabel = (s: CitySuggestion) =>
    (isKo ? s.displayKr || s.displayEn : s.displayEn || s.displayKr) || `${s.name}, ${s.country}`
  const [birthDate, setBirthDate] = useState(initial?.birthDate || '')
  const [birthTime, setBirthTime] = useState(
    initial?.birthTime && initial.birthTime !== '00:00' ? initial.birthTime : ''
  )
  // Default to "time known" for new users so the time input is enabled.
  // Only mark as unknown when a prior save explicitly used the 00:00
  // placeholder or set the flag.
  const [timeUnknown, setTimeUnknown] = useState(
    initial?.birthTimeUnknown === true || initial?.birthTime === '00:00'
  )
  const [gender, setGender] = useState<'male' | 'female' | ''>(initial?.gender || '')
  const [city, setCity] = useState(initial?.city || '')
  const [cityFocused, setCityFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // City autocomplete — debounce + searchCities
  useEffect(() => {
    if (!cityFocused) return
    const q = city.trim()
    if (q.length < 1) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { searchCities } = await import('@/lib/cities')
        const hits = (await searchCities(q, { limit: 8 })) as CitySuggestion[]
        setSuggestions(hits || [])
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [city, cityFocused])

  if (!open) return null

  const effectiveTime = timeUnknown ? '00:00' : birthTime
  const isValid = Boolean(birthDate && (gender === 'male' || gender === 'female') && effectiveTime)

  const handleSave = async () => {
    if (!isValid) return
    const payload = {
      birthDate,
      birthTime: effectiveTime,
      birthTimeUnknown: timeUnknown,
      gender: gender as 'male' | 'female',
      city: city.trim() || undefined,
    }
    saveBirthInfo(payload)
    // Sync to DB so /api/me/profile (the counselor route's fallback
    // source — useCounselorData reads it, localStorage is ignored)
    // sees the new value. Without this, logged-in users who change
    // their birth info here keep getting the old DB value in
    // counselor sessions. Guest users get 401; swallow — localStorage
    // is enough for them.
    try {
      await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime: timeUnknown ? null : effectiveTime,
          gender: gender as 'male' | 'female',
          birthCity: city.trim() || null,
        }),
      })
    } catch {
      // localStorage already saved; tolerate transient API failures.
    }
    onSaved({ ...payload, savedAt: new Date().toISOString() })
  }

  const pickCity = (s: CitySuggestion) => {
    setCity(cityLabel(s))
    setSuggestions([])
    setCityFocused(false)
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="birth-info-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modalCard}>
        <h2 id="birth-info-title" className={styles.modalTitle}>
          {isKo ? '생년월일 정보 입력' : 'Enter birth info'}
        </h2>
        <p className={styles.modalSubtitle}>
          {isKo
            ? '한 번 입력하면 모든 서비스에서 자동으로 사용돼요. 시간 모르면 00:00으로 처리합니다.'
            : 'Saved once, reused across every service. Unknown time defaults to 00:00.'}
        </p>

        <div className={styles.modalField}>
          <label htmlFor="birth-date" className={styles.modalLabel}>
            {isKo ? '생년월일' : 'Birth date'}
          </label>
          <input
            id="birth-date"
            type="date"
            className={styles.modalInput}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            min="1900-01-01"
            max="2100-12-31"
          />
        </div>

        <div className={styles.modalRow}>
          <div className={styles.modalField}>
            <label htmlFor="birth-time" className={styles.modalLabel}>
              {isKo ? '출생 시간' : 'Birth time'}
            </label>
            <input
              id="birth-time"
              type="time"
              className={styles.modalInput}
              value={birthTime}
              disabled={timeUnknown}
              onChange={(e) => {
                setBirthTime(e.target.value)
                if (e.target.value) setTimeUnknown(false)
              }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: '0.78rem',
                color: 'rgba(220, 215, 255, 0.78)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => {
                  setTimeUnknown(e.target.checked)
                  if (e.target.checked) setBirthTime('')
                }}
                style={{ accentColor: '#a78bfa' }}
              />
              {isKo ? '시간 모름 (00:00 처리)' : 'Unknown time (use 00:00)'}
            </label>
          </div>

          <div className={styles.modalField}>
            <label htmlFor="birth-gender" className={styles.modalLabel}>
              {isKo ? '성별' : 'Gender'}
            </label>
            <select
              id="birth-gender"
              className={styles.modalInput}
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
            >
              <option value="">{isKo ? '선택' : 'Select'}</option>
              <option value="male">{isKo ? '남성' : 'Male'}</option>
              <option value="female">{isKo ? '여성' : 'Female'}</option>
            </select>
          </div>
        </div>

        <div className={styles.modalField} style={{ position: 'relative' }}>
          <label htmlFor="birth-city" className={styles.modalLabel}>
            {isKo ? '출생 도시 (선택)' : 'Birth city (optional)'}
          </label>
          <input
            id="birth-city"
            type="text"
            className={styles.modalInput}
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setCityFocused(true)
            }}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setTimeout(() => setCityFocused(false), 150)}
            placeholder={isKo ? '예: 서울' : 'e.g. Seoul'}
            autoComplete="off"
          />
          {cityFocused && suggestions.length > 0 && (
            <ul
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                margin: 0,
                padding: 4,
                listStyle: 'none',
                background: 'rgba(15, 12, 32, 0.98)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {suggestions.map((s, i) => (
                <li key={`${s.name}-${s.country}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickCity(s)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(232, 222, 255, 0.95)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(167, 139, 250, 0.18)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {cityLabel(s)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && cityFocused && suggestions.length === 0 && city.trim().length > 0 && (
            <p style={{ fontSize: '0.72rem', color: 'rgba(196, 181, 253, 0.7)', marginTop: 4 }}>
              {isKo ? '검색 중…' : 'Searching…'}
            </p>
          )}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onClose}>
            {isKo ? '취소' : 'Cancel'}
          </button>
          <button
            type="button"
            className={styles.modalSave}
            onClick={handleSave}
            disabled={!isValid}
          >
            {isKo ? '저장하고 시작' : 'Save & start'}
          </button>
        </div>
      </div>
    </div>
  )
}
