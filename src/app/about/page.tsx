"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "./about.module.css";

type Service = {
  id: string;
  icon: string;
  title: string;
  titleKo: string;
  description: string;
  descriptionEn: string;
  href: string;
  gradient: string;
  featured?: boolean;
  comingSoon?: boolean;
};

const services: Service[] = [
  {
    id: "destinyMap",
    icon: "🗺️",
    title: "Destiny Map",
    titleKo: "운명 지도",
    description: "사주·점성술·타로를 AI가 통합 분석하여 맞춤형 운세를 제공합니다",
    descriptionEn: "AI integrates Saju, Astrology, and Tarot for personalized fortune reading",
    href: "/destiny-map",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    featured: true,
  },
  {
    id: "tarot",
    icon: "♜",
    title: "Tarot",
    titleKo: "타로",
    description: "78장의 카드로 현재 상황과 미래의 가능성을 직관적으로 탐색합니다",
    descriptionEn: "Explore current situations and future possibilities through 78 cards",
    href: "/tarot",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "calendar",
    icon: "📅",
    title: "Calendar",
    titleKo: "운세 캘린더",
    description: "매일의 운세와 길일을 캘린더에서 확인하세요",
    descriptionEn: "Check daily fortune and auspicious days on your calendar",
    href: "/calendar",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "dream",
    icon: "💭",
    title: "Dream",
    titleKo: "꿈해몽",
    description: "꿈속 상징과 메시지를 해석해 무의식의 신호를 읽습니다",
    descriptionEn: "Interpret dream symbols and messages from your subconscious",
    href: "/dream",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    id: "personality",
    icon: "🎭",
    title: "Personality",
    titleKo: "성격분석",
    description: "다양한 관점에서 당신의 성격 특성과 장단점을 심층 분석합니다",
    descriptionEn: "Deep analysis of your personality traits, strengths, and weaknesses",
    href: "/personality",
    gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  },
];

export default function AboutPage() {
  const { translate, locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.stars} aria-hidden />
          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine}>{translate("about.heroTitle1", "Diagnose with Fate.")}</span>
            <span className={styles.heroLine}>{translate("about.heroTitle2", "Analyze with Psychology.")}</span>
            <span className={styles.heroLine}>{translate("about.heroTitle3", "Heal with Spirituality.")}</span>
          </h1>
          <p className={styles.heroSub}>
            {translate("about.heroSubtitle", "Fate speaks. AI listens. You decide.")}
          </p>
          <p className={styles.tagline}>
            {translate("about.tagline", "Understand your patterns. Change your outcomes.")}
          </p>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              {translate("about.servicesEyebrow", "DestinyPal Services")}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate("about.servicesTitle", "5 Destiny Readings")}
            </h2>
            <p className={styles.sectionDesc}>
              {translate("about.servicesDesc", "Explore your destiny from multiple perspectives with each unique service")}
            </p>
          </div>

          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.comingSoon ? "#" : service.href}
                className={`${styles.serviceCard} ${service.comingSoon ? styles.comingSoon : ""}`}
                style={{
                  background: service.gradient,
                }}
                onClick={service.comingSoon ? (e) => e.preventDefault() : undefined}
              >
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <div className={styles.serviceIcon}>{service.icon}</div>
                  <h3 className={styles.serviceTitle}>
                    {isKo ? service.titleKo : service.title}
                  </h3>
                  <p className={styles.serviceDesc}>
                    {isKo ? service.description : service.descriptionEn}
                  </p>
                  {service.comingSoon ? (
                    <span className={styles.comingSoonBadge}>Coming Soon</span>
                  ) : (
                    <span className={styles.serviceArrow}>→</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.philosophy}>
          <h2 className={styles.philosophyTitle}>
            {translate("about.philosophyTitle", "Our Philosophy")}
          </h2>
          <div className={styles.philosophyGrid}>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🎯</div>
              <h3>{translate("about.philosophy.accurate.title", "Accurate Calculation")}</h3>
              <p>
                {translate("about.philosophy.accurate.desc", "Reliable calculations reflecting time zones, seasons, and DST")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤝</div>
              <h3>{translate("about.philosophy.ethical.title", "Ethical Guidance")}</h3>
              <p>
                {translate("about.philosophy.ethical.desc", "Practical hints to help choices, not absolute predictions")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>✨</div>
              <h3>{translate("about.philosophy.ui.title", "Intuitive UI")}</h3>
              <p>
                {translate("about.philosophy.ui.desc", "Beautiful interface that makes complex information easy")}
              </p>
            </div>
            <div className={styles.philosophyCard}>
              <div className={styles.philosophyIcon}>🤖</div>
              <h3>{translate("about.philosophy.ai.title", "AI Integration")}</h3>
              <p>
                {translate("about.philosophy.ai.desc", "AI-powered integration of multiple divination systems")}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            {translate("about.ctaTitle", "Start Now")}
          </h2>
          <p className={styles.ctaSub}>
            {translate("about.ctaSub", "Explore your destiny map with AI")}
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/destiny-map" className={styles.ctaPrimary}>
              {translate("about.ctaPrimary", "Start Destiny Map")}
            </Link>
            <Link href="/" className={styles.ctaSecondary}>
              {translate("about.ctaSecondary", "Go Home")}
            </Link>
          </div>
        </section>
      </main>
      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </div>
  );
}
