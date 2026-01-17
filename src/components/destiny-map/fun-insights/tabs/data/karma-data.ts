/**
 * @file KarmaTab data objects
 * Extracted from KarmaTab.tsx for modularity
 */

import type {
  DayMasterInfo,
  FiveElementInfo,
  ShinsalInfo,
  NorthNodeInfo,
  SaturnInfo,
} from './karma-types';

// ============================================================
// 일간(Day Master) - 쉬운 비유와 상세 설명
// ============================================================

export const dayMasterSimple: Record<string, DayMasterInfo> = {
  "갑": {
    emoji: "🌳",
    simpleKo: "큰 나무 아이",
    simpleEn: "Big Tree Kid",
    metaphorKo: "숲에서 제일 큰 나무처럼, 위로 위로 자라고 싶어해요! 항상 '내가 먼저!' 하고 앞으로 나가요. 새로운 모험이 제일 좋아요!",
    metaphorEn: "Like the biggest tree in the forest, always wanting to grow taller! Always says 'Me first!' and leads the way. Loves new adventures!",
    strengthKo: "리더십이 넘쳐요! 새로운 것을 시작하는 힘이 강해요",
    strengthEn: "Born leader! Strong power to start new things",
    watchOutKo: "가끔 너무 고집이 세요. 다른 친구 말도 들어보세요!",
    watchOutEn: "Sometimes too stubborn. Listen to friends too!",
    luckyColorKo: "🟢 초록색 (나무처럼!)",
    luckyColorEn: "🟢 Green (Like a tree!)"
  },
  "을": {
    emoji: "🌿",
    simpleKo: "덩굴 아이",
    simpleEn: "Vine Kid",
    metaphorKo: "담쟁이덩굴처럼 어디든 찰싹! 붙어서 자랄 수 있어요. 부드럽지만 끈질기게 목표까지 가요. 적응력 만점!",
    metaphorEn: "Like ivy that sticks anywhere! Soft but persistent to reach goals. Super adaptable!",
    strengthKo: "어디서든 잘 적응해요! 부드럽지만 포기 안 해요",
    strengthEn: "Adapts anywhere! Soft but never gives up",
    watchOutKo: "너무 다른 사람에게 맞추다 보면 나를 잃어버릴 수 있어요",
    watchOutEn: "May lose yourself trying too hard to fit in",
    luckyColorKo: "💚 연두색 (새싹처럼!)",
    luckyColorEn: "💚 Light green (Like sprouts!)"
  },
  "병": {
    emoji: "☀️",
    simpleKo: "태양 아이",
    simpleEn: "Sun Kid",
    metaphorKo: "뜨거운 태양처럼 반짝반짝! 어디 가든 주목받아요. 주변을 환하게 밝히는 에너지가 넘쳐요!",
    metaphorEn: "Shiny like the hot sun! Gets attention everywhere. Overflowing energy that brightens surroundings!",
    strengthKo: "존재감이 뿜뿜! 사람들에게 희망을 줘요",
    strengthEn: "Amazing presence! Gives hope to people",
    watchOutKo: "가끔 너무 뜨거워서 다른 사람이 힘들 수 있어요. 쉬어가세요!",
    watchOutEn: "Sometimes too hot for others. Take breaks!",
    luckyColorKo: "🔴 빨간색, 주황색 (태양처럼!)",
    luckyColorEn: "🔴 Red, Orange (Like the sun!)"
  },
  "정": {
    emoji: "🕯️",
    simpleKo: "촛불 아이",
    simpleEn: "Candle Kid",
    metaphorKo: "어둠 속 촛불처럼 은은하게 빛나요. 조용하지만 깊이 생각하고, 마음을 따뜻하게 녹여줘요.",
    metaphorEn: "Glows gently like a candle in the dark. Quiet but thinks deeply, warms hearts.",
    strengthKo: "집중력 최고! 섬세하고 따뜻한 마음",
    strengthEn: "Best focus! Delicate and warm heart",
    watchOutKo: "혼자 너무 많이 생각하면 지쳐요. 나눠보세요!",
    watchOutEn: "Thinking too much alone is tiring. Share!",
    luckyColorKo: "🧡 주황색, 보라색 (촛불처럼!)",
    luckyColorEn: "🧡 Orange, Purple (Like candlelight!)"
  },
  "무": {
    emoji: "🏔️",
    simpleKo: "산 아이",
    simpleEn: "Mountain Kid",
    metaphorKo: "커다란 산처럼 듬직해요! 흔들리지 않고 모든 것을 품어줘요. 사람들이 기대고 싶어하는 존재예요.",
    metaphorEn: "Solid like a big mountain! Unshakeable and embraces everything. People want to lean on you.",
    strengthKo: "든든한 버팀목! 믿음직스러워요",
    strengthEn: "Reliable support! Very trustworthy",
    watchOutKo: "너무 무거운 것을 혼자 지면 힘들어요. 도움 요청하세요!",
    watchOutEn: "Carrying too much alone is hard. Ask for help!",
    luckyColorKo: "🟤 갈색, 베이지 (산처럼!)",
    luckyColorEn: "🟤 Brown, Beige (Like mountains!)"
  },
  "기": {
    emoji: "🌾",
    simpleKo: "논밭 아이",
    simpleEn: "Field Kid",
    metaphorKo: "비옥한 논밭처럼 뭐든 키워내요! 씨앗을 심으면 열매가 열리게 하는 마법 같은 힘이 있어요.",
    metaphorEn: "Grows anything like fertile fields! Magical power to make seeds bear fruit.",
    strengthKo: "뭐든 잘 키워요! 보살피는 능력 최고",
    strengthEn: "Grows anything well! Best nurturing ability",
    watchOutKo: "남 챙기다 자기를 잊으면 안 돼요!",
    watchOutEn: "Don't forget yourself while caring for others!",
    luckyColorKo: "🟡 노란색, 흙색 (논밭처럼!)",
    luckyColorEn: "🟡 Yellow, Earth tones (Like fields!)"
  },
  "경": {
    emoji: "⚔️",
    simpleKo: "검 아이",
    simpleEn: "Sword Kid",
    metaphorKo: "날카로운 검처럼 척척! 결정을 잘 내려요. 정의로운 일에 앞장서고, 필요할 때 과감하게 행동해요!",
    metaphorEn: "Sharp like a sword! Makes decisions well. Leads for justice and acts boldly when needed!",
    strengthKo: "결단력 갑! 정의로운 마음",
    strengthEn: "Ultimate decision maker! Righteous heart",
    watchOutKo: "말이 너무 날카로우면 친구가 상처받아요. 부드럽게!",
    watchOutEn: "Too sharp words hurt friends. Be gentle!",
    luckyColorKo: "⚪ 흰색, 은색 (검처럼!)",
    luckyColorEn: "⚪ White, Silver (Like a sword!)"
  },
  "신": {
    emoji: "💎",
    simpleKo: "보석 아이",
    simpleEn: "Gem Kid",
    metaphorKo: "반짝이는 보석처럼 완벽을 추구해요! 디테일에 강하고, 예쁜 것을 알아보는 눈이 있어요.",
    metaphorEn: "Pursues perfection like a shining gem! Strong in details, has an eye for beauty.",
    strengthKo: "완벽주의! 섬세하고 예술적이에요",
    strengthEn: "Perfectionist! Delicate and artistic",
    watchOutKo: "완벽하지 않아도 괜찮아요. 자신을 너무 몰아붙이지 마세요!",
    watchOutEn: "It's okay not to be perfect. Don't push too hard!",
    luckyColorKo: "✨ 은색, 금색 (보석처럼!)",
    luckyColorEn: "✨ Silver, Gold (Like gems!)"
  },
  "임": {
    emoji: "🌊",
    simpleKo: "바다 아이",
    simpleEn: "Ocean Kid",
    metaphorKo: "넓고 깊은 바다처럼 마음이 넓어요! 모든 것을 품을 수 있고, 지혜가 넘쳐요. 흐름을 잘 읽어요.",
    metaphorEn: "Wide and deep heart like the ocean! Can embrace everything, full of wisdom. Reads the flow well.",
    strengthKo: "마음이 넓어요! 깊은 생각, 지혜로워요",
    strengthEn: "Wide heart! Deep thoughts, very wise",
    watchOutKo: "너무 깊이 빠지면 헤어나오기 힘들어요. 균형을 잡으세요!",
    watchOutEn: "Going too deep makes it hard to come out. Find balance!",
    luckyColorKo: "💙 파란색, 검정 (바다처럼!)",
    luckyColorEn: "💙 Blue, Black (Like the ocean!)"
  },
  "계": {
    emoji: "💧",
    simpleKo: "샘물 아이",
    simpleEn: "Spring Water Kid",
    metaphorKo: "맑은 샘물처럼 순수해요! 직감이 뛰어나고, 감성이 풍부해요. 영적으로 민감한 특별한 능력이 있어요.",
    metaphorEn: "Pure like clear spring water! Great intuition, rich emotions. Special spiritual sensitivity.",
    strengthKo: "직감력 만점! 예민하고 감성적이에요",
    strengthEn: "Amazing intuition! Sensitive and emotional",
    watchOutKo: "남의 감정까지 다 흡수하면 지쳐요. 나를 지키세요!",
    watchOutEn: "Absorbing everyone's emotions is tiring. Protect yourself!",
    luckyColorKo: "💜 보라색, 파스텔 (샘물처럼!)",
    luckyColorEn: "💜 Purple, Pastel (Like spring water!)"
  }
};

