/**
 * 캘린더 API 점수 분포 테스트 스크립트
 * 10명 x 2년 = 약 7,300일 데이터 분석
 */

// 10명의 다양한 생년월일 데이터
const testProfiles = [
  { name: '사람1', birth: '1985-03-15', time: '08:30', gender: 'male', city: 'Seoul, KR' },
  { name: '사람2', birth: '1990-07-22', time: '14:00', gender: 'female', city: 'Tokyo, JP' },
  { name: '사람3', birth: '1978-11-08', time: '06:15', gender: 'male', city: 'New York, US' },
  { name: '사람4', birth: '1995-01-30', time: '23:45', gender: 'female', city: 'London, GB' },
  { name: '사람5', birth: '1982-09-12', time: '10:20', gender: 'male', city: 'Seoul, KR' },
  { name: '사람6', birth: '1988-05-05', time: '16:30', gender: 'female', city: 'Seoul, KR' },
  { name: '사람7', birth: '1973-12-25', time: '00:10', gender: 'male', city: 'Beijing, CN' },
  { name: '사람8', birth: '1999-04-18', time: '09:00', gender: 'female', city: 'Seoul, KR' },
  { name: '사람9', birth: '1986-08-03', time: '21:30', gender: 'male', city: 'Seoul, KR' },
  { name: '사람10', birth: '1992-02-14', time: '13:15', gender: 'female', city: 'Paris, FR' },
];

// API 호출 함수
async function fetchCalendarData(profile: typeof testProfiles[0], year: number) {
  const baseUrl = 'http://localhost:3000/api/calendar';
  const params = new URLSearchParams({
    birthDate: profile.birth,
    birthTime: profile.time,
    birthPlace: profile.city,
    gender: profile.gender,
    year: year.toString(),
    locale: 'ko',
  });

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-public-token': process.env.NEXT_PUBLIC_API_TOKEN || 'test-token',
      },
    });

    if (!response.ok) {
      console.error(`API 오류: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`fetch 오류:`, error);
    return null;
  }
}

// 메인 테스트 함수
async function runTest() {
  console.log('='.repeat(70));
  console.log('운세 캘린더 점수 분포 테스트');
  console.log('10명 x 2년치 (2025-2026)');
  console.log('='.repeat(70));
  console.log('');

  const allScores: number[] = [];
  const gradeCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const personStats: { name: string; avg: number; min: number; max: number; grade0: number; days: number }[] = [];

  for (const profile of testProfiles) {
    console.log(`${profile.name} (${profile.birth}) 분석 중...`);

    const personScores: number[] = [];
    let personGrade0 = 0;

    // 2년치 계산 (2025-2026)
    for (const year of [2025, 2026]) {
      const data = await fetchCalendarData(profile, year);

      if (data && data.dates) {
        for (const date of data.dates) {
          if (date.score !== undefined && date.grade !== undefined) {
            allScores.push(date.score);
            personScores.push(date.score);
            gradeCount[date.grade] = (gradeCount[date.grade] || 0) + 1;
            if (date.grade === 0) personGrade0++;
          }
        }
      }
    }

    if (personScores.length > 0) {
      const avg = personScores.reduce((a, b) => a + b, 0) / personScores.length;
      const min = Math.min(...personScores);
      const max = Math.max(...personScores);
      personStats.push({
        name: profile.name,
        avg: Math.round(avg * 10) / 10,
        min,
        max,
        grade0: personGrade0,
        days: personScores.length,
      });
    }
  }

  // 결과 출력
  console.log('');
  console.log('[ 개인별 통계 ]');
  console.log('-'.repeat(70));
  console.log('이름\t\t평균\t최저\t최고\t천운일수\t분석일수');
  console.log('-'.repeat(70));
  for (const stat of personStats) {
    console.log(`${stat.name}\t\t${stat.avg}\t${stat.min}\t${stat.max}\t${stat.grade0}일\t\t${stat.days}일`);
  }

  console.log('');
  console.log('[ 전체 통계 ]');
  console.log('-'.repeat(70));

  if (allScores.length === 0) {
    console.log('데이터가 없습니다. 서버가 실행 중인지 확인하세요.');
    return;
  }

  const totalAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const totalMin = Math.min(...allScores);
  const totalMax = Math.max(...allScores);
  console.log(`총 분석 일수: ${allScores.length.toLocaleString()}일`);
  console.log(`평균 점수: ${Math.round(totalAvg * 10) / 10}점`);
  console.log(`최저 점수: ${totalMin}점`);
  console.log(`최고 점수: ${totalMax}점`);

  console.log('');
  console.log('[ 등급별 분포 ]');
  console.log('-'.repeat(70));
  const total = allScores.length;
  const gradeInfo = [
    { name: '천운(74+)', target: 3 },
    { name: '아주좋음(66-73)', target: 12 },
    { name: '좋음(56-65)', target: 25 },
    { name: '보통(45-55)', target: 35 },
    { name: '나쁨(35-44)', target: 17 },
    { name: '아주나쁨(0-34)', target: 5 },
  ];

  console.log('등급\t\t\t일수\t\t비율\t\t목표\t\t차이');
  console.log('-'.repeat(70));
  for (let i = 0; i <= 5; i++) {
    const count = gradeCount[i] || 0;
    const pct = (count / total * 100);
    const diff = pct - gradeInfo[i].target;
    const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    console.log(`${gradeInfo[i].name}\t\t${count.toLocaleString()}일\t\t${pct.toFixed(1)}%\t\t~${gradeInfo[i].target}%\t\t${diffStr}%`);
  }

  // 점수 구간별 분포
  console.log('');
  console.log('[ 점수 구간별 분포 ]');
  console.log('-'.repeat(70));
  const ranges = [
    { label: '90-100', min: 90, max: 100 },
    { label: '80-89', min: 80, max: 89 },
    { label: '70-79', min: 70, max: 79 },
    { label: '60-69', min: 60, max: 69 },
    { label: '50-59', min: 50, max: 59 },
    { label: '40-49', min: 40, max: 49 },
    { label: '30-39', min: 30, max: 39 },
    { label: '20-29', min: 20, max: 29 },
    { label: '10-19', min: 10, max: 19 },
    { label: '0-9', min: 0, max: 9 },
  ];

  for (const range of ranges) {
    const count = allScores.filter(s => s >= range.min && s <= range.max).length;
    const pct = (count / total * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(parseFloat(pct) / 2));
    console.log(`${range.label}점: ${pct.padStart(5)}% ${bar} (${count.toLocaleString()}일)`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('테스트 완료');
}

runTest().catch(console.error);
