// Centralized day master traits data
// Consolidates repeated day master mappings across analyzers

export interface BilingualText {
  ko: string;
  en: string;
}

export interface BilingualArray {
  ko: string[];
  en: string[];
}

// Career-related traits for each day master
export const dayMasterCareerTraits: Record<string, {
  workStyle: BilingualText;
  avoid: BilingualText;
  growth: BilingualText;
}> = {
  "갑": {
    workStyle: { ko: "새로운 것을 시작하고 조직을 이끄는 일", en: "Starting new things and leading organizations" },
    avoid: { ko: "지시만 받는 일, 변화 없는 반복", en: "Just taking orders, unchanging repetition" },
    growth: { ko: "팀원들의 의견도 들어보세요. 혼자 다 하려다 지쳐요.", en: "Listen to team members too. Trying everything alone exhausts you." }
  },
  "을": {
    workStyle: { ko: "사람을 연결하고 조율하는 일", en: "Connecting and coordinating people" },
    avoid: { ko: "극도의 경쟁 환경, 고립되는 일", en: "Extreme competition, isolated work" },
    growth: { ko: "자기 주장도 필요해요. 다 맞춰주면 커리어가 흐릿해져요.", en: "Self-assertion needed too. Always accommodating blurs your career." }
  },
  "병": {
    workStyle: { ko: "사람들 앞에 나서서 표현하는 일", en: "Expressing in front of people" },
    avoid: { ko: "뒤에서 조용히 일하는 것, 성과가 안 보이는 일", en: "Working quietly behind, invisible results" },
    growth: { ko: "열정 관리하세요. 번아웃되면 다 멈춰요.", en: "Manage passion. Burnout stops everything." }
  },
  "정": {
    workStyle: { ko: "섬세함과 깊이가 필요한 일", en: "Work needing delicacy and depth" },
    avoid: { ko: "소음 많은 환경, 감정 없는 기계적 업무", en: "Noisy environments, emotionless mechanical tasks" },
    growth: { ko: "80%로도 충분할 때가 있어요. 속도와 질의 균형을 잡으세요.", en: "80% is enough sometimes. Balance speed and quality." }
  },
  "무": {
    workStyle: { ko: "시스템을 관리하고 안정시키는 일", en: "Managing and stabilizing systems" },
    avoid: { ko: "급변하는 환경, 기반 없이 시작하는 프로젝트", en: "Rapidly changing environments, projects without foundation" },
    growth: { ko: "변화도 받아들이세요. 안정만 추구하면 성장이 멈춰요.", en: "Accept change too. Only pursuing stability stops growth." }
  },
  "기": {
    workStyle: { ko: "사람을 키우고 돌보는 일", en: "Growing and caring for people" },
    avoid: { ko: "냉정한 경쟁, 성과만 강조하는 환경", en: "Cold competition, environments only emphasizing results" },
    growth: { ko: "내 성과도 챙기세요. 남만 돌보면 정작 나는 뒤처져요.", en: "Claim your achievements too. Only caring for others leaves you behind." }
  },
  "경": {
    workStyle: { ko: "결단하고 실행하는 일", en: "Deciding and executing" },
    avoid: { ko: "애매한 지시, 우유부단한 조직", en: "Vague instructions, indecisive organizations" },
    growth: { ko: "부드러움도 필요해요. 너무 칼같으면 사람들이 힘들어해요.", en: "Softness needed too. Being too sharp makes people struggle." }
  },
  "신": {
    workStyle: { ko: "품질과 디테일이 중요한 일", en: "Work where quality and details matter" },
    avoid: { ko: "대충해도 되는 일, 디테일이 무시되는 환경", en: "Work that can be done roughly, environments ignoring details" },
    growth: { ko: "완벽하지 않아도 시작하세요. 100%를 기다리다 아무것도 못 해요.", en: "Start even if not perfect. Waiting for 100% means doing nothing." }
  },
  "임": {
    workStyle: { ko: "자유롭게 사고하고 탐구하는 일", en: "Freely thinking and exploring" },
    avoid: { ko: "경직된 규칙, 틀에 박힌 업무", en: "Rigid rules, boxed-in work" },
    growth: { ko: "마무리도 중요해요. 시작만 하고 흐지부지되지 마세요.", en: "Finishing matters too. Don't just start and fizzle out." }
  },
  "계": {
    workStyle: { ko: "직관과 창의력이 필요한 일", en: "Work needing intuition and creativity" },
    avoid: { ko: "논리만 요구하는 환경, 감성이 무시되는 곳", en: "Environments demanding only logic, places ignoring emotion" },
    growth: { ko: "현실적인 계획도 세우세요. 감만으로는 한계가 있어요.", en: "Make realistic plans too. Intuition alone has limits." }
  },
};

