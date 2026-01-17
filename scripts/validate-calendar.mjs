#!/usr/bin/env node

/**
 * 운세 캘린더 품질 검증 스크립트
 *
 * 검증 항목:
 * 1. 좋은날/나쁜날 분포 (~5%, ~15%, ~50%, ~25%, ~5%)
 * 2. 점수 체계 정확성
 * 3. 색깔 구분 (grade 0-4)
 * 4. 사주/점성학 설명 일치성
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://127.0.0.1:8888';
const FRONTEND_URL = 'http://localhost:3000';

// 테스트용 샘플 데이터
const sampleBirthInfo = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  birthPlace: 'Seoul, South Korea',
  latitude: 37.5665,
  longitude: 126.9780,
  timezone: 'Asia/Seoul',
  gender: 'Male'
};

console.log('📊 운세 캘린더 품질 검증\n');

// 1. 백엔드 헬스 체크
console.log('1️⃣ 백엔드 헬스 체크...');
try {
  const healthRes = await fetch(`${BACKEND_URL}/health`);
  const health = await healthRes.json();
  const status = health.status || health.data?.status || 'unknown';
  console.log(`   ✅ Backend: ${status}\n`);
} catch (err) {
  console.error('   ❌ Backend 연결 실패:', err.message);
  process.exit(1);
}

// 2. 캘린더 데이터 가져오기
console.log('2️⃣ 2026년 캘린더 데이터 생성 중...');
const params = new URLSearchParams({
  year: '2026',
  locale: 'ko',
  birthDate: sampleBirthInfo.birthDate,
  birthTime: sampleBirthInfo.birthTime,
  birthPlace: sampleBirthInfo.birthPlace,
});

const calendarRes = await fetch(`${FRONTEND_URL}/api/calendar?${params}`, {
  headers: {
    'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || 'sk-test-12345',
  },
});

if (!calendarRes.ok) {
  const error = await calendarRes.json();
  console.error('   ❌ 캘린더 API 실패:', error);
  process.exit(1);
}

const calendarData = await calendarRes.json();
console.log(`   ✅ ${calendarData.allDates?.length || 0}개 날짜 데이터 생성\n`);

// 3. 등급 분포 분석
console.log('3️⃣ 등급 분포 분석 (5등급 시스템)');
const gradeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
const gradeScores = { 0: [], 1: [], 2: [], 3: [], 4: [] };

for (const date of calendarData.allDates || []) {
  gradeCounts[date.grade]++;
  gradeScores[date.grade].push(date.score);
}

const totalDays = calendarData.allDates?.length || 0;
console.log(`\n   총 날짜: ${totalDays}일\n`);

const gradeLabels = {
  0: '최고의날 (Grade 0)',
  1: '좋은날 (Grade 1)',
  2: '보통날 (Grade 2)',
  3: '안좋은날 (Grade 3)',
  4: '최악의날 (Grade 4)',
};

const expectedPercentages = {
  0: 5,   // ~5%
  1: 15,  // ~15%
  2: 50,  // ~50%
  3: 25,  // ~25%
  4: 5,   // ~5%
};

for (let grade = 0; grade <= 4; grade++) {
  const count = gradeCounts[grade];
  const percentage = ((count / totalDays) * 100).toFixed(1);
  const expected = expectedPercentages[grade];
  const diff = Math.abs(parseFloat(percentage) - expected);
  const status = diff <= 10 ? '✅' : diff <= 15 ? '⚠️' : '❌';

  console.log(`   ${status} ${gradeLabels[grade]}: ${count}일 (${percentage}%) [목표: ~${expected}%]`);

  if (gradeScores[grade].length > 0) {
    const avgScore = (gradeScores[grade].reduce((a, b) => a + b, 0) / gradeScores[grade].length).toFixed(1);
    const minScore = Math.min(...gradeScores[grade]);
    const maxScore = Math.max(...gradeScores[grade]);
    console.log(`      점수 범위: ${minScore}~${maxScore} (평균: ${avgScore})`);
  }
}

// 4. 점수 임계값 검증
console.log('\n4️⃣ 점수 임계값 검증');
const thresholds = {
  0: 72,  // Grade 0: >= 72
  1: 65,  // Grade 1: 65-71
  2: 45,  // Grade 2: 45-64
  3: 30,  // Grade 3: 30-44
  4: 0,   // Grade 4: < 30
};

let thresholdErrors = 0;
for (const date of calendarData.allDates || []) {
  const expectedGrade =
    date.score >= 72 ? 0 :
    date.score >= 65 ? 1 :
    date.score >= 45 ? 2 :
    date.score >= 30 ? 3 : 4;

  // Grade 0는 충+형이 둘 다 있으면 불가
  const hasChungAndXing = date.sajuFactors?.some(f => f.includes('충')) &&
                          date.sajuFactors?.some(f => f.includes('형'));

  if (hasChungAndXing && date.grade === 0) {
    console.log(`   ⚠️ ${date.date}: 충+형이 있는데 Grade 0 (점수: ${date.score})`);
    thresholdErrors++;
  } else if (date.grade !== expectedGrade && !(date.grade === 1 && expectedGrade === 0 && hasChungAndXing)) {
    // 충+형 때문에 Grade 0 -> 1로 강등된 경우는 정상
    console.log(`   ❌ ${date.date}: Grade ${date.grade} (점수: ${date.score}) - 예상 Grade ${expectedGrade}`);
    thresholdErrors++;
  }
}

if (thresholdErrors === 0) {
  console.log('   ✅ 모든 날짜의 등급이 점수 기준에 맞습니다');
} else {
  console.log(`   ⚠️ ${thresholdErrors}개 날짜의 등급이 점수 기준과 불일치`);
}

// 5. 사주/점성학 설명 검증
console.log('\n5️⃣ 사주/점성학 설명 일치성 검증');
let concordantDays = 0;
let discordantDays = 0;
const sampleDays = [];

for (const date of calendarData.allDates || []) {
  const hasSajuFactors = date.sajuFactors && date.sajuFactors.length > 0;
  const hasAstroFactors = date.astroFactors && date.astroFactors.length > 0;

  if (!hasSajuFactors && !hasAstroFactors) continue;

  // 사주/점성학 설명에서 긍정/부정 키워드 분석
  const sajuText = (date.sajuFactors || []).join(' ');
  const astroText = (date.astroFactors || []).join(' ');

  const positiveKeywords = ['좋은', '길', '발전', '성공', '행운', '기회', '조화', '안정'];
  const negativeKeywords = ['나쁜', '흉', '어려움', '갈등', '장애', '주의', '충', '형', '역행'];

  const sajuPositive = positiveKeywords.some(k => sajuText.includes(k));
  const sajuNegative = negativeKeywords.some(k => sajuText.includes(k));
  const astroPositive = positiveKeywords.some(k => astroText.includes(k));
  const astroNegative = negativeKeywords.some(k => astroText.includes(k));

  // 등급과 설명 일치 여부
  const isGoodDay = date.grade <= 2;
  const isBadDay = date.grade >= 3;

  const explanationMatchesGrade =
    (isGoodDay && (sajuPositive || astroPositive)) ||
    (isBadDay && (sajuNegative || astroNegative)) ||
    (!isGoodDay && !isBadDay);

  if (explanationMatchesGrade || (!sajuPositive && !sajuNegative && !astroPositive && !astroNegative)) {
    concordantDays++;
  } else {
    discordantDays++;
    if (sampleDays.length < 3) {
      sampleDays.push({
        date: date.date,
        grade: date.grade,
        score: date.score,
        sajuFactors: date.sajuFactors?.slice(0, 2),
        astroFactors: date.astroFactors?.slice(0, 2),
      });
    }
  }
}

const totalAnalyzedDays = concordantDays + discordantDays;
const concordanceRate = ((concordantDays / totalAnalyzedDays) * 100).toFixed(1);

console.log(`   분석 대상: ${totalAnalyzedDays}일`);
console.log(`   ✅ 일치: ${concordantDays}일 (${concordanceRate}%)`);
console.log(`   ⚠️ 불일치: ${discordantDays}일 (${(100 - parseFloat(concordanceRate)).toFixed(1)}%)`);

if (sampleDays.length > 0) {
  console.log('\n   불일치 샘플:');
  for (const day of sampleDays) {
    console.log(`   - ${day.date} (Grade ${day.grade}, 점수 ${day.score})`);
    console.log(`     사주: ${day.sajuFactors?.join(', ') || 'N/A'}`);
    console.log(`     점성술: ${day.astroFactors?.join(', ') || 'N/A'}`);
  }
}

// 6. 교차 검증 날짜 확인
console.log('\n6️⃣ 교차 검증 (Cross-verified) 날짜 분석');
const crossVerifiedDays = calendarData.allDates?.filter(d => d.crossVerified) || [];
console.log(`   교차 검증 완료: ${crossVerifiedDays.length}일`);

if (crossVerifiedDays.length > 0) {
  const gradeDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const day of crossVerifiedDays) {
    gradeDistribution[day.grade]++;
  }

  console.log('   등급 분포:');
  for (let grade = 0; grade <= 4; grade++) {
    if (gradeDistribution[grade] > 0) {
      console.log(`     Grade ${grade}: ${gradeDistribution[grade]}일`);
    }
  }

  // 샘플 출력
  console.log('\n   교차 검증 샘플 (최대 3개):');
  for (const day of crossVerifiedDays.slice(0, 3)) {
    console.log(`   - ${day.date} (Grade ${day.grade}, 점수 ${day.score})`);
    console.log(`     ${day.title || '제목 없음'}`);
    if (day.sajuFactors?.length > 0) {
      console.log(`     사주: ${day.sajuFactors[0]}`);
    }
    if (day.astroFactors?.length > 0) {
      console.log(`     점성술: ${day.astroFactors[0]}`);
    }
  }
}

// 7. 종합 평가
console.log('\n' + '='.repeat(60));
console.log('📊 종합 평가\n');

const gradeDistributionScore = Object.keys(expectedPercentages).reduce((score, grade) => {
  const actual = (gradeCounts[grade] / totalDays) * 100;
  const expected = expectedPercentages[grade];
  const diff = Math.abs(actual - expected);
  return score + (diff <= 10 ? 20 : diff <= 15 ? 10 : 0);
}, 0);

const thresholdScore = thresholdErrors === 0 ? 20 : Math.max(0, 20 - thresholdErrors * 2);
const concordanceScore = parseFloat(concordanceRate) >= 80 ? 20 : parseFloat(concordanceRate) >= 70 ? 15 : 10;

const totalScore = gradeDistributionScore + thresholdScore + concordanceScore;
const maxScore = 100;

console.log(`등급 분포 적절성: ${gradeDistributionScore}/100`);
console.log(`점수 임계값 정확성: ${thresholdScore}/20`);
console.log(`설명 일치성: ${concordanceScore}/20`);
console.log(`\n총점: ${totalScore}/${maxScore}`);

if (totalScore >= 90) {
  console.log('✅ 우수: 캘린더 품질이 매우 우수합니다!');
} else if (totalScore >= 70) {
  console.log('⚠️ 양호: 캘린더 품질이 양호하지만 개선이 필요합니다.');
} else {
  console.log('❌ 미흡: 캘린더 품질 개선이 필요합니다.');
}

console.log('\n' + '='.repeat(60));