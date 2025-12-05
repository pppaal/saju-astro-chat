"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./about.module.css";

const services = [
  {
    id: "destiny-map",
    icon: "◎",
    title: "Destiny Map",
    titleKo: "데스티니 맵",
    description: "AI가 사주, 점성술, 타로를 융합해 당신의 운명 지도를 한눈에 보여줍니다",
    descriptionEn: "AI combines Saju, Astrology, and Tarot to reveal your complete destiny map",
    href: "/destiny-map",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "astrology",
    icon: "✦",
    title: "Astrology",
    titleKo: "점성술",
    description: "행성의 배치와 하우스 위치로 당신의 성격과 운명의 흐름을 읽습니다",
    descriptionEn: "Read your personality and destiny through planetary positions and houses",
    href: "/astrology",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: "saju",
    icon: "四柱",
    title: "Saju",
    titleKo: "사주",
    description: "사주팔자로 오행 밸런스와 대운·세운의 흐름을 분석합니다",
    descriptionEn: "Analyze five elements balance and fortune cycles through Four Pillars",
    href: "/saju",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
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
    id: "iching",
    icon: "☯",
    title: "I Ching",
    titleKo: "주역",
    description: "64괘의 지혜로 현재의 상황과 변화의 방향을 제시합니다",
    descriptionEn: "Wisdom of 64 hexagrams guides current situation and direction of change",
    href: "/iching",
    gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
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
    id: "numerology",
    icon: "🔢",
    title: "Numerology",
    titleKo: "수비학",
    description: "생년월일의 숫자로 당신의 인생 경로와 잠재력을 탐구합니다",
    descriptionEn: "Discover your life path and potential through birth date numbers",
    href: "/numerology",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  {
    id: "compatibility",
    icon: "💕",
    title: "Compatibility",
    titleKo: "궁합",
    description: "사주와 점성술로 두 사람의 조화와 관계 역학을 분석합니다",
    descriptionEn: "Analyze harmony and relationship dynamics between two people",
    href: "/compatibility",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
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
  const { translate } = useI18n();

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.stars} aria-hidden />
          <h1 className={styles.heroTitle}>
            {translate("about.heroTitle1", "Read the stars and energy,")}
            <br />
            {translate("about.heroTitle2", "Make smarter choices.")}
          </h1>
          <p className={styles.heroSub}>
            {translate("about.heroSub", "Combine Saju, Astrology, I Ching, and Tarot in one place with precise data and ethical guidance. We provide practical hints, not absolute predictions.")}
          </p>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              {translate("about.servicesEyebrow", "DestinyPal Services")}
            </p>
            <h2 className={styles.sectionTitle}>
              {translate("about.servicesTitle", "9 Destiny Readings")}
            </h2>
            <p className={styles.sectionDesc}>
              {translate("about.servicesDesc", "Explore your destiny from multiple perspectives with each unique service")}
            </p>
          </div>

          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className={styles.serviceCard}
                style={{
                  background: service.gradient,
                }}
              >
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <div className={styles.serviceIcon}>{service.icon}</div>
                  <h3 className={styles.serviceTitle}>
                    {translate(`about.service.${service.id}.title`, service.title)}
                  </h3>
                  <p className={styles.serviceDesc}>
                    {translate(`about.service.${service.id}.desc`, service.descriptionEn)}
                  </p>
                  <span className={styles.serviceArrow}>→</span>
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
    </div>
  );
}