// Love-related traits for each day master
export const dayMasterLoveTraits: Record<string, {
  core: BilingualText;
  danger: BilingualText;
  ideal: BilingualText;
}> = {
  "갑": {
    core: { ko: "리더십 있게 이끄는 연애", en: "Leading love with leadership" },
    danger: { ko: "내 방식만 고집하면 상대가 질려요", en: "Partner gets tired if you only insist on your way" },
    ideal: { ko: "당신을 존경하면서도 대등하게 대화하는 사람", en: "Someone who respects you but talks as equals" }
  },
  "을": {
    core: { ko: "부드럽게 감싸는 연애", en: "Softly embracing love" },
    danger: { ko: "맞추다 보면 정작 내 마음을 잃어요", en: "Lose your own heart while accommodating" },
    ideal: { ko: "당신의 섬세함을 알아주는 사람", en: "Someone who recognizes your delicacy" }
  },
  "병": {
    core: { ko: "뜨겁고 화려한 연애", en: "Hot, glamorous love" },
    danger: { ko: "열정이 식으면 관계도 식어요", en: "When passion cools, relationship cools too" },
    ideal: { ko: "당신의 빛을 함께 즐기는 사람", en: "Someone who enjoys your light together" }
  },
  "정": {
    core: { ko: "따뜻하게 녹이는 연애", en: "Warmly melting love" },
    danger: { ko: "감정에 빠져 객관성을 잃어요", en: "Lose objectivity falling into emotions" },
    ideal: { ko: "당신의 온기를 느끼고 돌려주는 사람", en: "Someone who feels and returns your warmth" }
  },
  "무": {
    core: { ko: "든든하게 지키는 연애", en: "Solidly protecting love" },
    danger: { ko: "변화를 거부하면 관계가 정체돼요", en: "Refusing change stagnates relationship" },
    ideal: { ko: "안정감을 주고받을 수 있는 사람", en: "Someone to exchange stability with" }
  },
  "기": {
    core: { ko: "포용력 있게 품는 연애", en: "Embracing love with acceptance" },
    danger: { ko: "다 받아주다 지쳐요", en: "Get exhausted accepting everything" },
    ideal: { ko: "당신도 돌봐주는 사람", en: "Someone who takes care of you too" }
  },
  "경": {
    core: { ko: "정의롭고 원칙 있는 연애", en: "Righteous, principled love" },
    danger: { ko: "융통성 없으면 상대가 답답해해요", en: "Partner feels frustrated without flexibility" },
    ideal: { ko: "당신의 정직함을 존중하는 사람", en: "Someone who respects your honesty" }
  },
  "신": {
    core: { ko: "완벽하게 준비하는 연애", en: "Perfectly prepared love" },
    danger: { ko: "기준이 너무 높으면 아무도 안 맞아요", en: "If standards too high, no one matches" },
    ideal: { ko: "불완전함도 사랑해주는 사람", en: "Someone who loves imperfection too" }
  },
  "임": {
    core: { ko: "자유롭게 흐르는 연애", en: "Freely flowing love" },
    danger: { ko: "너무 자유로우면 상대가 불안해해요", en: "Too much freedom makes partner anxious" },
    ideal: { ko: "자유와 연결을 함께 주는 사람", en: "Someone who gives both freedom and connection" }
  },
  "계": {
    core: { ko: "직관적으로 느끼는 연애", en: "Intuitively feeling love" },
    danger: { ko: "감정에만 의존하면 현실을 놓쳐요", en: "Relying only on feelings misses reality" },
    ideal: { ko: "당신의 감성을 이해하는 사람", en: "Someone who understands your emotions" }
  },
};

