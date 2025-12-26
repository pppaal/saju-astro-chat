'use client';

import React, { useState } from 'react';
import styles from './AdvancedAnalysisPanel.module.css';

interface AdvancedAnalysis {
  tier1?: {
    gongmang?: {
      emptyBranches: string[];
      isAffected: boolean;
      affectedAreas: string[];
    };
    shinsal?: {
      active: Array<{
        name: string;
        type: 'lucky' | 'unlucky' | 'special';
        description: string;
      }>;
      score: number;
    };
    energyFlow?: {
      strength: string;
      dominantElement: string;
      tonggeunCount: number;
      tuechulCount: number;
    };
    hourlyAdvice?: Array<{
      hour: number;
      quality: string;
      activity: string;
    }>;
  };
  tier2?: {
    daeunSync?: {
      currentDaeun?: {
        stem: string;
        branch: string;
        age: number;
      };
      transitAlignment: number;
      majorThemes: string[];
    };
  };
  tier3?: {
    moonPhase?: {
      phase: string;
      illumination: number;
      name: string;
    };
    voidOfCourse?: {
      isVoid: boolean;
      endsAt?: string;
    };
    retrogrades?: string[];
    sajuPatterns?: {
      found: Array<{
        name: string;
        rarity: number;
        description: string;
      }>;
      rarityScore: number;
    };
  };
}

interface AdvancedAnalysisPanelProps {
  analysis: AdvancedAnalysis;
  locale: 'ko' | 'en';
}

// 상수 객체로 분리
const STRENGTH_LABELS: Record<string, { ko: string; en: string }> = {
  very_strong: { ko: '매우 강함', en: 'Very Strong' },
  strong: { ko: '강함', en: 'Strong' },
  moderate: { ko: '보통', en: 'Moderate' },
  weak: { ko: '약함', en: 'Weak' },
  very_weak: { ko: '매우 약함', en: 'Very Weak' },
};

const SHINSAL_ICONS: Record<string, string> = {
  lucky: '✨',
  unlucky: '⚠️',
  special: '🔮',
};

const QUALITY_STYLES: Record<string, string> = {
  excellent: 'excellent',
  good: 'good',
  neutral: 'neutral',
};

