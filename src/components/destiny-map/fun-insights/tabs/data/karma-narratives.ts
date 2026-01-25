/**
 * @file Extended karma narrative generators
 * Creates personalized, rich narratives (~20+ lines) for karma analysis
 */

import type { DayMasterInfo, NorthNodeInfo, SaturnInfo, ShinsalInfo } from './karma-types';
import { dayMasterSimple, northNodeSimple, saturnSimple, shinsalSimple } from './karma-data';

// ============================================================
// Extended Day Master Narratives (일간 확장 서사)
// ============================================================

const dayMasterExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = {
  "갑": {
    ko: [
      "🌲 【갑목(甲木) - 큰 나무의 영혼】",
      "",
      "당신은 숲에서 하늘을 향해 곧게 뻗어가는 큰 나무와 같습니다.",
      "",
      "큰 나무는 어떤 상황에서도 위를 향합니다. 비가 오든, 바람이 불든 꿋꿋이 자신의 방향을 지키죠. 당신도 그렇습니다. 목표가 생기면 어떤 어려움이 있어도 포기하지 않는 끈기가 있어요.",
      "",
      "리더십이 타고났습니다. 사람들이 자연스럽게 당신을 따르고, 당신 곁에 모입니다. 마치 큰 나무 아래 그늘에 사람들이 모이듯이요. 새로운 것을 시작하는 힘이 강해서, 개척자나 창업가 기질이 있어요.",
      "",
      "하지만 나무가 너무 곧으면 부러지기 쉽듯이, 당신도 유연성이 필요합니다. 가끔은 바람에 몸을 맡기고 흔들리는 것도 괜찮아요. 고집을 조금 내려놓으면 더 멀리 갈 수 있습니다.",
      "",
      "💼 어울리는 직업: 경영자, 창업가, 정치인, 교육자, 건축가, 사회운동가",
      "💑 궁합: 정화(丁火)나 기토(己土)와 만나면 서로의 에너지를 보완해줍니다."
    ],
    en: [
      "🌲 【Gap-mok (甲木) - Soul of the Great Tree】",
      "",
      "You are like a great tree reaching straight toward the sky in a forest.",
      "",
      "A great tree always points upward, no matter the circumstances. Rain or wind, it steadfastly maintains its direction. So do you. Once you have a goal, you have the perseverance to never give up despite any difficulty.",
      "",
      "Leadership comes naturally. People naturally follow and gather around you. Like people gathering in the shade of a great tree. Your strong ability to start new things gives you pioneer or entrepreneur qualities.",
      "",
      "But just as a tree too rigid breaks easily, you need flexibility. Sometimes it's okay to sway with the wind. Letting go of stubbornness a little lets you go further.",
      "",
      "💼 Suitable careers: Executive, entrepreneur, politician, educator, architect, social activist",
      "💑 Compatibility: Meeting Jeong-hwa (丁火) or Gi-to (己土) complements each other's energy."
    ]
  },
  "을": {
    ko: [
      "🌿 【을목(乙木) - 덩굴의 영혼】",
      "",
      "당신은 담쟁이덩굴이나 넝쿨처럼 어디든 적응하고 뻗어가는 생명력을 가졌습니다.",
      "",
      "덩굴은 큰 나무처럼 곧게 서지 않아요. 대신 환경에 맞춰 유연하게 길을 찾아갑니다. 벽을 타고, 돌을 감고, 틈새를 비집고... 어디든 살아남습니다. 당신의 적응력이 바로 이것입니다.",
      "",
      "부드러워 보이지만 절대 약하지 않아요. 덩굴이 결국 집 전체를 덮듯이, 당신도 시간이 걸려도 결국 목표에 도달합니다. 끈질김이 당신의 무기예요.",
      "",
      "협력과 조화를 중시합니다. 혼자보다는 누군가와 함께할 때 더 빛나요. 다른 사람의 도움을 받아들이는 것을 부끄러워하지 마세요, 그게 당신의 방식이에요.",
      "",
      "💼 어울리는 직업: 외교관, 상담사, 디자이너, 협상가, 작가, 요가 강사",
      "💑 궁합: 경금(庚金)과 만나면 서로 강하게 끌리지만, 적절한 거리가 필요합니다."
    ],
    en: [
      "🌿 【Eul-mok (乙木) - Soul of the Vine】",
      "",
      "You have the vitality of ivy or vines that adapt and spread anywhere.",
      "",
      "Vines don't stand straight like great trees. Instead, they flexibly find their way according to the environment. Climbing walls, wrapping stones, squeezing through gaps... surviving anywhere. This is your adaptability.",
      "",
      "Soft-looking but never weak. Just as vines eventually cover an entire house, you too reach your goals even if it takes time. Persistence is your weapon.",
      "",
      "You value cooperation and harmony. You shine more with someone than alone. Don't be ashamed to accept others' help - that's your way.",
      "",
      "💼 Suitable careers: Diplomat, counselor, designer, negotiator, writer, yoga instructor",
      "💑 Compatibility: Meeting Gyeong-geum (庚金) creates strong attraction, but appropriate distance is needed."
    ]
  },
  "병": {
    ko: [
      "☀️ 【병화(丙火) - 태양의 영혼】",
      "",
      "당신은 세상을 비추는 태양과 같습니다. 어디를 가든 빛나고, 주변을 환하게 밝힙니다.",
      "",
      "태양은 모든 생명에게 빛과 따뜻함을 줍니다. 차별 없이, 조건 없이. 당신도 그런 에너지를 가졌어요. 사람들이 당신 곁에서 희망을 느끼고, 에너지를 얻습니다.",
      "",
      "존재감이 강해서 숨어있기 어렵습니다. 어딜 가든 주목받고, 자연스럽게 중심이 됩니다. 이것은 축복이지만, 때로는 부담이 될 수도 있어요.",
      "",
      "하지만 태양도 쉬어야 합니다. 24시간 빛나면 지치죠. 밤처럼 자신만의 시간, 조용히 재충전하는 시간이 필요합니다. 항상 빛나려고 하지 마세요.",
      "",
      "💼 어울리는 직업: 연예인, 정치인, 기업가, 강연자, 예술가, 인플루언서",
      "💑 궁합: 임수(壬水)와 만나면 서로 균형을 이루며 큰 시너지가 납니다."
    ],
    en: [
      "☀️ 【Byeong-hwa (丙火) - Soul of the Sun】",
      "",
      "You are like the sun that illuminates the world. Wherever you go, you shine and brighten your surroundings.",
      "",
      "The sun gives light and warmth to all life. Without discrimination, without conditions. You have that energy. People feel hope and gain energy near you.",
      "",
      "Strong presence makes hiding difficult. You get attention everywhere, naturally becoming the center. This is a blessing, but sometimes can be a burden.",
      "",
      "But even the sun must rest. Shining 24 hours is exhausting. Like night, you need your own time, quiet time to recharge. Don't try to always shine.",
      "",
      "💼 Suitable careers: Entertainer, politician, entrepreneur, speaker, artist, influencer",
      "💑 Compatibility: Meeting Im-su (壬水) creates balance and great synergy."
    ]
  },
  "정": {
    ko: [
      "🕯️ 【정화(丁火) - 촛불의 영혼】",
      "",
      "당신은 어둠 속에서 은은하게 빛나는 촛불과 같습니다.",
      "",
      "촛불은 태양처럼 세상 전체를 비추지는 않아요. 하지만 그 작은 빛이 누군가에게는 희망이 됩니다. 캄캄한 밤, 길을 잃었을 때 멀리서 보이는 불빛처럼요.",
      "",
      "깊이 생각하고, 섬세하게 느끼고, 조용히 빛납니다. 화려함보다는 진정성으로 사람을 끌어당겨요. 당신을 알아가면 알아갈수록 더 좋아지는 타입입니다.",
      "",
      "집중력이 뛰어나고, 한 가지에 몰입하는 힘이 강합니다. 연구자, 장인, 예술가... 깊이 파고드는 일에 적합합니다. 하지만 혼자 너무 오래 생각하면 지칩니다.",
      "",
      "💼 어울리는 직업: 연구원, 작가, 심리상담사, 셰프, 예술가, 종교인",
      "💑 궁합: 갑목(甲木)과 만나면 서로에게 따뜻한 에너지를 줍니다."
    ],
    en: [
      "🕯️ 【Jeong-hwa (丁火) - Soul of the Candle】",
      "",
      "You are like a candle glowing gently in the darkness.",
      "",
      "A candle doesn't illuminate the entire world like the sun. But that small light becomes hope for someone. Like a light seen from afar on a dark night when lost.",
      "",
      "Think deeply, feel delicately, shine quietly. You attract people with authenticity rather than glamour. The more people know you, the more they like you.",
      "",
      "Excellent focus and strong power to immerse in one thing. Researcher, craftsman, artist... suited for deep diving. But thinking alone too long is tiring.",
      "",
      "💼 Suitable careers: Researcher, writer, psychologist, chef, artist, clergy",
      "💑 Compatibility: Meeting Gap-mok (甲木) gives warm energy to each other."
    ]
  },
  "무": {
    ko: [
      "🏔️ 【무토(戊土) - 산의 영혼】",
      "",
      "당신은 우뚝 서서 모든 것을 품어주는 산과 같습니다.",
      "",
      "산은 흔들리지 않습니다. 비가 와도, 눈이 와도, 바람이 불어도 그 자리에 있습니다. 사람들은 산을 보며 안정감을 느끼고, 기대고 싶어합니다. 당신이 바로 그런 존재예요.",
      "",
      "신뢰감이 넘치고, 듬직합니다. 약속을 지키고, 책임감이 강해요. 주변 사람들이 힘들 때 당신에게 의지합니다. 그만큼 무거운 짐을 지는 경우도 많죠.",
      "",
      "하지만 산도 때로는 흔들립니다. 지진이 나면 땅이 갈라지듯, 당신도 한계에 다다르면 무너질 수 있어요. 혼자 다 짊어지려 하지 말고, 도움을 요청하세요.",
      "",
      "💼 어울리는 직업: CEO, 부동산, 은행가, 건설업, 정치인, 관리자",
      "💑 궁합: 계수(癸水)와 만나면 서로를 적시며 생명력을 키웁니다."
    ],
    en: [
      "🏔️ 【Mu-to (戊土) - Soul of the Mountain】",
      "",
      "You are like a mountain standing tall, embracing everything.",
      "",
      "Mountains don't shake. Rain, snow, wind - they stay in place. People feel stability looking at mountains and want to lean on them. That's what you are.",
      "",
      "Overflowing with trust, solid and dependable. Keep promises, strong responsibility. People around you rely on you when times are hard. That often means carrying heavy burdens.",
      "",
      "But mountains sometimes shake too. Like ground cracking in an earthquake, you can collapse when reaching your limit. Don't try to carry everything alone - ask for help.",
      "",
      "💼 Suitable careers: CEO, real estate, banker, construction, politician, manager",
      "💑 Compatibility: Meeting Gye-su (癸水) moistens each other and cultivates vitality."
    ]
  },
  "기": {
    ko: [
      "🌾 【기토(己土) - 논밭의 영혼】",
      "",
      "당신은 씨앗을 품고 열매를 맺게 하는 비옥한 논밭과 같습니다.",
      "",
      "논밭은 화려하지 않아요. 하지만 그 안에서 생명이 자랍니다. 씨앗을 주면 싹을 틔우고, 물을 주면 자라게 하고, 결국 풍성한 수확을 가져다줍니다. 당신의 보살피는 능력이 바로 이것이에요.",
      "",
      "사람을 키우고, 일을 키우고, 아이디어를 키웁니다. 당신 손을 거치면 뭐든 성장해요. 교육자, 양육자로서 타고난 재능이 있습니다.",
      "",
      "하지만 논밭이 계속 주기만 하면 척박해지듯, 당신도 자신을 돌봐야 합니다. 남 챙기다 자기를 잊으면 결국 지쳐요. 받는 것도 배우세요.",
      "",
      "💼 어울리는 직업: 교사, 간호사, 농업, 요리사, 보육사, 사회복지사",
      "💑 궁합: 갑목(甲木)과 만나면 서로 영양을 주고받으며 성장합니다."
    ],
    en: [
      "🌾 【Gi-to (己土) - Soul of the Field】",
      "",
      "You are like fertile fields that hold seeds and bear fruit.",
      "",
      "Fields aren't glamorous. But life grows within them. Given seeds, they sprout; given water, they grow; eventually bringing abundant harvest. This is your nurturing ability.",
      "",
      "You grow people, grow work, grow ideas. Everything that passes through your hands grows. Natural talent as educator and nurturer.",
      "",
      "But just as fields become barren if they only give, you must care for yourself. Forgetting yourself while caring for others eventually exhausts you. Learn to receive too.",
      "",
      "💼 Suitable careers: Teacher, nurse, agriculture, chef, childcare, social worker",
      "💑 Compatibility: Meeting Gap-mok (甲木) exchanges nourishment and grows together."
    ]
  },
  "경": {
    ko: [
      "⚔️ 【경금(庚金) - 검의 영혼】",
      "",
      "당신은 날카롭고 강한 검과 같습니다. 결단력이 있고, 정의로우며, 필요할 때 단호하게 행동합니다.",
      "",
      "검은 망설이지 않습니다. 베어야 할 때 벱니다. 당신도 그렇습니다. 결정을 내려야 할 때 명확하게 내리고, 옳고 그름을 분명히 합니다. 우유부단함과는 거리가 멀어요.",
      "",
      "정의감이 강합니다. 불의를 보면 참지 못하고, 약자를 보호하려 합니다. 싸워야 할 때 피하지 않습니다. 이런 성격 때문에 리더가 되거나, 갈등의 중심에 서기도 해요.",
      "",
      "하지만 검은 함부로 휘두르면 자신도 다칩니다. 말이 너무 날카로우면 상처를 줍니다. 때로는 검을 칼집에 넣어두는 것도 용기입니다.",
      "",
      "💼 어울리는 직업: 군인, 경찰, 검사, 외과의사, 기계공학자, 운동선수",
      "💑 궁합: 을목(乙木)과 만나면 강한 끌림이 있지만, 부드러움을 배워야 합니다."
    ],
    en: [
      "⚔️ 【Gyeong-geum (庚金) - Soul of the Sword】",
      "",
      "You are like a sharp, strong sword. Decisive, righteous, acting firmly when needed.",
      "",
      "A sword doesn't hesitate. It cuts when cutting is needed. So do you. Making decisions clearly when needed, distinguishing right from wrong clearly. Far from indecisive.",
      "",
      "Strong sense of justice. Can't stand injustice, tries to protect the weak. Doesn't avoid fights when fighting is needed. This personality makes you a leader or puts you at the center of conflict.",
      "",
      "But swinging a sword carelessly hurts yourself too. Words too sharp wound others. Sometimes keeping the sword sheathed is also courage.",
      "",
      "💼 Suitable careers: Military, police, prosecutor, surgeon, mechanical engineer, athlete",
      "💑 Compatibility: Strong attraction with Eul-mok (乙木), but must learn softness."
    ]
  },
  "신": {
    ko: [
      "💎 【신금(辛金) - 보석의 영혼】",
      "",
      "당신은 세공된 보석처럼 섬세하고 아름다운 빛을 냅니다.",
      "",
      "보석은 원석에서 시작해 깎이고 다듬어져 빛납니다. 당신도 삶의 경험을 통해 점점 더 빛나는 타입이에요. 고통과 압박이 오히려 당신을 더 아름답게 만듭니다.",
      "",
      "완벽주의 성향이 있고, 디테일에 강합니다. 예리한 눈으로 다른 사람이 못 보는 것을 봅니다. 예술, 패션, 디자인... 아름다움을 다루는 일에 재능이 있어요.",
      "",
      "하지만 완벽을 추구하다 자신을 너무 몰아붙이면 깨질 수 있습니다. 보석도 너무 세게 누르면 금이 가듯이요. 불완전함도 아름다움의 일부라는 것을 받아들이세요.",
      "",
      "💼 어울리는 직업: 보석상, 디자이너, 에디터, 품질관리자, 비평가, 큐레이터",
      "💑 궁합: 병화(丙火)의 따뜻함이 당신을 녹여주고 빛나게 합니다."
    ],
    en: [
      "💎 【Sin-geum (辛金) - Soul of the Gem】",
      "",
      "You shine with delicate, beautiful light like a polished gem.",
      "",
      "Gems start as rough stones, cut and refined to shine. You're the type that shines more through life experiences. Pain and pressure actually make you more beautiful.",
      "",
      "Perfectionist tendencies, strong with details. Sharp eyes see what others can't. Talent in art, fashion, design... work dealing with beauty.",
      "",
      "But pushing yourself too hard pursuing perfection can break you. Like gems cracking under too much pressure. Accept that imperfection is part of beauty.",
      "",
      "💼 Suitable careers: Jeweler, designer, editor, quality controller, critic, curator",
      "💑 Compatibility: Byeong-hwa's (丙火) warmth melts and makes you shine."
    ]
  },
  "임": {
    ko: [
      "🌊 【임수(壬水) - 바다의 영혼】",
      "",
      "당신은 모든 것을 품는 넓고 깊은 바다와 같습니다.",
      "",
      "바다는 강물도, 빗물도, 모든 물을 받아들입니다. 당신의 마음도 그렇게 넓어요. 다양한 사람, 다양한 생각, 다양한 경험... 다 받아들이고 품을 수 있습니다.",
      "",
      "지혜가 깊습니다. 표면에 보이는 것 너머를 봅니다. 상황의 흐름을 읽고, 큰 그림을 파악합니다. 전략가, 철학자 기질이 있어요.",
      "",
      "하지만 바다도 폭풍이 치면 거칠어지듯, 감정이 격해지면 통제가 어려울 수 있습니다. 너무 깊이 빠지면 헤어나오기 힘들어요. 균형이 필요합니다.",
      "",
      "💼 어울리는 직업: 철학자, 전략가, 무역업, 물류, 심리학자, 영적 지도자",
      "💑 궁합: 병화(丙火)와 만나면 서로 균형을 이루며 조화롭습니다."
    ],
    en: [
      "🌊 【Im-su (壬水) - Soul of the Ocean】",
      "",
      "You are like a wide, deep ocean that embraces everything.",
      "",
      "The ocean accepts river water, rain water, all water. Your heart is that wide. Various people, thoughts, experiences... you can accept and embrace them all.",
      "",
      "Deep wisdom. Seeing beyond the surface. Reading situational flow, grasping the big picture. Strategist, philosopher qualities.",
      "",
      "But just as oceans become rough in storms, emotions can be hard to control when intense. Going too deep makes it hard to come out. Balance is needed.",
      "",
      "💼 Suitable careers: Philosopher, strategist, trade, logistics, psychologist, spiritual leader",
      "💑 Compatibility: Meeting Byeong-hwa (丙火) creates balanced harmony."
    ]
  },
  "계": {
    ko: [
      "💧 【계수(癸水) - 샘물의 영혼】",
      "",
      "당신은 맑고 순수한 샘물처럼 깨끗한 영혼을 가졌습니다.",
      "",
      "샘물은 땅 깊은 곳에서 솟아납니다. 보이지 않는 곳에서 조용히 흐르다가, 필요한 곳에 생명을 줍니다. 당신의 직감과 영적 감수성이 바로 이런 에너지예요.",
      "",
      "예민하고, 감성이 풍부하고, 눈에 보이지 않는 것을 느낍니다. 다른 사람의 감정, 장소의 분위기, 말하지 않은 것... 당신은 그것들을 읽을 수 있어요.",
      "",
      "하지만 스펀지처럼 주변 에너지를 다 흡수하면 힘들어집니다. 남의 감정까지 다 느끼면 지쳐요. 자신을 보호하고, 정화하는 시간이 꼭 필요합니다.",
      "",
      "💼 어울리는 직업: 영적 상담사, 예술가, 치료사, 시인, 점술가, 명상 지도자",
      "💑 궁합: 무토(戊土)와 만나면 안정감을 얻고 뿌리를 내릴 수 있습니다."
    ],
    en: [
      "💧 【Gye-su (癸水) - Soul of the Spring】",
      "",
      "You have a pure soul like clear, clean spring water.",
      "",
      "Spring water emerges from deep in the earth. Flowing quietly from unseen places, giving life where needed. Your intuition and spiritual sensitivity are this energy.",
      "",
      "Sensitive, emotionally rich, feeling the invisible. Others' emotions, place atmospheres, unspoken things... you can read them.",
      "",
      "But absorbing all surrounding energy like a sponge is hard. Feeling everyone's emotions is exhausting. Time to protect and purify yourself is essential.",
      "",
      "💼 Suitable careers: Spiritual counselor, artist, healer, poet, fortune teller, meditation guide",
      "💑 Compatibility: Meeting Mu-to (戊土) provides stability and lets you put down roots."
    ]
  }
};

