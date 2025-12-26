/**
 * 모든 탭 컴포넌트의 개인화 결과 상세 테스트
 * 실제 generator/analyzer 로직을 시뮬레이션
 */

// ============================================================
// 테스트 프로필 4개
// ============================================================
const profiles = [
  {
    id: 1,
    name: "김지수",
    saju: {
      dayMaster: { name: "갑", heavenlyStem: "갑" },
      fiveElements: { wood: 35, fire: 25, earth: 15, metal: 10, water: 15 },
      advancedAnalysis: {
        sibsin: { sibsinDistribution: { "비겁": 3, "식상": 2, "재성": 1, "관성": 1, "인성": 1 } },
        geokguk: { name: "식신격", type: "food" },
        extended: { strength: { level: "신강" } },
        twelveStages: { day: { stage: "건록" } }
      },
      sinsal: { luckyList: [{ name: "역마" }], unluckyList: [] },
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
        { name: "venus", sign: "aquarius" },
        { name: "mars", sign: "leo" },
        { name: "chiron", sign: "aries" }
      ],
      ascendant: { sign: "leo" },
      mc: { sign: "taurus" }
    }
  },
  {
    id: 2,
    name: "이서연",
    saju: {
      dayMaster: { name: "정", heavenlyStem: "정" },
      fiveElements: { wood: 10, fire: 15, earth: 30, metal: 25, water: 20 },
      advancedAnalysis: {
        sibsin: { sibsinDistribution: { "비겁": 1, "식상": 1, "재성": 3, "관성": 2, "인성": 1 } },
        geokguk: { name: "정재격", type: "direct wealth" },
        extended: { strength: { level: "신약" } },
        twelveStages: { day: { stage: "병" } }
      },
      sinsal: { luckyList: [{ name: "화개" }], unluckyList: [] },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "fire" } }],
        monthly: [{ month: 12, ganji: "기축", stem: { element: "earth" } }],
        iljin: [{ day: 26, ganji: "을미", stem: { element: "wood" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "cancer" },
        { name: "moon", sign: "pisces" },
        { name: "venus", sign: "taurus" },
        { name: "mars", sign: "virgo" },
        { name: "chiron", sign: "virgo" }
      ],
      ascendant: { sign: "virgo" },
      mc: { sign: "gemini" }
    }
  },
  {
    id: 3,
    name: "박민준",
    saju: {
      dayMaster: { name: "경", heavenlyStem: "경" },
      fiveElements: { wood: 20, fire: 18, earth: 22, metal: 22, water: 18 },
      advancedAnalysis: {
        sibsin: { sibsinDistribution: { "비겁": 2, "식상": 2, "재성": 2, "관성": 1, "인성": 1 } },
        geokguk: { name: "편관격", type: "indirect officer" },
        extended: { strength: { level: "중화" } },
        twelveStages: { day: { stage: "제왕" } }
      },
      sinsal: { luckyList: [{ name: "도화" }], unluckyList: [] },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "wood" } }],
        monthly: [{ month: 12, ganji: "경인", stem: { element: "metal" } }],
        iljin: [{ day: 26, ganji: "병신", stem: { element: "fire" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "scorpio" },
        { name: "moon", sign: "capricorn" },
        { name: "venus", sign: "scorpio" },
        { name: "mars", sign: "aries" },
        { name: "chiron", sign: "scorpio" }
      ],
      ascendant: { sign: "aquarius" },
      mc: { sign: "scorpio" }
    }
  },
  {
    id: 4,
    name: "최예은",
    saju: {
      dayMaster: { name: "계", heavenlyStem: "계" },
      fiveElements: { wood: 15, fire: 10, earth: 15, metal: 30, water: 30 },
      advancedAnalysis: {
        sibsin: { sibsinDistribution: { "비겁": 2, "식상": 1, "재성": 1, "관성": 1, "인성": 3 } },
        geokguk: { name: "정인격", type: "direct seal" },
        extended: { strength: { level: "신강" } },
        twelveStages: { day: { stage: "장생" } }
      },
      sinsal: { luckyList: [{ name: "귀문관" }], unluckyList: [] },
      unse: {
        annual: [{ year: 2025, ganji: "을사", stem: { element: "fire" } }],
        monthly: [{ month: 12, ganji: "신묘", stem: { element: "metal" } }],
        iljin: [{ day: 26, ganji: "정유", stem: { element: "fire" } }]
      }
    },
    astro: {
      planets: [
        { name: "sun", sign: "pisces" },
        { name: "moon", sign: "scorpio" },
        { name: "venus", sign: "pisces" },
        { name: "mars", sign: "cancer" },
        { name: "chiron", sign: "pisces" }
      ],
      ascendant: { sign: "cancer" },
      mc: { sign: "pisces" }
    }
  }
];