// ============================================================
// 오행 에너지 쉬운 설명
// ============================================================

export const fiveElementsSimple: Record<string, FiveElementInfo> = {
  wood: {
    emoji: "🌳",
    nameKo: "나무 에너지 (木)",
    nameEn: "Wood Energy (木)",
    simpleKo: "쑥쑥 자라는 힘! 새로운 시작, 성장, 도전하는 에너지예요.",
    simpleEn: "Growing power! Energy for new beginnings, growth, and challenges.",
    likeKo: "봄, 동쪽, 초록색, 아침, 신맛",
    likeEn: "Spring, East, Green, Morning, Sour taste",
    tooMuchKo: "너무 많으면: 성급하고 화가 잘 나요 😤",
    tooMuchEn: "Too much: Impatient and easily angry 😤",
    tooLittleKo: "부족하면: 결단력이 없고 시작을 못 해요 😞",
    tooLittleEn: "Too little: Indecisive, can't start things 😞"
  },
  fire: {
    emoji: "🔥",
    nameKo: "불 에너지 (火)",
    nameEn: "Fire Energy (火)",
    simpleKo: "활활 타오르는 열정! 기쁨, 표현, 빛나는 에너지예요.",
    simpleEn: "Burning passion! Energy of joy, expression, and shining.",
    likeKo: "여름, 남쪽, 빨간색, 낮, 쓴맛",
    likeEn: "Summer, South, Red, Daytime, Bitter taste",
    tooMuchKo: "너무 많으면: 흥분하기 쉽고 지쳐요 🔥💦",
    tooMuchEn: "Too much: Gets excited easily, burns out 🔥💦",
    tooLittleKo: "부족하면: 우울하고 기운이 없어요 😔",
    tooLittleEn: "Too little: Depressed, no energy 😔"
  },
  earth: {
    emoji: "🏔️",
    nameKo: "흙 에너지 (土)",
    nameEn: "Earth Energy (土)",
    simpleKo: "든든한 안정감! 중심 잡기, 믿음, 포용하는 에너지예요.",
    simpleEn: "Solid stability! Energy of centering, trust, and embracing.",
    likeKo: "환절기, 중앙, 노란색, 오후, 단맛",
    likeEn: "Season transitions, Center, Yellow, Afternoon, Sweet taste",
    tooMuchKo: "너무 많으면: 고집이 세고 변화를 싫어해요 😑",
    tooMuchEn: "Too much: Stubborn, dislikes change 😑",
    tooLittleKo: "부족하면: 불안하고 중심이 없어요 😰",
    tooLittleEn: "Too little: Anxious, no center 😰"
  },
  metal: {
    emoji: "⚔️",
    nameKo: "쇠 에너지 (金)",
    nameEn: "Metal Energy (金)",
    simpleKo: "칼처럼 날카로운 결단! 정리, 마무리, 수확하는 에너지예요.",
    simpleEn: "Sharp decision like a sword! Energy of organizing, finishing, harvesting.",
    likeKo: "가을, 서쪽, 흰색, 저녁, 매운맛",
    likeEn: "Autumn, West, White, Evening, Spicy taste",
    tooMuchKo: "너무 많으면: 너무 날카롭고 비판적이에요 😤",
    tooMuchEn: "Too much: Too sharp and critical 😤",
    tooLittleKo: "부족하면: 결정을 못 하고 끝을 못 내요 😕",
    tooLittleEn: "Too little: Can't decide, can't finish 😕"
  },
  water: {
    emoji: "💧",
    nameKo: "물 에너지 (水)",
    nameEn: "Water Energy (水)",
    simpleKo: "흐르는 물처럼 지혜! 생각, 휴식, 저장하는 에너지예요.",
    simpleEn: "Wisdom like flowing water! Energy of thinking, resting, storing.",
    likeKo: "겨울, 북쪽, 검정/파랑, 밤, 짠맛",
    likeEn: "Winter, North, Black/Blue, Night, Salty taste",
    tooMuchKo: "너무 많으면: 두려움이 많고 우울해요 😨",
    tooMuchEn: "Too much: Fearful and depressed 😨",
    tooLittleKo: "부족하면: 지혜가 부족하고 뻣뻣해요 😐",
    tooLittleEn: "Too little: Lacks wisdom, stiff 😐"
  }
};

