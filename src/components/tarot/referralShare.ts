'use client'

/**
 * referralShare — 공유 카드(TarotShareCard)에 박을 *추천 링크 QR* 을 만든다.
 *
 * 흐름: 로그인 사용자면 /api/referral/me 에서 개인 추천 링크(?ref=코드)를
 * 받아 QR 로 인코딩한다. 그 QR 을 본 친구가 스캔→가입하면 referralService
 * 가 양쪽에 크레딧을 주는 바이럴 루프가 닫힌다. 게스트(401)나 네트워크
 * 실패 시엔 추천 코드 없는 기본 타로 링크로 폴백해 *최소한 유입*은 유지한다.
 *
 * 서버/스토리지 없이 클라이언트에서 끝난다(게스트도 폴백 QR 사용 가능).
 */

import { tarotLogger } from '@/lib/logger'

const FALLBACK_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) || 'https://destinypal.com'

export interface ReferralShareTarget {
  /** QR 이 가리키는 전체 URL (추천 코드 포함 가능). */
  shareUrl: string
  /** QR 을 그릴 data URL (PNG). 생성 실패 시 undefined. */
  qrDataUrl?: string
}

/** 내 추천 링크를 가져온다. 게스트/실패 시 기본 타로 링크로 폴백. */
async function resolveReferralUrl(): Promise<string> {
  try {
    const res = await fetch('/api/referral/me', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    if (res.ok) {
      const json = (await res.json()) as { data?: { referralUrl?: string }; referralUrl?: string }
      const url = json?.data?.referralUrl || json?.referralUrl
      if (typeof url === 'string' && url.length > 0) return url
    }
  } catch (err) {
    tarotLogger.warn(
      '[referralShare] referral fetch failed, using fallback link',
      err instanceof Error ? { error: err.message } : undefined
    )
  }
  // 게스트/실패 폴백 — 코드는 없지만 유입 경로는 살린다.
  return `${FALLBACK_BASE.replace(/\/$/, '')}/tarot`
}

/**
 * 추천 링크 + QR data URL 을 만든다. QR 인코딩은 무거운 의존성이라
 * 동적 import (공유 클릭 시에만 로드). 어떤 단계가 실패해도 throw 하지
 * 않고, 최소한 shareUrl 만은 항상 돌려준다(QR 없이도 텍스트 폴백 가능).
 */
export async function buildReferralShareTarget(): Promise<ReferralShareTarget> {
  const shareUrl = await resolveReferralUrl()
  try {
    const QRCode = (await import('qrcode')).default
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 288,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1022', light: '#ffffff' },
    })
    return { shareUrl, qrDataUrl }
  } catch (err) {
    tarotLogger.warn(
      '[referralShare] QR generation failed',
      err instanceof Error ? { error: err.message } : undefined
    )
    return { shareUrl }
  }
}
