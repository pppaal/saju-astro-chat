export interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
}

export const ConfettiAnimation = ({ particles, styles }: {
  particles: ConfettiParticle[];
  styles: Record<string, string>;
}) => (
  <div className={styles.confettiContainer}>
    {particles.map((particle) => (
      <div
        key={particle.id}
        className={styles.confetti}
        style={{
          left: `${particle.x}%`,
          backgroundColor: particle.color,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          animationDuration: `${3 + Math.random() * 2}s`,
          animationDelay: `${particle.id * 0.02}s`,
        }}
      />
    ))}
  </div>
);
