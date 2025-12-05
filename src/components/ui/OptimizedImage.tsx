"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./OptimizedImage.module.css";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Optimized Image Component with loading states and blur placeholder
 * Uses Next.js Image component for automatic optimization
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
  sizes,
  quality = 85,
  fill = false,
  objectFit = "cover",
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${styles.placeholder} ${className}`}>
        <div className={styles.errorIcon}>🖼️</div>
        <p className={styles.errorText}>Image failed to load</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes || "100vw"}
          quality={quality}
          priority={priority}
          className={`${styles.image} ${isLoading ? styles.loading : styles.loaded}`}
          style={{ objectFit }}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 800}
          height={height || 600}
          sizes={sizes}
          quality={quality}
          priority={priority}
          className={`${styles.image} ${isLoading ? styles.loading : styles.loaded}`}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      )}
      {isLoading && (
        <div className={styles.skeleton}>
          <div className={styles.shimmer} />
        </div>
      )}
    </div>
  );
}