// ============================================================
// Extended North Node House Narratives (노스노드 하우스 확장 서사)
// ============================================================

const northNodeExtendedNarratives: Record<number, { ko: string[]; en: string[] }> = {
  1: {
    ko: [
      "🦸 【노스노드 1하우스 - 나 자신을 찾는 여정】",
      "",
      "이번 생에서 당신의 가장 큰 과제는 '나'를 발견하는 것입니다.",
      "",
      "전생에서 당신은 아마 관계에 많은 에너지를 쏟았을 거예요. 파트너, 협력자, 타인을 위해 살았습니다. 그래서 '나'보다 '우리'가 익숙하고, 혼자 결정하는 것이 불편해요.",
      "",
      "하지만 이번 생에서는 반대로 가야 합니다. 다른 사람의 의견을 구하기 전에 '나는 뭘 원하지?'를 먼저 물어보세요. 누군가에게 기대지 말고 스스로 일어서는 연습을 하세요.",
      "",
      "처음에는 이기적으로 느껴질 수 있어요. 하지만 그렇지 않습니다. 자기 자신을 먼저 채워야 다른 사람에게도 진정으로 줄 수 있습니다.",
      "",
      "💡 실천 방법: 혼자 여행하기, 혼자 결정 내리기, 자기 의견 먼저 말하기. '나를 먼저 생각해도 괜찮아'라고 스스로에게 허락하세요."
    ],
    en: [
      "🦸 【North Node 1st House - Journey to Find Yourself】",
      "",
      "Your biggest task this lifetime is discovering 'yourself.'",
      "",
      "In past lives, you probably poured much energy into relationships. Living for partners, collaborators, others. So 'we' feels more natural than 'me,' and deciding alone feels uncomfortable.",
      "",
      "But this life requires the opposite. Before seeking others' opinions, first ask 'What do I want?' Practice standing on your own instead of leaning on someone.",
      "",
      "It may feel selfish at first. But it's not. You must fill yourself first to truly give to others.",
      "",
      "💡 How to practice: Travel alone, make decisions alone, speak your opinion first. Give yourself permission that 'it's okay to think of myself first.'"
    ]
  },
  2: {
    ko: [
      "💎 【노스노드 2하우스 - 나만의 가치를 세우는 여정】",
      "",
      "이번 생에서 당신의 과제는 '나의 것'을 만드는 것입니다.",
      "",
      "전생에서 당신은 다른 사람의 자원, 에너지, 돈에 의존했을 수 있어요. 상속, 후원, 파트너의 재정... 그래서 '내 것'이라는 개념이 약합니다.",
      "",
      "이번 생에서는 스스로 벌고, 스스로 모으고, 스스로 가치를 증명해야 합니다. 누군가에게 의지하는 것이 편하겠지만, 그것은 성장의 방향이 아니에요.",
      "",
      "자존감과도 연결됩니다. '나는 가치 있는 사람이야'라는 믿음을 스스로 세워야 해요. 외부의 인정이 아니라 내면의 확신으로요.",
      "",
      "💡 실천 방법: 자기 돈으로 원하는 것 사기, 재테크 공부하기, 자신의 재능으로 수입 창출하기. 물질적 독립이 정서적 독립으로 이어집니다."
    ],
    en: [
      "💎 【North Node 2nd House - Journey to Build Your Own Value】",
      "",
      "Your task this lifetime is creating 'your own.'",
      "",
      "In past lives, you may have depended on others' resources, energy, money. Inheritance, sponsorship, partner's finances... so the concept of 'mine' is weak.",
      "",
      "This life, you must earn, save, and prove value yourself. Depending on someone feels comfortable, but that's not the growth direction.",
      "",
      "It connects to self-esteem. You must build the belief 'I am a worthy person' yourself. Through inner conviction, not external validation.",
      "",
      "💡 How to practice: Buy what you want with your own money, study finance, generate income from your talents. Financial independence leads to emotional independence."
    ]
  },
  3: {
    ko: [
      "💬 【노스노드 3하우스 - 소통하고 연결하는 여정】",
      "",
      "이번 생에서 당신의 과제는 '말하고 듣는 것'입니다.",
      "",
      "전생에서 당신은 아마 높은 이상, 철학, 먼 곳의 진리를 추구했을 거예요. 그래서 일상적인 대화나 작은 소통이 시시하게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 '가까운 곳'에 답이 있습니다. 형제자매, 이웃, 동료... 가까운 관계에서 배우세요. 거창한 진리보다 일상의 지혜가 중요합니다.",
      "",
      "글쓰기, 말하기, 가르치기... 당신의 생각을 표현하는 것이 성장의 열쇠예요. 머릿속에만 두지 말고 밖으로 꺼내세요.",
      "",
      "💡 실천 방법: 블로그 쓰기, 팟캐스트 하기, 동네 모임 참여하기, 짧은 글 자주 쓰기. 작은 소통이 쌓이면 큰 연결이 됩니다."
    ],
    en: [
      "💬 【North Node 3rd House - Journey of Communication and Connection】",
      "",
      "Your task this lifetime is 'speaking and listening.'",
      "",
      "In past lives, you probably pursued high ideals, philosophy, distant truths. So everyday conversation or small talk may feel trivial.",
      "",
      "But this life, answers are 'nearby.' Siblings, neighbors, colleagues... learn from close relationships. Daily wisdom matters more than grand truths.",
      "",
      "Writing, speaking, teaching... expressing your thoughts is the key to growth. Don't keep it in your head, bring it out.",
      "",
      "💡 How to practice: Blog writing, podcasting, joining local groups, writing short pieces often. Small communications build into big connections."
    ]
  },
  4: {
    ko: [
      "🏠 【노스노드 4하우스 - 마음의 집을 짓는 여정】",
      "",
      "이번 생에서 당신의 과제는 '뿌리를 내리는 것'입니다.",
      "",
      "전생에서 당신은 사회적 성공, 커리어, 외부 세계에서의 인정에 집중했을 거예요. 그래서 '집'보다 '회사'가 익숙하고, 감정보다 성취가 중요하게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 내면으로 들어가야 합니다. 가족, 고향, 정서적 안정... 이런 것들이 당신의 진짜 기반입니다. 아무리 사회적으로 성공해도 마음의 집이 없으면 공허해요.",
      "",
      "어린 시절의 상처를 치유하고, 가족과의 관계를 회복하고, 안전한 내면의 공간을 만드세요.",
      "",
      "💡 실천 방법: 가족과 시간 보내기, 집 꾸미기, 요리하기, 어린 시절 사진 보며 내면 아이 돌보기. 외부의 성공보다 내면의 평화가 먼저입니다."
    ],
    en: [
      "🏠 【North Node 4th House - Journey to Build a Home for the Heart】",
      "",
      "Your task this lifetime is 'putting down roots.'",
      "",
      "In past lives, you focused on social success, career, recognition in the outer world. So 'company' feels more natural than 'home,' achievement more important than emotions.",
      "",
      "But this life requires going inward. Family, hometown, emotional stability... these are your true foundation. No matter how socially successful, without a home for the heart, there's emptiness.",
      "",
      "Heal childhood wounds, restore family relationships, create safe inner space.",
      "",
      "💡 How to practice: Spend time with family, decorate home, cook, care for your inner child looking at childhood photos. Inner peace before outer success."
    ]
  },
  5: {
    ko: [
      "🎭 【노스노드 5하우스 - 빛나는 별이 되는 여정】",
      "",
      "이번 생에서 당신의 과제는 '창조하고 즐기는 것'입니다.",
      "",
      "전생에서 당신은 집단을 위해 살았을 거예요. 팀, 커뮤니티, 사회를 위해 개인을 희생했습니다. 그래서 '나 혼자 빛나는 것'이 불편하고 죄책감이 들 수 있어요.",
      "",
      "하지만 이번 생에서는 무대 위로 올라가야 합니다. 당신만의 창의성을 표현하고, 주목받고, 즐기세요. 숨어있으면 안 돼요.",
      "",
      "연애, 취미, 예술, 자녀... 기쁨을 주는 것들에 시간을 투자하세요. '일만 하는 인생'은 당신의 길이 아닙니다.",
      "",
      "💡 실천 방법: 예술 활동하기, 무대에 서기, 연애하기, 아이와 놀기, 게임하기. 진지함만큼 유희도 중요합니다."
    ],
    en: [
      "🎭 【North Node 5th House - Journey to Become a Shining Star】",
      "",
      "Your task this lifetime is 'creating and enjoying.'",
      "",
      "In past lives, you lived for the group. Sacrificed individuality for team, community, society. So 'shining alone' feels uncomfortable and may bring guilt.",
      "",
      "But this life requires stepping onto the stage. Express your unique creativity, get attention, enjoy. Don't hide.",
      "",
      "Romance, hobbies, art, children... invest time in joy-giving things. 'A life of only work' is not your path.",
      "",
      "💡 How to practice: Do art activities, perform on stage, date, play with children, play games. Play matters as much as seriousness."
    ]
  },
  6: {
    ko: [
      "⚙️ 【노스노드 6하우스 - 장인이 되는 여정】",
      "",
      "이번 생에서 당신의 과제는 '실용적으로 살고 봉사하는 것'입니다.",
      "",
      "전생에서 당신은 꿈과 영적인 세계에 빠져 살았을 수 있어요. 현실보다 이상, 일보다 명상... 그래서 일상의 디테일이 귀찮고 지루하게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 '현실'에 발을 딛어야 합니다. 매일의 루틴, 건강 관리, 세부적인 일... 이런 것들이 당신을 성장시킵니다.",
      "",
      "봉사도 중요합니다. 다른 사람에게 실질적인 도움을 주세요. 거창한 구원이 아니라 작은 도움이요.",
      "",
      "💡 실천 방법: 운동 루틴 만들기, 식단 관리하기, 정리정돈하기, 자원봉사하기. 꿈꾸는 것만큼 행동하는 것이 중요합니다."
    ],
    en: [
      "⚙️ 【North Node 6th House - Journey to Become a Craftsman】",
      "",
      "Your task this lifetime is 'living practically and serving.'",
      "",
      "In past lives, you may have been lost in dreams and spiritual worlds. Ideals over reality, meditation over work... so daily details may feel bothersome and boring.",
      "",
      "But this life requires grounding in 'reality.' Daily routines, health care, detailed work... these grow you.",
      "",
      "Service matters too. Give practical help to others. Small help, not grand salvation.",
      "",
      "💡 How to practice: Create exercise routines, manage diet, organize, volunteer. Acting matters as much as dreaming."
    ]
  },
  7: {
    ko: [
      "🤝 【노스노드 7하우스 - 함께하는 법을 배우는 여정】",
      "",
      "이번 생에서 당신의 과제는 '협력하고 나누는 것'입니다.",
      "",
      "전생에서 당신은 독립적이고 자기 중심적으로 살았을 거예요. 혼자 결정하고, 혼자 행동하고, 혼자 책임졌습니다. 그래서 '파트너십'이 불편하고 통제력을 잃는 것 같은 느낌이 들 수 있어요.",
      "",
      "하지만 이번 생에서는 '함께'가 성장의 열쇠입니다. 배우자, 사업 파트너, 협력자... 누군가와 깊이 연결되는 경험이 필요해요.",
      "",
      "타협하는 법, 듣는 법, 양보하는 법을 배우세요. '내 방식'만 고집하면 성장이 멈춥니다.",
      "",
      "💡 실천 방법: 파트너십 경험하기, 상대 입장에서 생각하기, '우리'라는 단어 쓰기. 혼자 하면 빠르지만 함께 하면 멀리 갑니다."
    ],
    en: [
      "🤝 【North Node 7th House - Journey to Learn Togetherness】",
      "",
      "Your task this lifetime is 'cooperating and sharing.'",
      "",
      "In past lives, you lived independently and self-centeredly. Decided alone, acted alone, took responsibility alone. So 'partnership' feels uncomfortable and like losing control.",
      "",
      "But this life, 'together' is the key to growth. Spouse, business partner, collaborator... you need deep connection experiences.",
      "",
      "Learn to compromise, listen, yield. Insisting on 'my way' stops growth.",
      "",
      "💡 How to practice: Experience partnership, think from others' perspective, use the word 'we.' Alone is faster, but together goes further."
    ]
  },
  8: {
    ko: [
      "🦋 【노스노드 8하우스 - 깊이 변화하는 여정】",
      "",
      "이번 생에서 당신의 과제는 '깊이 들어가고 변화하는 것'입니다.",
      "",
      "전생에서 당신은 안정과 안전을 추구했을 거예요. 내 것을 지키고, 예측 가능한 삶을 살았습니다. 그래서 '변화'와 '상실'이 두렵게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 변화를 받아들여야 합니다. 죽고 다시 태어나듯, 완전한 변신이 필요합니다. 표면이 아닌 깊은 곳으로 들어가세요.",
      "",
      "다른 사람과 자원을 공유하고, 친밀함을 경험하고, 삶의 깊은 진실을 마주하세요.",
      "",
      "💡 실천 방법: 심리 치료받기, 깊은 대화하기, 투자/공동 자산 경험하기, 위기를 성장 기회로 바꾸기. 안전지대를 벗어나야 성장합니다."
    ],
    en: [
      "🦋 【North Node 8th House - Journey of Deep Transformation】",
      "",
      "Your task this lifetime is 'going deep and transforming.'",
      "",
      "In past lives, you pursued stability and safety. Protected what's yours, lived predictably. So 'change' and 'loss' may feel scary.",
      "",
      "But this life requires embracing change. Like dying and being reborn, complete transformation is needed. Go deep, not surface.",
      "",
      "Share resources with others, experience intimacy, face life's deep truths.",
      "",
      "💡 How to practice: Get therapy, have deep conversations, experience investment/shared assets, turn crisis into growth opportunity. Growth requires leaving comfort zones."
    ]
  },
  9: {
    ko: [
      "🌍 【노스노드 9하우스 - 넓은 세계로 나가는 여정】",
      "",
      "이번 생에서 당신의 과제는 '확장하고 의미를 찾는 것'입니다.",
      "",
      "전생에서 당신은 작은 세계에 머물렀을 거예요. 일상의 디테일, 정보 수집, 가까운 환경... 그래서 '큰 그림'을 보거나 '왜?'라는 질문이 어색할 수 있어요.",
      "",
      "하지만 이번 생에서는 넓게 봐야 합니다. 여행, 철학, 종교, 고등 교육... 삶의 의미를 탐구하세요. 사실(fact)만 모으지 말고 지혜(wisdom)를 추구하세요.",
      "",
      "다른 문화, 다른 생각, 다른 세계관을 경험하세요. 그것이 당신을 확장시킵니다.",
      "",
      "💡 실천 방법: 해외여행하기, 철학책 읽기, 종교/영성 탐구하기, 대학원 진학하기, 멘토 찾기. 작은 것에 갇히지 말고 높이 날아오르세요."
    ],
    en: [
      "🌍 【North Node 9th House - Journey to the Wider World】",
      "",
      "Your task this lifetime is 'expanding and finding meaning.'",
      "",
      "In past lives, you stayed in a small world. Daily details, information gathering, close environment... so seeing 'the big picture' or asking 'why?' may feel awkward.",
      "",
      "But this life requires seeing widely. Travel, philosophy, religion, higher education... explore life's meaning. Don't just collect facts, pursue wisdom.",
      "",
      "Experience different cultures, different thoughts, different worldviews. That expands you.",
      "",
      "💡 How to practice: Travel abroad, read philosophy, explore religion/spirituality, go to graduate school, find mentors. Don't be trapped in small things, fly high."
    ]
  },
  10: {
    ko: [
      "🏆 【노스노드 10하우스 - 세상에서 역할을 찾는 여정】",
      "",
      "이번 생에서 당신의 과제는 '사회적 역할을 다하는 것'입니다.",
      "",
      "전생에서 당신은 가정과 내면에 집중했을 거예요. 가족을 돌보고, 안전한 공간에 머물렀습니다. 그래서 '세상에 나가는 것'이 두렵거나 불편할 수 있어요.",
      "",
      "하지만 이번 생에서는 밖으로 나가야 합니다. 커리어를 쌓고, 사회에서 인정받고, 책임 있는 자리에 서세요. 집에만 있으면 성장이 멈춥니다.",
      "",
      "당신만의 '소명'을 찾으세요. 세상에 어떤 기여를 할 수 있는지, 어떤 유산을 남길 수 있는지 생각하세요.",
      "",
      "💡 실천 방법: 커리어 목표 세우기, 리더십 경험하기, 전문성 키우기, 사회적 책임 다하기. 편안함보다 성취를 선택하세요."
    ],
    en: [
      "🏆 【North Node 10th House - Journey to Find Your Role in the World】",
      "",
      "Your task this lifetime is 'fulfilling your social role.'",
      "",
      "In past lives, you focused on home and inner world. Caring for family, staying in safe spaces. So 'going out into the world' may feel scary or uncomfortable.",
      "",
      "But this life requires going out. Build career, gain social recognition, take responsible positions. Staying home stops growth.",
      "",
      "Find your 'calling.' Think about what contribution you can make to the world, what legacy you can leave.",
      "",
      "💡 How to practice: Set career goals, experience leadership, build expertise, fulfill social responsibility. Choose achievement over comfort."
    ]
  },
  11: {
    ko: [
      "🌐 【노스노드 11하우스 - 더 큰 공동체를 위한 여정】",
      "",
      "이번 생에서 당신의 과제는 '나보다 우리를 생각하는 것'입니다.",
      "",
      "전생에서 당신은 개인적 창조와 자기 표현에 집중했을 거예요. '나'의 영광, '나'의 작품, '나'의 사랑... 그래서 집단이나 공동체가 불편하게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 더 큰 그림을 봐야 합니다. 개인적 영광보다 집단의 발전, 단기적 성과보다 미래 세대를 위한 일... 이런 것들이 당신의 성장 방향입니다.",
      "",
      "친구, 네트워크, 공동체... 같은 뜻을 가진 사람들과 연결되세요.",
      "",
      "💡 실천 방법: 동호회 가입하기, 사회 운동 참여하기, 네트워킹하기, 미래를 위한 프로젝트 하기. 혼자 빛나기보다 함께 빛나세요."
    ],
    en: [
      "🌐 【North Node 11th House - Journey for the Greater Community】",
      "",
      "Your task this lifetime is 'thinking of us rather than me.'",
      "",
      "In past lives, you focused on personal creation and self-expression. 'My' glory, 'my' work, 'my' love... so groups or communities may feel uncomfortable.",
      "",
      "But this life requires seeing the bigger picture. Collective progress over personal glory, work for future generations over short-term results... these are your growth directions.",
      "",
      "Friends, networks, communities... connect with like-minded people.",
      "",
      "💡 How to practice: Join clubs, participate in social movements, network, do projects for the future. Shine together rather than alone."
    ]
  },
  12: {
    ko: [
      "🧘 【노스노드 12하우스 - 영혼과 만나는 여정】",
      "",
      "이번 생에서 당신의 과제는 '내려놓고 연결되는 것'입니다.",
      "",
      "전생에서 당신은 분석하고, 정리하고, 완벽하게 통제하려 했을 거예요. 모든 것을 체크하고, 모든 것을 관리했습니다. 그래서 '통제를 놓는 것'이 무섭게 느껴질 수 있어요.",
      "",
      "하지만 이번 생에서는 신비로움을 받아들여야 합니다. 모든 것을 이해하려 하지 말고, 흐름에 맡기세요. 명상, 영성, 예술... 논리를 초월한 영역에서 성장합니다.",
      "",
      "혼자만의 시간, 내면과의 대화, 우주와의 연결... 이런 것들이 당신을 채웁니다.",
      "",
      "💡 실천 방법: 명상하기, 요가하기, 봉사하기, 예술 감상하기, 자연 속에서 시간 보내기. 통제를 내려놓으면 더 큰 평화가 옵니다."
    ],
    en: [
      "🧘 【North Node 12th House - Journey to Meet the Soul】",
      "",
      "Your task this lifetime is 'letting go and connecting.'",
      "",
      "In past lives, you analyzed, organized, tried to perfectly control. Checked everything, managed everything. So 'releasing control' may feel scary.",
      "",
      "But this life requires embracing mystery. Don't try to understand everything, surrender to flow. Meditation, spirituality, art... growth in realms beyond logic.",
      "",
      "Alone time, inner dialogue, connection with the universe... these fill you.",
      "",
      "💡 How to practice: Meditate, do yoga, volunteer, appreciate art, spend time in nature. Releasing control brings greater peace."
    ]
  }
};

