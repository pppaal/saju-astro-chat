import React from 'react';
import BackButton from '@/components/ui/BackButton';
import styles from './matrix.module.css';

interface MatrixIntroScreenProps {
  hasProfile: boolean;
  profileName: string;
  profileBirthDate?: string;
  profileLoading: boolean;
  onStart: () => void;
}

export function MatrixIntroScreen({ hasProfile, profileName, profileBirthDate, profileLoading, onStart }: MatrixIntroScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.particles}>
        {[...Array(30)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
          }} />
        ))}
      </div>

      <div className={styles.backButtonWrapper}>
        <BackButton />
      </div>

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

        {hasProfile && (
          <div className={styles.profileInfo}>
            <span className={styles.profileIcon}>👤</span>
            <span>{profileName}님 ({profileBirthDate})</span>
          </div>
        )}

        <button
          className={styles.startBtn}
          onClick={onStart}
          disabled={profileLoading}
        >
          <span>{profileLoading ? '프로필 로딩 중...' : '나의 운명 매트릭스 분석하기'}</span>
          <span className={styles.btnArrow}>→</span>
        </button>

        {!profileLoading && !hasProfile && (
          <p className={styles.introNote}>
            먼저 생년월일 정보를 입력해주세요.<br />
            버튼 클릭 시 정보 입력 페이지로 이동합니다.
          </p>
        )}
      </div>

      <footer className={styles.introFooter}>
        <p>© 2024 Destiny Fusion Matrix™. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
