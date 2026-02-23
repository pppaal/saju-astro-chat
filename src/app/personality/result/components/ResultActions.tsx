import Link from 'next/link'
import { CheckCircle2, Download, Link2, Lock, RefreshCw, Save, Send, Timer } from 'lucide-react'

interface ResultActionsProps {
  styles: Record<string, string>
  authStatus: string
  saveStatus: string
  isSavedToDb: boolean
  handleSaveResult: () => void
  handleShare: () => void
  handleDownload: () => void
  t: (path: string, fallback?: string) => string
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
        {saveStatus === 'saving' ? (
          <Timer size={16} aria-hidden="true" />
        ) : isSavedToDb ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : authStatus === 'authenticated' ? (
          <Save size={16} aria-hidden="true" />
        ) : (
          <Lock size={16} aria-hidden="true" />
        )}
        {saveStatus === 'saving'
          ? t('personality.saving', 'Saving...')
          : isSavedToDb
            ? t('personality.saved', 'Saved!')
            : authStatus === 'authenticated'
              ? t('personality.save', 'Save Result')
              : t('personality.loginToSave', 'Login to Save')}
      </button>

      <button onClick={handleShare} className={styles.shareButton}>
        <Send size={16} aria-hidden="true" /> {t('personality.share', 'Share Result')}
      </button>
      <button onClick={handleDownload} className={styles.downloadButton}>
        <Download size={16} aria-hidden="true" /> {t('personality.download', 'Download JSON')}
      </button>
      <Link href="/personality/quiz" className={styles.retakeButton}>
        <RefreshCw size={16} aria-hidden="true" /> {t('personality.retake', 'Retake Quiz')}
      </Link>
      <Link href="/personality/combined" className={styles.retakeButton}>
        <Link2 size={16} aria-hidden="true" /> {t('personality.combined', 'Combined Analysis')}
      </Link>
    </section>
  )
}