// ============================================================
// Section 1: Soul Identity Narrative (영혼의 정체성)
// Combines Day Master + Soul Type for rich description
// ============================================================

export function getSoulIdentityNarrative(
  dayMaster: string | undefined,
  soulType: { title: string; description: string; traits?: string[] } | undefined,
  isKo: boolean
): string[] {
  const paragraphs: string[] = [];
  const dayMasterInfo = dayMaster ? dayMasterSimple[dayMaster] : null;

  if (dayMasterInfo && dayMaster) {
    // Check if we have extended narrative for this day master
    const extendedNarrative = dayMasterExtendedNarratives[dayMaster];
    if (extendedNarrative) {
      const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
      narrativeLines.forEach(line => paragraphs.push(line));
      paragraphs.push('');
      // Add color recommendation
      if (isKo) {
        paragraphs.push(`🎨 【어울리는 색상】`);
        paragraphs.push(`당신에게 어울리는 색상은 ${dayMasterInfo.luckyColorKo}입니다.`);
        paragraphs.push(`이 색을 옷, 소품, 인테리어에 활용하면 당신의 에너지가 더 안정되고 조화롭게 흐릅니다.`);
      } else {
        paragraphs.push(`🎨 【Your Harmonious Colors】`);
        paragraphs.push(`Your harmonious colors are ${dayMasterInfo.luckyColorEn}.`);
        paragraphs.push(`Using these colors in clothing, accessories, and interior design helps your energy flow more balanced and steady.`);
      }
    } else {
      // Fallback to original simple version
      if (isKo) {
        paragraphs.push(`🌟 【일간(日干) 분석 - 당신 영혼의 본질】`);
        paragraphs.push('');
        paragraphs.push(
          `사주(四柱)에서 '일간'은 당신 자체를 나타냅니다. 태어난 날의 천간(天干)이 바로 당신의 영혼이 어떤 에너지로 이 세상에 왔는지를 보여줍니다.`
        );
        paragraphs.push('');
        paragraphs.push(
          `당신의 일간은 ${dayMasterInfo.emoji} "${dayMasterInfo.simpleKo}"입니다.`
        );
        paragraphs.push('');
        paragraphs.push(dayMasterInfo.metaphorKo);
        paragraphs.push('');
        paragraphs.push(
          `이 에너지는 당신이 세상을 바라보는 방식, 결정을 내리는 방식, 그리고 사람들과 관계 맺는 방식 모두에 깊이 스며들어 있습니다.`
        );
        paragraphs.push('');
        paragraphs.push(`어린 시절부터 이런 성향이 자연스럽게 나타났을 것입니다. 부모님이나 주변 사람들도 아마 이 특성을 알아챘을 거예요.`);
        paragraphs.push('');
        paragraphs.push(`💪 【당신의 타고난 강점】`);
        paragraphs.push(dayMasterInfo.strengthKo);
        paragraphs.push('');
        paragraphs.push(`⚠️ 【조심할 부분】`);
        paragraphs.push(`모든 강점에는 그림자도 있습니다. ${dayMasterInfo.watchOutKo}`);
        paragraphs.push('');
        paragraphs.push(`🎨 【어울리는 색상】`);
        paragraphs.push(
          `당신에게 어울리는 색상은 ${dayMasterInfo.luckyColorKo}입니다.`
        );
        paragraphs.push(`이 색을 옷, 소품, 인테리어에 활용하면 당신의 에너지가 더 안정되고 조화롭게 흐릅니다.`);
      } else {
        paragraphs.push(`🌟 【Day Master Analysis - The Essence of Your Soul】`);
        paragraphs.push('');
        paragraphs.push(
          `In Four Pillars (Saju), the 'Day Master' represents you yourself. The Heavenly Stem of your birth day shows what energy your soul brought into this world.`
        );
        paragraphs.push('');
        paragraphs.push(
          `Your Day Master is ${dayMasterInfo.emoji} "${dayMasterInfo.simpleEn}".`
        );
        paragraphs.push('');
        paragraphs.push(dayMasterInfo.metaphorEn);
        paragraphs.push('');
        paragraphs.push(
          `This energy permeates how you see the world, make decisions, and form relationships.`
        );
        paragraphs.push('');
        paragraphs.push(`These tendencies have naturally appeared since childhood. Your parents and those around you probably noticed these traits too.`);
        paragraphs.push('');
        paragraphs.push(`💪 【Your Innate Strength】`);
        paragraphs.push(dayMasterInfo.strengthEn);
        paragraphs.push('');
        paragraphs.push(`⚠️ 【Watch Out For】`);
        paragraphs.push(`Every strength has its shadow. ${dayMasterInfo.watchOutEn}`);
        paragraphs.push('');
        paragraphs.push(`🎨 【Your Harmonious Colors】`);
        paragraphs.push(
          `Your harmonious colors are ${dayMasterInfo.luckyColorEn}.`
        );
        paragraphs.push(`Using these colors in clothing, accessories, and interior design helps your energy flow more balanced and steady.`);
      }
    }
  }

  if (soulType) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🔮 【영혼 유형 분석】`);
      paragraphs.push('');
      paragraphs.push(`동서양 분석을 종합한 결과, 당신은 "${soulType.title}" 유형으로 나타납니다.`);
      paragraphs.push('');
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push('');
        paragraphs.push(`✨ 당신을 대표하는 키워드: ${soulType.traits.join(' • ')}`);
        paragraphs.push('');
        paragraphs.push(
          `이 특성들은 당신의 영혼이 이번 생에서 표현하고자 하는 본질적인 에너지입니다. 이 키워드들과 공명하는 활동이나 환경을 찾으면, 자연스럽게 에너지가 흐르고 성취감을 느낄 수 있습니다.`
        );
      }
    } else {
      paragraphs.push(`🔮 【Soul Type Analysis】`);
      paragraphs.push('');
      paragraphs.push(`Combining Eastern and Western analysis, you emerge as the "${soulType.title}" type.`);
      paragraphs.push('');
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push('');
        paragraphs.push(`✨ Keywords representing you: ${soulType.traits.join(' • ')}`);
        paragraphs.push('');
        paragraphs.push(
          `These traits are the essential energies your soul seeks to express this lifetime. Finding activities and environments that resonate with these keywords allows energy to flow naturally and brings fulfillment.`
        );
      }
    }
  }

  if (paragraphs.length === 0) {
    if (isKo) {
      paragraphs.push(`🌟 【영혼의 정체성에 대하여】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석을 위한 데이터가 부족하지만, 모든 사람은 고유한 영혼의 에너지를 가지고 태어납니다.`);
      paragraphs.push('');
      paragraphs.push(`당신이 자연스럽게 끌리는 것, 어릴 때부터 좋아했던 것, 노력하지 않아도 잘하는 것... 이런 것들이 당신 영혼의 본질을 보여주는 단서입니다.`);
      paragraphs.push('');
      paragraphs.push(`어떤 상황에서 가장 '나답다'고 느끼나요? 어떤 활동을 할 때 시간 가는 줄 모르나요? 그 순간들이 바로 당신의 영혼이 빛나는 순간입니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 생년월일시 정보가 있으면 더 정확한 일간 분석이 가능합니다.`);
    } else {
      paragraphs.push(`🌟 【About Soul Identity】`);
      paragraphs.push('');
      paragraphs.push(`While detailed analysis data isn't available, everyone is born with unique soul energy.`);
      paragraphs.push('');
      paragraphs.push(`What you're naturally drawn to, what you've loved since childhood, what you do well without trying... these are clues revealing your soul's essence.`);
      paragraphs.push('');
      paragraphs.push(`In what situations do you feel most 'yourself'? During what activities does time fly? Those moments are when your soul shines.`);
      paragraphs.push('');
      paragraphs.push(`💡 More accurate Day Master analysis is possible with birth date and time information.`);
    }
  }

  return paragraphs;
}

