import { RefObject } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import type { InsightResponse, ChatMessage } from '@/lib/dream/types';
import { SectionHeader } from '../SectionHeader';
import { ChatSection } from './ChatSection';
import { DreamSymbolsSection } from './DreamSymbolsSection';
import CopyButton from '@/components/ui/CopyButton';
import styles from './DreamResultPhase.module.css';

interface DreamResultPhaseProps {
  locale: string;
  result: InsightResponse;
  dreamText: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isChatLoading: boolean;
  chatMessagesRef: RefObject<HTMLDivElement | null>;
  onSendMessage: () => void;
  onReset: () => void;
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export function DreamResultPhase({
  locale,
  result,
  dreamText,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatMessagesRef,
  onSendMessage,
  onReset,
}: DreamResultPhaseProps) {
  const { t } = useI18n();

  return (
    <motion.div
      key="result"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${styles.phaseContainer} ${styles.resultPhase}`}
    >
      <button onClick={onReset} className={styles.resetButton}>
        <span className={styles.resetArrow}>←</span>
        {t('dream.buttonReset')}
      </button>

      <div className={styles.resultHeader}>
        <div className={styles.resultIconWrapper}>
          <span className={styles.resultIcon}>🌙</span>
          <div className={styles.resultIconRing}></div>
        </div>
        <h1 className={styles.resultMainTitle}>
          {t('dream.resultTitle')}
        </h1>
        <p className={styles.resultSubtitle}>
          {t('dream.resultSubtitle')}
        </p>
        {result.fromFallback && (
          <div className={styles.fallbackNotice}>
            {t('dream.fallbackNotice')}
          </div>
        )}
      </div>

      <div className={styles.resultLayout}>
        {/* Top Section - Summary & Chat */}
        <div className={styles.resultTopSection}>
          {/* Summary Card */}
          {result.summary && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.resultTitle}>📖 {t('dream.resultSummary')}</div>
                <CopyButton
                  text={result.summary}
                  label={t('common.copy')}
                  successMessage={t('common.copied')}
                />
              </div>
              <div className={styles.resultText}>{result.summary}</div>
            </div>
          )}

          {/* Dream Counselor Chat */}
          <ChatSection
            locale={locale}
            dreamText={dreamText}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatLoading={isChatLoading}
            chatMessagesRef={chatMessagesRef}
            onSendMessage={onSendMessage}
          />
        </div>

        {/* Bottom Section - Analysis Cards Grid */}
        <div className={styles.resultBottomSection}>
          {/* Dream Symbols */}
          {result.dreamSymbols && result.dreamSymbols.length > 0 && (
            <DreamSymbolsSection symbols={result.dreamSymbols} locale={locale} />
          )}

          {/* Two Column Grid - Cross Insights & Themes */}
          <div className={styles.analysisCardsGrid}>
            {/* Cross Insights */}
            {result.crossInsights && result.crossInsights.length > 0 && (
              <div className={styles.insightSection}>
                <SectionHeader icon="💡" title={t('dream.resultInsights')} />
                <div className={styles.insightsList}>
                  {result.crossInsights.map((insight, i) => (
                    <div key={i} className={styles.insightItem}>
                      <div className={styles.insightBullet}>{i + 1}</div>
                      <p className={styles.insightText}>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Themes */}
            {result.themes && result.themes.length > 0 && (
              <div className={styles.themesSection}>
                <SectionHeader icon="🎭" title={t('dream.resultThemes')} />
                <div className={styles.themesList}>
                  {result.themes.map((theme, i) => (
                    <div key={i} className={styles.themeItem}>
                      <div className={styles.themeInfo}>
                        <span className={styles.themeName}>{theme.label}</span>
                        <span className={styles.themePercent}>{Math.round(theme.weight * 100)}%</span>
                      </div>
                      <div className={styles.themeBarContainer}>
                        <div
                          className={styles.themeBarFill}
                          style={{
                            width: `${theme.weight * 100}%`,
                            background: `linear-gradient(90deg,
                              hsl(${180 + i * 30}, 70%, 60%),
                              hsl(${200 + i * 30}, 80%, 70%))`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className={styles.recommendationsSection}>
              <SectionHeader
                icon="🌟"
                title={t('dream.resultRecommendations')}
                badge={locale === 'ko' ? '실천 가이드' : 'Action Guide'}
              />
              <div className={styles.recommendationsGrid}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} className={styles.recommendationCard}>
                    <div className={styles.recommendationNumber}>{i + 1}</div>
                    {typeof rec === 'string' ? (
                      <p className={styles.recommendationText}>{rec}</p>
                    ) : (
                      <>
                        <h4 className={styles.recommendationTitle}>{rec.title}</h4>
                        <p className={styles.recommendationDetail}>{rec.detail}</p>
                      </>
                    )}
                    <div className={styles.recommendationGlow}></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lucky & Moon Phase - Side by Side */}
          <div className={styles.luckyMoonRow}>
            {/* Lucky Elements */}
            {result.luckyElements && (result.luckyElements.luckyNumbers?.length || result.luckyElements.luckyColors?.length) && (
              <div className={styles.luckySection}>
                <SectionHeader icon="🍀" title={t('dream.luckyElements')} />
                <div className={styles.luckyContent}>
                  {result.luckyElements.luckyNumbers && result.luckyElements.luckyNumbers.length > 0 && (
                    <div className={styles.luckyRow}>
                      <span className={styles.luckyLabel}>{t('dream.luckyNumbers')}</span>
                      <div className={styles.numberBalls}>
                        {result.luckyElements.luckyNumbers.map((num, i) => (
                          <span key={i} className={styles.numberBall}>{num}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.luckyColors && result.luckyElements.luckyColors.length > 0 && (
                    <div className={styles.luckyRow}>
                      <span className={styles.luckyLabel}>{t('dream.luckyColors')}</span>
                      <div className={styles.colorTags}>
                        {result.luckyElements.luckyColors.map((color, i) => (
                          <span key={i} className={styles.colorTag}>{color}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.advice && (
                    <p className={styles.luckyAdviceText}>{result.luckyElements.advice}</p>
                  )}
                </div>
              </div>
            )}

            {/* Moon Phase */}
            {result.celestial?.moon_phase && (
              <div className={styles.moonSection}>
                <SectionHeader
                  icon={result.celestial.moon_phase.emoji || '🌕'}
                  title={locale === 'ko' ? '달의 위상' : 'Moon Phase'}
                />
                <div className={styles.moonContent}>
                  <div className={styles.moonVisual}>
                    <span className={styles.moonEmoji}>{result.celestial.moon_phase.emoji || '🌕'}</span>
                    <span className={styles.moonName}>
                      {result.celestial.moon_phase.korean || result.celestial.moon_phase.name}
                    </span>
                  </div>
                  {result.celestial.moon_phase.dream_meaning && (
                    <p className={styles.moonMeaning}>{result.celestial.moon_phase.dream_meaning}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cultural Notes */}
          {result.culturalNotes && (result.culturalNotes.korean || result.culturalNotes.western || result.culturalNotes.chinese) && (
            <div className={styles.culturalSection}>
              <SectionHeader icon="🌏" title={t('dream.resultCultural')} />
              <div className={styles.culturalGrid}>
                {result.culturalNotes.korean && (
                  <div className={styles.culturalCard}>
                    <div className={styles.culturalFlag}>🇰🇷</div>
                    <h4 className={styles.culturalTitle}>{t('dream.korean')}</h4>
                    <p className={styles.culturalText}>{result.culturalNotes.korean}</p>
                  </div>
                )}
                {result.culturalNotes.western && (
                  <div className={styles.culturalCard}>
                    <div className={styles.culturalFlag}>🧠</div>
                    <h4 className={styles.culturalTitle}>{locale === 'ko' ? '서양/융' : 'Western'}</h4>
                    <p className={styles.culturalText}>{result.culturalNotes.western}</p>
                  </div>
                )}
                {result.culturalNotes.chinese && (
                  <div className={styles.culturalCard}>
                    <div className={styles.culturalFlag}>🇨🇳</div>
                    <h4 className={styles.culturalTitle}>{locale === 'ko' ? '중국' : 'Chinese'}</h4>
                    <p className={styles.culturalText}>{result.culturalNotes.chinese}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Taemong */}
          {result.premium_features?.taemong?.is_taemong && result.premium_features.taemong.primary_symbol && (
            <div className={`${styles.resultCard} ${styles.taemongCard}`}>
              <div className={styles.resultCardGlow}></div>
              <div className={styles.resultTitle}>👶 {locale === 'ko' ? '태몽 분석' : 'Conception Dream'}</div>
              <div className={styles.taemongContent}>
                <div className={styles.taemongSymbol}>
                  <strong>{locale === 'ko' ? '상징' : 'Symbol'}:</strong> {result.premium_features.taemong.primary_symbol.symbol}
                </div>
                {result.premium_features.taemong.primary_symbol.child_trait && (
                  <div className={styles.taemongTrait}>
                    <strong>{locale === 'ko' ? '아이 특성' : 'Child Trait'}:</strong> {result.premium_features.taemong.primary_symbol.child_trait}
                  </div>
                )}
                {result.premium_features.taemong.primary_symbol.gender_hint && (
                  <div className={styles.taemongGender}>
                    <strong>{locale === 'ko' ? '성별 힌트' : 'Gender Hint'}:</strong> {result.premium_features.taemong.primary_symbol.gender_hint}
                  </div>
                )}
                {result.premium_features.taemong.primary_symbol.interpretation && (
                  <p className={styles.resultText}>{result.premium_features.taemong.primary_symbol.interpretation}</p>
                )}
              </div>
            </div>
          )}

          {/* Symbol Combinations */}
          {result.premium_features?.combinations && result.premium_features.combinations.length > 0 && (
            <div className={styles.resultCard}>
              <div className={styles.resultCardGlow}></div>
              <div className={styles.resultTitle}>🔗 {locale === 'ko' ? '심볼 조합 분석' : 'Symbol Combinations'}</div>
              <ul className={styles.resultList}>
                {result.premium_features.combinations.map((combo, i) => (
                  <li key={i}>
                    <strong>{combo.combination}:</strong> {combo.interpretation || combo.meaning}
                    {combo.is_lucky && <span className={styles.luckyBadge}>🍀</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cosmic Influence */}
          {result.cosmicInfluence && (result.cosmicInfluence.moonPhaseEffect || result.cosmicInfluence.planetaryInfluence) && (
            <div className={styles.resultCard}>
              <div className={styles.resultCardGlow}></div>
              <div className={styles.resultTitle}>✨ {locale === 'ko' ? '우주적 영향' : 'Cosmic Influence'}</div>
              <div className={styles.cosmicContent}>
                {result.cosmicInfluence.moonPhaseEffect && (
                  <div className={styles.cosmicItem}>
                    <strong>🌙 {locale === 'ko' ? '달의 영향' : 'Moon Effect'}:</strong>
                    <p>{result.cosmicInfluence.moonPhaseEffect}</p>
                  </div>
                )}
                {result.cosmicInfluence.planetaryInfluence && (
                  <div className={styles.cosmicItem}>
                    <strong>🪐 {locale === 'ko' ? '행성 영향' : 'Planetary Effect'}:</strong>
                    <p>{result.cosmicInfluence.planetaryInfluence}</p>
                  </div>
                )}
                {result.cosmicInfluence.overallEnergy && (
                  <div className={styles.cosmicItem}>
                    <strong>⚡ {locale === 'ko' ? '종합 에너지' : 'Overall Energy'}:</strong>
                    <p>{result.cosmicInfluence.overallEnergy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ask Again Button */}
      <button className={styles.askAgainBtn} onClick={onReset}>
        <span>🌙</span>
        <span>{locale === 'ko' ? '다른 꿈 해석하기' : 'Interpret Another Dream'}</span>
      </button>
    </motion.div>
  );
}
