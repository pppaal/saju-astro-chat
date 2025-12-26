"use client";

import type { TabProps } from './types';
import type { KarmaAnalysisResult } from '../analyzers/karmaAnalyzer';
import { getMatrixAnalysis } from '../analyzers';

// 헬퍼: 행성 하우스 찾기
function findPlanetHouse(planets: any[], name: string): number | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p: any) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.house || null;
}

// 헬퍼: 행성 별자리 찾기
function findPlanetSign(planets: any[], name: string): string | null {
  if (!Array.isArray(planets)) return null;
  const planet = planets.find((p: any) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.sign || null;
}

// 일간 해석 데이터
const dayMasterInterpretations: Record<string, { ko: string; en: string; soul: string; soulEn: string }> = {
  "갑": {
    ko: "갑목(甲木) 일간인 당신은 큰 나무처럼 위로 뻗어가는 에너지를 가졌어요. 리더십과 성장 본능이 강하고, 새로운 시작을 두려워하지 않아요.",
    en: "As a Gab-Wood day master, you have energy like a tall tree reaching upward. Strong leadership and growth instincts, unafraid of new beginnings.",
    soul: "개척자의 영혼 - 이번 생에서 새로운 길을 열어가는 것이 사명이에요.",
    soulEn: "Pioneer Soul - Your mission this life is to open new paths."
  },
  "을": {
    ko: "을목(乙木) 일간인 당신은 덩굴처럼 유연하고 적응력이 뛰어나요. 부드럽지만 끈질기게 목표를 향해 나아가는 힘이 있어요.",
    en: "As an Eul-Wood day master, you're flexible like a vine with excellent adaptability. Soft yet tenaciously moving toward goals.",
    soul: "조화자의 영혼 - 부드러움으로 세상을 바꾸는 것이 당신의 카르마예요.",
    soulEn: "Harmonizer Soul - Your karma is to change the world with gentleness."
  },
  "병": {
    ko: "병화(丙火) 일간인 당신은 태양처럼 강렬하고 따뜻해요. 존재감이 뚜렷하고, 주변을 밝히는 힘이 있어요.",
    en: "As a Byeong-Fire day master, you're intense and warm like the sun. Distinct presence with power to brighten surroundings.",
    soul: "빛의 영혼 - 세상에 빛을 비추고 영감을 주는 것이 이번 생의 목적이에요.",
    soulEn: "Light Soul - Your purpose this life is to shine light and inspire the world."
  },
  "정": {
    ko: "정화(丁火) 일간인 당신은 촛불처럼 은은하고 섬세해요. 집중력이 뛰어나고, 깊은 통찰력을 가졌어요.",
    en: "As a Jeong-Fire day master, you're gentle and delicate like candlelight. Excellent focus with deep insight.",
    soul: "지혜자의 영혼 - 어둠 속에서 길을 밝히는 것이 당신의 역할이에요.",
    soulEn: "Wisdom Soul - Your role is to light the way in darkness."
  },
  "무": {
    ko: "무토(戊土) 일간인 당신은 큰 산처럼 듬직하고 신뢰감이 있어요. 안정적이고 포용력이 넓어 많은 것을 품을 수 있어요.",
    en: "As a Mu-Earth day master, you're solid and reliable like a mountain. Stable with wide embrace, able to hold much.",
    soul: "수호자의 영혼 - 다른 사람들에게 안정과 지지를 주는 것이 사명이에요.",
    soulEn: "Guardian Soul - Your mission is to give stability and support to others."
  },
  "기": {
    ko: "기토(己土) 일간인 당신은 비옥한 땅처럼 생명을 키워내는 힘이 있어요. 섬세하고 실용적이며, 보살피는 능력이 뛰어나요.",
    en: "As a Gi-Earth day master, you have power to nurture life like fertile soil. Delicate, practical, excellent at caring.",
    soul: "양육자의 영혼 - 성장을 돕고 열매를 맺게 하는 것이 당신의 카르마예요.",
    soulEn: "Nurturer Soul - Your karma is to help growth and bring fruition."
  },
  "경": {
    ko: "경금(庚金) 일간인 당신은 강철처럼 단단하고 결단력이 있어요. 정의로우며, 필요할 때 과감히 행동해요.",
    en: "As a Gyeong-Metal day master, you're hard as steel with decisiveness. Righteous, acting boldly when needed.",
    soul: "전사의 영혼 - 정의를 지키고 결단하는 것이 이번 생의 과제예요.",
    soulEn: "Warrior Soul - Your task this life is to uphold justice and make decisions."
  },
  "신": {
    ko: "신금(辛金) 일간인 당신은 보석처럼 정제되고 예리해요. 완벽주의적 성향이 있고, 디테일에 강해요.",
    en: "As a Sin-Metal day master, you're refined and sharp like a jewel. Perfectionist tendency with strength in details.",
    soul: "연금술사의 영혼 - 가치 있는 것을 발견하고 다듬는 것이 사명이에요.",
    soulEn: "Alchemist Soul - Your mission is to discover and refine what's valuable."
  },
  "임": {
    ko: "임수(壬水) 일간인 당신은 큰 바다처럼 깊고 넓은 마음을 가졌어요. 지혜롭고 포용력이 있으며, 흐름을 잘 읽어요.",
    en: "As an Im-Water day master, you have a deep, wide heart like the ocean. Wise, embracing, reading flows well.",
    soul: "현자의 영혼 - 깊은 지혜를 나누고 흐름을 이끄는 것이 카르마예요.",
    soulEn: "Sage Soul - Your karma is to share deep wisdom and lead the flow."
  },
  "계": {
    ko: "계수(癸水) 일간인 당신은 맑은 샘물처럼 순수하고 직관적이에요. 감성이 풍부하고 영적인 민감성이 있어요.",
    en: "As a Gye-Water day master, you're pure and intuitive like clear spring water. Rich in emotion with spiritual sensitivity.",
    soul: "영혼의 안내자 - 보이지 않는 것을 느끼고 전달하는 것이 사명이에요.",
    soulEn: "Soul Guide - Your mission is to sense and convey the unseen."
  }
};

// 신살 구체적 해석
const shinsalInterpretations: Record<string, { ko: string; en: string; advice: string; adviceEn: string }> = {
  // 길신 (Lucky)
  "천을귀인": {
    ko: "천을귀인이 있어요! 어려울 때 귀인이 나타나 도와주는 축복받은 사주예요.",
    en: "You have Cheonul-Guiin! Blessed to have helpers appear when in difficulty.",
    advice: "어려울 때 주변에 도움을 요청하세요. 반드시 귀인이 나타나요.",
    adviceEn: "Ask for help when struggling. A helper will surely appear."
  },
  "천덕귀인": {
    ko: "천덕귀인이 있어요! 하늘의 덕을 받아 큰 재난을 피해가는 복이 있어요.",
    en: "You have Cheonduk-Guiin! Blessed with heaven's virtue to avoid major disasters.",
    advice: "선한 행동을 많이 하세요. 복이 돌아와요.",
    adviceEn: "Do good deeds often. Blessings will return to you."
  },
  "월덕귀인": {
    ko: "월덕귀인이 있어요! 어머니나 여성 귀인의 도움을 받는 사주예요.",
    en: "You have Wolduk-Guiin! Blessed with help from mother figures or female benefactors.",
    advice: "여성 멘토나 지인을 소중히 하세요.",
    adviceEn: "Cherish female mentors and acquaintances."
  },
  "문창귀인": {
    ko: "문창귀인이 있어요! 학문과 글재주에 뛰어난 재능이 있어요.",
    en: "You have Munchang-Guiin! Outstanding talent in academics and writing.",
    advice: "공부나 글쓰기를 통해 성공할 수 있어요.",
    adviceEn: "Success comes through study or writing."
  },
  "학당귀인": {
    ko: "학당귀인이 있어요! 배움에 대한 열정과 재능이 있어요.",
    en: "You have Hakdang-Guiin! Passion and talent for learning.",
    advice: "평생 배움을 멈추지 마세요. 그것이 당신의 힘이에요.",
    adviceEn: "Never stop learning. That's your power."
  },
  "역마살": {
    ko: "역마살이 있어요! 이동과 변화가 많은 운명이에요. 한 곳에 머무르기 어려워요.",
    en: "You have Yeokma-sal! A destiny with much movement and change. Hard to stay in one place.",
    advice: "여행, 해외, 이동이 잦은 일이 좋아요.",
    adviceEn: "Jobs with travel, overseas work, or frequent movement suit you."
  },
  "화개살": {
    ko: "화개살이 있어요! 예술적 감각과 영적 민감성이 뛰어나요.",
    en: "You have Hwagae-sal! Outstanding artistic sense and spiritual sensitivity.",
    advice: "창작 활동이나 영적 수행이 당신에게 맞아요.",
    adviceEn: "Creative work or spiritual practice suits you."
  },
  "장성살": {
    ko: "장성살이 있어요! 리더십과 권위가 있어요. 지도자의 운명이에요.",
    en: "You have Jangseong-sal! Leadership and authority. A leader's destiny.",
    advice: "책임지는 위치에서 능력을 발휘하세요.",
    adviceEn: "Demonstrate ability in positions of responsibility."
  },
  "금여록": {
    ko: "금여록이 있어요! 물질적 축복이 있어요. 풍요로운 삶을 살 수 있어요.",
    en: "You have Geumyeo-rok! Material blessings. Can live an abundant life.",
    advice: "돈보다 가치를 쫓으면 돈이 따라와요.",
    adviceEn: "Chase value over money, and money follows."
  },
  "천주귀인": {
    ko: "천주귀인이 있어요! 술과 음식에 복이 있고, 사교적이에요.",
    en: "You have Cheonju-Guiin! Blessed with food and drink, socially gifted.",
    advice: "네트워킹과 사교 활동을 즐기세요.",
    adviceEn: "Enjoy networking and social activities."
  },
  // 흉신 (Challenging)
  "도화살": {
    ko: "도화살이 있어요! 매력이 넘치지만 이성 문제에 주의가 필요해요.",
    en: "You have Dohwa-sal! Overflowing charm but need caution with romance.",
    advice: "매력을 예술이나 일에 활용하면 성공해요.",
    adviceEn: "Channel charm into art or work for success."
  },
  "홍염살": {
    ko: "홍염살이 있어요! 강렬한 이성 매력이 있지만 감정 조절이 중요해요.",
    en: "You have Hongyeom-sal! Intense romantic appeal but emotional control is key.",
    advice: "감정에 휩쓸리지 말고 냉정함을 유지하세요.",
    adviceEn: "Don't get swept by emotions, stay cool."
  },
  "원진살": {
    ko: "원진살이 있어요! 인간관계에서 오해를 받기 쉬워요.",
    en: "You have Wonjin-sal! Easily misunderstood in relationships.",
    advice: "오해는 소통으로 풀어요. 적극적으로 표현하세요.",
    adviceEn: "Resolve misunderstandings through communication. Express actively."
  },
  "겁살": {
    ko: "겁살이 있어요! 갑작스러운 사건이 있을 수 있지만, 극복하면 강해져요.",
    en: "You have Geop-sal! Sudden events possible, but overcoming makes you stronger.",
    advice: "위기를 기회로 바꾸는 능력을 기르세요.",
    adviceEn: "Develop ability to turn crisis into opportunity."
  },
  "백호살": {
    ko: "백호살이 있어요! 급한 성격이 있을 수 있어요. 사고에 주의하세요.",
    en: "You have Baekho-sal! May have impatient personality. Watch for accidents.",
    advice: "급하게 결정하지 말고 한 템포 쉬어가세요.",
    adviceEn: "Don't decide hastily, take a beat."
  },
  "양인살": {
    ko: "양인살이 있어요! 강한 추진력이 있지만 과격해질 수 있어요.",
    en: "You have Yangin-sal! Strong drive but can become aggressive.",
    advice: "그 에너지를 운동이나 일에 쏟으세요.",
    adviceEn: "Channel that energy into exercise or work."
  },
  "공망": {
    ko: "공망이 있어요! 어떤 영역에서 헛수고가 있을 수 있어요.",
    en: "You have Gongmang! May have futile efforts in some areas.",
    advice: "집착을 버리면 오히려 얻게 돼요.",
    adviceEn: "Letting go of attachment actually brings gain."
  },
  "괴강살": {
    ko: "괴강살이 있어요! 극단적인 성격이지만 큰 일을 해낼 수 있어요.",
    en: "You have Goegang-sal! Extreme personality but can accomplish great things.",
    advice: "큰 목표를 세우고 밀어붙이세요.",
    adviceEn: "Set big goals and push through."
  },
  "고신살": {
    ko: "고신살이 있어요! 외로움을 느끼기 쉽지만 독립심이 강해요.",
    en: "You have Gosin-sal! Easily feel lonely but strongly independent.",
    advice: "혼자 있는 시간을 창조적으로 활용하세요.",
    adviceEn: "Use alone time creatively."
  },
  "과숙살": {
    ko: "과숙살이 있어요! 배우자 덕이 약할 수 있어요.",
    en: "You have Gwasuk-sal! Spouse luck may be weak.",
    advice: "스스로의 힘으로 성취하면 더 단단해져요.",
    adviceEn: "Achieving by yourself makes you stronger."
  }
};

// 노드 하우스 해석
const northNodeHouseInterpretations: Record<number, { ko: string; en: string; lesson: string; lessonEn: string }> = {
  1: {
    ko: "노스노드 1하우스: 이번 생에서 '나'를 발견하고 자기 주도적인 삶을 사는 것이 과제예요.",
    en: "North Node 1H: This life's task is discovering 'yourself' and living self-directed.",
    lesson: "다른 사람에게 의존하던 패턴을 버리고, 나만의 정체성을 확립하세요.",
    lessonEn: "Let go of dependency patterns and establish your own identity."
  },
  2: {
    ko: "노스노드 2하우스: 자신의 가치를 인정하고 물질적 안정을 만들어가는 것이 과제예요.",
    en: "North Node 2H: Task is recognizing your worth and creating material stability.",
    lesson: "다른 사람의 자원에 의존하지 말고, 스스로 가치를 창출하세요.",
    lessonEn: "Don't depend on others' resources, create your own value."
  },
  3: {
    ko: "노스노드 3하우스: 소통하고 배우며 주변과 연결되는 것이 이번 생의 과제예요.",
    en: "North Node 3H: This life's task is communicating, learning, connecting with surroundings.",
    lesson: "높은 이상만 쫓지 말고, 일상의 대화와 배움에 집중하세요.",
    lessonEn: "Don't just chase high ideals, focus on daily conversation and learning."
  },
  4: {
    ko: "노스노드 4하우스: 내면의 안정과 가족, 집의 중요성을 깨닫는 것이 과제예요.",
    en: "North Node 4H: Task is realizing importance of inner stability, family, home.",
    lesson: "사회적 성공만 쫓지 말고, 정서적 뿌리를 내리세요.",
    lessonEn: "Don't just chase social success, put down emotional roots."
  },
  5: {
    ko: "노스노드 5하우스: 창조하고 표현하며 삶을 즐기는 것이 이번 생의 과제예요.",
    en: "North Node 5H: This life's task is creating, expressing, enjoying life.",
    lesson: "집단에 묻히지 말고, 당신만의 빛을 발산하세요.",
    lessonEn: "Don't get lost in the crowd, radiate your own light."
  },
  6: {
    ko: "노스노드 6하우스: 일상을 개선하고 봉사하며 건강을 돌보는 것이 과제예요.",
    en: "North Node 6H: Task is improving daily life, serving, caring for health.",
    lesson: "꿈에만 빠지지 말고, 현실적인 실천을 하세요.",
    lessonEn: "Don't just dream, take practical action."
  },
  7: {
    ko: "노스노드 7하우스: 파트너십과 타인과의 협력을 배우는 것이 이번 생의 과제예요.",
    en: "North Node 7H: This life's task is learning partnership and cooperation with others.",
    lesson: "혼자 다 하려 하지 말고, 함께하는 법을 배우세요.",
    lessonEn: "Don't try to do everything alone, learn to work together."
  },
  8: {
    ko: "노스노드 8하우스: 깊은 변화와 타인과의 친밀한 연결을 경험하는 것이 과제예요.",
    en: "North Node 8H: Task is experiencing deep transformation and intimate connection with others.",
    lesson: "물질적 안정에 집착하지 말고, 깊은 변화를 받아들이세요.",
    lessonEn: "Don't cling to material security, embrace deep change."
  },
  9: {
    ko: "노스노드 9하우스: 더 넓은 세계를 탐험하고 의미를 찾는 것이 이번 생의 과제예요.",
    en: "North Node 9H: This life's task is exploring wider world and finding meaning.",
    lesson: "세부적인 것에 갇히지 말고, 큰 그림을 보세요.",
    lessonEn: "Don't get trapped in details, see the big picture."
  },
  10: {
    ko: "노스노드 10하우스: 사회적 역할을 찾고 성취하는 것이 이번 생의 과제예요.",
    en: "North Node 10H: This life's task is finding social role and achieving.",
    lesson: "가족에만 머물지 말고, 세상에 나가 당신의 역할을 하세요.",
    lessonEn: "Don't just stay with family, go out and play your role in the world."
  },
  11: {
    ko: "노스노드 11하우스: 더 큰 공동체와 미래 비전을 위해 일하는 것이 과제예요.",
    en: "North Node 11H: Task is working for larger community and future vision.",
    lesson: "개인적 영광만 쫓지 말고, 함께 나누는 법을 배우세요.",
    lessonEn: "Don't just chase personal glory, learn to share together."
  },
  12: {
    ko: "노스노드 12하우스: 영적 성장과 내면의 평화를 찾는 것이 이번 생의 과제예요.",
    en: "North Node 12H: This life's task is finding spiritual growth and inner peace.",
    lesson: "외부 세계에만 집중하지 말고, 내면의 여행을 떠나세요.",
    lessonEn: "Don't just focus on outer world, embark on inner journey."
  }
};

// 격국 해석
const geokgukInterpretations: Record<string, { ko: string; en: string }> = {
  "비견격": { ko: "비견격은 독립적이고 경쟁적인 에너지예요. 스스로의 힘으로 성취해야 하는 운명이에요.", en: "Bigyeon-gyeok has independent, competitive energy. Destined to achieve through your own power." },
  "겁재격": { ko: "겁재격은 강한 추진력이 있지만 재물에 대한 시험이 있어요. 나눔을 배우면 풍요로워져요.", en: "Geopjae-gyeok has strong drive but tests with money. Learning to share brings abundance." },
  "식신격": { ko: "식신격은 표현력과 창의력이 뛰어나요. 자신을 표현하며 사는 것이 중요해요.", en: "Siksin-gyeok excels in expression and creativity. Living while expressing yourself is important." },
  "상관격": { ko: "상관격은 반항적이고 자유로운 영혼이에요. 틀을 깨는 것이 당신의 역할이에요.", en: "Sanggwan-gyeok is a rebellious, free soul. Breaking the mold is your role." },
  "편재격": { ko: "편재격은 재물을 다루는 능력이 있어요. 사업이나 투자에 재능이 있어요.", en: "Pyeonjae-gyeok has ability to handle money. Talented in business or investment." },
  "정재격": { ko: "정재격은 안정적인 재물운이에요. 꾸준히 모으면 부를 축적할 수 있어요.", en: "Jeongjae-gyeok has stable money luck. Consistent saving accumulates wealth." },
  "편관격": { ko: "편관격은 권력과 리더십의 에너지예요. 책임지는 자리에서 빛나요.", en: "Pyeongwan-gyeok has power and leadership energy. Shines in positions of responsibility." },
  "정관격": { ko: "정관격은 정직하고 규율적인 에너지예요. 공적인 역할에서 성공해요.", en: "Jeonggwan-gyeok has honest, disciplined energy. Succeeds in public roles." },
  "편인격": { ko: "편인격은 특이하고 독창적인 사고를 가졌어요. 일반적이지 않은 길에서 성공해요.", en: "Pyeonin-gyeok has unique, original thinking. Succeeds on unconventional paths." },
  "정인격": { ko: "정인격은 학문과 배움에 복이 있어요. 가르치거나 배우는 일이 잘 맞아요.", en: "Jeongin-gyeok is blessed in academics and learning. Teaching or learning suits you well." }
};

// 용신 상세 해석
const yongsinInterpretations: Record<string, { ko: string; en: string; advice: string; adviceEn: string }> = {
  "목": {
    ko: "목(木) 에너지가 필요해요. 당신의 사주에 목기운이 부족하거나 목이 용신이에요. 목은 성장, 시작, 확장의 에너지예요.",
    en: "You need Wood (木) energy. Your Saju lacks wood energy or wood is your Yongsin. Wood represents growth, beginnings, expansion.",
    advice: "초록색 옷을 입고, 동쪽 방향이 좋아요. 아침 시간(5-9시)에 활동하고, 새로운 것을 시작하세요. 나무나 식물 근처가 좋아요.",
    adviceEn: "Wear green, east direction is favorable. Be active in morning (5-9am), start new things. Being near trees or plants helps."
  },
  "화": {
    ko: "화(火) 에너지가 필요해요. 열정, 표현, 빛의 에너지가 당신에게 도움이 돼요. 더 적극적으로 자신을 드러내세요.",
    en: "You need Fire (火) energy. Passion, expression, light energy helps you. Express yourself more actively.",
    advice: "빨간색/주황색 옷을 입고, 남쪽 방향이 좋아요. 낮 시간(9시-오후 3시)에 활동하고, 사람들 앞에 나서세요.",
    adviceEn: "Wear red/orange, south direction is favorable. Be active during day (9am-3pm), step in front of people."
  },
  "토": {
    ko: "토(土) 에너지가 필요해요. 안정, 중심, 기반의 에너지가 당신에게 도움이 돼요. 급하게 가지 말고 기반을 다지세요.",
    en: "You need Earth (土) energy. Stability, centering, foundation energy helps you. Don't rush, build your foundation.",
    advice: "노란색/베이지색 옷을 입고, 중앙이 좋아요. 사계절 환절기에 유의하고, 부동산/땅과 관련된 일이 좋아요.",
    adviceEn: "Wear yellow/beige, center is favorable. Watch seasonal transitions, real estate/land-related work suits you."
  },
  "금": {
    ko: "금(金) 에너지가 필요해요. 결단, 정리, 수확의 에너지가 당신에게 도움이 돼요. 과감하게 결정하고 잘라내세요.",
    en: "You need Metal (金) energy. Decision, organization, harvest energy helps you. Decide boldly and cut what needs cutting.",
    advice: "흰색/금색 옷을 입고, 서쪽 방향이 좋아요. 오후(3-7시)에 결정을 내리고, 정리정돈을 하세요.",
    adviceEn: "Wear white/gold, west direction is favorable. Make decisions in afternoon (3-7pm), organize and declutter."
  },
  "수": {
    ko: "수(水) 에너지가 필요해요. 지혜, 유연함, 흐름의 에너지가 당신에게 도움이 돼요. 물처럼 유연하게 흘러가세요.",
    en: "You need Water (水) energy. Wisdom, flexibility, flow energy helps you. Flow flexibly like water.",
    advice: "검은색/파란색 옷을 입고, 북쪽 방향이 좋아요. 밤 시간(9시-새벽 1시)에 사색하고, 물 근처가 좋아요.",
    adviceEn: "Wear black/blue, north direction is favorable. Contemplate at night (9pm-1am), being near water helps."
  },
  "wood": {
    ko: "목(木) 에너지가 필요해요. 당신의 사주에 목기운이 부족하거나 목이 용신이에요. 목은 성장, 시작, 확장의 에너지예요.",
    en: "You need Wood (木) energy. Your Saju lacks wood energy or wood is your Yongsin. Wood represents growth, beginnings, expansion.",
    advice: "초록색 옷을 입고, 동쪽 방향이 좋아요. 아침 시간(5-9시)에 활동하고, 새로운 것을 시작하세요.",
    adviceEn: "Wear green, east direction is favorable. Be active in morning (5-9am), start new things."
  },
  "fire": {
    ko: "화(火) 에너지가 필요해요. 열정, 표현, 빛의 에너지가 당신에게 도움이 돼요.",
    en: "You need Fire (火) energy. Passion, expression, light energy helps you.",
    advice: "빨간색 옷을 입고, 남쪽 방향이 좋아요. 사람들 앞에 나서세요.",
    adviceEn: "Wear red, south direction is favorable. Step in front of people."
  },
  "earth": {
    ko: "토(土) 에너지가 필요해요. 안정과 기반의 에너지가 당신에게 도움이 돼요.",
    en: "You need Earth (土) energy. Stability and foundation energy helps you.",
    advice: "노란색 옷을 입고, 부동산/땅과 관련된 일이 좋아요.",
    adviceEn: "Wear yellow, real estate/land-related work suits you."
  },
  "metal": {
    ko: "금(金) 에너지가 필요해요. 결단과 정리의 에너지가 당신에게 도움이 돼요.",
    en: "You need Metal (金) energy. Decision and organization energy helps you.",
    advice: "흰색 옷을 입고, 과감하게 결정하세요.",
    adviceEn: "Wear white, decide boldly."
  },
  "water": {
    ko: "수(水) 에너지가 필요해요. 지혜와 유연함의 에너지가 당신에게 도움이 돼요.",
    en: "You need Water (水) energy. Wisdom and flexibility energy helps you.",
    advice: "검은색/파란색 옷을 입고, 북쪽 방향이 좋아요.",
    adviceEn: "Wear black/blue, north direction is favorable."
  }
};

// 십신 상세 해석
const sibsinInterpretations: Record<string, { ko: string; en: string; role: string; roleEn: string }> = {
  "비견": {
    ko: "비견(比肩)은 '나와 같은 것'이에요. 동료, 경쟁자, 형제의 에너지예요. 독립심이 강하고 자기 주장이 뚜렷해요.",
    en: "Bigyeon means 'same as me'. Energy of peers, competitors, siblings. Strong independence and clear self-assertion.",
    role: "독립적으로 일하거나 동료와 협력할 때",
    roleEn: "When working independently or collaborating with peers"
  },
  "겁재": {
    ko: "겁재(劫財)는 '재물을 빼앗는 것'이에요. 경쟁적이고 추진력이 있지만, 재물이 새어나갈 수 있어요.",
    en: "Geopjae means 'robbing wealth'. Competitive with drive, but wealth may leak out.",
    role: "적극적으로 나서야 할 때, 경쟁 상황",
    roleEn: "When needing to step up, competitive situations"
  },
  "식신": {
    ko: "식신(食神)은 '먹여주는 신'이에요. 표현력, 창의력, 재능의 에너지예요. 자연스럽게 능력이 발휘돼요.",
    en: "Siksin means 'feeding god'. Energy of expression, creativity, talent. Abilities naturally unfold.",
    role: "창작, 표현, 가르침, 요리 등 재능을 발휘할 때",
    roleEn: "When expressing talents in creation, expression, teaching, cooking"
  },
  "상관": {
    ko: "상관(傷官)은 '관을 상하게 하는 것'이에요. 반항적이고 자유분방하며, 틀을 깨는 에너지예요.",
    en: "Sanggwan means 'hurting officials'. Rebellious, free-spirited, breaking molds.",
    role: "혁신, 변화, 예술, 기존 틀을 깰 때",
    roleEn: "When innovating, changing, in art, breaking existing frameworks"
  },
  "편재": {
    ko: "편재(偏財)는 '기울어진 재물'이에요. 횡재, 투기, 사업의 에너지예요. 돈이 크게 들어오고 크게 나가요.",
    en: "Pyeonjae means 'tilted wealth'. Energy of windfalls, speculation, business. Money comes big, goes big.",
    role: "사업, 투자, 유동적인 재물을 다룰 때",
    roleEn: "When dealing with business, investment, liquid assets"
  },
  "정재": {
    ko: "정재(正財)는 '바른 재물'이에요. 월급, 저축, 안정적인 수입의 에너지예요. 꾸준히 모이는 돈이에요.",
    en: "Jeongjae means 'proper wealth'. Energy of salary, savings, stable income. Money that steadily accumulates.",
    role: "안정적인 수입, 저축, 장기 투자할 때",
    roleEn: "When earning stable income, saving, making long-term investments"
  },
  "편관": {
    ko: "편관(偏官)은 '기울어진 관직'이에요. 칠살이라고도 해요. 권위, 압박, 도전의 에너지예요.",
    en: "Pyeongwan means 'tilted official'. Also called Seven Killings. Energy of authority, pressure, challenge.",
    role: "리더십을 발휘하거나 도전에 맞설 때",
    roleEn: "When exercising leadership or facing challenges"
  },
  "정관": {
    ko: "정관(正官)은 '바른 관직'이에요. 명예, 규율, 책임의 에너지예요. 사회적 인정을 받아요.",
    en: "Jeonggwan means 'proper official'. Energy of honor, discipline, responsibility. Receives social recognition.",
    role: "공식적인 자리, 승진, 사회적 역할을 할 때",
    roleEn: "When in official positions, promotions, taking social roles"
  },
  "편인": {
    ko: "편인(偏印)은 '기울어진 도장'이에요. 독창성, 특이함, 비주류의 에너지예요.",
    en: "Pyeonin means 'tilted seal'. Energy of originality, uniqueness, being unconventional.",
    role: "독창적인 아이디어, 비주류 분야에서 활동할 때",
    roleEn: "When having original ideas, working in unconventional fields"
  },
  "정인": {
    ko: "정인(正印)은 '바른 도장'이에요. 학문, 어머니, 보호의 에너지예요. 배움과 지원을 받아요.",
    en: "Jeongin means 'proper seal'. Energy of academics, mother, protection. Receives learning and support.",
    role: "공부, 자격증, 멘토의 도움을 받을 때",
    roleEn: "When studying, getting certifications, receiving mentor's help"
  }
};

export default function KarmaTab({ saju, astro, lang, isKo, data }: TabProps) {
  const karmaAnalysis = data.karmaAnalysis as KarmaAnalysisResult | null;
  const matrixAnalysis = getMatrixAnalysis(saju, astro, lang);

  // 직접 사주 데이터 추출
  const dayMaster = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || saju?.fourPillars?.day?.heavenlyStem || "";
  const geokguk = saju?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name || geokguk?.type || "";
  const sibsin = saju?.sibsin || {};
  const yongsin = saju?.advancedAnalysis?.yongsin;
  const sinsal = saju?.advancedAnalysis?.sinsal || {};

  // 점성술 데이터 추출
  const planets = astro?.planets || [];
  const northNodeHouse = findPlanetHouse(planets, 'north node') || findPlanetHouse(planets, 'northnode');
  const southNodeHouse = northNodeHouse ? (northNodeHouse > 6 ? northNodeHouse - 6 : northNodeHouse + 6) : null;
  const chironSign = findPlanetSign(planets, 'chiron');
  const saturnHouse = findPlanetHouse(planets, 'saturn');
  const plutoHouse = findPlanetHouse(planets, 'pluto');

  // 신살 추출
  const luckyList = sinsal?.luckyList || [];
  const unluckyList = sinsal?.unluckyList || [];

  if (!karmaAnalysis) {
    return (
      <div className="p-6 text-center text-gray-400">
        {isKo ? "카르마 분석을 위한 데이터가 충분하지 않습니다." : "Not enough data for karma analysis."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 당신의 운명 DNA - 핵심 데이터 요약 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/30 border border-indigo-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🧬</span>
          <h3 className="text-lg font-bold text-indigo-300">
            {isKo ? "당신의 운명 DNA" : "Your Destiny DNA"}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* 일간 */}
          {dayMaster && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-purple-400 text-xs mb-1">{isKo ? "일간 (나)" : "Day Master"}</p>
              <p className="text-xl font-bold text-purple-300">{dayMaster}</p>
            </div>
          )}
          {/* 격국 */}
          {geokName && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-blue-400 text-xs mb-1">{isKo ? "격국 (틀)" : "Frame"}</p>
              <p className="text-sm font-bold text-blue-300">{geokName}</p>
            </div>
          )}
          {/* North Node */}
          {northNodeHouse && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
              <p className="text-teal-400 text-xs mb-1">{isKo ? "노스노드" : "North Node"}</p>
              <p className="text-xl font-bold text-teal-300">{northNodeHouse}H</p>
            </div>
          )}
          {/* Saturn */}
          {saturnHouse && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-amber-400 text-xs mb-1">{isKo ? "토성" : "Saturn"}</p>
              <p className="text-xl font-bold text-amber-300">{saturnHouse}H</p>
            </div>
          )}
        </div>

        {/* 일간 구체적 해석 */}
        {dayMaster && dayMasterInterpretations[dayMaster] && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-3">
            <p className="text-purple-300 text-sm leading-relaxed mb-2">
              {isKo ? dayMasterInterpretations[dayMaster].ko : dayMasterInterpretations[dayMaster].en}
            </p>
            <p className="text-indigo-400 text-sm font-medium">
              ✨ {isKo ? dayMasterInterpretations[dayMaster].soul : dayMasterInterpretations[dayMaster].soulEn}
            </p>
          </div>
        )}

        {/* 격국 구체적 해석 */}
        {geokName && geokgukInterpretations[geokName] && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3">
            <p className="text-blue-300 text-sm leading-relaxed">
              {isKo ? geokgukInterpretations[geokName].ko : geokgukInterpretations[geokName].en}
            </p>
          </div>
        )}

        {/* 노스노드 구체적 해석 */}
        {northNodeHouse && northNodeHouseInterpretations[northNodeHouse] && (
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 mb-3">
            <p className="text-teal-300 text-sm leading-relaxed mb-2">
              {isKo ? northNodeHouseInterpretations[northNodeHouse].ko : northNodeHouseInterpretations[northNodeHouse].en}
            </p>
            <p className="text-teal-400 text-xs">
              💡 {isKo ? northNodeHouseInterpretations[northNodeHouse].lesson : northNodeHouseInterpretations[northNodeHouse].lessonEn}
            </p>
          </div>
        )}

        {/* 십신 분포 - 상세 해석 포함 */}
        {(sibsin.year || sibsin.month || sibsin.hour) && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-gray-500/20 mb-3">
            <p className="text-gray-300 font-bold text-sm mb-3 flex items-center gap-2">
              <span>🎭</span> {isKo ? "십신 분포 (에너지 배치)" : "Sibsin Distribution"}
            </p>
            <div className="space-y-3">
              {sibsin.year && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-purple-400 text-xs font-bold">{isKo ? "년주" : "Year"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold">{sibsin.year}</span>
                  </div>
                  {sibsinInterpretations[sibsin.year] && (
                    <>
                      <p className="text-purple-200 text-xs leading-relaxed">
                        {isKo ? sibsinInterpretations[sibsin.year].ko : sibsinInterpretations[sibsin.year].en}
                      </p>
                      <p className="text-purple-400 text-xs mt-1">
                        📍 {isKo ? `조상/사회: ${sibsinInterpretations[sibsin.year].role}` : `Ancestors/Society: ${sibsinInterpretations[sibsin.year].roleEn}`}
                      </p>
                    </>
                  )}
                </div>
              )}
              {sibsin.month && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400 text-xs font-bold">{isKo ? "월주" : "Month"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold">{sibsin.month}</span>
                  </div>
                  {sibsinInterpretations[sibsin.month] && (
                    <>
                      <p className="text-blue-200 text-xs leading-relaxed">
                        {isKo ? sibsinInterpretations[sibsin.month].ko : sibsinInterpretations[sibsin.month].en}
                      </p>
                      <p className="text-blue-400 text-xs mt-1">
                        📍 {isKo ? `부모/청년기: ${sibsinInterpretations[sibsin.month].role}` : `Parents/Youth: ${sibsinInterpretations[sibsin.month].roleEn}`}
                      </p>
                    </>
                  )}
                </div>
              )}
              {sibsin.day && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400 text-xs font-bold">{isKo ? "일주" : "Day"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/30 text-green-300 text-xs font-bold">{sibsin.day}</span>
                  </div>
                  {sibsinInterpretations[sibsin.day] && (
                    <>
                      <p className="text-green-200 text-xs leading-relaxed">
                        {isKo ? sibsinInterpretations[sibsin.day].ko : sibsinInterpretations[sibsin.day].en}
                      </p>
                      <p className="text-green-400 text-xs mt-1">
                        📍 {isKo ? `배우자/중년: ${sibsinInterpretations[sibsin.day].role}` : `Spouse/Middle-age: ${sibsinInterpretations[sibsin.day].roleEn}`}
                      </p>
                    </>
                  )}
                </div>
              )}
              {sibsin.hour && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-400 text-xs font-bold">{isKo ? "시주" : "Hour"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-xs font-bold">{sibsin.hour}</span>
                  </div>
                  {sibsinInterpretations[sibsin.hour] && (
                    <>
                      <p className="text-orange-200 text-xs leading-relaxed">
                        {isKo ? sibsinInterpretations[sibsin.hour].ko : sibsinInterpretations[sibsin.hour].en}
                      </p>
                      <p className="text-orange-400 text-xs mt-1">
                        📍 {isKo ? `자녀/말년: ${sibsinInterpretations[sibsin.hour].role}` : `Children/Later years: ${sibsinInterpretations[sibsin.hour].roleEn}`}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 용신 - 상세 해석 포함 */}
        {yongsin && (() => {
          const yongsinStr = typeof yongsin === 'object' ? (yongsin.primary || yongsin.main || "") : String(yongsin);
          const yongsinKey = yongsinStr.toLowerCase().includes("목") ? "목"
            : yongsinStr.toLowerCase().includes("화") ? "화"
            : yongsinStr.toLowerCase().includes("토") ? "토"
            : yongsinStr.toLowerCase().includes("금") ? "금"
            : yongsinStr.toLowerCase().includes("수") ? "수"
            : yongsinStr.toLowerCase().includes("wood") ? "wood"
            : yongsinStr.toLowerCase().includes("fire") ? "fire"
            : yongsinStr.toLowerCase().includes("earth") ? "earth"
            : yongsinStr.toLowerCase().includes("metal") ? "metal"
            : yongsinStr.toLowerCase().includes("water") ? "water"
            : "";
          const yongsinInterp = yongsinInterpretations[yongsinKey];

          return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
              <p className="text-yellow-400 font-bold text-sm mb-2 flex items-center gap-2">
                <span>⚡</span> {isKo ? "용신 (필요한 에너지)" : "Yongsin (Needed Energy)"}
              </p>
              <p className="text-yellow-300 text-lg font-bold mb-2">{yongsinStr}</p>
              {yongsinInterp ? (
                <>
                  <p className="text-yellow-200 text-sm leading-relaxed mb-3">
                    {isKo ? yongsinInterp.ko : yongsinInterp.en}
                  </p>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-300 text-xs">
                      💡 {isKo ? "실천 방법: " : "How to apply: "}
                      <span className="text-amber-200">
                        {isKo ? yongsinInterp.advice : yongsinInterp.adviceEn}
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-yellow-200 text-sm">
                  {isKo ? "이 에너지를 보충하면 운이 좋아져요." : "Supplementing this energy improves your fortune."}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* 영혼 유형 */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{karmaAnalysis.soulType.emoji}</span>
          <h3 className="text-lg font-bold text-violet-300">
            {isKo ? "당신의 영혼 유형" : "Your Soul Type"}
          </h3>
          {geokName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
              {isKo ? `${geokName} 기반` : `Based on ${geokName}`}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-xl font-bold text-purple-300">{karmaAnalysis.soulType.title}</p>
          <p className="text-gray-200 text-base leading-relaxed">{karmaAnalysis.soulType.description}</p>
          {karmaAnalysis.soulType.draconicSoul && (
            <p className="text-purple-400 text-sm">
              {isKo ? "드라코닉 영혼: " : "Draconic Soul: "}{karmaAnalysis.soulType.draconicSoul}
            </p>
          )}
          {karmaAnalysis.soulType.traits && karmaAnalysis.soulType.traits.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {karmaAnalysis.soulType.traits.map((trait, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm">{trait}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 영혼의 사명 */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-blue-900/30 border border-indigo-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌌</span>
          <h3 className="text-lg font-bold text-indigo-300">
            {isKo ? "이번 생의 사명" : "This Life's Mission"}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-bold text-sm mb-2">
              {isKo ? "핵심 사명" : "Core Mission"}
            </p>
            <p className="text-gray-200 text-sm leading-relaxed">{karmaAnalysis.soulMission.core}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-300 font-bold text-sm mb-2">
                {isKo ? "표현 방식" : "Expression"}
              </p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.soulMission.expression}</p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-cyan-300 font-bold text-sm mb-2">
                {isKo ? "성취의 순간" : "Fulfillment"}
              </p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.soulMission.fulfillment}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 성장 경로 (North Node) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-teal-900/20 border border-teal-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🧭</span>
          <h3 className="text-lg font-bold text-teal-300">
            {isKo ? "이번 생의 성장 방향" : "Growth Direction This Life"}
          </h3>
          {northNodeHouse && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
              North Node {northNodeHouse}H
            </span>
          )}
        </div>

        {/* 노드 축 시각화 */}
        {northNodeHouse && southNodeHouse && (
          <div className="flex items-center justify-center gap-4 mb-4 p-3 rounded-xl bg-white/5">
            <div className="text-center">
              <p className="text-gray-500 text-xs">{isKo ? "과거 (놓아줄 것)" : "Past (Let Go)"}</p>
              <p className="text-rose-400 font-bold">South Node {southNodeHouse}H</p>
            </div>
            <div className="text-gray-600">→</div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">{isKo ? "미래 (성장 방향)" : "Future (Growth)"}</p>
              <p className="text-teal-400 font-bold">North Node {northNodeHouse}H</p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <p className="text-teal-300 font-bold text-sm mb-2">
              🌟 {isKo ? "나아가야 할 방향" : "Direction to Go"}
            </p>
            <p className="text-gray-200 text-sm leading-relaxed">{karmaAnalysis.growthPath.direction}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <p className="text-slate-300 font-bold text-sm mb-2">
              🔙 {isKo ? "전생의 패턴 (놓아줘야 할 것)" : "Past Life Pattern (To Let Go)"}
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">{karmaAnalysis.growthPath.pastPattern}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-300 font-bold text-sm mb-2">
              💎 {isKo ? "핵심 교훈" : "Core Lesson"}
            </p>
            <p className="text-gray-200 text-sm leading-relaxed">{karmaAnalysis.growthPath.lesson}</p>
          </div>
          {karmaAnalysis.growthPath.practicalAdvice && karmaAnalysis.growthPath.practicalAdvice.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
              <p className="text-teal-300 font-bold text-sm mb-3">
                ✅ {isKo ? "실천 조언" : "Practical Advice"}
              </p>
              <ul className="space-y-2">
                {karmaAnalysis.growthPath.practicalAdvice.map((advice, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-teal-400 mt-0.5">•</span>
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 치유해야 할 상처 (Chiron) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🩹</span>
          <h3 className="text-lg font-bold text-rose-300">
            {isKo ? "치유해야 할 상처 (Chiron)" : "Wound to Heal (Chiron)"}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-300 font-bold text-sm mb-2">
              💔 {isKo ? "깊은 상처" : "Deep Wound"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.woundToHeal.wound}</p>
          </div>
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <p className="text-pink-300 font-bold text-sm mb-2">
              💝 {isKo ? "치유의 길" : "Healing Path"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.woundToHeal.healingPath}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-rose-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">🎁</span>
              <span>
                <span className="text-purple-300 font-bold">{isKo ? "치유 후 선물: " : "Gift After Healing: "}</span>
                <span className="text-gray-300">{karmaAnalysis.woundToHeal.gift}</span>
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 토성 레슨 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🪐</span>
          <h3 className="text-lg font-bold text-amber-300">
            {isKo ? "토성이 가르치는 인생 수업" : "Saturn's Life Lesson"}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-bold text-sm mb-2">
              📚 {isKo ? "핵심 레슨" : "Core Lesson"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.saturnLesson.lesson}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-orange-300 font-bold text-sm mb-2">
                ⏰ {isKo ? "시험의 시기" : "Testing Times"}
              </p>
              <p className="text-gray-400 text-sm">{karmaAnalysis.saturnLesson.timing}</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 font-bold text-sm mb-2">
                🏆 {isKo ? "마스터리 보상" : "Mastery Reward"}
              </p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.saturnLesson.mastery}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 플루토 변환 */}
      {karmaAnalysis.plutoTransform && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔥</span>
            <h3 className="text-lg font-bold text-gray-300">
              {isKo ? "플루토의 변환 영역" : "Pluto's Transformation Area"}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="text-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <p className="text-gray-400 text-sm mb-2">{isKo ? "변환 영역" : "Transformation Area"}</p>
              <p className="text-xl font-bold text-gray-200">{karmaAnalysis.plutoTransform.area}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-red-900/20 border border-red-700/20 text-center">
                <p className="text-red-400 text-xs mb-1">{isKo ? "죽여야 할 것" : "Must Die"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.plutoTransform.death}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-900/20 border border-green-700/20 text-center">
                <p className="text-green-400 text-xs mb-1">{isKo ? "다시 태어날 것" : "Will Rebirth"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.plutoTransform.rebirth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전생 테마 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔮</span>
          <h3 className="text-lg font-bold text-purple-300">
            {isKo ? "전생에서 가져온 에너지" : "Energy from Past Lives"}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold text-sm mb-2">
              🌀 {isKo ? "전생의 모습" : "Past Life Glimpse"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.pastLifeTheme.likely}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-violet-300 font-bold text-sm mb-2">
                ✨ {isKo ? "가져온 재능" : "Brought Talents"}
              </p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.talents}</p>
            </div>
            <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
              <p className="text-fuchsia-300 font-bold text-sm mb-2">
                📖 {isKo ? "이번 생의 숙제" : "This Life's Homework"}
              </p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.lessons}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 운명적 인연 */}
      {karmaAnalysis.fatedConnections && karmaAnalysis.fatedConnections.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💫</span>
            <h3 className="text-lg font-bold text-pink-300">
              {isKo ? "운명적 인연의 징후" : "Signs of Fated Connections"}
            </h3>
          </div>
          <div className="space-y-3">
            {karmaAnalysis.fatedConnections.map((connection, i) => (
              <div key={i} className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-pink-300 font-bold text-sm mb-2">{connection.type}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{connection.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카르마 인사이트 점수 */}
      {karmaAnalysis.karmaScore > 50 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-bold text-violet-300">
              {isKo ? "카르마 인사이트 깊이" : "Karma Insight Depth"}
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-violet-300 font-bold text-sm">{isKo ? "분석 깊이" : "Analysis Depth"}</p>
              <span className="text-2xl font-bold text-violet-400">{karmaAnalysis.karmaScore}%</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
                style={{ width: `${karmaAnalysis.karmaScore}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {isKo
                ? karmaAnalysis.karmaScore >= 80 ? "매우 깊은 영혼의 여정이 보여요!"
                  : karmaAnalysis.karmaScore >= 60 ? "카르마 패턴이 잘 드러나고 있어요."
                  : "더 많은 출생 정보가 있으면 더 깊은 분석이 가능해요."
                : karmaAnalysis.karmaScore >= 80 ? "A very deep soul journey is revealed!"
                  : karmaAnalysis.karmaScore >= 60 ? "Karma patterns are showing clearly."
                  : "More birth data would enable deeper analysis."}
            </p>
          </div>
        </div>
      )}

      {/* 영혼 여정 타임라인 */}
      {karmaAnalysis.soulJourney && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌀</span>
            <h3 className="text-lg font-bold text-cyan-300">
              {isKo ? "영혼의 여정 타임라인" : "Soul Journey Timeline"}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="relative pl-8 border-l-2 border-cyan-500/30">
              <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-cyan-500/30 border-2 border-cyan-400"></div>
              <div className="p-3 rounded-xl bg-cyan-500/10 mb-4">
                <p className="text-cyan-300 font-bold text-sm mb-1">🔮 {isKo ? "전생" : "Past Life"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.soulJourney.pastLife}</p>
              </div>
              <div className="absolute -left-2.5 top-[calc(50%-10px)] w-5 h-5 rounded-full bg-teal-500/50 border-2 border-teal-400"></div>
              <div className="p-3 rounded-xl bg-teal-500/10 mb-4">
                <p className="text-teal-300 font-bold text-sm mb-1">🌟 {isKo ? "현재 생" : "Current Life"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.soulJourney.currentLife}</p>
              </div>
              <div className="absolute -left-2.5 bottom-0 w-5 h-5 rounded-full bg-emerald-500/50 border-2 border-emerald-400"></div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <p className="text-emerald-300 font-bold text-sm mb-1">✨ {isKo ? "미래 잠재력" : "Future Potential"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.soulJourney.futurePotential}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 font-bold text-sm mb-1">⚡ {isKo ? "주요 전환점" : "Key Transition"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.soulJourney.keyTransition}</p>
            </div>
          </div>
        </div>
      )}

      {/* 신살 기반 운명 패턴 */}
      {(luckyList.length > 0 || unluckyList.length > 0) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-orange-900/20 border border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚡</span>
            <h3 className="text-lg font-bold text-orange-300">
              {isKo ? "타고난 운명 패턴 (신살)" : "Innate Destiny Patterns (Shinsal)"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "당신의 사주에 새겨진 특별한 별들이에요. 이것들이 삶의 패턴을 만들어요."
              : "Special stars inscribed in your Saju. These create life patterns."}
          </p>

          {/* 길신 (Lucky Patterns) - 구체적 해석 포함 */}
          {luckyList.length > 0 && (
            <div className="mb-4">
              <p className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                <span>✨</span> {isKo ? "길신 (축복의 별)" : "Lucky Stars"}
              </p>
              <div className="space-y-3">
                {luckyList.map((item: any, i: number) => {
                  const name = typeof item === 'string' ? item : item?.name || item?.shinsal || '';
                  const interp = shinsalInterpretations[name];
                  return name ? (
                    <div key={i} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/30 text-green-300 text-xs font-bold">
                          {name}
                        </span>
                      </div>
                      {interp ? (
                        <>
                          <p className="text-green-200 text-sm mb-2">
                            {isKo ? interp.ko : interp.en}
                          </p>
                          <p className="text-green-400 text-xs">
                            💡 {isKo ? interp.advice : interp.adviceEn}
                          </p>
                        </>
                      ) : (
                        <p className="text-green-200 text-sm">
                          {isKo ? "행운과 축복을 가져다주는 별이에요." : "A star that brings luck and blessings."}
                        </p>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* 흉신 (Challenging Patterns) - 구체적 해석 포함 */}
          {unluckyList.length > 0 && (
            <div className="mb-4">
              <p className="text-orange-400 font-bold text-sm mb-3 flex items-center gap-2">
                <span>⚠️</span> {isKo ? "흉신 (도전의 별)" : "Challenging Stars"}
              </p>
              <div className="space-y-3">
                {unluckyList.map((item: any, i: number) => {
                  const name = typeof item === 'string' ? item : item?.name || item?.shinsal || '';
                  const interp = shinsalInterpretations[name];
                  return name ? (
                    <div key={i} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-xs font-bold">
                          {name}
                        </span>
                      </div>
                      {interp ? (
                        <>
                          <p className="text-orange-200 text-sm mb-2">
                            {isKo ? interp.ko : interp.en}
                          </p>
                          <p className="text-amber-400 text-xs">
                            🛡️ {isKo ? interp.advice : interp.adviceEn}
                          </p>
                        </>
                      ) : (
                        <p className="text-orange-200 text-sm">
                          {isKo ? "인식하고 대응하면 오히려 성장의 기회가 돼요." : "Awareness and response turn this into growth opportunity."}
                        </p>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-gray-400 text-xs">
              {isKo
                ? "💡 흉신은 '나쁜 것'이 아니에요. 오히려 성장의 기회! 인식하면 힘이 돼요."
                : "💡 Challenging stars aren't 'bad'—they're growth opportunities! Awareness makes them power."}
            </p>
          </div>
        </div>
      )}

      {/* 카르마 해제 힌트 */}
      {karmaAnalysis.karmaRelease && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-green-900/20 border border-green-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔓</span>
            <h3 className="text-lg font-bold text-green-300">
              {isKo ? "카르마 해제 가이드" : "Karma Release Guide"}
            </h3>
            {chironSign && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                Chiron in {chironSign}
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-300 font-bold text-sm mb-2">🚧 {isKo ? "막혀 있는 것" : "Blockage"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.karmaRelease.blockage}</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 font-bold text-sm mb-2">💊 {isKo ? "치유의 방법" : "Healing Method"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.karmaRelease.healing}</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-green-300 font-bold text-sm mb-2">🌈 {isKo ? "돌파구" : "Breakthrough"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{karmaAnalysis.karmaRelease.breakthrough}</p>
            </div>
          </div>
        </div>
      )}

      {/* 동서양 카르마 교차점 */}
      {matrixAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">☯️</span>
            <h3 className="text-lg font-bold text-fuchsia-300">
              {isKo ? "동서양 운명 교차점" : "East-West Destiny Crossroads"}
            </h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "동양 사주와 서양 점성술이 만나는 특별한 교차점입니다."
              : "Special crossroads where Eastern Saju meets Western Astrology."}
          </p>

          {/* 오행-원소 융합 */}
          {matrixAnalysis.elementFusions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                <span>🌀</span> {isKo ? "오행 × 원소 융합" : "Five Elements × Elements Fusion"}
              </p>
              <div className="space-y-2">
                {matrixAnalysis.elementFusions.map((fusion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: `${fusion.fusion.color}10`,
                      border: `1px solid ${fusion.fusion.color}25`
                    }}
                  >
                    <span className="text-xl">{fusion.fusion.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: fusion.fusion.color }}>
                        {isKo ? fusion.fusion.description.ko : fusion.fusion.description.en}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: fusion.fusion.color }}>
                        {isKo ? fusion.fusion.keyword.ko : fusion.fusion.keyword.en}
                      </p>
                      <p className="text-xs text-gray-500">{fusion.fusion.score}/10</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 융합 레벨 분포 */}
          <div className="grid grid-cols-5 gap-1 mb-4">
            {matrixAnalysis.fusionSummary.extreme > 0 && (
              <div className="text-center p-2 rounded bg-purple-500/20">
                <div className="text-purple-400 font-bold">{matrixAnalysis.fusionSummary.extreme}</div>
                <div className="text-gray-500 text-xs">{isKo ? "극강" : "Peak"}</div>
              </div>
            )}
            {matrixAnalysis.fusionSummary.amplify > 0 && (
              <div className="text-center p-2 rounded bg-green-500/20">
                <div className="text-green-400 font-bold">{matrixAnalysis.fusionSummary.amplify}</div>
                <div className="text-gray-500 text-xs">{isKo ? "증폭" : "Boost"}</div>
              </div>
            )}
            {matrixAnalysis.fusionSummary.balance > 0 && (
              <div className="text-center p-2 rounded bg-blue-500/20">
                <div className="text-blue-400 font-bold">{matrixAnalysis.fusionSummary.balance}</div>
                <div className="text-gray-500 text-xs">{isKo ? "균형" : "Bal"}</div>
              </div>
            )}
            {matrixAnalysis.fusionSummary.clash > 0 && (
              <div className="text-center p-2 rounded bg-yellow-500/20">
                <div className="text-yellow-400 font-bold">{matrixAnalysis.fusionSummary.clash}</div>
                <div className="text-gray-500 text-xs">{isKo ? "긴장" : "Clash"}</div>
              </div>
            )}
            {matrixAnalysis.fusionSummary.conflict > 0 && (
              <div className="text-center p-2 rounded bg-red-500/20">
                <div className="text-red-400 font-bold">{matrixAnalysis.fusionSummary.conflict}</div>
                <div className="text-gray-500 text-xs">{isKo ? "상충" : "Conf"}</div>
              </div>
            )}
          </div>

          {/* 카르마 메시지 */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20">
            <p className="text-fuchsia-300 font-bold text-sm mb-2">
              {isKo ? "🔮 운명적 메시지" : "🔮 Destined Message"}
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {(() => {
                const { extreme, conflict, amplify } = matrixAnalysis.fusionSummary;
                if (extreme >= 2 && conflict === 0) {
                  return isKo
                    ? "동서양 운명이 강하게 공명하고 있어요! 이 에너지를 활용하면 큰 성취가 가능해요."
                    : "East and West destinies resonate strongly! Harnessing this energy enables great achievement.";
                } else if (conflict >= 2) {
                  return isKo
                    ? "동서양 에너지 사이에 긴장이 있어요. 이것은 성장의 기회예요. 균형을 찾으면 강해져요."
                    : "Tension exists between East-West energies. This is a growth opportunity. Finding balance makes you stronger.";
                } else if (amplify >= 3) {
                  return isKo
                    ? "에너지가 증폭되어 흐르고 있어요. 지금 시작하면 좋은 결과가 올 거예요."
                    : "Energy is flowing amplified. Starting now will bring good results.";
                }
                return isKo
                  ? "동서양 운명이 조화롭게 어우러지고 있어요. 자연스러운 흐름을 따르세요."
                  : "East-West destinies harmonize well. Follow the natural flow.";
              })()}
            </p>
          </div>
        </div>
      )}

      {/* 가이드 메시지 */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
        <p className="text-gray-400 text-sm leading-relaxed text-center">
          {isKo
            ? "카르마는 벌이 아니라 성장의 기회예요. 과거의 패턴을 인식하고 새로운 방향으로 나아가세요. 🌟"
            : "Karma isn't punishment—it's an opportunity for growth. Recognize past patterns and move in new directions. 🌟"}
        </p>
      </div>
    </div>
  );
}
