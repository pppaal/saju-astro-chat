'use client'

/**
 * ShareCompatibilityButton — 무료 궁합 결과의 공개 공유 링크(/r/[token])를
 * 만들어 Web Share API 또는 클립보드 복사로 내보낸다. 서버에 verdict 한 줄만
 * 저장하므로 게스트도 사용 가능(무로그인 바이럴 루프).
 *
 * 타로 ShareTarotButton 의 링크 공유 부분과 동일한 흐름이되, 궁합은 이미지
 * 캡처 없이 링크만 — OG 이미지는 /r/[token]/opengraph-image 가 동적 생성한다.
 */

import { useCallback, useRef, useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { CompatVerdictTone } from '@/lib/tarot/shareLink'

export interface CompatShareData {
  isKo: boolean
  nameA: string
  nameB: string
  verdict: string
  verdictTone: CompatVerdictTone
  headline?: string
}

export function ShareCompatibilityButton({ data }: { data: CompatShareData }) {
  const isKo = data.isKo
  const [phase, setPhase] = useState<'idle' | 'creating' | 'copied'>('idle')
  const [error, setError] = useState<string | null>(null)
  // 더블클릭으로 토큰이 두 번 발급되지 않게 하는 동기 가드.
  const busyRef = useRef(false)

  const handleShare = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    setPhase('creating')
    try {
      const res = await apiFetch('/api/compatibility/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          nameA: data.nameA,
          nameB: data.nameB,
          verdict: data.verdict,
          verdictTone: data.verdictTone,
          headline: data.headline || undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return
      }
      const shareText = data.verdict || `${data.nameA} ♥ ${data.nameB}`
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 궁합' : 'DestinyPal Compatibility',
            text: shareText,
            url,
          })
          return
        } catch (err) {
          if ((err as Error & { name?: string })?.name === 'AbortError') return
          // 공유 취소가 아니면 클립보드 복사로 폴백.
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
      logger.error('[ShareCompat] link create failed', err instanceof Error ? err : undefined)
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
            ? '결과 공유하기'
            : 'Share result'}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}
