/**
 * 상담사 품질 테스트 스크립트
 * - 실제 데이터로 상담 API 호출
 * - 응답 품질 분석
 * - 개선점 도출
 */

import { computeDestinyMapRefactored } from '../src/lib/destiny-map/astrology/engine-core';
import { buildAllDataPrompt } from '../src/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt';

// 테스트 케이스들
const TEST_CASES = [
  {
    name: '1995년생 남성 - 커리어 상담',
    input: {
      name: '테스트',
      birthDate: '1995-02-09',
      birthTime: '06:40',
      latitude: 37.5665,
      longitude: 126.9780,
      gender: 'male' as const,
      tz: 'Asia/Seoul',
      userTimezone: 'Asia/Seoul',
    },
    theme: 'career',
    question: '이직을 고민하고 있는데, 올해 안에 이직하는 게 좋을까요?',
  },
  {
    name: '1990년생 여성 - 연애 상담',
    input: {
      name: '테스트',
      birthDate: '1990-08-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.9780,
      gender: 'female' as const,
      tz: 'Asia/Seoul',
      userTimezone: 'Asia/Seoul',
    },
    theme: 'love',
    question: '올해 좋은 인연을 만날 수 있을까요? 언제쯤이 좋을까요?',
  },
  {
    name: '1988년생 남성 - 오늘 운세',
    input: {
      name: '테스트',
      birthDate: '1988-03-22',
      birthTime: '09:15',
      latitude: 37.5665,
      longitude: 126.9780,
      gender: 'male' as const,
      tz: 'Asia/Seoul',
      userTimezone: 'Asia/Seoul',
    },
    theme: 'today',
    question: '오늘 중요한 미팅이 있는데, 조심해야 할 점이 있을까요?',
  },
];

interface AnalysisResult {
  testCase: string;
  dataCompleteness: {
    saju: Record<string, boolean>;
    astrology: Record<string, boolean>;
    advanced: Record<string, boolean>;
  };
  promptAnalysis: {
    totalLength: number;
    sections: string[];
    missingSections: string[];
  };
  issues: string[];
  suggestions: string[];
}

