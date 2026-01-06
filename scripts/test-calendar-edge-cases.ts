/**
 * 운세 캘린더 엣지 케이스 테스트
 * 극단적 상황에서 점수 시스템이 올바르게 동작하는지 확인
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';
import { calculateGrade, type GradeInput } from '../src/lib/destiny-map/calendar/grading';

// 테스트 케이스 정의
const testCases: Array<{
  name: string;
  sajuInput: SajuScoreInput;
  astroInput: AstroScoreInput;
  description: string;
}> = [
  {
    name: '최고의 날',
    description: '모든 긍정적 요소 활성화, 부정적 요소 없음',
    sajuInput: {
      daeun: {
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      seun: {
        sibsin: 'jaeseong',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
        isSamjaeYear: false,
        hasGwiin: true,
      },
      wolun: {
        sibsin: 'bijeon',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      iljin: {
        sibsin: 'siksang',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasSamhapNegative: false,
        hasChung: false,
        hasXing: false,
        hasHai: false,
        hasCheoneulGwiin: true,
        hasGeonrok: true,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        hasGongmang: false,
        hasWonjin: false,
        hasYangin: false,
        hasGoegang: false,
        hasHwagae: false,
        hasBackho: false,
        hasGuimungwan: true,
        hasTaegukGwiin: true,
        hasCheondeokGwiin: true,
        hasWoldeokGwiin: true,
      },
      yongsin: {
        hasPrimaryMatch: true,
        hasSecondaryMatch: true,
        hasBranchMatch: true,
        hasSupport: true,
        hasKibsinMatch: true,
        hasKibsinBranch: true,
        hasHarm: false,
        geokgukFavor: true,
        geokgukAvoid: false,
        strengthBalance: true,
        strengthImbalance: false,
      },
    },
    astroInput: {
      transitSun: {
        elementRelation: 'same',
      },
      transitMoon: {
        elementRelation: 'generatedBy',
        isVoidOfCourse: false,
      },
      majorPlanets: {
        mercury: { aspect: 'trine', isRetrograde: false },
        venus: { aspect: 'trine', isRetrograde: false },
        mars: { aspect: 'sextile', isRetrograde: false },
        jupiter: { aspect: 'trine', isRetrograde: false },
        saturn: { aspect: 'sextile', isRetrograde: false },
      },
      outerPlanets: {
        uranus: { aspect: 'trine' },
        neptune: { aspect: 'sextile' },
        pluto: { aspect: 'trine' },
      },
      specialPoints: {
        chiron: { aspect: 'sextile' },
        northNode: { aspect: 'trine' },
        southNode: undefined,
        lilith: { aspect: 'sextile' },
      },
      eclipse: {
        isEclipseDay: false,
        isNearEclipse: false,
        eclipseType: 'solar',
      },
      lunarPhase: 'fullMoon',
      solarReturn: {
        daysFromBirthday: 0,
        progressionSupport: true,
        progressionChallenge: false,
      },
    },
  },
  {
    name: '최악의 날',
    description: '모든 부정적 요소 활성화, 긍정적 요소 없음',
    sajuInput: {
      daeun: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: true,
        hasGwansal: true,
        hasSamhapNegative: true,
      },
      seun: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: true,
        hasGwansal: true,
        hasSamhapNegative: true,
        isSamjaeYear: true,
        hasGwiin: false,
      },
      wolun: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: true,
        hasGwansal: true,
        hasSamhapNegative: true,
      },
      iljin: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasSamhapNegative: true,
        hasChung: true,
        hasXing: true,
        hasHai: true,
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: true,
        hasYeokma: true,
        hasDohwa: true,
        hasGongmang: true,
        hasWonjin: true,
        hasYangin: true,
        hasGoegang: true,
        hasHwagae: true,
        hasBackho: true,
        hasGuimungwan: false,
        hasTaegukGwiin: false,
        hasCheondeokGwiin: false,
        hasWoldeokGwiin: false,
      },
      yongsin: {
        hasPrimaryMatch: false,
        hasSecondaryMatch: false,
        hasBranchMatch: false,
        hasSupport: false,
        hasKibsinMatch: false,
        hasKibsinBranch: false,
        hasHarm: true,
        geokgukFavor: false,
        geokgukAvoid: true,
        strengthBalance: false,
        strengthImbalance: true,
      },
    },
    astroInput: {
      transitSun: {
        elementRelation: 'controlledBy',
      },
      transitMoon: {
        elementRelation: 'controlledBy',
        isVoidOfCourse: true,
      },
      majorPlanets: {
        mercury: { aspect: 'opposition', isRetrograde: true },
        venus: { aspect: 'square', isRetrograde: true },
        mars: { aspect: 'opposition', isRetrograde: true },
        jupiter: { aspect: 'square', isRetrograde: true },
        saturn: { aspect: 'opposition', isRetrograde: true },
      },
      outerPlanets: {
        uranus: { aspect: 'square' },
        neptune: { aspect: 'opposition' },
        pluto: { aspect: 'square' },
      },
      specialPoints: {
        chiron: { aspect: 'opposition' },
        northNode: undefined,
        southNode: { aspect: 'square' },
        lilith: { aspect: 'opposition' },
      },
      eclipse: {
        isEclipseDay: true,
        isNearEclipse: true,
        eclipseType: 'lunar',
      },
      lunarPhase: 'newMoon',
      solarReturn: {
        daysFromBirthday: 182,
        progressionSupport: false,
        progressionChallenge: true,
      },
    },
  },
  {
    name: '충형 동시 발생',
    description: '충과 형이 동시에 있어 천운(Grade 0) 불가능',
    sajuInput: {
      daeun: {
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      seun: {
        sibsin: 'jaeseong',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
        isSamjaeYear: false,
        hasGwiin: true,
      },
      wolun: {
        sibsin: 'bijeon',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      iljin: {
        sibsin: 'siksang',
        hasYukhap: true,
        hasSamhapPositive: true,
        hasSamhapNegative: false,
        hasChung: true, // 충 있음
        hasXing: true, // 형 있음
        hasHai: false,
        hasCheoneulGwiin: true,
        hasGeonrok: true,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        hasGongmang: false,
        hasWonjin: false,
        hasYangin: false,
        hasGoegang: false,
        hasHwagae: false,
        hasBackho: false,
        hasGuimungwan: true,
        hasTaegukGwiin: true,
        hasCheondeokGwiin: true,
        hasWoldeokGwiin: true,
      },
      yongsin: {
        hasPrimaryMatch: true,
        hasSecondaryMatch: true,
        hasBranchMatch: true,
        hasSupport: true,
        hasKibsinMatch: true,
        hasKibsinBranch: true,
        hasHarm: false,
        geokgukFavor: true,
        geokgukAvoid: false,
        strengthBalance: true,
        strengthImbalance: false,
      },
    },
    astroInput: {
      transitSun: {
        elementRelation: 'same',
      },
      transitMoon: {
        elementRelation: 'generatedBy',
        isVoidOfCourse: false,
      },
      majorPlanets: {
        mercury: { aspect: 'trine', isRetrograde: false },
        venus: { aspect: 'trine', isRetrograde: false },
        mars: { aspect: 'sextile', isRetrograde: false },
        jupiter: { aspect: 'trine', isRetrograde: false },
        saturn: { aspect: 'sextile', isRetrograde: false },
      },
      outerPlanets: {
        uranus: { aspect: 'trine' },
        neptune: { aspect: 'sextile' },
        pluto: { aspect: 'trine' },
      },
      specialPoints: {
        chiron: { aspect: 'sextile' },
        northNode: { aspect: 'trine' },
        southNode: undefined,
        lilith: { aspect: 'sextile' },
      },
      eclipse: undefined,
      lunarPhase: 'fullMoon',
      solarReturn: {
        daysFromBirthday: 0,
        progressionSupport: true,
        progressionChallenge: false,
      },
    },
  },
  {
    name: '생일 특별 보너스',
    description: '생일 당일로 +3점 보너스',
    sajuInput: {
      daeun: {
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      seun: {
        sibsin: 'jaeseong',
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
        isSamjaeYear: false,
        hasGwiin: true,
      },
      wolun: {
        sibsin: 'bijeon',
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      iljin: {
        sibsin: 'siksang',
        hasYukhap: false,
        hasSamhapPositive: false,
        hasSamhapNegative: false,
        hasChung: false,
        hasXing: false,
        hasHai: false,
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        hasGongmang: false,
        hasWonjin: false,
        hasYangin: false,
        hasGoegang: false,
        hasHwagae: false,
        hasBackho: false,
        hasGuimungwan: false,
        hasTaegukGwiin: false,
        hasCheondeokGwiin: false,
        hasWoldeokGwiin: false,
      },
      yongsin: {
        hasPrimaryMatch: true,
        hasSecondaryMatch: false,
        hasBranchMatch: false,
        hasSupport: true,
        hasKibsinMatch: false,
        hasKibsinBranch: false,
        hasHarm: false,
        geokgukFavor: true,
        geokgukAvoid: false,
        strengthBalance: true,
        strengthImbalance: false,
      },
    },
    astroInput: {
      transitSun: {
        elementRelation: 'generates',
      },
      transitMoon: {
        elementRelation: 'generates',
        isVoidOfCourse: false,
      },
      majorPlanets: {
        mercury: { aspect: 'trine', isRetrograde: false },
        venus: { aspect: 'conjunction', isRetrograde: false },
        mars: undefined,
        jupiter: { aspect: 'sextile', isRetrograde: false },
        saturn: undefined,
      },
      outerPlanets: undefined,
      specialPoints: undefined,
      eclipse: undefined,
      lunarPhase: 'fullMoon',
      solarReturn: {
        daysFromBirthday: 0, // 생일 당일
        progressionSupport: true,
        progressionChallenge: false,
      },
    },
  },
  {
    name: '평범한 날',
    description: '긍정/부정 요소 균형',
    sajuInput: {
      daeun: {
        sibsin: 'bijeon',
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      seun: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
        isSamjaeYear: false,
        hasGwiin: false,
      },
      wolun: {
        sibsin: undefined,
        hasYukhap: false,
        hasSamhapPositive: false,
        hasChung: false,
        hasGwansal: false,
        hasSamhapNegative: false,
      },
      iljin: {
        sibsin: 'gyeobjae',
        hasYukhap: false,
        hasSamhapPositive: false,
        hasSamhapNegative: false,
        hasChung: false,
        hasXing: false,
        hasHai: false,
        hasCheoneulGwiin: false,
        hasGeonrok: false,
        hasSonEomneun: false,
        hasYeokma: false,
        hasDohwa: false,
        hasGongmang: false,
        hasWonjin: false,
        hasYangin: false,
        hasGoegang: false,
        hasHwagae: false,
        hasBackho: false,
        hasGuimungwan: false,
        hasTaegukGwiin: false,
        hasCheondeokGwiin: false,
        hasWoldeokGwiin: false,
      },
      yongsin: {
        hasPrimaryMatch: false,
        hasSecondaryMatch: false,
        hasBranchMatch: false,
        hasSupport: false,
        hasKibsinMatch: false,
        hasKibsinBranch: false,
        hasHarm: false,
        geokgukFavor: false,
        geokgukAvoid: false,
        strengthBalance: false,
        strengthImbalance: false,
      },
    },
    astroInput: {
      transitSun: {
        elementRelation: 'same',
      },
      transitMoon: {
        elementRelation: 'same',
        isVoidOfCourse: false,
      },
      majorPlanets: {
        mercury: undefined,
        venus: undefined,
        mars: undefined,
        jupiter: undefined,
        saturn: undefined,
      },
      outerPlanets: undefined,
      specialPoints: undefined,
      eclipse: undefined,
      lunarPhase: 'firstQuarter',
      solarReturn: {
        daysFromBirthday: 180,
        progressionSupport: false,
        progressionChallenge: false,
      },
    },
  },
];

// 테스트 실행
console.log('='.repeat(80));
console.log('운세 캘린더 엣지 케이스 테스트');
console.log('='.repeat(80));
console.log();

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   설명: ${testCase.description}`);
  console.log();

  const scoreResult = calculateTotalScore(testCase.sajuInput, testCase.astroInput);

  // GradeInput 생성
  const gradeInput: GradeInput = {
    score: scoreResult.totalScore,
    isBirthdaySpecial: testCase.astroInput.solarReturn.daysFromBirthday !== undefined && testCase.astroInput.solarReturn.daysFromBirthday <= 1,
    crossVerified: scoreResult.crossVerified,
    sajuPositive: scoreResult.sajuPositive,
    astroPositive: scoreResult.astroPositive,
    totalStrengthCount: (
      (testCase.sajuInput.iljin.hasCheoneulGwiin ? 1 : 0) +
      (testCase.sajuInput.iljin.hasGeonrok ? 1 : 0) +
      (testCase.sajuInput.iljin.hasTaegukGwiin ? 1 : 0) +
      (testCase.sajuInput.iljin.hasCheondeokGwiin ? 1 : 0) +
      (testCase.sajuInput.iljin.hasWoldeokGwiin ? 1 : 0)
    ),
    sajuBadCount: (
      (testCase.sajuInput.iljin.hasGongmang ? 1 : 0) +
      (testCase.sajuInput.iljin.hasWonjin ? 1 : 0) +
      (testCase.sajuInput.iljin.hasBackho ? 1 : 0)
    ),
    hasChung: testCase.sajuInput.iljin.hasChung || false,
    hasXing: testCase.sajuInput.iljin.hasXing || false,
    hasNoMajorRetrograde: !(
      testCase.astroInput.majorPlanets.mercury?.isRetrograde ||
      testCase.astroInput.majorPlanets.venus?.isRetrograde ||
      testCase.astroInput.majorPlanets.mars?.isRetrograde
    ),
    retrogradeCount: (
      (testCase.astroInput.majorPlanets.mercury?.isRetrograde ? 1 : 0) +
      (testCase.astroInput.majorPlanets.venus?.isRetrograde ? 1 : 0) +
      (testCase.astroInput.majorPlanets.mars?.isRetrograde ? 1 : 0) +
      (testCase.astroInput.majorPlanets.jupiter?.isRetrograde ? 1 : 0) +
      (testCase.astroInput.majorPlanets.saturn?.isRetrograde ? 1 : 0)
    ),
    totalBadCount: (
      (testCase.sajuInput.iljin.hasChung ? 1 : 0) +
      (testCase.sajuInput.iljin.hasXing ? 1 : 0) +
      (testCase.sajuInput.iljin.hasGongmang ? 1 : 0) +
      (testCase.sajuInput.iljin.hasWonjin ? 1 : 0) +
      (testCase.sajuInput.iljin.hasBackho ? 1 : 0)
    ),
  };

  const gradeResult = calculateGrade(gradeInput);

  const gradeLabels = ['천운', '아주좋음', '좋음', '보통', '나쁨', '아주나쁨'];
  const gradeEmojis = ['🌟', '😊', '🙂', '😐', '😟', '😰'];

  console.log(`   ├─ 사주 점수: ${scoreResult.sajuScore}점 / 50점`);
  console.log(`   ├─ 점성술 점수: ${scoreResult.astroScore}점 / 50점`);
  console.log(`   ├─ 교차검증 보너스: ${scoreResult.crossBonus >= 0 ? '+' : ''}${scoreResult.crossBonus}점`);
  console.log(`   ├─ 기본 총점: ${scoreResult.totalScore}점`);
  console.log(`   ├─ 등급 보너스: ${gradeResult.gradeBonus >= 0 ? '+' : ''}${gradeResult.gradeBonus}점`);
  console.log(`   ├─ 최종 점수: ${gradeResult.adjustedScore}점`);
  console.log(`   └─ 등급: Grade ${gradeResult.grade} ${gradeEmojis[gradeResult.grade]} ${gradeLabels[gradeResult.grade]}`);
  console.log();

  // 특정 케이스 검증
  if (testCase.name === '충형 동시 발생') {
    if (gradeResult.grade === 0) {
      console.log(`   ⚠️  경고: 충형이 동시 발생했는데 Grade 0(천운)이 나왔습니다!`);
      console.log(`   → 시스템 오류: 충형 방지 로직이 작동하지 않았습니다.`);
    } else {
      console.log(`   ✅ 검증 성공: 충형 동시 발생 시 천운(Grade 0) 차단됨`);
    }
    console.log();
  }

  if (testCase.name === '생일 특별 보너스') {
    if (gradeResult.gradeBonus >= 3) {
      console.log(`   ✅ 검증 성공: 생일 보너스 +3점 이상 적용됨`);
    } else {
      console.log(`   ⚠️  경고: 생일 보너스가 제대로 적용되지 않았습니다.`);
    }
    console.log();
  }
});

console.log('='.repeat(80));
console.log('엣지 케이스 테스트 완료!');
console.log('='.repeat(80));
