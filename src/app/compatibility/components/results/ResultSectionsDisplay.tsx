import React from 'react'
import { sectionTitleKeys, type ParsedSection } from '../../lib'
import { ScoreBar } from '../shared'
import styles from '../../Compatibility.module.css'
import { repairMojibakeText } from '@/lib/text/mojibake'

interface ResultSectionsDisplayProps {
  sections: ParsedSection[]
  t: (key: string, fallback: string) => string
}

export const ResultSectionsDisplay = React.memo<ResultSectionsDisplayProps>(({ sections, t }) => {
  if (sections.length === 0) {
    return null
  }

  return (
    <div className={styles.resultSections}>
      {sections.map((section, idx) => (
        <div
          key={idx}
          className={`${styles.resultCard} ${section.content.length > 300 ? styles.resultCardFullWidth : ''}`}
        >
          <div className={styles.resultCardGlow} />
          <div className={styles.resultCardHeader}>
            <span className={styles.resultCardIcon}>{repairMojibakeText(section.icon)}</span>
            <h3 className={styles.resultCardTitle}>
              {sectionTitleKeys[section.title]
                ? t(sectionTitleKeys[section.title], section.title)
                : repairMojibakeText(section.title)}
            </h3>
          </div>
          <div className={styles.resultCardContent}>
            {section.content.split('\n').map((line, i) => {
              const cleanLine = repairMojibakeText(line)
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

              if (cleanLine.trim()) {
                return <p key={i}>{cleanLine}</p>
              }
              return null
            })}
          </div>
        </div>
      ))}
    </div>
  )
})

ResultSectionsDisplay.displayName = 'ResultSectionsDisplay'
