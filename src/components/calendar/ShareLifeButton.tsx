'use client'

/**
 * ShareLifeButton — 인생/대운 흐름 곡선 + 인생유형을 공개 공유 링크(/r/[token])로
 * 만들어 Web Share API 또는 클립보드 복사로 내보낸다. 서버엔 요약 텍스트·유형명·
 * 곡선 숫자·연도 라벨만 저장(개인 원국/생년월일은 안 보냄).
 *
 * 두 개의 CTA:
 *   ① 친구 도전(있으면 주인공) — "나 '대기만성형'래 😳 너는 무슨 형이야?" 로 공유해
 *      친구가 자기 유형을 확인하러 들어오게 하는 성장 루프.
 *   ② 링크 공유 — 담백하게 곡선 링크만.
 * OG 이미지는 /r/[token]/opengraph-image 가 동적 생성(인생유형 배지 + 곡선).
 */

import { useCallback, useRef, useState } from 'react'
import { Share2, Check, Loader2, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'

export interface LifeShareData {
  isKo: boolean
  /** 인생유형 별명(대기만성형 등) — 공유카드 주인공 배지 + 친구 도전 문구. */
  typeName?: string
  rangeLabel?: string
  headline: string
  subline?: string
  curve: number[]
  axisLabels?: string[]
  markerIndex?: number
  peakIndex?: number
}

type Phase = 'idle' | 'creating' | 'copied'

export function ShareLifeButton({ data }: { data: LifeShareData }) {
  const isKo = data.isKo
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeMode, setActiveMode] = useState<'invite' | 'plain' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  // 링크 1회 생성 + 주어진 텍스트로 공유/복사. 두 CTA 가 같은 저장 로직을 공유.
  const shareWith = useCallback(
    async (mode: 'invite' | 'plain', shareTitle: string, shareText: string) => {
      if (busyRef.current) return
      busyRef.current = true
      setError(null)
      setActiveMode(mode)
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
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({ title: shareTitle, text: shareText, url })
            return
          } catch (err) {
            if ((err as Error & { name?: string })?.name === 'AbortError') return
          }
        }
        try {
          // 클립보드엔 "도전 문구 + 링크" 를 함께 담아, 붙여넣기만 해도 훅이 산다.
          await navigator.clipboard.writeText(shareText ? `${shareText}\n${url}` : url)
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
    },
    [isKo, data]
  )

  const onInvite = () => {
    const t = data.typeName ?? (isKo ? '내 인생유형' : 'my life type')
    const title = isKo ? 'DestinyPal 인생유형' : 'DestinyPal — Life type'
    const text = isKo
      ? `나 '${t}'래 😳 너는 무슨 인생유형이야?`
      : `I'm a '${t}' 😳 what's your life type?`
    void shareWith('invite', title, text)
  }
  const onPlain = () => {
    const title = isKo ? 'DestinyPal 인생 곡선' : 'DestinyPal — Life Curve'
    void shareWith('plain', title, data.headline || data.rangeLabel || '')
  }

  const creating = phase === 'creating'
  const copied = phase === 'copied'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {data.typeName ? (
        <button
          type="button"
          onClick={onInvite}
          disabled={creating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '14px 28px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #f0d79a 0%, #e8b45e 100%)',
            color: '#2a1c08',
            border: 'none',
            fontSize: 16,
            fontWeight: 800,
            cursor: creating ? 'wait' : 'pointer',
            boxShadow: '0 8px 24px -10px rgba(232,180,94,0.7)',
          }}
        >
          {creating && activeMode === 'invite' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : copied && activeMode === 'invite' ? (
            <Check className="w-4 h-4" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          {copied && activeMode === 'invite'
            ? isKo
              ? '복사됐어요! 붙여넣기 👀'
              : 'Copied! Paste it 👀'
            : isKo
              ? '친구는 무슨 형일까? 👀'
              : "What's your friend's type? 👀"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onPlain}
        disabled={creating}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: data.typeName ? '9px 20px' : '12px 24px',
          borderRadius: 999,
          background: 'rgba(232,204,138,0.12)',
          color: '#e8cc8a',
          border: '1px solid rgba(232,204,138,0.4)',
          fontSize: data.typeName ? 13.5 : 15,
          fontWeight: 700,
          cursor: creating ? 'wait' : 'pointer',
        }}
      >
        {creating && activeMode === 'plain' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied && activeMode === 'plain' ? (
          <Check className="w-4 h-4" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        {copied && activeMode === 'plain'
          ? isKo
            ? '링크 복사됨!'
            : 'Link copied!'
          : isKo
            ? '링크만 공유'
            : 'Share link'}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span> : null}
    </div>
  )
}

export default ShareLifeButton
