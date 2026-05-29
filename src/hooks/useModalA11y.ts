'use client'

import { useEffect, useState } from 'react'

/**
 * 모달 공통 동작 — 여러 모달이 똑같이 들고 있던 두 패턴을 묶은 것.
 *
 * 1) useModalDismiss : 열려 있는 동안 Esc 로 닫기 + body 스크롤 잠금.
 * 2) useModalTransition : 마운트/언마운트 enter·exit 애니메이션용
 *    isVisible / isAnimating 상태 관리 (CSS 클래스 토글 + exit 지연).
 */

/** 열려 있는 동안 Escape 키로 닫고, body 스크롤을 잠근다. */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])
}

/**
 * enter/exit 트랜지션 상태. isOpen=true 면 즉시 마운트(isVisible) 후 다음
 * 프레임에 isAnimating 을 켜 CSS 전환을 트리거하고, false 가 되면 exitMs 뒤에
 * 언마운트한다. 반환값으로 렌더 가드(`if (!isVisible) return null`)와 클래스
 * 토글(`isAnimating ? styles.visible : ''`)을 한다.
 */
export function useModalTransition(
  isOpen: boolean,
  exitMs = 300
): { isVisible: boolean; isAnimating: boolean } {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const raf = requestAnimationFrame(() => setIsAnimating(true))
      return () => cancelAnimationFrame(raf)
    }
    setIsAnimating(false)
    const timer = setTimeout(() => setIsVisible(false), exitMs)
    return () => clearTimeout(timer)
  }, [isOpen, exitMs])

  return { isVisible, isAnimating }
}
