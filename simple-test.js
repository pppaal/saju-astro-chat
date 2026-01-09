/**
 * 간단한 캘린더 테스트 - Grade 5 확인
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

async function testCalendarAPI(user, year) {
  const params = new URLSearchParams({
    year: String(year),
    locale: 'ko',
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    category: 'all'
  });

  const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
    headers: { 'x-api-token': API_TOKEN },
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error };
  }

  const data = await response.json();

  const yearDates = data.allDates.filter(d => {
    const dateYear = new Date(d.date).getFullYear();
    return dateYear === year;
  });

  const stats = {
    total: yearDates.length,
    grade0: yearDates.filter(d => d.grade === 0).length,
    grade1: yearDates.filter(d => d.grade === 1).length,
    grade2: yearDates.filter(d => d.grade === 2).length,
    grade3: yearDates.filter(d => d.grade === 3).length,
    grade4: yearDates.filter(d => d.grade === 4).length,
    grade5: yearDates.filter(d => d.grade === 5).length,
  };

  // Grade 5 샘플 출력
  const grade5Samples = yearDates
    .filter(d => d.grade === 5)
    .slice(0, 3)
    .map(d => ({ date: d.date, title: d.title, summary: d.summary }));

  return { success: true, stats, grade5Samples };
}

async function run() {
  console.log('\n🔮 Grade 5 (최악의 날) 테스트\n');

  const testUsers = [
    { birthDate: "1990-03-15", birthTime: "08:30", birthPlace: "Seoul, South Korea", name: "서울 남성 1990" },
    { birthDate: "1985-07-22", birthTime: "14:45", birthPlace: "Busan, South Korea", name: "부산 여성 1985" },
    { birthDate: "1970-04-15", birthTime: "08:00", birthPlace: "Seoul, South Korea", name: "1970년생" },
  ];

  const years = [2021, 2026, 2031];

  for (const user of testUsers) {
    console.log(`\n👤 ${user.name}`);

    for (const year of years) {
      const result = await testCalendarAPI(user, year);

      if (result.success) {
        const { stats, grade5Samples } = result;
        console.log(`  ${year}년: 천운:${stats.grade0} 최고:${stats.grade1} 좋음:${stats.grade2} 보통:${stats.grade3} 나쁨:${stats.grade4} 최악:${stats.grade5}`);

        if (stats.grade5 > 0 && grade5Samples.length > 0) {
          console.log(`    ☠️ 최악의 날 샘플:`);
          grade5Samples.forEach(s => {
            console.log(`       - ${s.date}: ${s.title} | ${s.summary}`);
          });
        }
      } else {
        console.log(`  ${year}년: ❌ ${result.error}`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n✅ 테스트 완료!\n');
}

run().catch(console.error);
