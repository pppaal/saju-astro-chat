'use client'

/**
 * ShareImageButton — 결과를 SNS(인스타/카톡)용 정사각 PNG 카드로 만들어
 * 공유/저장하는 범용 버튼. 클릭 → 화면 밖 카드 마운트 → html-to-image 로 캡처
 * → 미리보기 모달에서 [공유하기](Web Share API) / [이미지 저장].
 *
 * 서버/스토리지 없이 클라이언트에서 끝나므로 게스트도 사용 가능. 타로의
 * ShareTarotButton 에서 검증된 캡처 흐름을 일반화한 것 — 카드 렌더(renderCard)와
 * 프리로드 이미지(preloadSrcs)만 주입하면 사주·궁합 등 어느 surface 든 재사용.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { Share2, Download, Loader2, X } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ShareImageButtonProps {
  language: string
  /** 화면 밖에 마운트할 캡처 대상 카드. ref 를 카드 루트에 연결해야 한다. */
  renderCard: (ref: React.Ref<HTMLDivElement>) => React.ReactNode
  /** 캡처 전 디코드해 둘 이미지들(로고·카드 그림 등) — 빈 칸 캡처 방지. */
  preloadSrcs?: string[]
  /** 정사각 카드 한 변 px (기본 1080). */
  size?: number
  /** 캡처 배경색(투명 영역 보정). */
  backgroundColor?: string
  /** Web Share 시 제목/본문 + 저장 파일명 prefix. */
  shareTitle: string
  shareText?: string
  filenamePrefix?: string
  /** 트리거 버튼 색감 — 밝은 배경 위(onLight) / 어두운 배경 위(onDark, 기본). */
  variant?: 'onDark' | 'onLight'
}

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

export function ShareImageButton({
  language,
  renderCard,
  preloadSrcs = [],
  size = 1080,
  backgroundColor = '#070a1a',
  shareTitle,
  shareText,
  filenamePrefix = 'destinypal',
  variant = 'onDark',
}: ShareImageButtonProps) {
  const isKo = language === 'ko'
  const cardRef = useRef<HTMLDivElement>(null)
  // 'idle' | 'rendering'(캡처 중) | 'preview'(모달)
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'preview'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      await preloadImages([...preloadSrcs, '/logo/logo.png'])
      // 폰트/레이아웃 안정화를 위해 한 프레임 양보.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const out = await htmlToImage.toBlob(node, {
        width: size,
        height: size,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor,
      })
      if (!out) throw new Error('toBlob returned null')
      const url = URL.createObjectURL(out)
      setBlob(out)
      setPreviewUrl(url)
      setPhase('preview')
    } catch (err) {
      logger.error('[ShareImage] capture failed', { error: err })
      setError(
        isKo
          ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
          : 'Could not create the image. Please try again.'
      )
      setPhase('idle')
    }
  }, [preloadSrcs, size, backgroundColor, isKo])

  // 'rendering' 단계에서 카드가 DOM 에 마운트된 뒤 캡처.
  useEffect(() => {
    if (phase !== 'rendering') return
    let cancelled = false
    void (async () => {
      await new Promise((r) => setTimeout(r, 30))
      if (!cancelled) await capture()
    })()
    return () => {
      cancelled = true
    }
  }, [phase, capture])

  const closeModal = () => {
    setPhase('idle')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
  }

  const filename = `${filenamePrefix}-${Date.now()}.png`

  const handleDownload = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [previewUrl, filename])

  const handleNativeShare = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    const data: ShareData = {
      files: [file],
      title: shareTitle,
      text: shareText,
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
      logger.error('[ShareImage] native share failed', { error: err })
    }
    // 공유 미지원/실패 → 저장으로 폴백.
    handleDownload()
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const triggerStyle =
    variant === 'onLight'
      ? {
          background: 'rgba(160,122,60,0.12)',
          border: '1px solid rgba(160,122,60,0.45)',
          color: '#8a6a2f',
        }
      : {
          background: 'rgba(212,181,114,0.14)',
          border: '1px solid rgba(212,181,114,0.4)',
          color: '#e8cc8a',
        }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setPhase('rendering')
          }}
          disabled={phase === 'rendering'}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={triggerStyle}
        >
          {phase === 'rendering' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {phase === 'rendering'
            ? isKo
              ? '이미지 만드는 중…'
              : 'Creating image…'
            : isKo
              ? '결과 이미지로 공유'
              : 'Share as image'}
        </button>
        {error && <span className="max-w-xs text-center text-[11px] text-rose-500">{error}</span>}
      </div>

      {/* 캡처용 화면 밖 카드 — rendering/preview 동안만 마운트. */}
      {phase !== 'idle' && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            width: size,
            height: size,
            pointerEvents: 'none',
            opacity: 0,
            zIndex: -1,
          }}
        >
          {renderCard(cardRef)}
        </div>
      )}

      {/* 미리보기 모달 */}
      {phase === 'preview' && previewUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
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
              className="absolute right-3 top-3 rounded-full p-1.5 transition-colors hover:bg-slate-700"
              style={{ background: 'rgba(30,41,59,0.9)', color: '#e2e8f0' }}
            >
              <X className="h-4 w-4" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={isKo ? '공유 이미지 미리보기' : 'Share image preview'}
              className="mb-4 w-full rounded-xl"
              style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
            />

            <div className="flex gap-2">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ background: '#e8cc8a', color: '#1a1305' }}
                >
                  <Share2 className="h-4 w-4" />
                  {isKo ? '공유하기' : 'Share'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: canNativeShare ? 'rgba(212,181,114,0.14)' : '#e8cc8a',
                  border: '1px solid rgba(212,181,114,0.4)',
                  color: canNativeShare ? '#e8cc8a' : '#1a1305',
                }}
              >
                <Download className="h-4 w-4" />
                {isKo ? '이미지 저장' : 'Save image'}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px]" style={{ color: '#9aa3b8' }}>
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
