'use client'

/**
 * useClarifierCard — 클래리파이어("한 장 더 뽑기") 카드 공통 로직.
 *
 * destiny-map 상담사 / compatibility 상담사 / tarot followup 셋이 각자 동일
 * 로직을 따로 구현하던 회귀(잠금/안내/자동 스크롤 hijack/버튼 라벨 동기화
 * 누락)를 차단하기 위해 단일 hook 으로 통합. 각 화면은 sendUserText 콜백과
 * suspendAutoScrollRef (있을 때) 만 주입하면 잠금·라벨·버튼 props 가 일관.
 *
 * 정책 (3 화면 공통):
 *  - 한 대화당 한 장만 (clarifierUsed). 새 대화 시작 시 reset() 로 풀림.
 *  - 두 번째 클릭은 모달 안 열고 onLockedNotice 로 안내만.
 *  - confirm 직후 일정 시간(기본 25s) suspendAutoScrollRef = true 로
 *    자동 스크롤 hijack 중지 → 사용자가 본 자리(맨 하단) 유지.
 *  - 라벨: 활성 "카드 한 장 더 뽑기" / 잠긴 "한 장 더 뽑기 불가".
 */

import { useState, useCallback, useMemo } from 'react'
import { buildClarifierUserMessage, type ClarifierCard } from '@/lib/tarot/drawClarifierCard'

type LangKey = 'ko' | 'en'

interface ClarifierMessages {
  /** 잠금 상태에서 두번째 클릭 시 안내 */
  lockedNotice: string
  /** 버튼 활성 라벨 */
  activeLabel: string
  /** 버튼 잠금 라벨 */
  lockedLabel: string
  /** 버튼 활성 title */
  activeTitle: string
  /** 버튼 잠금 title */
  lockedTitle: string
}

const MESSAGES: Record<LangKey, ClarifierMessages> = {
  ko: {
    lockedNotice:
      '이번 대화에서는 보충 카드를 이미 한 장 뽑았어요. 새 대화를 시작하면 다시 뽑을 수 있어요.',
    activeLabel: '카드 한 장 더 뽑기',
    lockedLabel: '한 장 더 뽑기 불가',
    activeTitle: '보충 카드 한 장 더 뽑기 (즉석 클래리파이어)',
    lockedTitle: '이 대화에서는 이미 한 장 뽑았어요',
  },
  en: {
    lockedNotice:
      "You've already drawn one clarifier card in this chat. Start a new chat to draw another.",
    activeLabel: 'Draw one more card',
    lockedLabel: 'No more draws',
    activeTitle: 'Draw one clarifier card (quick)',
    lockedTitle: 'Already drew one in this chat',
  },
}

export interface UseClarifierCardOptions {
  lang: LangKey
  /** confirm 직후 LLM 으로 전달할 user 메시지 sender. */
  onSendUserText: (text: string) => void
  /**
   * 카드가 picked 된 직후 호출 — onSendUserText 와 별개로 카드 객체 자체를
   * 전달받아 별도 저장 (예: TarotReading.clarifierCard 컬럼). 옵션이라
   * 호출처가 필요할 때만 구현.
   */
  onCardPicked?: (card: ClarifierCard) => void
  /** 잠금 상태에서 두번째 클릭 시 안내 표시 (예: setNotice / setError). */
  onLockedNotice?: (message: string) => void
  /** 자동 스크롤 hijack 끄기에 쓸 ref. 없으면 무시. */
  suspendAutoScrollRef?: { current: boolean }
  /** 자동 스크롤 hijack 끄기 지속시간 (기본 25_000ms — 답변 스트리밍 wall-clock 여유). */
  suspendDurationMs?: number
  /** 추가 비활성 조건 (예: 로딩 중, persons.length < 2). 잠금 안 됐어도 모달 못 열게. */
  disabled?: boolean
  /**
   * 초기 잠금 상태 — 이미 보충 카드를 한 장 뽑은 리딩을 "다시 열기" 로 복원할
   * 때 true. 한 리딩당 한 장 정책이 복원 후에도 유지되도록 used 를 처음부터
   * 잠근다(복원 시 새 카드를 또 뽑을 수 있던 회귀 차단).
   */
  initiallyUsed?: boolean
  /**
   * 이미 테이블에 깔린 카드 이름들 — 클래리파이어가 이 중 하나와 겹치지 않게
   * 제외한다(물리 덱 불가능한 중복 방지). 타로 followup 은 스프레드 카드들을
   * 넘긴다. 상담사(사주/점성) 화면처럼 깔린 카드가 없으면 생략(기본 []).
   */
  excludeCardNames?: string[]
}

