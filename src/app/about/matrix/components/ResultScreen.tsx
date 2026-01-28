import React from 'react';
import { LAYERS, LEVEL_INFO } from '../constants';
import type { LayerCard, MatrixResult, PersonalInsight } from '../constants';
import { Particles } from './Particles';

interface ResultScreenProps {
  styles: Record<string, string>;
  result: MatrixResult | null;
  activeIndex: number;
  activeLayer: LayerCard;
  isFlipped: boolean;
  setIsFlipped: (value: boolean) => void;
  revealedLayers: Set<number>;
  insight: PersonalInsight | null;
  totalCells: number;
  goToLayer: (index: number) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  onBack: () => void;
}

export function ResultScreen({
  styles,
  result,
  activeIndex,
  activeLayer,
  isFlipped,
  setIsFlipped,
  revealedLayers,
  insight,
  totalCells,
  goToLayer,
  handleTouchStart,
  handleTouchEnd,
  onBack,
}: ResultScreenProps) {
  return (
    <div className={styles.container} tabIndex={0}>
      <Particles styles={styles} count={20} />

      {/* Header with score */}
      <header className={styles.resultHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          ← 처음으로
        </button>

        <div className={styles.scoreDisplay}>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreValue}>{result?.summary.totalScore || 0}</span>
            <span className={styles.scoreMax}>/100</span>
          </div>
          <div className={styles.scoreInfo}>
            <h2>당신의 운명 융합 점수</h2>
            <p>{result?.summary.cellsMatched || 0}개 셀 매칭 · {result?.summary.layersProcessed || 0}개 레이어 분석</p>
          </div>
        </div>

        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <span className={styles.quickIcon}>💪</span>
            <span>{result?.summary.strengthCount || 0} 강점</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickIcon}>⚠️</span>
            <span>{result?.summary.cautionCount || 0} 주의</span>
          </div>
        </div>
      </header>

      {/* Layer Progress */}
      <div className={styles.layerProgress}>
        {LAYERS.map((layer, i) => (
          <button
            key={layer.layer}
            className={`${styles.layerDot} ${i === activeIndex ? styles.activeDot : ''} ${revealedLayers.has(i) ? styles.revealed : ''}`}
            onClick={() => goToLayer(i)}
            style={{ '--layer-color': layer.color } as React.CSSProperties}
          >
            <span className={styles.layerDotIcon}>{layer.icon}</span>
            <span className={styles.layerDotNum}>L{layer.layer}</span>
          </button>
        ))}
      </div>

      {/* Main Card */}
      <main
        className={styles.cardArea}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          className={`${styles.navArrow} ${styles.navLeft}`}
          onClick={() => goToLayer(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          ‹
        </button>

        <div
          className={`${styles.card} ${isFlipped ? styles.flipped : ''} ${revealedLayers.has(activeIndex) ? styles.cardRevealed : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ '--card-color': activeLayer.color } as React.CSSProperties}
        >
          {/* Card Front */}
          <div className={styles.cardFront}>
            <div className={styles.cardGlow} />
            <div className={styles.layerBadge}>Layer {activeLayer.layer}</div>

            {insight && (
              <div className={styles.personalScore} style={{ '--level-color': LEVEL_INFO[insight.level].color } as React.CSSProperties}>
                <span className={styles.levelIcon}>{LEVEL_INFO[insight.level].icon}</span>
                <span className={styles.levelLabel}>{LEVEL_INFO[insight.level].label}</span>
              </div>
            )}

            <div className={styles.mainIcon}>{activeLayer.icon}</div>
            <h2 className={styles.cardTitle}>{activeLayer.title}</h2>
            <p className={styles.cardTitleEn}>{activeLayer.titleEn}</p>

            <div className={styles.fusionVisual}>
              <div className={styles.fusionSide}>
                <span className={styles.fusionIcon}>{activeLayer.eastIcon}</span>
                <span className={styles.fusionLabel}>{activeLayer.eastLabel}</span>
              </div>
              <div className={styles.fusionCenter}>
                <span className={styles.fusionArrow}>⟷</span>
                <span className={styles.fusionX}>✦</span>
              </div>
              <div className={styles.fusionSide}>
                <span className={styles.fusionIcon}>{activeLayer.westIcon}</span>
                <span className={styles.fusionLabel}>{activeLayer.westLabel}</span>
              </div>
            </div>

            {insight && insight.matchedCells > 0 && (
              <div className={styles.matchedCells}>
                <span className={styles.matchedNum}>{insight.matchedCells}</span>
                <span className={styles.matchedLabel}>/ {activeLayer.cells} 셀 매칭</span>
              </div>
            )}

            <p className={styles.tapHint}>탭하여 상세 분석 보기</p>
          </div>

          {/* Card Back - Personal Analysis */}
          <div className={styles.cardBack}>
            <div className={styles.cardGlow} />
            <div className={styles.layerBadge}>Layer {activeLayer.layer}</div>

            <h3 className={styles.backTitle}>📊 개인 분석 결과</h3>

            <p className={styles.backDescription}>{activeLayer.description}</p>

            {insight && insight.highlights.length > 0 ? (
              <div className={styles.personalInsights}>
                <h4>당신의 주요 포인트</h4>
                <ul className={styles.insightList}>
                  {insight.highlights.map((h, i) => (
                    <li key={i} className={styles.insightItem}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.noData}>
                <span>📭</span>
                <p>이 레이어에서 특별한 상호작용이 감지되지 않았습니다.</p>
              </div>
            )}

            <div className={styles.backMeta}>
              <div className={styles.metaRow}>
                <span>🌏 동양</span>
                <span>{activeLayer.eastLabel}</span>
              </div>
              <div className={styles.metaRow}>
                <span>🌍 서양</span>
                <span>{activeLayer.westLabel}</span>
              </div>
            </div>

            <p className={styles.tapHint}>탭하여 돌아가기</p>
          </div>
        </div>

        <button
          className={`${styles.navArrow} ${styles.navRight}`}
          onClick={() => goToLayer(activeIndex + 1)}
          disabled={activeIndex === LAYERS.length - 1}
        >
          ›
        </button>
      </main>

      {/* Summary Section */}
      {result && (
        <div className={styles.summarySection}>
          {result.highlights.strengths && result.highlights.strengths.length > 0 && (
            <div className={styles.summaryCard}>
              <h4>💪 주요 강점</h4>
              <ul>
                {result.highlights.strengths.map((s, i) => (
                  <li key={i}>
                    <span className={styles.summaryLayer}>L{s.layer}</span>
                    <span>{s.keyword}</span>
                    <span className={styles.summaryScore}>+{s.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.highlights.cautions && result.highlights.cautions.length > 0 && (
            <div className={styles.summaryCard}>
              <h4>⚠️ 주의 포인트</h4>
              <ul>
                {result.highlights.cautions.map((c, i) => (
                  <li key={i}>
                    <span className={styles.summaryLayer}>L{c.layer}</span>
                    <span>{c.keyword}</span>
                    <span className={styles.summaryScoreLow}>{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 Destiny Fusion Matrix™. All Rights Reserved.</p>
        <p className={styles.footerNote}>
          10개 레이어, {totalCells.toLocaleString()}개 융합 셀 분석 완료
        </p>
      </footer>
    </div>
  );
}
