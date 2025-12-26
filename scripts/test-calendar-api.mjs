/**
 * Calendar API 테스트 스크립트
 * 10명의 다른 생년월일/시간/도시로 테스트
 */

const TEST_PROFILES = [
  { birthDate: "1990-03-15", birthTime: "08:30", city: "Seoul", lat: 37.5665, lng: 126.978, tz: "Asia/Seoul", gender: "M", name: "테스트1" },
  { birthDate: "1985-07-22", birthTime: "14:00", city: "New York", lat: 40.7128, lng: -74.006, tz: "America/New_York", gender: "F", name: "테스트2" },
  { birthDate: "1992-11-08", birthTime: "23:45", city: "Tokyo", lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo", gender: "M", name: "테스트3" },
  { birthDate: "1978-01-30", birthTime: "06:15", city: "London", lat: 51.5074, lng: -0.1278, tz: "Europe/London", gender: "F", name: "테스트4" },
  { birthDate: "2000-05-05", birthTime: "12:00", city: "Sydney", lat: -33.8688, lng: 151.2093, tz: "Australia/Sydney", gender: "M", name: "테스트5" },
  { birthDate: "1995-09-18", birthTime: "03:30", city: "Paris", lat: 48.8566, lng: 2.3522, tz: "Europe/Paris", gender: "F", name: "테스트6" },
  { birthDate: "1988-12-25", birthTime: "19:00", city: "Beijing", lat: 39.9042, lng: 116.4074, tz: "Asia/Shanghai", gender: "M", name: "테스트7" },
  { birthDate: "1973-04-12", birthTime: "10:45", city: "Los Angeles", lat: 34.0522, lng: -118.2437, tz: "America/Los_Angeles", gender: "F", name: "테스트8" },
  { birthDate: "2002-08-01", birthTime: "16:20", city: "Mumbai", lat: 19.076, lng: 72.8777, tz: "Asia/Kolkata", gender: "M", name: "테스트9" },
  { birthDate: "1982-06-21", birthTime: "00:01", city: "Berlin", lat: 52.52, lng: 13.405, tz: "Europe/Berlin", gender: "F", name: "테스트10" },
];

const BASE_URL = "http://localhost:3000";
const API_TOKEN = "066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e";

async function testCalendarAPI(profile, index) {
  const { birthDate, birthTime, city, lat, lng, tz, gender, name } = profile;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const url = `${BASE_URL}/api/calendar?birthDate=${birthDate}&birthTime=${birthTime}&birthCity=${encodeURIComponent(city)}&latitude=${lat}&longitude=${lng}&timezone=${encodeURIComponent(tz)}&gender=${gender}&year=${year}&month=${month}&lang=ko`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${index + 1}/10] ${name}: ${birthDate} ${birthTime} @ ${city}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        "x-api-token": API_TOKEN
      }
    });
    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      console.log(`❌ HTTP 에러: ${response.status}`);
      const text = await response.text();
      console.log(`   응답: ${text.substring(0, 200)}`);
      return { success: false, name, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // 기본 데이터 확인
    const hasAllDates = data.allDates && Array.isArray(data.allDates);
    const hasSummary = data.summary && typeof data.summary === "object";
    const dayCount = hasAllDates ? data.allDates.length : 0;
    const topDatesCount = data.topDates?.length || 0;
    const goodDatesCount = data.goodDates?.length || 0;
    const badDatesCount = data.badDates?.length || 0;

    console.log(`✅ 응답 성공 (${elapsed}ms)`);
    console.log(`   - 전체 날짜: ${dayCount}일`);
    console.log(`   - 탑 날짜: ${topDatesCount}개, 좋은 날: ${goodDatesCount}개, 나쁜 날: ${badDatesCount}개`);
    console.log(`   - 요약 정보: ${hasSummary ? "있음" : "❌ 없음"}`);

    if (hasSummary) {
      console.log(`   - 천운: ${data.summary.grade0 ?? "N/A"}일, 최고: ${data.summary.grade1 ?? "N/A"}일, 주의: ${data.summary.grade4 ?? "N/A"}일`);
    }

    // 각 날짜 데이터 검증
    let issues = [];
    let sampleDays = [];

    if (hasAllDates) {
      for (const day of data.allDates) {
        // 필수 필드 체크
        if (!day.date) issues.push(`날짜 누락`);
        if (day.grade === undefined) issues.push(`${day.date}: grade 누락`);
        if (day.score === undefined) issues.push(`${day.date}: score 누락`);

        // recommendations 체크 - 번역되지 않은 키 확인
        if (day.recommendations && Array.isArray(day.recommendations)) {
          for (const rec of day.recommendations) {
            if (rec && rec.startsWith("calendar.recommendations.")) {
              issues.push(`${day.date}: 번역 안된 추천 - ${rec}`);
            }
          }
        }

        // warnings 체크
        if (day.warnings && Array.isArray(day.warnings)) {
          for (const warn of day.warnings) {
            if (warn && warn.startsWith("calendar.warnings.")) {
              issues.push(`${day.date}: 번역 안된 경고 - ${warn}`);
            }
          }
        }

        // 샘플로 몇 개 날짜 저장
        if (sampleDays.length < 3 && day.grade <= 1) {
          sampleDays.push(day);
        }
      }
    }

    // 이슈 출력
    if (issues.length > 0) {
      console.log(`   ⚠️ 발견된 이슈 (${issues.length}개):`);
      issues.slice(0, 5).forEach(issue => console.log(`      - ${issue}`));
      if (issues.length > 5) console.log(`      ... 외 ${issues.length - 5}개`);
    } else {
      console.log(`   ✅ 데이터 검증 통과`);
    }

    // 샘플 날짜 출력 (다양한 등급에서)
    if (sampleDays.length > 0) {
      console.log(`   📅 좋은 날 샘플:`);
      for (const day of sampleDays) {
        const gradeLabel = day.grade === 0 ? "천운" : day.grade === 1 ? "최고" : `등급${day.grade}`;
        console.log(`      - ${day.date} [${gradeLabel}] ${day.title || "제목없음"}`);
        if (day.recommendations && day.recommendations.length > 0) {
          console.log(`        추천: ${day.recommendations.slice(0, 2).join(" / ")}`);
        }
      }
    }

    // 다양한 날짜 내용 비교용 - 특정 날짜 3개의 전체 내용
    const detailedDays = data.allDates?.slice(0, 3) || [];
    console.log(`   📋 상세 내용 (처음 3일):`);
    for (const day of detailedDays) {
      console.log(`      [${day.date}] grade=${day.grade}, score=${day.score}`);
      console.log(`         제목: ${day.title || "없음"}`);
      console.log(`         카테고리: ${day.categories?.join(", ") || "없음"}`);
      if (day.recommendations?.length > 0) {
        console.log(`         추천(${day.recommendations.length}개): ${day.recommendations[0]?.substring(0, 40)}...`);
      }
      if (day.warnings?.length > 0) {
        console.log(`         경고(${day.warnings.length}개): ${day.warnings[0]?.substring(0, 40)}...`);
      }
      if (day.sajuFactors?.length > 0) {
        console.log(`         사주요인: ${day.sajuFactors.slice(0, 2).join(", ")}`);
      }
    }

    return {
      success: true,
      name,
      dayCount,
      issueCount: issues.length,
      grade0: data.summary?.grade0 || 0,
      grade1: data.summary?.grade1 || 0,
      grade4: data.summary?.grade4 || 0,
      elapsed
    };

  } catch (error) {
    console.log(`❌ 에러: ${error.message}`);
    return { success: false, name, error: error.message };
  }
}

