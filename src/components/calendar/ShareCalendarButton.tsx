'use client'

/**
 * ShareCalendarButton — 운흐름 캘린더의 이달 흐름 한 줄을 공개 공유 링크
 * (/r/[token])로 만들어 Web Share API 또는 클립보드 복사로 내보낸다.
 * 서버엔 요약 텍스트만 저장(개인 원국/생년월일은 보내지 않음).
 *
 * 궁합 ShareCompatibilityButton 과 동일한 링크 공유 흐름 — OG 이미지는
 * /r/[token]/opengraph-image 가 동적 생성한다.
 */

import { useCallback, useRef, useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'

export interface CalendarShareData {
  isKo: boolean
  periodLabel: string
  headline: string
  highlights?: string[]
}

export function ShareCalendarButton({ data }: { data: CalendarShareData }) {
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
      const res = await apiFetch('/api/calendar/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          periodLabel: data.periodLabel,
          headline: data.headline,
          highlights: data.highlights?.length ? data.highlights.slice(0, 5) : undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return
      }
      const shareText = data.headline || data.periodLabel
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 운흐름' : 'DestinyPal Calendar',
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
      logger.error('[ShareCalendar] link create failed', err instanceof Error ? err : undefined)
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
            ? '이달 흐름 공유하기'
            : 'Share this month'}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}
