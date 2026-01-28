import Link from 'next/link';

interface ResultActionsProps {
  styles: Record<string, string>;
  authStatus: string;
  saveStatus: string;
  isSavedToDb: boolean;
  handleSaveResult: () => void;
  handleShare: () => void;
  handleDownload: () => void;
  t: (path: string, fallback?: string) => string;
}

export function ResultActions({
  styles,
  authStatus,
  saveStatus,
  isSavedToDb,
  handleSaveResult,
  handleShare,
  handleDownload,
  t,
}: ResultActionsProps) {
  return (
    <section className={styles.actions}>
      <button
        onClick={handleSaveResult}
        className={`${styles.saveButton} ${isSavedToDb ? styles.saved : ''}`}
        disabled={saveStatus === 'saving' || isSavedToDb}
      >
        <span>
          {saveStatus === 'saving' ? '\u23F3' : isSavedToDb ? '\u2705' : authStatus === 'authenticated' ? '\uD83D\uDCBE' : '\uD83D\uDD10'}
        </span>
        {saveStatus === 'saving'
          ? t('personality.saving', 'Saving...')
          : isSavedToDb
            ? t('personality.saved', 'Saved!')
            : authStatus === 'authenticated'
              ? t('personality.save', 'Save Result')
              : t('personality.loginToSave', 'Login to Save')}
      </button>

      <button onClick={handleShare} className={styles.shareButton}>
        <span>{'\uD83D\uDCE4'}</span> {t('personality.share', 'Share Result')}
      </button>
      <button onClick={handleDownload} className={styles.downloadButton}>
        <span>{'\uD83D\uDCE5'}</span> {t('personality.download', 'Download JSON')}
      </button>
      <Link href="/personality/quiz" className={styles.retakeButton}>
        <span>{'\uD83D\uDD04'}</span> {t('personality.retake', 'Retake Quiz')}
      </Link>
      <Link href="/personality/combined" className={styles.retakeButton}>
        <span>{'\uD83D\uDD17'}</span> {t('personality.combined', 'Combined Analysis')}
      </Link>
    </section>
  );
}
