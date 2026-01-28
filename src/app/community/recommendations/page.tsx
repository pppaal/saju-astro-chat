"use client";

import styles from "./recommendations.module.css";
import {
  CareerSection,
  LoveSection,
  FitnessSection,
  HealthSection,
  WealthSection,
  LifestyleSection,
} from "./components";
import { useRecommendations } from "./components/useRecommendations";

export default function RecommendationsPage() {
  const { loading, recommendations, loadRecommendations, activeTab, setActiveTab } =
    useRecommendations();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>AI가 당신의 운명을 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>추천을 불러올 수 없습니다. 다시 시도해주세요.</p>
          <button onClick={loadRecommendations} className={styles.retryButton}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>✨ AI 기반 맞춤 라이프 추천</h1>
        <p className={styles.subtitle}>
          사주 + 점성학 + 타로 데이터를 기반으로 한 종합 인생 가이드
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "career" ? styles.active : ""}`}
          onClick={() => setActiveTab("career")}
        >
          💼 직업
        </button>
        <button
          className={`${styles.tab} ${activeTab === "love" ? styles.active : ""}`}
          onClick={() => setActiveTab("love")}
        >
          ❤️ 연애
        </button>
        <button
          className={`${styles.tab} ${activeTab === "fitness" ? styles.active : ""}`}
          onClick={() => setActiveTab("fitness")}
        >
          💪 운동
        </button>
        <button
          className={`${styles.tab} ${activeTab === "health" ? styles.active : ""}`}
          onClick={() => setActiveTab("health")}
        >
          🏥 건강
        </button>
        <button
          className={`${styles.tab} ${activeTab === "wealth" ? styles.active : ""}`}
          onClick={() => setActiveTab("wealth")}
        >
          💰 재물
        </button>
        <button
          className={`${styles.tab} ${activeTab === "lifestyle" ? styles.active : ""}`}
          onClick={() => setActiveTab("lifestyle")}
        >
          🌟 라이프스타일
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "career" && <CareerSection data={recommendations.career} styles={styles} />}
        {activeTab === "love" && <LoveSection data={recommendations.love} styles={styles} />}
        {activeTab === "fitness" && <FitnessSection data={recommendations.fitness} styles={styles} />}
        {activeTab === "health" && <HealthSection data={recommendations.health} styles={styles} />}
        {activeTab === "wealth" && <WealthSection data={recommendations.wealth} styles={styles} />}
        {activeTab === "lifestyle" && <LifestyleSection data={recommendations.lifestyle} styles={styles} />}
      </div>
    </div>
  );
}
