/**
 * FunInsights 탭 컴포넌트 테스트 - 여러 프로필로 개인화 결과 확인
 */

// 테스트용 프로필들
const profiles = [
  {
    name: "김지수 (갑목, 사주 강)",
    saju: {
      dayMaster: { name: "갑", heavenlyStem: "갑" },
      fiveElements: { wood: 35, fire: 25, earth: 15, metal: 10, water: 15 },
      advancedAnalysis: {
        sibsin: {
          sibsinDistribution: { "비겁": 3, "식상": 2, "재성": 1, "관성": 1, "인성": 1 }
        },
        geokguk: { name: "식신격", type: "food" },
        extended: { strength: { level: "신강" } }
      },
      sinsal: {
        luckyList: [{ name: "역마" }],
        unluckyList: []
      },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "wood" } }],
        monthly: [{ month: 12, ganji: "무자", stem: { element: "earth" } }],
        iljin: [{ day: 26, ganji: "갑진", stem: { element: "wood" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "capricorn" },
        { name: "moon", sign: "aries" },
        { name: "venus", sign: "aquarius" }
      ],
      ascendant: { sign: "leo" }
    }
  },
  {
    name: "이서연 (정화, 사주 약)",
    saju: {
      dayMaster: { name: "정", heavenlyStem: "정" },
      fiveElements: { wood: 10, fire: 15, earth: 30, metal: 25, water: 20 },
      advancedAnalysis: {
        sibsin: {
          sibsinDistribution: { "비겁": 1, "식상": 1, "재성": 3, "관성": 2, "인성": 1 }
        },
        geokguk: { name: "정재격", type: "direct wealth" },
        extended: { strength: { level: "신약" } }
      },
      sinsal: {
        luckyList: [{ name: "화개" }],
        unluckyList: []
      },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "fire" } }],
        monthly: [{ month: 12, ganji: "무자", stem: { element: "water" } }],
        iljin: [{ day: 26, ganji: "갑진", stem: { element: "wood" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "cancer" },
        { name: "moon", sign: "pisces" },
        { name: "venus", sign: "taurus" }
      ],
      ascendant: { sign: "virgo" }
    }
  },
  {
    name: "박민준 (경금, 균형)",
    saju: {
      dayMaster: { name: "경", heavenlyStem: "경" },
      fiveElements: { wood: 20, fire: 18, earth: 22, metal: 22, water: 18 },
      advancedAnalysis: {
        sibsin: {
          sibsinDistribution: { "비겁": 2, "식상": 2, "재성": 2, "관성": 1, "인성": 1 }
        },
        geokguk: { name: "편관격", type: "indirect officer" },
        extended: { strength: { level: "중화" } }
      },
      sinsal: {
        luckyList: [{ name: "도화" }],
        unluckyList: []
      },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "wood" } }],
        monthly: [{ month: 12, ganji: "무자", stem: { element: "metal" } }],
        iljin: [{ day: 26, ganji: "갑진", stem: { element: "earth" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "scorpio" },
        { name: "moon", sign: "capricorn" },
        { name: "venus", sign: "scorpio" }
      ],
      ascendant: { sign: "aquarius" }
    }
  },
  {
    name: "최예은 (계수, 인성 강)",
    saju: {
      dayMaster: { name: "계", heavenlyStem: "계" },
      fiveElements: { wood: 15, fire: 10, earth: 15, metal: 30, water: 30 },
      advancedAnalysis: {
        sibsin: {
          sibsinDistribution: { "비겁": 2, "식상": 1, "재성": 1, "관성": 1, "인성": 3 }
        },
        geokguk: { name: "정인격", type: "direct seal" },
        extended: { strength: { level: "신강" } }
      },
      sinsal: {
        luckyList: [{ name: "귀문관" }],
        unluckyList: []
      },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "fire" } }],
        monthly: [{ month: 12, ganji: "무자", stem: { element: "water" } }],
        iljin: [{ day: 26, ganji: "갑진", stem: { element: "metal" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "pisces" },
        { name: "moon", sign: "scorpio" },
        { name: "venus", sign: "pisces" }
      ],
      ascendant: { sign: "cancer" }
    }
  }
];

