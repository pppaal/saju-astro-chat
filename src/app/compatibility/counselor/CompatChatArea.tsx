'use client'

// 궁합 상담사 채팅 영역 — 메시지 목록(에러 배너/빈 상태/버블/다시 시도/
// 클래리파이어 액션/followUp 칩/생각 중 표시) + 입력창(ChatInputArea).
// page.tsx 분해로 추출 — 마크업/문구/클래스는 원본 그대로.

import React from 'react'
import ChatBubbleContent from '@/components/chat/ChatBubbleContent'
import { FollowUpChips } from '@/components/chat/FollowUpChips'
import { ChatInputArea, DataSourceToggles } from '@/components/destiny-map/chat-panels'
import type { DestinySources } from '@/components/destiny-map/chat-types'
import type { useClarifierCard } from '@/hooks/useClarifierCard'
import styles from './compatibility-counselor.module.css'
import type { ChatMessage } from './types'

interface CompatChatAreaProps {
  isKo: boolean
  locale: 'ko' | 'en'
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  followUpQuestions: string[]
  input: string
  onInputChange: (value: string) => void
  // 이번 답변에 넣을 시너스트리 도메인(사주/점성 체크박스) — 운명상담사와 동일 토글.
  sources: DestinySources
  onChangeSources: (next: DestinySources) => void
  sendMessage: (text?: string) => Promise<void>
  retryLastAnswer: () => void
  clarifier: Pick<ReturnType<typeof useClarifierCard>, 'buttonProps' | 'buttonLabel'>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  // 파일 첨부 (useFileUpload) — 상태/핸들러는 page 소유.
  cvName: string
  parsingPdf: boolean
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  fileNotice: string | null
  onOpenTarot: () => void
  onOpenChart: () => void
  tarotDisabled: boolean
  chartDisabled: boolean
  focusToken: number
}

