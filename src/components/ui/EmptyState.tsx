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

// Preset empty states
export const NoResultsFound = ({ onReset }: { onReset?: () => void }) => (
  <EmptyState
    icon="🔍"
    title="No results found"
    description="We couldn't find any results matching your search"
    actionLabel={onReset ? "Clear filters" : undefined}
    onAction={onReset}
  />
);

export function NoRecentQuestions() {
  return (
  <EmptyState
    icon="💭"
    title="No recent questions yet"
    description="Start asking questions to see your history here"
    suggestions={[
      "What does my future hold?",
      "Tell me about my love life",
      "What career path suits me best?",
    ]}
  />
  );
}

export function NoSavedProfiles() {
  return (
  <EmptyState
    icon="👤"
    title="No saved profiles"
    description="Save your birth information for quick access to readings"
    actionLabel="Create your first profile"
    actionHref="/destiny-map"
  />
  );
}

export function NoCompatibilityResults() {
  return (
  <EmptyState
    icon="💔"
    title="No compatibility data"
    description="Enter two birth profiles to see compatibility analysis"
    actionLabel="Check compatibility"
    actionHref="/compatibility"
  />
  );
}

export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    icon="⚠️"
    title="Something went wrong"
    description="We encountered an error loading this content"
    actionLabel="Try again"
    onAction={onRetry}
  />
);

export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    icon="📡"
    title="Connection lost"
    description="Please check your internet connection and try again"
    actionLabel="Retry"
    onAction={onRetry}
  />
);

export default EmptyState;
