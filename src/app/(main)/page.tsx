"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import styles from "./main-page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { useVisitorMetrics } from "@/hooks/useVisitorMetrics";
import { useScrollVisibility, useScrollAnimation } from "@/hooks/useMainPageHooks";

// Critical components - loaded immediately
import {
  MainHeader,
  ServiceSearchBox,
  StatsSection,
  AstrologyFeature,
  SajuFeature,
  TarotSection,
  SEOContent,
  CTASection,
} from "./components";

// Non-critical components - lazy loaded with suspense
const ParticleCanvas = dynamic(() => import("./components").then(mod => ({ default: mod.ParticleCanvas })), {
  ssr: false,
  loading: () => null,
});

const ChatDemoSection = dynamic(() => import("@/components/home/ChatDemoSection").then(mod => ({ default: mod.ChatDemoSection })), {
  ssr: false,
  loading: () => <div className={styles.featureSectionSkeleton} />,
});

const WeeklyFortuneCard = dynamic(() => import("@/components/WeeklyFortuneCard"), {
  loading: () => <div className={styles.weeklyCardSkeleton} />,
});

const PrefetchLinks = dynamic(() => import("@/components/PrefetchLinks"), {
  ssr: false,
});


export default function MainPage() {
  const { t, locale } = useI18n();
  const translate = useCallback((key: string, fallback: string) => {
    const res = t(key);
    const last = key.split(".").pop() || key;
    return res === last ? fallback : res;
  }, [t]);

  const metricsToken = process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN;

  // Custom hooks
  useScrollAnimation(`.${styles.featureSection}`, styles);
  const showScrollTop = useScrollVisibility(500);

  // Visitor stats
  const { todayVisitors, totalVisitors, totalMembers, visitorError } = useVisitorMetrics(metricsToken);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <main className={styles.container}>
      <ParticleCanvas />
      <MainHeader />

      {/* Fullscreen Hero Section */}
      <section className={styles.fullscreenHero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            {translate("landing.heroTitle", "Know yourself. Shape tomorrow.")}
          </h1>
          <p className={styles.heroSub}>
            {translate(
              "landing.heroSub",
              "Where destiny, psychology, and spirituality meet"
            )}
          </p>

          {/* Google-style Question Search Box */}
          <ServiceSearchBox translate={translate} t={t} styles={styles} />
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollText}>{translate("landing.scrollDown", "스크롤하여 더보기")}</span>
          <div className={styles.scrollArrow}>
            <span>↓</span>
          </div>
        </div>
      </section>

      {/* Stats Section - Below Hero */}
      <StatsSection
        translate={translate}
        todayVisitors={todayVisitors}
        totalVisitors={totalVisitors}
        totalMembers={totalMembers}
        visitorError={visitorError}
        styles={styles}
      />

      {/* Weekly Fortune Card */}
      <section className={styles.weeklyFortuneSection}>
        <WeeklyFortuneCard />
      </section>

      {/* AI Chat Demo Section */}
      <ChatDemoSection translate={translate} />

      {/* Astrology Feature Section */}
      <AstrologyFeature translate={translate} styles={styles} />

      {/* Saju Feature Section */}
      <SajuFeature translate={translate} styles={styles} />

      {/* Tarot Feature Section */}
      <TarotSection translate={translate} locale={locale} />

      {/* CTA Section */}
      <CTASection translate={translate} styles={styles} />

      {/* SEO Content Section - Rich Information for Search Engines */}
      <SEOContent translate={translate} styles={styles} />

      {/* Scroll to Top Button */}
      <button
        className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ""}`}
        onClick={scrollToTop}
        aria-label={translate("landing.scrollToTop", "Back to Top")}
      >
        <span className={styles.scrollToTopIcon}>↑</span>
        <span className={styles.scrollToTopText}>
          {translate("landing.scrollToTop", "Back to Top")}
        </span>
      </button>

      {/* Prefetch critical routes in the background */}
      <PrefetchLinks />

      <SpeedInsights />
    </main>
  );
}
