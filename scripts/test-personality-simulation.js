/**
 * 성격 분석 시뮬레이션 테스트
 * 10명의 무작위 생년월일로 일주(dayMaster) 기반 성격 분석 테스트
 */

// 천간 (10 Heavenly Stems)
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 지지 (12 Earthly Branches)
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 일주 성격 데이터 (dayMasterData.ts에서 복사)
const dayMasterData = {
  "갑": {
    ko: "갑목", en: "Gab Wood", animal: "🦁", element: "wood", hanja: "甲",
    personality: { ko: "큰 나무처럼 듬직하고 정직한 리더형", en: "Honest leader like a mighty tree" },
    strength: { ko: "추진력, 결단력, 책임감", en: "Drive, decisiveness, responsibility" },
    weakness: { ko: "고집, 융통성 부족", en: "Stubbornness, inflexibility" },
    career: { ko: ["경영자", "CEO", "정치인", "창업가"], en: ["Executive", "CEO", "Politician", "Entrepreneur"] },
    relationship: { ko: "주도적이고 보호하려는 성향", en: "Proactive and protective" },
    health: { ko: "간, 담, 눈 건강에 주의", en: "Watch liver, gallbladder, eyes" }
  },
  "을": {
    ko: "을목", en: "Eul Wood", animal: "🦊", element: "wood", hanja: "乙",
    personality: { ko: "덩굴처럼 유연하고 적응력 있는 타입", en: "Flexible and adaptive like a vine" },
    strength: { ko: "적응력, 인내심, 부드러움", en: "Adaptability, patience, gentleness" },
    weakness: { ko: "우유부단, 의존적", en: "Indecisive, dependent" },
    career: { ko: ["디자이너", "예술가", "상담사", "교육자"], en: ["Designer", "Artist", "Counselor", "Educator"] },
    relationship: { ko: "배려심 깊고 헌신적", en: "Caring and devoted" },
    health: { ko: "근육, 신경계 관리 필요", en: "Watch muscles, nervous system" }
  },
  "병": {
    ko: "병화", en: "Byung Fire", animal: "🦅", element: "fire", hanja: "丙",
    personality: { ko: "태양처럼 밝고 열정적인 타입", en: "Bright and passionate like the sun" },
    strength: { ko: "열정, 낙천성, 카리스마", en: "Passion, optimism, charisma" },
    weakness: { ko: "성급함, 산만함", en: "Impatience, scattered focus" },
    career: { ko: ["연예인", "MC", "마케터", "영업"], en: ["Entertainer", "MC", "Marketer", "Sales"] },
    relationship: { ko: "정열적이고 표현이 풍부", en: "Passionate and expressive" },
    health: { ko: "심장, 혈압, 눈 건강 관리", en: "Watch heart, blood pressure, eyes" }
  },
  "정": {
    ko: "정화", en: "Jung Fire", animal: "🦋", element: "fire", hanja: "丁",
    personality: { ko: "촛불처럼 따뜻하고 섬세한 타입", en: "Warm and delicate like candlelight" },
    strength: { ko: "세심함, 예술성, 배려", en: "Attentiveness, artistry, caring" },
    weakness: { ko: "예민함, 걱정 많음", en: "Sensitivity, worry" },
    career: { ko: ["아티스트", "요리사", "심리상담사", "작가"], en: ["Artist", "Chef", "Counselor", "Writer"] },
    relationship: { ko: "감성적이고 로맨틱", en: "Emotional and romantic" },
    health: { ko: "심장, 소장 기능 주의", en: "Watch heart, small intestine" }
  },
  "무": {
    ko: "무토", en: "Mu Earth", animal: "🐻", element: "earth", hanja: "戊",
    personality: { ko: "산처럼 묵직하고 신뢰감 있는 타입", en: "Reliable and steady like a mountain" },
    strength: { ko: "안정감, 포용력, 신뢰", en: "Stability, embrace, trust" },
    weakness: { ko: "고집, 변화 거부", en: "Stubbornness, resistance to change" },
    career: { ko: ["부동산", "건설", "금융", "공무원"], en: ["Real Estate", "Construction", "Finance", "Public Service"] },
    relationship: { ko: "든든하고 믿음직스러움", en: "Reliable and trustworthy" },
    health: { ko: "위장, 비장, 소화기 관리", en: "Watch stomach, spleen, digestion" }
  },
  "기": {
    ko: "기토", en: "Gi Earth", animal: "🐘", element: "earth", hanja: "己",
    personality: { ko: "평야처럼 넓고 포용적인 타입", en: "Broad and nurturing like plains" },
    strength: { ko: "배려심, 중재력, 실용성", en: "Caring, mediation, practicality" },
    weakness: { ko: "우유부단, 자기주장 부족", en: "Indecisive, lack of assertiveness" },
    career: { ko: ["컨설턴트", "HR", "농업", "요식업"], en: ["Consultant", "HR", "Agriculture", "Food Service"] },
    relationship: { ko: "포용력 있고 희생적", en: "Embracing and sacrificial" },
    health: { ko: "당뇨, 비만, 소화기 주의", en: "Watch diabetes, obesity, digestion" }
  },
  "경": {
    ko: "경금", en: "Gyung Metal", animal: "🦈", element: "metal", hanja: "庚",
    personality: { ko: "칼처럼 날카롭고 결단력 있는 타입", en: "Sharp and decisive like a blade" },
    strength: { ko: "결단력, 정의감, 실행력", en: "Decisiveness, justice, execution" },
    weakness: { ko: "냉정함, 타협 어려움", en: "Coldness, difficulty compromising" },
    career: { ko: ["군인", "경찰", "변호사", "외과의사"], en: ["Military", "Police", "Lawyer", "Surgeon"] },
    relationship: { ko: "직선적이고 솔직함", en: "Straightforward and honest" },
    health: { ko: "폐, 대장, 피부 관리", en: "Watch lungs, large intestine, skin" }
  },
  "신": {
    ko: "신금", en: "Shin Metal", animal: "🦚", element: "metal", hanja: "辛",
    personality: { ko: "다이아몬드처럼 단단하면서도 빛나는 타입", en: "Hard yet brilliant like a diamond" },
    strength: { ko: "심미안, 완벽주의, 매력", en: "Aesthetic sense, perfectionism, charm" },
    weakness: { ko: "까다로움, 비판적", en: "Picky, critical" },
    career: { ko: ["주얼리 디자이너", "금융 전문가", "감정사", "뷰티"], en: ["Jewelry Designer", "Financial Expert", "Appraiser", "Beauty"] },
    relationship: { ko: "까다롭지만 깊은 애정", en: "Picky but deep affection" },
    health: { ko: "호흡기, 피부 알레르기 주의", en: "Watch respiratory & skin allergies" }
  },
  "임": {
    ko: "임수", en: "Im Water", animal: "🐋", element: "water", hanja: "壬",
    personality: { ko: "바다처럼 깊고 지혜로운 타입", en: "Deep and wise like the ocean" },
    strength: { ko: "지혜, 포용력, 직관", en: "Wisdom, embrace, intuition" },
    weakness: { ko: "우울함, 감정 기복", en: "Melancholy, mood swings" },
    career: { ko: ["연구원", "철학자", "무역상", "IT 개발자"], en: ["Researcher", "Philosopher", "Trader", "IT Developer"] },
    relationship: { ko: "깊이 있는 사랑, 신비로움", en: "Deep love, mysterious" },
    health: { ko: "신장, 방광, 생식기 관리", en: "Watch kidneys, bladder, reproductive organs" }
  },
  "계": {
    ko: "계수", en: "Gye Water", animal: "🦢", element: "water", hanja: "癸",
    personality: { ko: "시냇물처럼 맑고 순수한 타입", en: "Pure and clear like a stream" },
    strength: { ko: "순수함, 섬세함, 창의성", en: "Purity, delicacy, creativity" },
    weakness: { ko: "예민함, 소극적", en: "Sensitivity, passiveness" },
    career: { ko: ["예술가", "명상가", "학자", "점술가"], en: ["Artist", "Meditator", "Scholar", "Fortune Teller"] },
    relationship: { ko: "순수하고 감성적", en: "Pure and emotional" },
    health: { ko: "신장, 귀, 뼈 건강 주의", en: "Watch kidneys, ears, bones" }
  }
};

