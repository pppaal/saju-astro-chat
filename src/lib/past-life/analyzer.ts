// src/lib/past-life/analyzer.ts
/**
 * Past Life Analyzer
 * 전생 분석기 - KarmaTab의 로직을 재사용하여 전생 리딩 생성
 */

import type { PastLifeResult } from './types';

// Types
type GeokgukType = 'siksin' | 'sanggwan' | 'jeonggwan' | 'pyeongwan' | 'jeongjae' | 'pyeonjae' | 'jeongin' | 'pyeongin';
type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface BilingualText {
  ko: string;
  en: string;
}

// ===== 데이터 정의 =====

// 격국별 영혼 패턴
const SOUL_PATTERNS: Record<GeokgukType, { type: BilingualText; emoji: string; title: BilingualText; description: BilingualText; traits: { ko: string[]; en: string[] } }> = {
  siksin: {
    type: { ko: "창조자 영혼", en: "Creator Soul" },
    emoji: "🎨",
    title: { ko: "예술가의 영혼", en: "Artist's Soul" },
    description: { ko: "창작과 표현을 통해 세상과 소통하는 영혼. 아름다움을 창조하고 나누는 것이 당신의 본질이에요.", en: "A soul that communicates with the world through creation and expression. Creating and sharing beauty is your essence." },
    traits: { ko: ["창의력", "표현력", "심미안"], en: ["Creativity", "Expression", "Aesthetic sense"] },
  },
  sanggwan: {
    type: { ko: "변혁가 영혼", en: "Revolutionary Soul" },
    emoji: "⚡",
    title: { ko: "선구자의 영혼", en: "Pioneer's Soul" },
    description: { ko: "세상을 변화시키는 힘을 가진 영혼. 말과 행동으로 사람들을 움직이는 것이 당신의 사명이에요.", en: "A soul with the power to change the world. Moving people with words and actions is your mission." },
    traits: { ko: ["카리스마", "혁신", "영향력"], en: ["Charisma", "Innovation", "Influence"] },
  },
  jeonggwan: {
    type: { ko: "지도자 영혼", en: "Leader Soul" },
    emoji: "👑",
    title: { ko: "통치자의 영혼", en: "Ruler's Soul" },
    description: { ko: "질서와 정의를 세우는 영혼. 조직하고 이끄는 것이 당신의 타고난 역할이에요.", en: "A soul that establishes order and justice. Organizing and leading is your innate role." },
    traits: { ko: ["리더십", "정의감", "책임감"], en: ["Leadership", "Justice", "Responsibility"] },
  },
  pyeongwan: {
    type: { ko: "전사 영혼", en: "Warrior Soul" },
    emoji: "⚔️",
    title: { ko: "수호자의 영혼", en: "Guardian's Soul" },
    description: { ko: "도전과 극복의 에너지를 가진 영혼. 어려움 속에서 강해지는 것이 당신의 길이에요.", en: "A soul with energy for challenge and overcoming. Growing stronger through hardship is your path." },
    traits: { ko: ["용기", "결단력", "불굴의 의지"], en: ["Courage", "Determination", "Indomitable will"] },
  },
  jeongjae: {
    type: { ko: "보존자 영혼", en: "Preserver Soul" },
    emoji: "🏛️",
    title: { ko: "관리자의 영혼", en: "Steward's Soul" },
    description: { ko: "안정과 풍요를 만드는 영혼. 가치 있는 것을 지키고 키우는 것이 당신의 역할이에요.", en: "A soul that creates stability and abundance. Protecting and growing what's valuable is your role." },
    traits: { ko: ["안정감", "신뢰성", "실용성"], en: ["Stability", "Reliability", "Practicality"] },
  },
  pyeonjae: {
    type: { ko: "모험가 영혼", en: "Adventurer Soul" },
    emoji: "🧭",
    title: { ko: "탐험가의 영혼", en: "Explorer's Soul" },
    description: { ko: "새로운 기회를 찾아 나서는 영혼. 변화와 성장 속에서 번영하는 것이 당신의 방식이에요.", en: "A soul that seeks new opportunities. Thriving through change and growth is your way." },
    traits: { ko: ["적응력", "기회 포착", "도전정신"], en: ["Adaptability", "Opportunity spotting", "Challenging spirit"] },
  },
  jeongin: {
    type: { ko: "현자 영혼", en: "Sage Soul" },
    emoji: "📚",
    title: { ko: "학자의 영혼", en: "Scholar's Soul" },
    description: { ko: "지식과 지혜를 추구하는 영혼. 배우고 가르치며 세상을 밝히는 것이 당신의 사명이에요.", en: "A soul that pursues knowledge and wisdom. Learning, teaching, and enlightening the world is your mission." },
    traits: { ko: ["지혜", "탐구심", "인내"], en: ["Wisdom", "Curiosity", "Patience"] },
  },
  pyeongin: {
    type: { ko: "신비가 영혼", en: "Mystic Soul" },
    emoji: "🔮",
    title: { ko: "예언자의 영혼", en: "Seer's Soul" },
    description: { ko: "직관과 영성을 따르는 영혼. 보이지 않는 진실을 보는 것이 당신의 능력이에요.", en: "A soul that follows intuition and spirituality. Seeing invisible truths is your gift." },
    traits: { ko: ["직관력", "영성", "통찰력"], en: ["Intuition", "Spirituality", "Insight"] },
  },
};

