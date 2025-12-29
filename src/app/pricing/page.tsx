"use client";

import Link from "next/link";
import { useCallback, useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./pricing.module.css";

interface PlanFeature {
  textKey: string;
  included: boolean;
}

interface Plan {
  id: string;
  nameKey: string;
  price: number;
  priceEn: number;
  readings: number;
  features: PlanFeature[];
  popular?: boolean;
  gradient: string;
}

interface CreditPack {
  id: string;
  nameKey: string;
  price: number;
  priceEn: number;
  readings: number;
  perReading: string;
  perReadingEn: string;
  gradient: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    nameKey: "free",
    price: 0,
    priceEn: 0,
    readings: 7,
    features: [
      { textKey: "aiChat7", included: true },
      { textKey: "calendarThisMonth", included: true },
      { textKey: "personalityFree", included: true },
      { textKey: "calendar3months", included: false },
      { textKey: "adFree", included: false },
    ],
    gradient: "linear-gradient(135deg, #3a3f5c 0%, #2a2f4c 100%)",
  },
  {
    id: "starter",
    nameKey: "starter",
    price: 4900,
    priceEn: 4.99,
    readings: 25,
    features: [
      { textKey: "aiChat25", included: true },
      { textKey: "calendar3months", included: true },
      { textKey: "personalityFree", included: true },
      { textKey: "adFree", included: true },
      { textKey: "calendar1year", included: false },
    ],
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "pro",
    nameKey: "pro",
    price: 9900,
    priceEn: 9.99,
    readings: 80,
    popular: true,
    features: [
      { textKey: "aiChat80", included: true },
      { textKey: "calendar1year", included: true },
      { textKey: "personalityFree", included: true },
      { textKey: "adFree", included: true },
      { textKey: "calendar2years", included: false },
    ],
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "premium",
    nameKey: "premium",
    price: 19900,
    priceEn: 19.99,
    readings: 150,
    features: [
      { textKey: "aiChat150", included: true },
      { textKey: "calendar2years", included: true },
      { textKey: "personalityFree", included: true },
      { textKey: "adFree", included: true },
      { textKey: "prioritySupport", included: true },
    ],
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
];

const creditPacks: CreditPack[] = [
  {
    id: "mini",
    nameKey: "mini",
    price: 1900,
    priceEn: 1.99,
    readings: 5,
    perReading: "₩380",
    perReadingEn: "$0.40",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    id: "standard",
    nameKey: "standard",
    price: 4900,
    priceEn: 4.99,
    readings: 15,
    perReading: "₩327",
    perReadingEn: "$0.33",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  },
  {
    id: "plus",
    nameKey: "plus",
    price: 9900,
    priceEn: 9.99,
    readings: 40,
    perReading: "₩248",
    perReadingEn: "$0.25",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    popular: true,
  },
  {
    id: "mega",
    nameKey: "mega",
    price: 19900,
    priceEn: 19.99,
    readings: 100,
    perReading: "₩199",
    perReadingEn: "$0.20",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "ultimate",
    nameKey: "ultimate",
    price: 39900,
    priceEn: 39.99,
    readings: 250,
    perReading: "₩160",
    perReadingEn: "$0.16",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
];

const faqKeys = ["q1", "q2", "q3", "q4", "q5"];

export default function PricingPage() {
  const { locale, t } = useI18n();
  const isKo = locale === "ko";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 결제 후 돌아갈 URL 저장 (referrer 또는 이전에 저장된 값 유지)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 저장된 returnUrl이 있으면 유지
    const existingReturnUrl = localStorage.getItem("checkout_return_url");
    if (existingReturnUrl) return;

    // referrer에서 같은 도메인의 경로 추출
    try {
      const referrer = document.referrer;
      if (referrer) {
        const referrerUrl = new URL(referrer);
        const currentHost = window.location.host;

        // 같은 도메인에서 온 경우에만 저장
        if (referrerUrl.host === currentHost) {
          const path = referrerUrl.pathname;
          // pricing, success, auth 페이지 제외
          if (path !== "/pricing" && path !== "/success" && !path.startsWith("/auth")) {
            localStorage.setItem("checkout_return_url", path);
          }
        }
      }
    } catch {
      // URL 파싱 실패 시 무시
    }
  }, []);

  const pt = useCallback((key: string) => t(`pricing.${key}`), [t]);

  const getFeatureText = useCallback((textKey: string) => {
    return pt(`features.${textKey}`);
  }, [pt]);

  const formatPrice = (price: number, priceEn: number) => {
    if (price === 0) return pt("free");
    if (isKo) {
      if (billingCycle === "yearly") {
        const yearly = Math.floor(price * 10);
        return `₩${yearly.toLocaleString()}`;
      }
      return `₩${price.toLocaleString()}`;
    }
    if (billingCycle === "yearly") {
      const yearly = Math.floor(priceEn * 10 * 100) / 100;
      return `$${yearly.toFixed(2)}`;
    }
    return `$${priceEn.toFixed(2)}`;
  };

  const getPeriod = () => {
    if (billingCycle === "yearly") return pt("perYear");
    return pt("perMonth");
  };

  async function handleSelectPlan(planId: string) {
    if (planId === "free") {
      window.location.href = "/destiny-map";
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billingCycle: billingCycle === "yearly" ? "yearly" : "monthly"
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "An error occurred");
      }
    } catch {
      alert(pt("paymentError"));
    }
  }

  async function handleBuyCredit(packId: string) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditPack: packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "An error occurred");
      }
    } catch {
      alert(pt("paymentError"));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <div className={styles.stars} aria-hidden />

        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{pt("eyebrow")}</p>
          <h1 className={styles.heroTitle}>{pt("heroTitle")}</h1>
          <p className={styles.heroSub}>{pt("heroSub")}</p>

          {/* Billing Toggle */}
          <div className={styles.billingToggle}>
            <button
              className={`${styles.toggleBtn} ${billingCycle === "monthly" ? styles.active : ""}`}
              onClick={() => setBillingCycle("monthly")}
            >
              {pt("monthly")}
            </button>
            <button
              className={`${styles.toggleBtn} ${billingCycle === "yearly" ? styles.active : ""}`}
              onClick={() => setBillingCycle("yearly")}
            >
              {pt("yearly")}
              <span className={styles.discount}>-17%</span>
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className={styles.pricingSection}>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.popular ? styles.popular : ""}`}
              >
                {plan.popular && (
                  <div className={styles.popularBadge}>{pt("mostPopular")}</div>
                )}
                <div className={styles.cardHeader} style={{ background: plan.gradient }}>
                  <h3 className={styles.planName}>{pt(`plans.${plan.nameKey}`)}</h3>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>
                      {formatPrice(plan.price, plan.priceEn)}
                    </span>
                    {plan.price > 0 && <span className={styles.period}>{getPeriod()}</span>}
                  </div>
                  <div className={styles.readingsBadge}>
                    <span className={styles.readingsIcon}>✦</span>
                    {plan.readings} {pt("readingsPerMonth")}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <ul className={styles.featureList}>
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={feature.included ? styles.featureItem : styles.featureItemDisabled}
                      >
                        <span className={feature.included ? styles.checkIcon : styles.xIcon}>
                          {feature.included ? "✓" : "✕"}
                        </span>
                        {getFeatureText(feature.textKey)}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`${styles.ctaButton} ${plan.popular ? styles.ctaPopular : ""}`}
                    style={!plan.popular ? { background: plan.gradient } : {}}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {plan.id === "free" ? pt("getStarted") : pt("subscribe")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Credit Packs */}
        <section className={styles.creditSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt("creditPacks")}</h2>
            <p className={styles.sectionDesc}>{pt("creditPacksDesc")}</p>
          </div>

          <div className={styles.creditGrid}>
            {creditPacks.map((pack) => {
              // Calculate discount percentage (base: mini pack ₩633/reading)
              const basePrice = 633;
              const currentPrice = pack.price / pack.readings;
              const discountPercent = Math.round((1 - currentPrice / basePrice) * 100);

              return (
                <div key={pack.id} className={`${styles.creditCard} ${pack.popular ? styles.popularCredit : ""}`}>
                  {pack.popular && (
                    <div className={styles.popularCreditBadge}>{pt("bestValue")}</div>
                  )}
                  {discountPercent > 0 && (
                    <div className={styles.discountBadge}>-{discountPercent}%</div>
                  )}
                  <div className={styles.creditHeader} style={{ background: pack.gradient }}>
                    <h3 className={styles.creditName}>{pt(`creditPackNames.${pack.nameKey}`)}</h3>
                    <div className={styles.creditPrice}>
                      {isKo ? `₩${pack.price.toLocaleString()}` : `$${pack.priceEn.toFixed(2)}`}
                    </div>
                  </div>
                  <div className={styles.creditBody}>
                    <div className={styles.creditReadings}>
                      <span className={styles.creditNumber}>{pack.readings}</span>
                      <span className={styles.creditLabel}>{pt("readings")}</span>
                    </div>
                    <div className={styles.perReading}>
                      {pt("perReading")} {isKo ? pack.perReading : pack.perReadingEn}
                    </div>
                    <button
                      className={`${styles.creditButton} ${pack.popular ? styles.creditButtonPopular : ""}`}
                      onClick={() => handleBuyCredit(pack.id)}
                    >
                      {pt("buyNow")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className={styles.howItWorks}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt("howItWorks")}</h2>
          </div>
          <div className={styles.howItWorksGrid}>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>🔮</div>
              <h4>{pt("oneReading")}</h4>
              <p>{pt("oneReadingDesc")}</p>
            </div>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>☀️</div>
              <h4>{pt("freeFeature")}</h4>
              <p>{pt("freeFeatureDesc")}</p>
            </div>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>🔄</div>
              <h4>{pt("monthlyReset")}</h4>
              <p>{pt("monthlyResetDesc")}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt("faq")}</h2>
          </div>

          <div className={styles.faqList}>
            {faqKeys.map((key, idx) => (
              <div
                key={idx}
                className={`${styles.faqItem} ${openFaq === idx ? styles.open : ""}`}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className={styles.faqQuestion}>
                  <span>{pt(`faqs.${key}`)}</span>
                  <span className={styles.faqArrow}>{openFaq === idx ? "−" : "+"}</span>
                </div>
                {openFaq === idx && (
                  <div className={styles.faqAnswer}>{pt(`faqs.a${key.slice(1)}`)}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee */}
        <section className={styles.guarantee}>
          <div className={styles.guaranteeIcon}>🛡️</div>
          <h3 className={styles.guaranteeTitle}>{pt("guarantee")}</h3>
          <p className={styles.guaranteeText}>{pt("guaranteeDesc")}</p>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>{pt("ctaTitle")}</h2>
          <p className={styles.ctaSub}>{pt("ctaSub")}</p>
          <div className={styles.ctaButtons}>
            <Link href="/destiny-map" className={styles.ctaPrimary}>
              {pt("startFree")}
            </Link>
            <Link href="/about" className={styles.ctaSecondary}>
              {pt("learnMore")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
