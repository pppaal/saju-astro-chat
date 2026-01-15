'use client';

import { useState } from 'react';
import styles from './ShareButton.module.css';
import { logger } from '@/lib/logger';

type ShareButtonProps = {
  generateCard: () => Promise<Blob | null>;
  filename: string;
  shareTitle: string;
  shareText: string;
  label?: string;
  className?: string;
};

export default function ShareButton({
  generateCard,
  filename,
  shareTitle,
  shareText,
  label = 'Share',
  className,
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    try {
      const imageBlob = await generateCard();

      if (imageBlob && navigator.share && navigator.canShare) {
        const file = new File([imageBlob], filename, { type: 'image/png' });
        const shareData = { title: shareTitle, text: shareText, files: [file] };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: download image
      if (imageBlob) {
        const url = URL.createObjectURL(imageBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // Copy text to clipboard
        await navigator.clipboard.writeText(shareText);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (err) {
      logger.error('[ShareButton] Share failed:', err);
      // Last resort: copy text
      try {
        await navigator.clipboard.writeText(shareText);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch {}
    }
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isLoading}
        className={`${styles.shareButton} ${className || ''}`}
      >
        {isLoading ? (
          <span className={styles.spinner} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        )}
        <span>{label}</span>
      </button>
      {showToast && (
        <div className={styles.toast}>
          Image saved! Link copied to clipboard.
        </div>
      )}
    </>
  );
}
