'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './ChatDemoSection.module.css'

type TranslateFn = (path: string, fallback: string) => string

type Props = {
  translate: TranslateFn
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function ChatDemoSection({ translate }: Props) {
  const demoConversation = useMemo<Message[]>(
    () => [
      {
        role: 'user',
        content: translate('landing.chatDemo.q1', 'How is my fortune today?'),
        timestamp: 'Just now',
      },
      {
        role: 'assistant',
        content: translate(
          'landing.chatDemo.a1',
          "Based on your astrological chart, today brings favorable planetary alignments. Your Saju elements show strong harmony - particularly in career and wealth sectors. The Moon's position suggests emotional clarity, while Jupiter's influence enhances opportunities for growth."
        ),
        timestamp: 'Just now',
      },
      {
        role: 'user',
        content: translate('landing.chatDemo.q2', 'What about love life?'),
        timestamp: 'Just now',
      },
      {
        role: 'assistant',
        content: translate(
          'landing.chatDemo.a2',
          "Your romantic sector shows interesting dynamics. The Peach Blossom star in your chart indicates charm and attractiveness. Venus is well-aspected, suggesting harmony in relationships. If you're single, this is a good time for new connections. For couples, focus on communication and shared goals."
        ),
        timestamp: 'Just now',
      },
      {
        role: 'user',
        content: translate('landing.chatDemo.q3', 'Should I start a new project?'),
        timestamp: 'Just now',
      },
      {
        role: 'assistant',
        content: translate(
          'landing.chatDemo.a3',
          "Yes, the timing looks favorable! Your current 10-year luck cycle supports new beginnings. The combination of Wood and Fire elements in your chart provides creative energy and momentum. Mercury's position enhances planning and communication skills. Consider starting within the next few weeks for optimal results."
        ),
        timestamp: 'Just now',
      },
    ],
    [translate]
  )

  const [messages, setMessages] = useState<Message[]>(() => [
    demoConversation[0],
    demoConversation[1],
  ])
  const [currentInput, setCurrentInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messageIndexRef = useRef(2)
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      })
    }
  }, [])

  const typeUserMessage = useCallback((text: string, callback: () => void) => {
    let index = 0
    setCurrentInput('')

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
    }

    typingIntervalRef.current = setInterval(() => {
      if (index <= text.length) {
        setCurrentInput(text.substring(0, index))
        index++
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        callback()
      }
    }, 50)
  }, [])

  useEffect(() => {
    const addNextMessage = () => {
      if (messageIndexRef.current >= demoConversation.length) {
        const resetTimer = setTimeout(() => {
          setMessages([demoConversation[0], demoConversation[1]])
          setCurrentInput('')
          messageIndexRef.current = 2
        }, 5000)
        return () => clearTimeout(resetTimer)
      }

      const currentMessage = demoConversation[messageIndexRef.current]
      const isUser = currentMessage.role === 'user'

      const timer = setTimeout(
        () => {
          if (isUser) {
            setIsTyping(true)
            typeUserMessage(currentMessage.content, () => {
              setTimeout(() => {
                setMessages((prev) => [...prev, currentMessage])
                setCurrentInput('')
                setIsTyping(false)
                messageIndexRef.current++
              }, 300)
            })
          } else {
            setMessages((prev) => [...prev, currentMessage])
            messageIndexRef.current++
          }
        },
        messageIndexRef.current === 2 ? 1000 : isUser ? 1500 : 800
      )

      return () => {
        clearTimeout(timer)
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
      }
    }

    return addNextMessage()
  }, [messages.length, demoConversation, typeUserMessage])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentInput, scrollToBottom])

  return (
    <section className={styles.chatDemoSection}>
      <div className={styles.chatDemoContainer}>
        <div className={styles.leftPanel}>
          <h2 className={styles.demoTitle} suppressHydrationWarning>
            {translate('landing.chatDemo.title', 'DestinyPal Services')}
          </h2>
          <p className={styles.demoSubtitle} suppressHydrationWarning>
            {translate('landing.chatDemo.subtitle', 'Your Destiny, Decoded.')}
          </p>
          <p className={styles.demoSubtitle} suppressHydrationWarning>
            {translate('landing.chatDemo.subtitle2', 'AI interprets the language of fate')}
          </p>
        </div>

        <div className={styles.chatPanel}>
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div className={styles.aiAvatar}>AI</div>
              <div className={styles.aiInfo}>
                <div className={styles.aiName} suppressHydrationWarning>
                  {translate('landing.chatDemo.aiName', 'DestinyPal AI')}
                </div>
                <div className={styles.aiStatus}>
                  <span className={styles.statusDot}></span>
                  <span suppressHydrationWarning>
                    {translate('landing.chatDemo.online', 'Online')}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.chatMessages} ref={chatContainerRef}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}
                >
                  {msg.role === 'assistant' && <div className={styles.messageAvatar}>AI</div>}
                  <div className={styles.messageContent}>
                    <p>{msg.content}</p>
                    <span className={styles.messageTime}>{msg.timestamp}</span>
                  </div>
                  {msg.role === 'user' && <div className={styles.messageAvatar}>You</div>}
                </div>
              ))}
              {isTyping && currentInput && (
                <div className={styles.userMessage}>
                  <div className={styles.messageContent}>
                    <p>{currentInput}</p>
                  </div>
                  <div className={styles.messageAvatar}>You</div>
                </div>
              )}
            </div>

            <div className={styles.chatInput}>
              <input
                type="text"
                placeholder={
                  currentInput ||
                  translate('landing.chatDemo.placeholder', 'Ask about your destiny...')
                }
                value={currentInput}
                readOnly
                className={styles.inputField}
              />
              <button className={styles.sendButton} disabled>
                <span>&#10148;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
