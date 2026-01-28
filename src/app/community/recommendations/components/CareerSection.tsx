import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface CareerSectionProps {
  data: LifeRecommendation["career"];
  styles: Record<string, string>;
}

export default function CareerSection({ data, styles }: CareerSectionProps) {
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
