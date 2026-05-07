import React, { useState, useCallback, useEffect } from 'react'
import { type PersonForm, type Relation } from '../../lib/types'
import { PersonCardHeader } from './PersonCardHeader'
import { CircleDropdown } from './CircleDropdown'
import { CityAutocompleteField } from './CityAutocompleteField'
import DateTimePicker from '@/components/ui/DateTimePicker'
import TimePicker from '@/components/ui/TimePicker'
import type { CirclePerson } from '@/hooks/useMyCircle'
import type { CityResult } from '@/lib/cities/types'
import styles from '../../Compatibility.module.css'

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
    const [profileLoading, setProfileLoading] = useState(false)
    // "Time unknown" — when checked we force time to 00:00 and disable
    // the picker. Pre-check it whenever the stored time is missing or
    // already set to 00:00 so the form reflects what's actually saved.
    const [timeUnknown, setTimeUnknown] = useState(
      !person.time || person.time === '00:00'
    )
    useEffect(() => {
      if (timeUnknown && person.time !== '00:00') {
        onUpdatePerson(idx, 'time', '00:00')
      }
    }, [timeUnknown, person.time, idx, onUpdatePerson])

    const loadMyProfile = useCallback(async () => {
      setProfileLoading(true)
      try {
        const res = await fetch('/api/me/profile')
        if (!res.ok) {
          return
        }
        const data = await res.json()
        const user = data.user
        if (!user) {
          return
        }

        // Look up city coordinates if birthCity exists
        let lat: number | null = null
        let lon: number | null = null
        if (user.birthCity) {
          try {
            const cityRes = await fetch(
              `/api/cities?q=${encodeURIComponent(user.birthCity)}&limit=1`,
              {
                headers: { 'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '' },
              }
            )
            if (cityRes.ok) {
              const cityData = await cityRes.json()
              const cities = cityData.results || cityData.cities || cityData.data || []
              if (Array.isArray(cities) && cities.length > 0) {
                lat = cities[0].lat ?? cities[0].latitude ?? null
                lon = cities[0].lon ?? cities[0].longitude ?? null
              }
            }
          } catch {
            /* ignore city lookup failure */
          }
        }

        onSetPersons((prev) => {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            name: user.name || next[idx].name,
            date: user.birthDate || '',
            time: user.birthTime || '',
            cityQuery: user.birthCity || '',
            lat,
            lon,
            timeZone: user.tzId || next[idx].timeZone,
          }
          return next
        })
      } catch {
        /* ignore */
      } finally {
        setProfileLoading(false)
      }
    }, [idx, onSetPersons])

    // Person 1: show profile load button + circle dropdown
    // Person 2+: show circle dropdown only
    const headerButton = (() => {
      if (!isAuthenticated) {
        return undefined
      }
      if (idx === 0) {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={styles.circleImportBtn}
              onClick={loadMyProfile}
              disabled={profileLoading}
            >
              {profileLoading ? '...' : '\u{1F464}'} {t('compatibilityPage.loadMyProfile', 'My Profile')}
            </button>
            {circlePeople.length > 0 && (
              <CircleDropdown
                circlePeople={circlePeople}
                isOpen={showCircleDropdown}
                onToggle={onToggleCircleDropdown}
                onSelect={(cp) => onFillFromCircle(idx, cp)}
                t={t}
              />
            )}
          </div>
        )
      }
      if (circlePeople.length > 0) {
        return (
          <CircleDropdown
            circlePeople={circlePeople}
            isOpen={showCircleDropdown}
            onToggle={onToggleCircleDropdown}
            onSelect={(cp) => onFillFromCircle(idx, cp)}
            t={t}
          />
        )
      }
      return undefined
    })()

    return (
      <div className={styles.personCard} style={{ animationDelay: `${idx * 0.1}s` }}>
        <div className={styles.cardGlow} />
        <PersonCardHeader
          index={idx}
          relation={person.relation}
          t={t}
          circleImportButton={headerButton}
        />

        <div className={styles.grid}>
          {/* Required fields: name, date of birth (always shown) */}
          <div>
            <label htmlFor={`name-${idx}`} className={styles.label}>
              {t('compatibilityPage.name', 'Name')}
              <span className={styles.requiredMark}>*</span>
            </label>
            <input
              id={`name-${idx}`}
              value={person.name}
              onChange={(e) => onUpdatePerson(idx, 'name', e.target.value)}
              placeholder={t('compatibilityPage.namePlaceholder', 'Name')}
              className={styles.input}
              required
            />
          </div>
          <div>
            <DateTimePicker
              value={person.date}
              onChange={(date) => onUpdatePerson(idx, 'date', date)}
              label={t('compatibilityPage.dateOfBirth', 'Date of Birth')}
              required
              locale={locale}
            />
          </div>

          {/* Time of birth + "unknown" toggle — checked = 00:00. */}
          <div>
            <div style={{ opacity: timeUnknown ? 0.55 : 1, pointerEvents: timeUnknown ? 'none' : 'auto' }}>
              <TimePicker
                value={timeUnknown ? '00:00' : person.time}
                onChange={(time) => onUpdatePerson(idx, 'time', time)}
                label={t('compatibilityPage.timeOfBirth', 'Time of Birth')}
                locale={locale}
              />
            </div>
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
                onChange={(e) => setTimeUnknown(e.target.checked)}
                style={{ accentColor: '#fcb69f' }}
              />
              {t('compatibilityPage.timeUnknown', '시간 모름 (00:00 처리)')}
            </label>
          </div>
          <CityAutocompleteField
            id={`city-${idx}`}
            value={person.cityQuery}
            suggestions={person.suggestions}
            showDropdown={person.showDropdown}
            locale={locale}
            onChange={(val) => {
              onSetPersons((prev) => {
                const next = [...prev]
                next[idx] = { ...next[idx], cityQuery: val, lat: null, lon: null }
                return next
              })
            }}
            onFocus={() => {
              if (person.lat === null) {
                onUpdatePerson(idx, 'showDropdown', true)
              }
            }}
            onBlur={() => setTimeout(() => onUpdatePerson(idx, 'showDropdown', false), 200)}
            onSelect={(city) => onPickCity(idx, city)}
            t={t}
          />
          {idx > 0 && (
            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <div>
                <label htmlFor={`rel-${idx}`} className={styles.label}>
                  {t('compatibilityPage.relationToPerson1', 'Relation to Person 1')}
                </label>
                <select
                  id={`rel-${idx}`}
                  value={person.relation ?? ''}
                  onChange={(e) => onUpdatePerson(idx, 'relation', e.target.value as Relation)}
                  className={styles.select}
                >
                  <option value="">
                    {t('compatibilityPage.selectRelation', 'Select relation')}
                  </option>
                  <option value="lover">
                    {t('compatibilityPage.partnerLover', 'Partner / Lover')}
                  </option>
                  <option value="friend">{t('compatibilityPage.friend', 'Friend')}</option>
                  <option value="other">{t('compatibilityPage.other', 'Other')}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`note-${idx}`} className={styles.label}>
                  {t('compatibilityPage.relationNote', 'Relation Note')}
                </label>
                <input
                  id={`note-${idx}`}
                  value={person.relationNote ?? ''}
                  onChange={(e) => onUpdatePerson(idx, 'relationNote', e.target.value)}
                  placeholder={t('compatibilityPage.shortNote', 'Short note')}
                  className={styles.input}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

PersonCard.displayName = 'PersonCard'
