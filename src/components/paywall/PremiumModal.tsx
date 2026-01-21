"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./PremiumModal.module.css";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan?: "starter" | "pro" | "premium";
  creditsNeeded?: number;
}

export default function PremiumModal({
  isOpen,
  onClose,
  feature,
  requiredPlan = "starter",
  creditsNeeded,
}: PremiumModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const focusTrapRef = useFocusTrap(isOpen);

  // Keyboard handling and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    setIsUpgrading(true);
    router.push("/pricing");
  };

  const handleBuyCredits = () => {
    setIsUpgrading(true);
    router.push("/pricing#credits");
  };

  const plans = {
    starter: {
      name: t("pricing.plans.starter"),
      price: "₩4,900",
      priceEn: "$4.99",
      features: [
        t("pricing.features.aiChat25"),
        t("pricing.features.calendar3months"),
        t("pricing.features.adFree"),
      ],
    },
    pro: {
      name: t("pricing.plans.pro"),
      price: "₩9,900",
      priceEn: "$9.99",
      features: [
        t("pricing.features.aiChat80"),
        t("pricing.features.calendar1year"),
        t("pricing.features.adFree"),
        t("pricing.features.pdfReport"),
      ],
    },
    premium: {
      name: t("pricing.plans.premium"),
      price: "₩19,900",
      priceEn: "$19.99",
      features: [
        t("pricing.features.aiChat150"),
        t("pricing.features.calendar2years"),
        t("pricing.features.prioritySupport"),
        t("pricing.features.pdfReport"),
      ],
    },
  };

  const plan = plans[requiredPlan];

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
      aria-describedby="premium-modal-description"
    >
      <div ref={focusTrapRef} className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t("common.close") || "Close"}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={styles.header}>
          <div className={styles.icon} aria-hidden="true">✨</div>
          <h2 id="premium-modal-title" className={styles.title}>{t("paywall.unlockFeature")}</h2>
          <p id="premium-modal-description" className={styles.subtitle}>
            {creditsNeeded
              ? t("paywall.needsCredits").replace("{count}", String(creditsNeeded))
              : t("paywall.premiumRequired").replace("{feature}", feature)}
          </p>
        </div>

        {creditsNeeded ? (
          // Show credit purchase option
          <div className={styles.content}>
            <div className={styles.creditSection}>
              <div className={styles.creditIcon}>💎</div>
              <h3>{t("paywall.outOfCredits")}</h3>
              <p>{t("paywall.creditDescription")}</p>

              <div className={styles.options}>
                <div className={styles.option}>
                  <div className={styles.optionHeader}>
                    <span className={styles.optionIcon}>🔄</span>
                    <span className={styles.optionTitle}>{t("paywall.subscribe")}</span>
                  </div>
                  <p className={styles.optionDesc}>{t("paywall.monthlyCredits")}</p>
                  <button className={styles.primaryButton} onClick={handleUpgrade}>
                    {t("paywall.viewPlans")}
                  </button>
                </div>

                <div className={styles.option}>
                  <div className={styles.optionHeader}>
                    <span className={styles.optionIcon}>⚡</span>
                    <span className={styles.optionTitle}>{t("paywall.buyCredits")}</span>
                  </div>
                  <p className={styles.optionDesc}>{t("paywall.oneTimePurchase")}</p>
                  <button className={styles.secondaryButton} onClick={handleBuyCredits}>
                    {t("paywall.buyCreditPacks")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Show plan upgrade
          <div className={styles.content}>
            <div className={styles.planCard}>
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>/ {t("pricing.perMonth")}</span>
                </div>
              </div>

              <ul className={styles.featureList}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} className={styles.featureItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={styles.upgradeButton}
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <>
                    <span className={styles.spinner} />
                    {t("paywall.upgrading")}
                  </>
                ) : (
                  <>
                    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 7L18 12M18 12L13 17M18 12H6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t("paywall.upgrade")}
                  </>
                )}
              </button>
            </div>

            <div className={styles.benefits}>
              <h4>{t("paywall.whyUpgrade")}</h4>
              <div className={styles.benefitsList}>
                <div className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>🚀</span>
                  <span>{t("paywall.benefit1")}</span>
                </div>
                <div className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>💫</span>
                  <span>{t("paywall.benefit2")}</span>
                </div>
                <div className={styles.benefitItem}>
                  <span className={styles.benefitIcon}>🎯</span>
                  <span>{t("paywall.benefit3")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.guarantee}>
            <span className={styles.guaranteeIcon}>🛡️</span>
            {t("paywall.guarantee")}
          </p>
        </div>
      </div>
    </div>
  );
}
