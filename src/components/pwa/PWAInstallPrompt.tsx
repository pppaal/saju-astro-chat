'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { isStandalonePWA } from '@/lib/auth/detectPWA'
import { getStoredBirthInfo } from '@/lib/birth/storage'

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
 * 사용처: MainPageClient (메인 페이지에서만 노출) — v9 종이 홈이라 종이 판 · 먹 글자 · 선 기호
 * (이모지 없음, SPEC9 규칙 10).
 *
 * 화면 아래의 닫을 수 있는 시트다(비모달 dialog). globals.css 모바일 규칙 [role='dialog']
 * { position: fixed; inset: 0 } 이 이 안내를 첫 화면 전체를 덮는 흰 판으로 부풀렸다(QA VH-6 ·
 * home-saved-iosprompt) — 자리는 인라인 style 로 되돌린다(스타일시트 규칙보다 앞선다).
 */

/** 아래쪽 시트 자리 — 전역 [role='dialog'] inset:0 을 이긴다. */
const SHEET_POSITION: CSSProperties = {
  position: 'fixed',
  top: 'auto',
  bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.375rem))',
  left: 'max(0.75rem, env(safe-area-inset-left))',
  right: 'max(0.75rem, env(safe-area-inset-right))',
  overflowY: 'visible',
}

/** 휴대폰 + 홈 화면으로 내리는 화살표 — v9 선 기호(14px 격자, 1.5 선, currentColor). */
function InstallGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="1.5" width="8" height="13" rx="1.6" />
      <path d="M8 5v4.5M6 7.5 8 9.5l2-2M7 12.2h2" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
    </svg>
  )
}

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
      aria-modal="false"
      aria-label={t('pwa.installAriaLabel', 'Install as app')}
      data-pwa-prompt={variant}
      style={SHEET_POSITION}
      className="z-[var(--z-notification)] mx-auto h-auto max-w-sm rounded-2xl border border-[#ded7cb] bg-[#fbf9f4] p-2.5 shadow-[0_18px_36px_-18px_rgba(27,25,22,0.45)]"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eae5db] text-[#1b1916]">
          <InstallGlyph />
        </div>
        <div className="flex-1">
          <h3 className="text-[12.5px] font-semibold text-[#1b1916]">
            {t('pwa.installTitle', 'Quick access — install as app')}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-[#46413a]">
            {variant === 'install'
              ? t(
                  'pwa.installDescription',
                  'Opens faster than the browser, and you can get answer notifications.'
                )
              : t('pwa.iosGuide', 'Tap the share icon (↑) below → "Add to Home Screen".')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {variant === 'install' && (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center rounded-full bg-[#1b1916] px-3 py-1 text-[11px] font-medium text-[#f3efe7] hover:bg-[#2a2723]"
              >
                {t('pwa.installButton', 'Install')}
              </button>
            )}
            {/* 모바일 전역 터치 규칙(globals.css ≤768px, 특이도 0,3,1)이 padding 10px 16px 를 넣어
                'Later' 가 글 칸보다 16px 들여 써진다 — 44px 터치 높이는 두고 좌우 여백만 0(QA R-VH-5).
                Tailwind 클래스는 그 규칙을 못 이겨 인라인으로. */}
            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-medium text-[#6e695f] hover:text-[#1b1916]"
              style={{ paddingLeft: 0, paddingRight: 0 }}
            >
              {t('common.later', 'Later')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close', 'Close')}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#6e695f] transition hover:bg-[#eae5db] hover:text-[#1b1916]"
        >
          <CloseGlyph />
        </button>
      </div>
    </div>
  )
}
