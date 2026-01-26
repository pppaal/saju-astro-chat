import React from 'react';
import styles from './MessageBox.module.css';

interface MessageBoxProps {
  type: 'success' | 'error' | 'info';
  icon: string;
  message: string | React.ReactNode;
}

export function MessageBox({ type, icon, message }: MessageBoxProps) {
  return (
    <div className={`${styles.messageBox} ${styles[type]}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>{message}</span>
    </div>
  );
}