// ============================================================
// Section 2: Life Direction Narrative (이번 생의 방향)
// Combines North Node + Saturn for comprehensive guidance
// ============================================================

export function getLifeDirectionNarrative(
  northNodeHouse: number | null,
  saturnHouse: number | null,
  nodeAxisData: {
    northNode: { direction: { ko: string; en: string }; lesson: { ko: string; en: string }; fusion: { icon: string } };
    southNode: { pastPattern: { ko: string; en: string }; release: { ko: string; en: string }; fusion: { icon: string } };
  } | undefined,
  isKo: boolean
): string[] {
  const paragraphs: string[] = [];
  const northNodeInfo = northNodeHouse ? northNodeSimple[northNodeHouse] : null;
  const saturnInfo = saturnHouse ? saturnSimple[saturnHouse] : null;
  const southNodeHouse = northNodeHouse ? (northNodeHouse > 6 ? northNodeHouse - 6 : northNodeHouse + 6) : null;

  if (nodeAxisData) {
    if (isKo) {
      paragraphs.push(
        `☊ 노스노드와 ☋ 사우스노드는 당신의 영혼이 어디서 왔고 어디로 가야 하는지를 보여주는 나침반입니다.`
      );
      paragraphs.push('');
      paragraphs.push(
        `${nodeAxisData.southNode.fusion.icon} 【전생의 패턴】 ${nodeAxisData.southNode.pastPattern.ko}`
      );
      paragraphs.push(
        `이것은 당신이 익숙하고 편안하게 느끼는 영역입니다. 하지만 여기에만 머물면 성장할 수 없습니다.`
      );
      paragraphs.push(`내려놓아야 할 것: ${nodeAxisData.southNode.release.ko}`);
      paragraphs.push('');
      paragraphs.push(
        `${nodeAxisData.northNode.fusion.icon} 【이번 생의 방향】 ${nodeAxisData.northNode.direction.ko}`
      );
      paragraphs.push(
        `처음에는 어색하고 두려울 수 있지만, 이 방향으로 나아갈 때 진정한 성장과 만족을 경험하게 됩니다.`
      );
      paragraphs.push(`배워야 할 것: ${nodeAxisData.northNode.lesson.ko}`);
    } else {
      paragraphs.push(
        `☊ North Node and ☋ South Node serve as a compass showing where your soul came from and where it needs to go.`
      );
      paragraphs.push('');
      paragraphs.push(
        `${nodeAxisData.southNode.fusion.icon} 【Past Life Pattern】 ${nodeAxisData.southNode.pastPattern.en}`
      );
      paragraphs.push(
        `This is the area that feels familiar and comfortable to you. But staying here won't bring growth.`
      );
      paragraphs.push(`To release: ${nodeAxisData.southNode.release.en}`);
      paragraphs.push('');
      paragraphs.push(
        `${nodeAxisData.northNode.fusion.icon} 【This Life's Direction】 ${nodeAxisData.northNode.direction.en}`
      );
      paragraphs.push(
        `It may feel awkward and scary at first, but moving in this direction brings true growth and fulfillment.`
      );
      paragraphs.push(`To learn: ${nodeAxisData.northNode.lesson.en}`);
    }
  } else if (northNodeInfo && northNodeHouse) {
    // Check if we have extended narrative for this north node house
    const extendedNarrative = northNodeExtendedNarratives[northNodeHouse];
    if (extendedNarrative) {
      const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
      narrativeLines.forEach(line => paragraphs.push(line));
      paragraphs.push('');
      // Add south node info
      if (southNodeHouse) {
        if (isKo) {
          paragraphs.push(`☋ 【사우스노드 ${southNodeHouse}하우스 - 전생의 패턴】`);
          paragraphs.push(`당신의 사우스노드는 ${southNodeHouse}하우스에 있습니다. 이 영역에서는 이미 충분한 경험을 쌓았습니다.`);
          paragraphs.push(`여기에 머무는 것은 편안하지만, 성장을 위해서는 반대 방향(노스노드)으로 나아가야 합니다.`);
        } else {
          paragraphs.push(`☋ 【South Node ${southNodeHouse}th House - Past Life Pattern】`);
          paragraphs.push(`Your South Node is in the ${southNodeHouse}th house. You've already gained sufficient experience in this area.`);
          paragraphs.push(`Staying here is comfortable, but growth requires moving toward the opposite direction (North Node).`);
        }
      }
    } else {
      // Fallback to original simple version
      if (isKo) {
        paragraphs.push(`${northNodeInfo.emoji} 당신의 노스노드는 ${northNodeHouse}하우스에 있습니다.`);
        paragraphs.push(`이것은 "${northNodeInfo.titleKo}"의 여정입니다.`);
        paragraphs.push('');
        paragraphs.push(northNodeInfo.simpleKo);
        paragraphs.push('');
        if (southNodeHouse) {
          paragraphs.push(
            `당신의 사우스노드(전생의 패턴)는 ${southNodeHouse}하우스에 있습니다. 이 영역에서는 이미 충분한 경험을 쌓았으므로, 이제는 반대 방향으로 성장해야 할 때입니다.`
          );
        }
        paragraphs.push(`📚 배워야 할 것: ${northNodeInfo.lessonKo}`);
        paragraphs.push(`💡 실천 팁: ${northNodeInfo.tipKo}`);
      } else {
        paragraphs.push(`${northNodeInfo.emoji} Your North Node is in the ${northNodeHouse}th house.`);
        paragraphs.push(`This is the journey of "${northNodeInfo.titleEn}".`);
        paragraphs.push('');
        paragraphs.push(northNodeInfo.simpleEn);
        paragraphs.push('');
        if (southNodeHouse) {
          paragraphs.push(
            `Your South Node (past life pattern) is in the ${southNodeHouse}th house. You've already gained enough experience there, so now it's time to grow in the opposite direction.`
          );
        }
        paragraphs.push(`📚 To learn: ${northNodeInfo.lessonEn}`);
        paragraphs.push(`💡 Action tip: ${northNodeInfo.tipEn}`);
      }
    }
  }

  if (saturnInfo) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🪐 【토성 선생님의 수업】`);
      paragraphs.push(
        `토성은 당신의 ${saturnHouse}하우스에서 엄격한 선생님으로 작용합니다. 이 영역에서 당신은 특별한 시험을 치르게 됩니다.`
      );
      paragraphs.push(`📖 배울 것: ${saturnInfo.lessonKo}`);
      paragraphs.push(`😓 힘든 점: ${saturnInfo.challengeKo} - 이것이 처음에는 고통스럽게 느껴질 수 있습니다.`);
      paragraphs.push(
        `🏆 졸업 보상: ${saturnInfo.rewardKo} - 하지만 이 과제를 마스터하면, 다른 사람들이 부러워할 만큼 단단한 기반을 갖게 됩니다.`
      );
      paragraphs.push(
        `토성의 수업은 보통 29세(새턴 리턴)와 58세 즈음에 가장 강렬하게 나타납니다. 이 시기를 잘 통과하면 인생의 새로운 장이 열립니다.`
      );
    } else {
      paragraphs.push(`🪐 【Saturn Teacher's Lesson】`);
      paragraphs.push(
        `Saturn acts as a strict teacher in your ${saturnHouse}th house. You face special tests in this area.`
      );
      paragraphs.push(`📖 To learn: ${saturnInfo.lessonEn}`);
      paragraphs.push(`😓 Challenge: ${saturnInfo.challengeEn} - This may feel painful at first.`);
      paragraphs.push(
        `🏆 Graduation reward: ${saturnInfo.rewardEn} - But mastering this task gives you a foundation others will envy.`
      );
      paragraphs.push(
        `Saturn's lessons are most intense around ages 29 (Saturn Return) and 58. Navigating these periods well opens new chapters in life.`
      );
    }
  }

  if (paragraphs.length === 0) {
    if (isKo) {
      paragraphs.push(`🧭 【이번 생의 방향에 대하여】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석을 위한 출생시간 데이터가 부족하지만, 이번 생의 방향에 대한 보편적인 지혜를 나눌 수 있습니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 【편안함 vs 성장】`);
      paragraphs.push(`우리는 모두 '익숙한 것'과 '성장해야 할 것' 사이에서 선택해야 합니다. 쉬운 길을 계속 가면 편하지만 성장이 없고, 어려운 길을 가면 힘들지만 성장합니다.`);
      paragraphs.push('');
      paragraphs.push(`🔄 【반복되는 패턴】`);
      paragraphs.push(`인생에서 비슷한 상황이 계속 반복된다면, 그것은 아직 배우지 못한 레슨이 있다는 신호입니다. 같은 유형의 사람을 만나거나, 같은 문제가 생기거나, 같은 실수를 한다면 그 패턴을 인식하세요.`);
      paragraphs.push('');
      paragraphs.push(`🌱 【작은 불편함이 성장의 시작】`);
      paragraphs.push(`뭔가가 조금 불편하고, 조금 두렵고, 조금 어색하다면... 그것이 바로 성장의 방향일 수 있습니다. 영혼은 쉬운 것을 배우러 오지 않았어요.`);
      paragraphs.push('');
      paragraphs.push(`출생 시간 정보가 있으면 노스노드와 토성 분석으로 더 구체적인 방향을 알 수 있습니다.`);
    } else {
      paragraphs.push(`🧭 【About This Life's Direction】`);
      paragraphs.push('');
      paragraphs.push(`While detailed analysis needs birth time data, here's some universal wisdom about life direction.`);
      paragraphs.push('');
      paragraphs.push(`💡 【Comfort vs Growth】`);
      paragraphs.push(`We all must choose between 'the familiar' and 'what we need to grow into.' Easy paths are comfortable but bring no growth; difficult paths are hard but bring development.`);
      paragraphs.push('');
      paragraphs.push(`🔄 【Repeating Patterns】`);
      paragraphs.push(`If similar situations keep repeating in life, it signals lessons not yet learned. If you meet the same types of people, face the same problems, or make the same mistakes, recognize that pattern.`);
      paragraphs.push('');
      paragraphs.push(`🌱 【Small Discomfort Starts Growth】`);
      paragraphs.push(`If something feels slightly uncomfortable, slightly scary, slightly awkward... that might be the direction of growth. Your soul didn't come here to learn easy things.`);
      paragraphs.push('');
      paragraphs.push(`With birth time information, North Node and Saturn analysis can reveal more specific direction.`);
    }
  }

  return paragraphs;
}

// ============================================================
// Section 3: Past Life Energy Narrative (전생의 에너지)
// Combines Past Life Hints + Shinsal stars
// ============================================================

