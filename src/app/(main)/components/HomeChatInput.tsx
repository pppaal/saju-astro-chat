'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildCounselorHref } from '../birthInfoStorage'

// 서비스 선택 — config/enabledServices.ts 와 동일 id·라벨.
export type HomeServiceId = 'destinyMap' | 'tarot' | 'compatibility' | 'calendar'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  // 생일이 필요한 서비스(궁합·운명상담사)를 생일 없이 골랐을 때 호출 —
  // 부모가 생일 모달을 띄우고, 저장되면 그 서비스로 이동시킨다.
  onRequireBirth: (service: HomeServiceId, question: string) => void
  // 그냥 생일 모달만 열기 — 입력/수정용(자동 이동 없음). 초록 CTA 탭,
  // 또는 질문 없이 엔터쳤을 때.
  onOpenBirth: () => void
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

export default function HomeChatInput({
  birthInfo,
  onRequireBirth,
  onOpenBirth,
  locale,
}: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const isKo = locale === 'ko'

  // 엔터/↑ 의 행선지. 자유 입력을 쓰는 건 운명 상담사뿐이라 기본 행선지로 삼는다.
  // - 생일 있음 → 바로 운명 상담사(질문 전달)
  // - 생일 없고 질문 있음 → 생일창 먼저, 저장하면 그 질문 들고 운명 상담사
  // - 생일 없고 질문 비었음 → 생일창만 열고(자동 이동 X), 사용자가 아래 칩에서 선택
  const goCounselor = () => {
    const trimmed = text.trim()
    if (!birthInfo) {
      if (trimmed) onRequireBirth('destinyMap', trimmed)
      else onOpenBirth()
      return
    }
    // 채팅 페이지로 직행 — 질문이 그대로 전달돼 자동으로 답변이 생성된다.
    router.push(buildCounselorHref(birthInfo, trimmed, locale))
  }

  // 칩으로 서비스 직접 선택. 타로·운세달력은 생일이 필요 없으니 바로 진입하고,
  // 궁합·운명상담사만 생일을 요구한다(없으면 모달 먼저).
  const selectService = (service: HomeServiceId) => {
    if (service === 'destinyMap') {
      goCounselor()
      return
    }
    if (service === 'tarot') {
      router.push('/tarot')
      return
    }
    if (service === 'calendar') {
      router.push('/calendar')
      return
    }
    // compatibility — 생일 필요.
    if (!birthInfo) {
      onRequireBirth('compatibility', text.trim())
      return
    }
    router.push('/compatibility')
  }

  // 엔터(Shift 제외)로 바로 운명 상담사에게 전송. Shift+Enter 는 줄바꿈.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      goCounselor()
    }
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
      {/* 서비스 칩 — 입력창 위 한 줄. 타이핑은 운명상담사로, 나머지 상담은 여기서. */}
      <div
        className={styles.homeServiceChips}
        role="group"
        aria-label={isKo ? '상담 종류 선택' : 'Choose a reading'}
      >
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.homeServiceChip}
            onClick={() => selectService(s.id)}
          >
            <span aria-hidden="true">{s.icon}</span>
            <span>{isKo ? s.ko : s.en}</span>
          </button>
        ))}
      </div>

      <div className={styles.homeChatBarInner}>
        {/* 초록 생일 CTA — 출발점이 생일임을 보여주고, 저장된 뒤엔 수정 버튼이 된다. */}
        {birthInfo ? (
          <button
            type="button"
            className={styles.homeBirthChip}
            onClick={onOpenBirth}
            aria-label={isKo ? '생년월일 정보 수정' : 'Edit birth info'}
          >
            ✓ {isKo ? '분석에 사용' : 'Reading for'}: {birthInfo.birthDate} {birthInfo.birthTime} ·{' '}
            {birthInfo.gender === 'male' ? (isKo ? '남성' : 'Male') : isKo ? '여성' : 'Female'}
            <span className={styles.homeBirthChipEdit}>{isKo ? '수정' : 'Edit'}</span>
          </button>
        ) : (
          <button type="button" className={styles.homeBirthCta} onClick={onOpenBirth}>
            <span aria-hidden="true">📅</span>
            {isKo ? '먼저 생년월일을 입력하세요' : 'Start by entering your birth date'}
          </button>
        )}

        <div className={styles.homeChatRow}>
          <textarea
            className={styles.homeChatTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
          />
          <button
            type="button"
            className={styles.homeChatSubmit}
            onClick={goCounselor}
            aria-label={isKo ? '운명 상담사에게 질문하기' : 'Ask the destiny counselor'}
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </div>
  )
}
