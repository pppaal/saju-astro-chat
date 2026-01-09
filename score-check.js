/**
 * 실제 점수 분포 확인
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

async function checkScoreDistribution() {
  const params = new URLSearchParams({
    year: '2025',
    locale: 'ko',
    birthDate: '1990-03-15',
    birthTime: '08:30',
    birthPlace: 'Seoul, South Korea',
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

  // 점수 통계
  const scores = yearDates.map(d => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  console.log('\n📊 점수 분포 분석:\n');
  console.log(`총 날짜: ${yearDates.length}일`);
  console.log(`최소 점수: ${min}`);
  console.log(`최대 점수: ${max}`);
  console.log(`평균 점수: ${avg.toFixed(1)}`);

  // 구간별 분포
  const ranges = [
    { min: 0, max: 15, label: '0-14 (최악 후보)' },
    { min: 15, max: 38, label: '15-37 (나쁨 후보)' },
    { min: 38, max: 58, label: '38-57 (보통 후보)' },
    { min: 58, max: 70, label: '58-69 (좋음 후보)' },
    { min: 70, max: 100, label: '70+ (최고 후보)' },
  ];

  console.log('\n점수 구간별 분포:');
  for (const range of ranges) {
    const count = scores.filter(s => s >= range.min && s < range.max).length;
    const pct = ((count / scores.length) * 100).toFixed(1);
    console.log(`  ${range.label}: ${count}개 (${pct}%)`);
  }

  // 등급별 실제 분포
  console.log('\n등급별 실제 분포:');
  const grades = [0, 1, 2, 3, 4];
  const gradeLabels = ['최고', '좋음', '보통', '나쁨', '최악'];
  for (let i = 0; i < grades.length; i++) {
    const count = yearDates.filter(d => d.grade === grades[i]).length;
    const pct = ((count / yearDates.length) * 100).toFixed(1);
    console.log(`  Grade ${grades[i]} (${gradeLabels[i]}): ${count}개 (${pct}%)`);
  }

  // 최저 점수 10개
  console.log('\n최저 점수 10개:');
  const lowest = [...yearDates].sort((a, b) => a.score - b.score).slice(0, 10);
  lowest.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.date}: 점수=${d.score}, 등급=${d.grade}`);
  });

  // 최고 점수 10개
  console.log('\n최고 점수 10개:');
  const highest = [...yearDates].sort((a, b) => b.score - a.score).slice(0, 10);
  highest.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.date}: 점수=${d.score}, 등급=${d.grade}`);
  });
}

checkScoreDistribution().catch(console.error);
