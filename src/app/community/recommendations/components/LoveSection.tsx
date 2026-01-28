import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface LoveSectionProps {
  data: LifeRecommendation["love"];
  styles: Record<string, string>;
}

export default function LoveSection({ data, styles }: LoveSectionProps) {
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
