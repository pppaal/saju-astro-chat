'use client'

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { isStandalonePWA } from '@/lib/auth/detectPWA'
import { getStoredBirthInfo } from '@/app/(main)/birthInfoStorage'

/**
 * "앱으로 설치하기" 안내 배너.
 *
 * 표시 조건:
 *   - 이미 PWA 모드면 X (`isStandalonePWA`)
 *   - 영구 dismiss (`destinypal:pwa:dismissed`) 안 했을 때
 *   - 생일 입력해서 1회 이상 서비스를 써본 사용자 (가치 체험 후)
 *
 * 플랫폼별 분기:
 *   - Chrome / Edge — `beforeinstallprompt` 이벤트 → 네이티브 다이얼로그
 *   - iOS Safari — 다이얼로그 미지원. "공유 → 홈 화면에 추가" 가이드
 *   - Firefox / Samsung / in-app webview — 자동 미노출 (지원 X)
 *
 * 사용처: MainPageClient (메인 페이지에서만 노출).
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

/**
 * locale prop 은 MainPageClient 가 useI18n 으로 이미 가지고 있는 값을
 * 그대로 전달 — useI18n() 추가 호출은 t() 만 위해서.
 */
export default function PWAInstallPrompt(_props: { locale: 'ko' | 'en' }) {
  const { t } = useI18n()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [variant, setVariant] = useState<'install' | 'ios'>('install')

  useEffect(() => {
    if (isStandalonePWA()) return
    if (typeof window !== 'undefined' && localStorage.getItem(PWA_DISMISSED_KEY) === '1') return
    if (!getStoredBirthInfo()?.birthDate) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVariant('install')
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

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
      aria-label={t('pwa.installAriaLabel', 'Install as app')}
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom)+0.375rem)] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[var(--z-notification)] mx-auto max-w-sm rounded-xl border border-[#e7e5e4] bg-white p-2.5 shadow-[0_16px_36px_rgba(28,25,23,0.14)]"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(212,181,114,0.15)] text-base">
          📱
        </div>
        <div className="flex-1">
          <h3 className="text-[12.5px] font-semibold text-[#1c1917]">
            {t('pwa.installTitle', 'Quick access — install as app')}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-[#57534e]">
            {variant === 'install'
              ? t(
                  'pwa.installDescription',
                  'Opens faster than the browser, and you can get answer notifications.'
                )
              : t('pwa.iosGuide', 'Tap the share icon (↑) below → "Add to Home Screen".')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {variant === 'install' && (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center rounded-full bg-[#1c1917] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#3a3530]"
              >
                {t('pwa.installButton', 'Install')}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-medium text-[#a8a29e] hover:text-[#1c1917]"
            >
              {t('common.later', 'Later')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close', 'Close')}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#a8a29e] transition hover:bg-[#f5f4f1] hover:text-[#1c1917]"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