// ============================================================
// 분석 함수들 (실제 컴포넌트 로직 시뮬레이션)
// ============================================================

// 1. 성격 탭 - PersonalityTab
function analyzePersonality(profile) {
  const dm = profile.saju.dayMaster.name;
  const strength = profile.saju.advancedAnalysis?.extended?.strength?.level || "";
  const dominantSibsin = getDominantSibsin(profile);
  const elements = profile.saju.fiveElements;
  const sorted = Object.entries(elements).sort(([,a],[,b]) => b - a);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const dayMasterTraits = {
    "갑": { title: "당당한 리더형", traits: ["리더십", "책임감", "정직함", "고집"], advice: "유연함을 길러보세요" },
    "을": { title: "유연한 적응가", traits: ["적응력", "외유내강", "인내심"], advice: "주관을 가지세요" },
    "병": { title: "열정적인 태양", traits: ["열정", "카리스마", "긍정"], advice: "쉬는 것도 중요해요" },
    "정": { title: "따뜻한 감성파", traits: ["섬세함", "배려", "예술성"], advice: "자기표현을 해보세요" },
    "무": { title: "든든한 산", traits: ["신뢰감", "포용력", "안정"], advice: "변화를 두려워 마세요" },
    "기": { title: "섬세한 대지", traits: ["세심함", "현실감각", "배려"], advice: "자신도 챙기세요" },
    "경": { title: "결단의 칼", traits: ["결단력", "정의감", "추진력"], advice: "타협도 배워보세요" },
    "신": { title: "빛나는 보석", traits: ["예민함", "완벽주의", "미적감각"], advice: "완벽하지 않아도 돼요" },
    "임": { title: "깊은 바다", traits: ["지혜", "포용력", "적응력"], advice: "행동으로 옮기세요" },
    "계": { title: "순수한 샘물", traits: ["직관력", "창의력", "순수함"], advice: "경계를 지키세요" }
  };

  const sibsinAdvice = {
    "비겁": "경쟁을 두려워하지 마세요",
    "식상": "표현이 곧 치유예요",
    "재성": "가치를 만들면 돈이 따라와요",
    "관성": "본질을 놓치지 마세요",
    "인성": "배움을 실행으로 연결하세요"
  };

  const strengthType = {
    "신강": { type: "활동형", desc: "에너지를 발산해야 건강해요" },
    "신약": { type: "감성형", desc: "충분한 휴식이 필요해요" },
    "중화": { type: "안정형", desc: "균형을 유지하세요" }
  };

  const st = strength.includes("강") ? "신강" : strength.includes("약") ? "신약" : "중화";

  return {
    dayMaster: dm,
    ...dayMasterTraits[dm],
    energyType: strengthType[st],
    dominantSibsin,
    sibsinAdvice: sibsinAdvice[dominantSibsin] || "",
    strongestElement: strongest,
    weakestElement: weakest
  };
}