// 격국별 전생 테마
const PAST_LIFE_THEMES: Record<GeokgukType, { likely: BilingualText; talents: BilingualText; lessons: BilingualText; era?: BilingualText }> = {
  siksin: {
    likely: { ko: "전생에서 예술가, 요리사, 작가였을 가능성이 높아요. 창작과 표현을 통해 사람들에게 기쁨을 주었던 삶이었어요.", en: "You were likely an artist, chef, or writer in past lives. You brought joy to people through creation and expression." },
    talents: { ko: "창작하고 표현하는 재능이 이미 익숙해요. 음식, 예술, 글쓰기에서 자연스러운 감각이 있어요.", en: "Creative and expressive talents feel familiar. You have a natural sense for food, art, and writing." },
    lessons: { ko: "이번 생에서는 더 큰 무대로 나가세요. 재능을 숨기지 말고 세상과 나누는 것이 과제예요.", en: "This life, step onto a bigger stage. Sharing your talents with the world instead of hiding them is your challenge." },
    era: { ko: "르네상스 시대 또는 조선시대 예술가", en: "Renaissance era or Joseon Dynasty artist" },
  },
  sanggwan: {
    likely: { ko: "전생에서 연예인, 강사, 혁명가였을 가능성이 높아요. 말과 영향력으로 세상을 바꾸려 했던 삶이었어요.", en: "You were likely an entertainer, lecturer, or revolutionary in past lives. You tried to change the world with words and influence." },
    talents: { ko: "말과 표현으로 사람을 움직이는 재능이 있어요. 대중 앞에 서는 것이 자연스러워요.", en: "You have talent to move people with words. Standing before crowds feels natural." },
    lessons: { ko: "이번 생에서는 그 힘을 건설적으로 쓰세요. 파괴가 아닌 건설을 위한 변화를 이끄세요.", en: "This life, use that power constructively. Lead change for building, not destruction." },
    era: { ko: "프랑스 혁명기 또는 독립운동 시대", en: "French Revolution era or Independence movement period" },
  },
  jeonggwan: {
    likely: { ko: "전생에서 관료, 판사, 지도자였을 가능성이 높아요. 조직을 이끌고 질서를 세우는 삶이었어요.", en: "You were likely an official, judge, or leader in past lives. You led organizations and established order." },
    talents: { ko: "조직하고 이끄는 능력이 이미 있어요. 규칙과 시스템을 만드는 것이 자연스러워요.", en: "Organizational and leadership abilities exist already. Creating rules and systems comes naturally." },
    lessons: { ko: "이번 생에서는 더 인간적인 리더십을 배우세요. 규칙만큼 사람의 마음도 중요해요.", en: "This life, learn more human leadership. Hearts matter as much as rules." },
    era: { ko: "로마 제국 또는 조선시대 관료", en: "Roman Empire or Joseon Dynasty official" },
  },
  pyeongwan: {
    likely: { ko: "전생에서 군인, 경찰, 격투가였을 가능성이 높아요. 도전을 두려워하지 않고 싸워온 삶이었어요.", en: "You were likely a soldier, police, or fighter in past lives. You lived fighting without fearing challenges." },
    talents: { ko: "도전을 두려워하지 않는 용기가 있어요. 위기 상황에서 빛나는 능력이 있어요.", en: "You have courage that doesn't fear challenges. You shine in crisis situations." },
    lessons: { ko: "이번 생에서는 파괴보다 보호를 배우세요. 힘을 지키는 데 쓰는 것이 진정한 강함이에요.", en: "This life, learn protection over destruction. True strength is using power to protect." },
    era: { ko: "전쟁 시대의 장군 또는 의병", en: "General in wartime or resistance fighter" },
  },
  jeongjae: {
    likely: { ko: "전생에서 상인, 은행가, 가정주부였을 가능성이 높아요. 안정과 풍요를 쌓아온 삶이었어요.", en: "You were likely a merchant, banker, or homemaker in past lives. You built stability and abundance." },
    talents: { ko: "안정적으로 재물을 쌓는 능력이 있어요. 실용적이고 현실적인 판단력이 뛰어나요.", en: "You have ability to build wealth steadily. You excel at practical and realistic judgment." },
    lessons: { ko: "이번 생에서는 물질 너머의 가치를 탐구하세요. 소유가 아닌 나눔에서 풍요를 찾으세요.", en: "This life, explore values beyond material. Find abundance in sharing, not possessing." },
    era: { ko: "중세 상인 길드 또는 개항기 무역상", en: "Medieval merchant guild or trade merchant in port-opening era" },
  },
  pyeonjae: {
    likely: { ko: "전생에서 무역상, 투자가, 모험가였을 가능성이 높아요. 기회를 찾아 세계를 누빈 삶이었어요.", en: "You were likely a trader, investor, or adventurer in past lives. You roamed the world seeking opportunities." },
    talents: { ko: "기회를 포착하고 활용하는 능력이 있어요. 변화 속에서 번영하는 감각이 있어요.", en: "You have ability to spot and use opportunities. You have a sense for thriving through change." },
    lessons: { ko: "이번 생에서는 안정과 도전의 균형을 찾으세요. 뿌리 없이 떠도는 것만이 자유가 아니에요.", en: "This life, find balance between stability and risk. Freedom isn't just wandering without roots." },
    era: { ko: "대항해 시대 탐험가 또는 실크로드 상인", en: "Age of Exploration navigator or Silk Road merchant" },
  },
  jeongin: {
    likely: { ko: "전생에서 학자, 수도승, 선생님이었을 가능성이 높아요. 지식을 쌓고 가르치는 삶이었어요.", en: "You were likely a scholar, monk, or teacher in past lives. You accumulated knowledge and taught." },
    talents: { ko: "배우고 가르치는 능력이 이미 있어요. 복잡한 것을 이해하는 능력이 뛰어나요.", en: "Learning and teaching abilities exist already. You excel at understanding complex things." },
    lessons: { ko: "이번 생에서는 지식을 더 넓게 나누세요. 상아탑에 갇히지 말고 세상과 소통하세요.", en: "This life, share knowledge more widely. Don't stay in ivory towers, communicate with the world." },
    era: { ko: "고대 그리스 철학자 또는 조선시대 선비", en: "Ancient Greek philosopher or Joseon Dynasty scholar" },
  },
  pyeongin: {
    likely: { ko: "전생에서 무당, 점술가, 연구자였을 가능성이 높아요. 보이지 않는 세계를 탐구한 삶이었어요.", en: "You were likely a shaman, diviner, or researcher in past lives. You explored invisible realms." },
    talents: { ko: "직관과 통찰력이 이미 발달해 있어요. 표면 아래의 진실을 보는 능력이 있어요.", en: "Intuition and insight are already developed. You can see truths beneath the surface." },
    lessons: { ko: "이번 생에서는 고립되지 말고 사람들과 연결하세요. 신비도 나눌 때 의미가 있어요.", en: "This life, connect with people instead of isolating. Mystery has meaning when shared." },
    era: { ko: "고대 신관 또는 연금술사", en: "Ancient priest or alchemist" },
  },
};

