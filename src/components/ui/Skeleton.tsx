import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular" | "card";
  className?: string;
  count?: number;
  delay?: number;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  variant = "rectangular",
  className = "",
  count = 1,
  delay = 0,
}: SkeletonProps) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    animationDelay: delay ? `${delay}ms` : undefined,
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${styles[variant]} ${className}`}
            style={{
              ...style,
              animationDelay: `${index * 100}ms`,
            }}
            aria-busy="true"
            aria-live="polite"
          />
        ))}
      </>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={style}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

export function PostSkeleton() {
  return (
    <div className={styles.postSkeleton}>
      <div className={styles.header}>
        <Skeleton variant="circular" width={32} height={32} />
        <div style={{ flex: 1 }}>
          <Skeleton width="120px" height="16px" />
          <Skeleton width="80px" height="12px" />
        </div>
      </div>
      <Skeleton width="80%" height="24px" className={styles.title} />
      <Skeleton width="100%" height="200px" className={styles.media} />
      <Skeleton width="100%" height="60px" />
      <div className={styles.tags}>
        <Skeleton width="60px" height="24px" />
        <Skeleton width="80px" height="24px" />
        <Skeleton width="70px" height="24px" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <Skeleton width="100%" height="180px" />
      <div className={styles.cardContent}>
        <Skeleton width="60%" height="20px" />
        <Skeleton width="100%" height="16px" />
        <Skeleton width="80%" height="16px" />
      </div>
    </div>
  );
}

// Tarot Result Skeleton
export function TarotResultSkeleton() {
  return (
    <div className={styles.tarotResultSkeleton}>
      <Skeleton variant="circular" width={80} height={80} className={styles.centerIcon} />
      <Skeleton width="70%" height="28px" className={styles.title} />
      <Skeleton width="50%" height="18px" />
      <div className={styles.cardGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={styles.cardItem}>
            <Skeleton width="100%" height="180px" />
            <Skeleton width="80%" height="16px" />
          </div>
        ))}
      </div>
      <Skeleton width="100%" height="120px" className={styles.description} />
    </div>
  );
}

// Compatibility Result Skeleton
export function CompatibilityResultSkeleton() {
  return (
    <div className={styles.compatibilityResultSkeleton}>
      <div className={styles.peopleHeader}>
        <div className={styles.personSkeleton}>
          <Skeleton variant="circular" width={60} height={60} />
          <Skeleton width="100px" height="18px" />
        </div>
        <Skeleton variant="circular" width={40} height={40} className={styles.heartIcon} />
        <div className={styles.personSkeleton}>
          <Skeleton variant="circular" width={60} height={60} />
          <Skeleton width="100px" height="18px" />
        </div>
      </div>
      <Skeleton width="60%" height="32px" className={styles.scoreTitle} />
      <Skeleton variant="circular" width={120} height={120} className={styles.scoreCircle} />
      <div className={styles.analysisSection}>
        <Skeleton width="100%" height="20px" count={5} />
      </div>
    </div>
  );
}

// List Item Skeleton
export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.listItemSkeleton}>
          <Skeleton variant="circular" width={48} height={48} />
          <div className={styles.listItemContent}>
            <Skeleton width="70%" height="18px" />
            <Skeleton width="50%" height="14px" />
          </div>
        </div>
      ))}
    </>
  );
}

// Form Loading Skeleton
export function FormLoadingSkeleton() {
  return (
    <div className={styles.formLoadingSkeleton}>
      <div className={styles.formGroup}>
        <Skeleton width="120px" height="16px" />
        <Skeleton width="100%" height="48px" />
      </div>
      <div className={styles.formGroup}>
        <Skeleton width="120px" height="16px" />
        <Skeleton width="100%" height="48px" />
      </div>
      <div className={styles.formGroup}>
        <Skeleton width="120px" height="16px" />
        <Skeleton width="100%" height="48px" />
      </div>
      <Skeleton width="100%" height="56px" className={styles.submitButton} />
    </div>
  );
}
