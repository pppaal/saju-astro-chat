import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  performComprehensiveAstrologyAnalysis,
  performExtendedAstrologyAnalysis,
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/astrology/comprehensive';
import type { AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility';

// Mock all analysis modules
vi.mock('@/lib/compatibility/astrology/basic-analysis', () => ({
  analyzeAspects: vi.fn(),
  analyzeSynastry: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/composite-house', () => ({
  analyzeCompositeChart: vi.fn(),
  analyzeHouseOverlays: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/planet-analysis', () => ({
  analyzeMercuryAspects: vi.fn(),
  analyzeJupiterAspects: vi.fn(),
  analyzeSaturnAspects: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/outer-planets', () => ({
  analyzeOuterPlanets: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/nodes-lilith', () => ({
  analyzeNodes: vi.fn(),
  analyzeLilith: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/davison-progressed', () => ({
  analyzeDavisonChart: vi.fn(),
  analyzeProgressedChart: vi.fn(),
}));

vi.mock('@/lib/compatibility/astrology/degree-aspects', () => ({
  analyzeDegreeBasedAspects: vi.fn(),
}));

import {
  analyzeAspects,
  analyzeSynastry,
} from '@/lib/compatibility/astrology/basic-analysis';
import {
  analyzeCompositeChart,
  analyzeHouseOverlays,
} from '@/lib/compatibility/astrology/composite-house';
import {
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
} from '@/lib/compatibility/astrology/planet-analysis';
import { analyzeOuterPlanets } from '@/lib/compatibility/astrology/outer-planets';
import { analyzeNodes, analyzeLilith } from '@/lib/compatibility/astrology/nodes-lilith';
import {
  analyzeDavisonChart,
  analyzeProgressedChart,
} from '@/lib/compatibility/astrology/davison-progressed';
import { analyzeDegreeBasedAspects } from '@/lib/compatibility/astrology/degree-aspects';

describe('comprehensive', () => {
  const mockP1: AstrologyProfile = {
    sun: { sign: 'Aries', element: 'fire' },
    moon: { sign: 'Taurus', element: 'earth' },
    venus: { sign: 'Pisces', element: 'water' },
    mars: { sign: 'Gemini', element: 'air' },
    ascendant: { sign: 'Leo', element: 'fire' },
  };

  const mockP2: AstrologyProfile = {
    sun: { sign: 'Libra', element: 'air' },
    moon: { sign: 'Scorpio', element: 'water' },
    venus: { sign: 'Virgo', element: 'earth' },
    mars: { sign: 'Sagittarius', element: 'fire' },
    ascendant: { sign: 'Aquarius', element: 'air' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performComprehensiveAstrologyAnalysis', () => {
    it('should perform all basic analyses', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 80,
        keyInsights: ['Good harmony'],
        harmonicCount: 5,
        challengingCount: 2,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 75,
        strengths: ['Strong communication'],
        challenges: [],
        emotionalDynamics: 'Balanced',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 85,
        relationshipPurpose: 'Growth',
        coreTheme: 'Partnership',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: 'Positive',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      expect(analyzeAspects).toHaveBeenCalledWith(mockP1, mockP2);
      expect(analyzeSynastry).toHaveBeenCalledWith(mockP1, mockP2);
      expect(analyzeCompositeChart).toHaveBeenCalledWith(mockP1, mockP2);
      expect(analyzeHouseOverlays).toHaveBeenCalledWith(mockP1, mockP2);
      expect(result).toBeDefined();
    });

    it('should calculate overall score correctly', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 90,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 80,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 70,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      // 90*0.3 + 80*0.4 + 70*0.3 = 27 + 32 + 21 = 80
      expect(result.overallScore).toBe(80);
    });

    it('should assign S+ grade for score >= 95', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 100,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 95,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 90,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      // 100*0.3 + 95*0.4 + 90*0.3 = 30 + 38 + 27 = 95
      expect(result.grade).toBe('S+');
    });

    it('should assign S grade for score >= 85', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 90,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 85,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 80,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      expect(result.grade).toBe('S');
    });

    it('should assign A grade for score >= 75', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 80,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 75,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 70,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      expect(result.grade).toBe('A');
    });

    it('should assign F grade for score < 35', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 30,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 25,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 35,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      // 30*0.3 + 25*0.4 + 35*0.3 = 9 + 10 + 10.5 = 29.5 => 30
      expect(result.grade).toBe('F');
    });

    it('should include appropriate summary for S+ grade', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 100,
        keyInsights: [],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 95,
        strengths: [],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 90,
        relationshipPurpose: '',
        coreTheme: '',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      expect(result.summary).toContain('매우 이상적인 궁합');
    });

    it('should include detailed insights from all analyses', () => {
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 80,
        keyInsights: ['Insight 1', 'Insight 2'],
        harmonicCount: 0,
        challengingCount: 0,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 75,
        strengths: ['Strength 1', 'Strength 2'],
        challenges: [],
        emotionalDynamics: '',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 70,
        relationshipPurpose: 'Purpose test',
        coreTheme: 'Theme test',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: '',
      });

      const result = performComprehensiveAstrologyAnalysis(mockP1, mockP2);

      expect(result.detailedInsights).toContain('Insight 1');
      expect(result.detailedInsights).toContain('Insight 2');
      expect(result.detailedInsights).toContain('Strength 1');
      expect(result.detailedInsights).toContain('Strength 2');
      expect(result.detailedInsights.some(i => i.includes('Purpose test'))).toBe(true);
      expect(result.detailedInsights.some(i => i.includes('Theme test'))).toBe(true);
    });
  });

  describe('performExtendedAstrologyAnalysis', () => {
    const mockExtendedP1: ExtendedAstrologyProfile = {
      ...mockP1,
      mercury: { sign: 'Aries', element: 'fire', degree: 15 },
      jupiter: { sign: 'Leo', element: 'fire' },
      saturn: { sign: 'Capricorn', element: 'earth' },
      uranus: { sign: 'Aquarius', element: 'air' },
      neptune: { sign: 'Pisces', element: 'water' },
      pluto: { sign: 'Scorpio', element: 'water' },
      northNode: { sign: 'Gemini', element: 'air' },
      southNode: { sign: 'Sagittarius', element: 'fire' },
      lilith: { sign: 'Scorpio', element: 'water' },
    };

    const mockExtendedP2: ExtendedAstrologyProfile = {
      ...mockP2,
      mercury: { sign: 'Libra', element: 'air', degree: 20 },
      jupiter: { sign: 'Sagittarius', element: 'fire' },
      saturn: { sign: 'Virgo', element: 'earth' },
      uranus: { sign: 'Aquarius', element: 'air' },
      neptune: { sign: 'Pisces', element: 'water' },
      pluto: { sign: 'Scorpio', element: 'water' },
      northNode: { sign: 'Aries', element: 'fire' },
      southNode: { sign: 'Libra', element: 'air' },
      lilith: { sign: 'Taurus', element: 'earth' },
    };

    beforeEach(() => {
      // Setup base mocks
      vi.mocked(analyzeAspects).mockReturnValue({
        overallHarmony: 80,
        keyInsights: ['Base insight'],
        harmonicCount: 5,
        challengingCount: 2,
      });

      vi.mocked(analyzeSynastry).mockReturnValue({
        compatibilityIndex: 75,
        strengths: ['Base strength'],
        challenges: [],
        emotionalDynamics: 'Balanced',
      });

      vi.mocked(analyzeCompositeChart).mockReturnValue({
        longevityPotential: 85,
        relationshipPurpose: 'Growth',
        coreTheme: 'Partnership',
      });

      vi.mocked(analyzeHouseOverlays).mockReturnValue({
        influences: [],
        overallInfluence: 'Positive',
      });
    });

    it('should perform extended analyses when optional data available', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 85,
        tightestAspect: {
          planet1: 'Sun',
          planet2: 'Moon',
          aspectType: 'trine',
          orb: 2,
        },
        aspectList: [],
      });

      vi.mocked(analyzeMercuryAspects).mockReturnValue({
        mercuryCompatibility: 80,
        communicationStyle: 'Harmonious',
        intellectualSynergy: 75,
      });

      vi.mocked(analyzeJupiterAspects).mockReturnValue({
        expansionCompatibility: 85,
        sharedBeliefs: 'Philosophy',
        growthPotential: 80,
      });

      vi.mocked(analyzeSaturnAspects).mockReturnValue({
        longTermPotential: 90,
        karmicLesson: 'Responsibility',
        commitmentLevel: 85,
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: ['Innovation'],
        uranusScore: 70,
        neptuneScore: 75,
        plutoScore: 80,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'soulmate',
        evolutionaryPurpose: 'Spiritual growth',
        northNodeConnection: { compatibility: 85 },
        southNodeConnection: { compatibility: 70 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 90,
        shadowDynamics: 'Intense',
        sexualChemistry: 85,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: 'Creative partnership',
        relationshipPurpose: 'Mutual growth',
        compositeEnergy: 'Dynamic',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: 'Deepening',
        evolutionDirection: 'Positive',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2, 2);

      expect(result.degreeBasedAspects).toBeDefined();
      expect(result.mercuryAnalysis).toBeDefined();
      expect(result.jupiterAnalysis).toBeDefined();
      expect(result.saturnAnalysis).toBeDefined();
      expect(result.outerPlanetsAnalysis).toBeDefined();
      expect(result.nodeAnalysis).toBeDefined();
      expect(result.lilithAnalysis).toBeDefined();
      expect(result.davisonChart).toBeDefined();
      expect(result.progressedChart).toBeDefined();
    });

    it('should calculate extended score from all analyses', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 90,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeMercuryAspects).mockReturnValue({
        mercuryCompatibility: 85,
        communicationStyle: '',
        intellectualSynergy: 0,
      });

      vi.mocked(analyzeJupiterAspects).mockReturnValue({
        expansionCompatibility: 80,
        sharedBeliefs: '',
        growthPotential: 0,
      });

      vi.mocked(analyzeSaturnAspects).mockReturnValue({
        longTermPotential: 95,
        karmicLesson: '',
        commitmentLevel: 0,
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'growth',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 80 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 85,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2);

      // Base: 80, Degree: 90, Mercury: 85, Jupiter: 80, Saturn: 95, Outer: 75, Node: 80, Lilith: 85
      // Average = (80 + 90 + 85 + 80 + 95 + 75 + 80 + 85) / 8 = 670 / 8 = 83.75 => 84
      expect(result.extendedScore).toBe(84);
    });

    it('should add soulmate note to summary when detected', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 80,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'soulmate',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 85 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 70,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2);

      expect(result.extendedSummary).toContain('소울메이트');
    });

    it('should add karmic note to summary when detected', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 80,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'karmic',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 75 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 70,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2);

      expect(result.extendedSummary).toContain('전생의 인연');
    });

    it('should add magnetic attraction note when high', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 80,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'growth',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 75 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 85,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2);

      expect(result.extendedSummary).toContain('자기적 끌림');
    });

    it('should add long-term stability note when Saturn score high', () => {
      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 80,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeSaturnAspects).mockReturnValue({
        longTermPotential: 85,
        karmicLesson: '',
        commitmentLevel: 0,
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'growth',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 75 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 70,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(mockExtendedP1, mockExtendedP2);

      expect(result.extendedSummary).toContain('장기적 안정성');
    });

    it('should skip Mercury analysis if not available', () => {
      const p1WithoutMercury = { ...mockP1 };
      const p2WithoutMercury = { ...mockP2 };

      vi.mocked(analyzeDegreeBasedAspects).mockReturnValue({
        overallBalance: 80,
        tightestAspect: null,
        aspectList: [],
      });

      vi.mocked(analyzeOuterPlanets).mockReturnValue({
        overallTranscendentScore: 75,
        generationalThemes: [],
        uranusScore: 0,
        neptuneScore: 0,
        plutoScore: 0,
      });

      vi.mocked(analyzeNodes).mockReturnValue({
        karmicRelationshipType: 'growth',
        evolutionaryPurpose: '',
        northNodeConnection: { compatibility: 75 },
        southNodeConnection: { compatibility: 0 },
      });

      vi.mocked(analyzeLilith).mockReturnValue({
        magneticAttraction: 70,
        shadowDynamics: null,
        sexualChemistry: 0,
      });

      vi.mocked(analyzeDavisonChart).mockReturnValue({
        relationshipIdentity: '',
        relationshipPurpose: '',
        compositeEnergy: '',
      });

      vi.mocked(analyzeProgressedChart).mockReturnValue({
        currentRelationshipTheme: '',
        evolutionDirection: '',
        upcomingChallenges: [],
      });

      const result = performExtendedAstrologyAnalysis(p1WithoutMercury, p2WithoutMercury);

      expect(analyzeMercuryAspects).not.toHaveBeenCalled();
      expect(result.mercuryAnalysis).toBeUndefined();
    });
  });
});
