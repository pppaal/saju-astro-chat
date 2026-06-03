'use client'

/**
 * useChatAutoScroll — 채팅 자동 스크롤 단일 출처.
 *
 * 이전 회귀: destiny / compat / followup 셋이 각자 다른 패턴으로 스크롤.
 *  - destiny: messagesEndRef.scrollIntoView({ behavior: 'smooth' })
 *  - compat: container.scrollTop = scrollHeight (RAF)
 *  - followup: scrollRef.scrollTo({ top: scrollHeight, behavior: 'smooth' })
 * → 부드러움 / 지터 / 따라가는 정확도 다 다름.
 *
 * 통합 정책:
 *  - 메시지 변화 시 자동 따라감 (loading 변경 포함).
 *  - suspendRef.current === true 면 hijack 중지 (클래리파이어 직후 등).
 *  - "container.scrollTop = scrollHeight" 가 streaming 시 가장 안정적 (compat
 *    채택 패턴). RAF 두 번 굴려 freshly appended chunk 가 DOM 에 들어간 다음
 *    스크롤하도록.
 *  - container 자체 overflow 가 없으면 (= 페이지 자체가 스크롤) scrollIntoView
 *    로 폴백.
 *
 * 호출자는 채팅 메시지 컨테이너 안의 마지막 anchor div 에 endRef 를 박아주면
 * 된다 — hook 이 endRef.current.parentElement 를 scroll container 로 잡는다.
 */

import { useEffect, useRef, type RefObject } from 'react'

export interface UseChatAutoScrollOptions {
  /** 메시지 배열 — 변할 때마다 자동 스크롤 trigger. */
  messages: unknown[]
  /** loading state — assistant 답변 stream 마다 변하면 함께 trigger (선택). */
  loading?: boolean
  /** 사용자가 명시적으로 끄고 싶을 때 (호출자가 false 로 주면 hook 안 함). */
  enabled?: boolean
  /** true 일 때만 hijack 중지 — 클래리파이어 직후 등 "그 자리 유지" 시점. */
  suspendRef?: RefObject<boolean>
  /** 외부에서 미리 만든 ref 를 쓰고 싶을 때 (예: 다른 hook 의 prop 으로
   *  미리 넘겨줘야 하는 경우). 없으면 hook 이 자체 생성. */
  externalRef?: RefObject<HTMLDivElement | null>
}

export interface UseChatAutoScrollReturn {
  /** 메시지 컨테이너 마지막에 박을 anchor ref. */
  endRef: RefObject<HTMLDivElement | null>
  /** 즉시 (스크롤 애니메이션 없이) 맨 아래로 — 과거 세션 load 후 등. */
  scrollToBottomImmediate: () => void
}

export function useChatAutoScroll(options: UseChatAutoScrollOptions): UseChatAutoScrollReturn {
  const { messages, loading, enabled = true, suspendRef, externalRef } = options
  const internalRef = useRef<HTMLDivElement | null>(null)
  const endRef = externalRef ?? internalRef

  useEffect(() => {
    if (!enabled) return
    if (suspendRef?.current) return

    const end = endRef.current
    if (!end) return

    const container = end.parentElement
    const raf = requestAnimationFrame(() => {
      // overflow 컨테이너가 있으면 scrollTop 직접 (streaming 시 가장 부드러움 + 정확)
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight
      } else {
        // 페이지 자체 스크롤 — scrollIntoView smooth
        end.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
    return () => cancelAnimationFrame(raf)
    // endRef 는 stable RefObject — deps 추가 시 매 render 재실행. 제외 의도.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, enabled, suspendRef])

  const scrollToBottomImmediate = () => {
    // Jump the scroll container (preferred — most reliable) or fall back to
    // scrollIntoView on the end anchor when the page itself scrolls.
    const jump = () => {
      const end = endRef.current
      if (!end) return
      const container = end.parentElement
      if (container && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight
      } else {
        end.scrollIntoView({ behavior: 'auto', block: 'end' })
      }
    }
    // After a session/draft load the bubbles' content (markdown, avatars,
    // fonts) lays out across several frames AFTER the first jump, growing
    // scrollHeight — so a single double-rAF jump lands on a stale (too-short)
    // height and leaves the view near the top. Retry over a short window so we
    // settle at the real bottom. (Only fires right after a load, before the
    // user reads, so re-pinning to bottom is safe.)
    jump()
    requestAnimationFrame(() => requestAnimationFrame(jump))
    for (const delay of [80, 180, 320, 500, 800]) {
      setTimeout(jump, delay)
    }
  }

  return { endRef, scrollToBottomImmediate }
}
