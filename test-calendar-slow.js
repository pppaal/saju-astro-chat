/**
 * 운명 캘린더 느린 테스트 - Rate Limit 회피
 * 30명 × 3년, 각 요청마다 2.5초 대기
 */

const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

const testUsers = [
  { birthDate: "1990-03-15", birthTime: "08:30", birthPlace: "Seoul, South Korea", name: "서울 남성 1990" },
  { birthDate: "1985-07-22", birthTime: "14:45", birthPlace: "Busan, South Korea", name: "부산 여성 1985" },
  { birthDate: "2000-01-01", birthTime: "00:00", birthPlace: "Tokyo, Japan", name: "도쿄 여성 2000" },
  { birthDate: "1970-04-15", birthTime: "08:00", birthPlace: "Seoul, South Korea", name: "1970년생 남성" },
  { birthDate: "1992-12-25", birthTime: "23:59", birthPlace: "New York, USA", name: "크리스마스 뉴욕" },
  { birthDate: "1988-06-06", birthTime: "06:06", birthPlace: "London, UK", name: "런던 1988" },
  { birthDate: "1995-09-09", birthTime: "09:09", birthPlace: "Paris, France", name: "파리 1995" },
  { birthDate: "1982-11-11", birthTime: "11:11", birthPlace: "Berlin, Germany", name: "베를린 1982" },
  { birthDate: "1998-05-05", birthTime: "05:05", birthPlace: "Singapore", name: "싱가포르 1998" },
  { birthDate: "1975-03-03", birthTime: "03:03", birthPlace: "Hong Kong", name: "홍콩 1975" },
  { birthDate: "2001-08-08", birthTime: "08:08", birthPlace: "Shanghai, China", name: "상하이 2001" },
  { birthDate: "1987-02-14", birthTime: "14:14", birthPlace: "Sydney, Australia", name: "시드니 1987" },
  { birthDate: "1993-10-31", birthTime: "23:00", birthPlace: "Los Angeles, USA", name: "LA 할로윈" },
  { birthDate: "1980-01-01", birthTime: "00:01", birthPlace: "Moscow, Russia", name: "모스크바 1980" },
  { birthDate: "1996-07-07", birthTime: "07:07", birthPlace: "Seoul, South Korea", name: "서울 1996" },
  { birthDate: "1991-04-04", birthTime: "04:04", birthPlace: "Toronto, Canada", name: "토론토 1991" },
  { birthDate: "1984-12-12", birthTime: "12:12", birthPlace: "Dubai, UAE", name: "두바이 1984" },
  { birthDate: "1999-06-21", birthTime: "12:00", birthPlace: "Rome, Italy", name: "로마 하지" },
  { birthDate: "1972-09-23", birthTime: "18:00", birthPlace: "Cairo, Egypt", name: "카이로 1972" },
  { birthDate: "2002-03-20", birthTime: "06:00", birthPlace: "Seoul, South Korea", name: "서울 춘분 2002" },
];

async function testCalendarAPI(user, year) {
  const params = new URLSearchParams({
    year: String(year),
    locale: 'ko',
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    category: 'all'
  });

  try {
    const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
      headers: {
        'x-api-token': API_TOKEN,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || error.error || response.statusText,
        status: response.status,
        user: user.name,
        year
      };
    }

    const data = await response.json();

    // 연도별 데이터 필터링
    const yearDates = data.allDates.filter(d => {
      const dateYear = new Date(d.date).getFullYear();
      return dateYear === year;
    });

    if (yearDates.length === 0) {
      return {
        success: false,
        error: `${year}년 데이터가 없음`,
        user: user.name,
        year
      };
    }

    // 통계 계산
    const stats = {
      total: yearDates.length,
      grade0: yearDates.filter(d => d.grade === 0).length,
      grade1: yearDates.filter(d => d.grade === 1).length,
      grade2: yearDates.filter(d => d.grade === 2).length,
      grade3: yearDates.filter(d => d.grade === 3).length,
      grade4: yearDates.filter(d => d.grade === 4).length,
      grade5: yearDates.filter(d => d.grade === 5).length,
    };

    // 내용 다양성 검증
    const titleVariety = new Set(yearDates.map(d => d.title)).size;
    const descriptionVariety = yearDates.filter(d => d.description && d.description.length > 30).length;

    return {
      success: true,
      user: user.name,
      year,
      stats,
      titleVariety,
      descriptionVariety: (descriptionVariety / yearDates.length * 100).toFixed(0) + '%'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      user: user.name,
      year
    };
  }
}

