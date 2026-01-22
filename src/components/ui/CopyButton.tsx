'use client';

import React, { useState } from 'react';
import styles from './CopyButton.module.css';
import { logger } from '@/lib/logger';

export interface CopyButtonProps {
  /** Text content to copy */
  text: string;
  /** Button label (default: "Copy") */
  label?: string;
  /** Success message (default: "Copied!") */
  successMessage?: string;
  /** Show icon only (no text label) */
  iconOnly?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when copy succeeds */
  onCopySuccess?: () => void;
  /** Callback when copy fails */
  onCopyError?: (error: Error) => void;
}

/**
 * Copy-to-clipboard button with visual feedback
 *
 * @example
 * ```tsx
 * <CopyButton
 *   text={resultText}
 *   label="Copy Result"
 *   successMessage="Copied to clipboard!"
 * />
 * ```
 */
export function CopyButton({
  text,
  label = 'Copy',
  successMessage = 'Copied!',
  iconOnly = false,
  className = '',
  onCopySuccess,
  onCopyError,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        textArea.remove();

        if (!successful) {
          throw new Error('Copy command failed');
        }
      }

      setCopied(true);
      onCopySuccess?.();

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      logger.error('Failed to copy to clipboard', error as Error);
      onCopyError?.(error as Error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${styles.copyButton} ${copied ? styles.copied : ''} ${className}`}
      aria-label={iconOnly ? label : undefined}
      disabled={copied}
    >
      <span className={styles.icon} aria-hidden="true">
        {copied ? '✓' : '📋'}
      </span>
      {!iconOnly && (
        <span className={styles.label}>
          {copied ? successMessage : label}
        </span>
      )}
    </button>
  );
}

export default CopyButton;
