'use client'

/**
 * ShareLifeButton — 인생/대운 흐름 곡선 + 한 줄을 공개 공유 링크(/r/[token])로
 * 만들어 Web Share API 또는 클립보드 복사로 내보낸다. 서버엔 요약 텍스트·곡선
 * 숫자·연도 라벨만 저장(개인 원국/생년월일은 안 보냄).
 *
 * ShareCalendarButton 과 동일한 링크 공유 흐름 — OG 이미지는
 * /r/[token]/opengraph-image 가 동적 생성(인생 곡선 + 한 줄).
 */

import { useCallback, useRef, useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'

export interface LifeShareData {
  isKo: boolean
  /** 인생유형 별명(대기만성형 등) — 공유카드 주인공 배지. */
  typeName?: string
  rangeLabel?: string
  headline: string
  subline?: string
  curve: number[]
  axisLabels?: string[]
  markerIndex?: number
  peakIndex?: number
}

export function ShareLifeButton({ data }: { data: LifeShareData }) {
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
      const res = await apiFetch('/api/life/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          typeName: data.typeName || undefined,
          rangeLabel: data.rangeLabel || undefined,
          headline: data.headline,
          subline: data.subline || undefined,
          curve: data.curve.map((n) => Math.round(n)),
          axisLabels: data.axisLabels?.length ? data.axisLabels.slice(0, 4) : undefined,
          markerIndex: data.markerIndex,
          peakIndex: data.peakIndex,
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return
      }
      const shareText = data.headline || data.rangeLabel || ''
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 인생 곡선' : 'DestinyPal — Life Curve',
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
      logger.error('[ShareLife] link create failed', err instanceof Error ? err : undefined)
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
            ? '인생 곡선 공유하기'
            : 'Share life curve'}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}

export default ShareLifeButton
