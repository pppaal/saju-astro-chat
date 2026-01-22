import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;
  /** Width of each line (can be array for varied widths) */
  width?: string | string[];
  /** Height of each line */
  height?: string;
  /** Gap between lines */
  gap?: string;
  className?: string;
}

/**
 * Skeleton loader for text content
 *
 * @example
 * <SkeletonText lines={3} />
 * <SkeletonText lines={2} width={['100%', '60%']} />
 */
export default function SkeletonText({
  lines = 3,
  width = '100%',
  height = '16px',
  gap = '12px',
  className = '',
}: SkeletonTextProps) {
  const widthArray = Array.isArray(width) ? width : Array(lines).fill(width);

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={styles.skeleton}
          style={{
            width: widthArray[index] || widthArray[widthArray.length - 1],
            height,
            borderRadius: '4px',
          }}
          role="status"
          aria-label="Loading text"
        />
      ))}
    </div>
  );
}

// Preset components
export function SkeletonParagraph() {
  return <SkeletonText lines={4} width={['100%', '100%', '90%', '60%']} />;
}

export function SkeletonHeading() {
  return <SkeletonText lines={1} width="40%" height="28px" />;
}

export function SkeletonTitle() {
  return <SkeletonText lines={1} width="60%" height="32px" />;
}