export interface ClarifierButtonProps {
  onClick: () => void
  disabled: boolean
  'aria-disabled': boolean
  style?: { opacity: number; cursor: string }
  title: string
}

export interface UseClarifierCardReturn {
  /** ClarifierCardModal 에 spread 할 props. */
  modalProps: {
    isOpen: boolean
    onClose: () => void
    onConfirm: (card: ClarifierCard) => void
    lang: LangKey
    excludeCardNames?: string[]
  }
  /** 버튼에 spread 할 props (className/icon 은 호출자가 결합). */
  buttonProps: ClarifierButtonProps
  /** 버튼 안에 넣을 라벨 문자열 (동적 변경). */
  buttonLabel: string
  /** 새 대화 시작 시 호출 — 잠금 풀기. */
  reset: () => void
  /** 외부에서 잠금 상태 참조해야 할 때 (예: 사이드바 아이콘 처리). */
  isLocked: boolean
}

export function useClarifierCard(options: UseClarifierCardOptions): UseClarifierCardReturn {
  const {
    lang,
    onSendUserText,
    onCardPicked,
    onLockedNotice,
    suspendAutoScrollRef,
    suspendDurationMs = 25_000,
    disabled = false,
    initiallyUsed = false,
    excludeCardNames,
  } = options

  const [showModal, setShowModal] = useState(false)
  const [used, setUsed] = useState(initiallyUsed)

  const messages = MESSAGES[lang] ?? MESSAGES.en

  const openClarifier = useCallback(() => {
    if (disabled) return
    if (used) {
      onLockedNotice?.(messages.lockedNotice)
      return
    }
    setShowModal((prev) => (prev ? prev : true))
  }, [disabled, used, onLockedNotice, messages.lockedNotice])

  const handleConfirm = useCallback(
    (card: ClarifierCard) => {
      // 자동 스크롤 hijack 잠시 중지 — "그 자리 유지" 회귀 방지.
      if (suspendAutoScrollRef) {
        suspendAutoScrollRef.current = true
        window.setTimeout(() => {
          suspendAutoScrollRef.current = false
        }, suspendDurationMs)
      }
      setUsed(true)
      onCardPicked?.(card)
      const userText = buildClarifierUserMessage(card, lang)
      onSendUserText(userText)
    },
    [lang, onSendUserText, onCardPicked, suspendAutoScrollRef, suspendDurationMs]
  )

  const closeModal = useCallback(() => setShowModal(false), [])

  const reset = useCallback(() => {
    setUsed(false)
    setShowModal(false)
  }, [])

  const buttonProps = useMemo<ClarifierButtonProps>(
    () => ({
      onClick: openClarifier,
      // disabled 는 "물리적으로 클릭 못 함" — 모달 열려 있을 때만 true.
      // 잠금 상태(used) 에서는 클릭 자체는 허용해 onLockedNotice 가 떠야 한다.
      disabled: showModal || disabled,
      'aria-disabled': showModal || disabled || used,
      style: used ? { opacity: 0.55, cursor: 'not-allowed' } : undefined,
      title: used ? messages.lockedTitle : messages.activeTitle,
    }),
    [openClarifier, showModal, disabled, used, messages.lockedTitle, messages.activeTitle]
  )

  return {
    modalProps: {
      isOpen: showModal,
      onClose: closeModal,
      onConfirm: handleConfirm,
      lang,
      excludeCardNames,
    },
    buttonProps,
    buttonLabel: used ? messages.lockedLabel : messages.activeLabel,
    reset,
    isLocked: used,
  }
}
