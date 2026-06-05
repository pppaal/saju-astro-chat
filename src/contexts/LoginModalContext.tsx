'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import LoginRequiredModal from '@/components/auth/LoginRequiredModal'

interface LoginModalContextType {
  // 로그인 모달을 띄운다. callbackUrl 을 주면 로그인 후 그 경로로 복귀.
  showLogin: (callbackUrl?: string) => void
  hideLogin: () => void
}

const LoginModalContext = createContext<LoginModalContextType | null>(null)

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | undefined>(undefined)

  const showLogin = useCallback((cb?: string) => {
    setCallbackUrl(cb)
    setIsOpen(true)
  }, [])

  const hideLogin = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <LoginModalContext.Provider value={{ showLogin, hideLogin }}>
      {children}
      <LoginRequiredModal isOpen={isOpen} onClose={hideLogin} callbackUrl={callbackUrl} />
    </LoginModalContext.Provider>
  )
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext)
  if (!ctx) {
    throw new Error('useLoginModal must be used within LoginModalProvider')
  }
  return ctx
}

/**
 * 유료 액션을 가드하는 헬퍼. 핸들러 첫 줄에서 `if (!requireLogin()) return` 으로
 * 쓴다. 인증 완료면 true(진행), 비로그인이면 로그인 모달을 띄우고 false.
 * 세션 확인 중('loading')에는 모달 없이 false 만 반환해 잘못된 모달 깜빡임을
 * 막는다(사용자가 다시 시도하면 그때 정확히 분기).
 */
export function useRequireLogin() {
  const { status } = useSession()
  const { showLogin } = useLoginModal()
  return useCallback(
    (callbackUrl?: string): boolean => {
      if (status === 'authenticated') {return true}
      if (status === 'unauthenticated') {showLogin(callbackUrl)}
      return false
    },
    [status, showLogin]
  )
}
