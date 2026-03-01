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
  /^(overall score|relationship analysis|detailed scores|saju analysis|astrology analysis|cross-system analysis|plain-language compatibility guide|scenario-based relationship guide|personality & emotional fit|intimacy chemistry|future flow & best meeting windows|strengths|challenges|advice|summary|한눈에 보는 궁합 해설|상황별 관계 운영 가이드|강점|과제|조언|요약)$/i

const SCORE_KEYWORD_LINE_REGEX =
  /^(?:score|overall score|compatibility score|점수|종합 점수|총점)\s*[:：]?\s*(\d{1,3})(?:\s*%|\/100)?$/i
const SCORE_VALUE_LINE_REGEX = /^(\d{1,3})\s*(?:%|\/100)$/i
const SCORE_LABEL_ONLY_REGEX =
  /^(?:score|overall score|compatibility score|점수|종합 점수|총점)\s*[:：]?$/i

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

          const renderedRows: React.ReactNode[] = []
          const lines = section.content.split('\n')
          const seenParagraphs = new Set<string>()
          let expectScoreValueNext = false
          let prevParagraphKey = ''

          for (let i = 0; i < lines.length; i += 1) {
            const cleanLine = cleanMarkdownLine(lines[i])
            if (!cleanLine || SECTION_HEADING_REGEX.test(cleanLine)) {
              continue
            }

            const scoreKeywordMatch = cleanLine.match(SCORE_KEYWORD_LINE_REGEX)
            if (scoreKeywordMatch) {
              const lineScore = Number.parseInt(scoreKeywordMatch[1], 10)
              if (lineScore >= 0 && lineScore <= 100) {
                renderedRows.push(<ScoreBar key={`score-${idx}-${i}`} score={lineScore} t={t} />)
              }
              expectScoreValueNext = false
              continue
            }

            if (SCORE_LABEL_ONLY_REGEX.test(cleanLine)) {
              expectScoreValueNext = true
              continue
            }

            const scoreValueMatch = expectScoreValueNext
              ? cleanLine.match(SCORE_VALUE_LINE_REGEX)
              : null
            if (scoreValueMatch) {
              const lineScore = Number.parseInt(scoreValueMatch[1], 10)
              if (lineScore >= 0 && lineScore <= 100) {
                renderedRows.push(
                  <ScoreBar key={`score-next-${idx}-${i}`} score={lineScore} t={t} />
                )
              }
              expectScoreValueNext = false
              continue
            }
            expectScoreValueNext = false

            const normalizedLabelKey = cleanLine.replace(/:$/, '')
            const displayLine =
              locale === 'ko' && labelMapKo[normalizedLabelKey]
                ? `${labelMapKo[normalizedLabelKey]}${cleanLine.endsWith(':') ? ':' : ''}`
                : cleanLine

            const paragraph = displayLine.trim()
            if (!paragraph) {
              continue
            }

            const paragraphKey = paragraph.toLowerCase()
            if (paragraphKey === prevParagraphKey) {
              continue
            }
            if (paragraph.length > 40 && seenParagraphs.has(paragraphKey)) {
              continue
            }

            seenParagraphs.add(paragraphKey)
            prevParagraphKey = paragraphKey
            renderedRows.push(<p key={`line-${idx}-${i}`}>{paragraph}</p>)
          }

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
              <div className={styles.resultCardContent}>{renderedRows}</div>
            </div>
          )
        })}
      </div>
    )
  }
)

ResultSectionsDisplay.displayName = 'ResultSectionsDisplay'
