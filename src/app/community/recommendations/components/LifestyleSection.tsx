import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface LifestyleSectionProps {
  data: LifeRecommendation["lifestyle"];
  styles: Record<string, string>;
}

export default function LifestyleSection({ data, styles }: LifestyleSectionProps) {
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
