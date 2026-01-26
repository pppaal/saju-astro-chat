/**
 * 직접 API 테스트 - 브라우저 세션 없이
 */

const testCases = [
  {
    name: "서울 남성 1990",
    birthDate: "1990-03-15",
    birthTime: "08:30",
    birthPlace: "Seoul, South Korea",
    years: [2020, 2025, 2030]
  },
  {
    name: "부산 여성 1985",
    birthDate: "1985-07-22",
    birthTime: "14:45",
    birthPlace: "Busan, South Korea",
    years: [2020, 2025, 2030]
  },
  {
    name: "도쿄 여성 2000",
    birthDate: "2000-01-01",
    birthTime: "00:00",
    birthPlace: "Tokyo, Japan",
    years: [2020, 2025, 2030]
  },
];

async function testAPI(testCase, year) {
  const params = new URLSearchParams({
    year: String(year),
    locale: 'ko',
    birthDate: testCase.birthDate,
    birthTime: testCase.birthTime,
    birthPlace: testCase.birthPlace,
    category: 'all'
  });

  try {
    const response = await fetch(`http://localhost:3000/api/calendar?${params}`, {
      headers: {
        'Cookie': '', // 브라우저 쿠키 없이
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.message || data.error || 'Unknown error'
      };
    }

    // 연도별 데이터 필터링
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

    // 샘플 체크
    const samples = yearDates.slice(0, 3).map(d => ({
      date: d.date,
      grade: d.grade,
      score: d.score,
      title: d.title,
      hasDescription: !!d.description && d.description.length > 20,
      hasCategories: Array.isArray(d.categories) && d.categories.length > 0,
      hasFactors: !!(d.sajuFactors?.length || d.astroFactors?.length)
    }));

    return {
      success: true,
      stats,
      samples
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('\n🔮 운명 캘린더 직접 API 테스트\n');
  console.log('=' .repeat(80));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const allGradeStats = {
    grade0: 0,
    grade1: 0,
    grade2: 0,
    grade3: 0,
    grade4: 0,
    grade5: 0,
  };

  for (const testCase of testCases) {
    console.log(`\n👤 ${testCase.name} 테스트 중...`);

    for (const year of testCase.years) {
      totalTests++;

      const result = await testAPI(testCase, year);

      if (result.success) {
        passedTests++;

        // 통계 누적
        Object.keys(allGradeStats).forEach(grade => {
          allGradeStats[grade] += result.stats[grade];
        });

        console.log(`  ✅ ${year}년: 성공`);
        console.log(`     통계: 천운(${result.stats.grade0}), 최고(${result.stats.grade1}), 좋음(${result.stats.grade2}), 보통(${result.stats.grade3}), 나쁨(${result.stats.grade4}), 최악(${result.stats.grade5})`);

        // 샘플 검증
        const sampleIssues = [];
        result.samples.forEach((s, i) => {
          if (!s.hasDescription) {sampleIssues.push(`${s.date}: 설명 부족`);}
          if (!s.hasCategories) {sampleIssues.push(`${s.date}: 카테고리 없음`);}
          if (!s.hasFactors) {sampleIssues.push(`${s.date}: 분석 없음`);}
        });

        if (sampleIssues.length > 0) {
          console.log(`     ⚠️  이슈: ${sampleIssues.join(', ')}`);
        } else {
          console.log(`     ✨ 샘플: 모두 정상 (설명, 카테고리, 분석 포함)`);
        }

        // 첫 번째 샘플 상세 출력
        if (result.samples.length > 0) {
          const first = result.samples[0];
          const gradeEmoji = first.grade === 0 ? '💫' :
                            first.grade === 1 ? '🌟' :
                            first.grade === 2 ? '✨' :
                            first.grade === 3 ? '⭐' :
                            first.grade === 4 ? '⚠️' : '☠️';
          console.log(`     📅 ${first.date} ${gradeEmoji} (점수: ${first.score}) - ${first.title}`);
        }

      } else {
        failedTests++;
        console.log(`  ❌ ${year}년: 실패`);
        console.log(`     오류: ${result.error || `HTTP ${result.status}`}`);
      }

      // API 부하 방지
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 최종 결과\n');

  const passRate = (passedTests / totalTests * 100).toFixed(1);
  console.log(`✅ 성공: ${passedTests}/${totalTests} (${passRate}%)`);
  console.log(`❌ 실패: ${failedTests}/${totalTests}\n`);

  if (passedTests > 0) {
    console.log('📈 전체 등급 분포:');
    const total = Object.values(allGradeStats).reduce((a, b) => a + b, 0);
    Object.entries(allGradeStats).forEach(([grade, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const gradeLabel = grade === 'grade0' ? '💫 천운' :
                        grade === 'grade1' ? '🌟 최고' :
                        grade === 'grade2' ? '✨ 좋음' :
                        grade === 'grade3' ? '⭐ 보통' :
                        grade === 'grade4' ? '⚠️  나쁨' : '☠️  최악';
      console.log(`  ${gradeLabel}: ${count}개 (${percentage}%)`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 테스트 완료! 성공률: ${passRate}%\n`);

  if (passRate === '100.0') {
    console.log('🌟 모든 테스트 통과! 운명 캘린더가 완벽하게 작동합니다!\n');
  }
}

runTests().catch(console.error);
