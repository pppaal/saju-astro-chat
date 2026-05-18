import React from 'react';
import Link from 'next/link';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionButton?: { text: string; onClick: () => void };
  suggestions?: string[];
  className?: string;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionButton,
  suggestions,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`${styles.emptyState} ${className}`}>
      <div className={styles.iconContainer}>
        {typeof icon === 'string' ? (
          <span className={styles.icon}>{icon}</span>
        ) : (
          icon
        )}
      </div>

      <h3 className={styles.title}>{title}</h3>

      {description && <p className={styles.description}>{description}</p>}

      {suggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <p className={styles.suggestionsTitle}>Try these:</p>
          <ul className={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <li key={index} className={styles.suggestionItem}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {((actionLabel && (actionHref || onAction)) || actionButton) && (
        <div className={styles.actionContainer}>
          {actionButton ? (
            <button onClick={actionButton.onClick} className={styles.actionButton}>
              {actionButton.text}
            </button>
          ) : actionHref ? (
            <Link href={actionHref} className={styles.actionButton}>
              {actionLabel}
            </Link>
          ) : (
            <button onClick={onAction} className={styles.actionButton}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
