'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { ICPCircumplex } from '@/components/icp'
import { AxisBar, ConfettiAnimation } from '@/components/shared'
import OctantRadar from './OctantRadar'
import useICPResult from './useICPResult'
import useDestinyAdvice from './useDestinyAdvice'
import styles from './result.module.css'
import {
  StarsBackground,
  LoadingScreen,
  EmptyState,
  PrimaryStyleDetails,
  DestinyAdviceSection,
  ResultActions,
} from './components'

export default function ICPResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const combinedRedirectedRef = useRef(false)
  const { locale } = useI18n()
  const isKo = locale === 'ko'
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
    hasPersonaResult,
  } = useICPResult(locale)
  const singleView = searchParams.get('view') === 'single'
  const {
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    destinyAdvice,
    handleGenerateDestinyAdvice,
  } = useDestinyAdvice(analysis)

  useEffect(() => {
    if (mounted && analysis && hasPersonaResult && !singleView && !combinedRedirectedRef.current) {
      combinedRedirectedRef.current = true
      router.replace('/personality/combined')
    }
    if (!mounted || !analysis || !hasPersonaResult || singleView) {
      combinedRedirectedRef.current = false
    }
  }, [analysis, hasPersonaResult, mounted, router, singleView])

  if (!mounted) return <LoadingScreen styles={styles} isKo={isKo} />
  if (!analysis) return <EmptyState styles={styles} isKo={isKo} />

  const { primaryOctant, secondaryOctant } = analysis
  const t = (ko: string, en: string) => (isKo ? ko : en)
  const relationshipMode =
    analysis.dominanceScore >= 60
      ? t('주도적 소통', 'Leading communication')
      : analysis.dominanceScore <= 40
        ? t('신중한 소통', 'Careful communication')
        : t('균형 잡힌 소통', 'Balanced communication')
  const warmthMode =
    analysis.affiliationScore >= 60
      ? t('관계 친화적', 'Warm and affiliative')
      : analysis.affiliationScore <= 40
        ? t('거리 조절형', 'Boundary-first')
        : t('상황 적응형', 'Context-adaptive')
  const getBand = (score: number) => {
    if (score >= 67) return t('높음', 'High')
    if (score <= 33) return t('낮음', 'Low')
    return t('중간', 'Balanced')
  }
  const icpGuides = [
    {
      id: 'dominance',
      title: t('주도성 해석', 'Agency Interpretation'),
      score: analysis.dominanceScore,
      meaning:
        analysis.dominanceScore >= 67
          ? t(
              '의견 제시와 방향 설정을 먼저 수행하는 경향이 강합니다.',
              'You tend to propose direction and lead early.'
            )
          : analysis.dominanceScore <= 33
            ? t(
                '충분히 듣고 조율한 뒤 참여하는 신중한 스타일입니다.',
                'You prefer careful participation after listening and alignment.'
              )
            : t(
                '상황에 따라 리드와 협업을 균형 있게 전환합니다.',
                'You switch between leading and supporting by context.'
              ),
      action:
        analysis.dominanceScore >= 67
          ? t(
              '핵심 결정 전 상대 의견 1개를 먼저 확인해 마찰을 줄이세요.',
              'Before key decisions, confirm one opposing view.'
            )
          : analysis.dominanceScore <= 33
            ? t(
                '중요 회의에서 의견을 1회 먼저 말하는 연습을 해보세요.',
                'Practice sharing one early opinion in key meetings.'
              )
            : t(
                '리드/팔로우 역할을 미리 합의해 실행 속도를 높이세요.',
                'Pre-agree lead/follow roles to speed execution.'
              ),
    },
    {
      id: 'affiliation',
      title: t('관계 온도 해석', 'Warmth Interpretation'),
      score: analysis.affiliationScore,
      meaning:
        analysis.affiliationScore >= 67
          ? t(
              '신뢰와 친밀감을 빠르게 형성하는 강점이 있습니다.',
              'You build trust and rapport quickly.'
            )
          : analysis.affiliationScore <= 33
            ? t(
                '거리 조절과 객관성 유지에 강한 편입니다.',
                'You are strong at boundaries and objectivity.'
              )
            : t(
                '사람/과업 균형을 비교적 안정적으로 유지합니다.',
                'You maintain a stable people-task balance.'
              ),
      action:
        analysis.affiliationScore >= 67
          ? t(
              '수용 후에도 경계 문장 1개를 함께 말해 소진을 예방하세요.',
              'Add one boundary sentence after empathy.'
            )
          : analysis.affiliationScore <= 33
            ? t(
                '사실 설명 전에 감정 공감 문장 1개를 먼저 두세요.',
                'Add one empathy sentence before facts.'
              )
            : t(
                '관계 이슈는 주 1회 짧은 체크인으로 누적을 막으세요.',
                'Run a weekly short check-in for relationship issues.'
              ),
    },
    {
      id: 'confidence',
      title: t('결과 신뢰도 읽기', 'How to Read Confidence'),
      score: analysis.consistencyScore,
      meaning:
        analysis.consistencyScore >= 80
          ? t(
              '응답 패턴이 안정적이라 현재 성향을 선명하게 반영합니다.',
              'Response pattern is stable and clearly reflected.'
            )
          : analysis.consistencyScore <= 60
            ? t(
                '상황/컨디션의 영향이 포함될 수 있어 재검사를 권장합니다.',
                'Context/mood effects may be higher; retest is recommended.'
              )
            : t(
                '핵심 경향은 유효하며 일부 상황 변수도 함께 반영되었습니다.',
                'Core tendency is valid with moderate situational effects.'
              ),
      action:
        analysis.consistencyScore >= 80
          ? t(
              '현재 결과를 기준으로 성장 행동 1~2개를 바로 실행하세요.',
              'Execute 1-2 growth actions immediately from this result.'
            )
          : analysis.consistencyScore <= 60
            ? t(
                '2~3주 뒤 같은 조건에서 다시 검사해 추세를 비교하세요.',
                'Retake in 2-3 weeks under similar conditions.'
              )
            : t(
                '핵심 포인트 1개부터 적용하고 체감 변화를 기록하세요.',
                'Apply one key point first and track changes.'
              ),
    },
  ]
  const optionalGuides = [
    analysis.boundaryScore !== undefined
      ? {
          id: 'boundary',
          title: t('경계 유연성 해석', 'Boundary Flexibility'),
          score: analysis.boundaryScore,
          meaning:
            analysis.boundaryScore >= 67
              ? t(
                  '기준을 지키면서도 상황 조정이 가능합니다.',
                  'You keep standards while adapting to context.'
                )
              : analysis.boundaryScore <= 33
                ? t(
                    '과잉 수용/과잉 통제 사이 흔들릴 수 있습니다.',
                    'You may oscillate between over-giving and over-control.'
                  )
                : t(
                    '경계를 무리 없이 조정하는 편입니다.',
                    'You regulate boundaries reasonably well.'
                  ),
          action:
            analysis.boundaryScore >= 67
              ? t(
                  '요청 수락 전 여유 시간 확인 루틴을 유지하세요.',
                  'Keep a quick capacity check before accepting requests.'
                )
              : analysis.boundaryScore <= 33
                ? t(
                    '거절 문장 템플릿 1개를 만들어 반복 사용하세요.',
                    'Create one reusable decline template.'
                  )
                : t(
                    '협업 시작 시 역할/한계를 먼저 명시하세요.',
                    'Clarify roles and limits at collaboration start.'
                  ),
        }
      : null,
    analysis.resilienceScore !== undefined
      ? {
          id: 'resilience',
          title: t('회복 탄력 해석', 'Resilience Interpretation'),
          score: analysis.resilienceScore,
          meaning:
            analysis.resilienceScore >= 67
              ? t(
                  '갈등/피드백 이후 회복 전환이 빠른 편입니다.',
                  'You recover quickly after conflict or feedback.'
                )
              : analysis.resilienceScore <= 33
                ? t('스트레스 잔류 시간이 길어질 수 있습니다.', 'Stress residue may last longer.')
                : t(
                    '상황에 따라 회복 속도가 달라지는 보통 수준입니다.',
                    'Recovery speed is moderate and context-dependent.'
                  ),
          action:
            analysis.resilienceScore >= 67
              ? t(
                  '회복 루틴을 팀에도 공유해 재사용 가능하게 하세요.',
                  'Share your recovery routine with your team.'
                )
              : analysis.resilienceScore <= 33
                ? t(
                    '감정 정리 루틴(산책/메모/대화)을 고정 스케줄로 배치하세요.',
                    'Schedule a fixed decompression routine.'
                  )
                : t(
                    '강한 스트레스 이벤트 후 24시간 점검 루틴을 추가하세요.',
                    'Add a 24-hour check routine after stressful events.'
                  ),
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string
    title: string
    score: number
    meaning: string
    action: string
  }>

  return (
    <main className={styles.page}>
      <StarsBackground styles={styles} />
      {showConfetti && <ConfettiAnimation particles={confettiParticles} styles={styles} />}
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <div className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.preTitle}>
            {t('당신의 대인관계 스타일', 'Your Interpersonal Style')}
          </p>
          <h1 className={styles.styleName}>{isKo ? primaryOctant.korean : primaryOctant.name}</h1>
          <div className={styles.styleCode}>{analysis.primaryStyle}</div>
          <p className={styles.summary}>{isKo ? analysis.summaryKo : analysis.summary}</p>
          <div className={styles.badges}>
            <div className={styles.consistencyBadge}>
              <span className={styles.consistencyValue}>{analysis.consistencyScore}%</span>
              <span className={styles.consistencyLabel}>{t('신뢰도', 'Confidence')}</span>
            </div>
          </div>
        </section>

        <section className={styles.quickReadSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🧭</span>
            {t('한눈에 이해하기', 'Quick Read')}
          </h2>
          <div className={styles.quickReadGrid}>
            <article className={styles.quickReadCard}>
              <h3>{t('핵심 스타일', 'Core Style')}</h3>
              <p>{isKo ? primaryOctant.descriptionKo : primaryOctant.description}</p>
            </article>
            <article className={styles.quickReadCard}>
              <h3>{t('관계 모드', 'Relationship Mode')}</h3>
              <p>
                {relationshipMode} · {warmthMode}
              </p>
            </article>
            <article className={styles.quickReadCard}>
              <h3>{t('오늘의 실천 1개', 'One Action Today')}</h3>
              <p>
                {
                  (isKo
                    ? primaryOctant.growthRecommendationsKo
                    : primaryOctant.growthRecommendations)[0]
                }
              </p>
            </article>
          </div>
        </section>

        <section className={styles.detailGuideSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📘</span>
            {t('결과 상세 해석 가이드', 'Detailed Interpretation Guide')}
          </h2>
          <p className={styles.detailGuideIntro}>
            {t(
              '점수는 우열이 아니라 관계 습관의 방향입니다. 높은 축은 강점으로, 낮은 축은 조정 포인트로 보세요.',
              'Scores indicate interpersonal tendencies, not superiority. Treat highs as strengths and lows as adjustment points.'
            )}
          </p>
          <div className={styles.detailGuideGrid}>
            {[...icpGuides, ...optionalGuides].map((guide) => (
              <article key={guide.id} className={styles.detailGuideCard}>
                <h3>{guide.title}</h3>
                <p className={styles.detailMeta}>
                  {guide.score}% ({getBand(guide.score)})
                </p>
                <p>{guide.meaning}</p>
                <p className={styles.detailActionLabel}>{t('바로 해볼 실천:', 'Try this now:')}</p>
                <p>{guide.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.axesSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            {t('대인관계 핵심 축', 'Interpersonal Axes')}
          </h2>
          <div className={styles.axesCard}>
            <AxisBar
              label={t('주도성', 'Agency')}
              score={analysis.dominanceScore}
              left={t('신중함', 'Reserved')}
              right={t('주도적', 'Initiating')}
              delay={0}
              styles={styles}
            />
            <AxisBar
              label={t('관계 온도', 'Warmth')}
              score={analysis.affiliationScore}
              left={t('거리 둠', 'Distant')}
              right={t('친화적', 'Friendly')}
              delay={100}
              styles={styles}
            />
          </div>
        </section>

        <section className={styles.circumplexSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔮</span>
            {t('원형 분석', 'Circumplex Analysis')}
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

        <section className={styles.octantSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎯</span>
            {t('8가지 스타일 점수', '8 Octant Scores')}
          </h2>
          <OctantRadar scores={analysis.octantScores} isKo={isKo} />
        </section>

        <PrimaryStyleDetails styles={styles} isKo={isKo} primaryOctant={primaryOctant} />

        <section className={styles.growthSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🌱</span>
            {t('성장 제안', 'Growth Suggestions')}
          </h2>
          <p className={styles.growthIntro}>
            {t(
              `${primaryOctant.korean} 유형의 실전 개선 포인트`,
              `Practical growth points for ${primaryOctant.name}`
            )}
          </p>
          <div className={styles.growthCards}>
            {(isKo
              ? primaryOctant.growthRecommendationsKo
              : primaryOctant.growthRecommendations
            ).map((rec, i) => (
              <div key={i} className={styles.growthCard}>
                <div className={styles.growthNumber}>{i + 1}</div>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {analysis.explainability && (
          <section className={styles.explainSection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🧭</span>
              {t('이 결과가 나온 이유', 'Why You Got This Result')}
            </h2>
            <div className={styles.explainCard}>
              <p className={styles.disclaimerText}>
                {t(
                  '이 검사는 비임상 자기이해 도구입니다. 의료/진단 목적이 아니며, 현재 컨디션에 따라 결과가 달라질 수 있습니다.',
                  'This test is a non-clinical self-reflection tool, not a medical or diagnostic assessment.'
                )}
              </p>
              <div className={styles.questionsList}>
                {analysis.explainability.topAxes.map((axis) => (
                  <div key={axis.axis} className={styles.questionItem}>
                    <span className={styles.questionBullet}>•</span>
                    <p>{`${axis.axis} ${axis.score}% - ${axis.interpretation}`}</p>
                  </div>
                ))}
                {analysis.explainability.evidence.slice(0, 2).map((item, idx) => (
                  <div key={`${item.questionId}-${idx}`} className={styles.questionItem}>
                    <span className={styles.questionBullet}>•</span>
                    <p>{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <DestinyAdviceSection
          styles={styles}
          isKo={isKo}
          primaryOctantLabel={isKo ? primaryOctant.korean : primaryOctant.name}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          birthTime={birthTime}
          setBirthTime={setBirthTime}
          isLoading={destinyAdvice.isLoading}
          fortune={destinyAdvice.fortune}
          growthDates={destinyAdvice.growthDates}
          onGenerate={handleGenerateDestinyAdvice}
        />

        <section className={styles.questionsSection}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💭</span>
            {t('자기 탐색 질문', 'Self-Reflection Questions')}
          </h2>
          <div className={styles.questionsList}>
            {(isKo ? primaryOctant.therapeuticQuestionsKo : primaryOctant.therapeuticQuestions).map(
              (q, i) => (
                <div key={i} className={styles.questionItem}>
                  <span className={styles.questionBullet}>•</span>
                  <p>{q}</p>
                </div>
              )
            )}
          </div>
        </section>

        {secondaryOctant && (
          <section className={styles.secondarySection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎭</span>
              {t('보조 스타일', 'Secondary Style')}
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

        <ResultActions
          styles={styles}
          isKo={isKo}
          authStatus={authStatus}
          saveStatus={saveStatus}
          isSavedToDb={isSavedToDb}
          onSave={handleSaveResult}
          onShare={handleShare}
          onDownload={handleDownload}
        />
      </div>
    </main>
  )
}
