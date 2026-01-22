import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../Compatibility.module.css';

interface PersonData {
  name: string;
  date: string;
  time: string;
  cityQuery: string;
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string;
  relation?: string;
}

interface ActionButtonsProps {
  persons: PersonData[];
  resultText: string;
  t: (key: string, fallback: string) => string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = React.memo(({ persons, resultText, t }) => {
  const router = useRouter();

  return (
    <div className={styles.actionButtons}>
      {persons.length === 2 && (
        <button
          className={styles.actionButton}
          onClick={() => {
            const personsData = persons.map(p => ({
              name: p.name,
              date: p.date,
              time: p.time,
              city: p.cityQuery,
              latitude: p.latitude,
              longitude: p.longitude,
              timeZone: p.timeZone,
              relation: p.relation
            }));
            router.push(`/compatibility/insights?persons=${encodeURIComponent(JSON.stringify(personsData))}`);
          }}
        >
          <span className={styles.actionButtonIcon}>??</span>
          <div className={styles.actionButtonText}>
            <strong>{t('compatibilityPage.insights.viewDetailed', '?? ?? ??')}</strong>
            <span>{t('compatibilityPage.insights.description', '?? + ??? ?? ??')}</span>
          </div>
        </button>
      )}

      <button
        className={styles.actionButton}
        onClick={() => router.push(`/compatibility/chat?persons=${encodeURIComponent(JSON.stringify(persons.map(p => ({ name: p.name, date: p.date, time: p.time, city: p.cityQuery, relation: p.relation }))))}&result=${encodeURIComponent(resultText || '')}`)}
      >
        <span className={styles.actionButtonIcon}>??</span>
        <div className={styles.actionButtonText}>
          <strong>{t('compatibilityPage.chat.startChat', 'AI ?? ??')}</strong>
          <span>{t('compatibilityPage.chat.title', '?? ??')}</span>
        </div>
      </button>

      <button
        className={styles.actionButton}
        onClick={() => router.push('/destiny-map/counselor')}
      >
        <span className={styles.actionButtonIcon}>?????</span>
        <div className={styles.actionButtonText}>
          <strong>{t('compatibilityPage.counselor.connect', '??? ????')}</strong>
          <span>{t('compatibilityPage.counselor.description', '? ?? ?? ??')}</span>
        </div>
      </button>

      <button
        className={styles.actionButton}
        onClick={() => {
          const partnerName = persons[1]?.name || t('compatibilityPage.person', 'Person') + ' 2';
          router.push(`/tarot?context=compatibility&partner=${encodeURIComponent(partnerName)}`);
        }}
      >
        <span className={styles.actionButtonIcon}>?</span>
        <div className={styles.actionButtonText}>
          <strong>{t('compatibilityPage.tarot.start', '?? ????')}</strong>
          <span>{t('compatibilityPage.tarot.description', '???? ???? ??')}</span>
        </div>
      </button>
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';
