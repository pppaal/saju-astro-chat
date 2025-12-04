"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  generateLifeRecommendations,
  type UserProfile,
  type LifeRecommendation,
} from "@/lib/ai/recommendations";
import styles from "./recommendations.module.css";

export default function RecommendationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<LifeRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<"career" | "love" | "fitness" | "health" | "wealth" | "lifestyle">("career");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    if (status === "authenticated") {
      loadRecommendations();
    }
  }, [status, router]);

  async function loadRecommendations() {
    try {
      setLoading(true);

      // TODO: Fetch user's actual Saju, Astrology, Tarot data from backend
      const userProfile: UserProfile = {
        name: session?.user?.name || "User",
        birthDate: "1990-01-01", // Should fetch from user data
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          hour: "丙辰",
          elements: {
            wood: 3,
            fire: 4,
            earth: 2,
            metal: 1,
            water: 2,
          },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
        astrology: {
          sunSign: "Aries",
          moonSign: "Leo",
          rising: "Sagittarius",
          venus: "Taurus",
          mars: "Aries",
          jupiter: "Pisces",
          saturn: "Capricorn",
          houses: {
            h1: "Sagittarius",
            h2: "Capricorn",
            h6: "Taurus",
            h7: "Gemini",
            h10: "Virgo",
          },
        },
        currentSituation: {
          occupation: "Software Developer",
          income: 5000000,
          relationshipStatus: "single",
        },
      };

      const result = await generateLifeRecommendations(userProfile);
      setRecommendations(result);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  }

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
        {activeTab === "career" && <CareerSection data={recommendations.career} />}
        {activeTab === "love" && <LoveSection data={recommendations.love} />}
        {activeTab === "fitness" && <FitnessSection data={recommendations.fitness} />}
        {activeTab === "health" && <HealthSection data={recommendations.health} />}
        {activeTab === "wealth" && <WealthSection data={recommendations.wealth} />}
        {activeTab === "lifestyle" && <LifestyleSection data={recommendations.lifestyle} />}
      </div>
    </div>
  );
}