async function analyzeTestCase(testCase: typeof TEST_CASES[0]): Promise<AnalysisResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 테스트: ${testCase.name}`);
  console.log(`   테마: ${testCase.theme}`);
  console.log(`   질문: ${testCase.question}`);
  console.log('='.repeat(80));

  const result: AnalysisResult = {
    testCase: testCase.name,
    dataCompleteness: {
      saju: {},
      astrology: {},
      advanced: {},
    },
    promptAnalysis: {
      totalLength: 0,
      sections: [],
      missingSections: [],
    },
    issues: [],
    suggestions: [],
  };

  try {
    // 1. 데이터 계산
    console.log('\n⏳ 데이터 계산 중...');
    const data = await computeDestinyMapRefactored(testCase.input);

    // 2. 사주 데이터 완전성 체크
    console.log('\n📊 사주 데이터 체크:');
    const sajuChecks = {
      pillars: !!data.saju?.pillars,
      yearPillar: !!data.saju?.pillars?.year,
      monthPillar: !!data.saju?.pillars?.month,
      dayPillar: !!data.saju?.pillars?.day,
      timePillar: !!data.saju?.pillars?.time,
      dayMaster: !!data.saju?.dayMaster,
      dayMasterName: !!data.saju?.dayMaster?.name,
      dayMasterElement: !!data.saju?.dayMaster?.element,
      daeun: Array.isArray(data.saju?.unse?.daeun) && data.saju?.unse?.daeun.length > 0,
      annual: Array.isArray(data.saju?.unse?.annual) && data.saju?.unse?.annual.length > 0,
      monthly: Array.isArray(data.saju?.unse?.monthly) && data.saju?.unse?.monthly.length > 0,
      sinsal: !!data.saju?.sinsal,
      advancedAnalysis: !!data.saju?.advancedAnalysis,
      geokguk: !!data.saju?.advancedAnalysis?.geokguk,
      yongsin: !!data.saju?.advancedAnalysis?.yongsin,
      tonggeun: !!data.saju?.advancedAnalysis?.tonggeun,
      hyeongchung: !!data.saju?.advancedAnalysis?.hyeongchung,
      sibsin: !!data.saju?.advancedAnalysis?.sibsin,
      healthCareer: !!data.saju?.advancedAnalysis?.healthCareer,
      ultraAdvanced: !!data.saju?.advancedAnalysis?.ultraAdvanced,
    };
    result.dataCompleteness.saju = sajuChecks;

    for (const [key, value] of Object.entries(sajuChecks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
      if (!value) {
        result.issues.push(`사주 데이터 누락: ${key}`);
      }
    }

    // 3. 점성학 데이터 완전성 체크
    console.log('\n📊 점성학 데이터 체크:');
    const astroChecks = {
      planets: Array.isArray(data.astrology?.planets) && data.astrology?.planets.length > 0,
      houses: Array.isArray(data.astrology?.houses) && data.astrology?.houses.length > 0,
      ascendant: !!data.astrology?.ascendant,
      mc: !!data.astrology?.mc,
      aspects: Array.isArray(data.astrology?.aspects) && data.astrology?.aspects.length > 0,
      facts: !!data.astrology?.facts,
    };
    result.dataCompleteness.astrology = astroChecks;

    for (const [key, value] of Object.entries(astroChecks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
      if (!value) {
        result.issues.push(`점성학 데이터 누락: ${key}`);
      }
    }

    // 4. 고급 점성학 데이터 완전성 체크
    console.log('\n📊 고급 점성학 데이터 체크:');
    const advancedChecks = {
      extraPoints: !!data.extraPoints,
      chiron: !!data.extraPoints?.chiron,
      lilith: !!data.extraPoints?.lilith,
      partOfFortune: !!data.extraPoints?.partOfFortune,
      solarReturn: !!data.solarReturn,
      lunarReturn: !!data.lunarReturn,
      progressions: !!data.progressions,
      secondaryProgression: !!data.progressions?.secondary,
      solarArc: !!data.progressions?.solarArc,
      draconic: !!data.draconic,
      harmonics: !!data.harmonics,
      asteroids: !!data.asteroids,
      fixedStars: Array.isArray(data.fixedStars) && data.fixedStars.length > 0,
      eclipses: !!data.eclipses,
      electional: !!data.electional,
      midpoints: !!data.midpoints,
    };
    result.dataCompleteness.advanced = advancedChecks;

    for (const [key, value] of Object.entries(advancedChecks)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
      if (!value) {
        result.issues.push(`고급 점성학 데이터 누락: ${key}`);
      }
    }

    // 5. 프롬프트 빌드 및 분석
    console.log('\n📝 프롬프트 분석:');
    const prompt = buildAllDataPrompt('ko', testCase.theme, data);
    result.promptAnalysis.totalLength = prompt.length;
    console.log(`   총 길이: ${prompt.length} 자`);

    // 섹션 체크
    const expectedSections = [
      { name: '사주 팔자', pattern: /사주|팔자|四柱/ },
      { name: '일주/일간', pattern: /일주|일간|日主|dayMaster/ },
      { name: '대운', pattern: /대운|大運/ },
      { name: '세운/연운', pattern: /세운|연운|歲運/ },
      { name: '월운', pattern: /월운|月運/ },
      { name: '격국', pattern: /격국|格局/ },
      { name: '용신', pattern: /용신|用神/ },
      { name: '신살', pattern: /신살|神煞/ },
      { name: '형충회합', pattern: /형충|합충|刑沖/ },
      { name: '태양 별자리', pattern: /Sun|태양/ },
      { name: '달 별자리', pattern: /Moon|달/ },
      { name: '상승점', pattern: /ASC|상승|Ascendant/ },
      { name: '하우스', pattern: /하우스|House|H\d/ },
      { name: '트랜짓', pattern: /트랜짓|transit/ },
      { name: '프로그레션', pattern: /프로그레션|progression/ },
      { name: '소행성', pattern: /소행성|asteroid|키론|릴리스/ },
      { name: '항성', pattern: /항성|fixed star/ },
      { name: '일식/월식', pattern: /일식|월식|eclipse/ },
    ];

    for (const section of expectedSections) {
      if (section.pattern.test(prompt)) {
        result.promptAnalysis.sections.push(section.name);
        console.log(`   ✅ ${section.name}`);
      } else {
        result.promptAnalysis.missingSections.push(section.name);
        console.log(`   ❌ ${section.name} - 프롬프트에 미포함`);
        result.suggestions.push(`프롬프트에 ${section.name} 정보 추가 필요`);
      }
    }

    // 6. 프롬프트 품질 체크
    console.log('\n🔍 프롬프트 품질 체크:');

    // 너무 짧은 프롬프트
    if (prompt.length < 1000) {
      result.issues.push('프롬프트가 너무 짧음 (1000자 미만)');
      console.log('   ⚠️ 프롬프트가 너무 짧음');
    } else {
      console.log('   ✅ 프롬프트 길이 적절');
    }

    // 너무 긴 프롬프트 (토큰 제한)
    if (prompt.length > 15000) {
      result.issues.push('프롬프트가 너무 김 (15000자 초과) - 토큰 제한 주의');
      console.log('   ⚠️ 프롬프트가 너무 김 - 요약 필요');
    }

    // 일주 정보 명확성
    if (data.saju?.dayMaster?.name) {
      const dayMasterInPrompt = prompt.includes(data.saju.dayMaster.name);
      if (!dayMasterInPrompt) {
        result.issues.push('일주(日主) 천간이 프롬프트에 명시적으로 포함되지 않음');
      }
    }

    // 현재 대운 정보
    const currentYear = new Date().getFullYear();
    if (!prompt.includes('현재') && !prompt.includes('★')) {
      result.suggestions.push('현재 대운/세운을 명확히 표시하면 좋음');
    }

    // 테마별 관련 정보 체크
    if (testCase.theme === 'career') {
      if (!prompt.includes('직업') && !prompt.includes('career') && !prompt.includes('관성') && !prompt.includes('식신')) {
        result.suggestions.push('커리어 테마: 관성/식신/재성 관련 정보 강조 필요');
      }
    } else if (testCase.theme === 'love') {
      if (!prompt.includes('연애') && !prompt.includes('배우자') && !prompt.includes('금성') && !prompt.includes('Venus')) {
        result.suggestions.push('연애 테마: 금성/7하우스/정재/정관 정보 강조 필요');
      }
    }

    // 7. 특정 데이터 상세 출력
    console.log('\n📋 주요 데이터 샘플:');
    console.log(`   일주: ${data.saju?.dayMaster?.name || '없음'} (${data.saju?.dayMaster?.element || '없음'})`);
    console.log(`   격국: ${data.saju?.advancedAnalysis?.geokguk?.primary || '없음'}`);
    console.log(`   용신: ${data.saju?.advancedAnalysis?.yongsin?.primaryYongsin || '없음'}`);
    console.log(`   태양: ${data.astrology?.planets?.[0]?.sign || '없음'}`);
    console.log(`   달: ${data.astrology?.planets?.[1]?.sign || '없음'}`);
    console.log(`   ASC: ${(data.astrology?.ascendant as any)?.sign || '없음'}`);

    // 대운 샘플
    const daeunSample = data.saju?.unse?.daeun?.slice(0, 3) || [];
    console.log(`   대운 (처음 3개): ${daeunSample.map((d: any) => `${d.heavenlyStem || d.stem || '?'}${d.earthlyBranch || d.branch || '?'}`).join(', ') || '없음'}`);

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    result.issues.push(`테스트 실행 오류: ${error}`);
  }

  return result;
}

async function main() {
  console.log('🔮 상담사 품질 테스트 시작\n');
  console.log('='.repeat(80));

  const results: AnalysisResult[] = [];

  for (const testCase of TEST_CASES) {
    const result = await analyzeTestCase(testCase);
    results.push(result);
  }

  // 종합 분석
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('📊 종합 분석 결과');
  console.log('█'.repeat(80));

  // 모든 이슈 집계
  const allIssues = new Set<string>();
  const allSuggestions = new Set<string>();

  for (const result of results) {
    result.issues.forEach(i => allIssues.add(i));
    result.suggestions.forEach(s => allSuggestions.add(s));
  }

  console.log('\n🚨 발견된 이슈:');
  if (allIssues.size === 0) {
    console.log('   ✅ 이슈 없음!');
  } else {
    Array.from(allIssues).forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('\n💡 개선 제안:');
  if (allSuggestions.size === 0) {
    console.log('   ✅ 추가 제안 없음!');
  } else {
    Array.from(allSuggestions).forEach((suggestion, i) => {
      console.log(`   ${i + 1}. ${suggestion}`);
    });
  }

  // 데이터 완전성 요약
  console.log('\n📈 데이터 완전성 요약:');

  const sajuFields = Object.keys(results[0]?.dataCompleteness.saju || {});
  const astroFields = Object.keys(results[0]?.dataCompleteness.astrology || {});
  const advancedFields = Object.keys(results[0]?.dataCompleteness.advanced || {});

  let sajuComplete = 0, sajuTotal = sajuFields.length * results.length;
  let astroComplete = 0, astroTotal = astroFields.length * results.length;
  let advancedComplete = 0, advancedTotal = advancedFields.length * results.length;

  for (const result of results) {
    sajuComplete += Object.values(result.dataCompleteness.saju).filter(Boolean).length;
    astroComplete += Object.values(result.dataCompleteness.astrology).filter(Boolean).length;
    advancedComplete += Object.values(result.dataCompleteness.advanced).filter(Boolean).length;
  }

  console.log(`   사주 데이터: ${sajuComplete}/${sajuTotal} (${((sajuComplete/sajuTotal)*100).toFixed(1)}%)`);
  console.log(`   점성학 데이터: ${astroComplete}/${astroTotal} (${((astroComplete/astroTotal)*100).toFixed(1)}%)`);
  console.log(`   고급 점성학: ${advancedComplete}/${advancedTotal} (${((advancedComplete/advancedTotal)*100).toFixed(1)}%)`);

  // TODO 리스트 생성
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('📝 개선 TODO 리스트');
  console.log('█'.repeat(80));

  const todos: Array<{ priority: 'HIGH' | 'MEDIUM' | 'LOW'; task: string; reason: string }> = [];

  // 이슈 기반 TODO
  for (const issue of allIssues) {
    if (issue.includes('누락')) {
      todos.push({
        priority: 'HIGH',
        task: issue.replace('누락', '추가'),
        reason: '상담 품질에 직접적 영향',
      });
    }
  }

  // 제안 기반 TODO
  for (const suggestion of allSuggestions) {
    todos.push({
      priority: 'MEDIUM',
      task: suggestion,
      reason: '상담 품질 향상',
    });
  }

  // 추가 분석 기반 TODO
  if (advancedComplete / advancedTotal < 0.8) {
    todos.push({
      priority: 'HIGH',
      task: '고급 점성학 API 호출 실패 원인 조사 및 수정',
      reason: `완전성 ${((advancedComplete/advancedTotal)*100).toFixed(1)}%로 낮음`,
    });
  }

  // TODO 출력
  const highPriority = todos.filter(t => t.priority === 'HIGH');
  const mediumPriority = todos.filter(t => t.priority === 'MEDIUM');
  const lowPriority = todos.filter(t => t.priority === 'LOW');

  if (highPriority.length > 0) {
    console.log('\n🔴 HIGH Priority:');
    highPriority.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.task}`);
      console.log(`      └─ 이유: ${t.reason}`);
    });
  }

  if (mediumPriority.length > 0) {
    console.log('\n🟡 MEDIUM Priority:');
    mediumPriority.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.task}`);
      console.log(`      └─ 이유: ${t.reason}`);
    });
  }

  if (lowPriority.length > 0) {
    console.log('\n🟢 LOW Priority:');
    lowPriority.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.task}`);
      console.log(`      └─ 이유: ${t.reason}`);
    });
  }

  if (todos.length === 0) {
    console.log('\n✅ 모든 테스트 통과! 추가 개선 사항 없음.');
  }

  console.log('\n\n테스트 완료!');
}

main().catch(console.error);
