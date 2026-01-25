"use client";

import React from 'react';
import IChingTabs from '@/components/iching/IChingTabs';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './iching.module.css';

export default function IchingPage() {
  const { translate } = useI18n();

  return (
    <ServicePageLayout
      icon="☯"
      title={translate('iching.title', 'Wisdom of the I Ching')}
      subtitle={translate('iching.subtitle', 'Receive ancient wisdom through the oracle of changes')}
      particleColor="#a78bfa"
    >
      <div className={styles.container}>
        {/* Hexagram Visual */}
        <div className={styles.hexagramContainer}>
          <div className={styles.orbRing}></div>
          <div className={styles.orbRing2}></div>
          <div className={styles.hexagramSymbol}>
            <div className={styles.hexLine}></div>
            <div className={`${styles.hexLine} ${styles.broken}`}></div>
            <div className={styles.hexLine}></div>
            <div className={styles.hexLine}></div>
            <div className={`${styles.hexLine} ${styles.broken}`}></div>
            <div className={styles.hexLine}></div>
          </div>
        </div>

        {/* Main Card with Tabs */}
        <div className={styles.mainCard}>
          <IChingTabs />
        </div>
      </div>
    </ServicePageLayout>
  );
}
