/**
 * 실제 캘린더 API 호출 테스트
 * 특정 생년월일로 1년치 데이터를 가져와 분포 확인
 */

const BASE_URL = 'http://localhost:3000';

async function testCalendarDistribution() {
  // 테스트용 생년월일들
  const testCases = [
    { birthDate: '1990-05-15', birthTime: '14:30', gender: 'male', name: '1990년생 남성' },
    { birthDate: '1985-11-22', birthTime: '08:00', gender: 'female', name: '1985년생 여성' },
    { birthDate: '1995-03-08', birthTime: '22:15', gender: 'male', name: '1995년생 남성' },
  ];

  console.log('='.repeat(70));
  console.log('실제 캘린더 API 분포 테스트');
  console.log('='.repeat(70));

  for (const testCase of testCases) {
    console.log(`\n📅 테스트: ${testCase.name} (${testCase.birthDate})`);
    console.log('-'.repeat(50));

    try {
      const url = new URL('/api/calendar', BASE_URL);
      url.searchParams.set('birthDate', testCase.birthDate);
      url.searchParams.set('birthTime', testCase.birthTime);
      url.searchParams.set('gender', testCase.gender);
      url.searchParams.set('year', '2025');
      url.searchParams.set('locale', 'ko');

      const response = await fetch(url.toString(), {
        headers: {
          'x-public-token': 'destinypal-public-2024',
        },
      });

      if (!response.ok) {
        console.log(`  ❌ API 오류: ${response.status}`);
        const errorText = await response.text();
        console.log(`  ${errorText.slice(0, 200)}`);
        continue;
      }

      const data = await response.json();

      if (!data.allDates || !Array.isArray(data.allDates)) {
        console.log('  ❌ 데이터 형식 오류: allDates 없음');
        console.log('  응답 키:', Object.keys(data));
        continue;
      }

      const allDates = data.allDates;
      const totalDays = allDates.length;

      // 등급별 카운트
      const grades = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      const scores = [];

      for (const date of allDates) {
        grades[date.grade]++;
        scores.push(date.score);
      }

      // 점수 통계
      scores.sort((a, b) => a - b);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const min = scores[0];
      const max = scores[scores.length - 1];
      const median = scores[Math.floor(scores.length / 2)];

      console.log(`\n  📊 점수 분포 (총 ${totalDays}일):`);
      console.log(`     평균: ${avg.toFixed(1)} | 중앙값: ${median} | 최저: ${min} | 최고: ${max}`);

      console.log(`\n  📈 등급 분포:`);
      console.log(`     천운 (85+):     ${grades[0]}일 (${(grades[0]/totalDays*100).toFixed(1)}%)`);
      console.log(`     아주좋음 (72-84): ${grades[1]}일 (${(grades[1]/totalDays*100).toFixed(1)}%)`);
      console.log(`     좋음 (58-71):    ${grades[2]}일 (${(grades[2]/totalDays*100).toFixed(1)}%)`);
      console.log(`     보통 (45-57):    ${grades[3]}일 (${(grades[3]/totalDays*100).toFixed(1)}%)`);
      console.log(`     나쁨 (0-44):     ${grades[4]}일 (${(grades[4]/totalDays*100).toFixed(1)}%)`);

      // 히스토그램
      console.log(`\n  📉 점수 구간:`);
      const ranges = [
        { label: '85-100', min: 85, max: 100, color: '🟡' },
        { label: '72-84', min: 72, max: 84, color: '🟢' },
        { label: '58-71', min: 58, max: 71, color: '🔵' },
        { label: '45-57', min: 45, max: 57, color: '⚪' },
        { label: '0-44', min: 0, max: 44, color: '🔴' },
      ];

      for (const range of ranges) {
        const count = scores.filter(s => s >= range.min && s <= range.max).length;
        const bar = '█'.repeat(Math.round(count / totalDays * 40));
        console.log(`     ${range.color} ${range.label.padStart(6)}: ${bar} ${count}`);
      }

    } catch (error) {
      console.log(`  ❌ 요청 실패: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('목표 분포: 천운 2-5%, 아주좋음 10-15%, 좋음 25-30%, 보통 35-40%, 나쁨 10-15%');
  console.log('='.repeat(70));
}

testCalendarDistribution().catch(console.error);
