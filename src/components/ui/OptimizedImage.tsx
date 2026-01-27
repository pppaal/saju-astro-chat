/**
 * Optimized Image Component
 *
 * Wrapper around Next.js Image with performance optimizations:
 * - Lazy loading by default
 * - Blur placeholder
 * - Priority loading for above-the-fold images
 * - Responsive sizes
 * - AVIF/WebP format support
 */

'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  /** Show blur placeholder while loading */
  blurPlaceholder?: boolean;
  /** Custom placeholder image */
  placeholderSrc?: string;
  /** Aspect ratio (e.g., "16/9", "4/3") */
  aspectRatio?: string;
  /** Wrapper className */
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  blurPlaceholder = true,
  placeholderSrc,
  aspectRatio,
  containerClassName = '',
  priority = false,
  loading,
  className = '',
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Determine placeholder
  const placeholder = blurPlaceholder && !priority ? 'blur' : 'empty';

  // Generate blur data URL
  const blurDataURL = placeholderSrc ||
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48L3N2Zz4=';

  // Error fallback
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${containerClassName}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? blurDataURL : undefined}
        priority={priority}
        loading={loading || (priority ? 'eager' : 'lazy')}
        onLoad={handleLoad}
        onError={handleError}
        quality={85}
        {...props}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Responsive Image with multiple sizes
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  /** Sizes for responsive images */
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
}

export function ResponsiveImage({
  src,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  ...props
}: ResponsiveImageProps) {
  // Use picture element for art direction
  if (mobileSrc || tabletSrc || desktopSrc) {
    return (
      <picture>
        {desktopSrc && (
          <source media="(min-width: 1024px)" srcSet={desktopSrc as string} />
        )}
        {tabletSrc && (
          <source media="(min-width: 768px)" srcSet={tabletSrc as string} />
        )}
        {mobileSrc && (
          <source media="(max-width: 767px)" srcSet={mobileSrc as string} />
        )}
        <OptimizedImage src={src} {...props} />
      </picture>
    );
  }

  return <OptimizedImage src={src} {...props} />;
}

/**
 * Avatar Image with fallback
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'alt'> {
  name: string;
  size?: number;
}

export function AvatarImage({
  src,
  name,
  size = 40,
  ...props
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    // Generate initials
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className="flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={`${name}'s avatar`}
      width={size}
      height={size}
      className="rounded-full object-cover"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

export default OptimizedImage;