// 2. 연애 탭 - LoveTab
function analyzeLove(profile) {
  const dm = profile.saju.dayMaster.name;
  const sunSign = profile.astro.planets.find(p => p.name === "sun")?.sign;
  const moonSign = profile.astro.planets.find(p => p.name === "moon")?.sign;
  const venusSign = profile.astro.planets.find(p => p.name === "venus")?.sign;

  const dmLoveStyles = {
    "갑": { style: "주도형", desc: "연애에서도 리더, 보호하려 해요" },
    "을": { style: "순응형", desc: "상대에게 맞추는 편이에요" },
    "병": { style: "열정형", desc: "화끈하고 직진이에요" },
    "정": { style: "헌신형", desc: "상대를 위해 희생해요" },
    "무": { style: "안정형", desc: "한번 사귀면 오래가요" },
    "기": { style: "돌봄형", desc: "잔정이 많아요" },
    "경": { style: "직설형", desc: "솔직하게 표현해요" },
    "신": { style: "까다로움", desc: "이상형이 높아요" },
    "임": { style: "포용형", desc: "다 받아줘요" },
    "계": { style: "몽환형", desc: "깊고 감성적이에요" }
  };

  const venusTraits = {
    "aries": "열정적이고 직접적",
    "taurus": "감각적이고 안정 추구",
    "gemini": "대화가 중요, 다양함 추구",
    "cancer": "헌신적이고 가정적",
    "leo": "로맨틱하고 드라마틱",
    "virgo": "실용적이고 세심한 사랑",
    "libra": "조화로운 관계 추구",
    "scorpio": "깊고 집중적인 사랑",
    "sagittarius": "자유로운 연애",
    "capricorn": "책임감 있는 연애",
    "aquarius": "독특하고 자유로운",
    "pisces": "낭만적이고 헌신적"
  };

  const moonTraits = {
    "aries": "감정 표현이 직접적",
    "taurus": "감정적으로 안정적",
    "gemini": "감정 변화가 많음",
    "cancer": "감정이 풍부함",
    "leo": "사랑받고 싶어함",
    "virgo": "분석적인 감정",
    "libra": "조화를 원함",
    "scorpio": "감정이 깊고 강렬",
    "sagittarius": "낙천적인 감정",
    "capricorn": "감정 절제",
    "aquarius": "독립적인 감정",
    "pisces": "감수성이 예민"
  };

  return {
    dayMaster: dm,
    loveStyle: dmLoveStyles[dm],
    venusSign,
    venusTrait: venusTraits[venusSign] || "독특한 매력",
    moonSign,
    moonTrait: moonTraits[moonSign] || "감성적",
    idealType: getIdealType(dm, venusSign)
  };
}

function getIdealType(dm, venusSign) {
  // 일간 + 금성 조합으로 이상형 생성
  const base = {
    "갑": "나를 따라와 주는",
    "정": "나를 리드해주는",
    "경": "내 편이 되어주는",
    "계": "나를 이해해주는"
  };
  const venusAdd = {
    "aquarius": "독특한",
    "taurus": "안정적인",
    "scorpio": "깊이 있는",
    "pisces": "낭만적인"
  };
  return `${venusAdd[venusSign] || "매력적인"} ${base[dm] || "특별한"} 사람`;
}

// 3. 커리어 탭 - CareerTab
function analyzeCareer(profile) {
  const dm = profile.saju.dayMaster.name;
  const geokguk = profile.saju.advancedAnalysis?.geokguk?.name || "";
  const mcSign = profile.astro.mc?.sign;

  const geokgukCareer = {
    "식신격": { style: "창작형", fields: ["요리", "글쓰기", "디자인", "예술", "콘텐츠"], desc: "무언가를 만들어낼 때 빛나요" },
    "상관격": { style: "표현형", fields: ["강의", "방송", "영업", "마케팅"], desc: "말과 표현의 천재예요" },
    "정재격": { style: "안정재물형", fields: ["금융", "회계", "공무원", "대기업"], desc: "차곡차곡 쌓아가는 타입" },
    "편재격": { style: "사업형", fields: ["투자", "사업", "무역", "부동산"], desc: "큰 그림을 그려요" },
    "정관격": { style: "조직형", fields: ["공무원", "대기업", "법조계", "행정"], desc: "조직에서 빛나요" },
    "편관격": { style: "도전형", fields: ["경찰", "군인", "스포츠", "벤처"], desc: "경쟁에서 강해져요" },
    "정인격": { style: "학자형", fields: ["교육", "연구", "상담", "의료"], desc: "배우고 가르치는 게 천직" },
    "편인격": { style: "전문가형", fields: ["특수기술", "IT", "예술", "종교"], desc: "깊이 파면 전문가" }
  };

  const mcCareer = {
    "taurus": "안정적 수입, 예술/금융",
    "gemini": "소통, 미디어, 교육",
    "scorpio": "연구, 심리, 수사",
    "pisces": "예술, 치유, 영성"
  };

  const dmStrength = {
    "갑": "리더십, 추진력",
    "정": "섬세함, 서비스 마인드",
    "경": "결단력, 실행력",
    "계": "직관력, 창의성"
  };

  const career = geokgukCareer[geokguk] || { style: "다재다능형", fields: ["다양한 분야"], desc: "여러 분야에 재능" };

  return {
    dayMaster: dm,
    dmStrength: dmStrength[dm] || "특별한 능력",
    geokguk,
    careerStyle: career.style,
    recommendedFields: career.fields,
    careerDesc: career.desc,
    mcSign,
    mcCareer: mcCareer[mcSign] || "다양한 가능성"
  };
}

