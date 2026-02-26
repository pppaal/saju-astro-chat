'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import ServicePageLayout from '@/components/ui/ServicePageLayout'
import { useI18n } from '@/i18n/I18nProvider'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import styles from './Compatibility.module.css'

import { ShareButton } from '@/components/share/ShareButton'
import ScrollToTop from '@/components/ui/ScrollToTop'

// Lazy load heavy components
const CompatibilityTabs = dynamic(() => import('@/components/compatibility/CompatibilityTabs'), {
  loading: () => <div style={{ minHeight: '300px' }} />,
})

// Dynamic import for share card generation (only needed when sharing)
const loadShareCardModule = () => import('@/components/share/cards/CompatibilityCard')

// Type import for share data
import type { CompatibilityData } from '@/components/share/cards/CompatibilityCard'

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

const KO_COMPAT_FALLBACKS: Record<string, string> = {
  'compatibilityPage.analysisTitle': '궁합 분석',
  'compatibilityPage.analysisSubtitle': '점성술 출생 데이터를 통해 관계 궁합 알아보기',
  'compatibilityPage.backToForm': '뒤로',
  'compatibilityPage.title': '관계 궁합',
  'compatibilityPage.subtitle': '마음과 마음 사이의 우주적 연결을 탐험하세요',
  'compatibilityPage.loadingProfile': '불러오는 중...',
  'compatibilityPage.loadMyProfile': '내 프로필',
  'compatibilityPage.profileLoaded': '프로필을 불러왔습니다!',
  'compatibilityPage.numberOfPeople': '인원수 (2 ~ 4명)',
  'compatibilityPage.resultTitle': '궁합 분석',
  'compatibilityPage.growthActions': '성장을 위한 행동 지침',
  'compatibilityPage.shareTitle': '우리의 궁합 결과',
  'compatibilityPage.score': '점수',
  'compatibilityPage.overallCompatibility': '종합 궁합',
  'compatibilityPage.groupRoles': '그룹 내 역할',
  'compatibilityPage.groupElementDistribution': '그룹 오행 분포',
  'compatibilityPage.pairwiseMatrix': '1:1 궁합 매트릭스',
  'compatibilityPage.timingGuide': '타이밍 가이드',
  'compatibilityPage.thisMonth': '이번 달',
  'compatibilityPage.groupActivities': '그룹 활동',
  'compatibilityPage.recommendedDays': '추천 날짜',
  'compatibilityPage.synergyBreakdown': '시너지 세부 분석',
  'compatibilityPage.labels.saju': '사주',
  'compatibilityPage.labels.astro': '점성',
  'compatibilityPage.roles.leader': '리더',
  'compatibilityPage.roles.mediator': '중재자',
  'compatibilityPage.roles.catalyst': '촉매자',
  'compatibilityPage.roles.stabilizer': '안정화 담당',
  'compatibilityPage.roles.creative': '창의 담당',
  'compatibilityPage.roles.emotional': '감정 중심',
  'compatibilityPage.synergy.pairAverage': '페어 평균',
  'compatibilityPage.synergy.fiveElementsBonus': '오행 보너스',
  'compatibilityPage.synergy.astrologyBonus': '점성 보너스',
  'compatibilityPage.synergy.roleBonus': '역할 보너스',
  'compatibilityPage.synergy.samhapBonus': '삼합 보너스',
  'compatibilityPage.synergy.banghapBonus': '방합 보너스',
  'compatibilityPage.synergy.teamSizeAdjustment': '인원수 보정',
  'compatibilityPage.synergy.bestPair': '최고 페어',
  'compatibilityPage.synergy.weakestPair': '주의 페어',
  'compatibilityPage.elementTitles.fiveElements': '오행 분포',
  'compatibilityPage.elementTitles.astroElements': '점성 원소 분포',
  'compatibilityPage.elementTitles.dominantElement': '강한 원소',
  'compatibilityPage.elementTitles.lackingElement': '부족한 원소',
  'compatibilityPage.elements.wood': '목(木)',
  'compatibilityPage.elements.fire': '화(火)',
  'compatibilityPage.elements.earth': '토(土)',
  'compatibilityPage.elements.metal': '금(金)',
  'compatibilityPage.elements.water': '수(水)',
  'compatibilityPage.astroElements.fire': '불',
  'compatibilityPage.astroElements.earth': '흙',
  'compatibilityPage.astroElements.air': '바람',
  'compatibilityPage.astroElements.water': '물',
}

