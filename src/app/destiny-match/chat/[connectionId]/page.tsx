'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../DestinyMatch.module.css';
import { logger } from '@/lib/logger';

type Message = {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type Partner = {
  userId: string;
  displayName: string;
  photos: string[];
  lastActiveAt: string;
};

type Connection = {
  id: string;
  compatibilityScore: number | null;
  isSuperLikeMatch: boolean;
  partner: Partner;
};

export default function MatchChatPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 연결 정보 조회
  const loadConnection = useCallback(async () => {
    try {
      const res = await fetch(`/api/destiny-match/matches?connectionId=${connectionId}`);
      const data = await res.json();

      if (res.ok && data.matches?.[0]) {
        const match = data.matches[0];
        setConnection({
          id: match.connectionId,
          compatibilityScore: match.compatibilityScore,
          isSuperLikeMatch: match.isSuperLikeMatch,
          partner: {
            userId: match.partner.userId,
            displayName: match.partner.displayName,
            photos: match.partner.photos || [],
            lastActiveAt: match.partner.lastActiveAt,
          },
        });
      } else {
        setError('채팅을 찾을 수 없습니다');
      }
    } catch (e) {
      logger.error('Load connection error:', { error: e });
      setError('연결 정보를 불러오는 중 오류가 발생했습니다');
    }
  }, [connectionId]);

  // 메시지 조회
  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      if (cursor) setLoadingMore(true);

      const url = cursor
        ? `/api/destiny-match/chat?connectionId=${connectionId}&cursor=${cursor}`
        : `/api/destiny-match/chat?connectionId=${connectionId}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        if (cursor) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages || []);
        }
        setHasMore(data.hasMore);
      }
    } catch (e) {
      logger.error('Load messages error:', { error: e });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [connectionId]);

  // 초기 로드
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push(`/auth/signin?callbackUrl=/destiny-match/chat/${connectionId}`);
      return;
    }

    loadConnection();
    loadMessages();
  }, [session, status, router, connectionId, loadConnection, loadMessages]);

  // 스크롤 to bottom
  useEffect(() => {
    if (!loading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // 폴링으로 새 메시지 확인 (5초마다)
  useEffect(() => {
    if (!session || loading) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [session, loading, loadMessages]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // 낙관적 UI 업데이트
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
      senderId: session?.user?.id || '',
      sender: {
        id: session?.user?.id || '',
        name: session?.user?.name || null,
        image: session?.user?.image || null,
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/destiny-match/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          content: messageContent,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 낙관적 메시지를 실제 메시지로 교체
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? data.message : m
          )
        );
        // 햅틱 피드백
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      } else {
        // 실패시 낙관적 메시지 제거
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        setError(data.error || '메시지 전송에 실패했습니다');
        setNewMessage(messageContent); // 메시지 복원
      }
    } catch (e) {
      logger.error('Send message error:', { error: e });
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setError('메시지 전송 중 오류가 발생했습니다');
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 텍스트 영역 자동 높이 조절
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  // 날짜 포맷
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 날짜 구분선 표시 여부 확인
  const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currentDate !== prevDate;
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>채팅을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !connection) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>{error}</div>
          <Link href="/destiny-match/matches" className={styles.backButton}>
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.chatContainer}>
        {/* Chat Header */}
        <header className={styles.chatHeader}>
          <Link href="/destiny-match/matches" className={styles.backButton}>
            {'<'}
          </Link>
          <div className={styles.chatPartnerPhoto}>
            {connection?.partner.photos?.[0] ? (
              <img
                src={connection.partner.photos[0]}
                alt={connection.partner.displayName}
              />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div className={styles.chatPartnerInfo}>
            <h2 className={styles.chatPartnerName}>
              {connection?.partner.displayName}
              {connection?.isSuperLikeMatch && ' ⭐'}
            </h2>
            <p className={styles.chatPartnerStatus}>
              {connection?.compatibilityScore && `궁합 ${connection.compatibilityScore}%`}
            </p>
          </div>
          <div className={styles.chatHeaderButtons}>
            <Link
              href={`/tarot/couple?connectionId=${connectionId}`}
              className={styles.chatHeaderButton}
              title="커플 타로"
            >
              🎴
            </Link>
            <Link
              href={`/compatibility?partnerId=${connection?.partner.userId}`}
              className={styles.chatHeaderButton}
              title="상세 궁합"
            >
              💫
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className={styles.messagesContainer}
        >
          {loadingMore && (
            <div className={styles.messagesLoading}>
              <div className={styles.loadingSpinner} style={{ width: 24, height: 24 }} />
            </div>
          )}

          {messages.length === 0 ? (
            <div className={styles.noMessages}>
              <span>💬</span>
              <p>아직 대화가 없어요</p>
              <p>첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const isSent = message.senderId === session?.user?.id;

              return (
                <div key={message.id}>
                  {shouldShowDateSeparator(message, prevMessage) && (
                    <div className={styles.dateSeparator}>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                  )}
                  <div
                    className={`${styles.messageWrapper} ${
                      isSent ? styles.sent : styles.received
                    }`}
                  >
                    <div className={styles.messageBubble}>
                      {message.content}
                    </div>
                    <div className={styles.messageTime}>
                      {formatTime(message.createdAt)}
                      {isSent && message.isRead && (
                        <span className={styles.messageRead}>✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Toast */}
        {error && (
          <div
            className={styles.errorNotification}
            onClick={() => setError(null)}
          >
            {error}
          </div>
        )}

        {/* Message Input */}
        <div className={styles.chatInputArea}>
          <textarea
            ref={inputRef}
            className={styles.chatInput}
            placeholder="메시지를 입력하세요..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}
