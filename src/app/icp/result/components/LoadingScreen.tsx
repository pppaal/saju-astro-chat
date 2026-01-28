import StarsBackground from './StarsBackground';

interface LoadingScreenProps {
  styles: Record<string, string>;
  isKo: boolean;
}

export default function LoadingScreen({ styles, isKo }: LoadingScreenProps) {
  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} count={60} />
      <div className={styles.loading}>
        <div className={styles.cosmicLoader}>
          <div className={styles.cosmicRing} />
          <div className={styles.cosmicRing} />
          <div className={styles.cosmicRing} />
          <div className={styles.cosmicCore}>🎭</div>
        </div>
        <p className={styles.loadingText}>
          {isKo ? '결과를 불러오는 중...' : 'Loading your results...'}
        </p>
      </div>
    </main>
  );
}
