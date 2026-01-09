/**
 * 20명 사용자 테스트 - 5등급 분포 확인
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

const testUsers = [
  { birthDate: '1970-01-15', birthTime: '06:30', birthPlace: 'Seoul, South Korea', gender: 'male' },
  { birthDate: '1975-05-20', birthTime: '14:00', birthPlace: 'Busan, South Korea', gender: 'female' },
  { birthDate: '1980-08-10', birthTime: '22:30', birthPlace: 'Incheon, South Korea', gender: 'male' },
  { birthDate: '1985-12-25', birthTime: '03:45', birthPlace: 'Daegu, South Korea', gender: 'female' },
  { birthDate: '1990-03-15', birthTime: '08:30', birthPlace: 'Seoul, South Korea', gender: 'male' },
  { birthDate: '1992-07-04', birthTime: '11:15', birthPlace: 'Gwangju, South Korea', gender: 'female' },
  { birthDate: '1988-11-22', birthTime: '19:00', birthPlace: 'Daejeon, South Korea', gender: 'male' },
  { birthDate: '1995-02-14', birthTime: '07:20', birthPlace: 'Seoul, South Korea', gender: 'female' },
  { birthDate: '1978-09-30', birthTime: '16:45', birthPlace: 'Ulsan, South Korea', gender: 'male' },
  { birthDate: '1982-04-18', birthTime: '23:10', birthPlace: 'Suwon, South Korea', gender: 'female' },
  { birthDate: '1968-06-12', birthTime: '05:30', birthPlace: 'Seoul, South Korea', gender: 'male' },
  { birthDate: '1973-10-08', birthTime: '13:40', birthPlace: 'Busan, South Korea', gender: 'female' },
  { birthDate: '1998-01-28', birthTime: '09:15', birthPlace: 'Seoul, South Korea', gender: 'male' },
  { birthDate: '2000-08-05', birthTime: '21:30', birthPlace: 'Incheon, South Korea', gender: 'female' },
  { birthDate: '1965-03-22', birthTime: '04:00', birthPlace: 'Daegu, South Korea', gender: 'male' },
  { birthDate: '1987-12-01', birthTime: '17:25', birthPlace: 'Seoul, South Korea', gender: 'female' },
  { birthDate: '1993-05-17', birthTime: '10:50', birthPlace: 'Gwangju, South Korea', gender: 'male' },
  { birthDate: '1977-07-29', birthTime: '02:15', birthPlace: 'Daejeon, South Korea', gender: 'female' },
  { birthDate: '1984-09-14', birthTime: '15:35', birthPlace: 'Ulsan, South Korea', gender: 'male' },
  { birthDate: '1996-11-11', birthTime: '20:00', birthPlace: 'Seoul, South Korea', gender: 'female' },
];

async function testUser(user, year) {
  const params = new URLSearchParams({
    year: year.toString(),
    locale: 'ko',
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    category: 'all'
  });

  try {
    const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
      headers: { 'x-api-token': API_TOKEN },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // 해당 연도 날짜만 필터링
    const yearDates = data.allDates.filter(d => {
      const dateYear = new Date(d.date).getFullYear();
      return dateYear === year;
    });

    // 5등급 카운트 (0~4)
    const gradeCount = [0, 0, 0, 0, 0];
    yearDates.forEach(d => {
      if (d.grade >= 0 && d.grade <= 4) {
        gradeCount[d.grade]++;
      }
    });

    return {
      total: yearDates.length,
      grades: gradeCount,
    };
  } catch (e) {
    return null;
  }
}

async function runTest() {
  console.log('\n🔮 20명 사용자 5등급 분포 테스트\n');
  console.log('테스트 연도: 2025년\n');

  const allGrades = [0, 0, 0, 0, 0];
  let totalDays = 0;
  let successCount = 0;

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const birthYear = user.birthDate.split('-')[0];
    process.stdout.write(`[${i + 1}/20] ${birthYear}년생 ${user.gender === 'male' ? '남' : '여'}... `);

    const result = await testUser(user, 2025);

    if (result) {
      successCount++;
      totalDays += result.total;
      result.grades.forEach((count, idx) => {
        allGrades[idx] += count;
      });

      const pcts = result.grades.map(c => ((c / result.total) * 100).toFixed(0) + '%');
      console.log(`최고:${pcts[0]} 좋음:${pcts[1]} 보통:${pcts[2]} 나쁨:${pcts[3]} 최악:${pcts[4]}`);
    } else {
      console.log('실패');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 전체 통계 (${successCount}명, ${totalDays}일)\n`);

  const labels = ['최고', '좋음', '보통', '나쁨', '최악'];
  const targets = [5, 15, 50, 25, 5];

  for (let i = 0; i < 5; i++) {
    const pct = ((allGrades[i] / totalDays) * 100).toFixed(1);
    const diff = Math.abs(parseFloat(pct) - targets[i]);
    const status = diff <= 10 ? '✅' : '⚠️';
    console.log(`Grade ${i} (${labels[i]}): ${allGrades[i]}일 (${pct}%) [목표 ${targets[i]}%] ${status}`);
  }
}

runTest().catch(console.error);
