import Link from 'next/link';

interface EmptyStateProps {
  styles: Record<string, string>;
  isKo: boolean;
}

export default function EmptyState({ styles, isKo }: EmptyStateProps) {
  return (
    <main className={styles.page}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🎭</div>
        <h1>{isKo ? '결과 없음' : 'No Results Yet'}</h1>
        <p>
          {isKo
            ? '대인관계 스타일 진단을 완료하여 결과를 확인하세요'
            : 'Complete the ICP assessment to discover your interpersonal style'}
        </p>
        <Link href="/icp/quiz" className={styles.ctaButton}>
          {isKo ? '진단 시작하기' : 'Start Assessment'}
        </Link>
      </div>
    </main>
  );
}
