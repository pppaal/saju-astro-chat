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

// 서비스 선택 dropdown — config/enabledServices.ts 와 동일 id·라벨.
type ServiceId = 'destinyMap' | 'tarot' | 'compatibility' | 'calendar'
const SERVICES: ReadonlyArray<{
  id: ServiceId
  icon: string
  ko: string
  en: string
}> = [
  { id: 'destinyMap', icon: '🗺️', ko: '운명 상담사', en: 'Destiny Counselor' },
  { id: 'tarot', icon: '🔮', ko: '타로 상담사', en: 'Tarot Counselor' },
  { id: 'compatibility', icon: '💕', ko: '궁합 상담사', en: 'Compatibility' },
  { id: 'calendar', icon: '🗓️', ko: '일·월·년 운세', en: 'Fortune Calendar' },
]

export default function HomeChatInput({ birthInfo, onOpenBirthModal, locale }: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false)
  const isKo = locale === 'ko'

  // 외부 클릭으로 드롭업 닫기.
  const serviceMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!serviceMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (serviceMenuRef.current && !serviceMenuRef.current.contains(e.target as Node)) {
        setServiceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [serviceMenuOpen])

  // 서비스 하나 골라서 즉시 이동 — 옛 ↑ 버튼 역할을 서비스 선택이 흡수.
  // 생일 없으면 생일 모달 먼저. 질문(?q=) 은 운명 상담사만 받음.
  const selectService = (service: ServiceId) => {
    setServiceMenuOpen(false)
    if (!birthInfo) {
      onOpenBirthModal()
      return
    }
    const trimmed = text.trim()
    if (service === 'destinyMap') {
      const query = buildBirthQuery(birthInfo)
      const initial = trimmed ? `&q=${encodeURIComponent(trimmed)}` : ''
      router.push(`/destiny-counselor?${query}${initial}`)
      return
    }
    if (service === 'tarot') {
      router.push('/tarot')
      return
    }
    if (service === 'compatibility') {
      router.push('/compatibility')
      return
    }
    if (service === 'calendar') {
      router.push('/calendar')
      return
    }
  }

  const fallbackPlaceholder = birthInfo
    ? isKo
      ? '무엇이든 물어보세요'
      : 'Ask anything'
    : isKo
      ? '먼저 생년월일 정보부터 — @생일 추가를 눌러주세요'
      : 'Add birth info first — tap @birth'

  const typingActiveRef = useRef(true)
  useEffect(() => {
    typingActiveRef.current = !!birthInfo && text.length === 0
  }, [birthInfo, text])

  useEffect(() => {
    if (!birthInfo) {
      setTypedPlaceholder('')
      return
    }
    const prompts = isKo ? TYPEWRITER_PROMPTS_KO : TYPEWRITER_PROMPTS_EN
    let cancelled = false
    let promptIdx = 0
    let charIdx = 0
    let mode: 'typing' | 'holding' | 'deleting' = 'typing'

    const tick = () => {
      if (cancelled) return
      if (!typingActiveRef.current) {
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

    setTypedPlaceholder('')
    window.setTimeout(tick, 300)

    return () => {
      cancelled = true
    }
  }, [birthInfo, isKo])

  const placeholder = birthInfo ? typedPlaceholder || ' ' : fallbackPlaceholder

  return (
    <div className={styles.homeChatBar}>
      <div className={styles.homeChatBarInner}>
        {birthInfo && (
          <span className={styles.homeBirthChip} aria-live="polite">
            ✓ {isKo ? '분석에 사용' : 'Reading for'}: {birthInfo.birthDate} {birthInfo.birthTime} ·{' '}
            {birthInfo.gender === 'male' ? (isKo ? '남성' : 'Male') : isKo ? '여성' : 'Female'}
          </span>
        )}
        <textarea
          className={styles.homeChatTextarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
        />
        <div className={styles.homeChatRow}>
          <div className={styles.homeChatTools}>
            <button
              type="button"
              className={`${styles.homeChatToolBtn} ${birthInfo ? styles.homeChatToolBtnActive : ''}`}
              onClick={onOpenBirthModal}
              aria-label={isKo ? '생년월일 정보 추가/변경' : 'Add or edit birth info'}
            >
              <span aria-hidden="true">📅</span>
              {birthInfo ? (isKo ? '생일 ✓' : 'Birth ✓') : isKo ? '@생일 추가' : '@birth'}
            </button>

            {/* 서비스 선택 — 4개 중 하나 누르면 그 서비스로 즉시 이동.
                옛 ↑ 보내기 버튼 자리. */}
            <div className={styles.homeServicePickerWrap} ref={serviceMenuRef}>
              <button
                type="button"
                className={styles.homeServicePickerBtn}
                onClick={() => setServiceMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={serviceMenuOpen}
              >
                <span>{isKo ? '서비스를 선택하세요' : 'Choose a service'}</span>
                <span aria-hidden="true">▾</span>
              </button>
              {serviceMenuOpen && (
                <div role="menu" className={styles.homeServicePickerMenu}>
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitem"
                      className={styles.homeServicePickerItem}
                      onClick={() => selectService(s.id)}
                    >
                      <span aria-hidden="true">{s.icon}</span>
                      <span>{isKo ? s.ko : s.en}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