export default function AdvancedAnalysisPanel({ analysis, locale }: AdvancedAnalysisPanelProps) {
  const [expandedTier, setExpandedTier] = useState<number | null>(1);

  const toggleTier = (tier: number) => {
    setExpandedTier(expandedTier === tier ? null : tier);
  };

  const getStrengthLabel = (strength: string) =>
    STRENGTH_LABELS[strength]?.[locale] ?? strength;

  const getShinsalTypeIcon = (type: string) =>
    SHINSAL_ICONS[type] ?? '•';

  const getQualityClass = (quality: string) =>
    styles[QUALITY_STYLES[quality] ?? 'neutral'];

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>
        {locale === 'ko' ? '🔬 고급 분석 (TIER 1~3)' : '🔬 Advanced Analysis (TIER 1~3)'}
      </h3>

      {/* TIER 1: Ultra-Precision */}
      {analysis.tier1 && (
        <div className={styles.tierSection}>
          <button
            className={`${styles.tierHeader} ${expandedTier === 1 ? styles.expanded : ''}`}
            onClick={() => toggleTier(1)}
          >
            <span className={styles.tierIcon}>🎯</span>
            <span className={styles.tierTitle}>
              {locale === 'ko' ? 'TIER 1: 초정밀 분석' : 'TIER 1: Ultra-Precision'}
            </span>
            <span className={styles.expandIcon}>{expandedTier === 1 ? '−' : '+'}</span>
          </button>

          {expandedTier === 1 && (
            <div className={styles.tierContent}>
              {/* Gongmang */}
              {analysis.tier1.gongmang && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>
                      {analysis.tier1.gongmang.isAffected ? '⚠️' : '✅'}
                    </span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '공망 (空亡)' : 'Gongmang (Empty)'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <p>
                      {locale === 'ko'
                        ? `공망 지지: ${analysis.tier1.gongmang.emptyBranches.join(', ')}`
                        : `Empty Branches: ${analysis.tier1.gongmang.emptyBranches.join(', ')}`}
                    </p>
                    {analysis.tier1.gongmang.isAffected && (
                      <p className={styles.warning}>
                        {locale === 'ko'
                          ? `⚠️ ${analysis.tier1.gongmang.affectedAreas.join(', ')} 영역 주의`
                          : `⚠️ Caution in: ${analysis.tier1.gongmang.affectedAreas.join(', ')}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Shinsal */}
              {analysis.tier1.shinsal && analysis.tier1.shinsal.active.length > 0 && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>🌟</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '신살 (神殺)' : 'Shinsal (Spirits)'}
                    </span>
                    <span className={styles.scoreChip}>
                      {analysis.tier1.shinsal.score > 0 ? '+' : ''}{analysis.tier1.shinsal.score}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <ul className={styles.shinsalList}>
                      {analysis.tier1.shinsal.active.map((s, i) => (
                        <li key={i} className={styles[s.type]}>
                          <span className={styles.shinsalIcon}>{getShinsalTypeIcon(s.type)}</span>
                          <span className={styles.shinsalName}>{s.name}</span>
                          <span className={styles.shinsalDesc}>{s.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Energy Flow */}
              {analysis.tier1.energyFlow && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>⚡</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '에너지 흐름' : 'Energy Flow'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.energyGrid}>
                      <div className={styles.energyItem}>
                        <span className={styles.energyLabel}>
                          {locale === 'ko' ? '강도' : 'Strength'}
                        </span>
                        <span className={styles.energyValue}>
                          {getStrengthLabel(analysis.tier1.energyFlow.strength)}
                        </span>
                      </div>
                      <div className={styles.energyItem}>
                        <span className={styles.energyLabel}>
                          {locale === 'ko' ? '주도 오행' : 'Dominant'}
                        </span>
                        <span className={styles.energyValue}>
                          {analysis.tier1.energyFlow.dominantElement}
                        </span>
                      </div>
                      <div className={styles.energyItem}>
                        <span className={styles.energyLabel}>
                          {locale === 'ko' ? '통근' : 'Roots'}
                        </span>
                        <span className={styles.energyValue}>
                          {analysis.tier1.energyFlow.tonggeunCount}개
                        </span>
                      </div>
                      <div className={styles.energyItem}>
                        <span className={styles.energyLabel}>
                          {locale === 'ko' ? '투출' : 'Revealed'}
                        </span>
                        <span className={styles.energyValue}>
                          {analysis.tier1.energyFlow.tuechulCount}개
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hourly Advice */}
              {analysis.tier1.hourlyAdvice && analysis.tier1.hourlyAdvice.length > 0 && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>⏰</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '최적 시간대' : 'Best Hours'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.hourlyGrid}>
                      {analysis.tier1.hourlyAdvice.map((h, i) => (
                        <div
                          key={i}
                          className={`${styles.hourChip} ${getQualityClass(h.quality)}`}
                        >
                          <span className={styles.hourNumber}>{h.hour}시</span>
                          <span className={styles.hourQuality}>
                            {h.quality === 'excellent' ? '⭐' : '👍'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIER 2: Daeun-Transit Sync */}
      {analysis.tier2?.daeunSync && (() => {
        const { daeunSync } = analysis.tier2;
        const { currentDaeun } = daeunSync;
        return (
          <div className={styles.tierSection}>
            <button
              className={`${styles.tierHeader} ${expandedTier === 2 ? styles.expanded : ''}`}
              onClick={() => toggleTier(2)}
            >
              <span className={styles.tierIcon}>🌟</span>
              <span className={styles.tierTitle}>
                {locale === 'ko' ? 'TIER 2: 대운-트랜짓 동기화' : 'TIER 2: Daeun-Transit Sync'}
              </span>
              <span className={styles.expandIcon}>{expandedTier === 2 ? '−' : '+'}</span>
            </button>

            {expandedTier === 2 && (
              <div className={styles.tierContent}>
                {currentDaeun && (
                  <div className={styles.analysisItem}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemIcon}>🔮</span>
                      <span className={styles.itemTitle}>
                        {locale === 'ko' ? '현재 대운' : 'Current Daeun'}
                      </span>
                    </div>
                    <div className={styles.itemContent}>
                      <div className={styles.daeunDisplay}>
                        <span className={styles.daeunGanji}>
                          {currentDaeun.stem}
                          {currentDaeun.branch}
                        </span>
                        <span className={styles.daeunAge}>
                          ({currentDaeun.age}세~)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>📊</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '트랜짓 정렬도' : 'Transit Alignment'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.alignmentBar}>
                      <div
                        className={styles.alignmentFill}
                        style={{ width: `${daeunSync.transitAlignment}%` }}
                      />
                      <span className={styles.alignmentValue}>
                        {daeunSync.transitAlignment}%
                      </span>
                    </div>
                  </div>
                </div>

                {daeunSync.majorThemes.length > 0 && (
                  <div className={styles.analysisItem}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemIcon}>🎯</span>
                      <span className={styles.itemTitle}>
                        {locale === 'ko' ? '주요 테마' : 'Major Themes'}
                      </span>
                    </div>
                    <div className={styles.itemContent}>
                      <div className={styles.themeChips}>
                        {daeunSync.majorThemes.map((theme, i) => (
                          <span key={i} className={styles.themeChip}>{theme}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* TIER 3: Advanced Astrology */}
      {analysis.tier3 && (
        <div className={styles.tierSection}>
          <button
            className={`${styles.tierHeader} ${expandedTier === 3 ? styles.expanded : ''}`}
            onClick={() => toggleTier(3)}
          >
            <span className={styles.tierIcon}>🌙</span>
            <span className={styles.tierTitle}>
              {locale === 'ko' ? 'TIER 3: 고급 점성술' : 'TIER 3: Advanced Astrology'}
            </span>
            <span className={styles.expandIcon}>{expandedTier === 3 ? '−' : '+'}</span>
          </button>

          {expandedTier === 3 && (
            <div className={styles.tierContent}>
              {/* Moon Phase */}
              {analysis.tier3.moonPhase && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>🌙</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '달 위상' : 'Moon Phase'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.moonDisplay}>
                      <span className={styles.moonName}>{analysis.tier3.moonPhase.name}</span>
                      <span className={styles.moonIllumination}>
                        {analysis.tier3.moonPhase.illumination}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Void of Course */}
              {analysis.tier3.voidOfCourse && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>
                      {analysis.tier3.voidOfCourse.isVoid ? '⚠️' : '✅'}
                    </span>
                    <span className={styles.itemTitle}>Void of Course</span>
                  </div>
                  <div className={styles.itemContent}>
                    <p className={analysis.tier3.voidOfCourse.isVoid ? styles.warning : ''}>
                      {analysis.tier3.voidOfCourse.isVoid
                        ? (locale === 'ko' ? '⚠️ 공전 중 - 중요 결정 보류 권장' : '⚠️ Void - Delay important decisions')
                        : (locale === 'ko' ? '✅ 달 활성 상태' : '✅ Moon Active')}
                    </p>
                  </div>
                </div>
              )}

              {/* Retrogrades */}
              {analysis.tier3.retrogrades && analysis.tier3.retrogrades.length > 0 && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>🔄</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '역행 행성' : 'Retrograde Planets'}
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.retrogradeChips}>
                      {analysis.tier3.retrogrades.map((planet, i) => (
                        <span key={i} className={styles.retrogradeChip}>
                          {planet} ℞
                        </span>
                      ))}
                    </div>
                    {analysis.tier3.retrogrades.includes('Mercury') && (
                      <p className={styles.retrogradeWarning}>
                        {locale === 'ko'
                          ? '⚠️ 수성 역행 - 계약/소통 재검토 필요'
                          : '⚠️ Mercury Rx - Review contracts/communication'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Saju Patterns */}
              {analysis.tier3.sajuPatterns && analysis.tier3.sajuPatterns.found.length > 0 && (
                <div className={styles.analysisItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>✨</span>
                    <span className={styles.itemTitle}>
                      {locale === 'ko' ? '사주 패턴' : 'Saju Patterns'}
                    </span>
                    <span className={styles.rarityBadge}>
                      {locale === 'ko' ? '희귀도' : 'Rarity'}: {analysis.tier3.sajuPatterns.rarityScore}/100
                    </span>
                  </div>
                  <div className={styles.itemContent}>
                    <ul className={styles.patternList}>
                      {analysis.tier3.sajuPatterns.found.map((pattern, i) => (
                        <li key={i} className={styles.patternItem}>
                          <span className={styles.patternName}>{pattern.name}</span>
                          <span className={styles.patternRarity}>({pattern.rarity}%)</span>
                          <p className={styles.patternDesc}>{pattern.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
