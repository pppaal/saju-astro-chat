/**
 * Grade 분포 확인 테스트
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

async function testGradeDistribution() {
  const params = new URLSearchParams({
    year: '2021',
    locale: 'ko',
    birthDate: '1970-04-15',
    birthTime: '08:00',
    birthPlace: 'Seoul, South Korea',
    category: 'all'
  });

  const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
    headers: { 'x-api-token': API_TOKEN },
  });

  const data = await response.json();

  const yearDates = data.allDates.filter(d => {
    const dateYear = new Date(d.date).getFullYear();
    return dateYear === 2021;
  });

  console.log('\n📊 Grade 분포 분석:\n');

  // Grade별 분포
  const gradeDistribution = {};
  for (let i = 0; i <= 5; i++) {
    gradeDistribution[i] = yearDates.filter(d => d.grade === i);
  }

  for (let i = 0; i <= 5; i++) {
    const count = gradeDistribution[i].length;
    const pct = ((count / yearDates.length) * 100).toFixed(1);
    const gradeLabel = i === 0 ? '천운' : i === 1 ? '최고' : i === 2 ? '좋음' : i === 3 ? '보통' : i === 4 ? '나쁨' : '최악';
    console.log(`Grade ${i} (${gradeLabel}): ${count}개 (${pct}%)`);

    // 해당 등급의 점수 범위
    if (count > 0) {
      const scores = gradeDistribution[i].map(d => d.score).sort((a, b) => a - b);
      console.log(`  점수 범위: ${scores[0]} ~ ${scores[scores.length - 1]}`);
    }
  }

  // 가장 낮은 점수 5개의 grade 확인
  console.log('\n가장 낮은 점수 5개:');
  const lowest = yearDates
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  lowest.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.date}: 점수 ${d.score}, 등급 ${d.grade}`);
  });
}

testGradeDistribution().catch(console.error);
