#!/usr/bin/env node
/**
 * Destiny-Map Chat API 테스트 스크립트
 * 30개 질문을 테스트하고 결과를 MD 파일로 저장
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8888';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_TOKEN = process.env.ADMIN_API_TOKEN || '0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69';

// 테스트용 사용자 데이터
const testUser = {
  name: "테스트",
  birthDate: "1990-05-15",
  birthTime: "14:30",
  latitude: 37.5665,
  longitude: 126.9780,
  gender: "male",
  lang: "ko"
};

// 30개 테스트 질문
const questions = [
  // 연애/결혼 (Love) - 6개
  { theme: "love", question: "내 인연은 언제쯤 만날 수 있어요?" },
  { theme: "love", question: "지금 만나는 사람이랑 결혼해도 될까요?" },
  { theme: "love", question: "왜 나는 연애가 잘 안 되는 걸까요?" },
  { theme: "love", question: "이상형이 어떤 스타일이에요?" },
  { theme: "love", question: "올해 안에 좋은 인연 생길까요?" },
  { theme: "love", question: "전 여친이랑 재회 가능성 있어요?" },

  // 직업/사업 (Career) - 6개
  { theme: "career", question: "나한테 천직이 뭐예요?" },
  { theme: "career", question: "지금 이직해도 괜찮을까요?" },
  { theme: "career", question: "사장 체질인가요 직원 체질인가요?" },
  { theme: "career", question: "창업하면 잘 될까요?" },
  { theme: "career", question: "상사랑 갈등이 있는데 어떻게 해야 해요?" },
  { theme: "career", question: "6월에 면접 보는데 결과 어떨까요?" },

  // 재물/투자 (Wealth) - 5개
  { theme: "wealth", question: "부자 될 팔자인가요?" },
  { theme: "wealth", question: "지금 주식 투자해도 될까요?" },
  { theme: "wealth", question: "돈 복이 있는 편인가요?" },
  { theme: "wealth", question: "부동산 계약하기 좋은 시기가 언제예요?" },
  { theme: "wealth", question: "횡재수가 있을까요?" },

  // 건강 (Health) - 3개
  { theme: "health", question: "타고난 체질이 뭐예요?" },
  { theme: "health", question: "조심해야 할 질병이 있어요?" },
  { theme: "health", question: "살 빠지는 시기가 있을까요?" },

  // 가족/관계 (Family) - 2개
  { theme: "family", question: "부모님과 화해하려면 어떻게 해야 할까요?" },
  { theme: "family", question: "자녀운이 어떤가요?" },

  // 오늘/이번달/올해 운세 - 4개
  { theme: "today", question: "오늘 중요한 일 있는데 어떻게 될까요?" },
  { theme: "month", question: "이번 달 주의할 점이 뭐예요?" },
  { theme: "year", question: "올해 대운이 어때요?" },
  { theme: "year", question: "내년에는 나아질까요?" },

  // 인생/종합 (Life) - 4개
  { theme: "life", question: "내 인생 최고의 해는 언제예요?" },
  { theme: "life", question: "숨겨진 재능이 뭐예요?" },
  { theme: "life", question: "10년 후 나는 어떻게 되어 있을까요?" },
  { theme: "chat", question: "나는 어떤 사람이에요? 성격 분석해줘" },
];

// 샘플 사주 데이터 (프론트엔드 computeDestinyMap 형식)
const sampleSajuData = {
  dayMaster: { stem: "庚", element: "금", yin: false },
  pillars: {
    year: { stem: "庚", branch: "午" },
    month: { stem: "辛", branch: "巳" },
    day: { stem: "庚", branch: "辰" },
    hour: { stem: "癸", branch: "未" }
  },
  fiveElements: { 목: 1, 화: 2, 토: 2, 금: 3, 수: 1 },
  dominantElement: "금",
  tenGods: {
    year: { stem: "비견", branch: "정관" },
    month: { stem: "겁재", branch: "정인" },
    day: { stem: "비견", branch: "편인" },
    hour: { stem: "상관", branch: "정관" }
  },
  daeun: [
    { age: 1, stem: "壬", branch: "午" },
    { age: 11, stem: "癸", branch: "未" },
    { age: 21, stem: "甲", branch: "申" },
    { age: 31, stem: "乙", branch: "酉" },
    { age: 41, stem: "丙", branch: "戌" }
  ],
  currentDaeun: { age: 31, stem: "乙", branch: "酉" },
  sinsal: { 역마: true, 도화: false, 화개: true },
  yongsin: "수",
  kiysin: "화"
};

// 샘플 점성학 데이터
const sampleAstroData = {
  sun: { sign: "Taurus", degree: 24.5 },
  moon: { sign: "Scorpio", degree: 15.2 },
  ascendant: { sign: "Virgo", degree: 8.7 },
  planets: {
    mercury: { sign: "Taurus", degree: 10.3 },
    venus: { sign: "Aries", degree: 28.1 },
    mars: { sign: "Pisces", degree: 5.6 },
    jupiter: { sign: "Cancer", degree: 12.4 },
    saturn: { sign: "Capricorn", degree: 22.8 }
  },
  houses: [
    { house: 1, sign: "Virgo" },
    { house: 10, sign: "Gemini" }
  ],
  aspects: [
    { planet1: "sun", planet2: "moon", aspect: "opposition", orb: 2.3 },
    { planet1: "venus", planet2: "mars", aspect: "sextile", orb: 1.5 }
  ]
};

// 캐시된 차트 데이터
let cachedSaju = sampleSajuData;
let cachedAstro = sampleAstroData;

async function testBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();
    return { success: res.ok, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function calculateChartData() {
  console.log('📊 사주/점성학 데이터 계산 중...');

  // 1. 사주 계산 - computeDestinyMap payload 형식
  const sajuPayload = {
    payload: {
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      gender: "male",
      isLunar: false,
      latitude: 37.5665,
      longitude: 126.9780
    }
  };

  try {
    const sajuRes = await fetch(`${BACKEND_URL}/calc_saju`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(sajuPayload)
    });

    if (sajuRes.ok) {
      const sajuData = await sajuRes.json();
      cachedSaju = sajuData.saju;
      console.log('   ✅ 사주 계산 완료');
    } else {
      console.log(`   ⚠️ 사주 계산 실패: HTTP ${sajuRes.status}`);
    }
  } catch (e) {
    console.log(`   ⚠️ 사주 계산 오류: ${e.message}`);
  }

  // 2. 점성학 계산
  const astroPayload = {
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30,
    latitude: 37.5665,
    longitude: 126.9780
  };

  try {
    const astroRes = await fetch(`${BACKEND_URL}/calc_astro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(astroPayload)
    });

    if (astroRes.ok) {
      const astroData = await astroRes.json();
      cachedAstro = astroData.astro;
      console.log('   ✅ 점성학 계산 완료');
    } else {
      console.log(`   ⚠️ 점성학 계산 실패: HTTP ${astroRes.status}`);
    }
  } catch (e) {
    console.log(`   ⚠️ 점성학 계산 오류: ${e.message}`);
  }

  return { saju: cachedSaju, astro: cachedAstro };
}

async function testBackendAskStream(question, theme) {
  const payload = {
    ...testUser,
    theme,
    prompt: question,
    history: [{ role: "user", content: question }],
    saju: cachedSaju,
    astro: cachedAstro,
    locale: "ko"
  };

  try {
    const res = await fetch(`${BACKEND_URL}/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}`, status: res.status };
    }

    // 스트리밍 응답 수집
    const text = await res.text();

    // SSE 파싱 - 백엔드는 "data: <plain text>\n" 형식으로 스트리밍
    const lines = text.split('\n');
    let content = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6); // "data: " 이후
        // [DONE] 또는 [ERROR] 스킵
        if (payload === '[DONE]' || payload.startsWith('[ERROR]')) {
          continue;
        }
        // JSON 형태인지 확인 (일부 엔드포인트는 JSON 사용)
        if (payload.startsWith('{') && payload.endsWith('}')) {
          try {
            const data = JSON.parse(payload);
            if (data.content) content += data.content;
            else if (data.chunk) content += data.chunk;
            else if (data.text) content += data.text;
          } catch {
            // JSON 파싱 실패시 plain text로 처리
            content += payload;
          }
        } else if (!payload.startsWith('[ERROR]')) {
          // plain text 형식 - 직접 추가 (ERROR 메시지 제외)
          content += payload;
        }
      }
    }

    // 중복 공백/줄바꿈 정리
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return {
      success: true,
      response: content || text.slice(0, 1000),
      length: content.length || text.length
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testFrontendChatStream(question, theme) {
  const payload = {
    ...testUser,
    theme,
    messages: [{ role: "user", content: question }]
  };

  try {
    const res = await fetch(`${FRONTEND_URL}/api/destiny-map/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}`, status: res.status };
    }

    // 스트리밍 응답 수집
    const text = await res.text();

    // SSE 파싱 - 백엔드는 "data: <plain text>\n" 형식으로 스트리밍
    const lines = text.split('\n');
    let content = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6);
        if (payload === '[DONE]' || payload.startsWith('[ERROR]')) {
          continue;
        }
        if (payload.startsWith('{') && payload.endsWith('}')) {
          try {
            const data = JSON.parse(payload);
            if (data.content) content += data.content;
            else if (data.chunk) content += data.chunk;
            else if (data.text) content += data.text;
          } catch {
            content += payload;
          }
        } else {
          content += payload;
        }
      }
    }

    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return {
      success: true,
      response: content || text.slice(0, 1000),
      length: content.length || text.length
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function runTests() {
  console.log('🚀 Destiny-Map Chat API 테스트 시작\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}\n`);

  const results = [];
  const startTime = Date.now();

  // 1. 백엔드 헬스 체크
  console.log('1️⃣ 백엔드 헬스 체크...');
  const healthResult = await testBackendHealth();
  console.log(`   ${healthResult.success ? '✅' : '❌'} Backend health: ${JSON.stringify(healthResult)}\n`);

  if (!healthResult.success) {
    console.log('❌ 백엔드 서버가 실행되지 않았습니다. 먼저 서버를 시작해주세요.');
    process.exit(1);
  }

  // 1.5 사주/점성학 데이터 (샘플 데이터 사용)
  console.log('\n1.5️⃣ 샘플 차트 데이터 사용...');
  console.log(`   사주 데이터: ${cachedSaju ? '✅' : '❌'} (dayMaster: ${cachedSaju?.dayMaster?.stem})`);
  console.log(`   점성학 데이터: ${cachedAstro ? '✅' : '❌'} (Sun: ${cachedAstro?.sun?.sign})\n`);

  // 2. 30개 질문 테스트
  console.log('2️⃣ 30개 질문 테스트 시작...\n');

  const testCount = process.env.TEST_COUNT ? parseInt(process.env.TEST_COUNT) : questions.length;
  for (let i = 0; i < Math.min(testCount, questions.length); i++) {
    const { theme, question } = questions[i];
    console.log(`[${i + 1}/30] 테마: ${theme} | 질문: ${question}`);

    // 백엔드 API 테스트 (샘플 사주/점성학 데이터 사용)
    const result = await testBackendAskStream(question, theme);

    results.push({
      index: i + 1,
      theme,
      question,
      backendSuccess: result.success,
      backendResponse: result.response || result.error,  // 전체 응답 저장
      backendLength: result.length || 0,
      backendError: result.error
    });

    const status = result.success ? '✅' : '❌';
    const preview = result.response?.slice(0, 80) || result.error;
    console.log(`   ${status} 응답: ${preview}...\n`);

    // API 부하 방지를 위한 딜레이
    await new Promise(r => setTimeout(r, 2000));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successCount = results.filter(r => r.backendSuccess).length;

  // 3. 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`총 테스트: ${results.length}개`);
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${results.length - successCount}개`);
  console.log(`소요 시간: ${duration}초`);
  console.log('='.repeat(60));

  return results;
}

async function generateMarkdown(results) {
  const now = new Date().toISOString().split('T')[0];
  const successCount = results.filter(r => r.backendSuccess).length;

  let md = `# Destiny-Map 상담사 테스트 결과

**테스트 일시**: ${now}
**총 질문 수**: ${results.length}개
**성공**: ${successCount}개 (${((successCount / results.length) * 100).toFixed(1)}%)
**실패**: ${results.length - successCount}개

---

## 테스트 환경

- **Backend URL**: ${BACKEND_URL}
- **테스트 사용자**: ${testUser.name} (${testUser.birthDate} ${testUser.birthTime})
- **위치**: 서울 (${testUser.latitude}, ${testUser.longitude})

---

## 테마별 결과 요약

| 테마 | 질문 수 | 성공 | 실패 |
|------|---------|------|------|
`;

  // 테마별 통계
  const themeStats = {};
  for (const r of results) {
    if (!themeStats[r.theme]) {
      themeStats[r.theme] = { total: 0, success: 0, fail: 0 };
    }
    themeStats[r.theme].total++;
    if (r.backendSuccess) themeStats[r.theme].success++;
    else themeStats[r.theme].fail++;
  }

  for (const [theme, stats] of Object.entries(themeStats)) {
    md += `| ${theme} | ${stats.total} | ${stats.success} | ${stats.fail} |\n`;
  }

  md += `\n---\n\n## 상세 Q&A 결과\n\n`;

  // 각 질문별 상세 결과
  for (const r of results) {
    const status = r.backendSuccess ? '✅' : '❌';
    md += `### ${r.index}. [${r.theme}] ${r.question}\n\n`;
    md += `**상태**: ${status} ${r.backendSuccess ? '성공' : '실패'}  \n`;

    if (r.backendSuccess) {
      md += `**응답 길이**: ${r.backendLength}자\n\n`;
      md += `**응답 내용**:\n\n`;
      // 응답을 blockquote로 감싸기 (줄바꿈 처리)
      const responseText = r.backendResponse || '(응답 없음)';
      const formattedResponse = responseText.split('\n').map(line => `> ${line}`).join('\n');
      md += `${formattedResponse}\n\n`;
    } else {
      md += `**오류**: ${r.backendError}\n\n`;
    }
    md += `---\n\n`;
  }

  md += `\n## 개선 필요 항목\n\n`;

  const failures = results.filter(r => !r.backendSuccess);
  if (failures.length === 0) {
    md += `모든 테스트가 성공했습니다! 🎉\n`;
  } else {
    md += `| # | 테마 | 질문 | 오류 |\n`;
    md += `|---|------|------|------|\n`;
    for (const f of failures) {
      md += `| ${f.index} | ${f.theme} | ${f.question} | ${f.backendError} |\n`;
    }
  }

  return md;
}

// 메인 실행
const results = await runTests();
const markdown = await generateMarkdown(results);

// MD 파일 저장
import fs from 'fs';
import path from 'path';

const outputPath = path.join(process.cwd(), 'DESTINY_MAP_TEST_RESULTS.md');
fs.writeFileSync(outputPath, markdown, 'utf-8');
console.log(`\n📄 결과가 저장되었습니다: ${outputPath}`);
