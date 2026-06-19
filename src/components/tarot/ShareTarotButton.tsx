'use client'

/**
 * ShareTarotButton — 타로 결과를 SNS(인스타/카톡)용 1:1 이미지로 만들어
 * 공유/저장한다. 클릭 → 화면 밖 TarotShareCard 를 잠깐 마운트 → html-to-image
 * 로 PNG 캡처 → 미리보기 모달에서 [공유하기](Web Share API) / [이미지 저장].
 *
 * 서버/스토리지 없이 클라이언트에서 끝나므로 게스트도 사용 가능.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { Share2, Download, Loader2, X, Link2, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import { TarotShareCard, SHARE_CARD_SIZE, type ShareCardData } from './TarotShareCard'

interface ShareTarotButtonProps {
  /** 공유 카드에 그릴 데이터 — buildShareDataFrom* 로 미리 만든다. */
  data: ShareCardData
  language: string
  /** 공개 링크(/r/[token]) 페이지에 실을 본문(선택) — 데일리 message / 리딩 overall. */
  body?: string
}

// 캡처 전 카드/로고 이미지를 미리 디코드해 빈 칸 캡처를 방지.
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

export function ShareTarotButton({ data: shareData, language, body }: ShareTarotButtonProps) {
  const isKo = language === 'ko'
  const cardRef = useRef<HTMLDivElement>(null)
  // 'idle' | 'rendering'(캡처 중) | 'preview'(모달)
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'preview'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 링크 공유: 'idle' | 'creating'(토큰 발급 중) | 'copied'(클립보드 복사 완료)
  const [linkPhase, setLinkPhase] = useState<'idle' | 'creating' | 'copied'>('idle')
  // 빠른 더블클릭으로 토큰이 두 번 발급되지 않게 하는 동기 가드(state 는 비동기).
  const linkBusyRef = useRef(false)

  // 공개 공유 링크를 만들고(서버에 토큰 저장) URL 을 돌려준다. 실패 시 null.
  const createShareUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiFetch('/api/tarot/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          question: shareData.question,
          spreadTitle: shareData.spreadTitle,
          cards: shareData.cards.map((c) => ({
            name: c.name,
            image: c.image,
            isReversed: c.isReversed,
          })),
          keyMessage: shareData.keyMessage || '',
          body: body || undefined,
        }),
      })
      if (res.status === 401) {
        setError(isKo ? '로그인 후 링크 공유가 가능해요.' : 'Sign in to share a link.')
        return null
      }
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return null
      }
      return url
    } catch (err) {
      tarotLogger.error('[ShareTarot] link create failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
      return null
    }
  }, [isKo, shareData, body])

  // 링크 공유 버튼 — 토큰 발급 후 Web Share(url) 또는 클립보드 복사로 폴백.
  const handleShareLink = useCallback(async () => {
    if (linkBusyRef.current) return // 더블클릭 → 토큰 중복 발급 방지.
    linkBusyRef.current = true
    setError(null)
    setLinkPhase('creating')
    try {
      const url = await createShareUrl()
      if (!url) return
      const shareText = shareData.keyMessage || shareData.question
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 타로' : 'DestinyPal Tarot',
            text: shareText,
            url,
          })
          return
        } catch (err) {
          if ((err as Error & { name?: string })?.name === 'AbortError') return
          // 공유 실패 → 복사로 폴백.
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        setLinkPhase('copied')
        setTimeout(() => setLinkPhase('idle'), 2000)
        return
      } catch {
        setError(isKo ? `링크: ${url}` : `Link: ${url}`)
      }
    } finally {
      linkBusyRef.current = false
      setLinkPhase((p) => (p === 'creating' ? 'idle' : p))
    }
  }, [createShareUrl, shareData, isKo])

  // object URL 누수 방지.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const capture = useCallback(async () => {
    const node = cardRef.current
    if (!node) return
    try {
      await preloadImages([...shareData.cards.map((c) => c.image), '/logo/logo.png'])
      // 폰트/레이아웃 안정화를 위해 한 프레임 양보.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const out = await htmlToImage.toBlob(node, {
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#070a1a',
      })
      if (!out) throw new Error('toBlob returned null')
      const url = URL.createObjectURL(out)
      setBlob(out)
      setPreviewUrl(url)
      setPhase('preview')
    } catch (err) {
      tarotLogger.error('[ShareTarot] capture failed', err instanceof Error ? err : undefined)
      setError(
        isKo
          ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
          : 'Could not create the image. Please try again.'
      )
      setPhase('idle')
    }
  }, [shareData.cards, isKo])

  // 'rendering' 단계에서 카드가 DOM 에 마운트된 뒤 캡처.
  useEffect(() => {
    if (phase !== 'rendering') return
    let cancelled = false
    void (async () => {
      // 마운트 직후 한 틱 대기.
      await new Promise((r) => setTimeout(r, 30))
      if (!cancelled) await capture()
    })()
    return () => {
      cancelled = true
    }
  }, [phase, capture])

  const onClickShare = () => {
    setError(null)
    setPhase('rendering')
  }

  const closeModal = () => {
    setPhase('idle')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
    setError(null)
    setLinkPhase('idle')
    linkBusyRef.current = false
  }

  const filename = `destinypal-tarot-${Date.now()}.png`

  const handleNativeShare = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    const data: ShareData = {
      files: [file],
      title: isKo ? 'DestinyPal 타로 결과' : 'My DestinyPal Tarot Reading',
      text: shareData.question,
    }
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(data)
        return
      }
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 무시.
      const name = (err as Error & { name?: string })?.name
      if (name === 'AbortError') return
      tarotLogger.error('[ShareTarot] native share failed', err instanceof Error ? err : undefined)
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

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        {/* 단일 진입 — 누르면 미리보기 카드를 먼저 보여주고, 그 안에서 링크/이미지 선택. */}
        <button
          type="button"
          onClick={onClickShare}
          disabled={phase === 'rendering'}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#e8cc8a', color: '#1a1305' }}
        >
          {phase === 'rendering' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          {phase === 'rendering'
            ? isKo
              ? '미리보기 만드는 중…'
              : 'Preparing preview…'
            : isKo
              ? '결과 공유하기'
              : 'Share result'}
        </button>
        {error && phase !== 'preview' && (
          <span className="text-[11px] text-rose-300/80 text-center max-w-xs">{error}</span>
        )}
      </div>

      {/* 캡처용 화면 밖 카드 — rendering/preview 동안만 마운트. */}
      {phase !== 'idle' && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            width: SHARE_CARD_SIZE,
            height: SHARE_CARD_SIZE,
            pointerEvents: 'none',
            opacity: 0,
            zIndex: -1,
          }}
        >
          <TarotShareCard ref={cardRef} data={shareData} />
        </div>
      )}

      {/* 미리보기 모달 */}
      {phase === 'preview' && previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(7, 9, 26, 0.88)', backdropFilter: 'blur(6px)' }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border p-5"
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              borderColor: 'rgba(212,181,114,0.35)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label={isKo ? '닫기' : 'Close'}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-700 transition-colors"
              style={{ background: 'rgba(30,41,59,0.9)', color: '#e2e8f0' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={isKo ? '공유 카드 미리보기' : 'Share card preview'}
              className="w-full rounded-xl mb-4"
              style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
            />

            {/* 링크로 공유 — 받는 사람이 한 번 탭하면 우리 사이트로(가장 바이럴). */}
            <button
              type="button"
              onClick={() => void handleShareLink()}
              disabled={linkPhase === 'creating'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-2"
              style={{ background: '#e8cc8a', color: '#1a1305' }}
            >
              {linkPhase === 'creating' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : linkPhase === 'copied' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {linkPhase === 'creating'
                ? isKo
                  ? '링크 만드는 중…'
                  : 'Creating link…'
                : linkPhase === 'copied'
                  ? isKo
                    ? '링크 복사됨!'
                    : 'Link copied!'
                  : isKo
                    ? '링크로 공유'
                    : 'Share link'}
            </button>
            {error && <p className="mb-2 text-[11px] text-center text-rose-300/80">{error}</p>}

            <div className="flex gap-2">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: '#e8cc8a', color: '#1a1305' }}
                >
                  <Share2 className="w-4 h-4" />
                  {isKo ? '이미지 공유' : 'Share image'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: canNativeShare ? 'rgba(212,181,114,0.14)' : '#e8cc8a',
                  border: '1px solid rgba(212,181,114,0.4)',
                  color: canNativeShare ? '#e8cc8a' : '#1a1305',
                }}
              >
                <Download className="w-4 h-4" />
                {isKo ? '이미지 저장' : 'Save image'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-center" style={{ color: '#9aa3b8' }}>
              {isKo
                ? '저장한 이미지를 인스타그램 스토리·피드나 카카오톡에 올려보세요.'
                : 'Post the saved image to Instagram or share it on any app.'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