export function CompatChatArea({
  isKo,
  locale,
  messages,
  isLoading,
  error,
  followUpQuestions,
  input,
  onInputChange,
  sources,
  onChangeSources,
  sendMessage,
  retryLastAnswer,
  clarifier,
  messagesEndRef,
  cvName,
  parsingPdf,
  onFileUpload,
  onClearFile,
  fileNotice,
  onOpenTarot,
  onOpenChart,
  tarotDisabled,
  chartDisabled,
  focusToken,
}: CompatChatAreaProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={styles.chatWrapper}>
      <div className={styles.messagesContainer}>
        {/* 에러는 컨테이너 맨 위 — destiny noticeBar 와 같은 패턴.
            메시지 뒤 인라인이면 사용자가 새 메시지로 가려 못 보던 회귀. */}
        {error && <div className={styles.errorMessage}>{error}</div>}
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>{'❤️'}</div>
            <p className={styles.emptyText}>
              {isKo ? '두 사람에 대해서 물어보세요' : 'Ask about the two of you'}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user'
          const isLastAssistant = !isUser && idx === messages.length - 1
          const showTyping = isLastAssistant && isLoading && !msg.content
          // 잘림 감지된 마지막 assistant 메시지에만 "다시 시도" 노출.
          // 스트리밍 중엔 숨김 — 새 토큰이 들어오는 동안 깜빡이지 않도록.
          const showRetry = isLastAssistant && !isLoading && msg.incomplete

          return (
            <div key={idx} className={`${styles.message} ${isUser ? styles.userMessage : ''}`}>
              <div className={styles.messageAvatar} aria-hidden="true">
                {isUser ? '\u{1F464}' : '❤️'}
              </div>
              <div className={styles.messageBubble}>
                <ChatBubbleContent
                  role={msg.role}
                  content={msg.content}
                  pending={showTyping}
                  pendingNode={
                    <span className={styles.thinkingMessage}>
                      <span className={styles.typing}>
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className={styles.thinkingText}>
                        {isKo
                          ? '두 분의 흐름을 깊이 읽고 있어요...'
                          : 'Reading the flow between the two of you…'}
                      </span>
                    </span>
                  }
                  theme="light"
                />
                {showRetry && (
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={retryLastAnswer}
                    aria-label={isKo ? '다시 시도' : 'Retry'}
                  >
                    <span aria-hidden="true">{'↻'}</span>
                    {isKo ? '답변이 끊겼어요 · 다시 시도' : 'Cut off · Retry'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* clarifier "카드 한 장 더 뽑기" — input 툴바가 아니라 타로
            결과 메시지 직후 노출 (운명상담사 MessagesPanel 패턴과 동일).
            마지막 메시지가 🃏 로 시작하는 타로 결과일 때만 보임. */}
        {(() => {
          const last = messages.length > 0 ? messages[messages.length - 1] : null
          const lastIsTarot =
            last?.role === 'assistant' && (last?.content || '').trimStart().startsWith('🃏')
          if (!lastIsTarot || isLoading) return null
          const cb = clarifier.buttonProps
          if (cb.disabled) return null
          return (
            <div className={styles.postAnswerActions}>
              <button
                type="button"
                onClick={cb.onClick}
                className={styles.clarifierActionBtn}
                aria-label={clarifier.buttonLabel}
              >
                <span className={styles.clarifierActionIcon} aria-hidden="true">
                  🃏
                </span>
                {clarifier.buttonLabel}
              </button>
            </div>
          )
        })()}

        {!isLoading && messages.length > 0 && (
          <FollowUpChips
            questions={followUpQuestions}
            lang={isKo ? 'ko' : 'en'}
            onPick={(q) => sendMessage(q)}
            styles={styles as never}
          />
        )}

        {/* 요청 단계 로딩 — assistant 버블은 응답 헤더가 도착해야 push 되는데
            (공용 훅의 placeholder push), 로딩은 전송 즉시 켜진다. 그
            사이(요청 진행 중) 사용자는 자기 질문만 보고 아무 피드백이 없어
            "멈췄나?" 회귀. 마지막이 user 이거나 비어 있을 때만 standalone
            "생각 중" 블록을 띄운다 — assistant 버블이 채워지면 그 버블의
            pendingNode 로 넘어가므로 이 블록은 자동으로 사라진다. */}
        {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
          <div className={styles.message}>
            <div className={styles.messageAvatar} aria-hidden="true">
              {'❤️'}
            </div>
            <div className={styles.messageBubble}>
              <span className={styles.thinkingMessage}>
                <span className={styles.typing}>
                  <span />
                  <span />
                  <span />
                </span>
                <span className={styles.thinkingText}>
                  {isKo
                    ? '당신의 궁합을 깊게 알아보고 있습니다'
                    : 'Looking deeply into your compatibility…'}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 도구 안내(ToolHint) 알림 제거 — 운명상담사처럼 입력창 좌하단 ⋮
            메뉴(ChatInputArea 내장)의 작은 힌트 버블이 같은 역할을 한다. */}

        <div ref={messagesEndRef} />
      </div>

      {/* Input — 운명 상담사와 동일한 ChatInputArea 공용 컴포넌트.
          📎 파일 / 🃏 타로 / ✨ 궁합차트 + ✕ + ▶ 전송. 모든 화면 크기에서
          세 도구 모두 노출 (사이드바 푸터에 같은 진입점 없음).
          운명 상담사처럼 max-width 860px 로 가운데 정렬 — 안 그러면 입력창이
          chatWrapper 전체 폭으로 가로로 길게 퍼진다(궁합만 넓던 회귀). */}
      <div className={styles.inputWrap}>
        {/* 데이터 소스 체크박스 — 이번 답변에 사주/점성 시너스트리 중 무엇을
            넣을지 고른다(운명상담사와 동일 컴포넌트). 최소 하나는 항상 켜짐.
            showGroupLabel: 체크박스 위 "상담에 사용할 데이터" 라벨로 용도를 바로
            알리고, showInfo + variant="synastry": 누르면 궁합 전용 설명 팝업. */}
        <DataSourceToggles
          sources={sources}
          onChange={onChangeSources}
          lang={locale}
          disabled={isLoading}
          theme="light"
          showGroupLabel
          showInfo
          variant="synastry"
        />
        <ChatInputArea
          input={input}
          loading={isLoading}
          cvName={cvName}
          parsingPdf={parsingPdf}
          usedFallback={false}
          labels={{
            placeholder: isKo ? '질문을 입력하세요…' : 'Type a question…',
            send: isKo ? '전송' : 'Send',
            uploadCv: isKo
              ? '관계 메모·대화 등 파일 첨부 (txt/md/csv/pdf)'
              : 'Attach a file (txt/md/csv/pdf)',
            parsingPdf: isKo ? 'PDF 읽는 중…' : 'Parsing…',
          }}
          lang={locale}
          placeholderPrompts={[]}
          onInputChange={onInputChange}
          onKeyDown={handleKeyDown}
          onSend={() => sendMessage()}
          onFileUpload={onFileUpload}
          onClearFile={onClearFile}
          onOpenTarot={onOpenTarot}
          onOpenChart={onOpenChart}
          tarotDisabled={tarotDisabled}
          chartDisabled={chartDisabled}
          tarot={{
            ariaLabel: isKo ? '다음 질문 타로로 보기' : 'See your next question in tarot',
            title: isKo
              ? '다음 질문을 타로로 보기 — 질문 적고 스프레드 골라 카드 뽑기'
              : 'See your next question in tarot — pick a spread and draw',
          }}
          chart={{
            label: isKo ? '궁합차트' : 'Chart',
            ariaLabel: isKo ? '궁합 차트' : 'Couple chart',
            title: isKo ? '궁합 차트 보기' : 'View couple chart',
          }}
          focusToken={focusToken}
          theme="light"
        />
        {fileNotice && <div className={styles.fileNotice}>{fileNotice}</div>}
      </div>
    </div>
  )
}