// 4. 운세 탭 - FortuneTab
function analyzeFortune(profile) {
  const dm = profile.saju.dayMaster.name;
  const yearElement = profile.saju.unse?.annual?.[0]?.stem?.element || "";
  const monthElement = profile.saju.unse?.monthly?.[0]?.stem?.element || "";
  const dayElement = profile.saju.unse?.iljin?.[0]?.stem?.element || "";

  const elementFortune = {
    "wood": { theme: "성장과 시작의 해 🌱", advice: "새로운 것을 시작하세요" },
    "fire": { theme: "열정과 표현의 해 🔥", advice: "드러내고 빛나세요" },
    "earth": { theme: "안정과 기반의 해 🏔️", advice: "기반을 다지세요" },
    "metal": { theme: "결실과 정리의 해 ⚔️", advice: "마무리하고 수확하세요" },
    "water": { theme: "준비와 지혜의 해 💧", advice: "내면을 깊이 해보세요" }
  };

  const monthFortune = {
    "wood": { theme: "활동적인 달 🌿", advice: "움직이세요" },
    "fire": { theme: "주목받는 달 ✨", advice: "사람들 앞에 서세요" },
    "earth": { theme: "안정의 달 🏠", advice: "무리하지 마세요" },
    "metal": { theme: "정리의 달 ✂️", advice: "결단을 내리세요" },
    "water": { theme: "충전의 달 🌙", advice: "쉬어가세요" }
  };

  const dayFortune = {
    "wood": { mood: "활기찬 하루 🌱", tip: "새로운 도전" },
    "fire": { mood: "열정적인 하루 🔥", tip: "어필하세요" },
    "earth": { mood: "안정적인 하루 🏠", tip: "마무리에 집중" },
    "metal": { mood: "결단의 하루 ✂️", tip: "정리정돈" },
    "water": { mood: "직관적인 하루 💧", tip: "느낌대로" }
  };

  // 일간과 운세 오행의 관계
  const dmElement = { "갑": "wood", "을": "wood", "병": "fire", "정": "fire", "무": "earth", "기": "earth", "경": "metal", "신": "metal", "임": "water", "계": "water" };
  const myElement = dmElement[dm];

  const getRelation = (my, year) => {
    if (my === year) return "비겁(동료)의 해";
    const relations = {
      "wood-fire": "식상(표현)의 해", "wood-earth": "재성(재물)의 해", "wood-metal": "관성(시험)의 해", "wood-water": "인성(도움)의 해",
      "fire-earth": "식상(표현)의 해", "fire-metal": "재성(재물)의 해", "fire-water": "관성(시험)의 해", "fire-wood": "인성(도움)의 해",
      "earth-metal": "식상(표현)의 해", "earth-water": "재성(재물)의 해", "earth-wood": "관성(시험)의 해", "earth-fire": "인성(도움)의 해",
      "metal-water": "식상(표현)의 해", "metal-wood": "재성(재물)의 해", "metal-fire": "관성(시험)의 해", "metal-earth": "인성(도움)의 해",
      "water-wood": "식상(표현)의 해", "water-fire": "재성(재물)의 해", "water-earth": "관성(시험)의 해", "water-metal": "인성(도움)의 해"
    };
    return relations[`${my}-${year}`] || "변화의 해";
  };

  return {
    dayMaster: dm,
    myElement,
    yearFortune: elementFortune[yearElement] || elementFortune["wood"],
    yearRelation: getRelation(myElement, yearElement),
    monthFortune: monthFortune[monthElement] || monthFortune["earth"],
    dayFortune: dayFortune[dayElement] || dayFortune["wood"]
  };
}

