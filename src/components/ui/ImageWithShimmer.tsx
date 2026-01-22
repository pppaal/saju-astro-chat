'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import styles from './ImageWithShimmer.module.css';

export interface ImageWithShimmerProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  /** Custom fallback component when image fails to load */
  fallback?: React.ReactNode;
  /** Callback when image loads successfully */
  onLoadComplete?: () => void;
  /** Callback when image fails to load */
  onLoadError?: () => void;
  /** Shimmer effect color (default: rgba(255, 255, 255, 0.1)) */
  shimmerColor?: string;
}

/**
 * Image component with loading shimmer effect and error fallback
 *
 * @example
 * ```tsx
 * <ImageWithShimmer
 *   src="/path/to/image.jpg"
 *   alt="Description"
 *   width={400}
 *   height={300}
 *   fallback={<div>Failed to load</div>}
 * />
 * ```
 */
export function ImageWithShimmer({
  fallback,
  onLoadComplete,
  onLoadError,
  shimmerColor,
  className = '',
  ...imageProps
}: ImageWithShimmerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoadComplete?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onLoadError?.();
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {isLoading && (
        <div
          className={styles.shimmer}
          style={shimmerColor ? { '--shimmer-color': shimmerColor } as React.CSSProperties : undefined}
        />
      )}
      <Image
        {...imageProps}
        className={`${styles.image} ${!isLoading ? styles.loaded : ''} ${imageProps.className || ''}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default ImageWithShimmer;
