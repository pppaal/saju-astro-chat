/**
 * 운명 캘린더 완벽 테스트 - 인증 포함
 * 30명의 사용자 프로필로 과거/현재/미래 테스트
 */

// 환경 변수에서 토큰 가져오기
const API_TOKEN = '066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e';

const testUsers = [
  { birthDate: "1990-03-15", birthTime: "08:30", birthPlace: "Seoul, South Korea", name: "서울 남성 1990" },
  { birthDate: "1985-07-22", birthTime: "14:45", birthPlace: "Busan, South Korea", name: "부산 여성 1985" },
  { birthDate: "2000-01-01", birthTime: "00:00", birthPlace: "Tokyo, Japan", name: "도쿄 여성 2000" },
  { birthDate: "1994-02-29", birthTime: "10:10", birthPlace: "Seoul, South Korea", name: "윤년생 1994" },
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
  { birthDate: "1989-11-09", birthTime: "20:00", birthPlace: "Berlin, Germany", name: "베를린 장벽" },
  { birthDate: "1997-05-01", birthTime: "10:00", birthPlace: "Mexico City, Mexico", name: "멕시코시티 1997" },
  { birthDate: "1986-08-15", birthTime: "15:00", birthPlace: "Seoul, South Korea", name: "광복절생 1986" },
  { birthDate: "1978-02-28", birthTime: "14:00", birthPlace: "Athens, Greece", name: "아테네 1978" },
  { birthDate: "2003-07-04", birthTime: "16:00", birthPlace: "Boston, USA", name: "보스턴 독립기념일" },
  { birthDate: "1974-10-01", birthTime: "10:00", birthPlace: "Beijing, China", name: "베이징 국경절" },
  { birthDate: "1992-01-26", birthTime: "12:00", birthPlace: "New Delhi, India", name: "뉴델리 공화국" },
  { birthDate: "1981-12-31", birthTime: "23:59", birthPlace: "Rio de Janeiro, Brazil", name: "리우 새해 전야" },
  { birthDate: "2000-02-29", birthTime: "12:00", birthPlace: "Seoul, South Korea", name: "윤년 2000" }
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

    // 샘플 검증 (처음 3개)
    const samples = yearDates.slice(0, 3).map(d => ({
      date: d.date,
      grade: d.grade,
      score: d.score,
      title: d.title,
      hasDescription: !!d.description && d.description.length > 20,
      hasCategories: Array.isArray(d.categories) && d.categories.length > 0,
      hasFactors: !!(d.sajuFactors?.length || d.astroFactors?.length)
    }));

    // 검증: 모든 샘플이 설명, 카테고리, 분석을 가지고 있는지
    const issues = [];
    samples.forEach(s => {
      if (!s.hasDescription) issues.push(`${s.date}: 설명 부족`);
      if (!s.hasCategories) issues.push(`${s.date}: 카테고리 없음`);
      if (!s.hasFactors) issues.push(`${s.date}: 분석 없음`);
    });

    return {
      success: true,
      user: user.name,
      year,
      stats,
      samples,
      issues
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

async function runComprehensiveTest() {
  console.log('\n🔮 운명 캘린더 완벽 테스트 (30명 × 3년)\n');
  console.log('=' .repeat(80));

  const currentYear = new Date().getFullYear();
  const testYears = [currentYear - 5, currentYear, currentYear + 5]; // 과거, 현재, 미래

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    byUser: {},
    allGradeStats: {
      grade0: 0,
      grade1: 0,
      grade2: 0,
      grade3: 0,
      grade4: 0,
      grade5: 0,
    },
    allIssues: [],
    criticalErrors: []
  };

  let testNumber = 0;
  const totalTestCount = testUsers.length * testYears.length;

  for (const user of testUsers) {
    console.log(`\n👤 ${user.name} 테스트 중...`);

    results.byUser[user.name] = {
      passed: 0,
      failed: 0,
      yearResults: {}
    };

    for (const year of testYears) {
      testNumber++;
      results.totalTests++;

      process.stdout.write(`  [${testNumber}/${totalTestCount}] ${year}년... `);

      const result = await testCalendarAPI(user, year);

      if (result.success) {
        results.passedTests++;
        results.byUser[user.name].passed++;

        // 등급별 통계 누적
        Object.keys(results.allGradeStats).forEach(grade => {
          results.allGradeStats[grade] += result.stats[grade];
        });

        results.byUser[user.name].yearResults[year] = {
          success: true,
          stats: result.stats
        };

        const gradesSummary = `천운:${result.stats.grade0} 최고:${result.stats.grade1} 좋음:${result.stats.grade2} 보통:${result.stats.grade3} 나쁨:${result.stats.grade4} 최악:${result.stats.grade5}`;
        console.log(`✅ ${gradesSummary}`);

        // 이슈가 있으면 기록
        if (result.issues && result.issues.length > 0) {
          results.allIssues.push({
            user: user.name,
            year,
            issues: result.issues
          });
          console.log(`     ⚠️  이슈: ${result.issues.join(', ')}`);
        }

      } else {
        results.failedTests++;
        results.byUser[user.name].failed++;

        results.byUser[user.name].yearResults[year] = {
          success: false,
          error: result.error
        };

        console.log(`❌ 실패: ${result.error}`);

        results.criticalErrors.push({
          user: user.name,
          year,
          error: result.error,
          status: result.status
        });
      }

      // API 부하 방지 (0.5초 대기)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 최종 결과 출력
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 최종 테스트 결과\n');

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
  }

  // 사용자별 성공률
  console.log('\n👥 사용자별 성공률:');
  const userPassRates = Object.entries(results.byUser).map(([name, data]) => ({
    name,
    passRate: data.passed / (data.passed + data.failed) * 100,
    passed: data.passed,
    total: data.passed + data.failed
  })).sort((a, b) => b.passRate - a.passRate);

  userPassRates.slice(0, 5).forEach(u => {
    const status = u.passRate === 100 ? '✅' : u.passRate >= 66 ? '⚠️' : '❌';
    console.log(`  ${status} ${u.name}: ${u.passRate.toFixed(0)}% (${u.passed}/${u.total})`);
  });

  if (userPassRates.length > 5) {
    console.log(`  ... 외 ${userPassRates.length - 5}명`);
  }

  // 크리티컬 에러
  if (results.criticalErrors.length > 0) {
    console.log('\n🚨 크리티컬 에러:');
    results.criticalErrors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.user} - ${e.year}년: ${e.error} (HTTP ${e.status || 'N/A'})`);
    });
    if (results.criticalErrors.length > 5) {
      console.log(`  ... 외 ${results.criticalErrors.length - 5}개 에러`);
    }
  } else {
    console.log('\n✅ 크리티컬 에러 없음!');
  }

  // 컨텐츠 이슈
  if (results.allIssues.length > 0) {
    console.log(`\n⚠️  컨텐츠 이슈 발견: ${results.allIssues.length}건`);
    console.log('   (설명 부족, 카테고리 없음, 분석 없음 등)');
  } else {
    console.log('\n✅ 컨텐츠 품질 검증 통과!');
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 테스트 완료! 전체 성공률: ${passRate}%\n`);

  if (parseFloat(passRate) === 100) {
    console.log('🌟 완벽합니다! 모든 테스트를 통과했습니다!\n');
  } else if (parseFloat(passRate) >= 90) {
    console.log('✨ 거의 완벽합니다! 몇 가지 이슈를 확인해주세요.\n');
  } else if (parseFloat(passRate) >= 70) {
    console.log('⚠️  일부 문제가 있습니다. 실패한 케이스를 확인해주세요.\n');
  } else {
    console.log('❌ 심각한 문제가 있습니다. 즉시 수정이 필요합니다.\n');
  }

  // 결과를 JSON 파일로 저장
  const fs = require('fs');
  fs.writeFileSync(
    'calendar-test-results-comprehensive.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 상세 결과가 calendar-test-results-comprehensive.json에 저장되었습니다.\n');

  return results;
}

// 테스트 실행
runComprehensiveTest().catch(console.error);
