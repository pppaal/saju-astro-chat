'use client'

import { useEffect, useState } from 'react'

/**
 * 모달 공통 동작 — 여러 모달이 똑같이 들고 있던 두 패턴을 묶은 것.
 *
 * 1) useModalDismiss : 열려 있는 동안 Esc 로 닫기 + body 스크롤 잠금.
 * 2) useModalTransition : 마운트/언마운트 enter·exit 애니메이션용
 *    isVisible / isAnimating 상태 관리 (CSS 클래스 토글 + exit 지연).
 */

/**
 * 열려 있는 동안 Escape 키로 닫고, body 스크롤을 잠근다.
 *
 * iOS Safari 는 `overflow: hidden` 만으로는 scroll-chain 을 막지 못한다.
 * 그래서 position-fixed 트릭을 사용한다: 현재 scrollY 를 캡쳐해 body 를
 * 동일 위치에 고정하고, 닫힐 때 원래 스크롤 위치로 복원한다.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const scrollY = window.scrollY
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
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
