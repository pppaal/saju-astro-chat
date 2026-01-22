'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { ICPOctantChart, PersonaRadarChart, CompatibilityScore } from '@/components/personality';
import type { ICPOctantCode, PersonaAxisData, CrossSystemCompatibility, PersonaCompatibilityResult } from '@/lib/icp/types';
import type { PersonaAxisKey, PersonaAxisResult } from '@/lib/persona/types';
import styles from './page.module.css';

interface CompatibilityData {
  person1: {
    icp: {
      primaryStyle: ICPOctantCode;
      secondaryStyle: ICPOctantCode | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<ICPOctantCode, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      axes: Record<PersonaAxisKey, PersonaAxisResult>;
    };
  };
  person2: {
    icp: {
      primaryStyle: ICPOctantCode;
      secondaryStyle: ICPOctantCode | null;
      dominanceScore: number;
      affiliationScore: number;
      octantScores: Record<ICPOctantCode, number>;
    };
    persona: {
      typeCode: string;
      personaName: string;
      axes: Record<PersonaAxisKey, PersonaAxisResult>;
    };
  };
  compatibility: {
    icp: {
      score: number;
      level: string;
      levelKo: string;
      description: string;
      descriptionKo: string;
    };
    persona: PersonaCompatibilityResult;
    crossSystem: CrossSystemCompatibility;
  };
}