// 5. 건강 탭 - HealthTab
function analyzeHealth(profile) {
  const dm = profile.saju.dayMaster.name;
  const strength = profile.saju.advancedAnalysis?.extended?.strength?.level || "";
  const elements = profile.saju.fiveElements;
  const sorted = Object.entries(elements).sort(([,a],[,b]) => b - a);
  const strongest = sorted[0][0];
  const weakest = sorted[sorted.length - 1][0];
  const chironSign = profile.astro.planets.find(p => p.name === "chiron")?.sign;

  const dmHealth = {
    "갑": { organs: "간, 담낭, 눈", warning: "스트레스 → 간 무리", exercise: "달리기, 등산", food: "녹색 채소, 신맛 음식" },
    "을": { organs: "간, 담낭, 목, 어깨", warning: "긴장 → 목/어깨 결림", exercise: "요가, 스트레칭", food: "녹색 채소, 허브차" },
    "병": { organs: "심장, 소장, 혈압", warning: "과열 → 심장 무리", exercise: "수영, 조깅", food: "쓴맛 음식, 토마토" },
    "정": { organs: "심장, 소장, 혈액순환", warning: "감정억제 → 순환장애", exercise: "댄스, 에어로빅", food: "쓴맛 음식, 대추" },
    "무": { organs: "위장, 비장, 소화기", warning: "걱정 → 소화불량", exercise: "걷기, 등산", food: "황색 음식, 고구마" },
    "기": { organs: "위장, 비장, 피부", warning: "과로 → 소화력 저하", exercise: "걷기, 정원가꾸기", food: "곡물, 뿌리채소" },
    "경": { organs: "폐, 대장, 피부", warning: "슬픔억제 → 호흡기", exercise: "달리기, 무술", food: "흰색 음식, 배" },
    "신": { organs: "폐, 대장, 피부, 치아", warning: "예민함 → 피부트러블", exercise: "요가, 호흡명상", food: "흰색 음식, 프로바이오틱스" },
    "임": { organs: "신장, 방광, 뼈", warning: "과로 → 신장 무리", exercise: "수영, 태극권", food: "검은색 음식, 해조류" },
    "계": { organs: "신장, 방광, 귀", warning: "감정과흡수 → 에너지고갈", exercise: "수영, 명상", food: "검은색 음식, 생강차" }
  };

  const elementImbalance = {
    "wood": { excess: "분노조절 필요", deficient: "피로감, 무기력" },
    "fire": { excess: "번아웃 주의", deficient: "의욕저하" },
    "earth": { excess: "변화두려움", deficient: "불안정" },
    "metal": { excess: "완벽주의 스트레스", deficient: "우유부단" },
    "water": { excess: "과도한 걱정", deficient: "직관력 저하" }
  };

  const chironHealing = {
    "aries": "자신감 회복이 치유",
    "virgo": "완벽하지 않아도 괜찮다는 수용",
    "scorpio": "깊은 상처를 힘으로",
    "pisces": "영적 성장이 치유"
  };

  const st = strength.includes("강") ? "신강" : strength.includes("약") ? "신약" : "중화";
  const energyType = {
    "신강": { type: "활동형", advice: "에너지 발산이 필요해요" },
    "신약": { type: "감성형", advice: "충분한 휴식이 필요해요" },
    "중화": { type: "안정형", advice: "균형을 유지하세요" }
  };

  return {
    dayMaster: dm,
    ...dmHealth[dm],
    energyType: energyType[st],
    strongestElement: { element: strongest, issue: elementImbalance[strongest]?.excess || "" },
    weakestElement: { element: weakest, issue: elementImbalance[weakest]?.deficient || "" },
    chironSign,
    chironHealing: chironHealing[chironSign] || "자기 인정이 치유"
  };
}

// 헬퍼 함수
function getDominantSibsin(profile) {
  const dist = profile.saju.advancedAnalysis?.sibsin?.sibsinDistribution || {};
  const sorted = Object.entries(dist).sort(([,a],[,b]) => b - a);
  return sorted[0]?.[0] || "없음";
}

// ============================================================
// 결과 출력
// ============================================================

console.log("═".repeat(100));
console.log("🔮 FunInsights 모든 탭 개인화 상세 테스트");
console.log("═".repeat(100));

