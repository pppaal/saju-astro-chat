import type { CalendarContent } from '../../lib'
import styles from '../../history.module.css'

type CalendarDetailModalProps = {
  detail: CalendarContent
}

const GRADE_META: Record<number, { emoji: string; label: string }> = {
  0: { emoji: '💫', label: '최고 집중일' },
  1: { emoji: '🌟', label: '강한 추진일' },
  2: { emoji: '✨', label: '무난한 흐름' },
  3: { emoji: '⭐', label: '보수 운영일' },
  4: { emoji: '⚠️', label: '주의 필요일' },
}

const CATEGORY_LABELS: Record<string, string> = {
  wealth: '💰 재물',
  career: '💼 커리어',
  love: '💕 관계',
  health: '💪 건강',
  travel: '✈️ 이동',
  study: '📚 학습',
  general: '⭐ 전반',
}

export function CalendarDetailModal({ detail }: CalendarDetailModalProps) {
  const gradeMeta = GRADE_META[detail.grade] || GRADE_META[2]
  const dailyView = detail.presentation?.dailyView
  const daySummary = detail.presentation?.daySummary
  const surfaceCards = detail.presentation?.surfaceCards || []
  const recommendedActions = detail.presentation?.recommendedActions || detail.recommendations || []
  const cautions = detail.presentation?.cautions || detail.warnings || []

  return (
    <div className={styles.calendarDetail}>
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>📅</span>
        <div>
          <h2>운명 캘린더</h2>
          <p className={styles.destinyTheme}>{detail.date}</p>
        </div>
      </div>

      <div className={styles.calendarGrade}>
        <span className={styles.gradeEmoji}>{gradeMeta.emoji}</span>
        <span className={styles.gradeLabel}>{gradeMeta.label}</span>
        <span className={styles.scoreText}>점수: {detail.score}/100</span>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{detail.title}</h3>
        {detail.summary && <p className={styles.calendarSummary}>{detail.summary}</p>}
        <p>{detail.description}</p>
      </div>

      {(dailyView || daySummary) && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>🧭</span> 오늘 해석 요약
          </h3>
          <div className={styles.aiBlock}>
            <h4>직접 답</h4>
            <p>{dailyView?.oneLineSummary || daySummary?.summary}</p>
          </div>
          <div className={styles.aiBlock}>
            <h4>핵심 축</h4>
            <p>
              집중 영역은 {dailyView?.frontDomainLabel || daySummary?.focusDomain}, 신뢰도는{' '}
              {dailyView?.reliability || daySummary?.reliability}입니다.
            </p>
          </div>
          {dailyView?.doNow && (
            <div className={styles.aiBlock}>
              <h4>지금 할 일</h4>
              <p>{dailyView.doNow}</p>
            </div>
          )}
          {dailyView?.watchOut && (
            <div className={styles.aiBlock}>
              <h4>주의</h4>
              <p>{dailyView.watchOut}</p>
            </div>
          )}
        </div>
      )}

      {surfaceCards.length > 0 && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>🗂️</span> 핵심 판단 축
          </h3>
          {surfaceCards.map((card) => (
            <div key={`${card.key}-${card.summary}`} className={styles.aiBlock}>
              <h4>
                {card.label}
                {card.tag ? ` · ${card.tag}` : ''}
              </h4>
              <p>{card.summary}</p>
              {card.visual?.kind === 'branch' && card.visual.rows.length > 0 && (
                <ul className={styles.analysisList}>
                  {card.visual.rows.map((row) => (
                    <li key={`${card.key}-${row.label}-${row.text}`}>
                      {row.label}: {row.text}
                    </li>
                  ))}
                </ul>
              )}
              {card.details && card.details.length > 0 && (
                <ul className={styles.analysisList}>
                  {card.details.map((detailLine) => (
                    <li key={`${card.key}-${detailLine}`}>{detailLine}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {detail.categories && detail.categories.length > 0 && (
        <div className={styles.calendarCategories}>
          {detail.categories.map((category) => (
            <span key={category} className={styles.categoryTag}>
              {CATEGORY_LABELS[category] || `⭐ ${category}`}
            </span>
          ))}
        </div>
      )}

      {detail.bestTimes && detail.bestTimes.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>강한 시간대</h3>
          <div className={styles.bestTimesList}>
            {detail.bestTimes.map((time) => (
              <span key={time} className={styles.bestTimeItem}>
                {time}
              </span>
            ))}
          </div>
        </div>
      )}

      {((detail.sajuFactors && detail.sajuFactors.length > 0) ||
        (detail.astroFactors && detail.astroFactors.length > 0)) && (
        <div className={styles.aiSection}>
          <h3 className={styles.aiSectionTitle}>
            <span>✨</span> 사주·점성 근거
          </h3>
          <ul className={styles.analysisList}>
            {[...(detail.sajuFactors || []), ...(detail.astroFactors || [])].map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendedActions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>추천 행동</h3>
          <ul className={styles.analysisList}>
            {recommendedActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {cautions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>주의사항</h3>
          <ul className={styles.analysisList}>
            {cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className={styles.timestamp}>저장일: {new Date(detail.createdAt).toLocaleString()}</p>
    </div>
  )
}
