/**
 * 점수 분포 직접 테스트 스크립트
 * destinyCalendar 모듈을 직접 import하여 테스트
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 동적 import를 위한 경로 설정
process.env.NODE_ENV = 'development';

// 10명의 다양한 생년월일 데이터
const testProfiles = [
  { name: '사람1', birth: '1985-03-15', time: '08:30', gender: 'male' },
  { name: '사람2', birth: '1990-07-22', time: '14:00', gender: 'female' },
  { name: '사람3', birth: '1978-11-08', time: '06:15', gender: 'male' },
  { name: '사람4', birth: '1995-01-30', time: '23:45', gender: 'female' },
  { name: '사람5', birth: '1982-09-12', time: '10:20', gender: 'male' },
  { name: '사람6', birth: '1988-05-05', time: '16:30', gender: 'female' },
  { name: '사람7', birth: '1973-12-25', time: '00:10', gender: 'male' },
  { name: '사람8', birth: '1999-04-18', time: '09:00', gender: 'female' },
  { name: '사람9', birth: '1986-08-03', time: '21:30', gender: 'male' },
  { name: '사람10', birth: '1992-02-14', time: '13:15', gender: 'female' },
];

// 천간/지지 매핑
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_ELEMENTS = {
  '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth',
  '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water'
};

// 년도의 천간/지지 계산
function getYearGanzhi(year) {
  const stemIdx = (year - 4) % 10;
  const branchIdx = (year - 4) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

// 월의 천간/지지 계산
function getMonthGanzhi(year, month) {
  const yearStem = STEMS[(year - 4) % 10];
  const monthBranchIdx = (month + 1) % 12;
  const baseStems = { '甲': 2, '乙': 4, '丙': 6, '丁': 8, '戊': 0, '己': 2, '庚': 4, '辛': 6, '壬': 8, '癸': 0 };
  const monthStemIdx = (baseStems[yearStem] + month - 1) % 10;
  return { stem: STEMS[monthStemIdx], branch: BRANCHES[monthBranchIdx] };
}

// 일의 천간/지지 계산
function getDayGanzhi(date) {
  const baseDate = new Date(1900, 0, 1);
  const diff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
  const stemIdx = (diff + 10) % 10;
  const branchIdx = (diff + 10) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

// 시의 천간/지지 계산
function getHourGanzhi(dayStem, hour) {
  const hourBranchIdx = Math.floor((hour + 1) / 2) % 12;
  const baseStems = { '甲': 0, '乙': 2, '丙': 4, '丁': 6, '戊': 8, '己': 0, '庚': 2, '辛': 4, '壬': 6, '癸': 8 };
  const hourStemIdx = (baseStems[dayStem] + hourBranchIdx) % 10;
  return { stem: STEMS[hourStemIdx], branch: BRANCHES[hourBranchIdx] };
}

// 사주 프로필 생성
function createSajuProfile(birthDate, birthTime) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour] = birthTime.split(':').map(Number);
  const date = new Date(year, month - 1, day);

  const yearGanzhi = getYearGanzhi(year);
  const monthGanzhi = getMonthGanzhi(year, month);
  const dayGanzhi = getDayGanzhi(date);
  const hourGanzhi = getHourGanzhi(dayGanzhi.stem, hour);

  const dayMasterElement = STEM_ELEMENTS[dayGanzhi.stem];

  return {
    dayMaster: dayGanzhi.stem,
    dayMasterElement,
    yearStem: yearGanzhi.stem,
    yearBranch: yearGanzhi.branch,
    monthStem: monthGanzhi.stem,
    monthBranch: monthGanzhi.branch,
    dayStem: dayGanzhi.stem,
    dayBranch: dayGanzhi.branch,
    hourStem: hourGanzhi.stem,
    hourBranch: hourGanzhi.branch,
    yongsin: dayMasterElement === 'wood' ? 'water' :
             dayMasterElement === 'fire' ? 'wood' :
             dayMasterElement === 'earth' ? 'fire' :
             dayMasterElement === 'metal' ? 'earth' : 'metal',
    kibsin: dayMasterElement === 'wood' ? 'metal' :
            dayMasterElement === 'fire' ? 'water' :
            dayMasterElement === 'earth' ? 'wood' :
            dayMasterElement === 'metal' ? 'fire' : 'earth',
    birthYear: year,
  };
}

// 점성술 프로필 생성
function createAstroProfile(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const signs = ['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
                 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'];
  const signDates = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  let signIdx = month - 1;
  if (day < signDates[month - 1]) {
    signIdx = (month - 2 + 12) % 12;
  }

  return {
    sunSign: signs[signIdx],
    moonSign: signs[(signIdx + 3) % 12],
    risingSign: signs[(signIdx + 6) % 12],
    birthMonth: month,
    birthDay: day,
  };
}

// 메인 테스트 함수
async function runTest() {
  console.log('='.repeat(70));
  console.log('운세 캘린더 점수 분포 테스트 (직접 모듈 호출)');
  console.log('10명 x 2년치 (2025-2026)');
  console.log('='.repeat(70));
  console.log('');

  // destinyCalendar 모듈 동적 import
  let calculateYearlyImportantDates;
  try {
    const destinyModule = await import('../src/lib/destiny-map/destinyCalendar.js');
    calculateYearlyImportantDates = destinyModule.calculateYearlyImportantDates;
  } catch (e) {
    console.error('모듈 로드 실패:', e.message);
    console.log('');
    console.log('대안: 점수 계산 로직만 테스트합니다...');

    // scoring-config 테스트
    const { GRADE_THRESHOLDS, calculateAdjustedScore, CATEGORY_MAX_SCORES } =
      await import('../src/lib/destiny-map/calendar/scoring-config.js');

    console.log('');
    console.log('[ 등급 임계값 ]');
    console.log('-'.repeat(50));
    console.log(`천운 (Grade 0): ${GRADE_THRESHOLDS.grade0}점 이상`);
    console.log(`아주좋음 (Grade 1): ${GRADE_THRESHOLDS.grade1}~${GRADE_THRESHOLDS.grade0 - 1}점`);
    console.log(`좋음 (Grade 2): ${GRADE_THRESHOLDS.grade2}~${GRADE_THRESHOLDS.grade1 - 1}점`);
    console.log(`보통 (Grade 3): ${GRADE_THRESHOLDS.grade3}~${GRADE_THRESHOLDS.grade2 - 1}점`);
    console.log(`나쁨 (Grade 4): ${GRADE_THRESHOLDS.grade4}~${GRADE_THRESHOLDS.grade3 - 1}점`);
    console.log(`아주나쁨 (Grade 5): 0~${GRADE_THRESHOLDS.grade4 - 1}점`);

    console.log('');
    console.log('[ 카테고리 최대 점수 ]');
    console.log('-'.repeat(50));
    console.log(`사주 총점: ${CATEGORY_MAX_SCORES.saju.total}점`);
    console.log(`  - 대운: ${CATEGORY_MAX_SCORES.saju.daeun}점`);
    console.log(`  - 세운: ${CATEGORY_MAX_SCORES.saju.seun}점`);
    console.log(`  - 월운: ${CATEGORY_MAX_SCORES.saju.wolun}점`);
    console.log(`  - 일진: ${CATEGORY_MAX_SCORES.saju.iljin}점`);
    console.log(`  - 용신: ${CATEGORY_MAX_SCORES.saju.yongsin}점`);
    console.log(`점성술 총점: ${CATEGORY_MAX_SCORES.astro.total}점`);
    console.log(`교차검증 보너스: ±${CATEGORY_MAX_SCORES.crossBonus}점`);
    console.log(`총점: ${CATEGORY_MAX_SCORES.grandTotal}점`);

    // 점수 시뮬레이션
    console.log('');
    console.log('[ 점수 시뮬레이션 (1000회) ]');
    console.log('-'.repeat(50));

    const simScores = [];
    const gradeCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < 1000; i++) {
      // 랜덤 조정값 생성 (-0.3 ~ 0.3 범위)
      const sajuAdj = (Math.random() - 0.5) * 0.6;
      const astroAdj = (Math.random() - 0.5) * 0.6;

      const sajuScore = calculateAdjustedScore(50, [sajuAdj]);
      const astroScore = calculateAdjustedScore(50, [astroAdj]);
      const totalScore = Math.round(sajuScore + astroScore);

      simScores.push(totalScore);

      // 등급 결정
      let grade;
      if (totalScore >= GRADE_THRESHOLDS.grade0) grade = 0;
      else if (totalScore >= GRADE_THRESHOLDS.grade1) grade = 1;
      else if (totalScore >= GRADE_THRESHOLDS.grade2) grade = 2;
      else if (totalScore >= GRADE_THRESHOLDS.grade3) grade = 3;
      else if (totalScore >= GRADE_THRESHOLDS.grade4) grade = 4;
      else grade = 5;

      gradeCount[grade]++;
    }

    const avg = simScores.reduce((a, b) => a + b, 0) / simScores.length;
    const min = Math.min(...simScores);
    const max = Math.max(...simScores);

    console.log(`평균 점수: ${avg.toFixed(1)}점`);
    console.log(`최저 점수: ${min}점`);
    console.log(`최고 점수: ${max}점`);

    console.log('');
    console.log('[ 등급별 분포 (시뮬레이션) ]');
    console.log('-'.repeat(70));
    const gradeInfo = [
      { name: '천운(74+)', target: 3 },
      { name: '아주좋음(66-73)', target: 12 },
      { name: '좋음(56-65)', target: 25 },
      { name: '보통(45-55)', target: 35 },
      { name: '나쁨(35-44)', target: 17 },
      { name: '아주나쁨(0-34)', target: 5 },
    ];

    console.log('등급\t\t\t횟수\t\t비율\t\t목표\t\t차이');
    console.log('-'.repeat(70));
    for (let i = 0; i <= 5; i++) {
      const count = gradeCount[i];
      const pct = (count / 1000 * 100);
      const diff = pct - gradeInfo[i].target;
      const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
      console.log(`${gradeInfo[i].name}\t\t${count}회\t\t${pct.toFixed(1)}%\t\t~${gradeInfo[i].target}%\t\t${diffStr}%`);
    }

    // 점수 구간별 분포
    console.log('');
    console.log('[ 점수 구간별 분포 ]');
    console.log('-'.repeat(70));
    const ranges = [
      { label: '90-100', min: 90, max: 100 },
      { label: '80-89', min: 80, max: 89 },
      { label: '70-79', min: 70, max: 79 },
      { label: '60-69', min: 60, max: 69 },
      { label: '50-59', min: 50, max: 59 },
      { label: '40-49', min: 40, max: 49 },
      { label: '30-39', min: 30, max: 39 },
      { label: '20-29', min: 20, max: 29 },
      { label: '10-19', min: 10, max: 19 },
      { label: '0-9', min: 0, max: 9 },
    ];

    for (const range of ranges) {
      const count = simScores.filter(s => s >= range.min && s <= range.max).length;
      const pct = (count / 1000 * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(parseFloat(pct) / 2));
      console.log(`${range.label}점: ${pct.padStart(5)}% ${bar} (${count}회)`);
    }

    return;
  }

  const allScores = [];
  const gradeCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const personStats = [];

  for (const profile of testProfiles) {
    console.log(`${profile.name} (${profile.birth}) 분석 중...`);

    const sajuProfile = createSajuProfile(profile.birth, profile.time);
    const astroProfile = createAstroProfile(profile.birth);

    const personScores = [];
    let personGrade0 = 0;

    for (const year of [2025, 2026]) {
      try {
        const dates = calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
          minGrade: 5,
        });

        for (const date of dates) {
          allScores.push(date.score);
          personScores.push(date.score);
          gradeCount[date.grade]++;
          if (date.grade === 0) personGrade0++;
        }
      } catch (e) {
        console.error(`  ${year}년 계산 오류:`, e.message);
      }
    }

    if (personScores.length > 0) {
      const avg = personScores.reduce((a, b) => a + b, 0) / personScores.length;
      personStats.push({
        name: profile.name,
        avg: Math.round(avg * 10) / 10,
        min: Math.min(...personScores),
        max: Math.max(...personScores),
        grade0: personGrade0,
        days: personScores.length,
      });
    }
  }

  // 결과 출력
  console.log('');
  console.log('[ 개인별 통계 ]');
  console.log('-'.repeat(70));
  for (const stat of personStats) {
    console.log(`${stat.name}: 평균=${stat.avg}, 최저=${stat.min}, 최고=${stat.max}, 천운=${stat.grade0}일, 총=${stat.days}일`);
  }

  console.log('');
  console.log('테스트 완료');
}

runTest().catch(console.error);
