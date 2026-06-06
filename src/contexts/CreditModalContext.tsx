'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import CreditDepletedModal from '@/components/ui/CreditDepletedModal'
import { CREDIT_MODAL_EVENT, type CreditModalKind } from '@/lib/api/ApiClient'

interface CreditModalContextType {
  showDepleted: () => void
  showLowCredits: (remaining: number) => void
  // 비로그인 사용자가 무료 체험 한도에 도달했을 때 — 구매 대신 로그인 유도.
  showGuestLimit: () => void
  checkAndShowModal: (remaining: number, threshold?: number) => boolean
}

const CreditModalContext = createContext<CreditModalContextType | null>(null)

export function CreditModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [modalType, setModalType] = useState<'depleted' | 'low' | 'guest'>('depleted')
  const [remainingCredits, setRemainingCredits] = useState(0)

  const showDepleted = useCallback(() => {
    setModalType('depleted')
    setRemainingCredits(0)
    setIsOpen(true)
  }, [])

  const showGuestLimit = useCallback(() => {
    setModalType('guest')
    setRemainingCredits(0)
    setIsOpen(true)
  }, [])

  const showLowCredits = useCallback((remaining: number) => {
    setModalType('low')
    setRemainingCredits(remaining)
    setIsOpen(true)
  }, [])

  // Utility: check remaining credits and show appropriate modal
  // Returns true if modal was shown
  const checkAndShowModal = useCallback(
    (remaining: number, threshold: number = 2): boolean => {
      if (remaining <= 0) {
        showDepleted()
        return true
      }
      if (remaining <= threshold) {
        showLowCredits(remaining)
        return true
      }
      return false
    },
    [showDepleted, showLowCredits]
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  // 단일 표시 지점 — apiFetch 가 크레딧(402)/게스트 한도(401) 응답을 감지해
  // 쏘는 전역 이벤트를 듣고 적절한 모달을 띄운다. 크레딧 쓰는 모든 호출이
  // 자동으로 동일한 안내를 받게 되어, 화면마다 따로 붙일 필요가 없다.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onSignal = (e: Event) => {
      const kind = (e as CustomEvent<{ kind?: CreditModalKind }>).detail?.kind
      // 'guest'(비로그인 401)은 LoginModalContext 가 blur 로그인 모달로 처리한다.
      // 여기선 로그인 사용자의 크레딧 소진(402='depleted')만 담당. (게스트 폐지, audit 2026-06)
      if (kind === 'guest') return
      showDepleted()
    }
    window.addEventListener(CREDIT_MODAL_EVENT, onSignal)
    return () => window.removeEventListener(CREDIT_MODAL_EVENT, onSignal)
  }, [showDepleted])

  return (
    <CreditModalContext.Provider
      value={{ showDepleted, showLowCredits, showGuestLimit, checkAndShowModal }}
    >
      {children}
      <CreditDepletedModal
        isOpen={isOpen}
        onClose={close}
        type={modalType}
        remainingCredits={remainingCredits}
      />
    </CreditModalContext.Provider>
  )
}

export function useCreditModal() {
  const context = useContext(CreditModalContext)
  if (!context) {
    throw new Error('useCreditModal must be used within CreditModalProvider')
  }
  return context
}

// Helper for API responses - can be used without React context
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function shouldShowCreditModal(
  response: Response,
  data: unknown
): {
  show: boolean
  type: 'depleted' | 'low'
  remaining: number
} {
  // 402 Payment Required → 크레딧 소진 안내 (크레딧 전용, 한도 분기 없음)
  if (response.status === 402) {
    return { show: true, type: 'depleted', remaining: 0 }
  }

  // Check for low credits in response data
  const remainingCredits = isRecord(data) ? data.remainingCredits : undefined
  if (typeof remainingCredits === 'number') {
    if (remainingCredits <= 0) {
      return { show: true, type: 'depleted', remaining: 0 }
    }
    if (remainingCredits <= 2) {
      return { show: true, type: 'low', remaining: remainingCredits }
    }
  }

  return { show: false, type: 'depleted', remaining: 0 }
}
