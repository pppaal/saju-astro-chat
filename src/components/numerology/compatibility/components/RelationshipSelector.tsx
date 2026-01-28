"use client";

import type { RelationshipType } from '../types';
import styles from '../../CompatibilityAnalyzer.module.css';

interface RelationshipSelectorProps {
  value: RelationshipType;
  onChange: (value: RelationshipType) => void;
  options: { value: RelationshipType; label: string }[];
  label: string;
}

export default function RelationshipSelector({
  value,
  onChange,
  options,
  label,
}: RelationshipSelectorProps) {
  return (
    <div className={styles.relationshipSection}>
      <label className={styles.label}>{label}</label>
      <div className={styles.relationshipButtons}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.relationBtn} ${value === option.value ? styles.active : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
