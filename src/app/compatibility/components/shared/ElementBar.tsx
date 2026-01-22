import React from 'react';
import styles from '../../Compatibility.module.css';

interface ElementBarProps {
  label: string;
  value: number;
  maxValue: number;
}

export const ElementBar: React.FC<ElementBarProps> = React.memo(({ label, value, maxValue }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className={styles.elementBar}>
      <span className={styles.elementLabel}>{label}</span>
      <div className={styles.elementBarTrack}>
        <div className={styles.elementBarFill} style={{ width: `${percentage}%` }} />
      </div>
      <span className={styles.elementValue}>{value}</span>
    </div>
  );
});

ElementBar.displayName = 'ElementBar';