async function runAllTests() {
  console.log("\n🗓️ 캘린더 API 테스트 시작");
  console.log(`테스트 대상: ${TEST_PROFILES.length}명`);
  console.log(`테스트 서버: ${BASE_URL}`);

  const results = [];

  for (let i = 0; i < TEST_PROFILES.length; i++) {
    const result = await testCalendarAPI(TEST_PROFILES[i], i);
    results.push(result);

    // 서버 부하 방지를 위해 잠시 대기
    if (i < TEST_PROFILES.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 최종 요약
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 테스트 결과 요약");
  console.log(`${"=".repeat(60)}`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ 성공: ${successful.length}/${results.length}`);
  console.log(`❌ 실패: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    const avgElapsed = Math.round(successful.reduce((a, b) => a + b.elapsed, 0) / successful.length);
    const totalIssues = successful.reduce((a, b) => a + b.issueCount, 0);

    console.log(`\n⏱️ 평균 응답 시간: ${avgElapsed}ms`);
    console.log(`⚠️ 총 이슈 수: ${totalIssues}`);

    console.log(`\n📅 결과 비교 (모든 결과가 다른지 확인):`);
    console.log("   이름           | 천운 | 최고 | 주의 | 날짜수");
    console.log("   " + "-".repeat(50));
    for (const r of successful) {
      const name = r.name.padEnd(12, " ");
      console.log(`   ${name} |  ${r.grade0}   |  ${r.grade1}   |  ${r.grade4}   |  ${r.dayCount}`);
    }

    // 결과가 모두 다른지 확인
    const uniqueResults = new Set(successful.map(r => `${r.grade0}-${r.grade1}-${r.grade4}`));
    if (uniqueResults.size === successful.length) {
      console.log(`\n✅ 모든 테스트 결과가 서로 다릅니다 (개인화 검증 통과)`);
    } else {
      console.log(`\n⚠️ 일부 결과가 동일합니다 (${uniqueResults.size}개 고유 결과)`);
    }
  }

  if (failed.length > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    for (const r of failed) {
      console.log(`   - ${r.name}: ${r.error}`);
    }
  }

  console.log("\n테스트 완료!");
}

runAllTests().catch(console.error);