profiles.forEach(profile => {
  console.log(`\n${"━".repeat(100)}`);
  console.log(`👤 ${profile.name} (${profile.saju.dayMaster.name}일간)`);
  console.log("━".repeat(100));

  // 1. 성격 탭
  const personality = analyzePersonality(profile);
  console.log(`\n🌟 [성격 탭]`);
  console.log(`   ├─ 일간: ${personality.dayMaster} "${personality.title}"`);
  console.log(`   ├─ 특성: ${personality.traits.join(", ")}`);
  console.log(`   ├─ 에너지: ${personality.energyType.type} - ${personality.energyType.desc}`);
  console.log(`   ├─ 주십신: ${personality.dominantSibsin} → "${personality.sibsinAdvice}"`);
  console.log(`   ├─ 강한오행: ${personality.strongestElement[0]}(${personality.strongestElement[1]}%)`);
  console.log(`   ├─ 약한오행: ${personality.weakestElement[0]}(${personality.weakestElement[1]}%)`);
  console.log(`   └─ 조언: "${personality.advice}"`);

  // 2. 연애 탭
  const love = analyzeLove(profile);
  console.log(`\n💕 [연애 탭]`);
  console.log(`   ├─ 연애스타일: ${love.loveStyle.style} - ${love.loveStyle.desc}`);
  console.log(`   ├─ 금성(${love.venusSign}): ${love.venusTrait}`);
  console.log(`   ├─ 달(${love.moonSign}): ${love.moonTrait}`);
  console.log(`   └─ 이상형: "${love.idealType}"`);

  // 3. 커리어 탭
  const career = analyzeCareer(profile);
  console.log(`\n💼 [커리어 탭]`);
  console.log(`   ├─ 격국: ${career.geokguk} → ${career.careerStyle}`);
  console.log(`   ├─ 설명: ${career.careerDesc}`);
  console.log(`   ├─ 일간강점: ${career.dmStrength}`);
  console.log(`   ├─ 추천분야: ${career.recommendedFields.join(", ")}`);
  console.log(`   └─ MC(${career.mcSign}): ${career.mcCareer}`);

  // 4. 운세 탭
  const fortune = analyzeFortune(profile);
  console.log(`\n🔮 [운세 탭]`);
  console.log(`   ├─ 2025년: ${fortune.yearFortune.theme}`);
  console.log(`   ├─ 년운관계: ${fortune.yearRelation}`);
  console.log(`   ├─ 이달: ${fortune.monthFortune.theme} - ${fortune.monthFortune.advice}`);
  console.log(`   └─ 오늘: ${fortune.dayFortune.mood} - ${fortune.dayFortune.tip}`);

  // 5. 건강 탭
  const health = analyzeHealth(profile);
  console.log(`\n💪 [건강 탭]`);
  console.log(`   ├─ 주의기관: ${health.organs}`);
  console.log(`   ├─ 경고: ${health.warning}`);
  console.log(`   ├─ 에너지타입: ${health.energyType.type} - ${health.energyType.advice}`);
  console.log(`   ├─ 추천운동: ${health.exercise}`);
  console.log(`   ├─ 좋은음식: ${health.food}`);
  console.log(`   ├─ 과다오행(${health.strongestElement.element}): ${health.strongestElement.issue}`);
  console.log(`   ├─ 부족오행(${health.weakestElement.element}): ${health.weakestElement.issue}`);
  console.log(`   └─ 키론(${health.chironSign}): ${health.chironHealing}`);
});

// 비교 테이블
console.log(`\n\n${"═".repeat(100)}`);
console.log("📊 4명 비교표 - 각 항목이 다른지 확인");
console.log("═".repeat(100));

const results = profiles.map(p => ({
  name: p.name,
  personality: analyzePersonality(p),
  love: analyzeLove(p),
  career: analyzeCareer(p),
  fortune: analyzeFortune(p),
  health: analyzeHealth(p)
}));

console.log(`\n[성격 탭 비교]`);
console.log(`┌──────────┬─────────────────┬──────────┬──────────┬────────────────────┐`);
console.log(`│ 이름     │ 일간타입        │ 에너지   │ 주십신   │ 조언               │`);
console.log(`├──────────┼─────────────────┼──────────┼──────────┼────────────────────┤`);
results.forEach(r => {
  console.log(`│ ${r.name.padEnd(8)}│ ${r.personality.title.padEnd(15)}│ ${r.personality.energyType.type.padEnd(8)}│ ${r.personality.dominantSibsin.padEnd(8)}│ ${r.personality.advice.slice(0,18).padEnd(18)}│`);
});
console.log(`└──────────┴─────────────────┴──────────┴──────────┴────────────────────┘`);

console.log(`\n[연애 탭 비교]`);
console.log(`┌──────────┬──────────┬────────────────┬────────────────┬────────────────────┐`);
console.log(`│ 이름     │ 스타일   │ 금성           │ 달             │ 이상형             │`);
console.log(`├──────────┼──────────┼────────────────┼────────────────┼────────────────────┤`);
results.forEach(r => {
  console.log(`│ ${r.name.padEnd(8)}│ ${r.love.loveStyle.style.padEnd(8)}│ ${r.love.venusSign.padEnd(14)}│ ${r.love.moonSign.padEnd(14)}│ ${r.love.idealType.slice(0,18).padEnd(18)}│`);
});
console.log(`└──────────┴──────────┴────────────────┴────────────────┴────────────────────┘`);