// Extended shinsal narratives for deeper storytelling
const shinsalExtendedNarratives: Record<string, { ko: string[]; en: string[] }> = {
  "천을귀인": {
    ko: [
      "당신에게는 '천을귀인'이라는 특별한 별이 함께합니다.",
      "이 별은 하늘에서 내려온 수호천사와 같은 존재예요. 삶에서 정말 어려운 순간이 올 때마다, 마치 기적처럼 도움의 손길이 나타났던 경험이 있지 않나요?",
      "갑자기 연락이 온 오래된 친구, 우연히 만난 낯선 사람의 조언, 예상치 못한 곳에서 온 기회... 이 모든 것이 천을귀인의 작용입니다.",
      "당신 주변에는 자연스럽게 좋은 사람들이 모입니다. 사람들이 당신을 돕고 싶어하는 에너지가 있어요.",
      "💡 이 복을 더 강하게 하려면: 어려울 때 혼자 끙끙대지 마세요. 도움을 요청하면 반드시 귀인이 나타납니다. 그리고 당신도 누군가의 귀인이 되어주세요."
    ],
    en: [
      "You carry a special star called 'Cheon-eul Guin' (Heavenly Noble Helper).",
      "This star acts like a guardian angel sent from heaven. Haven't you noticed that in your most difficult moments, help mysteriously appears?",
      "An old friend suddenly reaching out, advice from a stranger you happened to meet, unexpected opportunities from unlikely places... All these are the workings of your noble helper star.",
      "Good people naturally gather around you. There's an energy that makes others want to help you.",
      "💡 To strengthen this blessing: Don't struggle alone when times are hard. Ask for help and a helper will surely appear. And become someone's noble helper yourself."
    ]
  },
  "역마살": {
    ko: [
      "당신에게는 '역마살'이라는 여행자의 별이 있습니다.",
      "가만히 한 곳에 있으면 뭔가 답답하고 근질근질하지 않나요? 새로운 장소, 새로운 사람, 새로운 경험에 대한 갈망이 당신 안에 늘 있습니다.",
      "이것은 단점이 아니라 강력한 장점입니다. 이 별을 가진 사람들은 해외에서 성공하거나, 이동이 많은 직업에서 크게 빛납니다.",
      "여행 작가, 무역업, 항공 관련 직종, 영업직, 외교관... 움직임이 곧 행운을 불러오는 운명이에요.",
      "💡 실천 팁: 일년에 최소 한 번은 새로운 곳으로 여행하세요. 낯선 곳에서 당신의 행운이 기다리고 있습니다. 가만히 있으면 오히려 운이 막힙니다."
    ],
    en: [
      "You carry the 'Yeokma-sal' - the Traveler's Star.",
      "Don't you feel restless and confined staying in one place? There's always a yearning within you for new places, new people, new experiences.",
      "This isn't a weakness but a powerful strength. People with this star often succeed abroad or shine in careers involving travel.",
      "Travel writer, trade business, aviation, sales, diplomat... Movement itself brings you luck.",
      "💡 Action tip: Travel to at least one new place each year. Your fortune waits in unfamiliar territories. Staying put actually blocks your luck."
    ]
  },
  "화개살": {
    ko: [
      "당신에게는 '화개살'이라는 예술가의 별이 있습니다.",
      "다른 사람들이 보지 못하는 것이 보이고, 느끼지 못하는 것이 느껴지지 않나요? 어릴 때부터 뭔가 '다르다'는 느낌을 받았을 수도 있어요.",
      "음악, 미술, 글쓰기, 영적인 것, 종교... 눈에 보이지 않는 세계에 자연스럽게 끌립니다. 이것은 당신이 특별한 감수성을 타고났다는 의미입니다.",
      "때로는 이 예민함이 고통이 될 수도 있어요. 너무 많은 것을 느끼니까요. 하지만 이 감수성이 바로 당신만의 예술적 재능입니다.",
      "💡 실천 팁: 창작 활동이나 명상을 꼭 해보세요. 그림을 그리거나, 글을 쓰거나, 악기를 연주하거나... 무엇이든 좋아요. 거기에 당신의 진짜 재능이 숨어있습니다."
    ],
    en: [
      "You carry the 'Hwagae-sal' - the Artist's Star.",
      "Don't you see things others don't see, feel things others don't feel? You may have felt 'different' since childhood.",
      "Music, art, writing, spirituality, religion... You're naturally drawn to invisible realms. This means you were born with special sensitivity.",
      "Sometimes this sensitivity can be painful. You feel too much. But this very sensitivity is your unique artistic gift.",
      "💡 Action tip: Make sure to engage in creative activities or meditation. Draw, write, play music... anything works. Your true talent hides there."
    ]
  },
  "도화살": {
    ko: [
      "당신에게는 '도화살'이라는 매력의 별이 있습니다.",
      "사람들이 당신에게 이끌립니다. 특별히 노력하지 않아도 인기가 있고, 이성에게도 매력적으로 보여요. 이것은 타고난 카리스마입니다.",
      "하지만 이 별에는 양면이 있어요. 매력이 너무 강해서 복잡한 이성 관계로 이어질 수 있습니다. 원치 않는 관심을 받거나, 오해를 살 수도 있죠.",
      "중요한 것은 이 매력을 '어디에' 쓰느냐입니다. 연애에만 쓰면 복잡해지지만, 일이나 예술에 쓰면 대성공할 수 있어요.",
      "💡 실천 팁: 당신의 매력을 의식적으로 활용하세요. 프레젠테이션, 영업, 예술 활동, 리더십... 사람을 끄는 힘이 필요한 곳에 이 재능을 쓰면 빛납니다. 사랑에서는 조금 신중하게!"
    ],
    en: [
      "You carry the 'Dohwa-sal' - the Charm Star.",
      "People are drawn to you. You're popular without trying, and attractive to others. This is innate charisma.",
      "But this star has two sides. Such strong charm can lead to complicated romantic relationships. You might receive unwanted attention or be misunderstood.",
      "What matters is 'where' you use this charm. Using it only for romance creates complications, but using it for work or art can bring great success.",
      "💡 Action tip: Consciously utilize your charm. Presentations, sales, art, leadership... Your talent shines where attracting people matters. Just be more careful in love!"
    ]
  },
  "백호살": {
    ko: [
      "당신에게는 '백호살'이라는 호랑이의 별이 있습니다.",
      "백호처럼 용감하고, 빠르고, 강합니다. 결단력이 있고, 밀어붙이는 힘이 있어요. 위험 앞에서도 물러서지 않죠.",
      "하지만 호랑이가 너무 급하게 달리면 낭떠러지로 떨어질 수 있듯이, 당신도 너무 급하면 다칠 수 있어요. 특히 급한 결정은 피해야 합니다.",
      "교통사고, 다툼, 갑작스러운 사건... 이런 것들에 조금 더 조심할 필요가 있어요. 느긋하게 한 박자 쉬어가는 연습이 필요합니다.",
      "💡 실천 팁: 중요한 결정 전에는 꼭 하루 정도 시간을 두세요. '지금 당장'이라는 생각이 들 때가 가장 위험해요. 그리고 운전할 때, 과격한 운동을 할 때 특히 조심하세요."
    ],
    en: [
      "You carry the 'Baekho-sal' - the White Tiger Star.",
      "Like a white tiger, you're brave, fast, and strong. You have decisiveness and pushing power. You don't back down from danger.",
      "But just as a tiger running too fast might fall off a cliff, you can get hurt by being too hasty. Especially avoid rushed decisions.",
      "Car accidents, conflicts, sudden events... You need to be more careful about these. Practice slowing down and taking a beat.",
      "💡 Action tip: Before important decisions, take at least a day to think. The thought 'right now!' is most dangerous. Be especially careful when driving or doing extreme sports."
    ]
  },
  "천덕귀인": {
    ko: [
      "당신에게는 '천덕귀인'이라는 하늘의 방패가 함께합니다.",
      "이 별은 마치 투명한 보호막처럼 당신을 감싸고 있어요. 위험한 상황이 다가와도 신기하게 비껴가거나, 큰 피해 없이 넘어가는 경험을 해본 적 있지 않나요?",
      "교통사고가 날 뻔했는데 아슬아슬하게 피했다거나, 큰 손해를 볼 뻔했는데 마지막 순간에 막혔다거나... 이런 일들이 당신에게 유독 자주 일어난다면, 천덕귀인의 작용입니다.",
      "하지만 이 보호막은 당신이 선한 마음으로 살 때 더 강해집니다. 나쁜 마음을 품으면 방패가 약해질 수 있어요.",
      "💡 실천 팁: 선행을 베풀고, 다른 사람을 돕고, 정직하게 사세요. 그럴수록 하늘의 보호가 더 두터워집니다. 당신은 보호받고 있어요."
    ],
    en: [
      "You carry 'Cheondeok Guin' - Heaven's Shield.",
      "This star wraps around you like an invisible shield. Haven't you experienced dangerous situations mysteriously passing by, or escaping major harm at the last moment?",
      "Narrowly avoiding a car accident, or a big loss getting blocked at the final second... If these things happen to you often, it's the work of your heavenly protection star.",
      "However, this shield grows stronger when you live with a good heart. Harboring ill intentions can weaken it.",
      "💡 Action tip: Do good deeds, help others, live honestly. The more you do, the thicker heaven's protection becomes. You are being protected."
    ]
  },
  "문창귀인": {
    ko: [
      "당신에게는 '문창귀인'이라는 학문의 별이 빛나고 있습니다.",
      "공부, 글쓰기, 말하기... 지적인 활동에 타고난 재능이 있어요. 어릴 때부터 책을 좋아했거나, 글을 잘 쓴다는 말을 들었거나, 새로운 것을 빨리 이해했을 거예요.",
      "이 별이 있으면 시험운이 좋아요. 자격증, 입학시험, 승진시험... 무언가를 배우고 시험 보는 일에서 좋은 결과를 얻기 쉽습니다.",
      "또한 언어 능력이 뛰어나서 외국어 학습, 글쓰기, 프레젠테이션 등에서 빛납니다. 이 재능을 충분히 활용하고 있나요?",
      "💡 실천 팁: 평생 학습자가 되세요. 공부를 멈추지 마세요. 블로그 글쓰기, 강의, 책 쓰기... 당신의 지적 재능을 세상과 나누면 더 큰 복이 옵니다."
    ],
    en: [
      "You carry 'Munchang Guin' - the Scholar's Star shining within you.",
      "Studying, writing, speaking... you have innate talent for intellectual activities. You probably loved books since childhood, were told you write well, or understood new things quickly.",
      "With this star, you have good exam luck. Certifications, entrance exams, promotion tests... you easily achieve good results in learning and testing.",
      "You also have excellent language abilities, shining in foreign language learning, writing, and presentations. Are you fully utilizing this talent?",
      "💡 Action tip: Be a lifelong learner. Never stop studying. Blogging, lecturing, writing books... sharing your intellectual gifts with the world brings greater blessings."
    ]
  },
  "장성살": {
    ko: [
      "당신에게는 '장성살'이라는 장군의 별이 있습니다.",
      "태어날 때부터 리더의 기운을 타고났어요. 어릴 때도 친구들 사이에서 자연스럽게 대장 역할을 했을 거예요. 사람들이 본능적으로 당신을 따릅니다.",
      "카리스마가 있고, 결정을 내리는 힘이 강하며, 책임감이 있어요. 위기 상황에서 더 빛나는 타입이에요. 다른 사람들이 우왕좌왕할 때 당신은 침착하게 방향을 제시할 수 있죠.",
      "하지만 장군의 기운이 너무 강하면 독단적이 될 수 있어요. 혼자 결정하기보다 팀의 의견을 들으세요. 진정한 리더는 경청하는 리더입니다.",
      "💡 실천 팁: 리더십이 필요한 자리를 피하지 마세요. 그게 당신의 역할이에요. 하지만 '내가 제일 잘 안다'는 생각은 버리세요. 겸손한 장군이 되세요."
    ],
    en: [
      "You carry 'Jangseong-sal' - the General's Star.",
      "You were born with leader energy. Even as a child, you naturally took the leader role among friends. People instinctively follow you.",
      "You have charisma, strong decision-making power, and responsibility. You shine more in crisis situations. When others panic, you calmly show the way.",
      "However, if general energy is too strong, you can become authoritarian. Listen to team opinions rather than deciding alone. True leaders are listening leaders.",
      "💡 Action tip: Don't avoid positions requiring leadership. That's your role. But abandon the thought 'I know best.' Be a humble general."
    ]
  },
  "홍염살": {
    ko: [
      "당신에게는 '홍염살'이라는 정열의 불꽃이 타오르고 있습니다.",
      "마치 타오르는 불꽃처럼 강렬한 매력이 있어요. 이성에게 강한 인상을 남기고, 열정적인 사랑을 하는 타입이에요. 사랑에 빠지면 불타오르죠.",
      "이 별이 있으면 연애 경험이 많거나, 강렬한 연애를 하는 경향이 있어요. '밋밋한 사랑'은 당신에게 맞지 않습니다. 모 아니면 도, 전부 아니면 전무인 타입이에요.",
      "하지만 불꽃은 아름다운 만큼 위험하기도 해요. 감정이 너무 뜨거우면 자신도 상대도 태워버릴 수 있습니다. 열정을 조절하는 법을 배워야 해요.",
      "💡 실천 팁: 그 열정을 사랑에만 쏟지 마세요. 일, 예술, 운동에 분산하세요. 연애는 조금 '덜 뜨겁게' 하는 것이 오래갑니다. 천천히, 깊게 사랑하세요."
    ],
    en: [
      "You carry 'Hongyeom-sal' - the Flame of Passion burning within you.",
      "Like a blazing flame, you have intense charm. You leave strong impressions on romantic interests and love passionately. When you fall in love, you burn bright.",
      "With this star, you tend to have many romantic experiences or intense relationships. 'Mild love' doesn't suit you. You're all-or-nothing, everything or nothing.",
      "But flames are as dangerous as they are beautiful. Emotions too hot can burn both yourself and your partner. You must learn to regulate passion.",
      "💡 Action tip: Don't pour all passion into love alone. Distribute it to work, art, exercise. Love 'less hot' actually lasts longer. Love slowly, deeply."
    ]
  },
  "공망": {
    ko: [
      "당신의 사주에는 '공망'이라는 특별한 에너지가 있습니다.",
      "공망은 '빈 공간'이라는 뜻이에요. 특정 영역에서 아무리 노력해도 빈 껍데기처럼 결과가 안 나올 수 있어요. 마치 구멍 뚫린 양동이에 물을 붓는 것처럼요.",
      "하지만 이것을 '나쁜 운'으로 보면 안 돼요. 오히려 '비어있기 때문에 자유로운' 에너지예요. 집착하면 안 되는 영역을 알려주는 나침반 같은 존재입니다.",
      "공망이 걸린 영역에서는 '결과'보다 '과정'에 집중하세요. 놓아버리면 오히려 채워지는 신기한 현상이 일어납니다.",
      "💡 실천 팁: 공망 영역에서 집착을 버리세요. '안 돼도 괜찮아'라는 마음으로 임하면 역설적으로 잘 됩니다. 공망은 내려놓음을 가르치는 선생님이에요."
    ],
    en: [
      "Your chart has a special energy called 'Gongmang' (Void).",
      "Gongmang means 'empty space.' In certain areas, no matter how hard you try, results may be hollow. Like pouring water into a bucket with holes.",
      "But don't see this as 'bad luck.' Rather, it's energy that's 'free because it's empty.' It's like a compass showing areas you shouldn't cling to.",
      "In void areas, focus on 'process' rather than 'results.' Letting go mysteriously allows things to fill in.",
      "💡 Action tip: Release attachment in void areas. Approaching with 'it's okay if it doesn't work' paradoxically makes it work. Void teaches the art of letting go."
    ]
  },
  "겁살": {
    ko: [
      "당신에게는 '겁살'이라는 급변의 에너지가 있습니다.",
      "인생에서 예상치 못한 급작스러운 변화를 경험하기 쉬워요. 갑자기 일이 터지거나, 상황이 급변하거나, 예측 불가능한 일이 생깁니다.",
      "이것은 무서운 일이 아니에요. 오히려 이런 급변 속에서 당신은 강해집니다. 위기 대처 능력이 발달하고, 변화에 빨리 적응하는 힘이 생겨요.",
      "겁살이 있는 사람은 평범하고 안정적인 삶보다 역동적인 삶이 맞아요. 스타트업, 프리랜서, 위기관리 분야에서 빛날 수 있습니다.",
      "💡 실천 팁: 급한 변화가 와도 당황하지 마세요. 그게 당신의 성장 기회예요. 항상 플랜 B를 준비해두고, 비상금을 모아두세요. 위기를 기회로 바꾸는 연습을 하세요."
    ],
    en: [
      "You carry 'Geop-sal' - the energy of sudden change.",
      "You easily experience unexpected, sudden changes in life. Things suddenly happen, situations shift dramatically, unpredictable events occur.",
      "This isn't scary. Rather, you become stronger through these sudden changes. Crisis management skills develop, and you gain the power to quickly adapt.",
      "People with this star fit dynamic lives better than ordinary, stable ones. You can shine in startups, freelancing, or crisis management fields.",
      "💡 Action tip: Don't panic when sudden changes come. They're your growth opportunities. Always have Plan B ready, keep emergency funds. Practice turning crisis into opportunity."
    ]
  },
  "양인살": {
    ko: [
      "당신에게는 '양인살'이라는 칼날의 에너지가 있습니다.",
      "밀어붙이는 힘이 남다르게 강해요. 결단력, 추진력, 실행력이 뛰어나서 목표를 정하면 어떻게든 이뤄냅니다. 포기란 없죠.",
      "하지만 칼날은 양날의 검이에요. 너무 날카롭게 밀어붙이면 자기도 다치고 주변도 다칩니다. 관계에서 상처를 주거나, 건강을 해치거나, 무리한 결정을 할 수 있어요.",
      "이 에너지는 잘 쓰면 대단한 성취를 가져다주지만, 잘못 쓰면 파괴적이 됩니다. 칼의 주인이 되세요, 칼에 휘둘리지 말고.",
      "💡 실천 팁: 그 추진력을 건설적인 곳에 쓰세요. 운동, 사업, 도전적인 목표... 에너지를 쏟을 곳을 정하세요. 그리고 주변 사람들에게는 부드럽게 대하세요. 말 한마디가 칼이 될 수 있어요."
    ],
    en: [
      "You carry 'Yangin-sal' - the Blade energy.",
      "Your pushing power is exceptionally strong. With excellent decisiveness, drive, and execution, once you set a goal you achieve it somehow. No giving up.",
      "But a blade is double-edged. Pushing too sharply hurts both yourself and surroundings. You might wound relationships, damage health, or make reckless decisions.",
      "This energy brings great achievements when used well, but becomes destructive when misused. Be the master of the sword, don't be swung by it.",
      "💡 Action tip: Use that drive constructively. Exercise, business, challenging goals... choose where to channel energy. And be gentle with people around you. One word can cut like a knife."
    ]
  },
  "고신살": {
    ko: [
      "당신에게는 '고신살'이라는 고독의 에너지가 있습니다.",
      "혼자 있는 시간이 필요한 사람이에요. 다른 사람들과 있어도 어딘가 외로움을 느끼거나, 깊이 연결되지 못한다는 느낌을 받을 수 있어요.",
      "하지만 이 고독은 저주가 아니라 선물이에요. 혼자 있을 때 더 깊이 생각하고, 창의적이 되고, 내면과 연결됩니다. 위대한 예술가, 철학자, 명상가들이 이 별을 가진 경우가 많아요.",
      "문제는 외로움에 빠져 우울해지는 것이에요. 고독을 즐기되, 고립되지는 마세요. 적당한 사회적 연결은 유지하세요.",
      "💡 실천 팁: 혼자만의 시간을 창조적으로 활용하세요. 글쓰기, 예술, 명상, 연구... 혼자 있을 때 당신의 진정한 힘이 나옵니다. 하지만 완전히 고립되지는 마세요."
    ],
    en: [
      "You carry 'Gosin-sal' - the energy of solitude.",
      "You need time alone. Even around others, you might feel lonely somewhere or sense you're not deeply connected.",
      "But this solitude is a gift, not a curse. When alone, you think deeper, become more creative, connect with your inner self. Many great artists, philosophers, and meditators have this star.",
      "The problem is falling into loneliness and becoming depressed. Enjoy solitude, but don't become isolated. Maintain appropriate social connections.",
      "💡 Action tip: Use alone time creatively. Writing, art, meditation, research... your true power emerges when alone. But don't become completely isolated."
    ]
  },
  "월덕귀인": {
    ko: [
      "당신에게는 '월덕귀인'이라는 달의 축복이 함께합니다.",
      "달은 어머니의 에너지를 상징해요. 이 별이 있으면 여성 어른, 특히 어머니 같은 분들에게서 도움을 많이 받습니다. 여성 멘토나 선배가 당신을 이끌어주는 경우가 많아요.",
      "따뜻하게 보살펴주는 에너지가 주변에 있어요. 어렸을 때 어머니나 할머니, 여성 친척들의 사랑을 많이 받았을 수 있어요. 그 에너지가 평생 당신을 보호합니다.",
      "이 별이 있으면 직감이 발달하고, 감정을 잘 읽으며, 보살피는 능력이 뛰어납니다. 간호, 교육, 상담 분야에 재능이 있을 수 있어요.",
      "💡 실천 팁: 여성 어른들을 소중히 하세요. 그분들이 당신의 복이에요. 그리고 당신도 누군가에게 달처럼 따뜻한 존재가 되어주세요."
    ],
    en: [
      "You carry 'Woldeok Guin' - the Moon's Blessing.",
      "The moon symbolizes mother energy. With this star, you receive much help from female elders, especially mother-like figures. Female mentors or seniors often guide you.",
      "Warm, nurturing energy surrounds you. You may have received much love from mother, grandmother, or female relatives in childhood. That energy protects you for life.",
      "With this star, intuition develops, you read emotions well, and you excel at nurturing. You may have talent in nursing, education, or counseling.",
      "💡 Action tip: Cherish female elders. They are your blessing. And become a warm, moon-like presence for someone else."
    ]
  },
  "학당귀인": {
    ko: [
      "당신에게는 '학당귀인'이라는 학교의 축복이 함께합니다.",
      "배움에 복이 있어요! 학교, 학원, 자격증, 온라인 강의... 무엇이든 배우는 것에서 행운이 따릅니다. 배움의 기회가 많이 찾아오고, 그것을 잡으면 성공으로 이어져요.",
      "평생 학습자의 운명을 타고났어요. 나이가 들어도 새로운 것을 배우는 것이 중요합니다. 배움을 멈추면 운도 멈춰요.",
      "특히 정규 교육에서 좋은 결과를 얻기 쉽습니다. 좋은 학교에 가거나, 원하는 자격증을 따거나, 학업 성취로 인정받는 일이 많을 거예요.",
      "💡 실천 팁: 항상 뭔가를 배우세요. 새로운 기술, 언어, 취미... 배움을 멈추지 마세요. 그리고 배운 것을 다른 사람에게 가르쳐주면 복이 배가 됩니다."
    ],
    en: [
      "You carry 'Hakdang Guin' - the School's Blessing.",
      "You're blessed in learning! School, academy, certifications, online courses... luck follows whatever you learn. Many learning opportunities come, and seizing them leads to success.",
      "You're destined to be a lifelong learner. Learning new things matters even as you age. When learning stops, luck stops.",
      "You especially easily achieve good results in formal education. Going to good schools, getting desired certifications, being recognized for academic achievement - these happen often.",
      "💡 Action tip: Always learn something. New skills, languages, hobbies... never stop learning. And teaching others what you learned doubles the blessing."
    ]
  },
  "금여록": {
    ko: [
      "당신에게는 '금여록'이라는 재물의 별이 빛나고 있습니다.",
      "물질적인 복이 있어요! 돈이 들어오는 통로가 열려 있고, 풍요로운 삶을 살 가능성이 높습니다. 아무것도 없이 시작해도 언젠가는 풍족해지는 운명이에요.",
      "하지만 이 별은 '돈만 쫓으면' 오히려 작용이 약해져요. 가치를 쫓고, 사람들에게 도움이 되는 일을 하면 돈이 따라옵니다. 돈을 목적으로 하지 말고 결과로 받으세요.",
      "이 별이 있으면 투자 감각이 있을 수 있어요. 부동산, 주식, 사업... 재물을 불리는 눈이 있습니다. 다만 도박성 투자는 피하세요.",
      "💡 실천 팁: 돈보다 가치를 쫓으세요. 사람들에게 진정한 도움이 되는 일을 하면 돈은 따라옵니다. 그리고 번 돈의 일부는 나누세요. 나눌수록 더 들어와요."
    ],
    en: [
      "You carry 'Geumyeorok' - the Wealth Star shining for you.",
      "You have material blessings! Channels for money are open, and you're likely to live an abundant life. Even starting with nothing, you're destined to eventually prosper.",
      "But this star weakens if you 'only chase money.' Chase value, do work that helps people, and money follows. Don't make money the goal, receive it as a result.",
      "With this star, you may have investment sense. Real estate, stocks, business... you have eyes for growing wealth. But avoid gambling-type investments.",
      "💡 Action tip: Chase value over money. Do work that truly helps people and money follows. And share some of what you earn. The more you share, the more comes in."
    ]
  },
  "천주귀인": {
    ko: [
      "당신에게는 '천주귀인'이라는 사교의 별이 함께합니다.",
      "사람들과 어울리는 것에 천부적인 재능이 있어요! 파티, 모임, 네트워킹... 사교의 장에서 빛납니다. 자연스럽게 인맥이 넓어지고, 그 인맥이 기회가 됩니다.",
      "음식과 술에도 복이 있어서, 회식 자리나 식사 모임에서 좋은 일이 생기기 쉬워요. 비즈니스 식사에서 계약이 성사되거나, 모임에서 중요한 인연을 만나는 식이죠.",
      "하지만 너무 흥청망청하면 건강을 해칠 수 있어요. 먹고 마시는 것을 즐기되 절제는 필요합니다.",
      "💡 실천 팁: 사람을 만나세요! 집에만 있지 말고 모임에 나가세요. 당신의 기회는 사람에게서 옵니다. 네트워킹을 두려워하지 마세요, 그게 당신의 무기예요."
    ],
    en: [
      "You carry 'Cheonju Guin' - the Social Star.",
      "You have natural talent for socializing! Parties, gatherings, networking... you shine in social settings. Your network naturally expands, and connections become opportunities.",
      "You're also blessed with food and drink - good things easily happen at dinners and gatherings. Contracts close at business meals, important connections form at events.",
      "But excessive indulgence can harm health. Enjoy food and drink, but moderation is needed.",
      "💡 Action tip: Meet people! Don't just stay home, go to gatherings. Your opportunities come from people. Don't fear networking, it's your weapon."
    ]
  },
  "원진살": {
    ko: [
      "당신의 사주에는 '원진살'이라는 오해의 에너지가 있습니다.",
      "같은 말을 해도 다른 사람보다 오해를 더 쉽게 받는 경향이 있어요. 선의로 한 말이 악의로 전달되거나, 의도와 다르게 해석되는 일이 종종 있죠.",
      "이것은 당신의 잘못이 아니에요. 에너지적으로 그런 패턴이 있는 것뿐이에요. 하지만 인식하면 예방할 수 있습니다.",
      "특히 중요한 대화에서는 '내 말이 제대로 전달됐나?' 확인하는 습관이 필요해요. 문자보다는 직접 대화가 좋고, 모호한 표현은 피하세요.",
      "💡 실천 팁: 오해가 생기면 회피하지 말고 적극적으로 해명하세요. 숨기면 더 커져요. 그리고 평소에 진심을 자주 표현하세요. 당신의 진심을 아는 사람이 많을수록 오해가 줄어들어요."
    ],
    en: [
      "Your chart has 'Wonjin-sal' - the energy of misunderstanding.",
      "You tend to be more easily misunderstood than others even saying the same thing. Words meant well get received as ill-intended, or interpreted differently than you meant.",
      "This isn't your fault. It's just an energetic pattern. But awareness allows prevention.",
      "Especially in important conversations, you need the habit of checking 'Did my message come across right?' Direct conversation beats texting, avoid vague expressions.",
      "💡 Action tip: When misunderstandings arise, don't avoid - actively clarify. Hiding makes it bigger. And regularly express your sincere feelings. The more people know your true heart, the fewer misunderstandings."
    ]
  },
  "괴강살": {
    ko: [
      "당신에게는 '괴강살'이라는 극강의 에너지가 있습니다.",
      "성격이 강렬해요. 호불호가 확실하고, 중간이 없어요. 좋으면 정말 좋고, 싫으면 정말 싫어요. 이런 확실한 성격 때문에 호불호가 갈리는 타입이에요.",
      "하지만 이 강렬함이 바로 당신의 힘이에요! 보통 사람이 못 하는 큰 일을 해낼 수 있습니다. 극단적인 상황에서 더 강해지고, 불가능을 가능으로 만드는 힘이 있어요.",
      "문제는 그 강함이 관계를 힘들게 할 수 있다는 거예요. 특히 가까운 사람들이 부담을 느낄 수 있어요. 조금만 부드러워지면 됩니다.",
      "💡 실천 팁: 큰 목표를 세우세요. 당신은 큰 일을 할 사람이에요. 하지만 주변 사람들에게는 한 발 물러서세요. '내가 옳다'를 조금 내려놓으면 관계가 좋아집니다."
    ],
    en: [
      "You carry 'Goegang-sal' - extremely intense energy.",
      "Your personality is intense. Clear likes and dislikes, no middle ground. If you like it, you really like it; if not, you really don't. This definite nature divides opinions about you.",
      "But this intensity is your power! You can accomplish great things ordinary people can't. You become stronger in extreme situations, with power to make the impossible possible.",
      "The problem is this strength can strain relationships. Those close to you may feel burdened. You just need to soften slightly.",
      "💡 Action tip: Set big goals. You're meant for great things. But step back a bit with people around you. Letting go of 'I'm right' a little improves relationships."
    ]
  },
  "과숙살": {
    ko: [
      "당신에게는 '과숙살'이라는 독립의 에너지가 있습니다.",
      "스스로의 힘으로 성취해야 하는 운명이에요. 배우자 덕, 부모 덕, 다른 사람의 도움보다 자기 힘으로 일어서야 해요. 처음에는 힘들지만, 결국 가장 단단해집니다.",
      "이것은 외로운 길처럼 보이지만 실은 가장 강한 길이에요. 누구에게도 기대지 않으니 누구도 당신을 무너뜨릴 수 없습니다.",
      "특히 결혼 생활에서 배우자에게 모든 것을 기대하면 실망할 수 있어요. 경제적으로든 정서적으로든 독립심을 유지하세요.",
      "💡 실천 팁: 자기 힘을 키우세요. 경제력, 실력, 정서적 독립... 스스로 강해지세요. 배우자나 가족에게 기대기보다 함께 걷는 관계를 만드세요. 그게 당신에게 맞는 방식이에요."
    ],
    en: [
      "You carry 'Gwasuk-sal' - the energy of independence.",
      "You're destined to achieve through your own power. Rather than spouse's help, parents' support, or others' assistance, you must stand on your own. Hard at first, but you become the strongest.",
      "This seems like a lonely path but is actually the strongest one. Leaning on no one means no one can bring you down.",
      "Especially in marriage, expecting everything from your spouse may disappoint. Maintain independence, financially and emotionally.",
      "💡 Action tip: Build your own strength. Financial power, skills, emotional independence... become strong yourself. Rather than leaning on spouse or family, create a relationship of walking together. That's the way that fits you."
    ]
  }
};