export default function CompatPage() {
  const { t, locale } = useI18n()
  const normalizedLocale: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'
  const router = useRouter()
  const { data: session, status } = useSession()

  // Show tabs initially
  const [showTabs, setShowTabs] = useState(true)

  // Profile loading
  const { profile, loadProfile, loadingProfileBtn, profileLoadedMsg, profileLoadError } =
    useUserProfile({ skipAutoLoad: false })

  // Use extracted hooks
  const { count, setCount, persons, setPersons, updatePerson, fillFromCircle, onPickCity } =
    useCompatibilityForm(2, normalizedLocale)

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
    await analyzeCompatibility(persons, normalizedLocale)
  }, [persons, count, t, validate, setError, analyzeCompatibility, normalizedLocale])

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
          gender:
            profile.gender?.toLowerCase() === 'female' || profile.gender?.toLowerCase() === 'f'
              ? 'F'
              : profile.gender?.toLowerCase() === 'male' || profile.gender?.toLowerCase() === 'm'
                ? 'M'
                : next[0].gender,
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

  const compatT = useCallback(
    (key: string, fallback: string) => {
      if (normalizedLocale !== 'ko') {
        return t(key, fallback)
      }
      return t(key, KO_COMPAT_FALLBACKS[key] || fallback)
    },
    [normalizedLocale, t]
  )

  return (
    <ServicePageLayout
      icon={'\u{1F495}'}
      title={compatT('compatibilityPage.analysisTitle', 'Compatibility Analysis')}
      subtitle={compatT(
        'compatibilityPage.analysisSubtitle',
        'Discover relationship compatibility through astrological birth data'
      )}
      onBack={handleBack}
      backLabel={compatT('compatibilityPage.backToForm', 'Back')}
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
              {'\u{1F496}'}
            </div>
          ))}
        </div>

        {/* Tabs View */}
        {showTabs && !resultText && (
          <div className={styles.tabsWrapper}>
            <CompatibilityTabs
              onStartAnalysis={handleStartAnalysis}
              t={compatT}
              locale={normalizedLocale}
            />
          </div>
        )}

        {!showTabs && !resultText && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>{'\u{1F495}'}</div>
              <h1 className={styles.formTitle}>
                {compatT('compatibilityPage.title', 'Relationship Compatibility')}
              </h1>
              <p className={styles.formSubtitle}>
                {compatT(
                  'compatibilityPage.subtitle',
                  'Explore the cosmic connections between hearts'
                )}
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
                  <span>{loadingProfileBtn ? '\u23F3' : '\u{1F464}'}</span>
                  <span>
                    {loadingProfileBtn
                      ? compatT('compatibilityPage.loadingProfile', 'Loading...')
                      : compatT('compatibilityPage.loadMyProfile', 'Load My Profile')}
                  </span>
                </button>
              )}

              {/* Profile loaded success message */}
              {profileLoadedMsg && (
                <div className="mb-5 p-3 bg-green-600/20 border border-green-600 rounded-lg text-green-400 text-center">
                  {'\u2713'} {compatT('compatibilityPage.profileLoaded', 'Profile loaded!')}
                </div>
              )}

              {/* Profile load error */}
              {profileLoadError && (
                <div className="mb-5 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  {'\u26A0\uFE0F'} {profileLoadError}
                </div>
              )}

              {/* Circle load error */}
              {circleError && (
                <div className="mb-5 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  {'\u26A0\uFE0F'} {circleError}
                </div>
              )}

              {/* Count Selector */}
              <div className={styles.countSelector}>
                <label htmlFor="count" className={styles.countLabel}>
                  {compatT('compatibilityPage.numberOfPeople', 'Number of People (2-4)')}
                </label>
                <input
                  id="count"
                  type="number"
                  min={2}
                  max={4}
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
                    locale={normalizedLocale}
                    t={compatT}
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
              <SubmitButton isLoading={isLoading} t={compatT} />

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {resultText && (
          <div className={`${styles.resultsContainer} ${styles.fadeIn}`}>
            {/* Result Header */}
            <div className={styles.resultHeader}>
              <div className={styles.resultIcon}>{'\u{1F495}'}</div>
              <h1 className={styles.resultTitle}>
                {compatT('compatibilityPage.resultTitle', 'Compatibility Analysis')}
              </h1>
              <p className={styles.resultSubtitle}>
                {persons.map((p) => p.name || 'Person').join(' & ')}
              </p>
            </div>

            {/* Overall Score Circle */}
            {overallScore !== null && <OverallScoreCard score={overallScore} t={compatT} />}

            {/* Parsed Sections */}
            {sections.length > 0 ? (
              <ResultSectionsDisplay sections={sections} t={compatT} locale={normalizedLocale} />
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
                t={compatT}
              />
            )}

            {/* Timing Guide Section */}
            {timing && (
              <TimingGuideCard timing={timing} isGroupResult={isGroupResult} t={compatT} />
            )}

            {/* Action Items Section */}
            {actionItems.length > 0 && (
              <div className={styles.actionSection}>
                <div className={styles.resultCard}>
                  <div className={styles.resultCardGlow} />
                  <div className={styles.resultCardHeader}>
                    <span className={styles.resultCardIcon}>{'\u{1F4AA}'}</span>
                    <h3 className={styles.resultCardTitle}>
                      {compatT('compatibilityPage.growthActions', 'Growth Actions')}
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
            <ActionButtons persons={persons} resultText={resultText} t={compatT} />

            {/* Share Button */}
            <div className={styles.shareSection}>
              <ShareButton
                generateCard={async () => {
                  const { generateCompatibilityCard } = await loadShareCardModule()
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
                shareTitle={compatT('compatibilityPage.shareTitle', 'Our Compatibility Result')}
                shareText={`${persons[0]?.name || 'Person 1'} & ${persons[1]?.name || 'Person 2'}: ${overallScore ?? '?'}% compatible! Check yours at destinypal.me/compatibility`}
                label={compatT('share.shareResult', 'Share Result')}
              />
            </div>
          </div>
        )}
      </main>
      <ScrollToTop threshold={400} />
    </ServicePageLayout>
  )
}