// 오행 데이터
const elementData = {
  wood: { ko: "목(木)", color: "#22c55e", trait: "성장, 창의, 인내" },
  fire: { ko: "화(火)", color: "#ef4444", trait: "열정, 리더십, 표현" },
  earth: { ko: "토(土)", color: "#eab308", trait: "안정, 신뢰, 중용" },
  metal: { ko: "금(金)", color: "#a1a1aa", trait: "결단, 정의, 완벽" },
  water: { ko: "수(水)", color: "#3b82f6", trait: "지혜, 유연, 직관" }
};

/**
 * 일진 계산 (간지)
 */
function getDayGanzhi(date) {
  const baseDate = new Date(1900, 0, 1);
  const diff = Math.floor((date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
  const stemIdx = (diff + 10) % 10;
  const branchIdx = (diff + 10) % 12;
  return {
    stem: STEMS[stemIdx],
    stemHanja: STEMS_HANJA[stemIdx],
    branch: BRANCHES[branchIdx],
    branchHanja: BRANCHES_HANJA[branchIdx]
  };
}

/**
 * 무작위 생년월일 생성
 */
function generateRandomBirthDate() {
  const startYear = 1970;
  const endYear = 2005;
  const year = startYear + Math.floor(Math.random() * (endYear - startYear));
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // 간단히 28일로 제한
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);

  return {
    year,
    month,
    day,
    hour,
    minute,
    dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  };
}

/**
 * 성격 분석 수행
 */
function analyzePersonality(birthInfo) {
  const birthDate = new Date(birthInfo.year, birthInfo.month - 1, birthInfo.day);
  const dayGanzhi = getDayGanzhi(birthDate);

  const dayMaster = dayGanzhi.stem;
  const masterData = dayMasterData[dayMaster];

  if (!masterData) {
    return { error: `일주 데이터를 찾을 수 없습니다: ${dayMaster}` };
  }

  return {
    birthDate: birthInfo.dateStr,
    birthTime: birthInfo.timeStr,
    dayMaster,
    dayMasterHanja: dayGanzhi.stemHanja,
    dayBranch: dayGanzhi.branch,
    dayBranchHanja: dayGanzhi.branchHanja,
    fullPillar: `${dayMaster}${dayGanzhi.branch}(${dayGanzhi.stemHanja}${dayGanzhi.branchHanja})`,
    element: masterData.element,
    elementKo: elementData[masterData.element].ko,
    elementTrait: elementData[masterData.element].trait,
    animal: masterData.animal,
    name: masterData.ko,
    personality: masterData.personality.ko,
    strength: masterData.strength.ko,
    weakness: masterData.weakness.ko,
    careers: masterData.career.ko,
    relationship: masterData.relationship.ko,
    health: masterData.health.ko
  };
}

// 메인 테스트
console.log('='.repeat(80));
console.log('성격 분석 시뮬레이션 테스트');
console.log('10명의 무작위 생년월일로 일주(日柱) 기반 성격 분석');
console.log('='.repeat(80));
console.log('');

const results = [];
const elementCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
const stemCount = {};

for (let i = 1; i <= 10; i++) {
  const birthInfo = generateRandomBirthDate();
  const analysis = analyzePersonality(birthInfo);
  results.push(analysis);

  // 통계
  if (!analysis.error) {
    elementCount[analysis.element]++;
    stemCount[analysis.dayMaster] = (stemCount[analysis.dayMaster] || 0) + 1;
  }
}

// 개별 결과 출력
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(`[ 테스트 ${i + 1} ]`);
  console.log('-'.repeat(80));
  console.log(`생년월일: ${r.birthDate} ${r.birthTime}`);
  console.log(`일주(日柱): ${r.fullPillar}`);
  console.log(`오행: ${r.elementKo} - ${r.elementTrait}`);
  console.log(`동물: ${r.animal} ${r.name}`);
  console.log('');
  console.log(`성격: ${r.personality}`);
  console.log(`강점: ${r.strength}`);
  console.log(`약점: ${r.weakness}`);
  console.log(`추천 직업: ${r.careers.join(', ')}`);
  console.log(`연애 스타일: ${r.relationship}`);
  console.log(`건강 주의: ${r.health}`);
  console.log('');
}

// 통계 출력
console.log('='.repeat(80));
console.log('[ 통계 ]');
console.log('-'.repeat(80));

console.log('');
console.log('오행 분포:');
for (const [element, count] of Object.entries(elementCount)) {
  const data = elementData[element];
  const bar = '█'.repeat(count * 3);
  console.log(`  ${data.ko.padEnd(8)} ${bar} ${count}명`);
}

console.log('');
console.log('일주(천간) 분포:');
for (const stem of STEMS) {
  const count = stemCount[stem] || 0;
  const data = dayMasterData[stem];
  if (count > 0) {
    console.log(`  ${data.animal} ${data.ko.padEnd(6)} ${count}명 - ${data.personality.ko}`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('시뮬레이션 완료');
console.log('');
console.log('참고: 실제 사주 분석은 년주, 월주, 시주를 포함하여');
console.log('더 복잡한 상호작용을 고려합니다.');
