'use client'

import styles from './HexagramComparison.module.css'
import type { Hexagram } from '@/lib/iChing/iChingData'

interface HexagramComparisonProps {
  primaryHexagram: Hexagram
  resultingHexagram?: Hexagram
  changingLineIndices: number[]
}

export function HexagramComparison({
  primaryHexagram,
  resultingHexagram,
  changingLineIndices,
}: HexagramComparisonProps) {
  const hasChangingLines = changingLineIndices.length > 0 && resultingHexagram

  // Convert binary string to line array (0 = broken, 1 = solid)
  const primaryLines = primaryHexagram.binary.split('').map(Number)
  const resultingLines = resultingHexagram?.binary.split('').map(Number)

  return (
    <div className={styles.comparisonContainer}>
      <div className={styles.hexagramWrapper}>
        <div className={styles.hexagramCard}>
          <div className={styles.hexagramTitle}>
            <span className={styles.titleIcon}>☯</span>
            <h3 className={styles.titleText}>Present</h3>
          </div>
          <div className={styles.hexagramVisual}>
            {primaryLines.reverse().map((line, idx) => {
              const originalIdx = 5 - idx
              const isChanging = changingLineIndices.includes(originalIdx)
              return (
                <div
                  key={idx}
                  className={`${styles.line} ${line === 1 ? styles.solid : styles.broken} ${
                    isChanging ? styles.changing : ''
                  }`}
                >
                  {isChanging && <div className={styles.changingPulse} />}
                </div>
              )
            })}
          </div>
          <div className={styles.hexagramInfo}>
            <div className={styles.hexagramName}>
              {primaryHexagram.name} {primaryHexagram.symbol}
            </div>
            <div className={styles.hexagramNumber}>Hexagram #{primaryHexagram.number}</div>
          </div>
        </div>

        {hasChangingLines && resultingLines && (
          <>
            <div className={styles.arrow}>
              <div className={styles.arrowLine} />
              <span className={styles.arrowIcon}>→</span>
              <div className={styles.arrowLabel}>Transforms to</div>
            </div>

            <div className={styles.hexagramCard}>
              <div className={styles.hexagramTitle}>
                <span className={styles.titleIcon}>✨</span>
                <h3 className={styles.titleText}>Future</h3>
              </div>
              <div className={styles.hexagramVisual}>
                {resultingLines.reverse().map((line, idx) => {
                  const originalIdx = 5 - idx
                  const isChanged = changingLineIndices.includes(originalIdx)
                  return (
                    <div
                      key={idx}
                      className={`${styles.line} ${line === 1 ? styles.solid : styles.broken} ${
                        isChanged ? styles.changed : ''
                      }`}
                    >
                      {isChanged && (
                        <div className={styles.changedBadge}>
                          <span>↻</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className={styles.hexagramInfo}>
                <div className={styles.hexagramName}>
                  {resultingHexagram.name} {resultingHexagram.symbol}
                </div>
                <div className={styles.hexagramNumber}>Hexagram #{resultingHexagram.number}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {hasChangingLines && (
        <div className={styles.changingSummary}>
          <span className={styles.summaryIcon}>⚡</span>
          <span className={styles.summaryText}>
            {changingLineIndices.length}{' '}
            {changingLineIndices.length === 1 ? 'line is' : 'lines are'} transforming
          </span>
        </div>
      )}
    </div>
  )
}
