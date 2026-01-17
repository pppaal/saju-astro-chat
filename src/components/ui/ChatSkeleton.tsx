import styles from "./ChatSkeleton.module.css";

/**
 * 채팅 스타일 페이지 로딩 스켈레톤
 * 타로 챗, 사주 상담, 운세 상담 등에서 사용
 */
export function ChatSkeleton() {
  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.backButton} />
        <div className={styles.avatar}>🤖</div>
        <div className={styles.headerInfo}>
          <div className={styles.headerTitle} />
          <div className={styles.headerStatus} />
        </div>
        <div className={styles.menuButton} />
      </div>

      {/* 메시지 영역 */}
      <div className={styles.messagesArea}>
        {/* AI 메시지 */}
        <div className={styles.messageRow}>
          <div className={styles.aiAvatar}>✨</div>
          <div className={styles.aiMessage}>
            <div className={styles.messageLine} style={{ width: "90%" }} />
            <div className={styles.messageLine} style={{ width: "100%" }} />
            <div className={styles.messageLine} style={{ width: "70%" }} />
          </div>
        </div>

        {/* 사용자 메시지 */}
        <div className={styles.messageRowRight}>
          <div className={styles.userMessage}>
            <div className={styles.messageLine} style={{ width: "80%" }} />
          </div>
        </div>

        {/* AI 응답 */}
        <div className={styles.messageRow}>
          <div className={styles.aiAvatar}>✨</div>
          <div className={styles.aiMessage}>
            <div className={styles.messageLine} style={{ width: "100%" }} />
            <div className={styles.messageLine} style={{ width: "85%" }} />
          </div>
        </div>

        {/* 타이핑 인디케이터 */}
        <div className={styles.messageRow}>
          <div className={styles.aiAvatar}>✨</div>
          <div className={styles.typingIndicator}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        </div>
      </div>

      {/* 입력 영역 */}
      <div className={styles.inputArea}>
        <div className={styles.inputBox}>
          <div className={styles.inputPlaceholder} />
          <div className={styles.sendButton} />
        </div>
      </div>
    </div>
  );
}

/**
 * 간단한 채팅 로딩 (작은 버전)
 */
export function MiniChatSkeleton() {
  return (
    <div className={styles.miniContainer}>
      <div className={styles.miniHeader} />
      <div className={styles.miniMessages}>
        <div className={styles.miniMessageLeft} />
        <div className={styles.miniMessageRight} />
        <div className={styles.miniMessageLeft} />
      </div>
      <div className={styles.miniInput} />
    </div>
  );
}