'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import type { ICPAnalysis } from '@/lib/icp/types';
import type { PersonaAnalysis } from '@/lib/persona/types';
import { analyzeICP } from '@/lib/icp/analysis';
import { analyzePersona } from '@/lib/persona/analysis';
import { generateCombinedInsights } from './insightGenerators';
import styles from './combined.module.css';

export default function CombinedResultPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';

  const [icpResult, setIcpResult] = useState<ICPAnalysis | null>(null);
  const [personaResult, setPersonaResult] = useState<PersonaAnalysis | null>(null);
  const [hasIcp, setHasIcp] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(() => {
    // Load ICP results
    const icpAnswers = localStorage.getItem('icpQuizAnswers');
    if (icpAnswers) {
      try {
        const parsed = JSON.parse(icpAnswers);
        const analysis = analyzeICP(parsed, locale);
        setIcpResult(analysis);
        setHasIcp(true);
      } catch {
        setHasIcp(false);
      }
    }

    // Load Persona results
    const personaAnswers = localStorage.getItem('personaQuizAnswers');
    if (personaAnswers) {
      try {
        const parsed = JSON.parse(personaAnswers);
        const analysis = analyzePersona(parsed, locale);
        setPersonaResult(analysis);
        setHasPersona(true);
      } catch {
        setHasPersona(false);
      }
    }

    setLoading(false);
  }, [locale]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const insights = useMemo(
    () => generateCombinedInsights(icpResult, personaResult, isKo),
    [icpResult, personaResult, isKo]
  );

  // Memoize star positions to avoid recalculation
  const starPositions = useMemo(
    () => Array.from({ length: 50 }, (_, i) => ({
      left: `${(i * 37 + 13) % 100}%`,
      top: `${(i * 53 + 7) % 100}%`,
      animationDelay: `${(i * 0.08) % 4}s`,
    })),
    []
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{isKo ? '분석 중...' : 'Analyzing...'}</p>
        </div>
      </main>
    );
  }

  // Check if both tests are completed
  if (!hasIcp || !hasPersona) {
    return (
      <main className={styles.page}>
        <div className={styles.backButton}>
          <BackButton />
        </div>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>🔗</div>
            <h1 className={styles.title}>
              {isKo ? '통합 성격 분석' : 'Combined Personality Analysis'}
            </h1>
            <p className={styles.subtitle}>
              {isKo
                ? '두 테스트를 모두 완료해야 통합 분석을 볼 수 있습니다.'
                : 'Complete both tests to see your combined analysis.'}
            </p>
          </div>

          <div className={styles.testStatus}>
            <div className={`${styles.statusItem} ${hasPersona ? styles.statusComplete : ''}`}>
              <span className={styles.statusIcon}>{hasPersona ? '✅' : '⭕'}</span>
              <span>{isKo ? '성격 분석 테스트' : 'Personality Test'}</span>
              {!hasPersona && (
                <Link href="/personality" className={styles.startLink}>
                  {isKo ? '시작하기 →' : 'Start →'}
                </Link>
              )}
            </div>

            <div className={`${styles.statusItem} ${hasIcp ? styles.statusComplete : ''}`}>
              <span className={styles.statusIcon}>{hasIcp ? '✅' : '⭕'}</span>
              <span>{isKo ? '대인관계 스타일 테스트' : 'ICP Test'}</span>
              {!hasIcp && (
                <Link href="/icp" className={styles.startLink}>
                  {isKo ? '시작하기 →' : 'Start →'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      {/* Background Stars */}
      <div className={styles.stars}>
        {starPositions.map((pos, i) => (
          <div
            key={i}
            className={styles.star}
            style={pos}
          />
        ))}
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>🔗</div>
          <h1 className={styles.title}>
            {isKo ? '통합 성격 분석' : 'Combined Personality Analysis'}
          </h1>
          <p className={styles.subtitle}>
            {isKo
              ? 'ICP 대인관계 스타일 + 성격 분석 통합 결과'
              : 'ICP Interpersonal Style + Personality Test Combined Results'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>🎭</div>
            <div className={styles.summaryLabel}>
              {isKo ? '대인관계 스타일' : 'Interpersonal Style'}
            </div>
            <div className={styles.summaryValue}>
              {isKo ? icpResult?.primaryOctant.korean : icpResult?.primaryOctant.name}
            </div>
            <div className={styles.summaryCode}>{icpResult?.primaryStyle}</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>🌈</div>
            <div className={styles.summaryLabel}>
              {isKo ? '성격 유형' : 'Personality Type'}
            </div>
            <div className={styles.summaryValue}>
              {personaResult?.personaName}
            </div>
            <div className={styles.summaryCode}>{personaResult?.typeCode}</div>
          </div>
        </div>

        {/* Axis Comparison */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {isKo ? '축 비교' : 'Axis Comparison'}
          </h2>

          <div className={styles.axisGrid}>
            <div className={styles.axisItem}>
              <div className={styles.axisLabel}>
                {isKo ? '지배-복종 (ICP)' : 'Dominance (ICP)'}
              </div>
              <div className={styles.axisBar}>
                <div
                  className={styles.axisFill}
                  style={{ width: `${icpResult?.dominanceScore || 50}%` }}
                />
              </div>
              <div className={styles.axisPoles}>
                <span>{isKo ? '복종적' : 'Submissive'}</span>
                <span>{isKo ? '지배적' : 'Dominant'}</span>
              </div>
            </div>

            <div className={styles.axisItem}>
              <div className={styles.axisLabel}>
                {isKo ? '친밀-적대 (ICP)' : 'Affiliation (ICP)'}
              </div>
              <div className={styles.axisBar}>
                <div
                  className={styles.axisFill}
                  style={{ width: `${icpResult?.affiliationScore || 50}%` }}
                />
              </div>
              <div className={styles.axisPoles}>
                <span>{isKo ? '냉담함' : 'Cold'}</span>
                <span>{isKo ? '따뜻함' : 'Warm'}</span>
              </div>
            </div>

            <div className={styles.axisItem}>
              <div className={styles.axisLabel}>
                {isKo ? '에너지 (Persona)' : 'Energy (Persona)'}
              </div>
              <div className={styles.axisBar}>
                <div
                  className={styles.axisFill}
                  style={{ width: `${personaResult?.axes?.energy?.score ?? 50}%` }}
                />
              </div>
              <div className={styles.axisPoles}>
                <span>{isKo ? '내향적' : 'Grounded'}</span>
                <span>{isKo ? '외향적' : 'Radiant'}</span>
              </div>
            </div>

            <div className={styles.axisItem}>
              <div className={styles.axisLabel}>
                {isKo ? '의사결정 (Persona)' : 'Decision (Persona)'}
              </div>
              <div className={styles.axisBar}>
                <div
                  className={styles.axisFill}
                  style={{ width: `${personaResult?.axes?.decision?.score ?? 50}%` }}
                />
              </div>
              <div className={styles.axisPoles}>
                <span>{isKo ? '논리적' : 'Logic'}</span>
                <span>{isKo ? '공감적' : 'Empathic'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Insights */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {isKo ? '통합 인사이트' : 'Combined Insights'}
          </h2>

          <div className={styles.insightGrid}>
            {insights.map((insight, index) => (
              <div
                key={index}
                className={styles.insightCard}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={styles.insightIcon}>{insight.icon}</div>
                <h3 className={styles.insightTitle}>{insight.title}</h3>
                <p className={styles.insightContent}>{insight.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/icp/result" className={styles.secondaryButton}>
            {isKo ? 'ICP 상세 결과' : 'ICP Details'}
          </Link>
          <Link href="/personality/result" className={styles.secondaryButton}>
            {isKo ? '성격 분석 상세' : 'Persona Details'}
          </Link>
          <Link href="/compatibility" className={styles.primaryButton}>
            {isKo ? '궁합 분석하기' : 'Check Compatibility'}
          </Link>
        </div>
      </div>
    </main>
  );
}
