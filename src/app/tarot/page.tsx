"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ServicePageLayout from "@/components/ui/ServicePageLayout";
import styles from "./tarot-home.module.css";

const topics = [
  {
    id: "general-insight",
    icon: "🔮",
    titleKey: "tarot.topics.generalInsight",
    titleDefault: "General Insight",
    descKey: "tarot.topics.generalInsightDesc",
    descDefault: "Explore the overall energy surrounding you.",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    id: "love-relationships",
    icon: "💕",
    titleKey: "tarot.topics.loveRelationships",
    titleDefault: "Love & Relationships",
    descKey: "tarot.topics.loveRelationshipsDesc",
    descDefault: "Uncover the mysteries of your heart.",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  {
    id: "career-work",
    icon: "💼",
    titleKey: "tarot.topics.careerWork",
    titleDefault: "Career & Work",
    descKey: "tarot.topics.careerWorkDesc",
    descDefault: "Find clarity on your professional journey.",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  },
  {
    id: "money-finance",
    icon: "💰",
    titleKey: "tarot.topics.moneyFinance",
    titleDefault: "Money & Finance",
    descKey: "tarot.topics.moneyFinanceDesc",
    descDefault: "Seek guidance on your financial situation.",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
  },
  {
    id: "well-being-health",
    icon: "🌿",
    titleKey: "tarot.topics.wellbeingHealth",
    titleDefault: "Well-being & Health",
    descKey: "tarot.topics.wellbeingHealthDesc",
    descDefault: "Listen to the whispers of your body and mind.",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  },
  {
    id: "spiritual-growth",
    icon: "✨",
    titleKey: "tarot.topics.spiritualGrowth",
    titleDefault: "Spiritual Growth",
    descKey: "tarot.topics.spiritualGrowthDesc",
    descDefault: "Connect with your higher self.",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  },
  {
    id: "daily-reading",
    icon: "☀️",
    titleKey: "tarot.topics.dailyReading",
    titleDefault: "Daily Reading",
    descKey: "tarot.topics.dailyReadingDesc",
    descDefault: "A quick look at the energies of your day.",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
  }
];

export default function TarotHomePage() {
  const { translate } = useI18n();

  return (
    <ServicePageLayout
      icon="🔮"
      title={translate("tarot.home.title", "What is your question?")}
      subtitle={translate("tarot.home.subtitle", "Choose a topic to begin your reading")}
      particleColor="#a78bfa"
    >
      <div className={styles.topicGrid}>
        {topics.map((topic, index) => (
          <Link
            key={topic.id}
            href={`/tarot/${topic.id}`}
            className={styles.topicCard}
            style={{
              animationDelay: `${index * 0.1}s`,
              "--gradient": topic.gradient
            } as React.CSSProperties}
          >
            <div className={styles.cardIcon}>{topic.icon}</div>
            <div className={styles.cardContent}>
              <h2 className={styles.topicTitle}>
                {translate(topic.titleKey, topic.titleDefault)}
              </h2>
              <p className={styles.topicDescription}>
                {translate(topic.descKey, topic.descDefault)}
              </p>
            </div>
            <div className={styles.cardArrow}>→</div>
          </Link>
        ))}
      </div>
    </ServicePageLayout>
  );
}