// Personality traits for each day master
export const dayMasterPersonalityTraits: Record<string, {
  title: BilingualText;
  core: BilingualText;
  traits: BilingualArray;
  strength: BilingualText;
  challenge: BilingualText;
}> = {
  "갑": {
    title: { ko: "선구자형", en: "Pioneer Type" },
    core: { ko: "큰 나무처럼 곧고 당당한 사람. 새로운 길을 개척하고 앞장서는 리더십이 있어요.", en: "Upright and dignified like a great tree. You have leadership to pioneer new paths." },
    traits: { ko: ["리더십", "독립적", "진취적"], en: ["Leadership", "Independent", "Progressive"] },
    strength: { ko: "추진력과 결단력", en: "Drive and decisiveness" },
    challenge: { ko: "고집과 독선", en: "Stubbornness and self-righteousness" }
  },
  "을": {
    title: { ko: "조율자형", en: "Coordinator Type" },
    core: { ko: "부드러운 덩굴처럼 유연한 사람. 상황에 적응하고 사람들을 연결하는 능력이 뛰어나요.", en: "Flexible like a soft vine. Excellent at adapting and connecting people." },
    traits: { ko: ["유연함", "협조적", "섬세함"], en: ["Flexibility", "Cooperative", "Delicacy"] },
    strength: { ko: "적응력과 외교력", en: "Adaptability and diplomacy" },
    challenge: { ko: "우유부단함, 의존성", en: "Indecisiveness, dependency" }
  },
  "병": {
    title: { ko: "태양형", en: "Sun Type" },
    core: { ko: "태양처럼 빛나고 따뜻한 사람. 열정적이고 사람들에게 에너지를 줘요.", en: "Bright and warm like the sun. Passionate and gives energy to people." },
    traits: { ko: ["열정", "낙관적", "표현력"], en: ["Passion", "Optimistic", "Expressive"] },
    strength: { ko: "카리스마와 영향력", en: "Charisma and influence" },
    challenge: { ko: "충동성, 번아웃", en: "Impulsiveness, burnout" }
  },
  "정": {
    title: { ko: "등불형", en: "Lantern Type" },
    core: { ko: "따뜻한 등불처럼 은은하게 빛나는 사람. 섬세하고 깊이 있는 감성을 가졌어요.", en: "Glowing softly like a warm lantern. You have delicate, deep emotions." },
    traits: { ko: ["섬세함", "예술성", "온화함"], en: ["Delicacy", "Artistry", "Gentleness"] },
    strength: { ko: "공감력과 집중력", en: "Empathy and focus" },
    challenge: { ko: "예민함, 내성적", en: "Sensitivity, introversion" }
  },
  "무": {
    title: { ko: "산악형", en: "Mountain Type" },
    core: { ko: "큰 산처럼 듬직하고 신뢰감 있는 사람. 안정적이고 책임감이 강해요.", en: "Solid and trustworthy like a great mountain. Stable with strong responsibility." },
    traits: { ko: ["안정감", "신뢰성", "인내심"], en: ["Stability", "Reliability", "Patience"] },
    strength: { ko: "끈기와 포용력", en: "Perseverance and acceptance" },
    challenge: { ko: "고집, 변화 거부", en: "Stubbornness, resisting change" }
  },
  "기": {
    title: { ko: "대지형", en: "Earth Type" },
    core: { ko: "비옥한 땅처럼 모든 것을 품는 사람. 따뜻하고 누구에게나 편안함을 줘요.", en: "Embracing everything like fertile soil. Warm and comfortable to everyone." },
    traits: { ko: ["포용력", "배려심", "성실함"], en: ["Acceptance", "Consideration", "Sincerity"] },
    strength: { ko: "공감 능력과 친화력", en: "Empathy and affability" },
    challenge: { ko: "자기희생, 우유부단", en: "Self-sacrifice, indecisiveness" }
  },
  "경": {
    title: { ko: "검형", en: "Sword Type" },
    core: { ko: "날카로운 검처럼 정의롭고 단호한 사람. 원칙이 확실하고 결단력이 있어요.", en: "Righteous and decisive like a sharp sword. Clear principles and decisiveness." },
    traits: { ko: ["정의감", "결단력", "솔직함"], en: ["Justice", "Decisiveness", "Honesty"] },
    strength: { ko: "실행력과 정직함", en: "Execution and honesty" },
    challenge: { ko: "완고함, 융통성 부족", en: "Rigidity, lack of flexibility" }
  },
  "신": {
    title: { ko: "보석형", en: "Gem Type" },
    core: { ko: "다듬어진 보석처럼 세련되고 완벽을 추구하는 사람. 심미안이 뛰어나고 디테일에 강해요.", en: "Refined like a polished gem, pursuing perfection. Excellent aesthetics and strong with details." },
    traits: { ko: ["완벽주의", "심미안", "섬세함"], en: ["Perfectionism", "Aesthetics", "Delicacy"] },
    strength: { ko: "품격과 안목", en: "Class and discernment" },
    challenge: { ko: "까다로움, 비판적", en: "Pickiness, critical nature" }
  },
  "임": {
    title: { ko: "대양형", en: "Ocean Type" },
    core: { ko: "넓은 바다처럼 깊고 자유로운 사람. 지혜롭고 어떤 상황에도 유연하게 대처해요.", en: "Deep and free like the vast ocean. Wise and flexible in any situation." },
    traits: { ko: ["지혜", "자유로움", "적응력"], en: ["Wisdom", "Freedom", "Adaptability"] },
    strength: { ko: "통찰력과 포용력", en: "Insight and acceptance" },
    challenge: { ko: "방황, 책임 회피", en: "Wandering, avoiding responsibility" }
  },
  "계": {
    title: { ko: "샘물형", en: "Spring Type" },
    core: { ko: "맑은 샘물처럼 순수하고 직관적인 사람. 감성이 풍부하고 영적인 감각이 있어요.", en: "Pure and intuitive like clear spring water. Rich emotions and spiritual sense." },
    traits: { ko: ["순수함", "직관력", "감성"], en: ["Purity", "Intuition", "Emotion"] },
    strength: { ko: "영감과 창의력", en: "Inspiration and creativity" },
    challenge: { ko: "현실감 부족, 감정 기복", en: "Lack of reality, emotional swings" }
  },
};

