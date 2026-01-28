import React from 'react';
import { Particles } from './Particles';

interface IntroScreenProps {
  styles: Record<string, string>;
  onStart: () => void;
}

export function IntroScreen({ styles, onStart }: IntroScreenProps) {
  return (
    <div className={styles.container}>
      <Particles styles={styles} count={30} />

      <div className={styles.introContent}>
        <div className={styles.introLogo}>
          <span className={styles.introIcon}>🌌</span>
          <h1>Destiny Fusion Matrix™</h1>
        </div>

        <p className={styles.introTagline}>
          동양의 사주와 서양의 점성술이<br />
          하나로 융합되는 순간
        </p>

        <div className={styles.introStats}>
          <div className={styles.introStat}>
            <span className={styles.statNum}>10</span>
            <span className={styles.statLabel}>융합 레이어</span>
          </div>
          <div className={styles.introStat}>
            <span className={styles.statNum}>1,206</span>
            <span className={styles.statLabel}>상호작용 셀</span>
          </div>
          <div className={styles.introStat}>
            <span className={styles.statNum}>∞</span>
            <span className={styles.statLabel}>가능한 조합</span>
          </div>
        </div>

        <div className={styles.introFeatures}>
          <div className={styles.featureItem}>
            <span>☯️</span>
            <span>사주팔자 (四柱八字)</span>
          </div>
          <div className={styles.featureX}>✦</div>
          <div className={styles.featureItem}>
            <span>⭐</span>
            <span>서양 점성술</span>
          </div>
        </div>

        <button className={styles.startBtn} onClick={onStart}>
          <span>나의 운명 매트릭스 분석하기</span>
          <span className={styles.btnArrow}>→</span>
        </button>

        <p className={styles.introNote}>
          생년월일과 일간 정보를 입력하면<br />
          당신만의 융합 분석 결과를 확인할 수 있습니다
        </p>
      </div>

      <footer className={styles.introFooter}>
        <p>© 2025 Destiny Fusion Matrix™. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
