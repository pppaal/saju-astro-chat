//src/app/saju/page.tsx

'use client';

import SajuAnalyzer from "@/components/saju/SajuAnalyzer";
import ServicePageLayout from "@/components/ui/ServicePageLayout";
import styles from "./saju.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function SajuPage() {
  const { t } = useI18n();

  return (
    <ServicePageLayout
      icon="命"
      title={t('landing.sajuTitle', '사주 분석')}
      subtitle={t('landing.sajuDesc', '생년월일시를 입력하여 사주팔자를 분석합니다.')}
      particleColor="#8aa4ff"
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
            <SajuAnalyzer />
          </div>
        </div>
      </main>
    </ServicePageLayout>
  );
}