// 노스노드 하우스별 영혼 여정
const NODE_JOURNEY: Record<HouseNumber, { pastPattern: BilingualText; release: BilingualText; direction: BilingualText; lesson: BilingualText }> = {
  1: {
    pastPattern: { ko: "타인에게 맞추며 자신을 잃은 전생", en: "Past life losing yourself by accommodating others" },
    release: { ko: "남의 시선에 대한 과도한 의존", en: "Over-dependence on others' opinions" },
    direction: { ko: "진정한 자아를 발견하고 표현하는 여정", en: "Journey to discover and express true self" },
    lesson: { ko: "자기 자신으로 당당히 살기", en: "Living confidently as yourself" },
  },
  2: {
    pastPattern: { ko: "타인의 자원에 의존한 전생", en: "Past life depending on others' resources" },
    release: { ko: "물질적 불안과 의존성", en: "Material insecurity and dependency" },
    direction: { ko: "자신만의 가치와 능력을 개발하는 여정", en: "Journey to develop your own values and abilities" },
    lesson: { ko: "스스로 가치를 창출하기", en: "Creating value on your own" },
  },
  3: {
    pastPattern: { ko: "큰 그림만 보며 디테일을 놓친 전생", en: "Past life seeing only big picture, missing details" },
    release: { ko: "추상적 사고에 대한 집착", en: "Obsession with abstract thinking" },
    direction: { ko: "일상의 소통과 학습에 집중하는 여정", en: "Journey focusing on daily communication and learning" },
    lesson: { ko: "가까운 관계와 실용적 지식 키우기", en: "Nurturing close relationships and practical knowledge" },
  },
  4: {
    pastPattern: { ko: "사회적 성공에만 몰두한 전생", en: "Past life focused only on social success" },
    release: { ko: "외부 인정에 대한 집착", en: "Obsession with external recognition" },
    direction: { ko: "가정과 내면의 안정을 찾는 여정", en: "Journey finding home and inner stability" },
    lesson: { ko: "뿌리를 내리고 감정적 안전 만들기", en: "Putting down roots and creating emotional safety" },
  },
  5: {
    pastPattern: { ko: "집단에 묻히며 개성을 잃은 전생", en: "Past life losing individuality in groups" },
    release: { ko: "집단에 대한 과도한 동조", en: "Over-conformity to groups" },
    direction: { ko: "창조적 자기 표현의 여정", en: "Journey of creative self-expression" },
    lesson: { ko: "기쁨과 창조로 자신을 표현하기", en: "Expressing yourself through joy and creation" },
  },
  6: {
    pastPattern: { ko: "환상과 도피에 빠진 전생", en: "Past life lost in fantasy and escape" },
    release: { ko: "현실 도피와 경계 부족", en: "Reality avoidance and lack of boundaries" },
    direction: { ko: "봉사와 실용적 삶의 여정", en: "Journey of service and practical living" },
    lesson: { ko: "일상의 의미와 건강한 습관 만들기", en: "Finding meaning in daily life and healthy habits" },
  },
  7: {
    pastPattern: { ko: "혼자서 모든 것을 해결한 전생", en: "Past life solving everything alone" },
    release: { ko: "과도한 독립과 고립", en: "Excessive independence and isolation" },
    direction: { ko: "파트너십과 협력을 배우는 여정", en: "Journey learning partnership and cooperation" },
    lesson: { ko: "진정한 관계와 균형 찾기", en: "Finding true relationships and balance" },
  },
  8: {
    pastPattern: { ko: "물질적 안정에 집착한 전생", en: "Past life obsessed with material stability" },
    release: { ko: "소유와 안전에 대한 집착", en: "Obsession with possession and safety" },
    direction: { ko: "깊은 변화와 공유의 여정", en: "Journey of deep transformation and sharing" },
    lesson: { ko: "변화를 받아들이고 진정한 친밀감 경험하기", en: "Accepting change and experiencing true intimacy" },
  },
  9: {
    pastPattern: { ko: "사소한 것에 매몰된 전생", en: "Past life buried in trivial matters" },
    release: { ko: "좁은 시야와 과도한 디테일 집착", en: "Narrow vision and over-focus on details" },
    direction: { ko: "넓은 세계와 의미를 탐구하는 여정", en: "Journey exploring wider world and meaning" },
    lesson: { ko: "큰 그림을 보고 철학을 찾기", en: "Seeing the big picture and finding philosophy" },
  },
  10: {
    pastPattern: { ko: "가정에만 갇혀 살았던 전생", en: "Past life confined to home" },
    release: { ko: "감정적 안전에 대한 과도한 집착", en: "Excessive attachment to emotional safety" },
    direction: { ko: "사회적 사명과 성취의 여정", en: "Journey of social mission and achievement" },
    lesson: { ko: "세상에 기여하고 성취를 이루기", en: "Contributing to the world and achieving" },
  },
  11: {
    pastPattern: { ko: "개인적 욕망에 빠진 전생", en: "Past life lost in personal desires" },
    release: { ko: "자기중심적 표현과 드라마", en: "Self-centered expression and drama" },
    direction: { ko: "공동체와 비전을 위해 사는 여정", en: "Journey living for community and vision" },
    lesson: { ko: "더 큰 목적을 위해 기여하기", en: "Contributing to a greater purpose" },
  },
  12: {
    pastPattern: { ko: "물질과 일에만 집중한 전생", en: "Past life focused only on material and work" },
    release: { ko: "완벽주의와 과도한 통제", en: "Perfectionism and excessive control" },
    direction: { ko: "영성과 초월의 여정", en: "Journey of spirituality and transcendence" },
    lesson: { ko: "손 놓고 우주를 신뢰하기", en: "Letting go and trusting the universe" },
  },
};

