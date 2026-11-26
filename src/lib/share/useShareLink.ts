'use client'

/**
 * useShareLink — 공개 공유 링크(/r/[token], 추천 링크 등) 한 번 누르기 흐름.
 *
 *   POST endpoint → 응답에서 URL → Web Share 시트(title·text·url)
 *     → 시트 미지원/실패면 클립보드 복사(copyToClipboard: 인앱 웹뷰용 execCommand 폴백 포함)
 *     → 그래도 안 되면 링크를 에러 줄에 그대로 보여 줘 손으로 복사하게 한다.
 *   사용자가 시트를 닫은 AbortError 는 실패가 아니라 조용히 끝낸다.
 *
 * 하루·이달·추천 공유 버튼이 각자 복사해 두던 흐름을 한 곳에 모았다. 이미지 카드
 * 공유는 useShareCardImage, 버튼 UI 는 components/share/ShareLinkButton.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { copyToClipboard } from '@/lib/utils/clipboard'

export type ShareLinkPhase = 'idle' | 'creating' | 'copied'

interface ShareLinkMessages {
  /** 응답이 !ok 이거나 URL 이 없을 때. */
  createFailed: string
  /** 401 일 때(선택). 없으면 createFailed. */
  unauthorized?: string
  /** 요청 자체가 던졌을 때(네트워크). */
  network: string
  /** 공유·복사가 모두 안 될 때 — 링크를 보여 줘 손으로 복사하게 한다. */
  manualCopy: (url: string) => string
}

export interface UseShareLinkOptions {
  /** 링크를 발급하는 내부 API(POST). */
  endpoint: string
  /** POST JSON 본문. 함수면 share() 시점에 평가한다. 없으면 본문 없이 POST. */
  body?: unknown
  /** 공유 시트 제목·본문. */
  title: string
  text?: string
  isKo: boolean
  /** 응답 JSON 에서 URL 을 꺼낸다. 기본은 `json.data.url`. */
  readUrl?: (json: unknown) => string | null | undefined
  /** 기본 ko/en 문구를 덮어쓴다. */
  messages?: Partial<ShareLinkMessages>
  /** 중복 클릭 가드를 통과한 직후, 네트워크 전에 한 번 — 퍼널 계측 등. */
  onStart?: () => void
  /** logger 태그 — 예: '[ShareDay]'. */
  logTag?: string
}

export interface UseShareLinkResult {
  phase: ShareLinkPhase
  error: string | null
  share: () => Promise<void>
  reset: () => void
}

/** 'copied' 표시 유지 시간. */
const SHARE_COPIED_MS = 2000

/** 사용자가 공유 시트를 닫은 경우 — 실패로 치지 않는다. */
export function isShareAbort(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === 'AbortError'
}

function defaultShareLinkMessages(isKo: boolean): ShareLinkMessages {
  return isKo
    ? {
        createFailed: '링크를 만들지 못했어요.',
        network: '네트워크 오류가 발생했어요.',
        manualCopy: (url) => `링크: ${url}`,
      }
    : {
        createFailed: 'Could not create a link.',
        network: 'A network error occurred.',
        manualCopy: (url) => `Link: ${url}`,
      }
}

function readDataUrl(json: unknown): string | null {
  const url = (json as { data?: { url?: unknown } } | null)?.data?.url
  return typeof url === 'string' && url ? url : null
}

export function useShareLink(options: UseShareLinkOptions): UseShareLinkResult {
  const { endpoint, body, title, text, isKo, readUrl, messages, onStart, logTag } = options
  const [phase, setPhase] = useState<ShareLinkPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  // 빠른 더블클릭으로 토큰이 두 번 발급되지 않게 하는 동기 가드(state 는 비동기).
  const busyRef = useRef(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCopiedTimer = useCallback(() => {
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = null
    }
  }, [])

  useEffect(() => clearCopiedTimer, [clearCopiedTimer])

  const share = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    onStart?.()
    const msg = { ...defaultShareLinkMessages(isKo), ...messages }
    clearCopiedTimer()
    setError(null)
    setPhase('creating')
    try {
      const payload = typeof body === 'function' ? (body as () => unknown)() : body
      const res = await apiFetch(
        endpoint,
        payload === undefined
          ? { method: 'POST' }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
      )
      if (res.status === 401 && msg.unauthorized) {
        setError(msg.unauthorized)
        return
      }
      const json: unknown = await res.json().catch(() => null)
      const url = (readUrl ?? readDataUrl)(json)
      if (!res.ok || !url) {
        setError(msg.createFailed)
        return
      }
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url })
          return
        } catch (err) {
          if (isShareAbort(err)) return
          // 그 밖의 실패(인앱 웹뷰의 NotAllowedError 등) → 복사로 폴백.
        }
      }
      if (await copyToClipboard(url)) {
        setPhase('copied')
        copiedTimerRef.current = setTimeout(() => {
          copiedTimerRef.current = null
          setPhase('idle')
        }, SHARE_COPIED_MS)
        return
      }
      setError(msg.manualCopy(url))
    } catch (err) {
      logger.error(
        `${logTag ?? '[ShareLink]'} link create failed`,
        err instanceof Error ? err : undefined
      )
      setError(msg.network)
    } finally {
      busyRef.current = false
      setPhase((p) => (p === 'creating' ? 'idle' : p))
    }
  }, [endpoint, body, title, text, isKo, readUrl, messages, onStart, logTag, clearCopiedTimer])

  const reset = useCallback(() => {
    clearCopiedTimer()
    setPhase('idle')
    setError(null)
  }, [clearCopiedTimer])

  return { phase, error, share, reset }
}
