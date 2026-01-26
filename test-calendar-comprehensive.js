/**
 * 운명 캘린더 종합 테스트
 * 30명의 다양한 사용자 프로필로 과거/미래 20년치 데이터 검증
 */

const testUsers = [
  // 다양한 연령대와 성별
  { birthDate: "1990-03-15", birthTime: "08:30", birthPlace: "Seoul, South Korea", gender: "Male", name: "서울 남성 1990" },
  { birthDate: "1985-07-22", birthTime: "14:45", birthPlace: "Busan, South Korea", gender: "Female", name: "부산 여성 1985" },
  { birthDate: "1995-11-08", birthTime: "22:15", birthPlace: "Incheon, South Korea", gender: "Male", name: "인천 남성 1995" },
  { birthDate: "2000-01-01", birthTime: "00:00", birthPlace: "Daegu, South Korea", gender: "Female", name: "대구 여성 2000" },
  { birthDate: "1978-05-30", birthTime: "11:20", birthPlace: "Gwangju, South Korea", gender: "Male", name: "광주 남성 1978" },

  // 해외 출생
  { birthDate: "1992-09-17", birthTime: "16:00", birthPlace: "New York, United States", gender: "Female", name: "뉴욕 여성 1992" },
  { birthDate: "1988-12-25", birthTime: "09:30", birthPlace: "London, United Kingdom", gender: "Male", name: "런던 남성 1988" },
  { birthDate: "1997-04-11", birthTime: "18:45", birthPlace: "Tokyo, Japan", gender: "Female", name: "도쿄 여성 1997" },
  { birthDate: "1983-08-08", birthTime: "13:00", birthPlace: "Paris, France", gender: "Male", name: "파리 남성 1983" },
  { birthDate: "1999-06-20", birthTime: "07:15", birthPlace: "Sydney, Australia", gender: "Female", name: "시드니 여성 1999" },

  // 다양한 시간대
  { birthDate: "1991-10-05", birthTime: "03:30", birthPlace: "Seoul, South Korea", gender: "Male", name: "새벽생 남성 1991" },
  { birthDate: "1987-02-14", birthTime: "23:55", birthPlace: "Seoul, South Korea", gender: "Female", name: "밤생 여성 1987" },
  { birthDate: "1993-12-31", birthTime: "12:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "정오생 남성 1993" },
  { birthDate: "1996-07-04", birthTime: "06:00", birthPlace: "Seoul, South Korea", gender: "Female", name: "아침생 여성 1996" },
  { birthDate: "1989-03-21", birthTime: "20:30", birthPlace: "Seoul, South Korea", gender: "Male", name: "저녁생 남성 1989" },

  // 특수 날짜
  { birthDate: "1994-02-29", birthTime: "10:10", birthPlace: "Seoul, South Korea", gender: "Female", name: "윤년생 여성 1994" },
  { birthDate: "1986-05-05", birthTime: "05:05", birthPlace: "Seoul, South Korea", gender: "Male", name: "어린이날 남성 1986" },
  { birthDate: "1998-12-24", birthTime: "15:30", birthPlace: "Seoul, South Korea", gender: "Female", name: "크리스마스이브 여성 1998" },
  { birthDate: "1984-10-03", birthTime: "11:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "개천절 남성 1984" },
  { birthDate: "2001-03-01", birthTime: "14:20", birthPlace: "Seoul, South Korea", gender: "Female", name: "삼일절 여성 2001" },

  // 십이지신 각 동물별로
  { birthDate: "1990-01-27", birthTime: "09:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "말띠 남성 1990" },
  { birthDate: "1991-02-15", birthTime: "10:30", birthPlace: "Seoul, South Korea", gender: "Female", name: "양띠 여성 1991" },
  { birthDate: "1992-02-04", birthTime: "11:45", birthPlace: "Seoul, South Korea", gender: "Male", name: "원숭이띠 남성 1992" },
  { birthDate: "1993-01-23", birthTime: "13:15", birthPlace: "Seoul, South Korea", gender: "Female", name: "닭띠 여성 1993" },
  { birthDate: "1994-02-10", birthTime: "14:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "개띠 남성 1994" },

  // 최근 출생
  { birthDate: "2003-08-18", birthTime: "16:20", birthPlace: "Seoul, South Korea", gender: "Female", name: "2003년생 여성" },
  { birthDate: "2005-11-11", birthTime: "11:11", birthPlace: "Seoul, South Korea", gender: "Male", name: "2005년생 남성" },
  { birthDate: "2010-05-25", birthTime: "17:30", birthPlace: "Seoul, South Korea", gender: "Female", name: "2010년생 여성" },

  // 나이 많은 분들
  { birthDate: "1970-04-15", birthTime: "08:00", birthPlace: "Seoul, South Korea", gender: "Male", name: "1970년생 남성" },
  { birthDate: "1965-09-22", birthTime: "12:30", birthPlace: "Seoul, South Korea", gender: "Female", name: "1965년생 여성" },
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
      return { success: false, error: error.message || 'API Error', user: user.name, year };
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
  const sampleSize = Math.min(5, yearDates.length);
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
      categories: date.categories,
      hasFactors: !!(date.sajuFactors?.length || date.astroFactors?.length)
    });
  }

  // 등급별 최소 개수 검증 (합리적인 분포인지)
  const totalDays = 365; // 대략적인 연간 일수
  if (stats.total < totalDays * 0.1) {
    issues.push(`데이터가 너무 적음 (${stats.total}개)`);
  }

  // 모든 등급이 0개면 이상함
  if (stats.grade0 === 0 && stats.grade1 === 0 && stats.grade2 === 0 &&
      stats.grade3 === 0 && stats.grade4 === 0 && stats.grade5 === 0) {
    issues.push('모든 등급이 0개');
  }

  return {
    isValid: issues.length === 0,
    stats,
    issues,
    sampleDates
  };
}

async function runComprehensiveTest() {
  console.log('\n🔮 운명 캘린더 종합 테스트 시작\n');
  console.log(`📊 테스트 대상: ${testUsers.length}명`);
  console.log(`📅 테스트 기간: 과거 10년 + 미래 10년 (총 20년)\n`);

  const currentYear = new Date().getFullYear();
  const years = [];

  // 과거 10년
  for (let i = 10; i >= 1; i--) {
    years.push(currentYear - i);
  }

  // 올해 + 미래 9년
  for (let i = 0; i < 10; i++) {
    years.push(currentYear + i);
  }

  console.log(`📆 테스트 연도: ${years[0]} ~ ${years[years.length - 1]}\n`);
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

      // API 부하 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
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

  // 사용자별 결과 (실패가 있는 경우만)
  const failedUsers = Object.entries(results.byUser).filter(([_, data]) => data.failedYears > 0);
  if (failedUsers.length > 0) {
    console.log('\n⚠️  실패가 있는 사용자:');
    failedUsers.forEach(([name, data]) => {
      const failRate = (data.failedYears / data.totalYears * 100).toFixed(1);
      console.log(`  ❌ ${name}: ${data.failedYears}/${data.totalYears} 실패 (${failRate}%)`);
    });
  }

  // 샘플 날짜 출력 (다양성 검증)
  console.log('\n🔍 샘플 날짜 분석 (내용 다양성 검증):');
  const sampleUser = testUsers[0];
  const sampleYear = currentYear;
  const sampleResult = results.byUser[sampleUser.name]?.yearResults[sampleYear];

  if (sampleResult?.success && sampleResult.sampleDates) {
    console.log(`\n  ${sampleUser.name} - ${sampleYear}년 샘플:`);
    sampleResult.sampleDates.forEach((date, idx) => {
      const gradeEmoji = date.grade === 0 ? '💫' :
                        date.grade === 1 ? '🌟' :
                        date.grade === 2 ? '✨' :
                        date.grade === 3 ? '⭐' :
                        date.grade === 4 ? '⚠️' : '☠️';
      console.log(`    ${idx + 1}. ${date.date} ${gradeEmoji} (점수: ${date.score})`);
      console.log(`       제목: ${date.title}`);
      console.log(`       카테고리: ${date.categories.join(', ')}`);
      console.log(`       분석: ${date.hasFactors ? '✅ 사주/점성술 분석 포함' : '❌ 분석 없음'}`);
    });
  }

  // 크리티컬 이슈
  if (results.criticalIssues.length > 0) {
    console.log('\n🚨 크리티컬 이슈 (상위 10개):');
    results.criticalIssues.slice(0, 10).forEach((issue, idx) => {
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
    'calendar-test-results-comprehensive.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 상세 결과가 calendar-test-results-comprehensive.json에 저장되었습니다.\n');

  return results;
}

// 테스트 실행
runComprehensiveTest().catch(console.error);