// Health traits for each day master
export const dayMasterHealthTraits: Record<string, {
  focus: BilingualArray;
  warning: BilingualText;
  lifestyle: BilingualArray;
  stress: BilingualText;
}> = {
  "갑": {
    focus: { ko: ["간", "담낭", "눈", "근육"], en: ["Liver", "Gallbladder", "Eyes", "Muscles"] },
    warning: { ko: "스트레스가 간에 쌓여요. 화를 참으면 몸이 아파요.", en: "Stress accumulates in liver. Holding anger hurts your body." },
    lifestyle: { ko: ["규칙적 운동", "녹색 채소", "충분한 수면"], en: ["Regular exercise", "Green vegetables", "Sufficient sleep"] },
    stress: { ko: "화는 바로 풀어야 해요. 운동으로 발산하세요.", en: "Release anger immediately. Channel through exercise." }
  },
  "을": {
    focus: { ko: ["간", "목", "어깨", "신경"], en: ["Liver", "Neck", "Shoulders", "Nerves"] },
    warning: { ko: "목과 어깨에 긴장이 쌓여요. 과로하면 금방 지쳐요.", en: "Tension accumulates in neck and shoulders. You tire quickly when overworked." },
    lifestyle: { ko: ["스트레칭", "요가", "자연 속 휴식"], en: ["Stretching", "Yoga", "Rest in nature"] },
    stress: { ko: "눈치 보느라 지치지 마세요. 가끔은 NO라고 하세요.", en: "Don't exhaust yourself reading moods. Say NO sometimes." }
  },
  "병": {
    focus: { ko: ["심장", "소장", "혈압", "눈"], en: ["Heart", "Small intestine", "Blood pressure", "Eyes"] },
    warning: { ko: "열정이 과하면 심장에 무리가 와요. 과로와 수면 부족 주의.", en: "Excessive passion burdens heart. Watch overwork and sleep deprivation." },
    lifestyle: { ko: ["정기적 휴식", "유산소 운동", "쓴맛 음식 적당히"], en: ["Regular rest", "Cardio exercise", "Bitter foods moderately"] },
    stress: { ko: "흥분하면 심장이 힘들어요. 심호흡과 명상이 도움돼요.", en: "Excitement strains heart. Deep breathing and meditation help." }
  },
  "정": {
    focus: { ko: ["심장", "소장", "혈액순환", "눈"], en: ["Heart", "Small intestine", "Circulation", "Eyes"] },
    warning: { ko: "감정을 삼키면 심장이 답답해요. 불면증 주의.", en: "Swallowing emotions makes heart stuffy. Watch insomnia." },
    lifestyle: { ko: ["감정 표현", "족욕", "일찍 자기"], en: ["Express emotions", "Foot baths", "Early sleep"] },
    stress: { ko: "속앓이하지 마세요. 표현이 치유예요.", en: "Don't suffer silently. Expression is healing." }
  },
  "무": {
    focus: { ko: ["위장", "비장", "소화기", "근육"], en: ["Stomach", "Spleen", "Digestive system", "Muscles"] },
    warning: { ko: "걱정하면 위장이 아파요. 불규칙한 식사와 과식 주의.", en: "Worry hurts stomach. Watch irregular meals and overeating." },
    lifestyle: { ko: ["규칙적 식사", "황색 음식", "단 음식 적당히"], en: ["Regular meals", "Yellow foods", "Sweet foods moderately"] },
    stress: { ko: "한 번에 하나씩만 생각하세요. 지금 못 하는 건 내려놓으세요.", en: "Think one thing at a time. Let go of what you can't do now." }
  },
  "기": {
    focus: { ko: ["위장", "비장", "피부", "소화기"], en: ["Stomach", "Spleen", "Skin", "Digestive system"] },
    warning: { ko: "과로하면 소화력이 떨어져요. 스트레스가 피부로 나타나요.", en: "Overwork reduces digestion. Stress shows on skin." },
    lifestyle: { ko: ["충분한 휴식", "자연식", "일과 휴식 균형"], en: ["Enough rest", "Natural foods", "Work-rest balance"] },
    stress: { ko: "남 걱정하느라 자신을 돌보지 못해요. 가끔은 이기적이어도 괜찮아요.", en: "Don't neglect yourself caring for others. It's okay to be selfish sometimes." }
  },
  "경": {
    focus: { ko: ["폐", "대장", "피부", "호흡기"], en: ["Lungs", "Large intestine", "Skin", "Respiratory"] },
    warning: { ko: "슬픔을 삼키면 폐가 힘들어요. 건조함과 미세먼지 주의.", en: "Swallowing sadness burdens lungs. Watch dryness and fine dust." },
    lifestyle: { ko: ["깊은 호흡", "흰색 음식", "충분한 수분"], en: ["Deep breathing", "White foods", "Enough water"] },
    stress: { ko: "울고 싶을 땐 우세요. 감정 억누르면 호흡이 얕아져요.", en: "Cry when needed. Suppressing emotions shallows breathing." }
  },
  "신": {
    focus: { ko: ["폐", "대장", "피부", "치아"], en: ["Lungs", "Large intestine", "Skin", "Teeth"] },
    warning: { ko: "예민함이 피부와 호흡기에 영향줘요. 완벽주의가 턱관절 문제로.", en: "Sensitivity affects skin and respiratory. Perfectionism causes jaw issues." },
    lifestyle: { ko: ["11시 전 수면", "습도 유지", "자극적 음식 피하기"], en: ["Sleep before 11pm", "Maintain humidity", "Avoid stimulating foods"] },
    stress: { ko: "70%만 해도 괜찮아요. 스트레스 관리가 피부 관리보다 중요해요.", en: "70% is enough. Stress management matters more than skincare." }
  },
  "임": {
    focus: { ko: ["신장", "방광", "귀", "뼈"], en: ["Kidneys", "Bladder", "Ears", "Bones"] },
    warning: { ko: "물 적게 마시면 신장에 무리. 과로가 뼈와 관절에 영향.", en: "Little water burdens kidneys. Overwork affects bones and joints." },
    lifestyle: { ko: ["충분한 수분", "검은색 음식", "과로 피하기"], en: ["Enough water", "Black foods", "Avoid overwork"] },
    stress: { ko: "생각이 많으면 잠을 못 자요. 머릿속 비우는 연습하세요.", en: "Too many thoughts prevent sleep. Practice emptying your mind." }
  },
  "계": {
    focus: { ko: ["신장", "방광", "혈액", "림프"], en: ["Kidneys", "Bladder", "Blood", "Lymph"] },
    warning: { ko: "감정 흡수가 과하면 에너지 고갈. 추위와 수분 부족에 약해요.", en: "Absorbing too many emotions depletes energy. Vulnerable to cold and dehydration." },
    lifestyle: { ko: ["따뜻하게", "온수 자주", "명상과 수면"], en: ["Stay warm", "Warm water often", "Meditation and sleep"] },
    stress: { ko: "남의 감정까지 다 느끼면 지쳐요. 경계를 지키세요.", en: "Feeling everyone's emotions exhausts you. Keep boundaries." }
  },
};
