'use client'

import { useCallback, useEffect, useState } from 'react'
import { isStandalonePWA } from '@/lib/auth/detectPWA'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

/**
 * "앱으로 설치하기" 안내 배너.
 *
 * 표시 조건:
 *   - 이미 PWA 모드면 X (이미 설치 완료)
 *   - 생일 입력해서 1회 이상 서비스를 써본 사용자 (`getStoredBirthInfo()`)
 *   - 영구 dismiss (`destinypal:pwa:dismissed`) 안 했을 때
 *
 * 플랫폼별 분기:
 *   - Chrome / Edge (Android, Desktop) — `beforeinstallprompt` 이벤트 수신 →
 *     "설치" 버튼 클릭 시 네이티브 다이얼로그 호출
 *   - iOS Safari — `beforeinstallprompt` 미지원. "공유 → 홈 화면에 추가" 가이드 노출
 *   - 그 외 (Firefox / Samsung Internet / in-app webview) — 배너 미노출
 *     (지원 안 하므로)
 *
 * 사용처: MainPageClient 에 마운트 (메인 페이지에서만 노출).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PWA_DISMISSED_KEY = 'destinypal:pwa:dismissed'

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIOS && isSafari
}

export default function PWAInstallPrompt({ locale }: { locale: 'ko' | 'en' }) {
  const isKo = locale === 'ko'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [variant, setVariant] = useState<'install' | 'ios'>('install')

  useEffect(() => {
    // 이미 PWA 모드 → 배너 표시 X
    if (isStandalonePWA()) return

    // 영구 dismiss 했으면 표시 X
    if (typeof window !== 'undefined' && localStorage.getItem(PWA_DISMISSED_KEY) === '1') return

    // 생일 입력 안 한 첫 방문 사용자엔 표시 X — 가치 체험 전이라 ROI 낮음.
    // 한 번이라도 생일을 저장한 적이 있으면 (= 서비스 진입했었음) 표시 OK.
    if (!getStoredBirthInfo()?.birthDate) return

    // Chrome / Edge — beforeinstallprompt 이벤트로 설치 가능 여부 감지
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVariant('install')
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari — beforeinstallprompt 미지원. 별도 안내.
    if (isIOSSafari()) {
      setVariant('ios')
      setShowBanner(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = useCallback(() => {
    setShowBanner(false)
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, '1')
    } catch {
      /* private mode — non-fatal */
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      dismiss()
    }
    setDeferredPrompt(null)
  }, [deferredPrompt, dismiss])

  if (!showBanner) return null

  return (
    <div
      role="dialog"
      aria-label={isKo ? '앱으로 설치하기' : 'Install as app'}
      className="fixed bottom-4 left-4 right-4 z-[var(--z-notification)] mx-auto max-w-md rounded-2xl border border-[#e7e5e4] bg-white p-4 shadow-[0_24px_48px_rgba(28,25,23,0.15)] sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,181,114,0.15)] text-xl">
          📱
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-[#1c1917]">
            {isKo ? '앱으로 빠르게 — 홈 화면에 추가' : 'Quick access — install as app'}
          </h3>
          {variant === 'install' ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#57534e]">
              {isKo
                ? '브라우저보다 빠르게 열리고, 알림으로 새 답변을 받아볼 수 있어요.'
                : 'Opens faster than the browser, and you can get answer notifications.'}
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#57534e]">
              {isKo
                ? '하단 공유 버튼(↑) → "홈 화면에 추가" 를 눌러 주세요.'
                : 'Tap the share icon (↑) below → "Add to Home Screen".'}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {variant === 'install' && (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center rounded-full bg-[#1c1917] px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#3a3530]"
              >
                {isKo ? '설치' : 'Install'}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-[12.5px] font-medium text-[#a8a29e] hover:text-[#1c1917]"
            >
              {isKo ? '나중에' : 'Later'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={isKo ? '닫기' : 'Close'}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#a8a29e] transition hover:bg-[#f5f4f1] hover:text-[#1c1917]"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
