'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import { ICPCircumplex } from '@/components/icp';
import { AxisBar, ConfettiAnimation } from '@/components/shared';
import OctantRadar from './OctantRadar';
import useICPResult from './useICPResult';
import useDestinyAdvice from './useDestinyAdvice';
import styles from './result.module.css';

export default function ICPResultPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';

  const {
    mounted,
    analysis,
    authStatus,
    saveStatus,
    isSavedToDb,
    showConfetti,
    confettiParticles,
    handleSaveResult,
    handleDownload,
    handleShare,
  } = useICPResult(locale);

  const {
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    destinyAdvice,
    handleGenerateDestinyAdvice,
  } = useDestinyAdvice(analysis);

  if (!mounted) {
    return (
      <main className={styles.page}>
        <div className={styles.bgGradient} />
        <div className={styles.stars}>
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i * 0.05) % 3}s`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
              }}
            />
          ))}
        </div>
        <div className={styles.loading}>
          <div className={styles.cosmicLoader}>
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicRing} />
            <div className={styles.cosmicCore}>🎭</div>
          </div>
          <p className={styles.loadingText}>
            {isKo ? '결과를 불러오는 중...' : 'Loading your results...'}
          </p>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎭</div>
          <h1>{isKo ? '결과 없음' : 'No Results Yet'}</h1>
          <p>
            {isKo
              ? '대인관계 스타일 진단을 완료하여 결과를 확인하세요'
              : 'Complete the ICP assessment to discover your interpersonal style'}
          </p>
          <Link href="/icp/quiz" className={styles.ctaButton}>
            {isKo ? '진단 시작하기' : 'Start Assessment'}
          </Link>
        </div>
      </main>
    );
  }

  const primaryOctant = analysis.primaryOctant;
  const secondaryOctant = analysis.secondaryOctant;

  return (
    <main className={styles.page}>
      {/* Animated Background */}
      <div className={styles.bgGradient} />
      <div className={styles.stars}>
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.05) % 3}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
            }}
          />
        ))}
      </div>

      {/* Confetti */}
      {showConfetti && (
        <ConfettiAnimation particles={confettiParticles} styles={styles} />
      )}

      {/* Back Button */}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <p className={styles.preTitle}>
            {isKo ? '당신의 대인관계 스타일' : 'Your Interpersonal Style'}
          </p>
          <h1 className={styles.styleName}>
            {isKo ? primaryOctant.korean : primaryOctant.name}
          </h1>
          <div className={styles.styleCode}>{analysis.primaryStyle}</div>
          <p className={styles.summary}>
            {isKo ? analysis.summaryKo : analysis.summary}
          </p>

          <div className={styles.badges}>
            <div className={styles.consistencyBadge}>
              <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
              <span className={styles.consistencyLabel}>
                {isKo ? '일관성' : 'Consistency'}
              </span>
            </div>
          </div>
        </section>

        {/* Axes Section */}
        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {isKo ? '대인관계 축' : 'Interpersonal Axes'}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={isKo ? '지배성' : 'Dominance'}
              score={analysis.dominanceScore}
              left={isKo ? '복종적' : 'Submissive'}
              right={isKo ? '지배적' : 'Dominant'}
              delay={0}
              styles={styles}
            />
            <AxisBar
              label={isKo ? '친화성' : 'Affiliation'}
              score={analysis.affiliationScore}
              left={isKo ? '적대적' : 'Hostile'}
              right={isKo ? '친화적' : 'Friendly'}
              delay={100}
              styles={styles}
            />
          </div>
        </section>

        {/* Circumplex Visualization */}
        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {isKo ? '대인관계 원형 분석' : 'Interpersonal Circumplex'}
          </h2>
          <div className={styles.circumplexWrapper}>
            <ICPCircumplex
              primaryStyle={analysis.primaryStyle}
              secondaryStyle={analysis.secondaryStyle ?? undefined}
              octantScores={analysis.octantScores}
              dominanceScore={(analysis.dominanceScore - 50) / 50}
              affiliationScore={(analysis.affiliationScore - 50) / 50}
            />
          </div>
        </section>

        {/* Octant Scores */}
        <section className={styles.octantSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎯</span>
            {isKo ? '8가지 스타일 점수' : '8 Octant Scores'}
          </h2>
          <OctantRadar scores={analysis.octantScores} isKo={isKo} />
        </section>

        {/* Primary Style Details */}
        <section className={styles.detailsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>✨</span>
            {isKo ? '주요 스타일 특성' : 'Primary Style Traits'}
          </h2>
          <div className={styles.traitsGrid}>
            {/* Traits */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>💫</span>
                <h3>{isKo ? '특성' : 'Traits'}</h3>
              </div>
              <div className={styles.traitTags}>
                {(isKo ? primaryOctant.traitsKo : primaryOctant.traits).map((trait) => (
                  <span key={trait} className={styles.tagTrait}>{trait}</span>
                ))}
              </div>
            </div>

            {/* Shadow */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>🌑</span>
                <h3>{isKo ? '그림자 측면' : 'Shadow Side'}</h3>
              </div>
              <p className={styles.traitText}>
                {isKo ? primaryOctant.shadowKo : primaryOctant.shadow}
              </p>
            </div>

            {/* Description */}
            <div className={styles.traitCard}>
              <div className={styles.traitHeader}>
                <span className={styles.traitIcon}>📝</span>
                <h3>{isKo ? '설명' : 'Description'}</h3>
              </div>
              <p className={styles.traitText}>
                {isKo ? primaryOctant.descriptionKo : primaryOctant.description}
              </p>
            </div>
          </div>
        </section>

        {/* Growth Recommendations - General Tips */}
        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {isKo ? '성장 팁' : 'Growth Tips'}
          </h2>
          <p className={styles.growthIntro}>
            {isKo
              ? `${primaryOctant.korean}의 핵심 성장 포인트:`
              : `Key growth points for ${primaryOctant.name}:`}
          </p>
          <div className={styles.growthCards}>
            {(isKo ? primaryOctant.growthRecommendationsKo : primaryOctant.growthRecommendations).map((rec, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Destiny-Based Personalized Advice */}
        <section className={styles.destinySection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {isKo ? '운명 기반 맞춤 조언' : 'Destiny-Based Personalized Advice'}
          </h2>
          <p className={styles.destinyIntro}>
            {isKo
              ? '생년월일을 입력하면 사주와 점성술 분석을 기반으로 성장에 좋은 시기를 알려드려요.'
              : 'Enter your birth date to get personalized growth timing based on Saju and astrology analysis.'}
          </p>

          <div className={styles.destinyInputs}>
            <div className={styles.inputGroup}>
              <label htmlFor="birthDate">
                {isKo ? '생년월일' : 'Birth Date'}
              </label>
              <input
                type="date"
                id="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={styles.dateInput}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="birthTime">
                {isKo ? '출생 시간 (선택)' : 'Birth Time (optional)'}
              </label>
              <input
                type="time"
                id="birthTime"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={styles.timeInput}
              />
            </div>
            <button
              onClick={handleGenerateDestinyAdvice}
              disabled={!birthDate || destinyAdvice.isLoading}
              className={styles.destinyButton}
            >
              {destinyAdvice.isLoading
                ? (isKo ? '분석 중...' : 'Analyzing...')
                : (isKo ? '운명 분석하기' : 'Analyze Destiny')}
            </button>
          </div>

          {destinyAdvice.fortune && (
            <div className={styles.destinyResults}>
              {/* Today's Fortune */}
              <div className={styles.fortuneCard}>
                <h3>
                  <span>✨</span>
                  {isKo ? '오늘의 운세' : "Today's Fortune"}
                </h3>
                <div className={styles.fortuneScores}>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '종합' : 'Overall'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.overall}점</span>
                  </div>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '연애' : 'Love'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.love}점</span>
                  </div>
                  <div className={styles.fortuneScore}>
                    <span className={styles.scoreLabel}>{isKo ? '커리어' : 'Career'}</span>
                    <span className={styles.scoreValue}>{destinyAdvice.fortune.career}점</span>
                  </div>
                </div>
                {destinyAdvice.fortune.recommendations.length > 0 && (
                  <div className={styles.fortuneTips}>
                    <p>💡 {destinyAdvice.fortune.recommendations[0]}</p>
                  </div>
                )}
              </div>

              {/* Growth Dates */}
              {destinyAdvice.growthDates.length > 0 && (
                <div className={styles.growthDatesCard}>
                  <h3>
                    <span>📅</span>
                    {isKo
                      ? `${primaryOctant.korean} 성장에 좋은 날`
                      : `Best Days for ${primaryOctant.name} Growth`}
                  </h3>
                  <div className={styles.datesList}>
                    {destinyAdvice.growthDates.map((d, i) => (
                      <div key={i} className={styles.dateItem}>
                        <span className={styles.dateGrade}>
                          {d.grade === 0 ? '🌟' : d.grade === 1 ? '⭐' : '✨'}
                        </span>
                        <span className={styles.dateValue}>
                          {new Date(d.date).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                        <span className={styles.dateCategory}>
                          {d.categories.slice(0, 2).map(c => {
                            const catNames: Record<string, { ko: string; en: string }> = {
                              career: { ko: '커리어', en: 'Career' },
                              love: { ko: '연애', en: 'Love' },
                              wealth: { ko: '재물', en: 'Wealth' },
                              health: { ko: '건강', en: 'Health' },
                              study: { ko: '학업', en: 'Study' },
                              travel: { ko: '여행', en: 'Travel' },
                              general: { ko: '전반', en: 'General' },
                            };
                            return isKo ? catNames[c]?.ko || c : catNames[c]?.en || c;
                          }).join(', ')}
                        </span>
                        <span className={styles.dateScore}>{d.score}점</span>
                      </div>
                    ))}
                  </div>
                  <p className={styles.datesNote}>
                    {isKo
                      ? '* 사주와 점성술이 교차 검증된 날짜만 표시됩니다.'
                      : '* Only dates cross-verified by Saju and astrology are shown.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Therapeutic Questions */}
        <section className={styles.questionsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💭</span>
            {isKo ? '자기 탐색 질문' : 'Self-Reflection Questions'}
          </h2>
          <div className={styles.questionsList}>
            {(isKo ? primaryOctant.therapeuticQuestionsKo : primaryOctant.therapeuticQuestions).map((q, i) => (
              <div key={i} className={styles.questionItem}>
                <span className={styles.questionBullet}>•</span>
                <p>{q}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary Style (if exists) */}
        {secondaryOctant && (
          <section className={styles.secondarySection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎭</span>
              {isKo ? '보조 스타일' : 'Secondary Style'}
            </h2>
            <div className={styles.secondaryCard}>
              <div className={styles.secondaryHeader}>
                <span className={styles.secondaryCode}>{analysis.secondaryStyle}</span>
                <span className={styles.secondaryName}>
                  {isKo ? secondaryOctant.korean : secondaryOctant.name}
                </span>
              </div>
              <p className={styles.secondaryDesc}>
                {isKo ? secondaryOctant.descriptionKo : secondaryOctant.description}
              </p>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <section className={styles.actions}>
          <button
            onClick={handleSaveResult}
            className={`${styles.saveButton} ${isSavedToDb ? styles.saved : ''}`}
            disabled={saveStatus === 'saving' || isSavedToDb}
          >
            <span>
              {saveStatus === 'saving' ? '⏳' : isSavedToDb ? '✅' : authStatus === 'authenticated' ? '💾' : '🔐'}
            </span>
            {saveStatus === 'saving'
              ? (isKo ? '저장 중...' : 'Saving...')
              : isSavedToDb
                ? (isKo ? '저장됨!' : 'Saved!')
                : authStatus === 'authenticated'
                  ? (isKo ? '결과 저장' : 'Save Result')
                  : (isKo ? '로그인하여 저장' : 'Login to Save')}
          </button>

          <button onClick={handleShare} className={styles.shareButton}>
            <span>📤</span> {isKo ? '결과 공유' : 'Share Result'}
          </button>
          <button onClick={handleDownload} className={styles.downloadButton}>
            <span>📥</span> {isKo ? 'JSON 다운로드' : 'Download JSON'}
          </button>
          <Link href="/icp/quiz" className={styles.retakeButton}>
            <span>🔄</span> {isKo ? '다시 진단하기' : 'Retake Assessment'}
          </Link>
          <Link href="/personality/combined" className={styles.retakeButton}>
            <span>🔗</span> {isKo ? '통합 성격 분석' : 'Combined Analysis'}
          </Link>
        </section>
      </div>
    </main>
  );
}
