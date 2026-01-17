/**
 * 캘린더 로직 직접 테스트
 * 실제 날짜 데이터를 생성해서 문제점 확인
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import { calculateSajuData } from '../src/lib/Saju/saju';
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService';

const birthInfo = {
  birthDate: new Date('1990-05-15T14:30:00+09:00'),
  birthTime: '14:30',
  birthPlace: 'Seoul, South Korea',
  latitude: 37.5665,
  longitude: 126.9780,
  timezone: 'Asia/Seoul',
  gender: 'Male' as const,
};

console.log('🔍 캘린더 로직 상세 검증\n');

// 1. 사주/점성술 데이터 계산
console.log('1️⃣ 기본 차트 계산...');
const sajuData = calculateSajuData({
  year: birthInfo.birthDate.getFullYear(),
  month: birthInfo.birthDate.getMonth() + 1,
  day: birthInfo.birthDate.getDate(),
  hour: birthInfo.birthDate.getHours(),
  minute: birthInfo.birthDate.getMinutes(),
  gender: birthInfo.gender,
  isLunar: false,
  latitude: birthInfo.latitude,
  longitude: birthInfo.longitude,
  timezone: birthInfo.timezone,
});

const astroChart = calculateNatalChart(
  birthInfo.birthDate.getFullYear(),
  birthInfo.birthDate.getMonth() + 1,
  birthInfo.birthDate.getDate(),
  birthInfo.birthDate.getHours() + birthInfo.birthDate.getMinutes() / 60,
  birthInfo.latitude,
  birthInfo.longitude
);

console.log('   ✅ 사주 일주:', sajuData.fourPillars?.day || 'N/A');
console.log('   ✅ 점성술 태양:', astroChart.planets?.Sun?.sign || 'N/A');
console.log();

// 2. 2026년 1월 데이터만 생성
console.log('2️⃣ 2026년 1월 데이터 생성...');
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-31');

const yearlyDates = calculateYearlyImportantDates(
  sajuData,
  astroChart,
  2026,
  birthInfo
);

// 1월 데이터 필터링
const januaryDates = yearlyDates.allDates.filter(d => d.date.startsWith('2026-01'));

console.log(`   ✅ 총 ${januaryDates.length}일 데이터 생성\n`);

// 3. 등급 분포 확인
console.log('3️⃣ 등급 분포 분석');
const gradeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
for (const date of januaryDates) {
  gradeCounts[date.grade as 0 | 1 | 2 | 3 | 4]++;
}

const total = januaryDates.length;
console.log('   1월 등급 분포:');
for (let grade = 0; grade <= 4; grade++) {
  const count = gradeCounts[grade as 0 | 1 | 2 | 3 | 4];
  const percentage = ((count / total) * 100).toFixed(1);
  const emoji = grade === 0 ? '🌟' : grade === 1 ? '✨' : grade === 2 ? '◆' : grade === 3 ? '⚠️' : '☠️';
  console.log(`   ${emoji} Grade ${grade}: ${count}일 (${percentage}%)`);
}

// 전체 연도 등급 분포
const yearGradeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
for (const date of yearlyDates.allDates) {
  yearGradeCounts[date.grade as 0 | 1 | 2 | 3 | 4]++;
}

const yearTotal = yearlyDates.allDates.length;
console.log('\n   전체 연도 등급 분포:');
for (let grade = 0; grade <= 4; grade++) {
  const count = yearGradeCounts[grade as 0 | 1 | 2 | 3 | 4];
  const percentage = ((count / yearTotal) * 100).toFixed(1);
  const expected = grade === 0 || grade === 4 ? 5 : grade === 1 ? 15 : grade === 2 ? 50 : 25;
  const emoji = grade === 0 ? '🌟' : grade === 1 ? '✨' : grade === 2 ? '◆' : grade === 3 ? '⚠️' : '☠️';
  const status = Math.abs(parseFloat(percentage) - expected) <= 10 ? '✅' : '⚠️';
  console.log(`   ${status} ${emoji} Grade ${grade}: ${count}일 (${percentage}% / 목표: ~${expected}%)`);
}

if (yearGradeCounts[0] === 0) {
  console.log('\n   ❌ 문제: Grade 0 (최고의날)이 하나도 없습니다!');
}

console.log();

// 4. 내용과 등급 일치성 확인
console.log('4️⃣ 내용과 등급 일치성 검증 (샘플 10일)');
console.log('   날짜 분석:\n');

for (const date of januaryDates.slice(0, 10)) {
  const gradeEmoji = date.grade === 0 ? '🌟' : date.grade === 1 ? '✨' : date.grade === 2 ? '◆' : date.grade === 3 ? '⚠️' : '☠️';

  console.log(`   ${date.date} ${gradeEmoji} Grade ${date.grade} (점수: ${date.score})`);
  console.log(`   제목: ${date.title}`);

  // 사주 요인 확인
  if (date.sajuFactors && date.sajuFactors.length > 0) {
    console.log(`   사주: ${date.sajuFactors[0]}`);

    // 긍정/부정 키워드 체크
    const sajuText = date.sajuFactors.join(' ');
    const hasPositive = /좋|길|발전|성공|행운|기회|조화|안정/.test(sajuText);
    const hasNegative = /나쁜|흉|어려움|갈등|장애|주의|충|형|역행/.test(sajuText);

    const isGoodDay = date.grade <= 2;
    const isBadDay = date.grade >= 3;

    if (isGoodDay && hasNegative && !hasPositive) {
      console.log(`   ❌ 문제: 좋은 등급(${date.grade})인데 부정적 설명!`);
    } else if (isBadDay && hasPositive && !hasNegative) {
      console.log(`   ❌ 문제: 나쁜 등급(${date.grade})인데 긍정적 설명!`);
    }
  }

  // 점성술 요인 확인
  if (date.astroFactors && date.astroFactors.length > 0) {
    console.log(`   점성술: ${date.astroFactors[0]}`);
  }

  // 경고 확인
  if (date.warnings && date.warnings.length > 0) {
    console.log(`   경고: ${date.warnings.join(', ')}`);

    if (date.grade <= 1 && date.warnings.length > 0) {
      console.log(`   ❌ 문제: Grade ${date.grade}인데 경고가 있음!`);
    }
  }

  console.log();
}

// 5. Grade 0 상세 확인
if (yearGradeCounts[0] > 0) {
  console.log('5️⃣ Grade 0 (최고의날) 상세 분석');
  const grade0Dates = yearlyDates.allDates.filter(d => d.grade === 0);
  console.log(`   총 ${grade0Dates.length}일\n`);

  for (const date of grade0Dates.slice(0, 5)) {
    console.log(`   ${date.date} (점수: ${date.score})`);
    console.log(`   ${date.title}`);
    if (date.sajuFactors) {
      console.log(`   사주: ${date.sajuFactors[0]}`);
    }

    // 충/형 체크
    const hasChung = date.sajuFactors?.some(f => f.includes('충')) || false;
    const hasXing = date.sajuFactors?.some(f => f.includes('형')) || false;

    if (hasChung && hasXing) {
      console.log(`   ❌ 문제: 충과 형이 둘 다 있는데 Grade 0!`);
    }
    console.log();
  }
} else {
  console.log('5️⃣ Grade 0 (최고의날) 없음 - 이유 분석');

  // 점수 70점 이상인 날짜 확인
  const highScoreDates = yearlyDates.allDates.filter(d => d.score >= 70);
  console.log(`   점수 70점 이상: ${highScoreDates.length}일`);

  for (const date of highScoreDates.slice(0, 3)) {
    console.log(`\n   ${date.date} Grade ${date.grade} (점수: ${date.score})`);

    const hasChung = date.sajuFactors?.some(f => f.includes('충')) || false;
    const hasXing = date.sajuFactors?.some(f => f.includes('형')) || false;

    if (hasChung && hasXing) {
      console.log(`   → 충+형 때문에 Grade 0 불가`);
    } else if (hasChung) {
      console.log(`   → 충만 있음 (원래는 Grade 0 가능해야 함)`);
    } else if (hasXing) {
      console.log(`   → 형만 있음 (원래는 Grade 0 가능해야 함)`);
    } else {
      console.log(`   ❌ 문제: 점수 70+, 충형 없음 → Grade 0이어야 함!`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('검증 완료');
console.log('='.repeat(60));