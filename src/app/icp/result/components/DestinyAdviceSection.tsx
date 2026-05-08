import type { DailyFortuneResult, ImportantDate } from '@/lib/counselor/destinyCalendar'
import DateTimePicker from '@/components/ui/DateTimePicker'

interface DestinyAdviceSectionProps {
  styles: Record<string, string>
  isKo: boolean
  primaryOctantLabel: string
  birthDate: string
  setBirthDate: (value: string) => void
  birthTime: string
  setBirthTime: (value: string) => void
  isLoading: boolean
  fortune: DailyFortuneResult | null
  growthDates: ImportantDate[]
  onGenerate: () => void
}

const CATEGORY_NAMES: Record<string, { ko: string; en: string }> = {
  career: { ko: '커리어', en: 'Career' },
  love: { ko: '연애', en: 'Love' },
  wealth: { ko: '재물', en: 'Wealth' },
  health: { ko: '건강', en: 'Health' },
  study: { ko: '학업', en: 'Study' },
  travel: { ko: '여행', en: 'Travel' },
  general: { ko: '전반', en: 'General' },
}

export default function DestinyAdviceSection({
  styles,
  isKo,
  primaryOctantLabel,
  birthDate,
  setBirthDate,
  birthTime,
  setBirthTime,
  isLoading,
  fortune,
  growthDates,
  onGenerate,
}: DestinyAdviceSectionProps) {
  return (
    <section className={styles.destinySection}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIcon}>🔮</span>
        {isKo ? '운명 기반 맞춤 조언' : 'Destiny-Based Personalized Advice'}
      </h2>
      <p className={styles.destinyIntro}>
        {isKo
          ? '생년월일을 입력하면 사주와 점성술 분석을 기반으로 성장에 좋은 시기를 알려드려요.'
          : 'Enter your birth date to get personalized growth timing based on Saju and astrology analysis.'}
      </p>

      <div className={styles.destinyInputs}>
        <div className={styles.inputGroup}>
          <DateTimePicker
            value={birthDate}
            onChange={setBirthDate}
            label={isKo ? '생년월일' : 'Birth Date'}
            locale={isKo ? 'ko' : 'en'}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="birthTime">{isKo ? '출생 시간 (선택)' : 'Birth Time (optional)'}</label>
          <input
            type="time"
            id="birthTime"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className={styles.timeInput}
          />
        </div>
        <button
          onClick={onGenerate}
          disabled={!birthDate || isLoading}
          className={styles.destinyButton}
        >
          {isLoading
            ? isKo
              ? '분석 중...'
              : 'Analyzing...'
            : isKo
              ? '운명 분석하기'
              : 'Analyze Destiny'}
        </button>
      </div>

      {fortune && (
        <div className={styles.destinyResults}>
          {/* Today's Fortune */}
          <div className={styles.fortuneCard}>
            <h3>
              <span>✨</span>
              {isKo ? '오늘의 운세' : "Today's Fortune"}
            </h3>
            <div className={styles.fortuneScores}>
              <div className={styles.fortuneScore}>
                <span className={styles.scoreLabel}>{isKo ? '종합' : 'Overall'}</span>
                <span className={styles.scoreValue}>{fortune.overall}점</span>
              </div>
              <div className={styles.fortuneScore}>
                <span className={styles.scoreLabel}>{isKo ? '연애' : 'Love'}</span>
                <span className={styles.scoreValue}>{fortune.love}점</span>
              </div>
              <div className={styles.fortuneScore}>
                <span className={styles.scoreLabel}>{isKo ? '커리어' : 'Career'}</span>
                <span className={styles.scoreValue}>{fortune.career}점</span>
              </div>
            </div>
            {fortune.recommendations.length > 0 && (
              <div className={styles.fortuneTips}>
                <p>💡 {fortune.recommendations[0]}</p>
              </div>
            )}
          </div>

          {/* Growth Dates */}
          {growthDates.length > 0 && (
            <div className={styles.growthDatesCard}>
              <h3>
                <span>📅</span>
                {isKo
                  ? `${primaryOctantLabel} 성장에 좋은 날`
                  : `Best Days for ${primaryOctantLabel} Growth`}
              </h3>
              <div className={styles.datesList}>
                {growthDates.map((d, i) => (
                  <div key={i} className={styles.dateItem}>
                    <span className={styles.dateGrade}>
                      {d.grade === 0 ? '🌟' : d.grade === 1 ? '⭐' : '✨'}
                    </span>
                    <span className={styles.dateValue}>
                      {new Date(d.date).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                    <span className={styles.dateCategory}>
                      {d.categories
                        .slice(0, 2)
                        .map((c) => {
                          return isKo ? CATEGORY_NAMES[c]?.ko || c : CATEGORY_NAMES[c]?.en || c
                        })
                        .join(', ')}
                    </span>
                    <span className={styles.dateScore}>{d.score}점</span>
                  </div>
                ))}
              </div>
              <p className={styles.datesNote}>
                {isKo
                  ? '* 사주와 점성술이 교차 검증된 날짜만 표시됩니다.'
                  : '* Only dates cross-verified by Saju and astrology are shown.'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
