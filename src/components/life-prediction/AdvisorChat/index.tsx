'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './AdvisorChat.module.css'
import { logger } from '@/lib/logger'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AdvisorChatProps {
  // 예측 컨텍스트
  predictionContext: {
    question: string
    eventType: string
    results: Array<{
      startDate: string
      endDate: string
      score: number
      grade: string
      reasons: string[]
    }>
    birthDate: string
    gender: 'M' | 'F'
  }
  locale?: 'ko' | 'en'
  onClose?: () => void
}

// 메시지 컴포넌트 메모이제이션
const MessageItem = memo(({ message, styles }: { message: Message; styles: any }) => (
  <div key={message.id} className={`${styles.message} ${styles[message.role]}`}>
    {message.role === 'assistant' && <span className={styles.avatar}>🔮</span>}
    <div className={styles.messageContent}>
      <p>{message.content}</p>
    </div>
  </div>
))
MessageItem.displayName = 'MessageItem'

// 로딩 인디케이터 메모이제이션
const LoadingIndicator = memo(({ styles }: { styles: any }) => (
  <div className={`${styles.message} ${styles.assistant}`}>
    <span className={styles.avatar}>🔮</span>
    <div className={styles.messageContent}>
      <div className={styles.typing}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
))
LoadingIndicator.displayName = 'LoadingIndicator'

function AdvisorChatComponent({ predictionContext, locale = 'ko', onClose }: AdvisorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 초기 인사 메시지 메모이제이션
  const greetingMessage = useMemo(
    () => ({
      id: 'greeting',
      role: 'assistant' as const,
      content:
        locale === 'ko'
          ? `안녕하세요! 예측 결과에 대해 궁금한 점이 있으시면 편하게 물어보세요. "${predictionContext.question}"에 대한 분석 결과를 바탕으로 더 자세한 조언을 드릴 수 있어요.`
          : `Hello! Feel free to ask me anything about your prediction results. I can provide more detailed advice based on your question "${predictionContext.question}".`,
      timestamp: new Date(),
    }),
    [locale, predictionContext.question]
  )

  // 초기 인사 메시지
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([greetingMessage])
    }
  }, [greetingMessage, messages.length])

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 메시지 전송
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) {
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/life-prediction/advisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: predictionContext,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          locale,
        }),
      })

      const data = await response.json()

      if (data.success && data.reply) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      logger.error('[AdvisorChat] Chat error:', error)

      // 에러 메시지 파싱
      let errorContent =
        locale === 'ko'
          ? '죄송합니다. 응답을 가져오는 중 오류가 발생했습니다. 다시 시도해주세요.'
          : 'Sorry, there was an error getting a response. Please try again.'

      // 크레딧 부족 에러 처리
      if (error instanceof Error && error.message.includes('credit')) {
        errorContent =
          locale === 'ko'
            ? '🎫 AI 상담을 이용하려면 크레딧이 필요합니다. 로그인 후 크레딧을 충전해주세요.'
            : '🎫 Credits required to use AI counseling. Please log in and recharge your credits.'
      }
      // 인증 에러 처리
      else if (
        error instanceof Error &&
        (error.message.includes('auth') || error.message.includes('401'))
      ) {
        errorContent =
          locale === 'ko'
            ? '🔐 AI 상담을 이용하려면 로그인이 필요합니다.'
            : '🔐 Please log in to use AI counseling.'
      }

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, predictionContext, locale])

  // 빠른 질문 버튼 메모이제이션
  const quickQuestions = useMemo(
    () =>
      locale === 'ko'
        ? ['이 시기에 주의할 점은?', '더 좋은 시기가 있을까요?', '구체적으로 어떻게 준비해야 해요?']
        : [
            'What should I be careful about?',
            'Is there a better timing?',
            'How should I prepare specifically?',
          ],
    [locale]
  )

  const handleQuickQuestion = useCallback(
    (question: string) => {
      setInput(question)
      setTimeout(() => sendMessage(), 100)
    },
    [sendMessage]
  )

  // 헤더 토글 핸들러 메모이제이션
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleKeyDownToggle = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsExpanded((prev) => !prev)
      }
    },
    []
  )

  return (
    <motion.div
      className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* 헤더 */}
      <div
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={handleToggleExpanded}
        onKeyDown={handleKeyDownToggle}
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? locale === 'ko'
              ? 'AI 상담사 접기'
              : 'Collapse advisor chat'
            : locale === 'ko'
              ? 'AI 상담사 펼치기'
              : 'Expand advisor chat'
        }
      >
        <div className={styles.headerLeft}>
          <span className={styles.advisorIcon}>🔮</span>
          <div className={styles.headerText}>
            <h3>{locale === 'ko' ? 'AI 운세 상담사' : 'AI Fortune Advisor'}</h3>
            <p>{locale === 'ko' ? '결과에 대해 더 물어보세요' : 'Ask more about your results'}</p>
          </div>
        </div>
        <button className={styles.expandBtn} aria-hidden="true" tabIndex={-1}>
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={styles.chatArea}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 메시지 영역 */}
            <div className={styles.messages}>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} styles={styles} />
              ))}

              {isLoading && <LoadingIndicator styles={styles} />}

              <div ref={messagesEndRef} />
            </div>

            {/* 빠른 질문 */}
            {messages.length <= 2 && (
              <div className={styles.quickQuestions}>
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className={styles.quickBtn}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 입력 영역 */}
            <div className={styles.inputArea}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={locale === 'ko' ? '궁금한 점을 물어보세요...' : 'Ask me anything...'}
                disabled={isLoading}
                className={styles.input}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={styles.sendBtn}
              >
                {isLoading ? '...' : '→'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// 메모이제이션된 컴포넌트 export
export const AdvisorChat = memo(AdvisorChatComponent)
export default AdvisorChat
