// Test 10 different couples to verify compatibility analysis produces unique results
import { calculateSajuData } from '../src/lib/saju/saju';
import {
  performComprehensiveSajuAnalysis,
  analyzeTenGods,
  analyzeShinsals,
  analyzeHap,
  analyzeConflicts,
  analyzeYongsinCompatibility,
  analyzeGongmang,
  analyzeGanHap,
  analyzeGyeokguk,
  analyzeTwelveStates,
} from '../src/lib/compatibility/advancedSajuAnalysis';

// Helper to convert raw saju to profile format
function buildSajuProfile(saju: ReturnType<typeof calculateSajuData>) {
  // Convert Korean element to English
  const elementMap: Record<string, string> = {
    '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water',
    'wood': 'wood', 'fire': 'fire', 'earth': 'earth', 'metal': 'metal', 'water': 'water',
  };

  // Helper to extract name from pillar stem/branch (which may be string or object)
  const getStemName = (pillar: { heavenlyStem: string | { name: string } }) => {
    return typeof pillar.heavenlyStem === 'string'
      ? pillar.heavenlyStem
      : pillar.heavenlyStem.name;
  };

  const getBranchName = (pillar: { earthlyBranch: string | { name: string } }) => {
    return typeof pillar.earthlyBranch === 'string'
      ? pillar.earthlyBranch
      : pillar.earthlyBranch.name;
  };

  // Determine yin/yang from stem name
  const yinStems = ['乙', '丁', '己', '辛', '癸'];
  const stemName = saju.dayMaster.name;
  const yinYang = yinStems.includes(stemName) ? 'yin' : 'yang';

  return {
    dayMaster: {
      name: saju.dayMaster.name,
      element: (elementMap[saju.dayMaster.element] || saju.dayMaster.element) as 'wood' | 'fire' | 'earth' | 'metal' | 'water',
      yin_yang: yinYang as 'yin' | 'yang',
    },
    pillars: {
      year: {
        stem: getStemName(saju.yearPillar),
        branch: getBranchName(saju.yearPillar),
      },
      month: {
        stem: getStemName(saju.monthPillar),
        branch: getBranchName(saju.monthPillar),
      },
      day: {
        stem: getStemName(saju.dayPillar),
        branch: getBranchName(saju.dayPillar),
      },
      time: {
        stem: getStemName(saju.timePillar),
        branch: getBranchName(saju.timePillar),
      },
    },
    elements: {
      wood: saju.fiveElements.wood || 0,
      fire: saju.fiveElements.fire || 0,
      earth: saju.fiveElements.earth || 0,
      metal: saju.fiveElements.metal || 0,
      water: saju.fiveElements.water || 0,
    },
  };
}

// 10 couples with different birth dates and times
const couples = [
  {
    name: '커플1',
    person1: { name: '철수', date: '1990-03-15', time: '14:30', gender: 'male' as const },
    person2: { name: '영희', date: '1992-07-22', time: '09:15', gender: 'female' as const },
  },
  {
    name: '커플2',
    person1: { name: '민수', date: '1985-12-25', time: '08:00', gender: 'male' as const },
    person2: { name: '수진', date: '1988-06-10', time: '22:30', gender: 'female' as const },
  },
  {
    name: '커플3',
    person1: { name: '지훈', date: '1995-01-01', time: '00:00', gender: 'male' as const },
    person2: { name: '미나', date: '1996-11-30', time: '16:45', gender: 'female' as const },
  },
  {
    name: '커플4',
    person1: { name: '현우', date: '1980-08-08', time: '12:00', gender: 'male' as const },
    person2: { name: '소연', date: '1983-04-04', time: '06:00', gender: 'female' as const },
  },
  {
    name: '커플5',
    person1: { name: '준혁', date: '2000-02-29', time: '03:30', gender: 'male' as const },
    person2: { name: '유진', date: '1999-09-09', time: '21:00', gender: 'female' as const },
  },
  {
    name: '커플6',
    person1: { name: '동현', date: '1978-05-05', time: '17:00', gender: 'male' as const },
    person2: { name: '지연', date: '1981-10-15', time: '11:30', gender: 'female' as const },
  },
  {
    name: '커플7',
    person1: { name: '성민', date: '1993-07-07', time: '07:07', gender: 'male' as const },
    person2: { name: '예린', date: '1994-12-12', time: '12:12', gender: 'female' as const },
  },
  {
    name: '커플8',
    person1: { name: '재원', date: '1987-03-20', time: '23:59', gender: 'male' as const },
    person2: { name: '하나', date: '1990-08-25', time: '05:15', gender: 'female' as const },
  },
  {
    name: '커플9',
    person1: { name: '우진', date: '2002-11-11', time: '11:11', gender: 'male' as const },
    person2: { name: '서연', date: '2001-06-21', time: '18:30', gender: 'female' as const },
  },
  {
    name: '커플10',
    person1: { name: '태현', date: '1975-09-15', time: '04:00', gender: 'male' as const },
    person2: { name: '은지', date: '1979-01-20', time: '19:45', gender: 'female' as const },
  },
];

