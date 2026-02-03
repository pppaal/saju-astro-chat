// src/components/saju/SajuChat.tsx
// Saju-only counselor chat component (no astrology)

'use client'

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './SajuChat.module.css'
import { detectCrisis } from '@/components/destiny-map/chat-i18n'
import { logger } from '@/lib/logger'
import { CHAT_I18N, SAJU_FOLLOWUPS, type ChatLangKey } from './constants'
import { SharedMessageRow, type Message, type FeedbackType } from '@/components/chat'
import { useSeedEvent, useWelcomeBack } from '@/components/chat'

type UserContext = {
  persona?: {
    sessionCount?: number
    lastTopics?: string[]
    emotionalTone?: string
    recurringIssues?: string[]
  }
  recentSessions?: Array<{
    id: string
    summary?: string
    keyTopics?: string[]
    lastMessageAt?: string
  }>
}

type SajuChatProps = {
  profile: {
    name?: string
    birthDate?: string
    birthTime?: string
    city?: string
    gender?: string
  }
  initialContext?: string
  lang?: ChatLangKey
  theme?: string
  seedEvent?: string
  saju?: Record<string, unknown> | null
  userContext?: UserContext
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void
  autoScroll?: boolean
  chatSessionId?: string
  autoSendSeed?: boolean
  ragSessionId?: string
}

