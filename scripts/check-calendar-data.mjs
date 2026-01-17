#!/usr/bin/env node

/**
 * 캘린더 데이터 직접 검증
 */

import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:3000';

const birthInfo = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  birthPlace: 'Seoul, South Korea',
};

console.log('🔍 캘린더 데이터 상세 검증\n');

const params = new URLSearchParams({
  year: '2026',
  locale: 'ko',
  birthDate: birthInfo.birthDate,
  birthTime: birthInfo.birthTime,
  birthPlace: birthInfo.birthPlace,
});

console.log('데이터 요청 중...');

try {
  const res = await fetch(`${FRONTEND_URL}/api/calendar?${params}`, {
    headers: {
      'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || 'sk-test-12345',
    },
  });

  if (!res.ok) {
    console.error('❌ API 실패:', res.status);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ ${data.allDates?.length || 0}일 데이터 생성\n`);

  // 1. 등급 분포
  console.log('=' .repeat(60));
  console.log('1️⃣ 등급 분포 분석\n');

  const gradeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const date of data.allDates || []) {
    gradeCounts[date.grade]++;
  }

  const total = data.allDates?.length || 0;
  const gradeLabels = {
    0: '최고의날 (72+)',
    1: '좋은날 (65-71)',
    2: '보통날 (45-64)',
    3: '안좋은날 (30-44)',
    4: '최악의날 (<30)',
  };

  for (let grade = 0; grade <= 4; grade++) {
    const count = gradeCounts[grade];
    const percentage = ((count / total) * 100).toFixed(1);
    const expected = grade === 0 || grade === 4 ? 5 : grade === 1 ? 15 : grade === 2 ? 50 : 25;
    const diff = Math.abs(parseFloat(percentage) - expected);
    const status = diff <= 10 ? '✅' : diff <= 15 ? '⚠️' : '❌';
    const emoji = grade === 0 ? '🌟' : grade === 1 ? '✨' : grade === 2 ? '◆' : grade === 3 ? '⚠️' : '☠️';

    console.log(`${status} ${emoji} Grade ${grade} ${gradeLabels[grade]}: ${count}일 (${percentage}%) [목표: ~${expected}%]`);
  }

  if (gradeCounts[0] === 0) {
    console.log('\n❌ 문제: Grade 0 (최고의날)이 하나도 없습니다!');
  }

  // 2. 내용과 등급 일치성
  console.log('\n' + '='.repeat(60));
  console.log('2️⃣ 내용과 등급 일치성 검증\n');

  let mismatchCount = 0;
  const mismatches = [];

  for (const date of data.allDates || []) {
    const sajuText = (date.sajuFactors || []).join(' ');
    const astroText = (date.astroFactors || []).join(' ');

    const hasPositive = /좋|길|발전|성공|행운|기회|조화|안정|천을귀인/.test(sajuText + astroText);
    const hasNegative = /나쁜|흉|어려움|갈등|장애|주의|충|형|역행|공망/.test(sajuText + astroText);

    const isGoodDay = date.grade <= 2;
    const isBadDay = date.grade >= 3;

    // 좋은 날인데 부정적 설명만 있는 경우
    if (isGoodDay && hasNegative && !hasPositive) {
      mismatchCount++;
      if (mismatches.length < 5) {
        mismatches.push({
          date: date.date,
          grade: date.grade,
          score: date.score,
          issue: '좋은 등급인데 부정적 설명',
          saju: date.sajuFactors?.[0],
          astro: date.astroFactors?.[0],
        });
      }
    }

    // 나쁜 날인데 긍정적 설명만 있는 경우
    if (isBadDay && hasPositive && !hasNegative) {
      mismatchCount++;
      if (mismatches.length < 5) {
        mismatches.push({
          date: date.date,
          grade: date.grade,
          score: date.score,
          issue: '나쁜 등급인데 긍정적 설명',
          saju: date.sajuFactors?.[0],
          astro: date.astroFactors?.[0],
        });
      }
    }

    // 좋은 날인데 경고가 있는 경우
    if (date.grade <= 1 && date.warnings?.length > 0) {
      mismatchCount++;
      if (mismatches.length < 5) {
        mismatches.push({
          date: date.date,
          grade: date.grade,
          score: date.score,
          issue: `Grade ${date.grade}인데 경고 있음: ${date.warnings.join(', ')}`,
          saju: date.sajuFactors?.[0],
        });
      }
    }
  }

  if (mismatchCount === 0) {
    console.log('✅ 모든 날짜의 설명이 등급과 일치합니다!');
  } else {
    console.log(`⚠️ ${mismatchCount}개 날짜에서 불일치 발견\n`);
    console.log('불일치 샘플:\n');
    for (const m of mismatches) {
      console.log(`${m.date} Grade ${m.grade} (${m.score}점)`);
      console.log(`  문제: ${m.issue}`);
      if (m.saju) console.log(`  사주: ${m.saju}`);
      if (m.astro) console.log(`  점성술: ${m.astro}`);
      console.log();
    }
  }

  // 3. 샘플 날짜 상세 출력
  console.log('='.repeat(60));
  console.log('3️⃣ 샘플 날짜 상세 분석 (1월 처음 10일)\n');

  const januaryDates = data.allDates?.filter(d => d.date.startsWith('2026-01')).slice(0, 10) || [];

  for (const date of januaryDates) {
    const emoji = date.grade === 0 ? '🌟' : date.grade === 1 ? '✨' : date.grade === 2 ? '◆' : date.grade === 3 ? '⚠️' : '☠️';
    console.log(`${date.date} ${emoji} Grade ${date.grade} (점수: ${date.score})`);
    console.log(`제목: ${date.title || '제목 없음'}`);

    if (date.sajuFactors?.length > 0) {
      console.log(`사주: ${date.sajuFactors[0]}`);
    }
    if (date.astroFactors?.length > 0) {
      console.log(`점성술: ${date.astroFactors[0]}`);
    }
    if (date.warnings?.length > 0) {
      console.log(`⚠️ 경고: ${date.warnings.join(', ')}`);
    }
    console.log();
  }

  // 4. Grade 0 분석
  console.log('='.repeat(60));
  console.log('4️⃣ Grade 0 (최고의날) 분석\n');

  const grade0Dates = data.allDates?.filter(d => d.grade === 0) || [];

  if (grade0Dates.length === 0) {
    console.log('❌ Grade 0 (최고의날)이 하나도 없습니다!\n');

    // 72점 이상인 날 찾기
    const highScores = data.allDates?.filter(d => d.score >= 72) || [];
    console.log(`72점 이상인 날: ${highScores.length}일`);

    for (const date of highScores.slice(0, 3)) {
      console.log(`\n${date.date} Grade ${date.grade} (${date.score}점)`);
      console.log(`제목: ${date.title}`);

      const hasChung = date.sajuFactors?.some(f => f.includes('충')) || false;
      const hasXing = date.sajuFactors?.some(f => f.includes('형')) || false;

      if (hasChung && hasXing) {
        console.log('→ 충+형 둘 다 있어서 Grade 0 불가 (정상)');
      } else if (hasChung) {
        console.log('⚠️ 충만 있음 - 조건 완화했으면 Grade 0 가능해야 함');
      } else if (hasXing) {
        console.log('⚠️ 형만 있음 - 조건 완화했으면 Grade 0 가능해야 함');
      } else {
        console.log('❌ 충형 없음 + 72점 이상 → Grade 0이어야 하는데 아님!');
      }
    }
  } else {
    console.log(`✅ Grade 0 (최고의날): ${grade0Dates.length}일\n`);

    for (const date of grade0Dates.slice(0, 3)) {
      console.log(`${date.date} (${date.score}점)`);
      console.log(`제목: ${date.title}`);
      if (date.sajuFactors?.[0]) {
        console.log(`사주: ${date.sajuFactors[0]}`);
      }
      console.log();
    }
  }

  // 5. 종합 평가
  console.log('='.repeat(60));
  console.log('📊 종합 평가\n');

  let score = 0;

  // 등급 분포 (40점)
  const distScore = Object.keys({ 0: 5, 1: 15, 2: 50, 3: 25, 4: 5 }).reduce((sum, grade) => {
    const actual = (gradeCounts[grade] / total) * 100;
    const expected = grade == 0 || grade == 4 ? 5 : grade == 1 ? 15 : grade == 2 ? 50 : 25;
    const diff = Math.abs(actual - expected);
    return sum + (diff <= 10 ? 8 : diff <= 15 ? 5 : 0);
  }, 0);
  score += distScore;

  // 내용 일치성 (40점)
  const matchRate = ((total - mismatchCount) / total) * 100;
  const matchScore = matchRate >= 90 ? 40 : matchRate >= 80 ? 30 : matchRate >= 70 ? 20 : 10;
  score += matchScore;

  // Grade 0 존재 (20점)
  const grade0Score = gradeCounts[0] > 0 ? 20 : 0;
  score += grade0Score;

  console.log(`등급 분포 적절성: ${distScore}/40`);
  console.log(`내용 일치성: ${matchScore}/40 (${matchRate.toFixed(1)}% 일치)`);
  console.log(`Grade 0 존재: ${grade0Score}/20`);
  console.log(`\n총점: ${score}/100`);

  if (score >= 80) {
    console.log('✅ 우수: 캘린더 품질이 우수합니다!');
  } else if (score >= 60) {
    console.log('⚠️ 양호: 개선이 필요합니다.');
  } else {
    console.log('❌ 미흡: 심각한 문제가 있습니다.');
  }

  console.log('\n' + '='.repeat(60));

} catch (err) {
  console.error('❌ 오류:', err.message);
  process.exit(1);
}