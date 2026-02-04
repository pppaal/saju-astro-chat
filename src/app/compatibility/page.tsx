'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import ServicePageLayout from '@/components/ui/ServicePageLayout'
import { useI18n } from '@/i18n/I18nProvider'
import { ShareButton } from '@/components/share/ShareButton'
import {
  generateCompatibilityCard,
  CompatibilityData,
} from '@/components/share/cards/CompatibilityCard'
import { useRouter } from 'next/navigation'
import ScrollToTop from '@/components/ui/ScrollToTop'
import CompatibilityTabs from '@/components/compatibility/CompatibilityTabs'
import { useUserProfile } from '@/hooks/useUserProfile'
import styles from './Compatibility.module.css'

import { useCompatibilityForm } from '@/hooks/useCompatibilityForm'
import { useCityAutocomplete } from '@/hooks/useCityAutocomplete'
import { useMyCircle } from '@/hooks/useMyCircle'
import { useCompatibilityAnalysis } from '@/hooks/useCompatibilityAnalysis'

import { parseResultSections, extractScore } from './lib'
import {
  PersonCard,
  SubmitButton,
  OverallScoreCard,
  ResultSectionsDisplay,
  GroupAnalysisSection,
  TimingGuideCard,
  ActionButtons,
} from './components'

export default function CompatPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data: session, status } = useSession()

  // Show tabs initially
  const [showTabs, setShowTabs] = useState(true)

  // Profile loading
  const { profile, loadProfile, loadingProfileBtn, profileLoadedMsg, profileLoadError } =
    useUserProfile({ skipAutoLoad: false })

  // Use extracted hooks
  const { count, setCount, persons, setPersons, updatePerson, fillFromCircle, onPickCity } =
    useCompatibilityForm(2)

  useCityAutocomplete(persons, setPersons)

  const { circlePeople, showCircleDropdown, setShowCircleDropdown, circleError } =
    useMyCircle(status)

  const {
    isLoading,
    error,
    setError,
    resultText,
    overallScore: apiScore,
    timing,
    actionItems,
    groupAnalysis,
    synergyBreakdown,
    isGroupResult,
    validate,
    analyzeCompatibility,
    resetResults,
  } = useCompatibilityAnalysis()

  const handleSubmit = useCallback(async () => {
    const errorMsg = validate(persons, count, t)
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    await analyzeCompatibility(persons)
  }, [persons, count, t, validate, setError, analyzeCompatibility])

  const handleBack = useCallback(() => {
    if (resultText) {
      resetResults()
    } else if (!showTabs) {
      setShowTabs(true)
    } else {
      router.push('/')
    }
  }, [resultText, showTabs, resetResults, router])

  const handleStartAnalysis = useCallback(() => {
    setShowTabs(false)
  }, [])

  const handleLoadProfile = useCallback(async () => {
    const success = await loadProfile(locale)
    if (success && profile.birthDate) {
      // Fill first person with user profile
      setPersons((prev) => {
        const next = [...prev]
        next[0] = {
          ...next[0],
          name: profile.name || next[0].name,
          date: profile.birthDate || next[0].date,
          time: profile.birthTime || next[0].time,
          cityQuery: profile.birthCity || next[0].cityQuery,
          timeZone: profile.timezone || next[0].timeZone,
        }
        return next
      })
    }
  }, [loadProfile, locale, profile, setPersons])

  // Parse results for beautiful display
  const sections = useMemo(() => (resultText ? parseResultSections(resultText) : []), [resultText])
  const overallScore = useMemo(
    () => apiScore ?? (resultText ? extractScore(resultText) : null),
    [apiScore, resultText]
  )

  return (
    <ServicePageLayout
      icon="💕"
      title={t('compatibilityPage.analysisTitle', 'Compatibility Analysis')}
      subtitle={t(
        'compatibilityPage.analysisSubtitle',
        'Discover relationship compatibility through astrological birth data'
      )}
      onBack={handleBack}
      backLabel={t('compatibilityPage.backToForm', 'Back')}
    >
      <main className={styles.page}>
        {/* Background Hearts - deterministic positions to avoid hydration mismatch */}
        <div className={styles.hearts}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.heart}
              style={{
                left: `${(i * 37 + 13) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animationDelay: `${(i * 0.4) % 8}s`,
                animationDuration: `${6 + (i % 4)}s`,
              }}
            >
              💖
            </div>
          ))}
        </div>

        {/* Tabs View */}
        {showTabs && !resultText && (
          <div className={styles.tabsWrapper}>
            <CompatibilityTabs onStartAnalysis={handleStartAnalysis} />
          </div>
        )}

        {!showTabs && !resultText && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>💕</div>
              <h1 className={styles.formTitle}>
                {t('compatibilityPage.title', 'Relationship Compatibility')}
              </h1>
              <p className={styles.formSubtitle}>
                {t('compatibilityPage.subtitle', 'Explore the cosmic connections between hearts')}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              {/* Load Profile Button */}
              {!profileLoadedMsg && (
                <button
                  type="button"
                  onClick={handleLoadProfile}
                  disabled={loadingProfileBtn}
                  className="w-full mb-5 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700
                    text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>{loadingProfileBtn ? '⏳' : '👤'}</span>
                  <span>
                    {loadingProfileBtn
                      ? t(
                          'compatibilityPage.loadingProfile',
                          locale === 'ko' ? '불러오는 중...' : 'Loading...'
                        )
                      : t(
                          'compatibilityPage.loadMyProfile',
                          locale === 'ko' ? '내 프로필 불러오기' : 'Load My Profile'
                        )}
                  </span>
                </button>
              )}

              {/* Profile loaded success message */}
              {profileLoadedMsg && (
                <div className="mb-5 p-3 bg-green-600/20 border border-green-600 rounded-lg text-green-400 text-center">
                  ✓{' '}
                  {t(
                    'compatibilityPage.profileLoaded',
                    locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'
                  )}
                </div>
              )}

              {/* Profile load error */}
              {profileLoadError && (
                <div className="mb-5 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  ⚠️ {profileLoadError}
                </div>
              )}

              {/* Circle load error */}
              {circleError && (
                <div className="mb-5 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  ⚠️ {circleError}
                </div>
              )}

              {/* Count Selector */}
              <div className={styles.countSelector}>
                <label htmlFor="count" className={styles.countLabel}>
                  {t('compatibilityPage.numberOfPeople', 'Number of People (2-5)')}
                </label>
                <input
                  id="count"
                  type="number"
                  min={2}
                  max={5}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={styles.countInput}
                />
              </div>

              {/* Person Cards - 2x2 Grid */}
              <div className={styles.personCardsGrid}>
                {persons.map((p, idx) => (
                  <PersonCard
                    key={idx}
                    person={p}
                    index={idx}
                    isAuthenticated={!!session}
                    circlePeople={circlePeople}
                    showCircleDropdown={showCircleDropdown === idx}
                    locale={locale}
                    t={t}
                    onUpdatePerson={updatePerson}
                    onSetPersons={setPersons}
                    onPickCity={onPickCity}
                    onToggleCircleDropdown={() =>
                      setShowCircleDropdown(showCircleDropdown === idx ? null : idx)
                    }
                    onFillFromCircle={fillFromCircle}
                  />
                ))}
              </div>

              {/* Submit Button */}
              <SubmitButton isLoading={isLoading} t={t} />

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {resultText && (
          <div className={`${styles.resultsContainer} ${styles.fadeIn}`}>
            {/* Result Header */}
            <div className={styles.resultHeader}>
              <div className={styles.resultIcon}>💕</div>
              <h1 className={styles.resultTitle}>
                {t('compatibilityPage.resultTitle', 'Compatibility Analysis')}
              </h1>
              <p className={styles.resultSubtitle}>
                {persons.map((p) => p.name || 'Person').join(' & ')}
              </p>
            </div>

            {/* Overall Score Circle */}
            {overallScore !== null && <OverallScoreCard score={overallScore} t={t} />}

            {/* Parsed Sections */}
            {sections.length > 0 ? (
              <ResultSectionsDisplay sections={sections} t={t} />
            ) : (
              // Fallback: plain text display with beautiful styling
              <div className={styles.interpretationText}>{resultText}</div>
            )}

            {/* Group Analysis Section */}
            {isGroupResult && groupAnalysis && (
              <GroupAnalysisSection
                groupAnalysis={groupAnalysis}
                synergyBreakdown={synergyBreakdown || undefined}
                personCount={persons.length}
                t={t}
              />
            )}

            {/* Timing Guide Section */}
            {timing && <TimingGuideCard timing={timing} isGroupResult={isGroupResult} t={t} />}

            {/* Action Items Section */}
            {actionItems.length > 0 && (
              <div className={styles.actionSection}>
                <div className={styles.resultCard}>
                  <div className={styles.resultCardGlow} />
                  <div className={styles.resultCardHeader}>
                    <span className={styles.resultCardIcon}>💪</span>
                    <h3 className={styles.resultCardTitle}>
                      {t('compatibilityPage.growthActions', 'Growth Actions')}
                    </h3>
                  </div>
                  <div className={styles.resultCardContent}>
                    <ul className={styles.actionList}>
                      {actionItems.map((item, idx) => (
                        <li key={idx} className={styles.actionItem}>
                          <span className={styles.actionNumber}>{idx + 1}</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Insights, Chat, Counselor, Tarot */}
            <ActionButtons persons={persons} resultText={resultText} t={t} />

            {/* Share Button */}
            <div className={styles.shareSection}>
              <ShareButton
                generateCard={() => {
                  const shareData: CompatibilityData = {
                    person1Name: persons[0]?.name || 'Person 1',
                    person2Name: persons[1]?.name || 'Person 2',
                    score: overallScore ?? 75,
                    relation: (persons[1]?.relation as 'lover' | 'friend' | 'other') || 'lover',
                    highlights: sections
                      .slice(0, 2)
                      .map((s) => s.content.split('\n')[0]?.slice(0, 80)),
                  }
                  return generateCompatibilityCard(shareData, 'og')
                }}
                filename="compatibility-result.png"
                shareTitle={t('compatibilityPage.shareTitle', 'Our Compatibility Result')}
                shareText={`${persons[0]?.name || 'Person 1'} & ${persons[1]?.name || 'Person 2'}: ${overallScore ?? '?'}% compatible! Check yours at destinypal.me/compatibility`}
                label={t('share.shareResult', 'Share Result')}
              />
            </div>
          </div>
        )}
      </main>
      <ScrollToTop threshold={400} />
    </ServicePageLayout>
  )
}
