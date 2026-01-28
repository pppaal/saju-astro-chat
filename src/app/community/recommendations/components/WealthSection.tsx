import type { LifeRecommendation } from "@/lib/ai/recommendations";

interface WealthSectionProps {
  data: LifeRecommendation["wealth"];
  styles: Record<string, string>;
}

export default function WealthSection({ data, styles }: WealthSectionProps) {
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
