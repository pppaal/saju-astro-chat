'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import styles from '../main-page.module.css'
import { saveBirthInfo, getStoredBirthInfo, type StoredBirthInfo } from '../birthInfoStorage'
import { BirthInfoFields, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'

interface BirthInfoModalProps {
  open: boolean
  initial: StoredBirthInfo | null
  onClose: () => void
  onSaved: (info: StoredBirthInfo) => void
  locale?: 'ko' | 'en'
}

interface LoadOption {
  key: string
  label: string
  sub?: string
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  gender: 'male' | 'female' | ''
  city: string
}

function normGender(g: unknown): 'male' | 'female' | '' {
  const v = String(g ?? '').toLowerCase()
  if (v === 'female' || v === 'f') return 'female'
  if (v === 'male' || v === 'm') return 'male'
  return ''
}

function timeToState(raw: unknown): { birthTime: string; timeUnknown: boolean } {
  const t = typeof raw === 'string' ? raw : ''
  if (!t || t === '00:00') return { birthTime: '', timeUnknown: true }
  return { birthTime: t, timeUnknown: false }
}

export default function BirthInfoModal({
  open,
  initial,
  onClose,
  onSaved,
  locale = 'ko',
}: BirthInfoModalProps) {
  const isKo = locale === 'ko'
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

  // 불러오기 — 내 정보 + 등록된 지인
  const [loadOpen, setLoadOpen] = useState(false)
  const [options, setOptions] = useState<LoadOption[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    // 즉시: 로컬 저장본이 있으면 '내 정보'를 먼저 노출해 "불러오기" 버튼이
    // 네트워크(프로필/지인)를 기다리지 않고 바로 뜨게 한다. 아래 collect 가
    // DB 프로필·지인으로 enrich/replace.
    const localSeed = getStoredBirthInfo()
    if (localSeed?.birthDate) {
      setOptions([
        {
          key: 'me',
          label: isKo ? '내 정보' : 'My info',
          birthDate: localSeed.birthDate,
          birthTime:
            localSeed.birthTime && localSeed.birthTime !== '00:00' ? localSeed.birthTime : '',
          timeUnknown: localSeed.birthTimeUnknown === true || localSeed.birthTime === '00:00',
          gender: localSeed.gender || '',
          city: localSeed.city || '',
        },
      ])
    }

    const collect = async () => {
      const opts: LoadOption[] = []

      // 내 정보 — DB 프로필 우선, 없으면 로컬 저장본
      try {
        const res = await fetch('/api/me/profile')
        if (res.ok) {
          const data = await res.json()
          const u = data?.user
          if (u && (u.birthDate || u.birthTime)) {
            opts.push({
              key: 'me',
              label: isKo ? '내 정보' : 'My info',
              sub: u.name || undefined,
              birthDate: u.birthDate || '',
              ...timeToState(u.birthTime),
              gender: normGender(u.gender),
              city: u.birthCity || '',
            })
          }
        }
      } catch {
        /* guest or offline — fall back below */
      }
      if (!opts.some((o) => o.key === 'me')) {
        const local = getStoredBirthInfo()
        if (local?.birthDate) {
          opts.push({
            key: 'me',
            label: isKo ? '내 정보' : 'My info',
            birthDate: local.birthDate,
            birthTime: local.birthTime && local.birthTime !== '00:00' ? local.birthTime : '',
            timeUnknown: local.birthTimeUnknown === true || local.birthTime === '00:00',
            gender: local.gender || '',
            city: local.city || '',
          })
        }
      }

      // 등록된 지인
      try {
        const res = await fetch('/api/me/circle?limit=50')
        if (res.ok) {
          const data = await res.json()
          const people = data?.data?.people
          if (Array.isArray(people)) {
            for (const p of people) {
              if (!p?.name) continue
              opts.push({
                key: `circle-${p.id}`,
                label: p.name,
                sub: p.relation || undefined,
                birthDate: p.birthDate || '',
                ...timeToState(p.birthTime),
                gender: normGender(p.gender),
                city: p.birthCity || '',
              })
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setOptions(opts)
    }

    void collect()
    return () => {
      cancelled = true
    }
  }, [open, isKo])

  if (!open) return null

  const applyPatch = (patch: BirthFieldsPatch) => {
    if (patch.birthDate !== undefined) setBirthDate(patch.birthDate)
    if (patch.birthTime !== undefined) setBirthTime(patch.birthTime)
    if (patch.timeUnknown !== undefined) setTimeUnknown(patch.timeUnknown)
    if (patch.gender !== undefined) setGender(patch.gender)
    if (patch.city !== undefined) setCity(patch.city)
  }

  const applyOption = (o: LoadOption) => {
    setBirthDate(o.birthDate)
    setBirthTime(o.birthTime)
    setTimeUnknown(o.timeUnknown)
    setGender(o.gender)
    setCity(o.city)
    setLoadOpen(false)
  }

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

        {options.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLoadOpen((v) => !v)}
              className={styles.modalLoadButton}
            >
              <Download size={14} />
              {isKo ? '저장된 정보 불러오기' : 'Load saved info'}
              <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
            </button>
            {loadOpen && (
              <ul role="listbox" className={styles.modalLoadList}>
                {options.map((o) => (
                  <li key={o.key}>
                    <button
                      type="button"
                      className={styles.modalLoadItem}
                      onClick={() => applyOption(o)}
                    >
                      <span style={{ fontWeight: 600 }}>{o.label}</span>
                      {o.sub && (
                        <span style={{ marginLeft: 6, fontSize: '0.78rem', opacity: 0.6 }}>
                          · {o.sub}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <BirthInfoFields
          locale={locale}
          birthDate={birthDate}
          birthTime={birthTime}
          timeUnknown={timeUnknown}
          gender={gender}
          city={city}
          onChange={applyPatch}
          classes={{
            field: styles.modalField,
            label: styles.modalLabel,
            input: styles.modalInput,
            row: styles.modalRow,
          }}
        />

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