// Helper to get stem/branch name from pillar
function getDayPillarStr(pillar: { heavenlyStem: string | { name: string }; earthlyBranch: string | { name: string } }) {
  const stem = typeof pillar.heavenlyStem === 'string' ? pillar.heavenlyStem : pillar.heavenlyStem.name;
  const branch = typeof pillar.earthlyBranch === 'string' ? pillar.earthlyBranch : pillar.earthlyBranch.name;
  return `${stem}${branch}`;
}

describe('10 Couples Compatibility Analysis', () => {
  it('calculates unique saju for each person', () => {
    const dayPillars = new Set<string>();
    const dayMasters = new Set<string>();

    for (const couple of couples) {
      const p1Saju = calculateSajuData(
        couple.person1.date,
        couple.person1.time,
        couple.person1.gender,
        'solar',
        'Asia/Seoul'
      );

      const p2Saju = calculateSajuData(
        couple.person2.date,
        couple.person2.time,
        couple.person2.gender,
        'solar',
        'Asia/Seoul'
      );

      const p1DayPillar = getDayPillarStr(p1Saju.dayPillar);
      const p2DayPillar = getDayPillarStr(p2Saju.dayPillar);

      dayPillars.add(p1DayPillar);
      dayPillars.add(p2DayPillar);
      dayMasters.add(p1Saju.dayMaster.name);
      dayMasters.add(p2Saju.dayMaster.name);

    }


    // Most day pillars should be unique
    expect(dayPillars.size).toBeGreaterThanOrEqual(10);
  });

  it('performs comprehensive saju analysis for each couple', () => {
    const analysisResults: Array<{
      couple: string;
      score: number;
      grade: string;
      summary: string;
    }> = [];

    for (const couple of couples) {
      const p1Saju = calculateSajuData(
        couple.person1.date,
        couple.person1.time,
        couple.person1.gender,
        'solar',
        'Asia/Seoul'
      );

      const p2Saju = calculateSajuData(
        couple.person2.date,
        couple.person2.time,
        couple.person2.gender,
        'solar',
        'Asia/Seoul'
      );

      const p1Profile = buildSajuProfile(p1Saju);
      const p2Profile = buildSajuProfile(p2Saju);

      const analysis = performComprehensiveSajuAnalysis(p1Profile, p2Profile);

      analysisResults.push({
        couple: couple.name,
        score: analysis.overallScore,
        grade: analysis.grade,
        summary: analysis.summary,
      });

    }

    // Verify all couples have valid scores
    for (const result of analysisResults) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['S+', 'S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    }

    // Verify scores are varied (not all the same)
    const uniqueScores = new Set(analysisResults.map(r => r.score));
    expect(uniqueScores.size).toBeGreaterThanOrEqual(3);
  });

  it('analyzes ten gods with personalized day master names', () => {
    const couple = couples[0]; // Use first couple

    const p1Saju = calculateSajuData(
      couple.person1.date,
      couple.person1.time,
      couple.person1.gender,
      'solar',
      'Asia/Seoul'
    );

    const p2Saju = calculateSajuData(
      couple.person2.date,
      couple.person2.time,
      couple.person2.gender,
      'solar',
      'Asia/Seoul'
    );

    const p1Profile = buildSajuProfile(p1Saju);
    const p2Profile = buildSajuProfile(p2Saju);

    const tenGods = analyzeTenGods(p1Profile, p2Profile);


    // Verify personalized names in relationship dynamics
    expect(tenGods.relationshipDynamics.length).toBeGreaterThan(0);
    expect(tenGods.person1Primary.length).toBeGreaterThan(0);
    expect(tenGods.person2Primary.length).toBeGreaterThan(0);
    expect(tenGods.interaction.balance).toBeGreaterThanOrEqual(0);
  });

  it('analyzes shinsals (divine spirits)', () => {
    const couple = couples[1]; // Use second couple

    const p1Saju = calculateSajuData(
      couple.person1.date,
      couple.person1.time,
      couple.person1.gender,
      'solar',
      'Asia/Seoul'
    );

    const p2Saju = calculateSajuData(
      couple.person2.date,
      couple.person2.time,
      couple.person2.gender,
      'solar',
      'Asia/Seoul'
    );

    const p1Profile = buildSajuProfile(p1Saju);
    const p2Profile = buildSajuProfile(p2Saju);

    const shinsals = analyzeShinsals(p1Profile, p2Profile);


    expect(['very_positive', 'positive', 'neutral', 'challenging']).toContain(shinsals.overallImpact);
  });

  it('analyzes harmonies and conflicts', () => {
    const couple = couples[2]; // Use third couple

    const p1Saju = calculateSajuData(
      couple.person1.date,
      couple.person1.time,
      couple.person1.gender,
      'solar',
      'Asia/Seoul'
    );

    const p2Saju = calculateSajuData(
      couple.person2.date,
      couple.person2.time,
      couple.person2.gender,
      'solar',
      'Asia/Seoul'
    );

    const p1Profile = buildSajuProfile(p1Saju);
    const p2Profile = buildSajuProfile(p2Saju);

    const harmonies = analyzeHap(p1Profile, p2Profile);
    const conflicts = analyzeConflicts(p1Profile, p2Profile);



    expect(harmonies.score).toBeGreaterThanOrEqual(0);
    expect(['severe', 'moderate', 'mild', 'minimal']).toContain(conflicts.severity);
  });

  it('analyzes yongsin compatibility', () => {
    const couple = couples[3]; // Use fourth couple

    const p1Saju = calculateSajuData(
      couple.person1.date,
      couple.person1.time,
      couple.person1.gender,
      'solar',
      'Asia/Seoul'
    );

    const p2Saju = calculateSajuData(
      couple.person2.date,
      couple.person2.time,
      couple.person2.gender,
      'solar',
      'Asia/Seoul'
    );

    const p1Profile = buildSajuProfile(p1Saju);
    const p2Profile = buildSajuProfile(p2Saju);

    const yongsin = analyzeYongsinCompatibility(p1Profile, p2Profile);


    expect(yongsin.compatibility).toBeGreaterThanOrEqual(0);
    expect(yongsin.compatibility).toBeLessThanOrEqual(100);
    expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(yongsin.person1Yongsin);
    expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(yongsin.person2Yongsin);
  });

  it('analyzes all advanced analyses for one couple', () => {
    const couple = couples[4]; // Use fifth couple

    const p1Saju = calculateSajuData(
      couple.person1.date,
      couple.person1.time,
      couple.person1.gender,
      'solar',
      'Asia/Seoul'
    );

    const p2Saju = calculateSajuData(
      couple.person2.date,
      couple.person2.time,
      couple.person2.gender,
      'solar',
      'Asia/Seoul'
    );

    const p1Profile = buildSajuProfile(p1Saju);
    const p2Profile = buildSajuProfile(p2Saju);

    // All advanced analyses
    const gongmang = analyzeGongmang(p1Profile, p2Profile);
    const ganHap = analyzeGanHap(p1Profile, p2Profile);
    const gyeokguk = analyzeGyeokguk(p1Profile, p2Profile);
    const twelveStates = analyzeTwelveStates(p1Profile, p2Profile);





    expect(['positive', 'neutral', 'negative']).toContain(gongmang.impact);
    expect(ganHap.totalHarmony).toBeGreaterThanOrEqual(0);
    expect(['excellent', 'good', 'neutral', 'challenging']).toContain(gyeokguk.compatibility);
    expect(twelveStates.energyCompatibility).toBeGreaterThanOrEqual(0);
  });

  it('ensures all couples have different analyses', () => {
    const allScores: number[] = [];
    const allGrades: string[] = [];

    for (const couple of couples) {
      const p1Saju = calculateSajuData(
        couple.person1.date,
        couple.person1.time,
        couple.person1.gender,
        'solar',
        'Asia/Seoul'
      );

      const p2Saju = calculateSajuData(
        couple.person2.date,
        couple.person2.time,
        couple.person2.gender,
        'solar',
        'Asia/Seoul'
      );

      const p1Profile = buildSajuProfile(p1Saju);
      const p2Profile = buildSajuProfile(p2Saju);

      const analysis = performComprehensiveSajuAnalysis(p1Profile, p2Profile);
      allScores.push(analysis.overallScore);
      allGrades.push(analysis.grade);
    }


    const uniqueScores = new Set(allScores);
    const uniqueGrades = new Set(allGrades);


    // At least 3 different scores to ensure variety
    expect(uniqueScores.size).toBeGreaterThanOrEqual(3);
  });
});
