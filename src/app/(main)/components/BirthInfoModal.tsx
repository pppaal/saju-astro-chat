'use client'

import { useState } from 'react'
import styles from '../main-page.module.css'
import { saveBirthInfo, type StoredBirthInfo } from '../birthInfoStorage'

interface BirthInfoModalProps {
  open: boolean
  initial: StoredBirthInfo | null
  onClose: () => void
  onSaved: (info: StoredBirthInfo) => void
}

export default function BirthInfoModal({ open, initial, onClose, onSaved }: BirthInfoModalProps) {
  const [birthDate, setBirthDate] = useState(initial?.birthDate || '')
  const [birthTime, setBirthTime] = useState(initial?.birthTime || '')
  const [gender, setGender] = useState<'male' | 'female' | ''>(initial?.gender || '')
  const [city, setCity] = useState(initial?.city || '')

  if (!open) return null

  const isValid = Boolean(birthDate && birthTime && (gender === 'male' || gender === 'female'))

  const handleSave = () => {
    if (!isValid) return
    const payload = {
      birthDate,
      birthTime,
      gender: gender as 'male' | 'female',
      city: city.trim() || undefined,
    }
    saveBirthInfo(payload)
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
          생년월일 정보 입력
        </h2>
        <p className={styles.modalSubtitle}>
          한 번 입력하면 모든 서비스에서 자동으로 사용돼요. 나중에 언제든 다시 바꿀 수 있어요.
        </p>

        <div className={styles.modalField}>
          <label htmlFor="birth-date" className={styles.modalLabel}>
            생년월일
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
              출생 시간
            </label>
            <input
              id="birth-time"
              type="time"
              className={styles.modalInput}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </div>

          <div className={styles.modalField}>
            <label htmlFor="birth-gender" className={styles.modalLabel}>
              성별
            </label>
            <select
              id="birth-gender"
              className={styles.modalInput}
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
            >
              <option value="">선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
        </div>

        <div className={styles.modalField}>
          <label htmlFor="birth-city" className={styles.modalLabel}>
            출생 도시 (선택)
          </label>
          <input
            id="birth-city"
            type="text"
            className={styles.modalInput}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="예: 서울"
          />
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.modalSave}
            onClick={handleSave}
            disabled={!isValid}
          >
            저장하고 시작
          </button>
        </div>
      </div>
    </div>
  )
}
