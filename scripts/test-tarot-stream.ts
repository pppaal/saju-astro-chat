/**
 * 타로 스트리밍 API 테스트 (개인화 기능 포함)
 */

const PUBLIC_TOKEN = process.env.PUBLIC_API_TOKEN || "066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e";
const BASE_URL = "http://localhost:3000";
const STREAM_TIMEOUT_MS = Number(process.env.STREAM_TIMEOUT_MS) || 120000;
const STREAM_STALL_MS = Number(process.env.STREAM_STALL_MS) || 45000;
const STREAM_PROGRESS_MS = Number(process.env.STREAM_PROGRESS_MS) || 5000;

interface TestCase {
  name: string;
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  userQuestion: string;
  birthdate?: string;
  previousReadings?: string[];
  cards: {
    name: string;
    nameKo: string;
    isReversed: boolean;
    position: string;
    positionKo: string;
    keywords?: string[];
    keywordsKo?: string[];
  }[];
}

const testCases: TestCase[] = [
  {
    name: "원카드 + 별자리 개인화 (걱정 톤)",
    categoryId: "daily",
    spreadId: "one-card",
    spreadTitle: "오늘의 한 장",
    userQuestion: "요즘 너무 불안하고 걱정돼요... 앞으로 어떻게 될까요?",
    birthdate: "1995-02-15", // 물병자리
    cards: [
      {
        name: "The Star",
        nameKo: "별",
        isReversed: false,
        position: "Today",
        positionKo: "오늘",
        keywords: ["hope", "inspiration", "serenity"],
        keywordsKo: ["희망", "영감", "평온"],
      },
    ],
  },
  {
    name: "쓰리카드 + 이전 상담 맥락 (희망 톤)",
    categoryId: "love",
    spreadId: "three-card",
    spreadTitle: "과거-현재-미래",
    userQuestion: "새로운 사랑을 만날 수 있을까요? 행복해지고 싶어요!",
    birthdate: "1990-07-25", // 사자자리
    previousReadings: [
      "지난번 연애운에서 컵 에이스가 나왔었고 새로운 시작을 암시했습니다",
      "직장에서의 스트레스가 연애에 영향을 주고 있다는 해석이 있었습니다",
    ],
    cards: [
      {
        name: "Six of Cups",
        nameKo: "컵 6",
        isReversed: false,
        position: "Past",
        positionKo: "과거",
        keywordsKo: ["추억", "순수함", "재회"],
      },
      {
        name: "The Lovers",
        nameKo: "연인",
        isReversed: false,
        position: "Present",
        positionKo: "현재",
        keywordsKo: ["선택", "사랑", "조화"],
      },
      {
        name: "Ten of Cups",
        nameKo: "컵 10",
        isReversed: false,
        position: "Future",
        positionKo: "미래",
        keywordsKo: ["행복", "가정", "완성"],
      },
    ],
  },
  {
    name: "역방향 카드 + 긴급 톤",
    categoryId: "career",
    spreadId: "three-card",
    spreadTitle: "상황-장애물-조언",
    userQuestion: "급해요! 내일 면접인데 어떻게 될까요? 지금 당장 알려주세요!",
    birthdate: "1988-11-05", // 전갈자리
    cards: [
      {
        name: "The Magician",
        nameKo: "마법사",
        isReversed: false,
        position: "Situation",
        positionKo: "상황",
        keywordsKo: ["능력", "의지", "창조"],
      },
      {
        name: "The Tower",
        nameKo: "탑",
        isReversed: true,
        position: "Obstacle",
        positionKo: "장애물",
        keywordsKo: ["변화 저항", "두려움", "회피"],
      },
      {
        name: "Ace of Wands",
        nameKo: "완드 에이스",
        isReversed: false,
        position: "Advice",
        positionKo: "조언",
        keywordsKo: ["새 시작", "열정", "영감"],
      },
    ],
  },
];