// 토성 하우스별 카르마 수업
const SATURN_LESSONS: Record<HouseNumber, { lesson: BilingualText; challenge: BilingualText; mastery: BilingualText }> = {
  1: {
    lesson: { ko: "자기 정체성을 확립하는 것", en: "Establishing self-identity" },
    challenge: { ko: "자기 표현의 어려움, 자신감 부족", en: "Difficulty with self-expression, lack of confidence" },
    mastery: { ko: "진정한 자아로 당당히 서는 힘", en: "Power to stand confidently as true self" },
  },
  2: {
    lesson: { ko: "자신의 가치를 인정하는 것", en: "Recognizing your own worth" },
    challenge: { ko: "물질적 불안, 자기 가치 의심", en: "Material insecurity, doubting self-worth" },
    mastery: { ko: "안정적인 재정과 자존감 확립", en: "Establishing stable finances and self-esteem" },
  },
  3: {
    lesson: { ko: "효과적으로 소통하는 것", en: "Communicating effectively" },
    challenge: { ko: "말하기 두려움, 학습 어려움", en: "Fear of speaking, learning difficulties" },
    mastery: { ko: "명확한 소통과 지적 권위 획득", en: "Gaining clear communication and intellectual authority" },
  },
  4: {
    lesson: { ko: "감정적 안정과 가정을 만드는 것", en: "Creating emotional stability and home" },
    challenge: { ko: "가정 문제, 불안정한 어린 시절", en: "Family issues, unstable childhood" },
    mastery: { ko: "강한 내면의 기반과 안전한 가정 구축", en: "Building strong inner foundation and secure home" },
  },
  5: {
    lesson: { ko: "창조적으로 자기를 표현하는 것", en: "Expressing yourself creatively" },
    challenge: { ko: "창의력 억압, 즐거움에 대한 죄책감", en: "Creativity suppression, guilt about pleasure" },
    mastery: { ko: "자유로운 자기 표현과 기쁨 찾기", en: "Free self-expression and finding joy" },
  },
  6: {
    lesson: { ko: "건강과 일상을 관리하는 것", en: "Managing health and daily life" },
    challenge: { ko: "건강 문제, 일 중독, 완벽주의", en: "Health issues, workaholism, perfectionism" },
    mastery: { ko: "균형 잡힌 습관과 효율적인 서비스", en: "Balanced habits and efficient service" },
  },
  7: {
    lesson: { ko: "진정한 파트너십을 만드는 것", en: "Creating true partnership" },
    challenge: { ko: "관계의 어려움, 균형 잡기 힘듦", en: "Relationship difficulties, trouble finding balance" },
    mastery: { ko: "성숙한 관계와 공정한 파트너십", en: "Mature relationships and fair partnership" },
  },
  8: {
    lesson: { ko: "변화와 친밀감을 받아들이는 것", en: "Accepting transformation and intimacy" },
    challenge: { ko: "통제 욕구, 신뢰 문제, 상실 두려움", en: "Control needs, trust issues, fear of loss" },
    mastery: { ko: "깊은 변환과 진정한 친밀감 경험", en: "Deep transformation and true intimacy" },
  },
  9: {
    lesson: { ko: "의미와 철학을 찾는 것", en: "Finding meaning and philosophy" },
    challenge: { ko: "믿음의 위기, 좁은 시야", en: "Faith crisis, narrow vision" },
    mastery: { ko: "넓은 지혜와 의미 있는 삶", en: "Broad wisdom and meaningful life" },
  },
  10: {
    lesson: { ko: "세상에서 자신의 역할을 찾는 것", en: "Finding your role in the world" },
    challenge: { ko: "커리어 장애, 인정받지 못하는 느낌", en: "Career obstacles, feeling unrecognized" },
    mastery: { ko: "진정한 성취와 사회적 권위", en: "True achievement and social authority" },
  },
  11: {
    lesson: { ko: "커뮤니티와 비전을 위해 일하는 것", en: "Working for community and vision" },
    challenge: { ko: "고립감, 소속되지 못하는 느낌", en: "Isolation, feeling of not belonging" },
    mastery: { ko: "진정한 소속감과 사회 기여", en: "True belonging and social contribution" },
  },
  12: {
    lesson: { ko: "영적 성장과 내면 평화 찾기", en: "Finding spiritual growth and inner peace" },
    challenge: { ko: "무의식적 두려움, 고립, 자기 파괴", en: "Unconscious fears, isolation, self-destruction" },
    mastery: { ko: "영적 지혜와 초월적 평화", en: "Spiritual wisdom and transcendent peace" },
  },
};

