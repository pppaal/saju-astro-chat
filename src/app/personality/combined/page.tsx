'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import type { ICPAnalysis } from '@/lib/icp/types';
import type { PersonaAnalysis } from '@/lib/persona/types';
import { analyzeICP } from '@/lib/icp/analysis';
import { analyzePersona } from '@/lib/persona/analysis';
import styles from './combined.module.css';

// Combined insight generation
function generateCombinedInsights(
  icpResult: ICPAnalysis | null,
  personaResult: PersonaAnalysis | null,
  isKo: boolean
): { title: string; content: string; icon: string }[] {
  const insights: { title: string; content: string; icon: string }[] = [];

  if (!icpResult || !personaResult) return insights;

  // Leadership vs Team Role
  const isDominant = icpResult.dominanceNormalized > 0.3;
  const isRadiant = personaResult.typeCode?.startsWith('R');

  if (isDominant && isRadiant) {
    insights.push({
      icon: '👑',
      title: isKo ? '타고난 리더' : 'Natural Leader',
      content: isKo
        ? '당신은 외향적 에너지와 주도적 성향을 모두 갖추고 있어 팀을 이끄는 데 탁월합니다. 비전을 제시하고 사람들에게 영감을 주는 능력이 있습니다.'
        : 'You combine extroverted energy with a dominant interpersonal style, making you excellent at leading teams. You have the ability to set vision and inspire others.',
    });
  } else if (!isDominant && !isRadiant) {
    insights.push({
      icon: '🎯',
      title: isKo ? '전략적 지원자' : 'Strategic Supporter',
      content: isKo
        ? '당신은 내향적 에너지와 수용적 성향으로 팀에서 안정적인 지원 역할을 합니다. 신중한 분석과 깊은 통찰력을 제공합니다.'
        : 'Your introverted energy and receptive style make you a stable supporter in teams. You provide careful analysis and deep insights.',
    });
  }

  // Warmth analysis
  const isWarm = icpResult.affiliationNormalized > 0.3;
  const isEmpathic = personaResult.typeCode?.charAt(2) === 'H';

  if (isWarm && isEmpathic) {
    insights.push({
      icon: '💖',
      title: isKo ? '깊은 공감 능력' : 'Deep Empathy',
      content: isKo
        ? '대인관계에서의 따뜻함과 공감 기반 의사결정이 결합되어 타인의 감정을 깊이 이해합니다. 상담, 코칭, 돌봄 직종에 적합합니다.'
        : 'Your interpersonal warmth combined with empathic decision-making creates deep understanding of others. Well-suited for counseling, coaching, and caregiving roles.',
    });
  }

  // Independence analysis
  const isCold = icpResult.affiliationNormalized < -0.3;
  const isLogical = personaResult.typeCode?.charAt(2) === 'L';

  if (isCold && isLogical) {
    insights.push({
      icon: '🧠',
      title: isKo ? '독립적 사고가' : 'Independent Thinker',
      content: isKo
        ? '객관적 분석력과 독립적 성향이 결합되어 감정에 휘둘리지 않는 판단을 내립니다. 연구, 분석, 전략 분야에서 강점을 발휘합니다.'
        : 'Your objective analysis and independent style allow for judgment unclouded by emotion. Strong in research, analysis, and strategy fields.',
    });
  }

  // Flexibility analysis
  const isFlow = personaResult.typeCode?.charAt(3) === 'F';
  const isVisionary = personaResult.typeCode?.charAt(1) === 'V';

  if (isFlow && isVisionary) {
    insights.push({
      icon: '🌊',
      title: isKo ? '창의적 적응자' : 'Creative Adapter',
      content: isKo
        ? '비전 지향적 사고와 유연한 리듬이 결합되어 변화하는 환경에서 창의적인 해결책을 찾습니다. 스타트업, 혁신 분야에 적합합니다.'
        : 'Visionary thinking combined with flexible rhythm helps you find creative solutions in changing environments. Well-suited for startups and innovation.',
    });
  }

  // Stability analysis
  const isAnchor = personaResult.typeCode?.charAt(3) === 'A';
  const isStructured = personaResult.typeCode?.charAt(1) === 'S';

  if (isAnchor && isStructured) {
    insights.push({
      icon: '🏛️',
      title: isKo ? '안정적 구축자' : 'Stable Builder',
      content: isKo
        ? '체계적 사고와 안정적 리듬이 결합되어 장기적인 프로젝트를 꾸준히 완성합니다. 시스템 구축, 관리, 운영 분야에 강점이 있습니다.'
        : 'Structured thinking with stable rhythm allows you to steadily complete long-term projects. Strong in system building, management, and operations.',
    });
  }

  // Add a general compatibility insight
  insights.push({
    icon: '✨',
    title: isKo ? '종합 프로필' : 'Combined Profile',
    content: isKo
      ? `당신의 대인관계 스타일(${icpResult.primaryOctant.korean})과 성격 유형(${personaResult.personaName || personaResult.typeCode})이 만나 독특한 조합을 이룹니다. 이 조합은 ${isDominant ? '주도적' : '협력적'}이면서 ${isWarm ? '따뜻한' : '객관적인'} 접근 방식을 선호합니다.`
      : `Your interpersonal style (${icpResult.primaryOctant.name}) and personality type (${personaResult.personaName || personaResult.typeCode}) create a unique combination. This blend prefers a ${isDominant ? 'leading' : 'collaborative'} and ${isWarm ? 'warm' : 'objective'} approach.`,
  });

  return insights;
}

export default function CombinedResultPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';

  const [icpResult, setIcpResult] = useState<ICPAnalysis | null>(null);
  const [personaResult, setPersonaResult] = useState<PersonaAnalysis | null>(null);
  const [hasIcp, setHasIcp] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const personaAnswers = localStorage.getItem('personaAnswers');
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

  const insights = generateCombinedInsights(icpResult, personaResult, isKo);

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
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.08) % 4}s`,
            }}
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
