'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildBirthQuery } from '../birthInfoStorage'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  onOpenBirthModal: () => void
  locale: 'en' | 'ko'
}

export default function HomeChatInput({ birthInfo, onOpenBirthModal, locale }: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!birthInfo) {
      onOpenBirthModal()
      return
    }
    const query = buildBirthQuery(birthInfo)
    const initial = trimmed ? `&initialQuestion=${encodeURIComponent(trimmed)}` : ''
    router.push(`/destiny-counselor?${query}${initial}`)
  }

  const placeholder = birthInfo
    ? locale === 'ko'
      ? '무엇이든 물어보세요'
      : 'Ask anything'
    : locale === 'ko'
      ? '먼저 생년월일 정보부터 — @생일 추가를 눌러주세요'
      : 'Add birth info first — tap @birth'

  return (
    <div className={styles.homeChatBar}>
      <div className={styles.homeChatBarInner}>
        {birthInfo && (
          <span className={styles.homeBirthChip} aria-live="polite">
            ✓ {birthInfo.birthDate} {birthInfo.birthTime} ·{' '}
            {birthInfo.gender === 'male' ? '남성' : '여성'}
          </span>
        )}
        <textarea
          className={styles.homeChatTextarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className={styles.homeChatRow}>
          <div className={styles.homeChatTools}>
            <button
              type="button"
              className={`${styles.homeChatToolBtn} ${birthInfo ? styles.homeChatToolBtnActive : ''}`}
              onClick={onOpenBirthModal}
              aria-label={locale === 'ko' ? '생년월일 정보 추가/변경' : 'Add or edit birth info'}
            >
              <span aria-hidden="true">📅</span>
              {birthInfo
                ? locale === 'ko'
                  ? '생일 ✓'
                  : 'Birth ✓'
                : locale === 'ko'
                  ? '@생일 추가'
                  : '@birth'}
            </button>
          </div>
          <button
            type="button"
            className={styles.homeChatSubmit}
            onClick={submit}
            aria-label={locale === 'ko' ? '보내기' : 'Send'}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
