import { extractSajuProfile, extractAstroProfile, calculateMonthlyImportantDates } from '@/lib/destiny-map/destinyCalendar';
import { elementTraits, elementKeyMap, elementRelations, monthElements } from '../data';

export function getRecommendedDates(saju: any, astro: any, lang: string): { date: string; type: string; reason: string; score: number; grade?: number }[] {
  const isKo = lang === "ko";
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  try {
    const sajuProfile = extractSajuProfile(saju);
    const astroProfile = extractAstroProfile(astro);

    // 생년월일에서 출생년도 추출 (과거 15년 ~ 미래 15년)
    const birthYear = parseInt(saju.birthDate?.split("-")[0]) || 1990;
    const currentAge = currentYear - birthYear;
    const startYear = currentYear - 15; // 과거 15년
    const endYear = currentYear + 15; // 미래 15년

    // 연도별 평균 점수 계산
    const yearScores: Record<number, { totalScore: number; count: number; bestGrade: number; dates: any[] }> = {};

    // 과거 15년부터 미래 15년까지 스캔
    for (let year = startYear; year <= endYear; year++) {
      yearScores[year] = { totalScore: 0, count: 0, bestGrade: 0, dates: [] };

      // 각 년도의 모든 월을 체크
      for (let month = 0; month < 12; month++) {
        const monthData = calculateMonthlyImportantDates(year, month, sajuProfile, astroProfile);

        // 모든 날짜 수집 (좋은 날과 나쁜 날 모두)
        for (const d of monthData.dates) {
          yearScores[year].totalScore += d.score;
          yearScores[year].count += 1;
          yearScores[year].bestGrade = Math.max(yearScores[year].bestGrade, d.grade || 0);
          yearScores[year].dates.push(d);
        }
      }
    }

    // 연도별 평균 점수 계산하여 배열로 변환
    const yearRankings = Object.entries(yearScores)
      .map(([year, data]) => ({
        year: parseInt(year),
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        bestGrade: data.bestGrade,
        totalScore: data.totalScore,
        count: data.count
      }))
      .filter(y => y.count > 0); // 데이터가 있는 년도만

    // 점수 순으로 정렬
    yearRankings.sort((a, b) => b.avgScore - a.avgScore);

    // 상위 4개 (좋은 해)와 하위 4개 (나쁜 해) 선택
    const bestYears = yearRankings.slice(0, 4);
    const worstYears = yearRankings.slice(-4).reverse(); // 최악부터 순서

    // 결과 배열 생성
    const result: { date: string; type: string; reason: string; score: number; grade?: number }[] = [];

    // 좋은 해 4개 추가
    for (const yearData of bestYears) {
      const yearInfo = yearScores[yearData.year];
      const age = yearData.year - birthYear;

      // 해당 년도의 카테고리 분석
      const categories: Record<string, number> = {};
      for (const d of yearInfo.dates) {
        for (const cat of d.categories || []) {
          categories[cat] = (categories[cat] || 0) + 1;
        }
      }
      const topCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat]) => cat);

      const categoryText = isKo
        ? topCategories.map(c => {
            if (c === 'career') return '커리어';
            if (c === 'wealth') return '재물';
            if (c === 'love') return '연애';
            if (c === 'health') return '건강';
            if (c === 'study') return '학업';
            if (c === 'travel') return '이동';
            return '전반';
          }).join(', ')
        : topCategories.join(', ');

      result.push({
        date: isKo ? `${yearData.year}년` : `${yearData.year}`,
        type: isKo ? "✨ 좋은 해" : "✨ Good Year",
        reason: isKo
          ? `${age}세 - 운세 점수 ${Math.round(yearData.avgScore)}점. ${categoryText} 운이 특히 강한 해입니다. 중요한 결정과 새로운 시작에 유리한 시기입니다.`
          : `Age ${age} - Fortune score ${Math.round(yearData.avgScore)}. Strong ${categoryText} luck. Favorable for important decisions and new beginnings.`,
        score: yearData.avgScore,
        grade: yearData.bestGrade
      });
    }

    // 나쁜 해 4개 추가
    for (const yearData of worstYears) {
      const yearInfo = yearScores[yearData.year];
      const age = yearData.year - birthYear;

      result.push({
        date: isKo ? `${yearData.year}년` : `${yearData.year}`,
        type: isKo ? "⚠️ 조심할 해" : "⚠️ Cautious Year",
        reason: isKo
          ? `${age}세 - 운세 점수 ${Math.round(yearData.avgScore)}점. 신중함이 필요한 해입니다. 큰 결정은 피하고 현상 유지와 준비에 집중하세요.`
          : `Age ${age} - Fortune score ${Math.round(yearData.avgScore)}. Year requiring caution. Avoid major decisions, focus on maintaining status quo and preparation.`,
        score: yearData.avgScore,
        grade: yearData.bestGrade
      });
    }

    return result;
  } catch (error) {
    // 폴백: 기존 단순 계산
    return getSimpleRecommendedDates(saju, lang);
  }
}

export function getSimpleRecommendedDates(saju: any, lang: string): { date: string; type: string; reason: string; score: number }[] {
  const dates: { date: string; type: string; reason: string; score: number }[] = [];
  const isKo = lang === "ko";
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const dayElement = saju?.dayMaster?.element ? elementKeyMap[saju.dayMaster.element] : null;
  if (!dayElement) return dates;

  for (let m = 1; m <= 12; m++) {
    const monthEl = monthElements[m];
    let score = 50;
    let reason = "";

    if (elementRelations.supportedBy[dayElement] === monthEl) {
      score = 85;
      reason = isKo ? `${elementTraits[monthEl]?.ko}이 나를 생(生)해주는 달` : `${elementTraits[monthEl]?.en} generates your energy`;
    } else if (monthEl === dayElement) {
      score = 75;
      reason = isKo ? "같은 오행으로 힘이 강해지는 달" : "Same element strengthens you";
    }

    if (score >= 75) {
      const isUpcoming = m >= currentMonth;
      const year = isUpcoming ? currentYear : currentYear + 1;
      dates.push({
        date: isKo ? `${year}년 ${m}월` : `${year}/${m}`,
        type: score >= 80 ? (isKo ? "🌟 대길월" : "🌟 Excellent") : (isKo ? "⭐ 길월" : "⭐ Good"),
        reason,
        score
      });
    }
  }

  return dates.sort((a, b) => b.score - a.score).slice(0, 4);
}