async function testStreamAPI(testCase: TestCase): Promise<{ success: boolean; name: string; responseLength?: number }> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`테스트: ${testCase.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`질문: ${testCase.userQuestion}`);
  console.log(`생년월일: ${testCase.birthdate || '없음'}`);
  console.log(`이전 상담: ${testCase.previousReadings?.length || 0}개`);
  console.log(`카드: ${testCase.cards.map(c => `${c.nameKo}${c.isReversed ? '(역)' : ''}`).join(', ')}`);

  const startTime = Date.now();
  let lastChunkAt = startTime;
  let chunkCount = 0;
  let aborted = false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    aborted = true;
    console.log(`\n⏱️ 요청 타임아웃 (${Math.round(STREAM_TIMEOUT_MS / 1000)}s)`);
    controller.abort();
  }, STREAM_TIMEOUT_MS);
  const progressId = setInterval(() => {
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const sinceChunkSec = Math.round((Date.now() - lastChunkAt) / 1000);
    console.log(`[progress] ${elapsedSec}s 경과, 마지막 청크 ${sinceChunkSec}s 전, 청크 ${chunkCount}개`);
    if (!aborted && Date.now() - lastChunkAt > STREAM_STALL_MS) {
      aborted = true;
      console.log(`\n⚠️ 스트림 정지 감지 (${Math.round(STREAM_STALL_MS / 1000)}s)`);
      controller.abort();
    }
  }, STREAM_PROGRESS_MS);

  try {
    const response = await fetch(`${BASE_URL}/api/tarot/interpret-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": PUBLIC_TOKEN,
      },
      signal: controller.signal,
      body: JSON.stringify({
        categoryId: testCase.categoryId,
        spreadId: testCase.spreadId,
        spreadTitle: testCase.spreadTitle,
        cards: testCase.cards,
        userQuestion: testCase.userQuestion,
        language: "ko",
        birthdate: testCase.birthdate,
        previousReadings: testCase.previousReadings,
      }),
    });
    console.log(`응답 헤더 수신: ${Date.now() - startTime}ms`);
    lastChunkAt = Date.now();

    if (!response.ok) {
      console.log(`\n❌ 에러: HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   상세: ${errorText.substring(0, 300)}`);
      return { success: false, name: testCase.name };
    }

    console.log(`\n✅ 스트리밍 시작!`);
    console.log(`\n📜 응답 내용 (처음 1000자):`);
    console.log(`${"─".repeat(50)}`);

    const reader = response.body?.getReader();
    if (!reader) {
      console.log("❌ 스트림 리더 없음");
      return { success: false, name: testCase.name };
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              chunkCount++;
              lastChunkAt = Date.now();
              // 실시간으로 일부 출력
              if (fullContent.length <= 1000) {
                process.stdout.write(parsed.content);
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log(`\n📊 통계:`);
    console.log(`   • 총 청크 수: ${chunkCount}`);
    console.log(`   • 총 응답 길이: ${fullContent.length}자`);

    // JSON 파싱 시도
    try {
      // JSON 부분만 추출 (```json ... ``` 또는 { ... })
      let jsonStr = fullContent;
      const jsonMatch = fullContent.match(/```json\s*([\s\S]*?)```/) || fullContent.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);
      console.log(`\n✅ JSON 파싱 성공!`);

      if (parsed.overall) {
        console.log(`\n🌟 전체 메시지 (처음 200자):`);
        console.log(`   ${parsed.overall.substring(0, 200)}...`);
      }

      if (parsed.cards?.length > 0) {
        console.log(`\n🃏 카드 해석: ${parsed.cards.length}장`);
        parsed.cards.forEach((card: { position: string; interpretation: string }) => {
          console.log(`   • [${card.position}] ${card.interpretation?.substring(0, 80)}...`);
        });
      }

      if (parsed.advice) {
        console.log(`\n💡 조언: ${parsed.advice.substring(0, 100)}...`);
      }
    } catch {
      console.log(`\n⚠️ JSON 파싱 실패 (원시 텍스트 응답)`);
      console.log(`   응답 시작: ${fullContent.substring(0, 200)}...`);
    }

    return { success: true, name: testCase.name, responseLength: fullContent.length };

  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`\n❌ 중단됨: ${error.message}`);
    } else {
      console.log(`\n❌ 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { success: false, name: testCase.name };
  } finally {
    clearTimeout(timeoutId);
    clearInterval(progressId);
  }
}

async function main() {
  console.log("🃏 타로 스트리밍 API 테스트 (개인화 기능 포함)");
  console.log(`   서버: ${BASE_URL}`);
  console.log(`   테스트 케이스: ${testCases.length}개`);

  const results: { success: boolean; name: string; responseLength?: number }[] = [];

  for (const testCase of testCases) {
    const result = await testStreamAPI(testCase);
    results.push(result);
    // 다음 테스트 전 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 테스트 결과 요약");
  console.log(`${"=".repeat(70)}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ 성공: ${successful}/${results.length}`);
  console.log(`❌ 실패: ${failed}/${results.length}`);

  if (successful > 0) {
    const avgLength = results
      .filter(r => r.success && r.responseLength)
      .reduce((sum, r) => sum + (r.responseLength || 0), 0) / successful;
    console.log(`📝 평균 응답 길이: ${Math.round(avgLength)}자`);
  }

  if (failed > 0) {
    console.log(`\n실패한 테스트:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.name}`);
    });
  }
}

main().catch(console.error);
