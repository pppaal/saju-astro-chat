'use client'

/**
 * useShareCardImage — 화면 밖에 그려 둔 공유 카드 DOM 을 PNG 로 캡처해 미리보기 →
 * 파일 공유(Web Share level 2) 또는 저장.
 *
 *   render()      phase 'rendering' — 호출부는 이때 카드를 화면 밖에 마운트한다
 *                 (phase !== 'idle' 동안). 한 틱 뒤 preload 이미지 디코드 →
 *                 한 프레임 양보 → html-to-image toBlob → object URL → 'preview'.
 *   nativeShare() canShare({files}) 면 PNG File 로 공유 시트, 아니면 저장으로 폴백.
 *                 시트를 닫은 AbortError 는 조용히 끝낸다.
 *   download()    <a download> 로 저장.
 *   close()       idle 로. object URL 은 교체·닫기·언마운트 때 revoke 한다.
 *
 * 캡처 규칙(카드 쪽): CSS 변수/모듈 대신 인라인 hex, next/image 대신 <img> —
 * TarotShareCard·ReportShareCard 주석 참고.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import * as htmlToImage from 'html-to-image'
import { logger } from '@/lib/logger'
import { isShareAbort } from './useShareLink'

export type ShareCardImagePhase = 'idle' | 'rendering' | 'preview'

export interface UseShareCardImageOptions {
  /** 캡처 크기(px). height 를 생략하면 정사각. */
  width: number
  height?: number
  /** 캡처 배경(카드 바깥 투명 영역 방지). */
  backgroundColor: string
  /** 저장·공유 파일 이름(.png). */
  filename: string
  /** 공유 시트 제목·본문. */
  title: string
  text?: string
  isKo: boolean
  /** 캡처 전에 디코드해 둘 이미지 src — 빈 칸 캡처 방지(로고·카드 그림·QR). */
  preload?: string[]
  messages?: { captureFailed?: string }
  /** logger 태그 — 예: '[ShareTarot]'. */
  logTag?: string
}

export interface UseShareCardImageResult {
  phase: ShareCardImagePhase
  previewUrl: string | null
  error: string | null
  /** navigator.share 가 있는가 — SSR·하이드레이션 중엔 false. */
  canNativeShare: boolean
  render: () => void
  nativeShare: () => Promise<void>
  download: () => void
  close: () => void
}

/** 카드가 DOM 에 마운트되고 레이아웃이 잡힐 때까지 기다리는 시간. */
const MOUNT_TICK_MS = 30
/** 이미지 하나가 끝내 load/error 를 안 쏘더라도 캡처를 막지 않게 하는 상한. */
const PRELOAD_TIMEOUT_MS = 4000

function preloadImages(srcs: readonly string[]): Promise<void> {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, PRELOAD_TIMEOUT_MS)
          const done = () => {
            clearTimeout(timer)
            resolve()
          }
          const img = new Image()
          img.onload = done
          img.onerror = done
          img.src = src
        })
    )
  ).then(() => undefined)
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 16)
  })
}

const noopSubscribe = () => () => {}
const hasNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export function useShareCardImage(
  ref: RefObject<HTMLElement | null>,
  options: UseShareCardImageOptions
): UseShareCardImageResult {
  const [phase, setPhase] = useState<ShareCardImagePhase>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canNativeShare = useSyncExternalStore(noopSubscribe, hasNativeShare, () => false)

  // 캡처 effect 가 옵션 객체 identity(매 렌더 새로 만들어짐)에 끌려 재시작되지 않도록
  // 최신 옵션은 ref 로 읽는다.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // object URL 누수 방지 — 교체(이전 값)·닫기(null)·언마운트 때 revoke.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (phase !== 'rendering') return
    let cancelled = false
    void (async () => {
      await new Promise((r) => setTimeout(r, MOUNT_TICK_MS))
      if (cancelled) return
      const opts = optionsRef.current
      try {
        const node = ref.current
        if (!node) throw new Error('share card node is not mounted')
        if (opts.preload?.length) await preloadImages(opts.preload)
        // 폰트/레이아웃 안정화를 위해 한 프레임 양보.
        await nextFrame()
        const out = await htmlToImage.toBlob(node, {
          width: opts.width,
          height: opts.height ?? opts.width,
          pixelRatio: 1,
          cacheBust: true,
          backgroundColor: opts.backgroundColor,
        })
        if (!out) throw new Error('toBlob returned null')
        if (cancelled) return
        setBlob(out)
        setPreviewUrl(URL.createObjectURL(out))
        setPhase('preview')
      } catch (err) {
        if (cancelled) return
        logger.error(
          `${opts.logTag ?? '[ShareCard]'} capture failed`,
          err instanceof Error ? err : undefined
        )
        setError(
          opts.messages?.captureFailed ??
            (opts.isKo
              ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
              : 'Could not create the image. Please try again.')
        )
        setPhase('idle')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, ref])

  const render = useCallback(() => {
    setError(null)
    setPhase('rendering')
  }, [])

  const download = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = optionsRef.current.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [previewUrl])

  const nativeShare = useCallback(async () => {
    if (!blob) return
    const { filename, title, text, logTag } = optionsRef.current
    const file = new File([blob], filename, { type: 'image/png' })
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text })
        return
      }
    } catch (err) {
      if (isShareAbort(err)) return
      logger.error(
        `${logTag ?? '[ShareCard]'} native share failed`,
        err instanceof Error ? err : undefined
      )
    }
    // 파일 공유 미지원/실패 → 저장으로 폴백.
    download()
  }, [blob, download])

  const close = useCallback(() => {
    setPhase('idle')
    setPreviewUrl(null)
    setBlob(null)
    setError(null)
  }, [])

  return { phase, previewUrl, error, canNativeShare, render, nativeShare, download, close }
}
