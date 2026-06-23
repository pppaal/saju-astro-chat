'use client'

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import {
  isPushConfigured,
  isPushSupported,
  getExistingPushSubscription,
  subscribeToDailyFortunePush,
  unsubscribeFromDailyFortunePush,
} from '@/lib/push/subscribe'

/**
 * "매일 아침 오늘의 운세 알림 받기" 옵트인 배너 — 캘린더 페이지 하단.
 *
 * 표시 조건:
 *   - VAPID 키 설정 + 브라우저 푸시 지원 (iOS 는 설치형 PWA 만)
 *   - localStorage 로 "닫기" 영구 기억 (`destinypal:push:daily-fortune:dismissed`)
 *
 * 이미 구독 상태면 해제 토글을 보여준다. 권한이 거부돼 있으면 안내만.
 * 스타일은 PWAInstallPrompt 배너와 동일한 디자인 토큰(카드/스톤 톤)을 따른다.
 */

const PUSH_DISMISSED_KEY = 'destinypal:push:daily-fortune:dismissed'

type BannerState = 'hidden' | 'optin' | 'subscribed' | 'denied'

export default function DailyFortunePushBanner({ locale }: { locale: 'ko' | 'en' }) {
  const { t } = useI18n()
  const [state, setState] = useState<BannerState>('hidden')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushConfigured() || !isPushSupported()) return
    try {
      if (localStorage.getItem(PUSH_DISMISSED_KEY) === '1') return
    } catch {
      /* private mode */
    }

    let cancelled = false
    void getExistingPushSubscription().then((subscription) => {
      if (cancelled) return
      if (subscription) {
        setState('subscribed')
      } else if (Notification.permission === 'denied') {
        // 권한 차단 상태 — 눌러도 소용없으니 배너를 띄우지 않는다.
        setState('hidden')
      } else {
        setState('optin')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = useCallback(() => {
    setState('hidden')
    try {
      localStorage.setItem(PUSH_DISMISSED_KEY, '1')
    } catch {
      /* private mode — non-fatal */
    }
  }, [])

  const handleSubscribe = useCallback(async () => {
    setBusy(true)
    const result = await subscribeToDailyFortunePush(locale)
    setBusy(false)
    if (result.status === 'subscribed') setState('subscribed')
    else if (result.status === 'denied') setState('denied')
    else if (result.status === 'unsupported' || result.status === 'not_configured') {
      setState('hidden')
    }
    // 'error' 는 상태 유지 — 재시도 가능
  }, [locale])

  const handleUnsubscribe = useCallback(async () => {
    setBusy(true)
    await unsubscribeFromDailyFortunePush()
    setBusy(false)
    setState('optin')
  }, [])

  if (state === 'hidden') return null

  return (
    <div
      role="dialog"
      aria-label={t('push.dailyFortuneAriaLabel', 'Daily fortune notifications')}
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom)+0.375rem)] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[var(--z-notification)] mx-auto max-w-sm rounded-xl border border-[#e7e5e4] bg-white p-2.5 shadow-[0_16px_36px_rgba(28,25,23,0.14)]"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(212,181,114,0.15)] text-base">
          🌅
        </div>
        <div className="flex-1">
          <h3 className="text-[12.5px] font-semibold text-[#1c1917]">
            {t('push.dailyFortuneTitle', 'Get your daily fortune every morning')}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-[#57534e]">
            {state === 'denied'
              ? t(
                  'push.permissionDenied',
                  'Notifications are blocked. Allow them in your browser settings.'
                )
              : state === 'subscribed'
                ? t('push.dailyFortuneEnabled', 'Daily fortune notifications are on.')
                : t(
                    'push.dailyFortuneDescription',
                    'One line of fortune for your day, delivered each morning.'
                  )}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {state === 'optin' && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubscribe}
                className="inline-flex items-center rounded-full bg-[#1c1917] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#3a3530] disabled:opacity-60"
              >
                {t('push.enableButton', 'Turn on')}
              </button>
            )}
            {state === 'subscribed' && (
              <button
                type="button"
                disabled={busy}
                onClick={handleUnsubscribe}
                className="inline-flex items-center rounded-full border border-[#d6d3d1] px-3 py-1 text-[11px] font-medium text-[#1c1917] hover:bg-[#f5f4f1] disabled:opacity-60"
              >
                {t('push.disableButton', 'Turn off')}
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
