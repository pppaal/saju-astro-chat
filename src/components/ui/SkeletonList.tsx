import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonListProps {
  /** Number of items to display */
  rows?: number;
  /** Height of each row */
  rowHeight?: string;
  /** Gap between rows */
  gap?: string;
  /** Show avatar/icon column */
  showAvatar?: boolean;
  /** Avatar size */
  avatarSize?: string;
  /** Number of text lines per row */
  linesPerRow?: number;
  className?: string;
}

/**
 * Skeleton loader for list items
 *
 * @example
 * <SkeletonList rows={5} />
 * <SkeletonList rows={3} showAvatar linesPerRow={2} />
 */
export default function SkeletonList({
  rows = 5,
  rowHeight = 'auto',
  gap = '16px',
  showAvatar = false,
  avatarSize = '48px',
  linesPerRow = 2,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            height: rowHeight,
          }}
          role="status"
          aria-label={`Loading item ${index + 1} of ${rows}`}
        >
          {showAvatar && (
            <div
              className={styles.skeleton}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: linesPerRow }).map((_, lineIndex) => (
              <div
                key={lineIndex}
                className={styles.skeleton}
                style={{
                  width: lineIndex === linesPerRow - 1 ? '70%' : '100%',
                  height: '14px',
                  borderRadius: '4px',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Preset components

/**
 * Chat message skeleton
 */
export function SkeletonChatList({ rows = 5 }: { rows?: number }) {
  return <SkeletonList rows={rows} showAvatar avatarSize="40px" linesPerRow={2} />;
}

/**
 * Notification list skeleton
 */
export function SkeletonNotificationList({ rows = 5 }: { rows?: number }) {
  return <SkeletonList rows={rows} showAvatar avatarSize="48px" linesPerRow={2} />;
}

/**
 * Simple list skeleton (no avatars)
 */
export function SkeletonSimpleList({ rows = 5 }: { rows?: number }) {
  return <SkeletonList rows={rows} showAvatar={false} linesPerRow={1} />;
}

/**
 * Card grid skeleton
 */
export function SkeletonCardGrid({ cards = 6 }: { cards?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
      }}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className={styles.skeleton}
          style={{
            height: '200px',
            borderRadius: '12px',
          }}
          role="status"
          aria-label={`Loading card ${index + 1} of ${cards}`}
        />
      ))}
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={styles.skeleton}
              style={{
                height: '16px',
                width: colIndex === 0 ? '60%' : '80%',
                borderRadius: '4px',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