// ============================================================
// 신살 쉬운 설명
// ============================================================

export const shinsalSimple: Record<string, ShinsalInfo> = {
  "천을귀인": {
    emoji: "👼",
    typeKo: "천사의 별",
    typeEn: "Angel Star",
    simpleKo: "하늘에서 천사가 지켜봐요!",
    simpleEn: "An angel watches over you from heaven!",
    storyKo: "어려울 때마다 신기하게 누군가 나타나 도와줘요. 마치 천사가 보내준 것처럼요! 주변에 좋은 사람이 많이 모여요.",
    storyEn: "Mysteriously, someone appears to help whenever you're in trouble. Like an angel sent them! Good people gather around you.",
    adviceKo: "혼자 힘들어하지 말고 도움을 요청하세요. 귀인이 반드시 나타나요!",
    adviceEn: "Don't struggle alone, ask for help. A helper will surely appear!",
    isLucky: true
  },
  "천덕귀인": {
    emoji: "🛡️",
    typeKo: "하늘의 방패",
    typeEn: "Heaven's Shield",
    simpleKo: "하늘이 보호해줘요!",
    simpleEn: "Heaven protects you!",
    storyKo: "큰 위험이 와도 신기하게 피해가요. 마치 투명 방패가 있는 것처럼요! 나쁜 일이 다가와도 슬쩍 비켜가는 행운이 있어요.",
    storyEn: "Mysteriously avoids big dangers. Like having an invisible shield! Bad things somehow miss you.",
    adviceKo: "선한 마음으로 살면 이 복이 더 강해져요. 좋은 일을 많이 하세요!",
    adviceEn: "Living with a good heart strengthens this blessing. Do good deeds!",
    isLucky: true
  },
  "문창귀인": {
    emoji: "📚",
    typeKo: "공부의 별",
    typeEn: "Study Star",
    simpleKo: "공부를 잘하는 별!",
    simpleEn: "Star of great learning!",
    storyKo: "배우는 것이 재미있고 빨리 이해해요. 글 쓰는 것, 말하는 것에 특별한 재능이 있어요. 선생님들이 좋아해요!",
    storyEn: "Learning is fun and you understand quickly. Special talent in writing and speaking. Teachers love you!",
    adviceKo: "계속 배우고 글을 쓰세요. 그게 당신의 무기예요!",
    adviceEn: "Keep learning and writing. That's your weapon!",
    isLucky: true
  },
  "역마살": {
    emoji: "✈️",
    typeKo: "여행자의 별",
    typeEn: "Traveler Star",
    simpleKo: "한 곳에 있기 힘들어요!",
    simpleEn: "Hard to stay in one place!",
    storyKo: "가만히 있으면 근질근질해요! 새로운 곳, 새로운 사람이 좋아요. 여행하거나 이동이 많은 삶이 맞아요.",
    storyEn: "Staying still makes you restless! Love new places and people. A life with travel and movement suits you.",
    adviceKo: "해외, 출장, 이동이 많은 일을 선택하세요. 돌아다녀야 운이 트여요!",
    adviceEn: "Choose work with overseas travel and movement. Moving around opens luck!",
    isLucky: true
  },
  "화개살": {
    emoji: "🎨",
    typeKo: "예술가의 별",
    typeEn: "Artist Star",
    simpleKo: "예술적 감각이 뛰어나요!",
    simpleEn: "Outstanding artistic sense!",
    storyKo: "뭔가 특별한 것이 보여요. 다른 사람이 못 느끼는 것을 느껴요. 예술, 종교, 영적인 것에 끌려요.",
    storyEn: "You see something special. Feel what others can't. Drawn to art, religion, spiritual things.",
    adviceKo: "창작 활동이나 명상을 해보세요. 당신의 진짜 재능이 거기 있어요!",
    adviceEn: "Try creative activities or meditation. Your true talent is there!",
    isLucky: true
  },
  "장성살": {
    emoji: "👑",
    typeKo: "리더의 별",
    typeEn: "Leader Star",
    simpleKo: "대장이 되는 별!",
    simpleEn: "Star of becoming a leader!",
    storyKo: "사람들이 자연스럽게 따라와요. 카리스마가 있고, 책임감이 강해요. 높은 자리에 올라갈 운명이에요.",
    storyEn: "People naturally follow you. You have charisma and strong responsibility. Destined for high positions.",
    adviceKo: "리더십을 발휘하세요! 그게 당신의 역할이에요.",
    adviceEn: "Exercise your leadership! That's your role.",
    isLucky: true
  },
  "도화살": {
    emoji: "🌸",
    typeKo: "매력의 별",
    typeEn: "Charm Star",
    simpleKo: "매력이 넘쳐요!",
    simpleEn: "Overflowing charm!",
    storyKo: "사람들이 끌려와요. 인기가 많아요! 하지만 이성 문제로 복잡해질 수 있어요. 매력을 잘 써야 해요.",
    storyEn: "People are attracted to you. Very popular! But romance can get complicated. Use charm wisely.",
    adviceKo: "매력을 일이나 예술에 쓰면 대성공해요! 사랑은 신중하게.",
    adviceEn: "Using charm for work or art brings great success! Be careful with love.",
    isLucky: false
  },
  "홍염살": {
    emoji: "💋",
    typeKo: "정열의 별",
    typeEn: "Passion Star",
    simpleKo: "강렬한 매력이 있어요!",
    simpleEn: "Intense attraction!",
    storyKo: "불꽃 같은 매력이 있어요. 이성에게 강렬한 인상을 줘요. 하지만 감정이 너무 뜨거우면 위험해요.",
    storyEn: "Flame-like charm. Makes intense impressions on others. But emotions too hot can be dangerous.",
    adviceKo: "감정 조절을 배우세요. 그 열정을 좋은 곳에 쓰면 성공해요!",
    adviceEn: "Learn emotional control. Using that passion well leads to success!",
    isLucky: false
  },
  "백호살": {
    emoji: "🐯",
    typeKo: "호랑이의 별",
    typeEn: "Tiger Star",
    simpleKo: "용감하지만 조심해야 해요!",
    simpleEn: "Brave but need to be careful!",
    storyKo: "호랑이처럼 용감하고 빨라요! 하지만 너무 급하면 다칠 수 있어요. 급한 결정은 피하세요.",
    storyEn: "Brave and fast like a tiger! But being too hasty can cause injury. Avoid rushed decisions.",
    adviceKo: "한 박자 쉬고 결정하세요. 안전이 중요해요!",
    adviceEn: "Take a beat before deciding. Safety is important!",
    isLucky: false
  },
  "공망": {
    emoji: "🕳️",
    typeKo: "빈 공간의 별",
    typeEn: "Empty Space Star",
    simpleKo: "어떤 것은 비어있어요.",
    simpleEn: "Something is empty.",
    storyKo: "특정 영역에서 헛수고가 될 수 있어요. 하지만 비어있기 때문에 오히려 자유로울 수 있어요!",
    storyEn: "May have futile efforts in certain areas. But emptiness can mean freedom!",
    adviceKo: "집착을 버리면 오히려 채워져요. 내려놓으세요!",
    adviceEn: "Letting go fills you instead. Release attachments!",
    isLucky: false
  },
  "겁살": {
    emoji: "⚡",
    typeKo: "급변의 별",
    typeEn: "Sudden Change Star",
    simpleKo: "갑작스러운 일이 생겨요!",
    simpleEn: "Sudden things happen!",
    storyKo: "예상 못한 일이 갑자기 생길 수 있어요. 하지만 그걸 극복하면 엄청 강해져요!",
    storyEn: "Unexpected things can suddenly happen. But overcoming them makes you incredibly strong!",
    adviceKo: "위기를 기회로 바꾸는 연습을 하세요. 당신은 강해질 거예요!",
    adviceEn: "Practice turning crisis into opportunity. You'll become strong!",
    isLucky: false
  },
  "양인살": {
    emoji: "🗡️",
    typeKo: "칼날의 별",
    typeEn: "Blade Star",
    simpleKo: "강한 추진력이 있어요!",
    simpleEn: "Strong driving force!",
    storyKo: "밀어붙이는 힘이 강해요! 하지만 너무 세면 자기도 다치고 남도 다쳐요.",
    storyEn: "Strong pushing power! But if too strong, you and others get hurt.",
    adviceKo: "그 에너지를 운동이나 일에 쓰세요. 잘 쓰면 대단한 힘이에요!",
    adviceEn: "Channel that energy into exercise or work. Used well, it's amazing power!",
    isLucky: false
  },
  "고신살": {
    emoji: "🏔️",
    typeKo: "고독한 산의 별",
    typeEn: "Lonely Mountain Star",
    simpleKo: "혼자 있는 시간이 필요해요.",
    simpleEn: "Need time alone.",
    storyKo: "외로움을 느끼기 쉽지만, 그래서 독립심이 강해져요. 혼자서도 잘해요!",
    storyEn: "Easy to feel lonely, but that makes you independent. You do well alone!",
    adviceKo: "혼자만의 시간을 창조적으로 쓰세요. 그게 당신의 강점이에요!",
    adviceEn: "Use alone time creatively. That's your strength!",
    isLucky: false
  },
  "월덕귀인": {
    emoji: "🌙",
    typeKo: "달의 축복",
    typeEn: "Moon's Blessing",
    simpleKo: "어머니 같은 사람이 도와줘요!",
    simpleEn: "Mother-like people help you!",
    storyKo: "여성 어른이나 어머니 같은 분들이 당신을 도와줘요. 따뜻한 보살핌을 받는 복이 있어요.",
    storyEn: "Female elders or mother figures help you. Blessed with warm care.",
    adviceKo: "여성 멘토나 어른을 소중히 하세요. 그분들이 복이에요!",
    adviceEn: "Cherish female mentors and elders. They're your blessing!",
    isLucky: true
  },
  "학당귀인": {
    emoji: "🎓",
    typeKo: "학교의 별",
    typeEn: "School Star",
    simpleKo: "배움에 복이 있어요!",
    simpleEn: "Blessed in learning!",
    storyKo: "공부하면 잘 돼요! 학교, 자격증, 배움의 기회가 많이 찾아와요.",
    storyEn: "Studying works out well! Many opportunities for school, certifications, learning come to you.",
    adviceKo: "평생 배우세요. 그게 당신의 성공 비결이에요!",
    adviceEn: "Learn for life. That's your secret to success!",
    isLucky: true
  },
  "금여록": {
    emoji: "💰",
    typeKo: "재물의 별",
    typeEn: "Wealth Star",
    simpleKo: "돈복이 있어요!",
    simpleEn: "Money luck!",
    storyKo: "물질적인 복이 있어요. 돈이 들어오는 통로가 열려 있어요. 풍요로운 삶을 살 수 있어요.",
    storyEn: "Material blessings. Channels for money are open. Can live an abundant life.",
    adviceKo: "돈보다 가치를 쫓으세요. 그러면 돈이 따라와요!",
    adviceEn: "Chase value over money. Then money follows!",
    isLucky: true
  },
  "천주귀인": {
    emoji: "🍻",
    typeKo: "사교의 별",
    typeEn: "Social Star",
    simpleKo: "사람들과 잘 어울려요!",
    simpleEn: "Gets along well with people!",
    storyKo: "파티, 모임, 사교에서 빛나요! 음식과 술에도 복이 있어요. 네트워킹의 달인!",
    storyEn: "Shines at parties and gatherings! Blessed with food and drink. Networking master!",
    adviceKo: "사람을 만나세요. 기회가 사람에게서 와요!",
    adviceEn: "Meet people. Opportunities come from people!",
    isLucky: true
  },
  "원진살": {
    emoji: "😕",
    typeKo: "오해의 별",
    typeEn: "Misunderstanding Star",
    simpleKo: "오해를 받기 쉬워요.",
    simpleEn: "Easily misunderstood.",
    storyKo: "같은 말을 해도 오해를 받을 때가 있어요. 하지만 진심을 전하면 풀려요!",
    storyEn: "Sometimes misunderstood even saying the same thing. But sincerity resolves it!",
    adviceKo: "오해가 생기면 적극적으로 소통하세요. 피하면 안 돼요!",
    adviceEn: "Communicate actively when misunderstood. Don't avoid it!",
    isLucky: false
  },
  "괴강살": {
    emoji: "🦁",
    typeKo: "강렬한 별",
    typeEn: "Intense Star",
    simpleKo: "극단적으로 강해요!",
    simpleEn: "Extremely strong!",
    storyKo: "성격이 강렬해서 호불호가 갈려요. 하지만 큰 일을 해낼 수 있는 힘이 있어요!",
    storyEn: "Strong personality divides opinions. But you have power to accomplish great things!",
    adviceKo: "큰 목표를 세우세요. 당신은 큰 일을 할 사람이에요!",
    adviceEn: "Set big goals. You're meant for great things!",
    isLucky: false
  },
  "과숙살": {
    emoji: "💪",
    typeKo: "독립의 별",
    typeEn: "Independence Star",
    simpleKo: "혼자서도 잘 해내요!",
    simpleEn: "Does well alone!",
    storyKo: "스스로의 힘으로 성취해야 해요. 배우자 덕보다는 자기 노력으로 성공해요.",
    storyEn: "Must achieve by your own power. Success through effort, not spouse's help.",
    adviceKo: "스스로 강해지세요. 그게 당신의 운명이에요!",
    adviceEn: "Become strong yourself. That's your destiny!",
    isLucky: false
  }
};

