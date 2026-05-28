'use client'

/**
 * ChatBubbleContent — 채팅 말풍선 내부 콘텐츠 단일 출처.
 *
 * 이전 회귀 패턴: destiny-map MessageRow / compat counselor inline JSX /
 * tarot FollowupChat inline JSX 셋이 같은 일(텍스트 마크다운 처리 + 카드
 * 이미지 추출)을 각자 약간 다르게 구현. 카드 이미지 표시 / 마크다운 / 모
 * 자익 인코딩 fix 한 곳 적용하면 다른 두 곳 안 됨. Phase 2 리팩토링.
 *
 * 책임: 말풍선 안쪽 콘텐츠만 (텍스트 + 카드 이미지). 외부 wrapper
 * (row class / avatar / bubble container) 는 호출자가 화면별로 유지 —
 * 시각 회귀 최소화.
 */

import React from 'react'
import MarkdownMessage from '@/components/ui/MarkdownMessage'
import { repairMojibakeText } from '@/lib/text/mojibake'
import { stripReportMarkdown } from '@/lib/text/stripReportMarkdown'

// 사용자 메시지에 markdown 이미지 (`![alt](src)`) 가 들어있으면 — 클래리파이어
// 카드가 대표 — MarkdownMessage 내부 img 렌더에만 의존하지 말고 직접 추출해
// 말풍선 안에 큼지막한 카드 그림을 그려준다 (배포/캐시/CSS 어디서 막혀도 카드
// 는 보이도록 우회 경로). 추출한 이미지 markdown 은 본문에서 잘라 중복 방지.
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/

const CARD_IMAGE_STYLE: React.CSSProperties = {
  display: 'block',
  maxWidth: '180px',
  width: '70%',
  aspectRatio: '5 / 8.5',
  // 'cover' → 'contain' — 사용자 피드백: "한 장 더 뽑기 카드가 위가 안 보임".
  // 타로 카드 그림 비율이 컨테이너와 살짝 달라 cover 가 위/아래 잘라 먹었음.
  // contain 은 카드 전체를 letterbox 로 보여줌 — 그림 잘림 X.
  objectFit: 'contain',
  borderRadius: '10px',
  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
  background: 'rgba(255,255,255,0.06)',
}

export interface ChatBubbleContentProps {
  // system 은 destiny 채팅 흐름에 가끔 섞여 들어옴 (returning context 등) — user 처럼 처리.
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Assistant 답변 streaming 중 빈 content 인 경우 등. pendingNode 표시. */
  pending?: boolean
  /** pending 일 때 표시할 노드 (각 화면의 spinner UI). pending && pendingNode 일 때만 활용. */
  pendingNode?: React.ReactNode
  /** MarkdownMessage theme 패스스루. compat 상담사 = 'light', 나머지 = 'dark'. */
  theme?: 'dark' | 'light'
}

// 점성 기호가 답변에 그대로 새어 나오면 사용자 화면엔 □ 같은 깨진 글자로
// 보임 (☌ □ ⚹ △ ☍ ⚻ 등은 폰트에 없거나 가독성 X). LLM 이 system prompt
// 의 "한국어로 풀어 써" 지시를 가끔 어겨서 직접 출력하는 케이스 — 후처리로
// 안전망. assistant 답변에만 적용 (사용자가 직접 입력한 기호는 보존).
const ASTRO_SYMBOL_MAP: Array<[RegExp, string, string]> = [
  [/□/g, '긴장 결', 'tension aspect'],
  [/☐/g, '긴장 결', 'tension aspect'],
  [/⚺/g, '긴장 결', 'tension aspect'],
  [/☌/g, '결합', 'conjunction'],
  [/⚹/g, '협력', 'sextile'],
  [/△/g, '조화', 'trine'],
  [/☍/g, '대립', 'opposition'],
  [/⚻/g, '미세 조정', 'quincunx'],
]

function stripAstroSymbols(text: string, theme: 'dark' | 'light'): string {
  // light theme 는 compat 상담사 (한국어 위주) — 한국어 라벨로.
  // dark theme 도 destiny 상담사 (한국어 위주) — 동일.
  // 영어 답변은 미래 별도 처리 필요 (지금은 한국어로 두기 — 영문 사용자는 표 거의 없음).
  void theme
  let result = text
  for (const [pattern, ko] of ASTRO_SYMBOL_MAP) {
    result = result.replace(pattern, ko)
  }
  return result
}

const ChatBubbleContent = React.memo(function ChatBubbleContent({
  role,
  content,
  pending,
  pendingNode,
  theme = 'dark',
}: ChatBubbleContentProps) {
  if (pending && pendingNode !== undefined) {
    return <>{pendingNode}</>
  }

  const isAssistant = role === 'assistant'
  const repaired = repairMojibakeText(content || '')
  const stripped = isAssistant ? stripReportMarkdown(repaired) : repaired
  // 점성 기호 자동 치환은 assistant 답변에만 — 사용자가 직접 □ 등을 입력한
  // 경우는 보존 (디버그/테스트용).
  const normalizedContent = isAssistant ? stripAstroSymbols(stripped, theme) : stripped

  const imageMatch = !isAssistant ? normalizedContent.match(IMAGE_PATTERN) : null
  const inlineImage = imageMatch ? { alt: imageMatch[1] || '', src: imageMatch[2] } : null
  const textContent = inlineImage
    ? normalizedContent.replace(IMAGE_PATTERN, '').trim()
    : normalizedContent

  // User 메시지는 평문이 기본 — markdown 토큰(이미지/굵게/제목/리스트) 있을 때만
  // MarkdownMessage 로 렌더. 일반 평문 입력은 영향 X.
  const userLooksLikeMarkdown = /\*\*[^*]+\*\*|^#{1,3}\s|\n[*-]\s/.test(textContent)
  const renderAsMarkdown = isAssistant || userLooksLikeMarkdown

  return (
    <>
      {textContent &&
        (renderAsMarkdown ? <MarkdownMessage content={textContent} theme={theme} /> : textContent)}
      {inlineImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={inlineImage.src}
          alt={inlineImage.alt}
          loading="lazy"
          style={{ ...CARD_IMAGE_STYLE, marginTop: textContent ? '10px' : 0 }}
        />
      )}
    </>
  )
})

export default ChatBubbleContent
