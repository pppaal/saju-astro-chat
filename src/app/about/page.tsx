"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./about.module.css";

// Dynamic import with loading fallback - reduces initial bundle size
const OvoidCanvas = dynamic(() => import("@/components/canvas/OvoidCanvas"), {
  loading: () => (
    <div style={{
      width: "100%",
      height: "100%",
      background: "linear-gradient(135deg, rgba(10, 10, 26, 0.8) 0%, rgba(20, 20, 36, 0.8) 100%)",
      borderRadius: "200px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#a89fcf"
    }}>
      Loading animation...
    </div>
  ),
  ssr: false, // Canvas animations don't need SSR
});

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.title}>
          {t("about.heroTitle1")}
          <br />
          {t("about.heroTitle2")}
        </h1>
        <p className={styles.subtitle}>
          {t("about.heroSubtitle")}
        </p>
        <div className={styles.ctaRow}>
          <Link href="/destiny-map" className={styles.btnPrimary}>
            {t("about.tryDestinyMap")}
          </Link>
          <Link href="/about/features" className={styles.btnGhost}>
            {t("about.seeFeatures")}
          </Link>
        </div>
      </section>

      {/* Visual Section */}
      <section className={styles.visual} aria-label="overview visual">
        <div className={styles.ovoidContainer}>
          <OvoidCanvas canvasId="aboutCanvas" className={styles.ovoidCanvas} />
        </div>
        <div className={styles.visualCopy}>
          <h2>{t("about.visualTitle")}</h2>
          <p>{t("about.visualDesc")}</p>
        </div>
      </section>

      {/* Discover Section */}
      <section className={styles.discover}>
        <h2>{t("about.discoverTitle")}</h2>
        <p className={styles.discoverSub}>
          {t("about.discoverSubtitle")}
        </p>

        <div className={styles.grid}>
          {/* Saju Card */}
          <article className={`${styles.card} ${styles.cardSaju}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.dot} ${styles.dotSaju}`} aria-hidden="true" />
              <h3>{t("about.sajuTitle")}</h3>
            </div>
            <p>{t("about.sajuDesc")}</p>
            <ul className={styles.bullets}>
              <li>{t("about.sajuStrength")}</li>
              <li>{t("about.sajuAccuracy")}</li>
            </ul>
            <div className={styles.actions}>
              <Link href="/saju" className={styles.btnSoft}>
                {t("about.sajuLink")}
              </Link>
              <details className={styles.accordion}>
                <summary>{t("about.sajuDetailTitle")}</summary>
                <div className={styles.accordionContent}>
                  {t("about.sajuDetail")}
                </div>
              </details>
            </div>
          </article>

          {/* Astrology Card */}
          <article className={`${styles.card} ${styles.cardAstro}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.dot} ${styles.dotAstro}`} aria-hidden="true" />
              <h3>{t("about.astroTitle")}</h3>
            </div>
            <p>{t("about.astroDesc")}</p>
            <ul className={styles.bullets}>
              <li>{t("about.astroStrength")}</li>
              <li>{t("about.astroAccuracy")}</li>
            </ul>
            <div className={styles.actions}>
              <Link href="/astrology" className={styles.btnSoft}>
                {t("about.astroLink")}
              </Link>
              <details className={styles.accordion}>
                <summary>{t("about.astroDetailTitle")}</summary>
                <div className={styles.accordionContent}>
                  {t("about.astroDetail")}
                </div>
              </details>
            </div>
          </article>

          {/* I Ching Card */}
          <article className={`${styles.card} ${styles.cardIching}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.dot} ${styles.dotIching}`} aria-hidden="true" />
              <h3>{t("about.ichingTitle")}</h3>
            </div>
            <p>{t("about.ichingDesc")}</p>
            <ul className={styles.bullets}>
              <li>{t("about.ichingStrength")}</li>
              <li>{t("about.ichingAccuracy")}</li>
            </ul>
            <div className={styles.actions}>
              <Link href="/iching" className={styles.btnSoft}>
                {t("about.ichingLink")}
              </Link>
              <details className={styles.accordion}>
                <summary>{t("about.ichingDetailTitle")}</summary>
                <div className={styles.accordionContent}>
                  {t("about.ichingDetail")}
                </div>
              </details>
            </div>
          </article>

          {/* Tarot Card */}
          <article className={`${styles.card} ${styles.cardTarot}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.dot} ${styles.dotTarot}`} aria-hidden="true" />
              <h3>{t("about.tarotTitle")}</h3>
            </div>
            <p>{t("about.tarotDesc")}</p>
            <ul className={styles.bullets}>
              <li>{t("about.tarotStrength")}</li>
              <li>{t("about.tarotAccuracy")}</li>
            </ul>
            <div className={styles.actions}>
              <Link href="/tarot" className={styles.btnSoft}>
                {t("about.tarotLink")}
              </Link>
              <details className={styles.accordion}>
                <summary>{t("about.tarotDetailTitle")}</summary>
                <div className={styles.accordionContent}>
                  {t("about.tarotDetail")}
                </div>
              </details>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