// 일간별 영혼 미션
const DAY_MASTER_MISSION: Record<HeavenlyStem, { core: BilingualText; expression: BilingualText; fulfillment: BilingualText }> = {
  '갑': {
    core: { ko: "새로운 시작을 이끄는 개척자가 되세요", en: "Be a pioneer leading new beginnings" },
    expression: { ko: "성장과 발전을 추구하며 다른 이들을 이끄세요", en: "Pursue growth and lead others" },
    fulfillment: { ko: "당신이 시작한 것이 숲처럼 자랄 때 가장 행복해요", en: "Happiest when what you started grows like a forest" },
  },
  '을': {
    core: { ko: "부드러운 힘으로 세상을 변화시키세요", en: "Change the world with gentle power" },
    expression: { ko: "적응하고 조화를 이루며 아름다움을 만드세요", en: "Adapt, harmonize, and create beauty" },
    fulfillment: { ko: "어디서든 피어나는 꽃처럼 살 때 가장 행복해요", en: "Happiest living like a flower that blooms anywhere" },
  },
  '병': {
    core: { ko: "빛과 열정으로 세상을 밝히세요", en: "Light the world with passion and radiance" },
    expression: { ko: "열정적으로 표현하고 다른 이들을 따뜻하게 해주세요", en: "Express passionately and warm others" },
    fulfillment: { ko: "태양처럼 모든 것을 비출 때 가장 행복해요", en: "Happiest when illuminating everything like the sun" },
  },
  '정': {
    core: { ko: "따뜻한 빛으로 가까운 이들을 돌보세요", en: "Care for those close with warm light" },
    expression: { ko: "섬세하고 따뜻하게 관계를 만들어가세요", en: "Build relationships with delicacy and warmth" },
    fulfillment: { ko: "촛불처럼 가까운 이들을 밝힐 때 가장 행복해요", en: "Happiest illuminating close ones like a candle" },
  },
  '무': {
    core: { ko: "든든한 터전을 만들어 모든 것을 지지하세요", en: "Create solid foundations that support all" },
    expression: { ko: "안정적이고 신뢰할 수 있는 존재가 되세요", en: "Be a stable and reliable presence" },
    fulfillment: { ko: "산처럼 모든 것을 품을 때 가장 행복해요", en: "Happiest embracing everything like a mountain" },
  },
  '기': {
    core: { ko: "기름진 땅처럼 모든 것을 키우세요", en: "Nurture everything like fertile soil" },
    expression: { ko: "보살피고 성장시키는 역할을 하세요", en: "Take on roles of caring and growing" },
    fulfillment: { ko: "다른 것들이 당신 안에서 자랄 때 가장 행복해요", en: "Happiest when others grow within you" },
  },
  '경': {
    core: { ko: "정의와 원칙으로 세상을 바로잡으세요", en: "Correct the world with justice and principle" },
    expression: { ko: "결단력 있고 명확하게 행동하세요", en: "Act with decisiveness and clarity" },
    fulfillment: { ko: "칼처럼 불의를 바로잡을 때 가장 행복해요", en: "Happiest correcting injustice like a sword" },
  },
  '신': {
    core: { ko: "섬세함으로 가치를 정제하세요", en: "Refine value with delicacy" },
    expression: { ko: "완벽함을 추구하며 아름다운 것을 만드세요", en: "Pursue perfection and create beautiful things" },
    fulfillment: { ko: "보석처럼 빛나는 것을 만들 때 가장 행복해요", en: "Happiest creating things that shine like gems" },
  },
  '임': {
    core: { ko: "지혜의 바다처럼 모든 것을 품으세요", en: "Embrace everything like an ocean of wisdom" },
    expression: { ko: "유연하고 깊이 있게 세상을 이해하세요", en: "Understand the world with flexibility and depth" },
    fulfillment: { ko: "바다처럼 모든 것이 흘러들 때 가장 행복해요", en: "Happiest when everything flows into you like the ocean" },
  },
  '계': {
    core: { ko: "생명의 근원처럼 필요한 곳을 적시세요", en: "Moisten where needed like the source of life" },
    expression: { ko: "필요한 곳에 은은하게 스며드세요", en: "Gently seep into where you're needed" },
    fulfillment: { ko: "이슬처럼 생명을 살릴 때 가장 행복해요", en: "Happiest giving life like dew" },
  },
};

