'use client'

import React from 'react'
import type { InterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
import styles from './DestinyCalendar.module.css'

interface QuickHighlightAgreementVisual {
  kind: 'agreement'
  agreementPercent: number
  contradictionPercent: number
  leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
}

interface QuickHighlightBranchVisual {
  kind: 'branch'
  rows: Array<{ label: string; text: string }>
}

type QuickHighlightVisual = QuickHighlightAgreementVisual | QuickHighlightBranchVisual

interface QuickHighlightCard {
  label: string
  tag?: string
  text: string
  details?: string[]
  visual?: QuickHighlightVisual
}

interface SelectedDateQuickScanSectionProps {
  locale: 'ko' | 'en'
  quickHighlightCards: QuickHighlightCard[]
  interpretedAnswer?: InterpretedAnswerContract
  safeActionSummary: string
  quickThesis: string
  unifiedDayLabel: string
  focusDomainHeadline: string
  actionFocusDomainHeadline: string
  canonicalPhaseLabel: string
  matrixPhase?: string
  reliabilityHeadline: string
  weekSummary?: string
  monthSummary?: string
  topDomains: Array<{ label: string; score: number }>
  relationshipWeatherSummary?: string
  workMoneyWeatherSummary?: string
  topTimingSignals: string[]
  quickDos: string[]
  quickDonts: string[]
  quickWindows: string[]
}

export function SelectedDateQuickScanSection({
  locale,
  quickHighlightCards,
  interpretedAnswer,
  safeActionSummary,
  quickThesis,
  unifiedDayLabel,
  focusDomainHeadline,
  actionFocusDomainHeadline,
  canonicalPhaseLabel,
  matrixPhase,
  reliabilityHeadline,
  weekSummary,
  monthSummary,
  topDomains,
  relationshipWeatherSummary,
  workMoneyWeatherSummary,
  topTimingSignals,
  quickDos,
  quickDonts,
  quickWindows,
}: SelectedDateQuickScanSectionProps) {
  return (
    <div className={styles.quickScanCard}>
      {quickHighlightCards.length > 0 && (
        <div className={styles.quickHeroGrid}>
          {quickHighlightCards.map((item) => (
            <div key={`${item.label}-${item.text}`} className={styles.quickHeroBlock}>
              <span className={styles.quickHeroLabel}>
                {item.label}
                {item.tag ? <span className={styles.quickHeroTag}>{item.tag}</span> : null}
              </span>
              <p className={styles.quickHeroText}>{item.text}</p>
              {item.visual?.kind === 'agreement' ? (
                <div className={styles.quickHeroMeterWrap}>
                  <div className={styles.quickHeroMeterRow}>
                    <span className={styles.quickHeroMeterLabel}>
                      {locale === 'ko' ? '합의' : 'Alignment'}
                    </span>
                    <span className={styles.quickHeroMeterValue}>
                      {item.visual.agreementPercent}%
                    </span>
                  </div>
                  <div className={styles.quickHeroMeterTrack}>
                    <div
                      className={`${styles.quickHeroMeterFill} ${styles.quickHeroMeterFillGood}`}
                      style={{ width: `${Math.max(6, item.visual.agreementPercent)}%` }}
                    />
                  </div>
                  <div className={styles.quickHeroMeterRow}>
                    <span className={styles.quickHeroMeterLabel}>
                      {locale === 'ko' ? '충돌' : 'Conflict'}
                    </span>
                    <span className={styles.quickHeroMeterValue}>
                      {item.visual.contradictionPercent}%
                    </span>
                  </div>
                  <div className={styles.quickHeroMeterTrack}>
                    <div
                      className={`${styles.quickHeroMeterFill} ${styles.quickHeroMeterFillRisk}`}
                      style={{ width: `${Math.max(6, item.visual.contradictionPercent)}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {item.visual?.kind === 'branch' && item.visual.rows.length ? (
                <div className={styles.quickHeroBranchGrid}>
                  {item.visual.rows.map((row) => (
                    <div
                      key={`${item.label}-${row.label}-${row.text}`}
                      className={styles.quickHeroBranchRow}
                    >
                      <span className={styles.quickHeroBranchLabel}>{row.label}</span>
                      <span className={styles.quickHeroBranchText}>{row.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {item.details?.length ? (
                <ul className={styles.quickHeroDetailList}>
                  {item.details.map((detail) => (
                    <li key={`${item.label}-${detail}`} className={styles.quickHeroDetailItem}>
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {safeActionSummary && (
        <div className={styles.quickSummaryBlock}>
          <span className={styles.quickSummaryLabel}>
            {locale === 'ko' ? '오늘 행동 요약' : 'Action summary'}
          </span>
          <p className={styles.quickSummaryText}>{safeActionSummary}</p>
        </div>
      )}

      {interpretedAnswer && (
        <div className={styles.quickSummaryBlock}>
          <span className={styles.quickSummaryLabel}>
            {locale === 'ko' ? '?? ??' : 'Interpretation'}
          </span>
          <p className={styles.quickSummaryText}>{interpretedAnswer.directAnswer}</p>
          {interpretedAnswer.timing.bestWindow && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '?? ?: ' : 'Best window: '}
              {interpretedAnswer.timing.bestWindow}
            </p>
          )}
          {interpretedAnswer.why.slice(0, 2).map((line, index) => (
            <p key={`interpreted-why-${index}`} className={styles.quickSummaryText}>
              {line}
            </p>
          ))}
          {interpretedAnswer.nextMove && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '?? ??: ' : 'Next move: '}
              {interpretedAnswer.nextMove}
            </p>
          )}
        </div>
      )}

      <p className={styles.quickScanThesis}>{quickThesis}</p>

      <div className={styles.quickScanMeta}>
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '오늘 등급' : 'Today'}: {unifiedDayLabel}
        </span>
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '핵심 분야' : 'Focus'}: {focusDomainHeadline}
        </span>
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '현재 행동축' : 'Action Axis'}: {actionFocusDomainHeadline}
        </span>
        {(canonicalPhaseLabel || matrixPhase) && (
          <span className={styles.quickMetaChip}>
            {locale === 'ko' ? '흐름' : 'Flow'}: {canonicalPhaseLabel || matrixPhase}
          </span>
        )}
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '신뢰' : 'Reliability'}: {reliabilityHeadline}
        </span>
      </div>

      {topTimingSignals.length > 0 && (
        <div className={styles.quickTimingSignalList}>
          {topTimingSignals.map((signal, index) => (
            <span key={`timing-signal-${index}`} className={styles.quickTimingSignalChip}>
              {signal}
            </span>
          ))}
        </div>
      )}

      {(weekSummary ||
        monthSummary ||
        topDomains.length > 0 ||
        relationshipWeatherSummary ||
        workMoneyWeatherSummary) && (
        <div className={styles.quickSummaryBlock}>
          <span className={styles.quickSummaryLabel}>
            {locale === 'ko' ? '주간/월간 흐름' : 'Week/Month flow'}
          </span>
          {weekSummary && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '주간: ' : 'Week: '}
              {weekSummary}
            </p>
          )}
          {monthSummary && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '월간: ' : 'Month: '}
              {monthSummary}
            </p>
          )}
          {topDomains.length > 0 && (
            <div className={styles.quickScanMeta}>
              {topDomains.slice(0, 3).map((item, index) => (
                <span key={`top-domain-${index}`} className={styles.quickMetaChip}>
                  {item.label} {Math.round(item.score * 100)}%
                </span>
              ))}
            </div>
          )}
          {relationshipWeatherSummary && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '관계: ' : 'Relationship: '}
              {relationshipWeatherSummary}
            </p>
          )}
          {workMoneyWeatherSummary && (
            <p className={styles.quickSummaryText}>
              {locale === 'ko' ? '일/돈: ' : 'Work/Money: '}
              {workMoneyWeatherSummary}
            </p>
          )}
        </div>
      )}

      <div className={styles.quickActionGrid}>
        <div className={styles.quickActionBlock}>
          <h4 className={styles.quickActionTitle}>{locale === 'ko' ? '추천' : 'Do'}</h4>
          <ul className={styles.quickActionList}>
            {quickDos.map((action, index) => (
              <li key={`do-${index}`}>{action}</li>
            ))}
          </ul>
        </div>
        <div className={styles.quickActionBlock}>
          <h4 className={styles.quickActionTitle}>{locale === 'ko' ? '주의' : "Don't"}</h4>
          <ul className={styles.quickActionList}>
            {quickDonts.map((action, index) => (
              <li key={`dont-${index}`}>{action}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.quickWindows}>
        <h4 className={styles.quickActionTitle}>
          {locale === 'ko' ? '좋은 시간' : 'Peak windows'}
        </h4>
        <div className={styles.quickWindowList}>
          {quickWindows.map((time, index) => (
            <span key={`window-${index}`} className={styles.quickWindowChip}>
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SelectedDateEvidenceDetailsProps {
  locale: 'ko' | 'en'
  detailInsight: string
  hasEvidence: boolean
  evidenceSummaryPrimary: string
  canonicalGradeReason: string
  canonicalRiskControl: string
  matrixGuardrail: string
  decisionRationale: string
  evidenceSummaryCross: string
  evidenceBridgeSummary: string
  evidenceScoreLine: string
}

export function SelectedDateEvidenceDetails({
  locale,
  detailInsight,
  hasEvidence,
  evidenceSummaryPrimary,
  canonicalGradeReason,
  canonicalRiskControl,
  matrixGuardrail,
  decisionRationale,
  evidenceSummaryCross,
  evidenceBridgeSummary,
  evidenceScoreLine,
}: SelectedDateEvidenceDetailsProps) {
  if (!detailInsight && !hasEvidence) return null

  return (
    <details className={styles.calendarEvidenceDetails}>
      <summary className={styles.calendarEvidenceSummary}>
        {locale === 'ko' ? '교차 결론 근거 보기' : 'Cross-evidence for conclusion'}
      </summary>
      <div className={styles.calendarEvidenceInner}>
        {detailInsight && <p className={styles.selectedDesc}>{detailInsight}</p>}
        {hasEvidence && (
          <ul className={styles.calendarEvidenceList}>
            {evidenceSummaryPrimary && <li>{evidenceSummaryPrimary}</li>}
            {canonicalGradeReason && (
              <li>
                {locale === 'ko' ? '등급 설명:' : 'Grade reason:'} {canonicalGradeReason}
              </li>
            )}
            {canonicalRiskControl && (
              <li>
                {locale === 'ko' ? '안전장치:' : 'Guardrail:'} {canonicalRiskControl}
              </li>
            )}
            {!canonicalRiskControl && matrixGuardrail && (
              <li>
                {locale === 'ko' ? '안전장치:' : 'Guardrail:'} {matrixGuardrail}
              </li>
            )}
            {decisionRationale && (
              <li>
                {locale === 'ko' ? '판단 정책:' : 'Decision policy:'} {decisionRationale}
              </li>
            )}
            {evidenceSummaryCross && <li>{evidenceSummaryCross}</li>}
            {evidenceBridgeSummary && <li>{evidenceBridgeSummary}</li>}
            {evidenceScoreLine && <li>{evidenceScoreLine}</li>}
          </ul>
        )}
      </div>
    </details>
  )
}

interface SelectedDateExtendedDetailsProps {
  locale: 'ko' | 'en'
  safeSajuFactors: string[]
  safeAstroFactors: string[]
  sajuTitle: string
  astroTitle: string
}

export function SelectedDateExtendedDetails({
  safeSajuFactors,
  safeAstroFactors,
  sajuTitle,
  astroTitle,
}: SelectedDateExtendedDetailsProps) {
  if (safeSajuFactors.length === 0 && safeAstroFactors.length === 0) return null

  return (
    <details className={styles.extendedDetails}>
      <summary className={styles.extendedDetailsSummary}>사주/점성 세부 근거</summary>
      <div className={styles.extendedDetailsBody}>
        {safeSajuFactors.length > 0 && (
          <div className={styles.analysisSection}>
            <h4 className={styles.analysisTitle}>
              <span className={styles.analysisBadge}>{'☿️'}</span>
              {sajuTitle}
            </h4>
            <ul className={styles.analysisList}>
              {safeSajuFactors.slice(0, 4).map((factor, i) => (
                <li key={i} className={styles.analysisItem}>
                  <span className={styles.analysisDotSaju}></span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {safeAstroFactors.length > 0 && (
          <div className={styles.analysisSection}>
            <h4 className={styles.analysisTitle}>
              <span className={styles.analysisBadge}>{'🌟'}</span>
              {astroTitle}
            </h4>
            <ul className={styles.analysisList}>
              {safeAstroFactors.slice(0, 4).map((factor, i) => (
                <li key={i} className={styles.analysisItem}>
                  <span className={styles.analysisDotAstro}></span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}