// 분석 함수들 시뮬레이션
function getPersonalityDescription(profile) {
  const dm = profile.saju.dayMaster.name;
  const descriptions = {
    "갑": { ko: "당당하고 뚝심 있는 리더형", traits: ["리더십", "책임감", "정직함"] },
    "정": { ko: "따뜻하고 섬세한 감성파", traits: ["섬세함", "배려", "예술적 감각"] },
    "경": { ko: "시원시원하고 결단력 있는 실행파", traits: ["결단력", "정의감", "추진력"] },
    "계": { ko: "깊고 순수한 지혜로운 사람", traits: ["직관력", "창의력", "적응력"] }
  };
  return descriptions[dm] || { ko: "특별한 사람", traits: [] };
}

function getEnergyType(profile) {
  const level = profile.saju.advancedAnalysis?.extended?.strength?.level || "";
  if (level.includes("강")) return { type: "신강", desc: "에너지가 넘치는 활동형" };
  if (level.includes("약")) return { type: "신약", desc: "섬세하고 예민한 감성형" };
  return { type: "중화", desc: "균형 잡힌 안정형" };
}

function getDominantSibsin(profile) {
  const dist = profile.saju.advancedAnalysis?.sibsin?.sibsinDistribution || {};
  const sorted = Object.entries(dist).sort(([,a], [,b]) => b - a);
  return sorted[0]?.[0] || null;
}

function getHealthFocus(profile) {
  const dm = profile.saju.dayMaster.name;
  const health = {
    "갑": { organs: "간, 담낭, 눈", warning: "스트레스 → 간 무리" },
    "정": { organs: "심장, 소장, 혈액순환", warning: "감정 억제 → 순환 장애" },
    "경": { organs: "폐, 대장, 피부", warning: "슬픔 억제 → 호흡기 문제" },
    "계": { organs: "신장, 방광, 귀", warning: "감정 과흡수 → 에너지 고갈" }
  };
  return health[dm] || { organs: "전반적 관리", warning: "스트레스 주의" };
}

function getCareerStyle(profile) {
  const geok = profile.saju.advancedAnalysis?.geokguk?.name || "";
  if (geok.includes("식신")) return { style: "창작형", fields: ["요리", "글쓰기", "디자인", "예술"] };
  if (geok.includes("정재")) return { style: "안정 재물형", fields: ["금융", "부동산", "회계", "공무원"] };
  if (geok.includes("편관")) return { style: "도전형", fields: ["경찰", "군인", "스포츠", "경쟁 분야"] };
  if (geok.includes("정인")) return { style: "학자형", fields: ["교육", "연구", "상담", "의료"] };
  return { style: "다재다능형", fields: ["다양한 분야"] };
}

function getLoveStyle(profile) {
  const dm = profile.saju.dayMaster.name;
  const sunSign = profile.astro.planets.find(p => p.name === "sun")?.sign || "";

  const dmStyles = {
    "갑": "주도적이고 보호하려는 연애",
    "정": "헌신적이고 따뜻한 연애",
    "경": "시원시원하고 직설적인 연애",
    "계": "깊고 감성적인 연애"
  };

  const sunStyles = {
    "capricorn": "책임감 있고 진지한",
    "cancer": "가정적이고 보살피는",
    "scorpio": "깊고 집중적인",
    "pisces": "낭만적이고 헌신적인"
  };

  return {
    dmStyle: dmStyles[dm] || "특별한 연애",
    sunStyle: sunStyles[sunSign] || "독특한"
  };
}

