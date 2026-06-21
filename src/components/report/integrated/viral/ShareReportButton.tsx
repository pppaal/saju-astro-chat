'use client'

/**
 * ShareReportButton — 무료 리포트의 바이럴 "한 장 요약"을 SNS(인스타/카톡)용
 * 1080×1080 이미지로 만들어 공유/저장한다. 클릭 → 화면 밖 ReportShareCard 를
 * 잠깐 마운트 → html-to-image 로 PNG 캡처 → 미리보기 모달에서
 * [공유하기](Web Share API) / [이미지 저장].
 *
 * 서버/스토리지 없이 클라이언트에서 끝나므로 게스트도 사용 가능.
 * (캘린더 ShareDayButton 의 리포트판 — 로고만 프리로드.)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { Share2, Download, Loader2, X } from 'lucide-react'
import { logger } from '@/lib/logger'
import { ReportShareCard, SHARE_CARD_SIZE, type ReportShareData } from './ReportShareCard'
import type { ViralSummary } from './viralArchetype'

export interface ShareReportButtonProps {
  summary: ViralSummary
  name: string
  dateLabel: string
  isKo: boolean
}

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

export function ShareReportButton({ summary, name, dateLabel, isKo }: ShareReportButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  // 'idle' | 'rendering'(캡처 중) | 'preview'(모달)
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'preview'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shareData: ReportShareData = { summary, name, dateLabel, isKo }

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
      await preloadImages(['/logo/logo.png'])
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
      logger.error('[ShareReport] capture failed', err instanceof Error ? err : undefined)
      setError(
        isKo
          ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
          : 'Could not create the image. Please try again.'
      )
      setPhase('idle')
    }
  }, [isKo])

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
  }

  const filename = `destinypal-type-${dateLabel.replace(/[^0-9a-zA-Z]+/g, '-')}.png`

  const handleNativeShare = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    const payload: ShareData = {
      files: [file],
      title: isKo ? 'DestinyPal 내 사주 유형' : 'My DestinyPal type',
      text: summary.oneLiner,
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
      logger.error('[ShareReport] native share failed', err instanceof Error ? err : undefined)
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
        <button
          type="button"
          onClick={onClickShare}
          disabled={phase === 'rendering'}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(212,181,114,0.14)',
            border: '1px solid rgba(212,181,114,0.4)',
            color: '#e8cc8a',
          }}
        >
          {phase === 'rendering' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          {phase === 'rendering'
            ? isKo
              ? '이미지 만드는 중…'
              : 'Creating image…'
            : isKo
              ? '내 유형 카드 공유'
              : 'Share my type card'}
        </button>
        {error && (
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
          <ReportShareCard ref={cardRef} data={shareData} />
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
              alt={isKo ? '공유 이미지 미리보기' : 'Share image preview'}
              className="w-full rounded-xl mb-4"
              style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
            />

            <div className="flex gap-2">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: '#e8cc8a', color: '#1a1305' }}
                >
                  <Share2 className="w-4 h-4" />
                  {isKo ? '공유하기' : 'Share'}
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
                : 'Post the saved image to your Instagram story or feed, or share it anywhere you like.'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