function CareerSection({ data }: { data: LifeRecommendation["career"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>💼 직업 추천</h2>
        <p>당신의 사주와 점성학 기반 최적의 커리어 경로</p>
      </div>

      <div className={styles.card}>
        <h3>🎯 추천 분야</h3>
        {data.recommendedFields.map((field, index) => (
          <div key={index} className={styles.fieldItem}>
            <div className={styles.fieldHeader}>
              <h4>{field.field}</h4>
              <div className={styles.successRate}>
                <span className={styles.rateLabel}>성공 확률</span>
                <span className={styles.rateValue}>{field.successRate}%</span>
              </div>
            </div>
            <p className={styles.reason}>{field.reason}</p>
            <div className={styles.timeframe}>
              <span>⏱️ 예상 소요 시간: {field.timeframe}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${field.successRate}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>💪 당신의 강점</h3>
        <ul className={styles.list}>
          {data.strengths.map((strength, index) => (
            <li key={index}>
              <span className={styles.checkmark}>✓</span> {strength}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.card}>
        <h3>⚠️ 주의사항</h3>
        <ul className={styles.warningList}>
          {data.warnings.map((warning, index) => (
            <li key={index}>
              <span className={styles.warningIcon}>⚠️</span> {warning}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.card}>
        <h3>📋 실행 계획</h3>
        {data.actionSteps.map((step, index) => (
          <div key={index} className={styles.actionStep}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div className={styles.stepContent}>
                <p className={styles.stepText}>{step.step}</p>
                <div className={styles.stepMeta}>
                  <span
                    className={`${styles.priority} ${styles[step.priority]}`}
                  >
                    {step.priority === "high" ? "🔴 높음" : step.priority === "medium" ? "🟡 보통" : "🟢 낮음"}
                  </span>
                  {step.deadline && (
                    <span className={styles.deadline}>📅 {step.deadline}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoveSection({ data }: { data: LifeRecommendation["love"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>❤️ 연애 운세</h2>
        <p>당신과 가장 잘 맞는 이상형과 만남의 장소</p>
      </div>

      <div className={styles.card}>
        <h3>✨ 이상적인 궁합</h3>
        {data.idealMatches.map((match, index) => (
          <div key={index} className={styles.matchItem}>
            <div className={styles.matchHeader}>
              <h4>{match.sign}</h4>
              <div className={styles.compatibility}>
                <span className={styles.heartIcon}>💕</span>
                <span className={styles.compatibilityValue}>
                  {match.compatibility}%
                </span>
              </div>
            </div>
            <p className={styles.matchReason}>{match.reason}</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${match.compatibility}%`,
                  background: "linear-gradient(90deg, #ff6b9d 0%, #c06c84 100%)",
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>⚠️ 피해야 할 궁합</h3>
        {data.avoidSigns.map((avoid, index) => (
          <div key={index} className={styles.avoidItem}>
            <h4>❌ {avoid.sign}</h4>
            <p>{avoid.reason}</p>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>🌟 최적의 만남 시기</h3>
        <div className={styles.timePeriod}>
          <div className={styles.dateRange}>
            <span className={styles.startDate}>{data.bestTimePeriod.start}</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.endDate}>{data.bestTimePeriod.end}</span>
          </div>
          <p className={styles.periodReason}>{data.bestTimePeriod.reason}</p>
        </div>
      </div>

      <div className={styles.card}>
        <h3>📍 만남의 장소</h3>
        <div className={styles.placeGrid}>
          {data.meetingPlaces.map((place, index) => (
            <div key={index} className={styles.placeCard}>
              📍 {place}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3>💡 데이트 팁</h3>
        <ul className={styles.tipsList}>
          {data.datingTips.map((tip, index) => (
            <li key={index}>
              <span className={styles.tipIcon}>💡</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FitnessSection({ data }: { data: LifeRecommendation["fitness"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>💪 운동 추천</h2>
        <p>당신의 오행 균형을 맞추는 최적의 운동법</p>
      </div>

      <div className={styles.card}>
        <h3>🏋️ 추천 운동</h3>
        {data.recommendedExercises.map((exercise, index) => (
          <div key={index} className={styles.exerciseItem}>
            <div className={styles.exerciseHeader}>
              <h4>{exercise.exercise}</h4>
              <span
                className={`${styles.intensity} ${styles[exercise.intensity]}`}
              >
                {exercise.intensity === "high"
                  ? "🔴 고강도"
                  : exercise.intensity === "medium"
                  ? "🟡 중강도"
                  : "🟢 저강도"}
              </span>
            </div>
            <p className={styles.exerciseReason}>{exercise.reason}</p>
            <div className={styles.frequency}>
              <span className={styles.frequencyIcon}>📅</span>
              <span>{exercise.frequency}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>⏰ 최적 운동 시간</h3>
        <div className={styles.bestTime}>
          <span className={styles.timeIcon}>🕐</span>
          <span className={styles.timeText}>{data.bestTimeOfDay}</span>
        </div>
      </div>

      <div className={styles.card}>
        <h3>🎯 목표</h3>
        <p className={styles.targetGoal}>{data.targetGoal}</p>
      </div>

      <div className={styles.card}>
        <h3>⚠️ 피해야 할 활동</h3>
        <ul className={styles.avoidList}>
          {data.avoidActivities.map((activity, index) => (
            <li key={index}>
              <span className={styles.avoidIcon}>🚫</span> {activity}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HealthSection({ data }: { data: LifeRecommendation["health"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>🏥 건강 관리</h2>
        <p>당신의 사주 기반 맞춤 건강 가이드</p>
      </div>

      <div className={styles.card}>
        <h3>⚠️ 취약한 부위</h3>
        {data.vulnerableAreas.map((area, index) => (
          <div key={index} className={styles.vulnerableItem}>
            <div className={styles.areaHeader}>
              <h4>{area.area}</h4>
              <span
                className={`${styles.severity} ${styles[area.severity]}`}
              >
                {area.severity === "high"
                  ? "🔴 높음"
                  : area.severity === "medium"
                  ? "🟡 보통"
                  : "🟢 낮음"}
              </span>
            </div>
            <div className={styles.prevention}>
              <span className={styles.preventionLabel}>예방법:</span>
              <p>{area.prevention}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>🥗 식단 추천</h3>
        <div className={styles.dietSection}>
          <div className={styles.dietCategory}>
            <h4 className={styles.recommended}>✅ 추천 음식</h4>
            <div className={styles.foodGrid}>
              {data.dietRecommendations.recommended.map((food, index) => (
                <div key={index} className={styles.foodItem}>
                  {food}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.dietCategory}>
            <h4 className={styles.avoid}>❌ 피해야 할 음식</h4>
            <div className={styles.foodGrid}>
              {data.dietRecommendations.avoid.map((food, index) => (
                <div key={index} className={styles.foodItem}>
                  {food}
                </div>
              ))}
            </div>
          </div>
          {data.dietRecommendations.supplements && (
            <div className={styles.dietCategory}>
              <h4 className={styles.supplements}>💊 권장 영양제</h4>
              <div className={styles.foodGrid}>
                {data.dietRecommendations.supplements.map((supp, index) => (
                  <div key={index} className={styles.foodItem}>
                    {supp}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3>😴 수면 스케줄</h3>
        <div className={styles.sleepSchedule}>
          <div className={styles.sleepTime}>
            <span className={styles.sleepIcon}>🌙</span>
            <div>
              <div className={styles.sleepLabel}>취침 시간</div>
              <div className={styles.sleepValue}>{data.sleepSchedule.bedtime}</div>
            </div>
          </div>
          <div className={styles.sleepTime}>
            <span className={styles.sleepIcon}>☀️</span>
            <div>
              <div className={styles.sleepLabel}>기상 시간</div>
              <div className={styles.sleepValue}>{data.sleepSchedule.wakeup}</div>
            </div>
          </div>
        </div>
        <p className={styles.sleepReason}>{data.sleepSchedule.reason}</p>
      </div>

      <div className={styles.card}>
        <h3>🧘 정신 건강</h3>
        <div className={styles.mentalHealth}>
          <div className={styles.mentalCategory}>
            <h4>스트레스 관리</h4>
            <ul>
              {data.mentalHealth.stressManagement.map((method, index) => (
                <li key={index}>{method}</li>
              ))}
            </ul>
          </div>
          <div className={styles.mentalCategory}>
            <h4>마음챙김 실천</h4>
            <ul>
              {data.mentalHealth.mindfulnessPractices.map((practice, index) => (
                <li key={index}>{practice}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function WealthSection({ data }: { data: LifeRecommendation["wealth"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>💰 재물 운세</h2>
        <p>현재 자산 분석과 수익 증대 전략</p>
      </div>

      <div className={styles.card}>
        <h3>📊 현재 자산 분석</h3>
        <div className={styles.wealthAnalysis}>
          <div className={styles.wealthItem}>
            <div className={styles.wealthLabel}>현재 자산</div>
            <div className={styles.wealthValue}>
              {(data.currentAnalysis.assets / 10000).toFixed(0)}만원
            </div>
          </div>
          <div className={styles.wealthItem}>
            <div className={styles.wealthLabel}>예상 성장률</div>
            <div className={styles.wealthValue}>
              {data.currentAnalysis.projectedGrowth}%
            </div>
          </div>
          <div className={styles.wealthItem}>
            <div className={styles.wealthLabel}>기간</div>
            <div className={styles.wealthValue}>
              {data.currentAnalysis.timeframe}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>📈 투자 전략</h3>
        <div className={styles.investmentStrategy}>
          <div className={styles.strategyItem}>
            <div className={styles.strategyHeader}>
              <h4>🟢 안정형 ({data.investmentStrategy.conservative.percentage}%)</h4>
            </div>
            <div className={styles.optionGrid}>
              {data.investmentStrategy.conservative.options.map((option, index) => (
                <div key={index} className={styles.optionCard}>
                  {option}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.strategyItem}>
            <div className={styles.strategyHeader}>
              <h4>🟡 중립형 ({data.investmentStrategy.moderate.percentage}%)</h4>
            </div>
            <div className={styles.optionGrid}>
              {data.investmentStrategy.moderate.options.map((option, index) => (
                <div key={index} className={styles.optionCard}>
                  {option}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.strategyItem}>
            <div className={styles.strategyHeader}>
              <h4>🔴 공격형 ({data.investmentStrategy.aggressive.percentage}%)</h4>
            </div>
            <div className={styles.optionGrid}>
              {data.investmentStrategy.aggressive.options.map((option, index) => (
                <div key={index} className={styles.optionCard}>
                  {option}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>💡 추가 수입원</h3>
        {data.incomeStreams.map((stream, index) => (
          <div key={index} className={styles.incomeStream}>
            <div className={styles.streamHeader}>
              <h4>{stream.source}</h4>
              <span className={`${styles.effort} ${styles[stream.effort]}`}>
                {stream.effort === "high"
                  ? "🔴 높은 노력"
                  : stream.effort === "medium"
                  ? "🟡 중간 노력"
                  : "🟢 낮은 노력"}
              </span>
            </div>
            <div className={styles.streamDetails}>
              <span className={styles.income}>💰 {stream.potentialIncome}</span>
              <span className={styles.timeline}>⏱️ {stream.timeline}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>🍀 행운의 시기</h3>
        {data.luckyPeriods.map((period, index) => (
          <div key={index} className={styles.luckyPeriod}>
            <div className={styles.periodDates}>
              <span>{period.start}</span>
              <span className={styles.arrow}>→</span>
              <span>{period.end}</span>
            </div>
            <p className={styles.periodFocus}>🎯 {period.focus}</p>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3>⚠️ 주의사항</h3>
        <ul className={styles.warningList}>
          {data.warnings.map((warning, index) => (
            <li key={index}>
              <span className={styles.warningIcon}>⚠️</span> {warning}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LifestyleSection({ data }: { data: LifeRecommendation["lifestyle"] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>🌟 라이프스타일</h2>
        <p>당신에게 맞는 이상적인 삶의 방식</p>
      </div>

      <div className={styles.card}>
        <h3>🌍 이상적인 거주지</h3>
        <div className={styles.locationInfo}>
          <div className={styles.cities}>
            {data.idealLocation.cities.map((city, index) => (
              <div key={index} className={styles.cityTag}>
                📍 {city}
              </div>
            ))}
          </div>
          <p className={styles.locationReason}>{data.idealLocation.reason}</p>
          <div className={styles.climate}>
            <span className={styles.climateIcon}>🌡️</span>
            <span>{data.idealLocation.climate}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>🎨 추천 취미</h3>
        <div className={styles.hobbyGrid}>
          {data.hobbies.map((hobby, index) => (
            <div key={index} className={styles.hobbyCard}>
              🎯 {hobby}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3>✈️ 여행 추천</h3>
        <div className={styles.travelSection}>
          <div className={styles.travelCategory}>
            <h4>🗺️ 추천 여행지</h4>
            <ul>
              {data.travel.destinations.map((dest, index) => (
                <li key={index}>{dest}</li>
              ))}
            </ul>
          </div>
          <div className={styles.travelCategory}>
            <h4>📅 최적 여행 시기</h4>
            <ul>
              {data.travel.bestTimes.map((time, index) => (
                <li key={index}>{time}</li>
              ))}
            </ul>
          </div>
          <div className={styles.travelStyle}>
            <span className={styles.styleIcon}>🎒</span>
            <span>{data.travel.travelStyle}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>👥 소셜 라이프</h3>
        <div className={styles.socialLife}>
          <div className={styles.socialItem}>
            <h4>👨‍👩‍👧 이상적인 그룹 크기</h4>
            <p>{data.socialLife.idealGroupSize}</p>
          </div>
          <div className={styles.socialItem}>
            <h4>🎉 추천 활동</h4>
            <ul>
              {data.socialLife.activities.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
          <div className={styles.socialItem}>
            <h4>🤝 네트워킹 팁</h4>
            <ul>
              {data.socialLife.networkingTips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>⏰ 일일 루틴</h3>
        <div className={styles.dailyRoutine}>
          <div className={styles.routineSection}>
            <h4>🌅 아침</h4>
            <ul>
              {data.dailyRoutine.morning.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.routineSection}>
            <h4>☀️ 오후</h4>
            <ul>
              {data.dailyRoutine.afternoon.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.routineSection}>
            <h4>🌙 저녁</h4>
            <ul>
              {data.dailyRoutine.evening.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
