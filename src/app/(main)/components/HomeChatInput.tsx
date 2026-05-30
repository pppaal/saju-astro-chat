'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildCounselorHref } from '../birthInfoStorage'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  // 생일 없이 질문을 입력하고 엔터한 경우 호출 — 부모가 생일 모달을 띄우고,
  // 저장되면 그 질문을 들고 운명상담사로 이동시킨다.
  onRequireBirth: (question: string) => void
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

// 칩 표시용 — "1995년 2월 9일 06:40am (남)" 형식.
function formatSubject(info: StoredBirthInfo, isKo: boolean): string {
  const [y, m, d] = info.birthDate.split('-').map((n) => parseInt(n, 10))
  const datePart = isKo
    ? `${y}년 ${m}월 ${d}일`
    : `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  let timePart = ''
  if (!info.birthTimeUnknown && info.birthTime && info.birthTime !== '00:00') {
    const [hh, mm] = info.birthTime.split(':').map((n) => parseInt(n, 10))
    const ampm = hh < 12 ? 'am' : 'pm'
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    timePart = ` ${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}${ampm}`
  }
  const g = info.gender === 'male' ? (isKo ? '남' : 'M') : isKo ? '여' : 'F'
  return `${datePart}${timePart} (${g})`
}

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

  // 메인 페이지 = 운명상담사 한 흐름.
  // - 생일 있음 → 바로 운명 상담사로 (질문 전달 → 자동 답변)
  // - 생일 없고 질문 있음 → 생일 모달, 저장하면 그 질문 들고 운명상담사
  // - 생일 없고 질문 비었음 → 생일 모달만 (자동 이동 X)
  // 타로 / 궁합은 햄버거 사이드 메뉴에서만 접근 — 같은 입력란에 묶으면 사용자가
  // "자유 질문" vs "modality 선택" 사이에서 혼란.
  const goCounselor = () => {
    const trimmed = text.trim()
    if (!birthInfo) {
      if (trimmed) onRequireBirth(trimmed)
      else onOpenBirth()
      return
    }
    router.push(buildCounselorHref(birthInfo, trimmed, locale))
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
      {/* 서비스 칩 폐기 — 메인 = 운명상담사 한 흐름. 타로 / 궁합은 햄버거
          사이드에서 접근. 같은 입력란에 묶으면 "자유 질문 받음 (운명)" vs
          "modality 별도 (타로/궁합)" 사이에서 사용자 헷갈림. */}

      <div className={styles.homeChatBarInner}>
        {/* 초록 생일 CTA — 출발점이 생일임을 보여주고, 저장된 뒤엔 수정 버튼이 된다. */}
        {birthInfo ? (
          <button
            type="button"
            className={styles.homeBirthChip}
            onClick={onOpenBirth}
            aria-label={isKo ? '생년월일 정보 수정' : 'Edit birth info'}
          >
            {isKo ? '상담자: ' : 'Subject: '}
            {formatSubject(birthInfo, isKo)}
            <span className={styles.homeBirthChipEdit}>{isKo ? '정보 변경' : 'Edit'}</span>
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
