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
  suggestions?: string[];
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  suggestions,
  className = '',
}) => {
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

      {(actionLabel && (actionHref || onAction)) && (
        <div className={styles.actionContainer}>
          {actionHref ? (
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
export const NoResultsFound: React.FC<{ onReset?: () => void }> = ({ onReset }) => (
  <EmptyState
    icon="🔍"
    title="No results found"
    description="We couldn't find any results matching your search"
    actionLabel={onReset ? "Clear filters" : undefined}
    onAction={onReset}
  />
);

export const NoRecentQuestions: React.FC = () => (
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

export const NoSavedProfiles: React.FC = () => (
  <EmptyState
    icon="👤"
    title="No saved profiles"
    description="Save your birth information for quick access to readings"
    actionLabel="Create your first profile"
    actionHref="/destiny-map"
  />
);

export const NoCompatibilityResults: React.FC = () => (
  <EmptyState
    icon="💔"
    title="No compatibility data"
    description="Enter two birth profiles to see compatibility analysis"
    actionLabel="Check compatibility"
    actionHref="/compatibility"
  />
);

export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="⚠️"
    title="Something went wrong"
    description="We encountered an error loading this content"
    actionLabel="Try again"
    onAction={onRetry}
  />
);

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="📡"
    title="Connection lost"
    description="Please check your internet connection and try again"
    actionLabel="Retry"
    onAction={onRetry}
  />
);

export default EmptyState;
