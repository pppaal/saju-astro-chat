'use client'

/**
 * ShareLifeButton — 인생/대운 흐름 곡선 + 인생유형 공유. 세 가지 경로:
 *   ① 친구 도전(있으면 주인공) — "나 '대기만성형'래 😳 너는 무슨 형이야?" 로 공유해
 *      친구가 자기 유형을 확인하러 들어오게 하는 성장 루프.
 *   ② 이미지 카드 — 화면 밖 LifeShareCard(1080×1080)를 html-to-image 로 캡처해
 *      Web Share(파일)/저장. 인스타 스토리·카톡용 바이럴 아티팩트 (ShareReportButton
 *      과 같은 메커니즘 — 서버/스토리지 없이 클라에서 끝나 게스트도 가능).
 *   ③ 링크 공유 — 공개 링크(/r/[token])를 담백하게. 서버엔 요약 텍스트·유형명·
 *      곡선 숫자·연도 라벨만 저장(개인 원국/생년월일은 안 보냄).
 * OG 이미지는 /r/[token]/opengraph-image 가 동적 생성(인생유형 배지 + 곡선).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { Share2, Check, Loader2, Users, Camera, Download, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { logger } from '@/lib/logger'
import { LifeShareCard, LIFE_CARD_SIZE } from './LifeShareCard'

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

// 캡처 전 로고를 미리 디코드해 빈 칸 캡처를 방지.
async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        })
    )
  )
}

export function ShareLifeButton({ data }: { data: LifeShareData }) {
  const isKo = data.isKo
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeMode, setActiveMode] = useState<'invite' | 'plain' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  // 이미지 캡처 경로 — 'idle' | 'rendering'(캡처 중) | 'preview'(모달).
  const cardRef = useRef<HTMLDivElement>(null)
  const [imgPhase, setImgPhase] = useState<'idle' | 'rendering' | 'preview'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)

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
    trackFunnel('destiny.share_link')
    const t = data.typeName ?? (isKo ? '내 인생유형' : 'my life type')
    const title = isKo ? 'DestinyPal 인생유형' : 'DestinyPal — Life type'
    const text = isKo
      ? `나 '${t}'래 😳 너는 무슨 인생유형이야?`
      : `I'm a '${t}' 😳 what's your life type?`
    void shareWith('invite', title, text)
  }
  const onPlain = () => {
    trackFunnel('destiny.share_link')
    const title = isKo ? 'DestinyPal 인생 곡선' : 'DestinyPal — Life Curve'
    void shareWith('plain', title, data.headline || data.rangeLabel || '')
  }

  // ── 이미지 카드 캡처 (ShareReportButton 과 동일 메커니즘) ──────────────
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const capture = useCallback(async () => {
    const node = cardRef.current
    if (!node) return
    try {
      await preloadImages(['/logo/logo.png'])
      // 폰트/레이아웃 안정화를 위해 한 프레임 양보.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const out = await htmlToImage.toBlob(node, {
        width: LIFE_CARD_SIZE,
        height: LIFE_CARD_SIZE,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#1c0f0a',
      })
      if (!out) throw new Error('toBlob returned null')
      const url = URL.createObjectURL(out)
      setBlob(out)
      setPreviewUrl(url)
      setImgPhase('preview')
    } catch (err) {
      logger.error('[ShareLife] capture failed', err instanceof Error ? err : undefined)
      setImgError(
        isKo
          ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
          : 'Could not create the image. Please try again.'
      )
      setImgPhase('idle')
    }
  }, [isKo])

  // 'rendering' 단계에서 카드가 DOM 에 마운트된 뒤 캡처.
  useEffect(() => {
    if (imgPhase !== 'rendering') return
    let cancelled = false
    void (async () => {
      // 마운트 직후 한 틱 대기.
      await new Promise((r) => setTimeout(r, 30))
      if (!cancelled) await capture()
    })()
    return () => {
      cancelled = true
    }
  }, [imgPhase, capture])

  const onClickImage = () => {
    trackFunnel('destiny.share_image')
    setImgError(null)
    setImgPhase('rendering')
  }

  const closeModal = () => {
    setImgPhase('idle')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
  }

  const filename = 'destinypal-life-type.png'

  const handleNativeShare = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    const payload: ShareData = {
      files: [file],
      title: isKo ? 'DestinyPal 인생유형' : 'DestinyPal — Life type',
      text: data.typeName
        ? isKo
          ? `나 '${data.typeName}'래 😳`
          : `I'm a '${data.typeName}' 😳`
        : data.headline,
    }
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(payload)
        return
      }
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 무시.
      const errName = (err as Error & { name?: string })?.name
      if (errName === 'AbortError') return
      logger.error('[ShareLife] native share failed', err instanceof Error ? err : undefined)
    }
    // 공유 미지원/실패 → 저장으로 폴백.
    handleDownload()
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const creating = phase === 'creating'
  const copied = phase === 'copied'
  const rendering = imgPhase === 'rendering'
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

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

      {/* 이미지 카드 — 인스타 스토리·카톡용 저장/공유 아티팩트 */}
      <button
        type="button"
        onClick={onClickImage}
        disabled={rendering}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 24px',
          borderRadius: 999,
          background: 'rgba(232,204,138,0.12)',
          color: '#e8cc8a',
          border: '1px solid rgba(232,204,138,0.4)',
          fontSize: 14.5,
          fontWeight: 700,
          cursor: rendering ? 'wait' : 'pointer',
        }}
      >
        {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {rendering
          ? isKo
            ? '이미지 만드는 중…'
            : 'Creating image…'
          : isKo
            ? '이미지 카드로 공유'
            : 'Share as image card'}
      </button>
      {imgError ? <span style={{ fontSize: 12, color: '#fda4af' }}>{imgError}</span> : null}

      <button
        type="button"
        onClick={onPlain}
        disabled={creating}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 20px',
          borderRadius: 999,
          background: 'transparent',
          color: '#c9b37f',
          border: 'none',
          fontSize: 13.5,
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

      {/* 캡처용 화면 밖 카드 — rendering/preview 동안만 마운트. */}
      {imgPhase !== 'idle' && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            width: LIFE_CARD_SIZE,
            height: LIFE_CARD_SIZE,
            pointerEvents: 'none',
            opacity: 0,
            zIndex: -1,
          }}
        >
          <LifeShareCard ref={cardRef} data={data} />
        </div>
      )}

      {/* 미리보기 모달 */}
      {imgPhase === 'preview' && previewUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(12, 7, 8, 0.88)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 384,
              borderRadius: 16,
              border: '1px solid rgba(232,160,90,0.35)',
              padding: 20,
              background: 'rgba(28, 15, 10, 0.96)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label={isKo ? '닫기' : 'Close'}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: 6,
                borderRadius: 999,
                background: 'rgba(60,35,22,0.9)',
                color: '#e2e8f0',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={isKo ? '공유 이미지 미리보기' : 'Share image preview'}
              style={{
                width: '100%',
                borderRadius: 12,
                marginBottom: 16,
                aspectRatio: '1 / 1',
                objectFit: 'cover',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              {canNativeShare && (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    background: '#ffd9a3',
                    color: '#2a1c08',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  {isKo ? '공유하기' : 'Share'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  background: canNativeShare ? 'rgba(232,160,90,0.14)' : '#ffd9a3',
                  border: '1px solid rgba(232,160,90,0.4)',
                  color: canNativeShare ? '#ffd9a3' : '#2a1c08',
                  cursor: 'pointer',
                }}
              >
                <Download className="w-4 h-4" />
                {isKo ? '이미지 저장' : 'Save image'}
              </button>
            </div>
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                textAlign: 'center',
                color: '#a98c74',
              }}
            >
              {isKo
                ? '저장한 이미지를 인스타그램 스토리·피드나 카카오톡에 올려보세요.'
                : 'Post the saved image to your Instagram story or feed, or share it anywhere you like.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareLifeButton
