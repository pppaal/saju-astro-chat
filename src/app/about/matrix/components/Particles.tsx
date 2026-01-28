interface ParticlesProps {
  styles: Record<string, string>;
  count: number;
}

export function Particles({ styles, count }: ParticlesProps) {
  return (
    <div className={styles.particles}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={styles.particle}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
}
