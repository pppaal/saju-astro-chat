//src/app/past-life/page.tsx

'use client';

import PastLifeTabs from "../../components/past-life/PastLifeTabs";
import ServicePageLayout from "@/components/ui/ServicePageLayout";
import styles from "./PastLife.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function PastLifePage() {
  const { t } = useI18n();

  return (
    <ServicePageLayout
      icon="🔄"
      title={t('pastLife.title', 'Past Life Reading')}
      subtitle={t('pastLife.subtitle', 'Discover your soul\'s journey through past lives and karmic patterns.')}
      particleColor="#a78bfa"
    >
      <main className={styles.page}>
        {/* Background Stars */}
        <div className={styles.stars}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${((i * 37 + 13) % 100)}%`,
                top: `${((i * 53 + 7) % 100)}%`,
                animationDelay: `${(i % 4) + (i * 0.13)}s`,
                animationDuration: `${3 + (i % 3)}s`,
              }}
            />
          ))}
        </div>

        <div className={`${styles.card} ${styles.fadeIn}`}>
          <div className={styles.form}>
            <PastLifeTabs />
          </div>
        </div>
      </main>
    </ServicePageLayout>
  );
}
