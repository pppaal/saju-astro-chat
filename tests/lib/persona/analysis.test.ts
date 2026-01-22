// tests/lib/persona/analysis.test.ts
import { describe, it, expect } from 'vitest';
import { analyzePersona, getPersonaCompatibility, EFFECTS } from '@/lib/persona/analysis';
import type { PersonaQuizAnswers, PersonaAnalysis, PersonaAxisKey, PersonaAxisResult } from '@/lib/persona/types';

describe('persona analysis', () => {
  // Helper function to create answers - moved to top level of describe block
  const createAnswers = (defaultAnswer: string = 'A'): PersonaQuizAnswers => {
    const answers: PersonaQuizAnswers = {};
    Object.keys(EFFECTS).forEach((key) => {
      answers[key] = defaultAnswer;
    });
    return answers;
  };

  describe('EFFECTS constant', () => {
    it('should have effects for all 40 questions', () => {
      const questionKeys = Object.keys(EFFECTS);
      expect(questionKeys.length).toBe(40);
    });

    it('should have A, B, C options for each question', () => {
      Object.entries(EFFECTS).forEach(([questionId, options]) => {
        expect(options.A).toBeDefined();
        expect(options.B).toBeDefined();
        expect(options.C).toBeDefined();
      });
    });

    it('should have valid axis values in effects', () => {
      const validAxes: PersonaAxisKey[] = ['energy', 'cognition', 'decision', 'rhythm'];

      Object.values(EFFECTS).forEach((options) => {
        Object.values(options).forEach((effects) => {
          effects.forEach((effect) => {
            expect(validAxes).toContain(effect.axis);
          });
        });
      });
    });

    it('should have positive weights in all effects', () => {
      Object.values(EFFECTS).forEach((options) => {
        Object.values(options).forEach((effects) => {
          effects.forEach((effect) => {
            expect(effect.weight).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should have energy questions', () => {
      const energyQuestions = Object.keys(EFFECTS).filter((k) => k.includes('energy'));
      expect(energyQuestions.length).toBe(10);
    });

    it('should have cognition questions', () => {
      const cogQuestions = Object.keys(EFFECTS).filter((k) => k.includes('cog'));
      expect(cogQuestions.length).toBe(10);
    });

    it('should have decision questions', () => {
      const decisionQuestions = Object.keys(EFFECTS).filter((k) => k.includes('decision'));
      expect(decisionQuestions.length).toBe(10);
    });

    it('should have rhythm questions', () => {
      const rhythmQuestions = Object.keys(EFFECTS).filter((k) => k.includes('rhythm'));
      expect(rhythmQuestions.length).toBe(10);
    });
  });

  describe('analyzePersona', () => {
    it('should return valid PersonaAnalysis structure', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.typeCode).toBeDefined();
      expect(result.axes).toBeDefined();
    });

    it('should have all four axes in result', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.axes.energy).toBeDefined();
      expect(result.axes.cognition).toBeDefined();
      expect(result.axes.decision).toBeDefined();
      expect(result.axes.rhythm).toBeDefined();
    });

    it('should have valid pole and score for each axis', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      Object.values(result.axes).forEach((axis) => {
        expect(axis.pole).toBeDefined();
        expect(axis.score).toBeGreaterThanOrEqual(0);
        expect(axis.score).toBeLessThanOrEqual(100);
      });
    });

    it('should generate 4-letter type code', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.typeCode).toMatch(/^[RGVSLHFA]{4}$/);
    });

    it('should handle all A answers (extroverted bias)', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      // All A should lean toward radiant/visionary/logic
      expect(result.axes.energy.pole).toBe('radiant');
      expect(result.axes.cognition.pole).toBe('visionary');
      expect(result.axes.decision.pole).toBe('logic');
    });

    it('should handle all B answers (introverted bias)', () => {
      const answers = createAnswers('B');
      const result = analyzePersona(answers);

      // All B should lean toward grounded/structured/empathic
      expect(result.axes.energy.pole).toBe('grounded');
      expect(result.axes.cognition.pole).toBe('structured');
      expect(result.axes.decision.pole).toBe('empathic');
    });

    it('should handle all C answers (balanced)', () => {
      const answers = createAnswers('C');
      const result = analyzePersona(answers);

      // All C means balanced - scores should be near 50
      Object.values(result.axes).forEach((axis) => {
        expect(axis.score).toBeGreaterThanOrEqual(40);
        expect(axis.score).toBeLessThanOrEqual(60);
      });
    });

    it('should include consistency score when pairs exist', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      // With consistent answers, should have high consistency
      expect(result.consistencyScore).toBeDefined();
      if (result.consistencyScore !== undefined) {
        expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(result.consistencyScore).toBeLessThanOrEqual(100);
      }
    });

    it('should include consistency label', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      if (result.consistencyLabel) {
        expect(['high', 'moderate', 'low']).toContain(result.consistencyLabel);
      }
    });

    it('should include archetype information', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.personaName).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.strengths).toBeDefined();
      expect(result.challenges).toBeDefined();
    });

    it('should include profile with personality dimensions', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.profile).toBeDefined();
      expect(result.profile.openness).toBeDefined();
      expect(result.profile.conscientiousness).toBeDefined();
      expect(result.profile.extraversion).toBeDefined();
      expect(result.profile.agreeableness).toBeDefined();
    });

    it('should include color information', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.primaryColor).toBeDefined();
      expect(result.secondaryColor).toBeDefined();
      expect(result.primaryColor).toMatch(/^hsl\(/);
    });

    it('should include career and relationship hints', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.career).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.recommendedRoles).toBeDefined();
      expect(Array.isArray(result.recommendedRoles)).toBe(true);
    });

    it('should include growth tips', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.growthTips).toBeDefined();
      expect(Array.isArray(result.growthTips)).toBe(true);
    });

    it('should include key motivations', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.keyMotivations).toBeDefined();
      expect(Array.isArray(result.keyMotivations)).toBe(true);
      expect(result.keyMotivations.length).toBe(3);
    });

    describe('localization', () => {
      it('should support Korean locale', () => {
        const answers = createAnswers('A');
        const result = analyzePersona(answers, 'ko');

        expect(result).toBeDefined();
        expect(result.keyMotivations).toBeDefined();
      });

      it('should support English locale', () => {
        const answers = createAnswers('A');
        const result = analyzePersona(answers, 'en');

        expect(result).toBeDefined();
        expect(result.keyMotivations).toBeDefined();
      });

      it('should default to English locale', () => {
        const answers = createAnswers('A');
        const resultDefault = analyzePersona(answers);
        const resultEn = analyzePersona(answers, 'en');

        expect(resultDefault.keyMotivations).toEqual(resultEn.keyMotivations);
      });
    });

    describe('mixed answers', () => {
      it('should handle partial answers', () => {
        const partialAnswers: PersonaQuizAnswers = {
          q1_energy_network: 'A',
          q6_cog_problem: 'B',
          q11_decision_conflict: 'C',
        };

        const result = analyzePersona(partialAnswers);
        expect(result).toBeDefined();
        expect(result.typeCode).toBeDefined();
      });

      it('should handle empty answers', () => {
        const emptyAnswers: PersonaQuizAnswers = {};
        const result = analyzePersona(emptyAnswers);

        expect(result).toBeDefined();
        // With no answers, should still produce valid result
        Object.values(result.axes).forEach((axis) => {
          expect(axis.score).toBeGreaterThanOrEqual(0);
          expect(axis.score).toBeLessThanOrEqual(100);
        });
        expect(result.typeCode).toBeDefined();
      });

      it('should produce different results for different answer patterns', () => {
        const allA = createAnswers('A');
        const allB = createAnswers('B');

        const resultA = analyzePersona(allA);
        const resultB = analyzePersona(allB);

        expect(resultA.typeCode).not.toBe(resultB.typeCode);
      });
    });

    describe('consistency detection', () => {
      it('should detect high consistency with all same answers', () => {
        const answers = createAnswers('A');
        const result = analyzePersona(answers);

        if (result.consistencyLabel) {
          expect(result.consistencyLabel).toBe('high');
        }
      });

      it('should detect lower consistency with mixed answers', () => {
        const mixedAnswers: PersonaQuizAnswers = {};
        let toggle = true;
        Object.keys(EFFECTS).forEach((key) => {
          mixedAnswers[key] = toggle ? 'A' : 'B';
          toggle = !toggle;
        });

        const result = analyzePersona(mixedAnswers);
        // Mixed answers should not have high consistency
        if (result.consistencyLabel) {
          expect(['moderate', 'low']).toContain(result.consistencyLabel);
        }
      });
    });
  });

  describe('type code generation', () => {
    it('should generate RVLF for all extroverted/visionary/logic/flow', () => {
      // Create answers that strongly favor these poles
      const answers: PersonaQuizAnswers = {};
      Object.keys(EFFECTS).forEach((key) => {
        if (key.includes('energy') || key.includes('cog')) {
          answers[key] = 'A';
        } else if (key.includes('decision')) {
          answers[key] = 'A';
        } else if (key.includes('rhythm')) {
          // For rhythm, B gives flow in most questions
          answers[key] = 'B';
        }
      });

      const result = analyzePersona(answers);
      expect(result.typeCode[0]).toBe('R'); // Radiant
      expect(result.typeCode[1]).toBe('V'); // Visionary
      expect(result.typeCode[2]).toBe('L'); // Logic
    });

    it('should generate GSHA for all grounded/structured/empathic/anchor', () => {
      const answers: PersonaQuizAnswers = {};
      Object.keys(EFFECTS).forEach((key) => {
        if (key.includes('energy') || key.includes('cog')) {
          answers[key] = 'B';
        } else if (key.includes('decision')) {
          answers[key] = 'B';
        } else if (key.includes('rhythm')) {
          answers[key] = 'A'; // For rhythm, A gives anchor in many questions
        }
      });

      const result = analyzePersona(answers);
      expect(result.typeCode[0]).toBe('G'); // Grounded
      expect(result.typeCode[1]).toBe('S'); // Structured
      expect(result.typeCode[2]).toBe('H'); // empathic (H)
    });
  });

  describe('profile calculations', () => {
    it('should calculate openness from cognition axis', () => {
      const visionaryAnswers = createAnswers('A');
      const structuredAnswers = createAnswers('B');

      const visionaryResult = analyzePersona(visionaryAnswers);
      const structuredResult = analyzePersona(structuredAnswers);

      // Visionary should have higher openness
      expect(visionaryResult.profile.openness).toBeGreaterThanOrEqual(structuredResult.profile.openness);
      expect(visionaryResult.axes.cognition.pole).toBe('visionary');
      expect(structuredResult.axes.cognition.pole).toBe('structured');
    });

    it('should calculate extraversion from energy axis', () => {
      const radiantAnswers = createAnswers('A');
      const groundedAnswers = createAnswers('B');

      const radiantResult = analyzePersona(radiantAnswers);
      const groundedResult = analyzePersona(groundedAnswers);

      // Radiant should have higher extraversion
      expect(radiantResult.profile.extraversion).toBeGreaterThanOrEqual(groundedResult.profile.extraversion);
      expect(radiantResult.axes.energy.pole).toBe('radiant');
      expect(groundedResult.axes.energy.pole).toBe('grounded');
    });

    it('should calculate introversion as inverse of extraversion', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.profile.introversion).toBe(100 - result.profile.extraversion);
    });

    it('should have neuroticism default to 50', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.profile.neuroticism).toBe(50);
    });

    it('should include enneagram placeholder', () => {
      const answers = createAnswers('A');
      const result = analyzePersona(answers);

      expect(result.profile.enneagram).toBeDefined();
      expect(Object.keys(result.profile.enneagram).length).toBe(9);
    });
  });

  describe('getPersonaCompatibility', () => {
    it('should return valid compatibility result', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 80, pole: 'radiant' },
        cognition: { score: 75, pole: 'visionary' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 30, pole: 'grounded' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 30, pole: 'logic' },
        rhythm: { score: 70, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'GSLA', axes1, axes2, 'en');

      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.score).toBeLessThanOrEqual(95);
      expect(result.level).toBeDefined();
      expect(result.levelKo).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.descriptionKo).toBeDefined();
      expect(result.synergies).toBeInstanceOf(Array);
      expect(result.synergiesKo).toBeInstanceOf(Array);
      expect(result.tensions).toBeInstanceOf(Array);
      expect(result.tensionsKo).toBeInstanceOf(Array);
    });

    it('should identify similar energy levels as synergy', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 80, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 85, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'RVLA', axes1, axes2, 'en');

      expect(result.synergies.some(s => s.includes('energy'))).toBe(true);
    });

    it('should identify complementary cognition as synergy', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 85, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 20, pole: 'structured' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'RSLA', axes1, axes2, 'en');

      expect(result.synergies.some(s => s.includes('thinking') || s.includes('Complementary'))).toBe(true);
    });

    it('should identify decision style difference as potential tension', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 85, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 20, pole: 'empathic' },
        rhythm: { score: 50, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'RVHA', axes1, axes2, 'en');

      expect(result.tensions.some(t => t.includes('decision'))).toBe(true);
    });

    it('should give bonus for same archetype', () => {
      const axes: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 80, pole: 'radiant' },
        cognition: { score: 75, pole: 'visionary' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      };

      const sameResult = getPersonaCompatibility('RVLA', 'RVLA', axes, axes, 'en');
      const diffResult = getPersonaCompatibility('RVLA', 'GSLA', axes, {
        energy: { score: 30, pole: 'grounded' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      }, 'en');

      expect(sameResult.synergies.some(s => s.includes('shared archetype') || s.includes('mutual understanding'))).toBe(true);
    });

    it('should identify visionary + structured synergy', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 85, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 20, pole: 'structured' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'RSLA', axes1, axes2, 'en');

      expect(result.synergies.some(s => s.includes('Visionary') || s.includes('execution'))).toBe(true);
    });

    it('should identify radiant + grounded balance', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 85, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 20, pole: 'grounded' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 50, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'GVLA', axes1, axes2, 'en');

      expect(result.synergies.some(s => s.includes('Energizer') || s.includes('stabilizer'))).toBe(true);
    });

    it('should work with Korean locale', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 80, pole: 'radiant' },
        cognition: { score: 75, pole: 'visionary' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 30, pole: 'grounded' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 30, pole: 'logic' },
        rhythm: { score: 70, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLA', 'GSLA', axes1, axes2, 'ko');

      expect(result.levelKo).toBeDefined();
      expect(result.descriptionKo).toBeDefined();
      expect(result.synergiesKo.length).toBeGreaterThan(0);
    });

    it('should identify extreme rhythm differences as tension', () => {
      const axes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 90, pole: 'flow' },
      };
      const axes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 50, pole: 'radiant' },
        cognition: { score: 50, pole: 'visionary' },
        decision: { score: 50, pole: 'logic' },
        rhythm: { score: 10, pole: 'anchor' },
      };

      const result = getPersonaCompatibility('RVLF', 'RVLA', axes1, axes2, 'en');

      expect(result.tensions.some(t => t.includes('pacing') || t.includes('rhythm'))).toBe(true);
    });

    it('should return higher scores for well-matched pairs', () => {
      // Well-matched: complementary cognition, similar values
      const wellMatchedAxes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 70, pole: 'radiant' },
        cognition: { score: 80, pole: 'visionary' },
        decision: { score: 75, pole: 'logic' },
        rhythm: { score: 60, pole: 'anchor' },
      };
      const wellMatchedAxes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 65, pole: 'radiant' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 70, pole: 'logic' },
        rhythm: { score: 55, pole: 'anchor' },
      };

      const wellMatchedResult = getPersonaCompatibility('RVLA', 'RSLA', wellMatchedAxes1, wellMatchedAxes2, 'en');

      // Poorly matched: opposing on most dimensions
      const poorlyMatchedAxes1: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 85, pole: 'radiant' },
        cognition: { score: 80, pole: 'visionary' },
        decision: { score: 85, pole: 'logic' },
        rhythm: { score: 20, pole: 'anchor' },
      };
      const poorlyMatchedAxes2: Record<PersonaAxisKey, PersonaAxisResult> = {
        energy: { score: 20, pole: 'grounded' },
        cognition: { score: 25, pole: 'structured' },
        decision: { score: 20, pole: 'empathic' },
        rhythm: { score: 85, pole: 'flow' },
      };

      const poorlyMatchedResult = getPersonaCompatibility('RVLA', 'GSHF', poorlyMatchedAxes1, poorlyMatchedAxes2, 'en');

      expect(wellMatchedResult.score).toBeGreaterThan(poorlyMatchedResult.score);
    });
  });
});
