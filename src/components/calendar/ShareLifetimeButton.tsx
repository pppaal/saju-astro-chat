'use client'

/**
 * ShareLifetimeButton — "내 인생 그래프"를 공개 공유 링크(/r/[token])로 만든다.
 * 인생 곡선(0..100 다운샘플) + 전성기/후크 한 줄만 서버에 저장(생년월일·원국 X).
 * OG 이미지(/r/[token]/opengraph-image)가 곡선 카드를 동적 생성 → 링크 자체가
 * 정체성 강한 공유 자산이 된다(바이럴 1순위).
 *
 * ShareCalendarButton 과 동일한 링크 공유 흐름.
 */

import { useCallback, useRef, useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'

export interface LifetimeShareData {
  isKo: boolean
  patternLabel: string
  hook: string
  peakLabel: string
  curve: number[]
  nowAge: number
}

export function ShareLifetimeButton({ data }: { data: LifetimeShareData }) {
  const isKo = data.isKo
  const [phase, setPhase] = useState<'idle' | 'creating' | 'copied'>('idle')
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const handleShare = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    setPhase('creating')
    try {
      const res = await apiFetch('/api/calendar/share/lifetime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          patternLabel: data.patternLabel,
          hook: data.hook,
          peakLabel: data.peakLabel,
          curve: data.curve.slice(0, 64).map((n) => Math.round(n)),
          nowAge: data.nowAge,
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return
      }
      const shareText = isKo
        ? `내 인생의 정점은 ${data.peakLabel}`
        : `My peak years: ${data.peakLabel}`
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 인생 그래프' : 'DestinyPal Life Curve',
            text: shareText,
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
        setError(isKo ? `링크: ${url}` : `Link: ${url}`)
      }
    } catch (err) {
      logger.error('[ShareLifetime] link create failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
    } finally {
      busyRef.current = false
      setPhase((p) => (p === 'creating' ? 'idle' : p))
    }
  }, [isKo, data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={phase === 'creating'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          borderRadius: 999,
          background: 'rgba(232,204,138,0.12)',
          color: '#e8cc8a',
          border: '1px solid rgba(232,204,138,0.4)',
          fontSize: 15,
          fontWeight: 700,
          cursor: phase === 'creating' ? 'wait' : 'pointer',
        }}
      >
        {phase === 'creating' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : phase === 'copied' ? (
          <Check className="w-4 h-4" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        {phase === 'copied'
          ? isKo
            ? '링크 복사됨!'
            : 'Link copied!'
          : isKo
            ? '내 인생 그래프 공유하기'
            : 'Share my life curve'}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}

export default ShareLifetimeButton
