import React from 'react';
import { LAYERS } from './matrixData';
import styles from './matrix.module.css';

export function MatrixLoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.particles}>
        {[...Array(30)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
          }} />
        ))}
      </div>

      <div className={styles.loadingContent}>
        <div className={styles.loadingOrbit}>
          <div className={styles.orbitCenter}>🌌</div>
          <div className={styles.orbitRing}>
            {LAYERS.slice(0, 6).map((layer, i) => (
              <span
                key={layer.layer}
                className={styles.orbitIcon}
                style={{
                  '--orbit-delay': `${i * 0.5}s`,
                  '--orbit-angle': `${i * 60}deg`,
                } as React.CSSProperties}
              >
                {layer.icon}
              </span>
            ))}
          </div>
        </div>
        <h2 className={styles.loadingText}>운명 매트릭스 분석 중...</h2>
        <div className={styles.loadingSteps}>
          <span className={styles.loadingStep}>동양 사주 데이터 처리</span>
          <span className={styles.loadingStep}>서양 점성술 매핑</span>
          <span className={styles.loadingStep}>10개 레이어 융합 계산</span>
        </div>
      </div>
    </div>
  );
}