export function getPastLifeNarrative(
  luckyStars: string[],
  challengeStars: string[],
  pastLifeHints: Array<{
    shinsal: string;
    planet: string;
    hint: { ko: string; en: string };
    fusion: { icon: string };
  }>,
  pastLifeTheme: { likely: string; talents: string; lessons: string } | undefined,
  isKo: boolean
): string[] {
  const paragraphs: string[] = [];

  // Opening narrative
  if (isKo) {
    paragraphs.push(
      `🔮 전생과 카르마는 눈에 보이지 않는 영역입니다. 이 분석은 과학적 증명보다는 동양 철학과 점성술의 지혜를 바탕으로 한 영감의 도구예요.`
    );
    paragraphs.push(
      `당신이 왜 특정한 상황에서 강하게 끌리거나 반복적인 패턴을 경험하는지, 그 실마리를 여기서 찾아볼 수 있습니다.`
    );
  } else {
    paragraphs.push(
      `🔮 Past lives and karma belong to invisible realms. This analysis is an inspirational tool based on Eastern philosophy and astrological wisdom rather than scientific proof.`
    );
    paragraphs.push(
      `Here you may find clues about why you feel strongly drawn to certain situations or experience recurring patterns.`
    );
  }

  // Past life theme from karmaAnalysis
  if (pastLifeTheme) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🌀 【전생의 모습 - 영혼이 기억하는 과거】`);
      paragraphs.push('');
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push('');
      paragraphs.push(`이것은 당신의 영혼이 이미 경험한 에너지입니다. 그래서 특정 분야에서 '처음인데 익숙한' 느낌을 받았을 수 있어요.`);
      paragraphs.push('');
      paragraphs.push(`✨ 전생에서 가져온 재능: ${pastLifeTheme.talents}`);
      paragraphs.push(`이 재능은 노력 없이도 자연스럽게 발휘되는 영역일 가능성이 높습니다.`);
      paragraphs.push('');
      paragraphs.push(`📖 이번 생의 숙제: ${pastLifeTheme.lessons}`);
      paragraphs.push(`전생에서 다 배우지 못한 것을 이번 생에서 완성해야 합니다. 어렵게 느껴지는 영역이 바로 성장의 열쇠예요.`);
    } else {
      paragraphs.push(`🌀 【Past Life Vision - What Your Soul Remembers】`);
      paragraphs.push('');
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push('');
      paragraphs.push(`This is energy your soul has already experienced. That's why certain areas may feel 'familiar even though it's your first time.'`);
      paragraphs.push('');
      paragraphs.push(`✨ Talents from past lives: ${pastLifeTheme.talents}`);
      paragraphs.push(`These talents likely manifest naturally without effort.`);
      paragraphs.push('');
      paragraphs.push(`📖 This life's homework: ${pastLifeTheme.lessons}`);
      paragraphs.push(`You must complete what wasn't fully learned in past lives. The areas that feel difficult are the keys to your growth.`);
    }
  }

  // Past life hints from matrix
  if (pastLifeHints.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💫 【신살과 행성의 만남 - 더 깊은 전생 에너지】`);
      paragraphs.push(`동양의 신살(神煞)과 서양 점성술의 행성이 만나면 독특한 카르마적 조합이 나타납니다:`);
      paragraphs.push('');
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}`);
        paragraphs.push(`   ${hint.hint.ko}`);
        paragraphs.push('');
      });
    } else {
      paragraphs.push(`💫 【Shinsal Meets Planets - Deeper Past Life Energy】`);
      paragraphs.push(`When Eastern Shinsal (divine stars) meet Western planetary energies, unique karmic combinations emerge:`);
      paragraphs.push('');
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}`);
        paragraphs.push(`   ${hint.hint.en}`);
        paragraphs.push('');
      });
    }
  }

  // Shinsal stars with extended narratives
  if (luckyStars.length > 0 || challengeStars.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`⭐ 【타고난 별들 - 당신만의 우주적 선물】`);
      paragraphs.push('');
      paragraphs.push(
        `태어나는 순간, 우주는 당신에게 특별한 별들을 선물했습니다. 마치 요정들이 아기에게 축복을 주는 것처럼요. 이 별들은 평생 당신과 함께하며 잠재력과 도전을 나타냅니다.`
      );
    } else {
      paragraphs.push(`⭐ 【Stars You Were Born With - Your Cosmic Gifts】`);
      paragraphs.push('');
      paragraphs.push(
        `At the moment of birth, the universe gifted you special stars. Like fairies blessing a baby, these stars accompany you throughout life, representing your potential and challenges.`
      );
    }

    if (luckyStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '🌟 【축복의 별들】' : '🌟 【Blessing Stars】');
      paragraphs.push('');

      luckyStars.slice(0, 3).forEach((starName, idx) => {
        // Check if we have extended narrative
        const extendedNarrative = shinsalExtendedNarratives[starName];
        if (extendedNarrative) {
          const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
          narrativeLines.forEach(line => paragraphs.push(line));
        } else {
          // Fall back to simple version
          const info = shinsalSimple[starName];
          if (info) {
            paragraphs.push(`${info.emoji} ${starName} (${isKo ? info.typeKo : info.typeEn})`);
            paragraphs.push('');
            paragraphs.push(isKo ? info.storyKo : info.storyEn);
            paragraphs.push('');
            paragraphs.push(`💡 ${isKo ? info.adviceKo : info.adviceEn}`);
          }
        }
        if (idx < luckyStars.slice(0, 3).length - 1) {
          paragraphs.push('');
          paragraphs.push('---');
          paragraphs.push('');
        }
      });
    }

    if (challengeStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '⚡ 【도전의 별들 - 극복하면 최강의 무기가 됩니다】' : '⚡ 【Challenge Stars - Overcome Them to Gain Your Greatest Weapons】');
      paragraphs.push('');
      if (isKo) {
        paragraphs.push(`도전의 별은 '나쁜 별'이 아닙니다. 오히려 극복했을 때 가장 강력한 성장을 가져다주는 별이에요. 다이아몬드가 압력을 받아 빛나듯, 이 별들의 도전을 이겨내면 당신도 빛나게 됩니다.`);
      } else {
        paragraphs.push(`Challenge stars aren't 'bad stars.' Rather, they bring the most powerful growth when overcome. Like diamonds shining under pressure, conquering these stellar challenges makes you shine.`);
      }
      paragraphs.push('');

      challengeStars.slice(0, 3).forEach((starName, idx) => {
        const extendedNarrative = shinsalExtendedNarratives[starName];
        if (extendedNarrative) {
          const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
          narrativeLines.forEach(line => paragraphs.push(line));
        } else {
          const info = shinsalSimple[starName];
          if (info) {
            paragraphs.push(`${info.emoji} ${starName} (${isKo ? info.typeKo : info.typeEn})`);
            paragraphs.push('');
            paragraphs.push(isKo ? info.storyKo : info.storyEn);
            paragraphs.push('');
            paragraphs.push(`💡 ${isKo ? info.adviceKo : info.adviceEn}`);
          }
        }
        if (idx < challengeStars.slice(0, 3).length - 1) {
          paragraphs.push('');
          paragraphs.push('---');
          paragraphs.push('');
        }
      });
    }
  }

  // If still not enough content, add general wisdom
  if (paragraphs.length <= 3) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🌌 【전생 에너지에 대한 일반적 통찰】`);
      paragraphs.push('');
      paragraphs.push(`당신의 상세한 전생 데이터가 충분하지 않아 구체적인 분석은 어렵지만, 몇 가지 보편적인 지혜를 나눌 수 있습니다.`);
      paragraphs.push('');
      paragraphs.push(`우리 모두는 이번 생에 배워야 할 것을 가지고 태어납니다. 어떤 일이 유독 어렵게 느껴진다면, 그것이 바로 당신의 영혼이 이번 생에서 성장하고자 선택한 영역일 수 있어요.`);
      paragraphs.push('');
      paragraphs.push(`반대로, 특별히 노력하지 않아도 잘 되는 일이 있다면, 그것은 전생에서 이미 충분히 연습한 영역입니다. 그 재능을 활용하되, 너무 거기에만 안주하지 마세요.`);
      paragraphs.push('');
      paragraphs.push(`특정 사람에게 강하게 끌리거나, 이유 없이 반복되는 패턴이 있다면, 그것은 카르마적 연결의 신호일 수 있습니다. 그 패턴을 인식하고 의식적으로 선택하는 것이 성장의 시작입니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 출생 시간 정보가 있으면 더 정확한 전생 분석이 가능합니다.`);
    } else {
      paragraphs.push(`🌌 【General Insights on Past Life Energy】`);
      paragraphs.push('');
      paragraphs.push(`While detailed past life data isn't available for specific analysis, here are some universal wisdoms to share.`);
      paragraphs.push('');
      paragraphs.push(`We're all born with lessons to learn this lifetime. If something feels particularly difficult, that might be exactly the area your soul chose to grow in.`);
      paragraphs.push('');
      paragraphs.push(`Conversely, if something comes easily without much effort, that's an area you've already practiced plenty in past lives. Use that talent, but don't rest solely on it.`);
      paragraphs.push('');
      paragraphs.push(`Strong attraction to certain people or inexplicable recurring patterns may signal karmic connections. Recognizing these patterns and making conscious choices is where growth begins.`);
      paragraphs.push('');
      paragraphs.push(`💡 More accurate past life analysis is possible with birth time information.`);
    }
  }

  return paragraphs;
}

