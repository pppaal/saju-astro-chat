'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildBirthQuery } from '../birthInfoStorage'

// 서비스 선택 — config/enabledServices.ts 와 동일 id·라벨.
export type HomeServiceId = 'destinyMap' | 'tarot' | 'compatibility' | 'calendar'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  // 생일이 필요한 서비스(궁합·운명상담사)를 생일 없이 골랐을 때 호출 —
  // 부모가 생일 모달을 띄우고, 저장되면 그 서비스로 이동시킨다.
  onRequireBirth: (service: HomeServiceId, question: string) => void
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

const SERVICES: ReadonlyArray<{
  id: HomeServiceId
  icon: string
  ko: string
  en: string
}> = [
  { id: 'destinyMap', icon: '🗺️', ko: '운명 상담사', en: 'Destiny Counselor' },
  { id: 'tarot', icon: '🔮', ko: '타로 상담사', en: 'Tarot Counselor' },
  { id: 'compatibility', icon: '💕', ko: '궁합 상담사', en: 'Compatibility' },
  { id: 'calendar', icon: '🗓️', ko: '일·월·년 운세', en: 'Fortune Calendar' },
]

export default function HomeChatInput({ birthInfo, onRequireBirth, locale }: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false)
  const isKo = locale === 'ko'

  // 입력창을 터치(포커스/클릭)하면 서비스 선택 창을 띄운다. 외부 클릭으로 닫힘.
  const chatBarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!serviceMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (chatBarRef.current && !chatBarRef.current.contains(e.target as Node)) {
        setServiceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [serviceMenuOpen])

  // 서비스 하나 골라서 즉시 이동. 타로·운세달력은 생일이 필요 없으니 바로
  // 진입하고, 궁합·운명상담사만 생일을 요구한다(없으면 모달 먼저).
  // 타이핑한 질문(?q=) 은 운명 상담사만 받음.
  const selectService = (service: HomeServiceId) => {
    setServiceMenuOpen(false)
    const trimmed = text.trim()

    if (service === 'tarot') {
      router.push('/tarot')
      return
    }
    if (service === 'calendar') {
      router.push('/calendar')
      return
    }

    // 여기부터 생일 필요 — 궁합 / 운명 상담사.
    if (!birthInfo) {
      onRequireBirth(service, trimmed)
      return
    }
    if (service === 'compatibility') {
      router.push('/compatibility')
      return
    }
    // destinyMap (운명 상담사)
    const query = buildBirthQuery(birthInfo)
    const initial = trimmed ? `&q=${encodeURIComponent(trimmed)}` : ''
    router.push(`/destiny-counselor?${query}${initial}`)
  }

  const typingActiveRef = useRef(true)
  useEffect(() => {
    typingActiveRef.current = text.length === 0
  }, [text])

  useEffect(() => {
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
  }, [isKo])

  const placeholder = typedPlaceholder || ' '

  return (
    <div className={styles.homeChatBar}>
      <div className={styles.homeChatBarInner} ref={chatBarRef}>
        {birthInfo && (
          <span className={styles.homeBirthChip} aria-live="polite">
            ✓ {isKo ? '분석에 사용' : 'Reading for'}: {birthInfo.birthDate} {birthInfo.birthTime} ·{' '}
            {birthInfo.gender === 'male' ? (isKo ? '남성' : 'Male') : isKo ? '여성' : 'Female'}
          </span>
        )}

        {/* 서비스 선택 창 — 입력창을 터치하면 위로 떠오른다. */}
        {serviceMenuOpen && (
          <div role="menu" className={styles.homeServicePickerMenu}>
            <p className={styles.homeServicePickerHeading}>
              {isKo ? '어떤 상담을 원하세요?' : 'Which reading would you like?'}
            </p>
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

        <textarea
          className={styles.homeChatTextarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setServiceMenuOpen(true)}
          onClick={() => setServiceMenuOpen(true)}
          placeholder={placeholder}
          rows={2}
        />

        <p className={styles.homeChatHint}>
          {isKo ? '입력창을 누르면 상담 종류를 고를 수 있어요' : 'Tap the box to choose a reading'}
        </p>
      </div>
    </div>
  )
}
