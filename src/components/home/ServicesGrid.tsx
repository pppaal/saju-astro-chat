'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { SERVICE_LINKS, type ServiceKey } from '@/data/home';
import Card from '@/components/ui/Card';
import Grid from '@/components/ui/Grid';
import styles from '@/app/(main)/main-page.module.css';

interface ServicesGridProps {
  eyebrow: string;
  title: string;
  description: string;
  translate: (key: string, fallback: string) => string;
}

/**
 * Services grid section showing all available fortune-telling services
 * Memoized to prevent unnecessary re-renders
 */
export const ServicesGrid = memo(function ServicesGrid({
  eyebrow,
  title,
  description,
  translate,
}: ServicesGridProps) {
  return (
    <section className={styles.services}>
      <div className={styles.serviceHeader}>
        <div>
          <p className={styles.serviceEyebrow}>{eyebrow}</p>
          <h2 className={styles.serviceTitle}>{title}</h2>
          <p className={styles.serviceDesc}>{description}</p>
        </div>
      </div>

      <Grid cols={3} gap="1.5rem" className={styles.serviceGrid}>
        {Object.entries(SERVICE_LINKS).map(([key, { href, labelKey }]) => {
          const serviceKey = key as ServiceKey;
          return (
            <Link
              key={serviceKey}
              href={href}
              className={styles.serviceCardLink}
              prefetch={false}
            >
              <Card className={styles.serviceCard} hover>
                <div className={styles.serviceIconWrapper}>
                  <span className={styles.serviceIcon}>
                    {getServiceIcon(serviceKey)}
                  </span>
                </div>
                <h3 className={styles.serviceCardTitle}>
                  {translate(labelKey, key)}
                </h3>
                <p className={styles.serviceCardDesc}>
                  {translate(`${labelKey}Desc`, getServiceFallbackDesc(serviceKey))}
                </p>
              </Card>
            </Link>
          );
        })}
      </Grid>
    </section>
  );
});

// Helper function to get service icon
function getServiceIcon(key: ServiceKey): string {
  const icons: Record<ServiceKey, string> = {
    destinyMap: '🗺️',
    saju: '☯️',
    astrology: '✨',
    tarot: '🔮',
    iching: '📜',
    dream: '🌙',
    numerology: '🔢',
    compatibility: '💕',
    calendar: '📅',
    personality: '🌈',
    icp: '🎭',
    pastLife: '🔄',
  };
  return icons[key] || '✨';
}

// Helper function to get fallback descriptions
function getServiceFallbackDesc(key: ServiceKey): string {
  const descriptions: Record<ServiceKey, string> = {
    destinyMap: 'Visualize your life path',
    saju: 'Korean Four Pillars reading',
    astrology: 'Western astrological insights',
    tarot: 'Divine card reading',
    iching: 'Ancient Chinese oracle',
    dream: 'Dream interpretation',
    numerology: 'Numbers reveal destiny',
    compatibility: 'Relationship analysis',
    calendar: 'Fortune calendar',
    personality: 'Personality insights',
    icp: 'Relationship style',
    pastLife: 'Past life regression',
  };
  return descriptions[key] || 'Discover your destiny';
}

export default ServicesGrid;