// ============================================================
// Section 4: Growth & Healing Narrative (성장과 치유)
// Combines Wound to Heal + Soul Mission + Karmic Relations
// ============================================================

export function getGrowthHealingNarrative(
  woundToHeal: { wound: string; healingPath: string; gift: string } | undefined,
  soulMission: { core: string; expression: string; fulfillment: string } | undefined,
  karmicRelations: Array<{
    relation: string;
    aspect: string;
    meaning: { ko: string; en: string };
    fusion: { icon: string; level: string };
  }>,
  isKo: boolean
): string[] {
  const paragraphs: string[] = [];

  if (soulMission) {
    if (isKo) {
      paragraphs.push(`🌟 【이번 생의 사명 - 당신의 영혼이 선택한 길】`);
      paragraphs.push('');
      paragraphs.push(
        `모든 영혼은 이번 생에 태어나기 전, 무엇을 배우고 이루고 경험할지를 선택합니다. 마치 학교에 입학하기 전에 어떤 과목을 들을지 정하는 것처럼요.`
      );
      paragraphs.push('');
      paragraphs.push(`당신의 영혼이 이번 생에서 선택한 사명은:`);
      paragraphs.push('');
      paragraphs.push(`🎯 【핵심 사명】`);
      paragraphs.push(soulMission.core);
      paragraphs.push('');
      paragraphs.push(`💫 【표현 방식】`);
      paragraphs.push(soulMission.expression);
      paragraphs.push(`이것은 당신이 사명을 수행하는 독특한 스타일입니다. 같은 사명을 가진 사람도 표현 방식은 다 다릅니다.`);
      paragraphs.push('');
      paragraphs.push(`✨ 【성취의 순간】`);
      paragraphs.push(soulMission.fulfillment);
      paragraphs.push('');
      paragraphs.push(
        `이 사명을 따라갈 때, 당신은 가장 충만하고 의미 있는 삶을 살게 됩니다. 힘들 때도 있겠지만, 그 어려움조차 사명의 일부입니다. 영혼은 이미 그것을 알고 이 길을 선택했습니다.`
      );
    } else {
      paragraphs.push(`🌟 【This Life's Mission - The Path Your Soul Chose】`);
      paragraphs.push('');
      paragraphs.push(
        `Every soul, before being born into this life, chooses what to learn, achieve, and experience. Like deciding what courses to take before enrolling in school.`
      );
      paragraphs.push('');
      paragraphs.push(`The mission your soul chose for this lifetime is:`);
      paragraphs.push('');
      paragraphs.push(`🎯 【Core Mission】`);
      paragraphs.push(soulMission.core);
      paragraphs.push('');
      paragraphs.push(`💫 【Expression Style】`);
      paragraphs.push(soulMission.expression);
      paragraphs.push(`This is your unique style of fulfilling your mission. Even those with the same mission express it differently.`);
      paragraphs.push('');
      paragraphs.push(`✨ 【Fulfillment Moment】`);
      paragraphs.push(soulMission.fulfillment);
      paragraphs.push('');
      paragraphs.push(
        `Following this mission leads to the most fulfilling and meaningful life. Though there will be difficulties, even those challenges are part of the mission. Your soul knew this and chose this path anyway.`
      );
    }
  }

  if (woundToHeal) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💝 【치유해야 할 마음의 상처】`);
      paragraphs.push('');
      paragraphs.push(
        `우리 모두는 치유해야 할 상처를 가지고 있습니다. 이것은 약점이 아니라, 성장을 위해 필요한 과제입니다.`
      );
      paragraphs.push('');
      paragraphs.push(
        `상처가 없는 사람은 없습니다. 중요한 것은 그 상처를 인정하고, 직면하고, 치유하는 것입니다.`
      );
      paragraphs.push('');
      paragraphs.push(`💔 【아픈 곳】`);
      paragraphs.push(woundToHeal.wound);
      paragraphs.push('');
      paragraphs.push(
        `이 상처는 어쩌면 전생에서 온 것일 수도, 어린 시절의 경험일 수도, 혹은 이번 생에서 겪은 일일 수도 있습니다.`
      );
      paragraphs.push('');
      paragraphs.push(`🩹 【치유의 길】`);
      paragraphs.push(woundToHeal.healingPath);
      paragraphs.push('');
      paragraphs.push(`🎁 【치유 후의 선물】`);
      paragraphs.push(woundToHeal.gift);
      paragraphs.push('');
      paragraphs.push(
        `흥미로운 점은, 상처가 완전히 치유되면 그것이 오히려 당신의 가장 큰 강점이 된다는 것입니다. '상처받은 치유자(Wounded Healer)'라는 말이 있듯이, 같은 아픔을 겪어본 사람만이 줄 수 있는 깊은 공감과 지혜가 생깁니다.`
      );
    } else {
      paragraphs.push(`💝 【Heart Wounds to Heal】`);
      paragraphs.push('');
      paragraphs.push(
        `We all carry wounds that need healing. This isn't weakness but a necessary task for growth.`
      );
      paragraphs.push('');
      paragraphs.push(
        `No one is without wounds. What matters is acknowledging, facing, and healing them.`
      );
      paragraphs.push('');
      paragraphs.push(`💔 【The Wound】`);
      paragraphs.push(woundToHeal.wound);
      paragraphs.push('');
      paragraphs.push(
        `This wound might come from past lives, childhood experiences, or events in this lifetime.`
      );
      paragraphs.push('');
      paragraphs.push(`🩹 【Healing Path】`);
      paragraphs.push(woundToHeal.healingPath);
      paragraphs.push('');
      paragraphs.push(`🎁 【Gift After Healing】`);
      paragraphs.push(woundToHeal.gift);
      paragraphs.push('');
      paragraphs.push(
        `Interestingly, once completely healed, the wound becomes your greatest strength. As the concept of 'Wounded Healer' suggests, only those who've experienced the same pain can offer deep empathy and wisdom.`
      );
    }
  }

  if (karmicRelations.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💫 【카르마적 관계 패턴 - 인연의 비밀】`);
      paragraphs.push('');
      paragraphs.push(
        `어떤 사람을 처음 만났는데 오래 알던 것 같은 느낌... 이유 없이 강하게 끌리거나, 반대로 설명할 수 없는 거부감... 이런 경험 있으신가요?`
      );
      paragraphs.push('');
      paragraphs.push(
        `이것은 카르마적 연결, 즉 전생부터 이어져 온 인연의 신호일 수 있습니다. 같은 패턴의 사람을 반복해서 만나거나, 특정 유형의 관계에서 계속 같은 문제가 생긴다면 특히 그렇습니다.`
      );
      paragraphs.push('');
      paragraphs.push(`당신의 차트에서 발견된 카르마적 관계 패턴:`);
      paragraphs.push('');
      karmicRelations.slice(0, 3).forEach(rel => {
        paragraphs.push(`${rel.fusion.icon} ${rel.relation} × ${rel.aspect}`);
        paragraphs.push(`강도: ${rel.fusion.level}`);
        paragraphs.push(`의미: ${rel.meaning.ko}`);
        paragraphs.push('');
      });
      paragraphs.push(
        `이 패턴들을 인식하는 것만으로도 관계에서 더 의식적인 선택을 할 수 있습니다. 무의식적으로 끌려가기보다, "아, 이 패턴이구나" 하고 인식하면 다른 선택을 할 수 있어요.`
      );
    } else {
      paragraphs.push(`💫 【Karmic Relationship Patterns - Secrets of Connection】`);
      paragraphs.push('');
      paragraphs.push(
        `Meeting someone for the first time but feeling like you've known them forever... Strong inexplicable attraction, or conversely, unexplainable aversion... Sound familiar?`
      );
      paragraphs.push('');
      paragraphs.push(
        `These may signal karmic connections - bonds carried over from past lives. This is especially likely if you repeatedly meet the same type of person or keep facing the same issues in certain relationships.`
      );
      paragraphs.push('');
      paragraphs.push(`Karmic relationship patterns found in your chart:`);
      paragraphs.push('');
      karmicRelations.slice(0, 3).forEach(rel => {
        paragraphs.push(`${rel.fusion.icon} ${rel.relation} × ${rel.aspect}`);
        paragraphs.push(`Intensity: ${rel.fusion.level}`);
        paragraphs.push(`Meaning: ${rel.meaning.en}`);
        paragraphs.push('');
      });
      paragraphs.push(
        `Simply recognizing these patterns enables more conscious choices in relationships. Rather than being unconsciously drawn, thinking "Ah, this is that pattern" allows for different choices.`
      );
    }
  }

  if (paragraphs.length === 0) {
    if (isKo) {
      paragraphs.push(`🌱 【성장과 치유에 대하여】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석 데이터가 부족하지만, 성장과 치유에 대한 보편적인 지혜를 나눌 수 있습니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 【성장의 열쇠】`);
      paragraphs.push(`어렵게 느껴지는 영역이 바로 성장의 열쇠입니다. 영혼은 쉬운 것을 배우러 오지 않았어요.`);
      paragraphs.push('');
      paragraphs.push(`💝 【치유의 시작】`);
      paragraphs.push(`치유는 상처를 인정하는 것에서 시작됩니다. "나는 괜찮아"라고 부정하기보다, "그래, 이게 아팠어"라고 인정하는 것이 첫걸음입니다.`);
      paragraphs.push('');
      paragraphs.push(`🤝 【관계의 거울】`);
      paragraphs.push(`반복되는 관계 패턴이 있다면, 그것은 당신에게 뭔가를 가르치려는 우주의 메시지일 수 있습니다. 그 패턴이 무엇을 말하려는지 귀 기울여보세요.`);
      paragraphs.push('');
      paragraphs.push(`출생 시간 정보가 있으면 더 구체적인 분석이 가능합니다.`);
    } else {
      paragraphs.push(`🌱 【About Growth and Healing】`);
      paragraphs.push('');
      paragraphs.push(`While detailed analysis data isn't available, here's some universal wisdom on growth and healing.`);
      paragraphs.push('');
      paragraphs.push(`💡 【Key to Growth】`);
      paragraphs.push(`The areas that feel difficult are the keys to growth. Your soul didn't come here to learn easy things.`);
      paragraphs.push('');
      paragraphs.push(`💝 【Starting Healing】`);
      paragraphs.push(`Healing begins with acknowledging the wound. Rather than denying "I'm fine," saying "Yes, that hurt" is the first step.`);
      paragraphs.push('');
      paragraphs.push(`🤝 【Relationship Mirrors】`);
      paragraphs.push(`If there are recurring relationship patterns, they may be the universe's message trying to teach you something. Listen to what that pattern is trying to say.`);
      paragraphs.push('');
      paragraphs.push(`More specific analysis is possible with birth time information.`);
    }
  }

  return paragraphs;
}

