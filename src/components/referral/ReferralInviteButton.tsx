'use client'

/**
 * ReferralInviteButton — 무료 결과 화면에서 로그인 유저가 자기 추천 링크
 * (/?ref=CODE)를 바로 공유하게 한다. 공유 버튼(결과 자랑)과 달리 이건 "친구
 * 데려오면 둘 다 크레딧" 동기를 노출하는 자리다.
 *
 * 로그인 유저만 코드가 있으므로 비로그인 시엔 렌더하지 않는다(게스트는 이미
 * 결과 공유 버튼으로 바이럴에 기여). 보상은 친구의 첫 결제 시 지급(서버 정책)
 * 이라 카피도 그대로 정직하게 적는다.
 */

import { useCallback, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Gift, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { logger } from '@/lib/logger'
import { REFERRER_CREDITS, REFEREE_CREDITS } from '@/lib/referral/rewards'

export function ReferralInviteButton({ isKo }: { isKo: boolean }) {
  const { status } = useSession()
  const [phase, setPhase] = useState<'idle' | 'creating' | 'copied'>('idle')
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const handleInvite = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    trackFunnel('referral.invite_clicked')
    setError(null)
    setPhase('creating')
    try {
      const res = await apiFetch('/api/referral/create-code', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as {
        data?: { referralUrl?: string }
      } | null
      const url = json?.data?.referralUrl
      if (!res.ok || !url) {
        setError(isKo ? '초대 링크를 만들지 못했어요.' : 'Could not create an invite link.')
        return
      }
      const text = isKo
        ? 'DestinyPal에서 사주·궁합 무료로 봐봐!'
        : 'Check your free Saju & compatibility on DestinyPal!'
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 초대' : 'DestinyPal invite',
            text,
            url,
          })
          return
        } catch (err) {
          if ((err as Error & { name?: string })?.name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        setPhase('copied')
        setTimeout(() => setPhase('idle'), 2000)
        return
      } catch {
        setError(isKo ? `초대 링크: ${url}` : `Invite link: ${url}`)
      }
    } catch (err) {
      logger.error('[ReferralInvite] create failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
    } finally {
      busyRef.current = false
      setPhase((p) => (p === 'creating' ? 'idle' : p))
    }
  }, [isKo])

  // 비로그인 유저는 추천 코드가 없으므로 노출하지 않는다.
  if (status !== 'authenticated') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={() => void handleInvite()}
        disabled={phase === 'creating'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 22px',
          borderRadius: 999,
          background: 'rgba(212,181,114,0.12)',
          color: '#d4b572',
          border: '1px solid rgba(212,181,114,0.4)',
          fontSize: 14,
          fontWeight: 700,
          cursor: phase === 'creating' ? 'wait' : 'pointer',
        }}
      >
        {phase === 'creating' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : phase === 'copied' ? (
          <Check className="w-4 h-4" />
        ) : (
          <Gift className="w-4 h-4" />
        )}
        {phase === 'copied'
          ? isKo
            ? '초대 링크 복사됨!'
            : 'Invite link copied!'
          : isKo
            ? `친구 초대하고 ${REFERRER_CREDITS} 크레딧 받기`
            : `Invite a friend, earn ${REFERRER_CREDITS} credits`}
      </button>
      <p style={{ fontSize: 11.5, lineHeight: 1.5, color: '#9aa3b8', textAlign: 'center' }}>
        {isKo
          ? `친구가 첫 결제하면 나 +${REFERRER_CREDITS} · 친구 +${REFEREE_CREDITS} 크레딧.`
          : `When your friend makes their first purchase: you +${REFERRER_CREDITS}, they +${REFEREE_CREDITS} credits.`}
      </p>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}

export default ReferralInviteButton
