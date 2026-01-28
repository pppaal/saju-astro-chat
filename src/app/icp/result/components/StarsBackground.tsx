interface StarsBackgroundProps {
  styles: Record<string, string>;
  count?: number;
}

export default function StarsBackground({ styles, count = 80 }: StarsBackgroundProps) {
  return (
    <>
      <div className={styles.bgGradient} />
      <div className={styles.stars}>
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.05) % 3}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
            }}
          />
        ))}
      </div>
    </>
  );
}