// ============================================================
// Section 5: Energy Balance Narrative (에너지 밸런스)
// Comprehensive Five Elements analysis
// ============================================================

export function getEnergyBalanceNarrative(
  elementAnalysis: {
    balance: Record<string, number>;
    strongest: string;
    weakest: string;
  } | null,
  isKo: boolean
): string[] {
  const paragraphs: string[] = [];

  if (!elementAnalysis) {
    if (isKo) {
      paragraphs.push(`⚖️ 【오행 에너지의 기본 이해】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석 데이터가 없더라도, 오행에 대한 기본적인 이해가 도움이 됩니다.`);
      paragraphs.push('');
      paragraphs.push(`🌳 【나무(木)】 - 봄, 성장, 시작의 에너지`);
      paragraphs.push(`새로운 것을 시작하고 뻗어나가는 힘입니다. 부족하면 우유부단하고, 과하면 화를 잘 냅니다.`);
      paragraphs.push('');
      paragraphs.push(`🔥 【불(火)】 - 여름, 열정, 표현의 에너지`);
      paragraphs.push(`기쁨을 표현하고 빛나는 힘입니다. 부족하면 우울하고, 과하면 지나치게 흥분합니다.`);
      paragraphs.push('');
      paragraphs.push(`🏔️ 【흙(土)】 - 환절기, 안정, 중심의 에너지`);
      paragraphs.push(`균형을 잡고 포용하는 힘입니다. 부족하면 불안하고, 과하면 완고해집니다.`);
      paragraphs.push('');
      paragraphs.push(`⚔️ 【쇠(金)】 - 가을, 결단, 정리의 에너지`);
      paragraphs.push(`정리하고 마무리하는 힘입니다. 부족하면 결정을 못하고, 과하면 냉정해집니다.`);
      paragraphs.push('');
      paragraphs.push(`💧 【물(水)】 - 겨울, 지혜, 휴식의 에너지`);
      paragraphs.push(`생각하고 저장하는 힘입니다. 부족하면 유연성이 없고, 과하면 두려움이 많습니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 본인의 오행 분포를 알고 싶다면 정확한 생년월일시 정보가 필요합니다.`);
    } else {
      paragraphs.push(`⚖️ 【Basic Understanding of Five Elements】`);
      paragraphs.push('');
      paragraphs.push(`Even without detailed analysis data, basic understanding of Five Elements helps.`);
      paragraphs.push('');
      paragraphs.push(`🌳 【Wood(木)】 - Spring, Growth, Starting energy`);
      paragraphs.push(`Power to start new things and expand. Too little brings indecision, too much brings anger.`);
      paragraphs.push('');
      paragraphs.push(`🔥 【Fire(火)】 - Summer, Passion, Expression energy`);
      paragraphs.push(`Power to express joy and shine. Too little brings depression, too much brings over-excitement.`);
      paragraphs.push('');
      paragraphs.push(`🏔️ 【Earth(土)】 - Season transitions, Stability, Centering energy`);
      paragraphs.push(`Power to balance and embrace. Too little brings anxiety, too much brings stubbornness.`);
      paragraphs.push('');
      paragraphs.push(`⚔️ 【Metal(金)】 - Autumn, Decision, Organization energy`);
      paragraphs.push(`Power to organize and conclude. Too little can't decide, too much becomes cold.`);
      paragraphs.push('');
      paragraphs.push(`💧 【Water(水)】 - Winter, Wisdom, Rest energy`);
      paragraphs.push(`Power to think and store. Too little lacks flexibility, too much brings fear.`);
      paragraphs.push('');
      paragraphs.push(`💡 To know your Five Elements distribution, accurate birth date and time information is needed.`);
    }
    return paragraphs;
  }

  const elementNames: Record<string, { ko: string; en: string; emoji: string }> = {
    wood: { ko: '나무(木)', en: 'Wood(木)', emoji: '🌳' },
    fire: { ko: '불(火)', en: 'Fire(火)', emoji: '🔥' },
    earth: { ko: '흙(土)', en: 'Earth(土)', emoji: '🏔️' },
    metal: { ko: '쇠(金)', en: 'Metal(金)', emoji: '⚔️' },
    water: { ko: '물(水)', en: 'Water(水)', emoji: '💧' }
  };

  const elementDetails: Record<string, { meaning: { ko: string; en: string }; boost: { ko: string; en: string } }> = {
    wood: {
      meaning: {
        ko: '성장, 창의성, 시작하는 힘을 나타냅니다. 봄의 에너지처럼 위로 뻗어나가려는 생명력입니다.',
        en: 'Represents growth, creativity, and starting power. Like spring energy, it\'s the life force reaching upward.'
      },
      boost: {
        ko: '초록색 옷, 식물 키우기, 새벽 산책, 신맛 나는 음식',
        en: 'Green clothing, growing plants, morning walks, sour foods'
      }
    },
    fire: {
      meaning: {
        ko: '열정, 표현력, 기쁨을 나타냅니다. 여름의 에너지처럼 활활 타오르는 생명력입니다.',
        en: 'Represents passion, expression, and joy. Like summer energy, it\'s the blazing life force.'
      },
      boost: {
        ko: '빨간색/주황색, 춤이나 운동, 사람들과 어울리기, 쓴맛 음식',
        en: 'Red/orange colors, dancing or exercise, socializing, bitter foods'
      }
    },
    earth: {
      meaning: {
        ko: '안정, 포용력, 중심을 잡는 힘을 나타냅니다. 모든 계절의 전환점에서 균형을 잡아줍니다.',
        en: 'Represents stability, embracing nature, and centering power. Provides balance at seasonal transitions.'
      },
      boost: {
        ko: '노란색/갈색, 요리하기, 정리정돈, 단맛 음식',
        en: 'Yellow/brown colors, cooking, organizing, sweet foods'
      }
    },
    metal: {
      meaning: {
        ko: '결단력, 정리하는 힘, 마무리를 나타냅니다. 가을의 에너지처럼 수확하고 정리하는 힘입니다.',
        en: 'Represents decisiveness, organizing power, and completion. Like autumn energy, it harvests and organizes.'
      },
      boost: {
        ko: '흰색/금속색, 정리정돈, 호흡 명상, 매운맛 음식',
        en: 'White/metallic colors, tidying up, breathing meditation, spicy foods'
      }
    },
    water: {
      meaning: {
        ko: '지혜, 적응력, 깊은 사고를 나타냅니다. 겨울의 에너지처럼 내면으로 들어가 재충전하는 힘입니다.',
        en: 'Represents wisdom, adaptability, and deep thinking. Like winter energy, it goes inward to recharge.'
      },
      boost: {
        ko: '파란색/검정색, 명상, 독서, 충분한 수면, 짠맛 음식',
        en: 'Blue/black colors, meditation, reading, adequate sleep, salty foods'
      }
    }
  };

  if (isKo) {
    paragraphs.push(`⚖️ 【오행 에너지 밸런스 분석】`);
    paragraphs.push(
      `동양 철학에서 모든 것은 다섯 가지 원소의 조화로 이루어집니다. 당신 안에도 이 다섯 에너지가 흐르고 있으며, 그 균형이 건강과 운의 흐름에 영향을 미칩니다.`
    );
    paragraphs.push('');

    // Strongest element
    const strongest = elementNames[elementAnalysis.strongest];
    const strongestDetail = elementDetails[elementAnalysis.strongest];
    paragraphs.push(`🌟 【가장 강한 에너지: ${strongest.emoji} ${strongest.ko}】`);
    paragraphs.push(strongestDetail.meaning.ko);
    paragraphs.push(
      `이 에너지가 강하다는 것은 이 영역에서 타고난 재능이 있다는 뜻입니다. 하지만 너무 과하면 균형이 깨질 수 있으니 조절이 필요합니다.`
    );
    paragraphs.push('');

    // Weakest element
    const weakest = elementNames[elementAnalysis.weakest];
    const weakestDetail = elementDetails[elementAnalysis.weakest];
    paragraphs.push(`💫 【보충하면 좋은 에너지: ${weakest.emoji} ${weakest.ko}】`);
    paragraphs.push(weakestDetail.meaning.ko);
    paragraphs.push(`이 에너지를 보충하면 전체적인 균형이 좋아집니다.`);
    paragraphs.push(`💡 보충 방법: ${weakestDetail.boost.ko}`);
    paragraphs.push('');

    paragraphs.push('');
    paragraphs.push(`🔄 【오행의 상생 관계】`);
    paragraphs.push(`나무는 불을 살리고(木生火), 불은 흙을 만들고(火生土), 흙은 쇠를 품고(土生金), 쇠는 물을 모으고(金生水), 물은 나무를 키웁니다(水生木).`);
    paragraphs.push('');
    paragraphs.push(`당신에게 부족한 에너지를 직접 보충하기 어렵다면, 그것을 '낳아주는' 에너지를 보충하세요. 예를 들어 火가 부족하면 木 에너지를 늘리면 됩니다.`);
    paragraphs.push('');
    paragraphs.push(
      `오행의 균형은 고정된 것이 아니라 계절, 나이, 환경에 따라 변합니다. 지금 부족한 에너지를 의식적으로 보충하면서 자연스러운 조화를 찾아가세요.`
    );
  } else {
    paragraphs.push(`⚖️ 【Five Elements Energy Balance Analysis】`);
    paragraphs.push(
      `In Eastern philosophy, everything is composed of harmony among five elements. These five energies flow within you, and their balance affects health and fortune.`
    );
    paragraphs.push('');

    const strongest = elementNames[elementAnalysis.strongest];
    const strongestDetail = elementDetails[elementAnalysis.strongest];
    paragraphs.push(`🌟 【Strongest Energy: ${strongest.emoji} ${strongest.en}】`);
    paragraphs.push(strongestDetail.meaning.en);
    paragraphs.push(
      `Strong energy here means innate talent in this area. But too much can upset balance, so moderation is needed.`
    );
    paragraphs.push('');

    const weakest = elementNames[elementAnalysis.weakest];
    const weakestDetail = elementDetails[elementAnalysis.weakest];
    paragraphs.push(`💫 【Energy to Boost: ${weakest.emoji} ${weakest.en}】`);
    paragraphs.push(weakestDetail.meaning.en);
    paragraphs.push(`Supplementing this energy improves overall balance.`);
    paragraphs.push(`💡 How to boost: ${weakestDetail.boost.en}`);
    paragraphs.push('');

    paragraphs.push('');
    paragraphs.push(`🔄 【Five Elements Generation Cycle】`);
    paragraphs.push(`Wood feeds Fire (木生火), Fire creates Earth (火生土), Earth bears Metal (土生金), Metal collects Water (金生水), Water nourishes Wood (水生木).`);
    paragraphs.push('');
    paragraphs.push(`If directly boosting lacking energy is difficult, supplement the energy that 'gives birth to' it. For example, if Fire is lacking, increase Wood energy.`);
    paragraphs.push('');
    paragraphs.push(
      `Five Elements balance isn't fixed - it changes with seasons, age, and environment. Consciously supplement lacking energy while finding natural harmony.`
    );
  }

  return paragraphs;
}
