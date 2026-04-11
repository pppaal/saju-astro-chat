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
  backgroundDomainHeadline?: string
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
  backgroundDomainHeadline,
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
  const summaryText = safeActionSummary || interpretedAnswer?.directAnswer || ''
  void weekSummary
  void monthSummary
  void topDomains
  void relationshipWeatherSummary
  void workMoneyWeatherSummary

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

      {summaryText && (
        <div className={styles.quickSummaryBlock}>
          <span className={styles.quickSummaryLabel}>
            {locale === 'ko' ? '지금 할 일' : 'Do now'}
          </span>
          <p className={styles.quickSummaryText}>{summaryText}</p>
        </div>
      )}

      <p className={styles.quickScanThesis}>{quickThesis}</p>

      <div className={styles.quickScanMeta}>
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '오늘 등급' : 'Today'}: {unifiedDayLabel}
        </span>
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '대표 축' : 'Focus'}: {focusDomainHeadline}
        </span>
        {backgroundDomainHeadline && backgroundDomainHeadline !== actionFocusDomainHeadline ? (
          <span className={styles.quickMetaChip}>
            {locale === 'ko' ? '배경 축' : 'Background'}: {backgroundDomainHeadline}
          </span>
        ) : null}
        {(canonicalPhaseLabel || matrixPhase) && (
          <span className={styles.quickMetaChip}>
            {locale === 'ko' ? '흐름' : 'Flow'}: {canonicalPhaseLabel || matrixPhase}
          </span>
        )}
        <span className={styles.quickMetaChip}>
          {locale === 'ko' ? '신뢰도' : 'Reliability'}: {reliabilityHeadline}
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