function getYearFortune(profile) {
  const element = profile.saju.unse?.annual?.[0]?.stem?.element || "wood";
  const fortunes = {
    "wood": { theme: "성장과 시작의 해", emoji: "🌱" },
    "fire": { theme: "열정과 표현의 해", emoji: "🔥" },
    "earth": { theme: "안정과 기반의 해", emoji: "🏔️" },
    "metal": { theme: "결실과 정리의 해", emoji: "⚔️" },
    "water": { theme: "준비와 지혜의 해", emoji: "💧" }
  };
  return fortunes[element] || fortunes["wood"];
}

// 결과 출력
console.log("═".repeat(80));
console.log("🔮 FunInsights 개인화 테스트 - 4명의 다른 프로필 비교");
console.log("═".repeat(80));

profiles.forEach((profile, idx) => {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`📌 프로필 ${idx + 1}: ${profile.name}`);
  console.log("─".repeat(80));

  const personality = getPersonalityDescription(profile);
  const energy = getEnergyType(profile);
  const dominantSibsin = getDominantSibsin(profile);
  const health = getHealthFocus(profile);
  const career = getCareerStyle(profile);
  const love = getLoveStyle(profile);
  const yearFortune = getYearFortune(profile);

  console.log(`\n🌟 [성격 탭]`);
  console.log(`   일간: ${profile.saju.dayMaster.name} → "${personality.ko}"`);
  console.log(`   에너지: ${energy.type} - ${energy.desc}`);
  console.log(`   주요 십신: ${dominantSibsin}`);
  console.log(`   특성: ${personality.traits.join(", ")}`);

  console.log(`\n💕 [연애 탭]`);
  console.log(`   연애 스타일: ${love.dmStyle}`);
  console.log(`   태양 별자리 영향: ${love.sunStyle}`);

  console.log(`\n💼 [커리어 탭]`);
  console.log(`   격국: ${profile.saju.advancedAnalysis?.geokguk?.name || "없음"}`);
  console.log(`   커리어 스타일: ${career.style}`);
  console.log(`   추천 분야: ${career.fields.join(", ")}`);

  console.log(`\n🔮 [운세 탭]`);
  console.log(`   2025년 운세: ${yearFortune.emoji} ${yearFortune.theme}`);

  console.log(`\n💪 [건강 탭]`);
  console.log(`   주의 기관: ${health.organs}`);
  console.log(`   경고: ${health.warning}`);

  // 오행 비율 시각화
  const elements = profile.saju.fiveElements;
  console.log(`\n📊 오행 비율:`);
  Object.entries(elements).forEach(([el, val]) => {
    const bar = "█".repeat(Math.round(val / 5));
    const elNames = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
    console.log(`   ${elNames[el]}: ${bar} ${val}%`);
  });
});

console.log(`\n${"═".repeat(80)}`);
console.log("✅ 테스트 완료 - 각 프로필이 다른 결과를 보여주는지 확인하세요");
console.log("═".repeat(80));

// 차이점 요약
console.log(`\n📋 주요 차이점 요약:`);
console.log(`┌──────────────┬────────────┬────────────┬────────────┬────────────┐`);
console.log(`│              │ 김지수     │ 이서연     │ 박민준     │ 최예은     │`);
console.log(`├──────────────┼────────────┼────────────┼────────────┼────────────┤`);
console.log(`│ 일간         │ 갑(목)     │ 정(화)     │ 경(금)     │ 계(수)     │`);
console.log(`│ 에너지       │ 신강       │ 신약       │ 중화       │ 신강       │`);
console.log(`│ 주십신       │ 비겁       │ 재성       │ 비겁/식상  │ 인성       │`);
console.log(`│ 격국         │ 식신격     │ 정재격     │ 편관격     │ 정인격     │`);
console.log(`│ 커리어       │ 창작형     │ 안정재물   │ 도전형     │ 학자형     │`);
console.log(`│ 주의기관     │ 간/담낭    │ 심장       │ 폐/피부    │ 신장       │`);
console.log(`│ 강한오행     │ 목(35%)    │ 토(30%)    │ 금(22%)    │ 수(30%)    │`);
console.log(`└──────────────┴────────────┴────────────┴────────────┴────────────┘`);
