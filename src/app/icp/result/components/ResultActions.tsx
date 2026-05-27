import Link from 'next/link';

interface ResultActionsProps {
  styles: Record<string, string>;
  isKo: boolean;
  authStatus: string;
  saveStatus: string;
  isSavedToDb: boolean;
  onSave: () => void;
  onShare: () => void;
  onDownload: () => void;
}

export default function ResultActions({
  styles,
  isKo,
  authStatus,
  saveStatus,
  isSavedToDb,
  onSave,
  onShare,
  onDownload,
}: ResultActionsProps) {
  return (
    <section className={styles.actions}>
      <button
        onClick={onSave}
        className={`${styles.saveButton} ${isSavedToDb ? styles.saved : ''}`}
        disabled={saveStatus === 'saving' || isSavedToDb}
      >
        <span>
          {saveStatus === 'saving' ? '⏳' : isSavedToDb ? '✅' : authStatus === 'authenticated' ? '💾' : '🔐'}
        </span>
        {saveStatus === 'saving'
          ? (isKo ? '저장 중...' : 'Saving...')
          : isSavedToDb
            ? (isKo ? '저장됨!' : 'Saved!')
            : authStatus === 'authenticated'
              ? (isKo ? '결과 저장' : 'Save Result')
              : (isKo ? '로그인하여 저장' : 'Login to Save')}
      </button>

      <button onClick={onShare} className={styles.shareButton}>
        <span>📤</span> {isKo ? '결과 공유' : 'Share Result'}
      </button>
      <button onClick={onDownload} className={styles.downloadButton}>
        <span>📥</span> {isKo ? 'JSON 다운로드' : 'Download JSON'}
      </button>
      <Link href="/icp/quiz" className={styles.retakeButton}>
        <span>🔄</span> {isKo ? '다시 진단하기' : 'Retake Assessment'}
      </Link>
      <Link href="/personality/combined" className={styles.retakeButton}>
        <span>🔗</span> {isKo ? '통합 성격 분석' : 'Combined Analysis'}
      </Link>
    </section>
  );
}
