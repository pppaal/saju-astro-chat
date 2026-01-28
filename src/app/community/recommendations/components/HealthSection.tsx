import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface HealthSectionProps {
  data: LifeRecommendation["health"];
  styles: Record<string, string>;
}

export default function HealthSection({ data, styles }: HealthSectionProps) {
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
