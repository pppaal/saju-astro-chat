/**
 * 운명 캘린더 소규모 테스트
 * 5명의 사용자 프로필로 과거/현재/미래 5년치 데이터 검증
 */

const testUsers = [
  { birthDate: "1990-03-15", birthTime: "08:30", birthPlace: "Seoul, South Korea", gender: "Male", name: "서울 남성 1990" },
  { birthDate: "1985-07-22", birthTime: "14:45", birthPlace: "Busan, South Korea", gender: "Female", name: "부산 여성 1985" },
  { birthDate: "2000-01-01", birthTime: "00:00", birthPlace: "Tokyo, Japan", gender: "Female", name: "도쿄 여성 2000" },
  { birthDate: "1994-02-29", birthTime: "10:10", birthPlace: "Seoul, South Korea", gender: "Female", name: "윤년생 여성 1994" },
  { birthDate: "1970-04-15", birthTime: "08:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "1970년생 남성" },
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
        'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || response.statusText, user: user.name, year };
    }

    const data = await response.json();

    // 데이터 검증
    const validation = validateCalendarData(data, year, user);

    return {
      success: validation.isValid,
      user: user.name,
      year,
      stats: validation.stats,
      issues: validation.issues,
      sampleDates: validation.sampleDates
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

function validateCalendarData(data, year, user) {
  const issues = [];
  const stats = {
    total: 0,
    grade0: 0,
    grade1: 0,
    grade2: 0,
    grade3: 0,
    grade4: 0,
    grade5: 0,
  };

  // allDates 검증
  if (!data.allDates || !Array.isArray(data.allDates)) {
    issues.push('allDates가 없거나 배열이 아님');
    return { isValid: false, stats, issues, sampleDates: [] };
  }

  // 연도별 필터링
  const yearDates = data.allDates.filter(d => {
    const dateYear = new Date(d.date).getFullYear();
    return dateYear === year;
  });

  if (yearDates.length === 0) {
    issues.push(`${year}년 데이터가 없음`);
    return { isValid: false, stats, issues, sampleDates: [] };
  }

  // 통계 계산
  yearDates.forEach(date => {
    stats.total++;
    if (date.grade === 0) {stats.grade0++;}
    else if (date.grade === 1) {stats.grade1++;}
    else if (date.grade === 2) {stats.grade2++;}
    else if (date.grade === 3) {stats.grade3++;}
    else if (date.grade === 4) {stats.grade4++;}
    else if (date.grade === 5) {stats.grade5++;}
  });

  // 날짜당 필수 필드 검증
  const requiredFields = ['date', 'grade', 'score', 'title', 'description', 'categories'];
  const sampleSize = Math.min(3, yearDates.length);
  const sampleDates = [];

  for (let i = 0; i < sampleSize; i++) {
    const date = yearDates[i];
    const missing = requiredFields.filter(field => !date[field]);

    if (missing.length > 0) {
      issues.push(`${date.date}: 필수 필드 누락 (${missing.join(', ')})`);
    }

    // 점수 범위 검증
    if (date.score < 0 || date.score > 100) {
      issues.push(`${date.date}: 점수 범위 오류 (${date.score})`);
    }

    // 등급 검증
    if (date.grade < 0 || date.grade > 5) {
      issues.push(`${date.date}: 등급 범위 오류 (${date.grade})`);
    }

    // 카테고리 검증
    if (!Array.isArray(date.categories) || date.categories.length === 0) {
      issues.push(`${date.date}: 카테고리가 없거나 배열이 아님`);
    }

    sampleDates.push({
      date: date.date,
      grade: date.grade,
      score: date.score,
      title: date.title,
      description: date.description?.substring(0, 80) + '...',
      categories: date.categories,
      hasFactors: !!(date.sajuFactors?.length || date.astroFactors?.length)
    });
  }

  // 등급별 최소 개수 검증 (합리적인 분포인지)
  const totalDays = 365; // 대략적인 연간 일수
  if (stats.total < totalDays * 0.05) {
    issues.push(`데이터가 너무 적음 (${stats.total}개, 최소 ${Math.floor(totalDays * 0.05)}개 필요)`);
  }

  return {
    isValid: issues.length === 0,
    stats,
    issues,
    sampleDates
  };
}

async function runSmallTest() {
  console.log('\n🔮 운명 캘린더 소규모 테스트 시작\n');
  console.log(`📊 테스트 대상: ${testUsers.length}명`);
  console.log(`📅 테스트 기간: 2023 ~ 2027 (5년)\n`);

  const years = [2023, 2024, 2025, 2026, 2027];

  console.log('=' .repeat(80));

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    byUser: {},
    byYear: {},
    criticalIssues: [],
    gradeDistribution: {
      grade0: 0,
      grade1: 0,
      grade2: 0,
      grade3: 0,
      grade4: 0,
      grade5: 0,
    }
  };

  // 각 사용자에 대해 테스트
  for (let userIndex = 0; userIndex < testUsers.length; userIndex++) {
    const user = testUsers[userIndex];
    console.log(`\n👤 [${userIndex + 1}/${testUsers.length}] ${user.name} 테스트 중...`);

    results.byUser[user.name] = {
      totalYears: 0,
      passedYears: 0,
      failedYears: 0,
      yearResults: {}
    };

    // 각 연도에 대해 테스트
    for (const year of years) {
      results.totalTests++;
      results.byUser[user.name].totalYears++;

      if (!results.byYear[year]) {
        results.byYear[year] = { passed: 0, failed: 0 };
      }

      const result = await testCalendarAPI(user, year);

      if (result.success) {
        results.passedTests++;
        results.byUser[user.name].passedYears++;
        results.byYear[year].passed++;

        // 등급별 통계 누적
        Object.keys(results.gradeDistribution).forEach(grade => {
          const gradeNum = parseInt(grade.replace('grade', ''));
          results.gradeDistribution[grade] += result.stats[`grade${gradeNum}`] || 0;
        });

        results.byUser[user.name].yearResults[year] = {
          success: true,
          stats: result.stats,
          sampleDates: result.sampleDates
        };

        console.log(`  ✅ ${year}년: 성공 (천운:${result.stats.grade0}, 최고:${result.stats.grade1}, 좋음:${result.stats.grade2}, 보통:${result.stats.grade3}, 나쁨:${result.stats.grade4}, 최악:${result.stats.grade5})`);
      } else {
        results.failedTests++;
        results.byUser[user.name].failedYears++;
        results.byYear[year].failed++;

        results.byUser[user.name].yearResults[year] = {
          success: false,
          error: result.error,
          issues: result.issues
        };

        console.log(`  ❌ ${year}년: 실패 (${result.error || result.issues?.join(', ')})`);

        results.criticalIssues.push({
          user: user.name,
          year,
          error: result.error,
          issues: result.issues
        });
      }

      // API 부하 방지를 위한 대기 (2초)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const userPassRate = (results.byUser[user.name].passedYears / results.byUser[user.name].totalYears * 100).toFixed(1);
    console.log(`  📈 ${user.name} 성공률: ${userPassRate}% (${results.byUser[user.name].passedYears}/${results.byUser[user.name].totalYears})`);
  }

  // 최종 결과 출력
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 최종 결과 요약\n');

  const totalPassRate = (results.passedTests / results.totalTests * 100).toFixed(1);
  console.log(`✅ 전체 성공: ${results.passedTests}/${results.totalTests} (${totalPassRate}%)`);
  console.log(`❌ 전체 실패: ${results.failedTests}/${results.totalTests}\n`);

  // 등급별 분포
  console.log('📈 등급별 전체 분포:');
  const totalDates = Object.values(results.gradeDistribution).reduce((a, b) => a + b, 0);
  Object.keys(results.gradeDistribution).forEach(grade => {
    const count = results.gradeDistribution[grade];
    const percentage = totalDates > 0 ? (count / totalDates * 100).toFixed(1) : 0;
    const gradeLabel = grade === 'grade0' ? '💫 천운' :
                      grade === 'grade1' ? '🌟 최고' :
                      grade === 'grade2' ? '✨ 좋음' :
                      grade === 'grade3' ? '⭐ 보통' :
                      grade === 'grade4' ? '⚠️  나쁨' : '☠️  최악';
    console.log(`  ${gradeLabel}: ${count.toLocaleString()}개 (${percentage}%)`);
  });

  // 연도별 결과
  console.log('\n📅 연도별 성공률:');
  years.forEach(year => {
    const yearData = results.byYear[year];
    const passRate = yearData.passed + yearData.failed > 0
      ? (yearData.passed / (yearData.passed + yearData.failed) * 100).toFixed(1)
      : 0;
    const status = passRate === '100.0' ? '✅' : passRate >= '90.0' ? '⚠️' : '❌';
    console.log(`  ${status} ${year}년: ${passRate}% (${yearData.passed}/${yearData.passed + yearData.failed})`);
  });

  // 샘플 날짜 출력 (다양성 검증)
  console.log('\n🔍 샘플 날짜 분석 (내용 다양성 검증):\n');

  for (const [userName, userData] of Object.entries(results.byUser)) {
    if (userData.passedYears > 0) {
      const sampleYear = years.find(y => userData.yearResults[y]?.success);
      if (sampleYear) {
        const sampleResult = userData.yearResults[sampleYear];
        if (sampleResult.sampleDates && sampleResult.sampleDates.length > 0) {
          console.log(`  👤 ${userName} - ${sampleYear}년 샘플:`);
          sampleResult.sampleDates.forEach((date, idx) => {
            const gradeEmoji = date.grade === 0 ? '💫' :
                              date.grade === 1 ? '🌟' :
                              date.grade === 2 ? '✨' :
                              date.grade === 3 ? '⭐' :
                              date.grade === 4 ? '⚠️' : '☠️';
            console.log(`    ${idx + 1}. ${date.date} ${gradeEmoji} (점수: ${date.score})`);
            console.log(`       제목: ${date.title}`);
            console.log(`       설명: ${date.description}`);
            console.log(`       카테고리: ${date.categories.join(', ')}`);
            console.log(`       분석: ${date.hasFactors ? '✅ 사주/점성술 분석 포함' : '❌ 분석 없음'}`);
          });
          console.log('');
          break;  // 한 명만 상세히 보기
        }
      }
    }
  }

  // 크리티컬 이슈
  if (results.criticalIssues.length > 0) {
    console.log('\n🚨 크리티컬 이슈:');
    results.criticalIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.user} - ${issue.year}년`);
      console.log(`     오류: ${issue.error || issue.issues?.join(', ')}`);
    });
  } else {
    console.log('\n✅ 크리티컬 이슈 없음!');
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 테스트 완료! 전체 성공률: ${totalPassRate}%\n`);

  // 결과를 파일로 저장
  const fs = require('fs');
  fs.writeFileSync(
    'calendar-test-results-small.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 상세 결과가 calendar-test-results-small.json에 저장되었습니다.\n');

  return results;
}

// 테스트 실행
runSmallTest().catch(console.error);