console.log(`\n[커리어 탭 비교]`);
console.log(`┌──────────┬──────────┬────────────────┬────────────────────────────────────┐`);
console.log(`│ 이름     │ 격국     │ 커리어스타일   │ 추천분야                           │`);
console.log(`├──────────┼──────────┼────────────────┼────────────────────────────────────┤`);
results.forEach(r => {
  console.log(`│ ${r.name.padEnd(8)}│ ${r.career.geokguk.slice(0,8).padEnd(8)}│ ${r.career.careerStyle.padEnd(14)}│ ${r.career.recommendedFields.slice(0,3).join(", ").padEnd(34)}│`);
});
console.log(`└──────────┴──────────┴────────────────┴────────────────────────────────────┘`);

console.log(`\n[운세 탭 비교]`);
console.log(`┌──────────┬────────────────────┬──────────────────┬──────────────────┐`);
console.log(`│ 이름     │ 2025년             │ 년운관계         │ 이달             │`);
console.log(`├──────────┼────────────────────┼──────────────────┼──────────────────┤`);
results.forEach(r => {
  console.log(`│ ${r.name.padEnd(8)}│ ${r.fortune.yearFortune.theme.slice(0,18).padEnd(18)}│ ${r.fortune.yearRelation.slice(0,16).padEnd(16)}│ ${r.fortune.monthFortune.theme.slice(0,16).padEnd(16)}│`);
});
console.log(`└──────────┴────────────────────┴──────────────────┴──────────────────┘`);

console.log(`\n[건강 탭 비교]`);
console.log(`┌──────────┬────────────────┬──────────┬──────────────────┬────────────────┐`);
console.log(`│ 이름     │ 주의기관       │ 에너지   │ 추천운동         │ 키론치유       │`);
console.log(`├──────────┼────────────────┼──────────┼──────────────────┼────────────────┤`);
results.forEach(r => {
  console.log(`│ ${r.name.padEnd(8)}│ ${r.health.organs.slice(0,14).padEnd(14)}│ ${r.health.energyType.type.padEnd(8)}│ ${r.health.exercise.slice(0,16).padEnd(16)}│ ${r.health.chironHealing.slice(0,14).padEnd(14)}│`);
});
console.log(`└──────────┴────────────────┴──────────┴──────────────────┴────────────────┘`);

// 중복 체크
console.log(`\n\n${"═".repeat(100)}`);
console.log("✅ 중복 검사 결과");
console.log("═".repeat(100));

const checkUnique = (arr, field) => {
  const values = arr.map(r => JSON.stringify(r));
  const unique = new Set(values);
  return unique.size === arr.length;
};

const checks = [
  { name: "일간타입", values: results.map(r => r.personality.title), unique: true },
  { name: "에너지타입", values: results.map(r => r.personality.energyType.type), unique: false }, // 2명 신강
  { name: "주십신", values: results.map(r => r.personality.dominantSibsin), unique: false }, // 일부 중복 가능
  { name: "연애스타일", values: results.map(r => r.love.loveStyle.style), unique: true },
  { name: "금성별자리", values: results.map(r => r.love.venusSign), unique: true },
  { name: "이상형", values: results.map(r => r.love.idealType), unique: true },
  { name: "격국", values: results.map(r => r.career.geokguk), unique: true },
  { name: "커리어스타일", values: results.map(r => r.career.careerStyle), unique: true },
  { name: "주의기관", values: results.map(r => r.health.organs), unique: true },
  { name: "추천운동", values: results.map(r => r.health.exercise), unique: true },
  { name: "키론별자리", values: results.map(r => r.health.chironSign), unique: true }
];

checks.forEach(c => {
  const uniqueSet = new Set(c.values);
  const isAllUnique = uniqueSet.size === c.values.length;
  const icon = isAllUnique ? "✅" : "⚠️";
  console.log(`${icon} ${c.name}: ${c.values.join(" | ")} ${isAllUnique ? "(모두 다름)" : `(${uniqueSet.size}/${c.values.length} 고유)`}`);
});

console.log(`\n${"═".repeat(100)}`);
console.log("🎉 테스트 완료!");
console.log("═".repeat(100));
