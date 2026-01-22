'use client';

import React, { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Confirm callback */
  onConfirm: () => void;
  /** Cancel callback */
  onCancel: () => void;
  /** Type of action (affects button styling) */
  type?: 'danger' | 'warning' | 'info';
  /** Icon to display */
  icon?: string;
}

const TYPE_CONFIG = {
  danger: {
    icon: '⚠️',
    color: '#ef4444',
  },
  warning: {
    icon: '⚡',
    color: '#f59e0b',
  },
  info: {
    icon: 'ℹ️',
    color: '#3b82f6',
  },
} as const;

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info',
  icon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const config = TYPE_CONFIG[type];
  const displayIcon = icon || config.icon;

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button when dialog opens
    cancelButtonRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTabKey);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.iconWrapper}>
          <span className={styles.icon} role="img" aria-label={type}>
            {displayIcon}
          </span>
        </div>

        <h2 id="dialog-title" className={styles.title}>
          {title}
        </h2>

        <p id="dialog-message" className={styles.message}>
          {message}
        </p>

        <div className={styles.buttons}>
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className={`${styles.button} ${styles.cancelButton}`}
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} ${styles.confirmButton} ${styles[type]}`}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
