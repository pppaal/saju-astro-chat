import styles from "./TarotPageSkeleton.module.css";

/**
 * 타로 메인 페이지 전용 로딩 스켈레톤
 * 실제 페이지와 똑같은 모양으로 표시되어 사용자가 기다리는 동안 덜 답답함
 */
export function TarotPageSkeleton() {
  return (
    <div className={styles.container}>
      {/* 배경 그라데이션 */}
      <div className={styles.background} />

      {/* 로고/타이틀 영역 */}
      <div className={styles.logoSection}>
        <div className={styles.icon}>🔮</div>
        <div className={styles.title} />
        <div className={styles.subtitle} />
      </div>

      {/* 검색창 */}
      <div className={styles.searchBox}>
        <div className={styles.searchIcon}>✨</div>
        <div className={styles.searchInput} />
      </div>

      {/* 빠른 질문 태그들 */}
      <div className={styles.quickSection}>
        <div className={styles.quickLabel} />
        <div className={styles.quickTags}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.tag} />
          ))}
        </div>
      </div>

      {/* 하단 힌트 */}
      <div className={styles.hint} />
    </div>
  );
}
