/**
 * Service Grid Component
 *
 * Displays grid of available services with record counts
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { SERVICE_CONFIG } from '../lib';
import styles from '../history.module.css';

export interface ServiceGridProps {
  services: string[];
  serviceCounts: Record<string, number>;
  onSelectService: (service: string) => void;
  translate: (key: string) => string;
}

export function ServiceGrid({ services, serviceCounts, onSelectService, translate }: ServiceGridProps) {
  const router = useRouter();

  if (services.length === 0) {
    return (
      <EmptyState
        icon="📜"
        title="아직 기록이 없습니다"
        description="서비스를 이용하여 나만의 운명 기록을 쌓아보세요"
        suggestions={[
          '🗺️ Destiny Map으로 운명 지도 확인하기',
          '☯️ 주역으로 오늘의 운세 보기',
          '🃏 타로 카드로 미래 예측하기',
        ]}
        actionButton={{
          text: '서비스 둘러보기',
          onClick: () => router.push('/'),
        }}
      />
    );
  }

  return (
    <div className={styles.serviceGrid}>
      {services.map((service, index) => {
        const config = SERVICE_CONFIG[service];
        const icon = config?.icon || '📖';
        const color = config?.color || '#8b5cf6';

        // Get title with fallback
        const titleKey = config?.titleKey;
        let titleText: string;
        if (titleKey) {
          titleText = translate(titleKey);
        } else {
          // Convert camelCase or kebab-case to Title Case
          titleText = service
            .replace(/([A-Z])/g, ' $1')
            .split(/[-\s]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();
        }

        // Get desc with fallback
        const descKey = config?.descKey;
        const descText = descKey ? translate(descKey) : translate('history.services.default.desc');

        return (
          <button
            key={service}
            className={styles.serviceCard}
            onClick={() => onSelectService(service)}
            style={
              {
                animationDelay: `${index * 0.05}s`,
                '--service-color': color,
              } as React.CSSProperties
            }
          >
            <div className={styles.serviceIcon}>{icon}</div>
            <div className={styles.serviceInfo}>
              <div className={styles.serviceTitle}>{titleText}</div>
              <div className={styles.serviceDesc}>{descText}</div>
            </div>
            <div className={styles.serviceCount}>{serviceCounts[service] || 0}</div>
          </button>
        );
      })}
    </div>
  );
}