// ===== 헬퍼 함수 =====

function selectLang(isKo: boolean, text: BilingualText): string {
  return isKo ? text.ko : text.en;
}

function getGeokgukType(geokName: string | undefined): GeokgukType | null {
  if (!geokName) return null;

  const mapping: Record<string, GeokgukType> = {
    '식신': 'siksin', '식신격': 'siksin',
    '상관': 'sanggwan', '상관격': 'sanggwan',
    '정관': 'jeonggwan', '정관격': 'jeonggwan',
    '편관': 'pyeongwan', '편관격': 'pyeongwan', '칠살': 'pyeongwan',
    '정재': 'jeongjae', '정재격': 'jeongjae',
    '편재': 'pyeonjae', '편재격': 'pyeonjae',
    '정인': 'jeongin', '정인격': 'jeongin',
    '편인': 'pyeongin', '편인격': 'pyeongin',
  };

  return mapping[geokName] || null;
}

function findPlanetHouse(astro: AstroData | null, planetName: string): HouseNumber | null {
  if (!astro?.planets) return null;

  const planet = astro.planets.find((p: Planet) =>
    p.name?.toLowerCase().includes(planetName.toLowerCase())
  );

  if (planet?.house && planet.house >= 1 && planet.house <= 12) {
    return planet.house as HouseNumber;
  }

  return null;
}

