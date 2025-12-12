"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "../policy/policy.module.css";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

function FAQItem({ qKey }: { qKey: string }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={styles.section}
      style={{ cursor: "pointer" }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <h2 className={styles.sectionTitle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {t(`faq.${qKey}`, qKey)}
        <span style={{ fontSize: "1.2rem", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
          ▼
        </span>
      </h2>
      {isOpen && (
        <p className={styles.sectionBody} style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
          {t(`faq.a${qKey.slice(1)}`, "")}
        </p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t("faq.title", "Frequently Asked Questions")}</h1>
            <p className={styles.effectiveDate}>
              {t("faq.subtitle", "Find answers to common questions below")}
            </p>
          </div>
          <div className={styles.content}>
            {FAQ_KEYS.map((qKey) => (
              <FAQItem key={qKey} qKey={qKey} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t("faq.footer", "Still have questions? Contact us through the Contact page.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
