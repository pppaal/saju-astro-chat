import React from 'react'
import { sectionTitleKeys, type ParsedSection } from '../../lib'
import { ScoreBar } from '../shared'
import styles from '../../Compatibility.module.css'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface ResultSectionsDisplayProps {
  sections: ParsedSection[]
  t: (key: string, fallback: string) => string
  locale: 'ko' | 'en'
}

const cleanMarkdownLine = (line: string) => {
  const repaired = repairMojibakeText(line)
  return repaired
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const SECTION_HEADING_REGEX =
  /^(Overall Score|Relationship Analysis|Detailed Scores|Saju Analysis|Astrology Analysis|Cross-System Analysis|Plain-Language Compatibility Guide|Scenario-Based Relationship Guide|Personality & Emotional Fit|Intimacy Chemistry|Future Flow & Best Meeting Windows|Strengths|Challenges|Advice|Summary|[가-힣\s/&·]+분석|[가-힣\s/&·]+점수|[가-힣\s/&·]+궁합|한눈에 보는 궁합 해설|상황별 관계 운영 가이드|강점|과제|조언|요약)$/i

const labelMapKo: Record<string, string> = {
  'Fusion score (Saju + Astrology)': '융합 점수 (사주 + 점성)',
  'Cross-system consistency score': '교차 시스템 일관성 점수',
  'Top synastry aspects': '주요 궁합 포인트',
  'Key house overlays': '핵심 하우스 포인트',
}

export const ResultSectionsDisplay = React.memo<ResultSectionsDisplayProps>(
  ({ sections, t, locale }) => {
    if (sections.length === 0) {
      return null
    }

    return (
      <div className={styles.resultSections}>
        {sections.map((section, idx) => {
          const repairedTitle = repairMojibakeText(section.title)
            .replace(/^#{1,6}\s*/, '')
            .trim()
          const translatedTitle = sectionTitleKeys[repairedTitle]
            ? t(sectionTitleKeys[repairedTitle], repairedTitle)
            : repairedTitle

          return (
            <div
              key={idx}
              className={`${styles.resultCard} ${section.content.length > 300 ? styles.resultCardFullWidth : ''}`}
            >
              <div className={styles.resultCardGlow} />
              <div className={styles.resultCardHeader}>
                <span className={styles.resultCardIcon}>{repairMojibakeText(section.icon)}</span>
                <h3 className={styles.resultCardTitle}>{translatedTitle}</h3>
              </div>
              <div className={styles.resultCardContent}>
                {section.content.split('\n').map((line, i) => {
                  const cleanLine = cleanMarkdownLine(line)
                  if (!cleanLine || SECTION_HEADING_REGEX.test(cleanLine)) {
                    return null
                  }

                  const scoreMatch = cleanLine.match(/(\d{1,3})(?:\s*)?(?:%|\uC810|\/100)/)
                  if (scoreMatch) {
                    const lineScore = Number.parseInt(scoreMatch[1], 10)
                    if (lineScore >= 0 && lineScore <= 100) {
                      return (
                        <div key={i}>
                          <p>{cleanLine.replace(scoreMatch[0], '').trim()}</p>
                          <ScoreBar score={lineScore} t={t} />
                        </div>
                      )
                    }
                  }

                  const normalizedLabelKey = cleanLine.replace(/:$/, '')
                  const displayLine =
                    locale === 'ko' && labelMapKo[normalizedLabelKey]
                      ? `${labelMapKo[normalizedLabelKey]}${cleanLine.endsWith(':') ? ':' : ''}`
                      : cleanLine

                  return displayLine.trim() ? <p key={i}>{displayLine}</p> : null
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)

ResultSectionsDisplay.displayName = 'ResultSectionsDisplay'
