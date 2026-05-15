'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildBirthQuery } from '../birthInfoStorage'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  onOpenBirthModal: () => void
  locale: 'en' | 'ko'
}

const TYPEWRITER_PROMPTS_KO = [
  '무엇이든 물어보세요',
  '올해 이직 시기 어때?',
  '요즘 너무 답답해요',
  '결혼 시기는?',
  '이 사람과 잘 맞을까?',
  '돈은 언제 들어와?',
]
const TYPEWRITER_PROMPTS_EN = [
  'Ask anything',
  'When should I change jobs?',
  'I feel stuck lately',
  'When will I marry?',
  'Are we a good match?',
  'When will money flow?',
]

const TYPE_SPEED_MS = 65
const DELETE_SPEED_MS = 35
const HOLD_AFTER_TYPED_MS = 1800
const HOLD_AFTER_DELETED_MS = 250

export default function HomeChatInput({ birthInfo, onOpenBirthModal, locale }: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [typedPlaceholder, setTypedPlaceholder] = useState('')

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

  // birth 정보 없을 땐 정적 안내, 있을 땐 타이프라이터 placeholder.
  const fallbackPlaceholder = birthInfo
    ? locale === 'ko'
      ? '무엇이든 물어보세요'
      : 'Ask anything'
    : locale === 'ko'
      ? '먼저 생년월일 정보부터 — @생일 추가를 눌러주세요'
      : 'Add birth info first — tap @birth'

  // 사용자가 직접 타이핑 시작하면 애니메이션은 멈추고 placeholder는 숨김
  // (textarea 자체가 사용자 입력으로 가려짐).
  const typingActiveRef = useRef(true)
  useEffect(() => {
    typingActiveRef.current = !!birthInfo && text.length === 0
  }, [birthInfo, text])

  useEffect(() => {
    if (!birthInfo) {
      setTypedPlaceholder('')
      return
    }
    const prompts = locale === 'ko' ? TYPEWRITER_PROMPTS_KO : TYPEWRITER_PROMPTS_EN
    let cancelled = false
    let promptIdx = 0
    let charIdx = 0
    let mode: 'typing' | 'holding' | 'deleting' = 'typing'

    const tick = () => {
      if (cancelled) return
      if (!typingActiveRef.current) {
        // user started typing — pause and retry later
        window.setTimeout(tick, 400)
        return
      }
      const current = prompts[promptIdx % prompts.length]
      if (mode === 'typing') {
        charIdx += 1
        setTypedPlaceholder(current.slice(0, charIdx))
        if (charIdx >= current.length) {
          mode = 'holding'
          window.setTimeout(tick, HOLD_AFTER_TYPED_MS)
          return
        }
        window.setTimeout(tick, TYPE_SPEED_MS)
        return
      }
      if (mode === 'holding') {
        mode = 'deleting'
        window.setTimeout(tick, DELETE_SPEED_MS)
        return
      }
      // deleting
      charIdx -= 1
      setTypedPlaceholder(current.slice(0, Math.max(0, charIdx)))
      if (charIdx <= 0) {
        promptIdx += 1
        mode = 'typing'
        window.setTimeout(tick, HOLD_AFTER_DELETED_MS)
        return
      }
      window.setTimeout(tick, DELETE_SPEED_MS)
    }

    // start with the first prompt typed-out a bit visible immediately
    setTypedPlaceholder('')
    window.setTimeout(tick, 300)

    return () => {
      cancelled = true
    }
  }, [birthInfo, locale])

  const placeholder = birthInfo ? typedPlaceholder || ' ' : fallbackPlaceholder

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