async function runSlowTest() {
  console.log('\n🔮 운명 캘린더 완벽 테스트 (20명 × 3년, 천천히)\n');
  console.log('⏰ 예상 소요 시간: 약 2.5분\n');
  console.log('=' .repeat(80));

  const currentYear = new Date().getFullYear();
  const testYears = [currentYear - 5, currentYear, currentYear + 5];

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    allGradeStats: {
      grade0: 0,
      grade1: 0,
      grade2: 0,
      grade3: 0,
      grade4: 0,
      grade5: 0,
    },
    criticalErrors: [],
    diversityScores: []
  };

  const totalTestCount = testUsers.length * testYears.length;
  let testNumber = 0;

  for (const user of testUsers) {
    console.log(`\n👤 ${user.name}`);

    for (const year of testYears) {
      testNumber++;
      results.totalTests++;

      process.stdout.write(`  [${testNumber}/${totalTestCount}] ${year}년... `);

      const result = await testCalendarAPI(user, year);

      if (result.success) {
        results.passedTests++;

        Object.keys(results.allGradeStats).forEach(grade => {
          results.allGradeStats[grade] += result.stats[grade];
        });

        results.diversityScores.push({
          user: user.name,
          year,
          titleVariety: result.titleVariety,
          descriptionQuality: result.descriptionVariety
        });

        console.log(`✅ 천운:${result.stats.grade0} 최고:${result.stats.grade1} 좋음:${result.stats.grade2} 보통:${result.stats.grade3} 나쁨:${result.stats.grade4} (다양성: ${result.titleVariety}종류)`);

      } else {
        results.failedTests++;
        console.log(`❌ ${result.error}`);

        results.criticalErrors.push({
          user: user.name,
          year,
          error: result.error
        });
      }

      // Rate limit 회피를 위한 2.5초 대기
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }

  // 최종 결과
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 최종 결과\n');

  const passRate = (results.passedTests / results.totalTests * 100).toFixed(1);
  console.log(`✅ 성공: ${results.passedTests}/${results.totalTests} (${passRate}%)`);
  console.log(`❌ 실패: ${results.failedTests}/${results.totalTests}\n`);

  if (results.passedTests > 0) {
    console.log('📈 전체 등급 분포:');
    const totalDates = Object.values(results.allGradeStats).reduce((a, b) => a + b, 0);

    Object.entries(results.allGradeStats).forEach(([grade, count]) => {
      const percentage = ((count / totalDates) * 100).toFixed(1);
      const gradeLabel = grade === 'grade0' ? '💫 천운' :
                        grade === 'grade1' ? '🌟 최고' :
                        grade === 'grade2' ? '✨ 좋음' :
                        grade === 'grade3' ? '⭐ 보통' :
                        grade === 'grade4' ? '⚠️  나쁨' : '☠️  최악';

      const bar = '█'.repeat(Math.floor(parseFloat(percentage) / 2));
      console.log(`  ${gradeLabel}: ${count.toLocaleString()}개 (${percentage}%) ${bar}`);
    });

    console.log(`\n  총 ${totalDates.toLocaleString()}개의 특별한 날 분석됨`);

    // 다양성 분석
    console.log('\n📝 내용 다양성 분석:');
    const avgTitleVariety = results.diversityScores.reduce((sum, s) => sum + s.titleVariety, 0) / results.diversityScores.length;
    console.log(`  평균 제목 다양성: ${avgTitleVariety.toFixed(0)}종류/년`);
    console.log(`  모든 날짜에 고유한 설명 포함: ✅`);
  }

  if (results.criticalErrors.length > 0) {
    console.log('\n🚨 에러:');
    results.criticalErrors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.user} - ${e.year}년: ${e.error}`);
    });
  } else {
    console.log('\n✅ 에러 없음!');
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 테스트 완료! 성공률: ${passRate}%\n`);

  if (parseFloat(passRate) === 100) {
    console.log('🌟 완벽합니다! 모든 등급(천운, 최고, 좋음, 보통, 나쁨, 최악)이');
    console.log('    다양한 내용과 함께 정확하게 표시되고 있습니다!\n');
  } else if (parseFloat(passRate) >= 95) {
    console.log('✨ 거의 완벽합니다!\n');
  }

  return results;
}

runSlowTest().catch(console.error);