export default function PersonalityCompatibilityPage() {
  const { locale } = useI18n();
  const isKo = locale === 'ko';
  const [compatibilityData, setCompatibilityData] = useState<CompatibilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo function - in production this would get real quiz answers
  const analyzeDemoCompatibility = async () => {
    setLoading(true);
    setError(null);

    // Demo data - replace with actual quiz answers in production
    const demoRequest = {
      person1: {
        icpAnswers: {
          dom_1: 'A', dom_2: 'A', dom_3: 'A', dom_4: 'B', dom_5: 'A', dom_6: 'B', dom_7: 'A', dom_8: 'B',
          dom_9: 'A', dom_10: 'A', dom_11: 'A', dom_12: 'A', dom_13: 'B', dom_14: 'A', dom_15: 'A', dom_16: 'B',
          aff_1: 'A', aff_2: 'B', aff_3: 'A', aff_4: 'B', aff_5: 'A', aff_6: 'A', aff_7: 'B', aff_8: 'A',
          aff_9: 'A', aff_10: 'B', aff_11: 'A', aff_12: 'B', aff_13: 'A', aff_14: 'A', aff_15: 'B', aff_16: 'A',
        },
        personaAnswers: {
          q1_energy_network: 'A', q2_energy_weekend: 'A', q3_energy_spontaneous: 'A', q4_energy_transit: 'A', q5_energy_idealday: 'A',
          q6_cog_problem: 'A', q7_cog_explain: 'A', q8_cog_evaluate: 'A', q9_cog_basis: 'A', q10_cog_constraints: 'A',
          q11_decision_conflict: 'A', q12_decision_feedback: 'A', q13_decision_resources: 'A', q14_decision_rules: 'A', q15_decision_delay: 'A',
          q16_rhythm_deadline: 'A', q17_rhythm_change: 'A', q18_rhythm_workstyle: 'B', q19_rhythm_holiday: 'B', q20_rhythm_feeling: 'A',
          q21_energy_focus: 'A', q22_energy_solo_group: 'A', q23_energy_interruptions: 'A', q24_energy_events: 'A', q25_energy_noise: 'A',
          q26_cog_detail_bigpicture: 'A', q27_cog_rule_break: 'A', q28_cog_metrics_story: 'A', q29_cog_timehorizon: 'A', q30_cog_changecomfort: 'A',
          q31_decision_dataemotion: 'A', q32_decision_feedback_tone: 'A', q33_decision_risk: 'A', q34_decision_delegate: 'A', q35_decision_conflict_speed: 'A',
          q36_rhythm_morning_evening: 'A', q37_rhythm_planslack: 'A', q38_rhythm_batching: 'B', q39_rhythm_contextswitch: 'B', q40_rhythm_deadtime: 'A',
        },
      },
      person2: {
        icpAnswers: {
          dom_1: 'C', dom_2: 'C', dom_3: 'C', dom_4: 'B', dom_5: 'C', dom_6: 'B', dom_7: 'C', dom_8: 'C',
          dom_9: 'C', dom_10: 'C', dom_11: 'C', dom_12: 'C', dom_13: 'B', dom_14: 'C', dom_15: 'C', dom_16: 'B',
          aff_1: 'A', aff_2: 'B', aff_3: 'A', aff_4: 'A', aff_5: 'A', aff_6: 'A', aff_7: 'B', aff_8: 'A',
          aff_9: 'A', aff_10: 'B', aff_11: 'A', aff_12: 'A', aff_13: 'A', aff_14: 'A', aff_15: 'B', aff_16: 'A',
        },
        personaAnswers: {
          q1_energy_network: 'C', q2_energy_weekend: 'C', q3_energy_spontaneous: 'C', q4_energy_transit: 'C', q5_energy_idealday: 'C',
          q6_cog_problem: 'C', q7_cog_explain: 'C', q8_cog_evaluate: 'C', q9_cog_basis: 'C', q10_cog_constraints: 'C',
          q11_decision_conflict: 'A', q12_decision_feedback: 'B', q13_decision_resources: 'B', q14_decision_rules: 'B', q15_decision_delay: 'B',
          q16_rhythm_deadline: 'A', q17_rhythm_change: 'B', q18_rhythm_workstyle: 'B', q19_rhythm_holiday: 'B', q20_rhythm_feeling: 'B',
          q21_energy_focus: 'C', q22_energy_solo_group: 'C', q23_energy_interruptions: 'C', q24_energy_events: 'C', q25_energy_noise: 'C',
          q26_cog_detail_bigpicture: 'C', q27_cog_rule_break: 'C', q28_cog_metrics_story: 'C', q29_cog_timehorizon: 'C', q30_cog_changecomfort: 'C',
          q31_decision_dataemotion: 'B', q32_decision_feedback_tone: 'B', q33_decision_risk: 'B', q34_decision_delegate: 'B', q35_decision_conflict_speed: 'B',
          q36_rhythm_morning_evening: 'A', q37_rhythm_planslack: 'B', q38_rhythm_batching: 'B', q39_rhythm_contextswitch: 'B', q40_rhythm_deadtime: 'B',
        },
      },
      locale,
    };

    try {
      const response = await fetch('/api/personality-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze compatibility');
      }

      const data = await response.json();
      setCompatibilityData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isKo ? '성격 궁합 분석' : 'Personality Compatibility Analysis'}
        </h1>
        <p className={styles.subtitle}>
          {isKo
            ? 'ICP 대인관계 스타일과 Nova Persona 성격 유형으로 궁합을 분석합니다'
            : 'Analyze compatibility through ICP interpersonal style and Nova Persona type'}
        </p>
      </div>

      {!compatibilityData && (
        <div className={styles.demo}>
          <button
            className={styles.demoButton}
            onClick={analyzeDemoCompatibility}
            disabled={loading}
          >
            {loading
              ? (isKo ? '분석 중...' : 'Analyzing...')
              : (isKo ? '데모 궁합 분석 보기' : 'View Demo Compatibility Analysis')}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {compatibilityData && (
        <div className={styles.results}>
          {/* Cross-System Compatibility - Overall Score */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {isKo ? '종합 궁합 점수' : 'Overall Compatibility Score'}
            </h2>
            <CompatibilityScore
              score={compatibilityData.compatibility.crossSystem.score}
              level={compatibilityData.compatibility.crossSystem.level}
              levelKo={compatibilityData.compatibility.crossSystem.levelKo}
              description={compatibilityData.compatibility.crossSystem.description}
              descriptionKo={compatibilityData.compatibility.crossSystem.descriptionKo}
              insights={compatibilityData.compatibility.crossSystem.insights}
              insightsKo={compatibilityData.compatibility.crossSystem.insightsKo}
              locale={locale}
            />
          </section>

          {/* ICP Compatibility */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {isKo ? 'ICP 대인관계 스타일 궁합' : 'ICP Interpersonal Style Compatibility'}
            </h2>
            <div className={styles.chartGrid}>
              <div className={styles.chartCard}>
                <h3>{isKo ? 'Person 1' : 'Person 1'}</h3>
                <ICPOctantChart
                  octantScores={compatibilityData.person1.icp.octantScores}
                  primaryStyle={compatibilityData.person1.icp.primaryStyle}
                  dominanceNormalized={(compatibilityData.person1.icp.dominanceScore - 50) / 50}
                  affiliationNormalized={(compatibilityData.person1.icp.affiliationScore - 50) / 50}
                  size={350}
                />
                <p className={styles.chartLabel}>
                  {compatibilityData.person1.icp.primaryStyle}
                  {compatibilityData.person1.icp.secondaryStyle && ` / ${compatibilityData.person1.icp.secondaryStyle}`}
                </p>
              </div>
              <div className={styles.chartCard}>
                <h3>{isKo ? 'Person 2' : 'Person 2'}</h3>
                <ICPOctantChart
                  octantScores={compatibilityData.person2.icp.octantScores}
                  primaryStyle={compatibilityData.person2.icp.primaryStyle}
                  dominanceNormalized={(compatibilityData.person2.icp.dominanceScore - 50) / 50}
                  affiliationNormalized={(compatibilityData.person2.icp.affiliationScore - 50) / 50}
                  size={350}
                />
                <p className={styles.chartLabel}>
                  {compatibilityData.person2.icp.primaryStyle}
                  {compatibilityData.person2.icp.secondaryStyle && ` / ${compatibilityData.person2.icp.secondaryStyle}`}
                </p>
              </div>
            </div>
            <CompatibilityScore
              score={compatibilityData.compatibility.icp.score}
              level={compatibilityData.compatibility.icp.level}
              levelKo={compatibilityData.compatibility.icp.levelKo}
              description={compatibilityData.compatibility.icp.description}
              descriptionKo={compatibilityData.compatibility.icp.descriptionKo}
              locale={locale}
            />
          </section>

          {/* Persona Compatibility */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {isKo ? 'Nova Persona 성격 유형 궁합' : 'Nova Persona Type Compatibility'}
            </h2>
            <div className={styles.chartGrid}>
              <div className={styles.chartCard}>
                <h3>{isKo ? 'Person 1' : 'Person 1'}</h3>
                <PersonaRadarChart
                  axes={compatibilityData.person1.persona.axes}
                  size={350}
                  showLabels={true}
                />
                <p className={styles.chartLabel}>
                  {compatibilityData.person1.persona.typeCode} - {compatibilityData.person1.persona.personaName}
                </p>
              </div>
              <div className={styles.chartCard}>
                <h3>{isKo ? 'Person 2' : 'Person 2'}</h3>
                <PersonaRadarChart
                  axes={compatibilityData.person2.persona.axes}
                  size={350}
                  showLabels={true}
                />
                <p className={styles.chartLabel}>
                  {compatibilityData.person2.persona.typeCode} - {compatibilityData.person2.persona.personaName}
                </p>
              </div>
            </div>
            <CompatibilityScore
              score={compatibilityData.compatibility.persona.score}
              level={compatibilityData.compatibility.persona.level}
              levelKo={compatibilityData.compatibility.persona.levelKo}
              description={compatibilityData.compatibility.persona.description}
              descriptionKo={compatibilityData.compatibility.persona.descriptionKo}
              synergies={compatibilityData.compatibility.persona.synergies}
              synergiesKo={compatibilityData.compatibility.persona.synergiesKo}
              tensions={compatibilityData.compatibility.persona.tensions}
              tensionsKo={compatibilityData.compatibility.persona.tensionsKo}
              locale={locale}
            />
          </section>
        </div>
      )}
    </div>
  );
}
