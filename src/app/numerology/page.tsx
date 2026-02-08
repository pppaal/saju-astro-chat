//src/app/numerology/page.tsx

'use client';

import dynamic from 'next/dynamic';
import ServicePageLayout from "@/components/ui/ServicePageLayout";

// Lazy load heavy tab component with framer-motion animations
const NumerologyTabs = dynamic(
  () => import("@/components/numerology/NumerologyTabs"),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }
);
import styles from "./Numerology.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function NumerologyPage() {
  const { t } = useI18n();

  return (
    <ServicePageLayout
      icon="123"
      title={t('numerology.title', 'Numerology Analysis')}
      subtitle={t('numerology.subtitle', 'Discover your life path and potential with your birth date and name.')}
      particleColor="#f093fb"
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
            <NumerologyTabs />
          </div>
        </div>
      </main>
    </ServicePageLayout>
  );
}
