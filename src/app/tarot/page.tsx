"use client";

import Link from "next/link";
import { useRouter } from "next/navigation"; // 뒤로가기용
import styles from "./tarot-home.module.css";

export default function TarotHomePage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* --- 왼쪽 상단 뒤로가기 버튼 --- */}
      <button onClick={() => router.back()} className={styles.backButton}>
        ← Back
      </button>

      {/* 수정 구슬과 제목 */}
      <div className={styles.crystalBallContainer}>
        <div className={styles.crystalBall}></div>
        <div className={styles.crystalBallBase}></div>
      </div>

      <h1 className={styles.title}>What is your question?</h1>
      <p className={styles.subtitle}>Choose a topic to begin your reading.</p>

      {/* --- 주제 선택 그리드 --- */}
      <div className={styles.topicGrid}>
        {/* General Insight */}
        <Link href="/tarot/general-insight" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>General Insight</h2>
            <p className={styles.topicDescription}>
              Explore the overall energy surrounding you.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Love & Relationships */}
        <Link href="/tarot/love-relationships" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Love & Relationships</h2>
            <p className={styles.topicDescription}>
              Uncover the mysteries of your heart.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Career & Work */}
        <Link href="/tarot/career-work" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Career & Work</h2>
            <p className={styles.topicDescription}>
              Find clarity on your professional journey.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Money & Finance */}
        <Link href="/tarot/money-finance" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Money & Finance</h2>
            <p className={styles.topicDescription}>
              Seek guidance on your financial situation.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Well-being & Health */}
        <Link href="/tarot/well-being-health" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Well-being & Health</h2>
            <p className={styles.topicDescription}>
              Listen to the whispers of your body and mind.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Spiritual Growth */}
        <Link href="/tarot/spiritual-growth" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Spiritual Growth</h2>
            <p className={styles.topicDescription}>
              Connect with your higher self.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>

        {/* Daily Reading */}
        <Link href="/tarot/daily-reading" className={styles.topicCard}>
          <div>
            <h2 className={styles.topicTitle}>Daily Reading</h2>
            <p className={styles.topicDescription}>
              A quick look at the energies of your day.
            </p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>
      </div>
    </div>
  );
}