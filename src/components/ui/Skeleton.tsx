import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular";
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  variant = "rectangular",
  className = "",
}: SkeletonProps) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

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