function extractDayMasterChar(saju: SajuData | null): HeavenlyStem | null {
  if (!saju) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sajuAny = saju as any;
  let dayMasterStr = sajuAny.dayMaster?.name || sajuAny.dayMaster?.heavenlyStem || '';

  if (!dayMasterStr && sajuAny.pillars?.day) {
    const dayPillar = sajuAny.pillars.day;
    dayMasterStr = typeof dayPillar.heavenlyStem === 'string'
      ? dayPillar.heavenlyStem
      : dayPillar.heavenlyStem?.name || '';
  }

  if (!dayMasterStr && sajuAny.fourPillars?.day) {
    const dayPillar = sajuAny.fourPillars.day;
    dayMasterStr = dayPillar.heavenlyStem || '';
  }

  if (!dayMasterStr) return null;

  const firstChar = dayMasterStr.charAt(0);
  const validStems: HeavenlyStem[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

  return validStems.includes(firstChar as HeavenlyStem) ? (firstChar as HeavenlyStem) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SajuData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstroData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Planet = any;

// ===== 메인 분석 함수 =====

export function analyzePastLife(
  saju: SajuData | null,
  astro: AstroData | null,
  isKo: boolean
): PastLifeResult {
  // 격국 추출
  const geokguk = saju?.advancedAnalysis?.geokguk as { name?: string; type?: string } | undefined;
  const geokName = geokguk?.name || geokguk?.type;
  const geokgukType = getGeokgukType(geokName);

  // 일간 추출
  const dayMasterChar = extractDayMasterChar(saju);

  // 행성 하우스 추출
  const northNodeHouse = findPlanetHouse(astro, 'north') || findPlanetHouse(astro, 'northnode');
  const saturnHouse = findPlanetHouse(astro, 'saturn');
  const southNodeHouse = northNodeHouse ? (northNodeHouse > 6 ? northNodeHouse - 6 : northNodeHouse + 6) as HouseNumber : null;

  // 1. 영혼 패턴
  let soulPattern: PastLifeResult['soulPattern'];
  if (geokgukType && SOUL_PATTERNS[geokgukType]) {
    const pattern = SOUL_PATTERNS[geokgukType];
    soulPattern = {
      type: selectLang(isKo, pattern.type),
      emoji: pattern.emoji,
      title: selectLang(isKo, pattern.title),
      description: selectLang(isKo, pattern.description),
      traits: isKo ? pattern.traits.ko : pattern.traits.en,
    };
  } else {
    soulPattern = {
      type: isKo ? "탐험가 영혼" : "Explorer Soul",
      emoji: "🌟",
      title: isKo ? "탐험가의 영혼" : "Explorer's Soul",
      description: isKo
        ? "다양한 경험을 통해 성장하는 영혼. 새로운 것을 배우고 도전하며 자신을 발견해가요."
        : "A soul growing through diverse experiences. Learning new things and discovering yourself.",
      traits: isKo ? ["호기심", "적응력", "성장"] : ["Curiosity", "Adaptability", "Growth"],
    };
  }

  // 2. 전생 테마
  let pastLife: PastLifeResult['pastLife'];
  if (geokgukType && PAST_LIFE_THEMES[geokgukType]) {
    const theme = PAST_LIFE_THEMES[geokgukType];
    pastLife = {
      likely: selectLang(isKo, theme.likely),
      talents: selectLang(isKo, theme.talents),
      lessons: selectLang(isKo, theme.lessons),
      era: theme.era ? selectLang(isKo, theme.era) : undefined,
    };
  } else {
    pastLife = {
      likely: isKo ? "다양한 역할을 경험한 영혼입니다." : "A soul that experienced various roles.",
      talents: isKo ? "전생에서 쌓은 다양한 재능이 있어요." : "You have diverse talents from past lives.",
      lessons: isKo ? "과거의 패턴을 인식하고 성장하세요." : "Recognize past patterns and grow.",
    };
  }

  // 3. 영혼 여정 (노드 축)
  let soulJourney: PastLifeResult['soulJourney'];
  if (northNodeHouse && NODE_JOURNEY[northNodeHouse]) {
    const journey = NODE_JOURNEY[northNodeHouse];
    soulJourney = {
      pastPattern: selectLang(isKo, journey.pastPattern),
      releasePattern: selectLang(isKo, journey.release),
      currentDirection: selectLang(isKo, journey.direction),
      lessonToLearn: selectLang(isKo, journey.lesson),
    };
  } else {
    soulJourney = {
      pastPattern: isKo ? "전생의 패턴이 현재에 영향을 미치고 있어요" : "Past life patterns influence the present",
      releasePattern: isKo ? "오래된 습관과 집착" : "Old habits and attachments",
      currentDirection: isKo ? "새로운 성장의 방향으로" : "Toward new growth",
      lessonToLearn: isKo ? "변화를 받아들이고 성장하기" : "Accepting change and growing",
    };
  }

  // 4. 카르마 부채
  const karmicDebts: PastLifeResult['karmicDebts'] = [];

  // 신살 분석
  const sinsalData = saju?.advancedAnalysis?.sinsal as { unluckyList?: { name?: string; shinsal?: string }[] } | undefined;
  const unluckyList = sinsalData?.unluckyList || [];

  for (const item of unluckyList.slice(0, 3)) {
    const name = typeof item === 'string' ? item : item?.name || item?.shinsal || '';
    if (!name) continue;

    if (name.includes('원진')) {
      karmicDebts.push({
        area: isKo ? "관계 카르마" : "Relationship Karma",
        description: isKo
          ? "전생에서 해결하지 못한 관계의 갈등이 있어요. 특정 사람과의 충돌이 반복될 수 있어요."
          : "Unresolved relationship conflicts from past lives. Conflicts with certain people may repeat.",
        healing: isKo ? "용서하고 이해하려 노력하세요" : "Try to forgive and understand",
      });
    } else if (name.includes('공망') || name.includes('空亡')) {
      karmicDebts.push({
        area: isKo ? "공허 카르마" : "Emptiness Karma",
        description: isKo
          ? "전생에서 무언가를 잃은 경험이 깊이 남아있어요. 특정 영역에서 공허함을 느낄 수 있어요."
          : "Deep experience of loss from past lives remains. You may feel emptiness in certain areas.",
        healing: isKo ? "내면을 채우는 영적 수행을 하세요" : "Practice spiritual cultivation to fill your inner self",
      });
    } else if (name.includes('겁살') || name.includes('劫殺')) {
      karmicDebts.push({
        area: isKo ? "도전 카르마" : "Challenge Karma",
        description: isKo
          ? "전생에서 극복하지 못한 도전이 다시 찾아와요. 어려움이 성장의 기회임을 기억하세요."
          : "Challenges not overcome in past lives return. Remember difficulties are growth opportunities.",
        healing: isKo ? "두려움을 직면하고 극복하세요" : "Face and overcome your fears",
      });
    }
  }

  // 5. 토성 수업
  let saturnLesson: PastLifeResult['saturnLesson'];
  if (saturnHouse && SATURN_LESSONS[saturnHouse]) {
    const lesson = SATURN_LESSONS[saturnHouse];
    saturnLesson = {
      lesson: selectLang(isKo, lesson.lesson),
      challenge: selectLang(isKo, lesson.challenge),
      mastery: selectLang(isKo, lesson.mastery),
    };
  } else {
    saturnLesson = {
      lesson: isKo ? "인생의 중요한 교훈이 기다리고 있어요" : "Important life lessons await",
      challenge: isKo ? "29세, 58세 전후로 큰 시험이 와요" : "Major tests come around ages 29 and 58",
      mastery: isKo ? "나이 들수록 더 강해지고 현명해져요" : "You grow stronger and wiser with age",
    };
  }

  // 6. 전생에서 가져온 재능
  const talentsCarried: string[] = [];

  if (geokgukType) {
    const talents: Record<GeokgukType, { ko: string; en: string }[]> = {
      siksin: [{ ko: "창작 능력", en: "Creative ability" }, { ko: "미적 감각", en: "Aesthetic sense" }, { ko: "요리/음식", en: "Cooking/Food" }],
      sanggwan: [{ ko: "언변", en: "Eloquence" }, { ko: "퍼포먼스", en: "Performance" }, { ko: "영향력", en: "Influence" }],
      jeonggwan: [{ ko: "조직력", en: "Organization" }, { ko: "공정함", en: "Fairness" }, { ko: "리더십", en: "Leadership" }],
      pyeongwan: [{ ko: "용기", en: "Courage" }, { ko: "결단력", en: "Determination" }, { ko: "실행력", en: "Execution" }],
      jeongjae: [{ ko: "재정 관리", en: "Financial management" }, { ko: "실용성", en: "Practicality" }, { ko: "안정감", en: "Stability" }],
      pyeonjae: [{ ko: "기회 포착", en: "Opportunity spotting" }, { ko: "적응력", en: "Adaptability" }, { ko: "네트워킹", en: "Networking" }],
      jeongin: [{ ko: "학습 능력", en: "Learning ability" }, { ko: "가르침", en: "Teaching" }, { ko: "인내", en: "Patience" }],
      pyeongin: [{ ko: "직관력", en: "Intuition" }, { ko: "영성", en: "Spirituality" }, { ko: "통찰력", en: "Insight" }],
    };

    const geokTalents = talents[geokgukType];
    if (geokTalents) {
      talentsCarried.push(...geokTalents.map(t => isKo ? t.ko : t.en));
    }
  } else {
    talentsCarried.push(
      isKo ? "적응력" : "Adaptability",
      isKo ? "학습 능력" : "Learning ability",
      isKo ? "회복력" : "Resilience"
    );
  }

  // 7. 이번 생 미션
  let thisLifeMission: PastLifeResult['thisLifeMission'];
  if (dayMasterChar && DAY_MASTER_MISSION[dayMasterChar]) {
    const mission = DAY_MASTER_MISSION[dayMasterChar];
    thisLifeMission = {
      core: selectLang(isKo, mission.core),
      expression: selectLang(isKo, mission.expression),
      fulfillment: selectLang(isKo, mission.fulfillment),
    };
  } else {
    thisLifeMission = {
      core: isKo ? "당신만의 빛으로 세상을 밝히세요" : "Light the world with your unique light",
      expression: isKo ? "자신에게 충실하면 길이 열려요" : "Being true to yourself opens the path",
      fulfillment: isKo ? "진정한 나로 살 때 가장 행복해요" : "Happiest when living as your true self",
    };
  }

  // 8. 카르마 점수 계산
  let karmaScore = 65; // 기본 점수

  if (geokgukType) karmaScore += 10;
  if (northNodeHouse) karmaScore += 8;
  if (saturnHouse) karmaScore += 5;
  if (dayMasterChar) karmaScore += 5;
  if (karmicDebts.length > 0) karmaScore += karmicDebts.length * 3;

  karmaScore = Math.min(100, Math.max(40, karmaScore));

  return {
    soulPattern,
    pastLife,
    soulJourney,
    karmicDebts,
    saturnLesson,
    talentsCarried,
    thisLifeMission,
    karmaScore,
    geokguk: geokName,
    northNodeHouse: northNodeHouse || undefined,
    saturnHouse: saturnHouse || undefined,
    dayMaster: dayMasterChar || undefined,
  };
}
