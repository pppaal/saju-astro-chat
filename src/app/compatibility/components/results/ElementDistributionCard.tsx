import React from 'react';
import { ElementBar } from '../shared';
import type { GroupAnalysisData } from '../../lib';
import styles from '../../Compatibility.module.css';

interface ElementDistributionCardProps {
  elementDistribution: NonNullable<GroupAnalysisData['element_distribution']>;
  personCount: number;
  t: (key: string, fallback: string) => string;
}

export const ElementDistributionCard: React.FC<ElementDistributionCardProps> = React.memo(({
  elementDistribution,
  personCount,
  t,
}) => {
  return (
    <div className={styles.resultCard}>
      <div className={styles.resultCardGlow} />
      <div className={styles.resultCardHeader}>
        <span className={styles.resultCardIcon}>??</span>
        <h3 className={styles.resultCardTitle}>
          {t('compatibilityPage.groupElementDistribution', '?? ?? ??')}
        </h3>
      </div>
      <div className={styles.resultCardContent}>
        <div className={styles.elementDistribution}>
          <div className={styles.elementColumn}>
            <h4>?? ?? (??)</h4>
            <div className={styles.elementBars}>
              {Object.entries(elementDistribution.oheng).map(([key, val]) => (
                <ElementBar key={key} label={key} value={val} maxValue={personCount} />
              ))}
            </div>
            {elementDistribution.dominant_oheng && (
              <p className={styles.elementNote}>
                ?? ???: <strong>{elementDistribution.dominant_oheng}</strong>
              </p>
            )}
            {elementDistribution.lacking_oheng && (
              <p className={styles.elementNote}>
                ?? ??: <strong>{elementDistribution.lacking_oheng}</strong>
              </p>
            )}
          </div>
          <div className={styles.elementColumn}>
            <h4>? ?? ??</h4>
            <div className={styles.elementBars}>
              {Object.entries(elementDistribution.astro).map(([key, val]) => {
                const label = key === 'fire' ? '?? Fire' : key === 'earth' ? '?? Earth' : key === 'air' ? '?? Air' : '?? Water';
                return <ElementBar key={key} label={label} value={val} maxValue={personCount} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ElementDistributionCard.displayName = 'ElementDistributionCard';
