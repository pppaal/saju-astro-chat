import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface FitnessSectionProps {
  data: LifeRecommendation["fitness"];
  styles: Record<string, string>;
}

export default function FitnessSection({ data, styles }: FitnessSectionProps) {
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
