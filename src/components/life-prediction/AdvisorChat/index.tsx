'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AdvisorChat.module.css';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AdvisorChatProps {
  // 예측 컨텍스트
  predictionContext: {
    question: string;
    eventType: string;
    results: Array<{
      startDate: string;
      endDate: string;
      score: number;
      grade: string;
      reasons: string[];
    }>;
    birthDate: string;
    gender: 'M' | 'F';
  };
  locale?: 'ko' | 'en';
  onClose?: () => void;
}

export function AdvisorChat({ predictionContext, locale = 'ko', onClose }: AdvisorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 초기 인사 메시지
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: Message = {
        id: 'greeting',
        role: 'assistant',
        content: locale === 'ko'
          ? `안녕하세요! 예측 결과에 대해 궁금한 점이 있으시면 편하게 물어보세요. "${predictionContext.question}"에 대한 분석 결과를 바탕으로 더 자세한 조언을 드릴 수 있어요.`
          : `Hello! Feel free to ask me anything about your prediction results. I can provide more detailed advice based on your question "${predictionContext.question}".`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [locale, predictionContext.question, messages.length]);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) {return;}

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/life-prediction/advisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: predictionContext,
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
          locale,
        }),
      });

      const data = await response.json();

      if (data.success && data.reply) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      logger.error('[AdvisorChat] Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: locale === 'ko'
          ? '죄송합니다. 응답을 가져오는 중 오류가 발생했습니다. 다시 시도해주세요.'
          : 'Sorry, there was an error getting a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, predictionContext, locale]);

  // 빠른 질문 버튼
  const quickQuestions = locale === 'ko' ? [
    '이 시기에 주의할 점은?',
    '더 좋은 시기가 있을까요?',
    '구체적으로 어떻게 준비해야 해요?',
  ] : [
    'What should I be careful about?',
    'Is there a better timing?',
    'How should I prepare specifically?',
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => sendMessage(), 100);
  };

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
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? (locale === 'ko' ? 'AI 상담사 접기' : 'Collapse advisor chat') : (locale === 'ko' ? 'AI 상담사 펼치기' : 'Expand advisor chat')}
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
                <div
                  key={message.id}
                  className={`${styles.message} ${styles[message.role]}`}
                >
                  {message.role === 'assistant' && (
                    <span className={styles.avatar}>🔮</span>
                  )}
                  <div className={styles.messageContent}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
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
              )}

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
  );
}

export default AdvisorChat;
