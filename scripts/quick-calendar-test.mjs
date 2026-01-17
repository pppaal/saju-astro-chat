#!/usr/bin/env node

/**
 * 빠른 캘린더 테스트 - 2026년 1월만 테스트
 */

import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:3000';

const sampleBirthInfo = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  birthPlace: 'Seoul, South Korea',
};

console.log('📊 운세 캘린더 빠른 테스트 (2026년 1월)\n');

// 1월 데이터만 요청
const params = new URLSearchParams({
  year: '2026',
  locale: 'ko',
  birthDate: sampleBirthInfo.birthDate,
  birthTime: sampleBirthInfo.birthTime,
  birthPlace: sampleBirthInfo.birthPlace,
});

console.log('데이터 요청 중...');
const startTime = Date.now();

try {
  const res = await fetch(`${FRONTEND_URL}/api/calendar?${params}`, {
    headers: {
      'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || 'sk-test-12345',
    },
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('❌ API 실패:', error);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`✅ ${data.allDates?.length || 0}개 날짜 데이터 생성 (${elapsed}초)\n`);

  // 1월 데이터만 필터링
  const januaryDates = data.allDates?.filter(d => d.date.startsWith('2026-01')) || [];

  console.log('='.repeat(60));
  console.log('1월 캘린더 샘플 (처음 10일)\n');

  for (const date of januaryDates.slice(0, 10)) {
    const gradeEmoji = date.grade === 0 ? '🌟' : date.grade === 1 ? '✨' : date.grade === 2 ? '◆' : date.grade === 3 ? '⚠️' : '☠️';
    console.log(`${date.date} ${gradeEmoji} Grade ${date.grade} (점수: ${date.score})`);
    console.log(`  ${date.title || '제목 없음'}`);

    if (date.sajuFactors?.length > 0) {
      console.log(`  사주: ${date.sajuFactors[0]}`);
    }
    if (date.astroFactors?.length > 0) {
      console.log(`  점성술: ${date.astroFactors[0]}`);
    }
    console.log();
  }

  // 등급 분포
  console.log('='.repeat(60));
  console.log('등급 분포 (전체)\n');

  const gradeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const date of data.allDates || []) {
    gradeCounts[date.grade]++;
  }

  const total = data.allDates?.length || 0;
  for (let grade = 0; grade <= 4; grade++) {
    const count = gradeCounts[grade];
    const percentage = ((count / total) * 100).toFixed(1);
    const emoji = grade === 0 ? '🌟' : grade === 1 ? '✨' : grade === 2 ? '◆' : grade === 3 ? '⚠️' : '☠️';
    console.log(`${emoji} Grade ${grade}: ${count}일 (${percentage}%)`);
  }

  console.log('\n' + '='.repeat(60));

} catch (err) {
  console.error('❌ 오류:', err.message);
  process.exit(1);
}