// ============================================================
// 노스노드 하우스 쉬운 설명
// ============================================================

export const northNodeSimple: Record<number, NorthNodeInfo> = {
  1: {
    emoji: "🦸",
    titleKo: "영웅이 되는 길",
    titleEn: "Path to Hero",
    simpleKo: "이번 생에서는 '나'를 찾아야 해요! 다른 사람에게 기대지 말고, 내가 주인공이 되세요.",
    simpleEn: "This life, find 'yourself'! Don't lean on others, become the main character.",
    lessonKo: "혼자 결정하고 혼자 시작하는 연습을 하세요",
    lessonEn: "Practice deciding and starting alone",
    tipKo: "나를 먼저 생각해도 이기적인 게 아니에요!",
    tipEn: "Thinking of yourself first isn't selfish!"
  },
  2: {
    emoji: "💎",
    titleKo: "보물을 찾는 길",
    titleEn: "Path to Treasure",
    simpleKo: "나만의 가치를 알아야 해요! 내가 가진 것, 내가 할 수 있는 것의 가치를 믿으세요.",
    simpleEn: "Know your own worth! Believe in what you have and can do.",
    lessonKo: "다른 사람 것에 의존하지 말고 나만의 것을 만드세요",
    lessonEn: "Don't depend on others' things, create your own",
    tipKo: "돈을 벌고 모으는 것도 당신의 과제예요!",
    tipEn: "Earning and saving money is your task too!"
  },
  3: {
    emoji: "💬",
    titleKo: "말하는 힘을 키우는 길",
    titleEn: "Path to Communication",
    simpleKo: "소통하고 배우고 연결하는 게 중요해요! 생각을 말로 표현하세요.",
    simpleEn: "Communicating, learning, connecting matters! Express thoughts in words.",
    lessonKo: "높은 이상만 쫓지 말고 일상의 대화에 집중하세요",
    lessonEn: "Don't just chase high ideals, focus on daily conversation",
    tipKo: "글쓰기, 말하기, SNS가 당신의 무기예요!",
    tipEn: "Writing, speaking, SNS are your weapons!"
  },
  4: {
    emoji: "🏠",
    titleKo: "집을 짓는 길",
    titleEn: "Path to Home",
    simpleKo: "마음의 집이 필요해요! 가족, 감정, 내면의 안정을 찾으세요.",
    simpleEn: "Need a home for the heart! Find family, emotions, inner stability.",
    lessonKo: "사회적 성공만 쫓지 말고 마음의 뿌리를 내리세요",
    lessonEn: "Don't just chase social success, put down emotional roots",
    tipKo: "가족과 시간을 보내는 것이 성장이에요!",
    tipEn: "Spending time with family is growth!"
  },
  5: {
    emoji: "🎭",
    titleKo: "빛나는 별이 되는 길",
    titleEn: "Path to Stardom",
    simpleKo: "창조하고 표현하고 즐기세요! 당신만의 빛을 발산하세요.",
    simpleEn: "Create, express, enjoy! Radiate your unique light.",
    lessonKo: "집단에 숨지 말고 무대 위로 올라가세요",
    lessonEn: "Don't hide in the crowd, get on stage",
    tipKo: "취미, 예술, 연애가 당신의 성장 열쇠예요!",
    tipEn: "Hobbies, art, romance are your growth keys!"
  },
  6: {
    emoji: "⚙️",
    titleKo: "장인이 되는 길",
    titleEn: "Path to Mastery",
    simpleKo: "일상을 가꾸고 봉사하세요! 디테일과 건강이 중요해요.",
    simpleEn: "Cultivate daily life and serve! Details and health matter.",
    lessonKo: "꿈에만 빠지지 말고 현실적으로 실천하세요",
    lessonEn: "Don't just dream, take practical action",
    tipKo: "루틴, 건강관리, 봉사가 당신을 성장시켜요!",
    tipEn: "Routine, health care, service help you grow!"
  },
  7: {
    emoji: "🤝",
    titleKo: "함께하는 길",
    titleEn: "Path to Partnership",
    simpleKo: "파트너십을 배워야 해요! 혼자 다 하려 하지 말고 협력하세요.",
    simpleEn: "Learn partnership! Don't try to do everything alone, cooperate.",
    lessonKo: "나만 생각하지 말고 '우리'를 생각하세요",
    lessonEn: "Don't just think of 'me', think of 'us'",
    tipKo: "결혼, 사업 파트너, 협업이 성장의 길이에요!",
    tipEn: "Marriage, business partners, collaboration are paths to growth!"
  },
  8: {
    emoji: "🦋",
    titleKo: "변신하는 길",
    titleEn: "Path to Transformation",
    simpleKo: "깊이 변화하고 연결해야 해요! 표면이 아닌 깊은 곳으로 들어가세요.",
    simpleEn: "Deep change and connection needed! Go deep, not surface.",
    lessonKo: "물질적 안정에 집착하지 말고 변화를 받아들이세요",
    lessonEn: "Don't cling to material security, embrace change",
    tipKo: "위기가 오면 그것이 당신의 성장 기회예요!",
    tipEn: "When crisis comes, that's your growth opportunity!"
  },
  9: {
    emoji: "🌍",
    titleKo: "탐험가의 길",
    titleEn: "Path to Exploration",
    simpleKo: "넓은 세계로 나가세요! 큰 그림, 의미, 철학을 찾으세요.",
    simpleEn: "Go out to the wider world! Find the big picture, meaning, philosophy.",
    lessonKo: "세부적인 것에 갇히지 말고 높이 날아올라 보세요",
    lessonEn: "Don't get trapped in details, fly high and see",
    tipKo: "여행, 유학, 종교/철학 공부가 성장의 길이에요!",
    tipEn: "Travel, study abroad, religion/philosophy are paths to growth!"
  },
  10: {
    emoji: "🏆",
    titleKo: "정상에 오르는 길",
    titleEn: "Path to Summit",
    simpleKo: "사회적 역할을 찾으세요! 세상에 나가 당신의 일을 하세요.",
    simpleEn: "Find your social role! Go out and do your work in the world.",
    lessonKo: "가족에만 머물지 말고 세상에서 역할을 하세요",
    lessonEn: "Don't just stay with family, play a role in the world",
    tipKo: "커리어, 사회적 성공이 당신의 과제예요!",
    tipEn: "Career, social success are your tasks!"
  },
  11: {
    emoji: "🌐",
    titleKo: "함께 꿈꾸는 길",
    titleEn: "Path to Collective Dreams",
    simpleKo: "큰 공동체와 미래를 위해 일하세요! 나보다 '우리 모두'를 생각하세요.",
    simpleEn: "Work for larger community and future! Think 'all of us' not just 'me'.",
    lessonKo: "개인적 영광만 쫓지 말고 나누는 법을 배우세요",
    lessonEn: "Don't just chase personal glory, learn to share",
    tipKo: "동호회, 네트워크, 사회 활동이 성장의 길이에요!",
    tipEn: "Clubs, networks, social activities are paths to growth!"
  },
  12: {
    emoji: "🧘",
    titleKo: "영혼을 만나는 길",
    titleEn: "Path to Spirit",
    simpleKo: "내면의 평화를 찾으세요! 영적 성장이 이번 생의 과제예요.",
    simpleEn: "Find inner peace! Spiritual growth is this life's task.",
    lessonKo: "외부 세계에만 집중하지 말고 내면으로 들어가세요",
    lessonEn: "Don't just focus on outer world, go inward",
    tipKo: "명상, 요가, 예술, 봉사가 당신을 채워요!",
    tipEn: "Meditation, yoga, art, service fill you!"
  }
};