const SajuChat = memo(function SajuChat({
  profile,
  initialContext = '',
  lang = 'ko',
  theme = 'life',
  seedEvent = 'saju-chat:seed',
  saju,
  userContext,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
}: SajuChatProps) {
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  const tr = CHAT_I18N[effectiveLang]
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  const [messages, setMessages] = useState<Message[]>(
    initialContext ? [{ role: 'system', content: initialContext }] : []
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({})
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [showCrisisModal, setShowCrisisModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Memoized follow-up questions
  const sajuFollowUps = useMemo(
    () => (lang === 'ko' ? SAJU_FOLLOWUPS.ko : SAJU_FOLLOWUPS.en),
    [lang]
  )

  // Shared hooks
  const { showWelcome: showWelcomeBack } = useWelcomeBack({
    shouldShow: Boolean(userContext?.persona?.sessionCount && userContext.persona.sessionCount > 1),
  })

  const generateFollowUpQuestions = useCallback(() => {
    const shuffled = [...sajuFollowUps].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }, [sajuFollowUps])

  const handleSuggestionClick = useCallback((question: string) => {
    setInput(question)
    setShowSuggestions(false)
  }, [])

  // Ref to store latest handleSubmit for follow-up questions
  const handleSubmitRef = useRef<(text: string) => void>(null!)

  // Handle follow-up question click - sends immediately
  const handleFollowUpClick = useCallback((question: string) => {
    setFollowUpQuestions([])
    handleSubmitRef.current(question)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [autoScroll])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Handle seed event with shared hook
  useSeedEvent({
    eventName: seedEvent,
    onSeed: (seedText) => {
      setInput(seedText)
      setTimeout(() => {
        const form = document.querySelector('form')
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }))
        }
      }, 100)
    },
  })

  // Voice recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognitionClass) {
        setNotice(
          lang === 'ko' ? '음성 인식이 지원되지 않습니다.' : 'Speech recognition not supported.'
        )
        return
      }
      const recognition = new SpeechRecognitionClass()
      recognition.lang = lang === 'ko' ? 'ko-KR' : 'en-US'
      recognition.interimResults = false
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript
        setInput((prev) => prev + ' ' + transcript)
        setIsRecording(false)
      }
      recognition.onerror = () => setIsRecording(false)
      recognition.onend = () => setIsRecording(false)
      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    }
  }, [isRecording, lang])

  // Submit handler - can be called with direct text for follow-up questions
  const handleSubmit = async (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault()
    const trimmed = directText || input.trim()
    if (!trimmed || loading) {
      return
    }

    // Crisis detection
    if (detectCrisis(trimmed, effectiveLang)) {
      setShowCrisisModal(true)
    }

    const userMsg: Message = { role: 'user', content: trimmed, id: `user-${Date.now()}` }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setNotice(null)
    setUsedFallback(false)
    setShowSuggestions(false)
    setFollowUpQuestions([])

    try {
      const response = await fetch('/api/saju/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ragSessionId ? { 'x-session-id': ragSessionId } : {}),
        },
        body: JSON.stringify({
          name: profile.name,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          gender: profile.gender,
          theme,
          lang,
          messages: [...messages, userMsg].filter((m) => m.role !== 'system'),
          saju,
          userContext,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Stream failed')
      }

      // Check fallback header
      if (response.headers.get('x-fallback') === '1') {
        setUsedFallback(true)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantId = `assistant-${Date.now()}`
      let lastScrollTime = 0

      setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              continue
            }

            // Check for follow-up questions
            if (data.includes('||FOLLOWUP||')) {
              const parts = data.split('||FOLLOWUP||')
              if (parts[0]) {
                assistantContent += parts[0]
              }
              if (parts[1]) {
                try {
                  const followUps = JSON.parse(parts[1])
                  if (Array.isArray(followUps)) {
                    setFollowUpQuestions(followUps.slice(0, 3))
                  }
                } catch {
                  // Use default follow-ups if parsing fails
                  setFollowUpQuestions(generateFollowUpQuestions())
                }
              }
            } else {
              assistantContent += data
            }

            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
            )

            // Auto-scroll during streaming (throttled)
            const now = Date.now()
            if (autoScroll && now - lastScrollTime > 100) {
              lastScrollTime = now
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
          }
        }
      }

      // If no follow-ups received, generate defaults
      if (followUpQuestions.length === 0) {
        setFollowUpQuestions(generateFollowUpQuestions())
      }

      // Save message if callback provided
      if (onSaveMessage && assistantContent) {
        onSaveMessage(trimmed, assistantContent)
      }

      if (!assistantContent) {
        setNotice(tr.noResponse)
      }
    } catch (err) {
      logger.error('[SajuChat] Error:', err)
      setNotice(tr.error)
    } finally {
      setLoading(false)
    }
  }

  // Update ref for follow-up click handler
  handleSubmitRef.current = (text: string) => handleSubmit(undefined, text)

  // Feedback handler
  const handleFeedback = useCallback(async (messageId: string, type: FeedbackType) => {
    setFeedback((prev) => ({ ...prev, [messageId]: type }))
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          type,
          sessionId: sessionIdRef.current,
          source: 'saju-counselor',
        }),
      })
    } catch (err) {
      logger.warn('[SajuChat] Feedback submission failed:', err)
    }
  }, [])

  const visibleMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages])

  const closeCrisisModal = useCallback(() => setShowCrisisModal(false), [])

  return (
    <div className={styles.chatContainer}>
      {/* Welcome back banner */}
      {showWelcomeBack && (
        <div className={styles.welcomeBanner}>
          <span>{tr.welcomeBack}</span>
        </div>
      )}

      {/* Crisis Modal */}
      {showCrisisModal && (
        <div className={styles.crisisOverlay}>
          <div className={styles.crisisModal}>
            <h3 className={styles.crisisTitle}>{tr.crisisTitle}</h3>
            <p className={styles.crisisMessage}>{tr.crisisMessage}</p>
            <div className={styles.crisisHotline}>
              <strong>{tr.crisisHotline}:</strong>
              <span>{tr.crisisHotlineNumber}</span>
            </div>
            <button type="button" className={styles.crisisClose} onClick={closeCrisisModal}>
              {tr.crisisClose}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {visibleMessages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <p>{tr.empty}</p>
          </div>
        )}

        {visibleMessages.map((msg) => (
          <SharedMessageRow
            key={msg.id || msg.content.slice(0, 20)}
            message={msg}
            feedback={feedback}
            onFeedback={handleFeedback}
            styles={styles}
          />
        ))}

        {loading && visibleMessages[visibleMessages.length - 1]?.role !== 'assistant' && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </span>
              {tr.thinking}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && !loading && (
        <div className={styles.followUpContainer}>
          {followUpQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              className={styles.followUpBtn}
              onClick={() => handleFollowUpClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Initial suggestions */}
      {showSuggestions && visibleMessages.length === 0 && !loading && (
        <div className={styles.suggestionsContainer}>
          {sajuFollowUps.slice(0, 4).map((q, i) => (
            <button
              key={i}
              type="button"
              className={styles.suggestionBtn}
              onClick={() => handleSuggestionClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Notice */}
      {notice && <div className={styles.notice}>{notice}</div>}
      {usedFallback && <div className={styles.fallbackNotice}>{tr.fallbackNote}</div>}

      {/* Input form */}
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tr.placeholder}
            disabled={loading}
            className={styles.textInput}
          />
          <button
            type="button"
            className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
            onClick={toggleRecording}
            disabled={loading}
            title={isRecording ? tr.stopRecording : tr.recording}
          >
            {isRecording ? '&#x23F9;' : '&#x1F3A4;'}
          </button>
          <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
            {tr.send}
          </button>
        </div>
      </form>
    </div>
  )
})

export default SajuChat
