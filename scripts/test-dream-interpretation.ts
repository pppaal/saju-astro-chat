/**
 * 꿈 해몽 API 테스트 스크립트
 * 다양한 꿈 시나리오를 테스트합니다.
 */

const testDreams = [
  {
    name: "용꿈 (전통 길몽)",
    dreamText: "어젯밤에 황금빛 용이 하늘을 나는 꿈을 꿨어요. 용이 저에게 다가와서 여의주를 건네주더니 하늘로 올라갔습니다.",
    symbols: ["용", "황금", "여의주", "하늘"],
    emotions: ["경이로움", "행복"],
    koreanTypes: ["용꿈"],
    koreanLucky: ["여의주"],
  },
  {
    name: "돼지꿈 (재물운)",
    dreamText: "꿈에서 커다란 돼지가 집으로 들어오더니 돈다발을 물고 왔어요. 돼지가 저에게 돈을 주고 사라졌습니다.",
    symbols: ["돼지", "돈", "집"],
    emotions: ["놀라움", "기쁨"],
    koreanTypes: ["돼지꿈", "재물꿈"],
    koreanLucky: ["돈"],
  },
  {
    name: "떨어지는 꿈 (불안)",
    dreamText: "높은 건물에서 떨어지는 꿈을 꿨어요. 계속 떨어지다가 땅에 닿기 직전에 깼습니다. 심장이 쿵쾅거렸어요.",
    symbols: ["건물", "추락", "땅"],
    emotions: ["공포", "불안"],
    western: ["falling"],
  },
  {
    name: "이빨 빠지는 꿈",
    dreamText: "거울을 보는데 이빨이 하나씩 빠지기 시작했어요. 계속 빠져서 결국 이빨이 다 없어졌습니다.",
    symbols: ["이빨", "거울"],
    emotions: ["당황", "공포"],
    western: ["teeth_falling"],
  },
  {
    name: "물속 꿈 (잠재의식)",
    dreamText: "깊은 바다 속을 헤엄치는 꿈을 꿨어요. 물고기들이 주변을 맴돌고, 아름다운 산호초가 보였습니다. 숨을 쉴 수 있어서 편안했어요.",
    symbols: ["바다", "물고기", "산호초"],
    emotions: ["평화", "자유"],
    chinese: ["water"],
  },
];

const BASE_URL = process.env.AI_BACKEND_URL || "http://127.0.0.1:5000";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || "0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69";

async function testDreamAPI(dream: typeof testDreams[0]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`테스트: ${dream.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`꿈 내용: ${dream.dreamText.substring(0, 50)}...`);

  try {
    const response = await fetch(`${BASE_URL}/api/dream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        dream: dream.dreamText,
        symbols: dream.symbols,
        emotions: dream.emotions,
        locale: "ko",
        koreanTypes: dream.koreanTypes || [],
        koreanLucky: dream.koreanLucky || [],
        western: dream.western || [],
        chinese: dream.chinese || [],
      }),
    });

    if (!response.ok) {
      console.log(`❌ 에러: HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   상세: ${errorText}`);
      return { success: false, name: dream.name };
    }

    const result = await response.json();

    // 백엔드 응답 구조: { status: 'success', data: { ... } }
    const data = result.data || result;

    console.log(`\n✅ 성공!`);

    // 디버그: 전체 응답 구조 출력
    console.log(`\n📦 응답 구조:`);
    console.log(`   keys: ${Object.keys(result).join(', ')}`);
    if (result.data) {
      console.log(`   data keys: ${Object.keys(result.data).join(', ')}`);
    }

    console.log(`\n📝 요약:`);
    console.log(`   ${(data.summary || '요약 없음').substring(0, 300)}...`);

    if (data.dreamSymbols?.length > 0) {
      console.log(`\n🔮 꿈 상징:`);
      data.dreamSymbols.slice(0, 5).forEach((s: { label: string; meaning: string }) => {
        console.log(`   • ${s.label}: ${s.meaning}`);
      });
    }

    if (data.themes?.length > 0) {
      console.log(`\n🎯 주제:`);
      data.themes.slice(0, 5).forEach((t: { label: string; weight: number }) => {
        console.log(`   • ${t.label} (${(t.weight * 100).toFixed(0)}%)`);
      });
    }

    if (data.luckyElements) {
      console.log(`\n🍀 행운 요소:`);
      if (data.luckyElements.isLucky !== undefined) {
        console.log(`   • 길몽 여부: ${data.luckyElements.isLucky ? "예 ✨" : "아니오"}`);
      }
      if (data.luckyElements.luckyNumbers?.length > 0) {
        console.log(`   • 행운의 숫자: ${data.luckyElements.luckyNumbers.join(", ")}`);
      }
    }

    if (data.recommendations?.length > 0) {
      console.log(`\n💡 추천:`);
      data.recommendations.slice(0, 3).forEach((r: string | { text?: string; title?: string; action?: string }) => {
        if (typeof r === 'string') {
          console.log(`   • ${r}`);
        } else {
          console.log(`   • ${r.text || r.title || r.action || JSON.stringify(r)}`);
        }
      });
    }

    if (data.culturalNotes) {
      console.log(`\n🌏 문화적 해석:`);
      if (data.culturalNotes.korean) console.log(`   • 한국: ${data.culturalNotes.korean}`);
      if (data.culturalNotes.western) console.log(`   • 서양: ${data.culturalNotes.western}`);
    }

    if (result.fromFallback || data.fromFallback) {
      console.log(`\n⚠️ 참고: 폴백 응답 사용됨 (백엔드 연결 실패)`);
    }

    return { success: true, name: dream.name, result: data };

  } catch (error) {
    console.log(`❌ 실패: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, name: dream.name, error };
  }
}

async function main() {
  console.log("🌙 꿈 해몽 API 테스트 시작");
  console.log(`   서버: ${BASE_URL}`);
  console.log(`   테스트 케이스: ${testDreams.length}개`);

  const results: { success: boolean; name: string }[] = [];

  for (const dream of testDreams) {
    const result = await testDreamAPI(dream);
    results.push(result);
    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 테스트 결과 요약");
  console.log(`${"=".repeat(60)}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ 성공: ${successful}/${results.length}`);
  console.log(`❌ 실패: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log(`\n실패한 테스트:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.name}`);
    });
  }
}

main().catch(console.error);