// ============================================================
// 토성 하우스 쉬운 설명
// ============================================================

export const saturnSimple: Record<number, SaturnInfo> = {
  1: { emoji: "🪨", lessonKo: "나 자신을 믿는 법", lessonEn: "Believing in myself", challengeKo: "자신감 부족", challengeEn: "Lack of confidence", rewardKo: "진정한 자아 발견", rewardEn: "Finding true self" },
  2: { emoji: "💸", lessonKo: "돈과 가치를 다루는 법", lessonEn: "Handling money and value", challengeKo: "재정적 불안", challengeEn: "Financial insecurity", rewardKo: "단단한 재정 기반", rewardEn: "Solid financial foundation" },
  3: { emoji: "🗣️", lessonKo: "말하고 소통하는 법", lessonEn: "Speaking and communicating", challengeKo: "표현의 어려움", challengeEn: "Difficulty expressing", rewardKo: "명확한 소통 능력", rewardEn: "Clear communication skills" },
  4: { emoji: "🏠", lessonKo: "가족과 뿌리의 소중함", lessonEn: "Value of family and roots", challengeKo: "가정의 무거움", challengeEn: "Heavy family burden", rewardKo: "단단한 정서적 기반", rewardEn: "Solid emotional foundation" },
  5: { emoji: "🎨", lessonKo: "즐기고 창조하는 법", lessonEn: "Enjoying and creating", challengeKo: "재미를 느끼기 어려움", challengeEn: "Hard to feel fun", rewardKo: "성숙한 창의력", rewardEn: "Mature creativity" },
  6: { emoji: "⚕️", lessonKo: "건강과 일상의 소중함", lessonEn: "Value of health and routine", challengeKo: "건강/일 문제", challengeEn: "Health/work issues", rewardKo: "건강한 생활 습관", rewardEn: "Healthy lifestyle habits" },
  7: { emoji: "💍", lessonKo: "관계와 협력의 기술", lessonEn: "Art of relationships and cooperation", challengeKo: "관계의 어려움", challengeEn: "Relationship difficulties", rewardKo: "성숙한 파트너십", rewardEn: "Mature partnership" },
  8: { emoji: "🔮", lessonKo: "변화와 깊이의 힘", lessonEn: "Power of change and depth", challengeKo: "위기와 상실", challengeEn: "Crisis and loss", rewardKo: "강력한 변환 능력", rewardEn: "Powerful transformation ability" },
  9: { emoji: "📖", lessonKo: "믿음과 지혜 찾기", lessonEn: "Finding faith and wisdom", challengeKo: "믿음의 시험", challengeEn: "Test of faith", rewardKo: "깊은 철학적 지혜", rewardEn: "Deep philosophical wisdom" },
  10: { emoji: "🏔️", lessonKo: "사회적 책임 다하기", lessonEn: "Fulfilling social responsibility", challengeKo: "성공의 압박", challengeEn: "Pressure to succeed", rewardKo: "존경받는 위치", rewardEn: "Respected position" },
  11: { emoji: "👥", lessonKo: "친구와 공동체 만들기", lessonEn: "Building friends and community", challengeKo: "소속감 부족", challengeEn: "Lack of belonging", rewardKo: "믿을 수 있는 네트워크", rewardEn: "Reliable network" },
  12: { emoji: "🌙", lessonKo: "내면과 영혼 돌보기", lessonEn: "Caring for inner self and soul", challengeKo: "고독과 두려움", challengeEn: "Loneliness and fear", rewardKo: "영적 평화", rewardEn: "Spiritual peace" }
};
