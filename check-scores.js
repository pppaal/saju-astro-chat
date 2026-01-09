/**
 * 실제 점수 범위 확인
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

// 문제 있는 사용자들
const testUsers = [
  { birthDate: '1985-12-25', birthTime: '03:45', birthPlace: 'Daegu, South Korea', label: '1985년생 여 (최악 39%)' },
  { birthDate: '1990-03-15', birthTime: '08:30', birthPlace: 'Seoul, South Korea', label: '1990년생 남 (최악 37%)' },
  { birthDate: '1975-05-20', birthTime: '14:00', birthPlace: 'Busan, South Korea', label: '1975년생 여 (최악 1%)' },
];

async function checkScores(user) {
  const params = new URLSearchParams({
    year: '2025',
    locale: 'ko',
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    category: 'all'
  });

  const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
    headers: { 'x-api-token': API_TOKEN },
  });

  const data = await response.json();

  const yearDates = data.allDates.filter(d => {
    const dateYear = new Date(d.date).getFullYear();
    return dateYear === 2025;
  });

  const scores = yearDates.map(d => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  console.log(`\n${user.label}`);
  console.log(`  점수 범위: ${min} ~ ${max} (평균: ${avg})`);

  // 구간별 분포
  const ranges = [
    { min: 0, max: 38, label: '0-37 (최악+나쁨)' },
    { min: 38, max: 48, label: '38-47 (나쁨)' },
    { min: 48, max: 62, label: '48-61 (보통)' },
    { min: 62, max: 68, label: '62-67 (좋음)' },
    { min: 68, max: 100, label: '68+ (최고)' },
  ];

  for (const range of ranges) {
    const count = scores.filter(s => s >= range.min && s < range.max).length;
    const pct = ((count / scores.length) * 100).toFixed(1);
    console.log(`  ${range.label}: ${count}개 (${pct}%)`);
  }

  // 최저 5개
  const lowest = [...yearDates].sort((a, b) => a.score - b.score).slice(0, 5);
  console.log(`  최저 5개: ${lowest.map(d => d.score).join(', ')}`);
}

async function run() {
  for (const user of testUsers) {
    await checkScores(user);
  }
}

run().catch(console.error);
