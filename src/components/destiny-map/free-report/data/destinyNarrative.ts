/**
 * Destiny Narrative Data - 운명 서사 데이터
 * FreeReport.tsx에서 분리된 대형 데이터 객체들
 */

export interface NarrativeEntry {
  ko: string;
  en: string;
  koDetail: string;
  enDetail: string;
}

// 일간별 인생 주제
export const LIFE_THEMES: Record<string, NarrativeEntry> = {
  "갑": {
    ko: "내 방식대로 세상을 바꾸는 것",
    en: "Changing the world your own way",
    koDetail: "당신은 숲에서 가장 높이 솟은 나무예요. 곧고 정직하며, 한번 뿌리를 내리면 어떤 바람에도 흔들리지 않아요. 세상은 당신에게 '좀 유연해져라'고 말하지만, 사실 당신의 그 곧음이 바로 당신의 힘이에요. 어린 시절부터 남들보다 일찍 철이 들었고, 책임감 때문에 자신을 희생한 적도 많았을 거예요. 하지만 그런 경험들이 지금의 당신을 만들었어요. 당신은 리더가 될 운명이에요. 앞에 서서 길을 보여주고, 사람들이 따라올 수 있게 해주는 것. 그게 당신이 이 세상에 온 이유예요.",
    enDetail: "You are the tallest tree in the forest. Upright and honest, once you take root, no wind can shake you. The world tells you to 'be more flexible,' but your straightness is actually your power. You matured faster than others, sacrificing yourself for responsibility. Those experiences made you who you are. You're destined to lead—showing the way and letting others follow."
  },
  "을": {
    ko: "어디서든 뿌리내리는 강한 생명력",
    en: "Thriving wherever you're planted",
    koDetail: "당신은 덩굴처럼 어디든 뻗어나가는 생명력을 가졌어요. 남들은 '흔들린다'고 하지만, 당신은 '적응한다'고 말해요. 그게 당신의 방식이에요. 세상의 모든 장애물을 우회해서 결국 원하는 곳에 도달하는 것. 연약해 보이지만 그 안에는 강인한 생존 본능이 숨어 있어요. 어린 시절부터 분위기를 읽는 법을 배웠고, 갈등을 피하는 역할을 자주 했을 거예요. 그래서 지금도 사람들 사이에서 다리가 되어주고, 연결하는 일을 잘해요. 당신의 유연함은 약점이 아니라 최고의 무기예요.",
    enDetail: "You have the vitality of a vine that extends anywhere. Others call it 'wavering,' but you call it 'adapting.' That's your way—navigating around every obstacle to reach where you want. You look delicate, but inside is strong survival instinct. You learned early to read the room and often played peacemaker. That's why you're great at being a bridge between people. Your flexibility isn't weakness—it's your greatest weapon."
  },
  "병": {
    ko: "존재만으로 사람들에게 빛이 되는 것",
    en: "Being a light just by existing",
    koDetail: "당신은 태양이에요. 어디를 가든 분위기를 밝게 만들고, 사람들에게 에너지를 줘요. 당신이 방에 들어오면 뭔가 달라져요. 그 존재감, 그 열정, 그 카리스마. 사람들은 무의식적으로 당신에게 끌려요. 하지만 태양도 지는 밤이 있듯이, 당신도 가끔은 에너지가 바닥날 때가 있어요. 밝은 모습 뒤에서 '나에게 에너지를 주는 사람은 누구지?'라고 외로워할 때가 있죠. 괜찮아요. 구름 뒤에서도 태양은 여전히 빛나고 있어요. 세상을 밝히는 것, 그게 당신이 태어난 이유예요.",
    enDetail: "You are the sun. Wherever you go, you brighten the atmosphere and give energy to people. When you enter a room, something changes. That presence, that passion, that charisma—people are drawn to you unconsciously. But just as the sun sets, sometimes your energy runs low. Behind your bright exterior, you sometimes wonder 'Who gives energy to me?' It's okay. Even behind clouds, the sun still shines. Illuminating the world—that's why you were born."
  },
  "정": {
    ko: "작은 불꽃으로 큰 감동을 만드는 것",
    en: "Creating big moments from small sparks",
    koDetail: "당신은 촛불이에요. 태양처럼 온 세상을 비추진 못하지만, 가까이 있는 사람에게 따뜻한 빛과 온기를 전해요. 섬세하고 배려심이 깊어서 다른 사람들이 놓치는 작은 것들을 알아채요. 누군가의 말투가 평소와 다르다는 것, 표정이 조금 어둡다는 것... 당신은 다 느껴요. 그래서 사람들은 당신 곁에서 이상하게 마음이 편해지고, 자기 이야기를 하고 싶어져요. 밤하늘의 별처럼, 어둠이 짙어질수록 당신의 빛은 더 잘 보여요. 한 사람을 밝히는 것, 그것이 세상을 바꾸는 거예요.",
    enDetail: "You are a candle. You can't illuminate the whole world like the sun, but you bring warm light and heat to those close to you. Delicate and considerate, you notice small things others miss—a slightly different tone, a darker expression. People feel strangely at ease near you, wanting to share their stories. Like stars in the night sky, your light shows better as darkness deepens. Lighting up one person—that's how you change the world."
  },
  "무": {
    ko: "모두가 기댈 수 있는 산이 되는 것",
    en: "Being the mountain everyone can rely on",
    koDetail: "당신은 산이에요. 묵직하고 듬직한 존재감을 가지고 있어요. 한번 마음먹으면 쉽게 변하지 않는 굳건함이 있죠. 당신이 '내가 할게'라고 말하면, 사람들은 안심해요. 산이 그 자리에 있듯이, 당신의 존재 자체가 주변 사람들에게 안정감을 줘요. 어린 시절부터 믿음직한 아이였을 거예요. 일찍부터 책임감을 가지고, 가정의 기둥 역할을 했을 수도 있어요. 하지만 가끔은 '약해도 괜찮다'고 자신에게 허락해주세요. 산도 지진에는 흔들려요. 변하지 않는 존재로 있어주는 것, 그게 당신의 사명이에요.",
    enDetail: "You are a mountain. You have a solid, dependable presence. Once you set your mind, you have unwavering determination. When you say 'I'll handle it,' people feel relieved. Like a mountain standing in its place, your very existence gives stability to those around you. You were probably reliable since childhood, taking on responsibility and being the family pillar. But sometimes permit yourself to 'be weak.' Even mountains shake in earthquakes. Being the unchanging presence—that's your mission."
  },
  "기": {
    ko: "관계의 중심에서 화합을 이끄는 것",
    en: "Bringing harmony to every relationship",
    koDetail: "당신은 정원의 흙이에요. 겉으로는 평범해 보이지만, 모든 것을 품고 자라게 하는 놀라운 생명력이 있어요. 누구나 당신에게 쉽게 다가올 수 있어요. 당신 옆에 있으면 왠지 마음이 편해지고, 자신의 이야기를 하고 싶어져요. 어린 시절부터 돌봄을 주거나 받는 역할을 했을 거예요. 친구들의 고민 상담 역할을 맡거나, 갈등을 중재하는 일을 많이 했을 거예요. 남들을 챙기느라 자신의 욕구는 뒷전으로 미루는 경향이 있어요. '나도 받아도 괜찮아'라고 자신에게 허락해주세요. 다른 사람들이 성장하도록 돕는 것, 그게 당신이 이 세상에 온 이유예요.",
    enDetail: "You are garden soil. You may seem ordinary outside, but you have amazing life force that nurtures everything. Anyone can easily approach you. Being near you makes people feel at ease and want to share their stories. You've played a caregiving role since childhood—counseling friends or mediating conflicts. You tend to put others first and neglect your own needs. Permit yourself to 'receive too.' Helping others grow—that's why you came to this world."
  },
  "경": {
    ko: "망설임 없이 길을 개척하는 것",
    en: "Blazing trails without hesitation",
    koDetail: "당신은 날카로운 검이에요. 옳고 그름을 명확히 하고 불의를 참지 못해요. 카리스마 있고 결단력 있으며, 한번 결심하면 끝까지 밀어붙이는 추진력이 있어요. 당신의 눈빛 하나로 주변이 조용해질 때가 있어요. 어린 시절, 불공정한 상황에 분노한 기억이 있을 거예요. 왜 세상이 이렇게 불공평한지, 왜 정의가 실현되지 않는지 화가 났죠. 그 분노가 지금의 당신을 만들었어요. 강해 보이는 외면과 달리 내면은 의외로 여리고 섬세해요. 하지만 그걸 아무에게도 보여주지 않아요. 불의와 싸우고 약한 사람들을 보호하는 것, 그게 당신의 사명이에요.",
    enDetail: "You are a sharp sword. You distinguish right from wrong clearly and can't tolerate injustice. Charismatic and decisive, you push through once decided. A single look from you can silence a room. You remember being angered by unfair situations in childhood—frustrated by the world's unfairness and justice not being served. That anger made who you are. Despite your strong exterior, you're surprisingly delicate inside, but you never show anyone. Fighting injustice and protecting the weak—that's your mission."
  },
  "신": {
    ko: "평범함 속에서 특별함을 찾는 것",
    en: "Finding the extraordinary in ordinary",
    koDetail: "당신은 다이아몬드예요. 세련되고 빛나는 존재감을 가지고 있어요. 미적 감각이 뛰어나고, 디테일에 강하며, 무엇이든 아름답게 만드는 능력이 있어요. 사람들은 당신의 취향을 신뢰하고, 당신의 추천을 따라요. 하지만 그 안목이 때로는 당신 자신에게 가장 가혹하게 적용돼요. 거울을 볼 때마다 부족한 점만 보이고, 완벽하지 않은 것에 대한 두려움이 당신을 옭아매요. 다른 사람들이 보지 못하는 것을 보는 능력, 그것이 당신을 특별하게 만들어요. '그냥 있는 그대로도 괜찮아'라고 스스로에게 말해주세요. 금이 간 도자기도 아름다워요.",
    enDetail: "You are a diamond. You have a refined, radiant presence. Excellent aesthetic sense, attention to detail, ability to beautify anything. People trust your taste and follow your recommendations. But that same eye is often harshest on yourself. Every mirror shows only flaws, and fear of imperfection binds you. The ability to see what others can't—that makes you special. Tell yourself 'It's okay just as it is.' Cracked pottery is beautiful too."
  },
  "임": {
    ko: "깊이로 세상을 품는 것",
    en: "Embracing the world through depth",
    koDetail: "당신은 깊은 바다예요. 겉으로는 잔잔해 보이지만, 그 아래에는 상상할 수 없는 깊이가 있어요. 지혜롭고 포용력 있으며, 강한 직관을 가지고 있어요. 남들이 보지 못하는 것을 보고, 느끼지 못하는 것을 느껴요. 어린 시절부터 혼자만의 세계가 있었을 거예요. 책이나 상상 속에서 시간을 보내며, '왜 다들 이 정도밖에 생각 안 하지?'라고 느꼈을 수도 있어요. 그 깊이가 때로는 외로움이 되기도 해요. 하지만 그 깊이야말로 당신의 가장 큰 선물이에요. 세상을 깊이로 품고, 통찰로 사람들을 이끄는 것. 그게 당신이 이 세상에 온 이유예요.",
    enDetail: "You are the deep ocean. Calm on the surface, but unimaginable depth lies beneath. Wise, embracing, with strong intuition. You see what others can't, feel what others miss. Since childhood, you had your own world, spending time in books or imagination, wondering 'Why doesn't everyone think deeper?' That depth sometimes becomes loneliness. But that very depth is your greatest gift. Embracing the world through depth and leading people through insight—that's why you came to this world."
  },
  "계": {
    ko: "순수한 영감으로 세상에 울림을 주는 것",
    en: "Touching hearts with pure inspiration",
    koDetail: "당신은 맑은 시냇물이에요. 순수하고 깨끗하며, 흐르는 곳마다 생명을 줘요. 섬세하고 창의적이며, 강한 영적 감수성을 가지고 있어요. 다른 사람들이 못 느끼는 에너지를 느끼고, 못 보는 아름다움을 봐요. 어린 시절부터 감수성이 남달랐을 거예요. 다른 아이들이 뛰어노는 동안 당신은 하늘을 보며 생각에 잠겨 있었을 수도 있어요. 예민하다는 말을 많이 들었겠지만, 그 예민함이 바로 당신의 창의성의 원천이에요. 순수한 영감으로 세상을 감동시키는 것, 그게 당신이 태어난 이유예요.",
    enDetail: "You are a clear stream. Pure and clean, bringing life wherever you flow. Delicate, creative, with strong spiritual sensitivity. You feel energy others can't, see beauty others miss. Since childhood, your sensitivity was exceptional. While other kids played, you were lost in thought watching the sky. You've been called 'too sensitive,' but that sensitivity is the source of your creativity. Touching the world with pure inspiration—that's why you were born."
  },
};

// 감정 운명 패턴 (오행 기반)
export const EMOTION_PATTERNS: Record<string, NarrativeEntry> = {
  wood: {
    ko: "답답하면 견딜 수가 없어요. 뭔가 시작하거나 움직여야 마음이 풀리는 타입.",
    en: "You can't stand feeling stuck. Starting something new is how you release stress.",
    koDetail: "당신의 감정은 새싹과 같아요. 움직이고, 자라고, 뻗어나가야 해요. 가만히 있으라고 하면 오히려 스트레스를 받아요. 답답한 상황에서는 무조건 뭔가를 시작하거나 몸을 움직여야 해요. 러닝, 등산, 새로운 프로젝트... 뭐든 상관없어요. 핵심은 '정체되지 않는 것'이에요. 화가 나면 참지 말고 바로 표현하는 게 나아요. 속으로 삭이면 오히려 더 커져요. 하지만 그 표현이 공격적이지 않게 조심하세요. '나는 이게 불편해'라고 담담하게 말하는 연습을 해보세요. 분노를 성장의 에너지로 바꾸는 법을 배우면, 당신은 무적이 돼요.",
    enDetail: "Your emotions are like sprouts—they need to move, grow, extend. Being told to 'just wait' actually stresses you more. In frustrating situations, you must start something or move your body. Running, hiking, new projects... anything works. The key is 'not being stagnant.' When angry, express it immediately rather than holding it in. Suppressing makes it bigger. Just be careful not to be aggressive. Practice saying 'This makes me uncomfortable' calmly. When you learn to turn anger into growth energy, you become unstoppable."
  },
  fire: {
    ko: "감정이 화끈하게 올라와요. 기쁘면 온몸으로 기뻐하고, 화나면 확 터질 수 있어요.",
    en: "Emotions hit you all at once. Joy is felt with your whole body.",
    koDetail: "당신의 감정은 불꽃이에요. 확 타오르고, 환하게 빛나고, 그리고 스르르 사라져요. 뒤끝이 없다는 건 당신의 큰 장점이에요. 어제 싸웠어도 오늘은 아무렇지 않게 대할 수 있어요. 하지만 그 순간의 감정이 너무 강해서 말실수를 하거나, 상대방에게 상처를 줄 수 있어요. 특히 자존심이 건드려졌을 때 조심하세요. '내가 무시당했다'는 느낌이 들면 이성적 판단이 어려워져요. 화가 나면 10초만 기다려보세요. 그 10초가 관계를 살릴 수 있어요. 당신의 열정은 세상을 따뜻하게 만들어요. 그 불꽃을 잘 다루는 법만 배우면 돼요.",
    enDetail: "Your emotions are flames—they ignite quickly, shine brightly, then softly fade. Having no grudges is your great strength. You can fight yesterday and act normal today. But that intense moment can lead to saying things you regret or hurting others. Be especially careful when your pride is touched. When you feel 'disrespected,' rational judgment becomes difficult. When angry, just wait 10 seconds. Those 10 seconds can save relationships. Your passion warms the world. You just need to learn to handle that flame."
  },
  earth: {
    ko: "웬만해선 흔들리지 않아요. 하지만 진짜 상처받으면 오래 가요.",
    en: "You don't shake easily. But when truly hurt, it lasts.",
    koDetail: "당신의 감정은 대지와 같아요. 안정적이고 묵직해요. 웬만한 일에는 흔들리지 않죠. 사람들은 당신의 그 차분함에 안심해요. 하지만 한번 무너지면 회복하는 데 시간이 오래 걸려요. 특히 신뢰가 깨졌을 때... 그건 당신에게 가장 큰 상처예요. '어떻게 그럴 수 있어?'라는 배신감이 마음속에서 쉽게 지워지지 않아요. 감정을 억누르지 마세요. '나 지금 많이 힘들어'라고 표현하는 게 필요해요. 혼자 다 감당하려 하지 말고, 가까운 사람에게 기대는 연습을 하세요. 당신이 모든 것을 지탱할 필요는 없어요. 때로는 무너져도 괜찮아요.",
    enDetail: "Your emotions are like the earth—stable and solid. Ordinary things don't shake you. People feel secure in your calmness. But once you crumble, recovery takes long. Especially when trust breaks—that's your deepest wound. The betrayal of 'How could they?' doesn't easily fade from your heart. Don't suppress emotions. You need to express 'I'm really struggling right now.' Don't try to handle everything alone; practice leaning on close ones. You don't need to support everything. It's okay to crumble sometimes."
  },
  metal: {
    ko: "밖에선 '쿨'해 보여도 속은 예민해요. 완벽하지 않으면 자책해요.",
    en: "You look 'cool' outside, but you're sensitive inside.",
    koDetail: "당신의 감정은 금속과 같아요. 겉은 차갑고 단단해 보이지만, 속은 의외로 섬세해요. 완벽하지 않으면 스스로를 자책하고, 작은 실수에도 오래 마음에 담아둬요. '왜 그랬을까' '더 잘할 수 있었는데'... 이런 생각이 반복돼요. 남들은 당신이 아무렇지 않은 줄 알지만, 실은 밤에 혼자 그 일을 곱씹고 있어요. 비판에 특히 민감해요. 누군가가 당신의 일에 '이건 좀 아닌 것 같아'라고 하면, 머릿속에서 그 말이 계속 맴돌아요. 스스로에게 너무 가혹하지 마세요. '완벽하지 않아도 괜찮아'라고 매일 자신에게 말해주세요.",
    enDetail: "Your emotions are like metal—cold and hard on the outside, but surprisingly delicate inside. When imperfect, you blame yourself, holding onto small mistakes for a long time. 'Why did I do that?' 'I could have done better'... these thoughts repeat. Others think you're fine, but you're actually replaying it alone at night. You're especially sensitive to criticism. When someone says 'This doesn't seem right,' that phrase keeps circling in your head. Don't be too harsh on yourself. Tell yourself daily 'It's okay not to be perfect.'"
  },
  water: {
    ko: "남들이 모르는 감정의 심연이 있어요. 혼자만의 시간이 꼭 필요해요.",
    en: "You have emotional depths others don't see. Alone time is essential.",
    koDetail: "당신의 감정은 깊은 바다와 같아요. 표면은 잔잔해 보이지만, 그 아래에는 복잡하고 깊은 감정의 흐름이 있어요. 남들은 당신이 무슨 생각을 하는지 잘 몰라요. 왜냐하면 당신은 쉽게 속을 보여주지 않거든요. 혼자만의 시간이 꼭 필요해요. 그 시간에 감정을 정리하고, 자신을 충전해요. 사람들과 너무 오래 있으면 에너지가 빠져요. 말하지 않아도 상대방의 감정을 읽어요. 그래서 다른 사람의 부정적 에너지에 영향받기 쉬워요. 자신과 타인의 감정 사이에 건강한 경계를 만드는 것이 중요해요. '그 사람의 문제는 내 문제가 아니야'라고 자신에게 말해주세요.",
    enDetail: "Your emotions are like the deep sea. The surface looks calm, but beneath are complex, deep emotional currents. Others don't know what you're thinking because you don't easily show your inner self. Alone time is essential—that's when you process emotions and recharge. Too much time with people drains you. You read others' emotions without words, making you susceptible to their negative energy. Creating healthy boundaries between your emotions and others' is crucial. Tell yourself 'Their problems are not my problems.'"
  },
};

// 관계 운명 패턴 (오행 기반)
export const RELATIONSHIP_STYLES: Record<string, NarrativeEntry> = {
  wood: {
    ko: "같이 성장하는 관계여야 해요. 정체된 관계는 숨이 막혀요.",
    en: "Relationships must grow together. Stagnant ones suffocate you.",
    koDetail: "당신에게 사랑은 '함께 성장하는 것'이에요. 어제보다 오늘 더 나은 우리가 되는 것. 상대방이 발전하지 않거나, 관계가 제자리인 것 같으면 답답해져요. '우리 이대로 괜찮은 거야?'라는 생각이 자꾸 들어요. 연애 초기에는 열정적으로 빠지지만, 관계가 익숙해지면서 권태기가 올 수 있어요. 그때 '새로운 것'을 함께 시작해보세요. 여행, 취미, 운동... 뭐든요. 함께 도전하고 성장하는 경험이 관계에 활력을 줘요. 주의할 점은, 상대방의 성장 속도가 당신과 다를 수 있다는 거예요. 조급하게 '왜 안 바뀌어?'라고 하면 상대방이 부담을 느껴요. 기다림도 사랑이에요.",
    enDetail: "For you, love is 'growing together.' Becoming better today than yesterday. When your partner isn't developing or the relationship seems stuck, you feel suffocated. 'Are we really okay like this?' keeps crossing your mind. You fall passionately early, but boredom can come as things get familiar. That's when you should start 'something new' together—travel, hobbies, exercise. Challenging and growing together revitalizes relationships. Be careful: your partner's growth pace may differ. Impatiently asking 'Why won't you change?' creates pressure. Patience is also love."
  },
  fire: {
    ko: "사랑할 때 온 마음을 쏟아요. 인정받고 싶고, 특별하게 대접받고 싶어요.",
    en: "You pour your whole heart into love. You want to feel special.",
    koDetail: "당신의 사랑은 한 편의 영화 같아요. 로맨틱하고, 열정적이고, 드라마틱해요. 사랑에 빠지면 온 세상에 알리고 싶고, 상대방에게 모든 것을 해주고 싶어요. 그만큼 상대방에게도 '특별한 대접'을 기대해요. 기념일을 잊어버리거나, 당신의 노력을 당연하게 여기면 상처받아요. '나 이렇게 열심히 하는데 왜 몰라줘?'라는 마음이 들어요. 자존심 싸움이 가장 큰 위험이에요. '내가 왜 먼저 사과해?'라는 생각이 들면 관계가 꼬여요. 열정이 식으면 관계도 급격히 식을 수 있어요. 일상의 작은 불꽃도 소중히 해주세요. 드라마틱한 순간만이 사랑이 아니에요.",
    enDetail: "Your love is like a movie—romantic, passionate, dramatic. When in love, you want to tell the world and do everything for your partner. You equally expect 'special treatment' in return. Forgotten anniversaries or your efforts being taken for granted hurt you. 'I'm trying so hard, why don't they see?' Pride fights are the biggest danger. 'Why should I apologize first?' thinking tangles relationships. When passion cools, relationships can cool rapidly. Cherish small daily sparks too. Dramatic moments aren't the only form of love."
  },
  earth: {
    ko: "한번 마음 주면 오래 가요. 대신 그만큼 배신에 약해요.",
    en: "Once you commit, you stay long. But betrayal hits you hard.",
    koDetail: "당신의 사랑은 대지와 같아요. 한번 마음을 주면 쉽게 변하지 않아요. 묵묵히 상대방을 지지하고, 행동으로 사랑을 보여줘요. '사랑해'라고 말하는 대신 맛있는 밥을 차려주거나, 필요한 것을 사다 줘요. 하지만 그만큼 배신에 약해요. 신뢰가 깨지면 회복이 정말 어려워요. '어떻게 그럴 수 있어?'라는 생각이 오래 가고, 용서해도 마음 한 구석에 상처가 남아요. 새로운 관계를 시작하는 것도 조심스러워요. '또 상처받으면 어쩌지?'라는 두려움이 있어요. 하지만 그 신중함 때문에, 당신과 함께하는 관계는 정말 깊고 오래가요. 믿음이 사랑의 전부라는 것을 당신은 알아요.",
    enDetail: "Your love is like the earth. Once you commit, you don't easily change. You silently support your partner, showing love through actions—cooking meals instead of saying 'I love you,' buying what's needed. But you're equally vulnerable to betrayal. When trust breaks, recovery is really hard. 'How could they?' lingers long; even when forgiven, a wound remains in your heart. Starting new relationships is cautious too—fear of 'What if I'm hurt again?' But that caution makes your relationships truly deep and lasting. You know trust is everything in love."
  },
  metal: {
    ko: "기준이 높아서 쉽게 마음을 안 열어요. 하지만 진심이 통하면 누구보다 깊이 빠져요.",
    en: "High standards make you slow to open up. Once sincere, you fall deep.",
    koDetail: "당신은 사랑에서도 기준이 높아요. 아무에게나 마음을 열지 않아요. 첫 만남에서 상대방의 옷차림, 말투, 매너 하나하나가 다 체크돼요. '저 사람 정말 괜찮은 걸까?'라는 의심이 쉽게 사라지지 않아요. 하지만 일단 마음을 주면, 정말 깊이 빠져요. 상대방을 위해 완벽한 서프라이즈를 준비하고, 기념일 하나 놓치지 않아요. 문제는 상대방에게도 그만큼을 기대하게 된다는 거예요. '나는 이렇게 했는데 왜 너는...'이라는 생각이 들면 실망해요. 완벽한 사람은 없다는 것을 기억하세요. 당신 포함해서요. 상대방의 불완전함을 사랑하는 것도 사랑이에요.",
    enDetail: "You have high standards in love too. You don't open up to just anyone. On first meeting, you check everything—clothes, speech, manners. 'Are they really good enough?' doesn't easily fade. But once you give your heart, you fall truly deep. You prepare perfect surprises, never missing anniversaries. The problem is expecting the same from your partner. 'I did this, so why don't you...' leads to disappointment. Remember no one is perfect—including you. Loving your partner's imperfections is also love."
  },
  water: {
    ko: "영혼의 연결을 원해요. 피상적인 관계는 공허해요.",
    en: "You want soul connections. Surface relationships feel empty.",
    koDetail: "당신은 사랑에서 '영혼의 연결'을 원해요. 말하지 않아도 통하는, 눈빛만 봐도 알 수 있는 그런 깊은 교감. 피상적인 만남, 가벼운 관계는 공허하게 느껴져요. 상대방의 표면적인 매력보다 내면의 깊이에 끌려요. '이 사람은 나를 진짜로 이해할 수 있을까?'가 가장 중요한 질문이에요. 문제는 그런 깊은 연결을 찾기가 쉽지 않다는 거예요. 많은 사람을 만나도 '이 사람 아니야'라는 느낌이 들어서 관계가 깊어지기 전에 끝나버려요. 때로는 완벽한 영혼의 연결을 기다리기보다, 현재의 관계에서 깊이를 만들어가는 것도 방법이에요. 깊이는 찾는 것이 아니라 함께 만드는 거예요.",
    enDetail: "You want 'soul connection' in love. Deep communion where you understand without words, knowing just by looking. Surface meetings and light relationships feel empty. You're drawn to inner depth over surface charm. 'Can this person truly understand me?' is your most important question. The problem is finding such deep connections isn't easy. Even meeting many people, 'This isn't the one' feeling ends relationships before they deepen. Sometimes rather than waiting for perfect soul connection, building depth in current relationships works. Depth isn't found—it's created together."
  },
};

// 커리어 운명 (오행 기반)
export const CAREER_DESTINIES: Record<string, NarrativeEntry> = {
  wood: {
    ko: "0에서 1을 만드는 일이 어울려요. 새로운 시작이 있는 곳에서 빛나요.",
    en: "You shine when creating something from nothing. New beginnings are yours.",
    koDetail: "당신은 개척자예요. 이미 있는 것을 유지하는 건 답답해요. 새로운 것을 시작하고, 없던 것을 만들어내고, 길이 없는 곳에 길을 만드는 것. 그게 당신의 일이에요. 스타트업, 신규 프로젝트, 해외 진출... 뭐든 '처음'이라는 단어가 붙으면 눈이 반짝여요. 반복적인 업무, 정해진 틀 안에서의 일은 에너지를 빼앗아가요. 성장의 기회가 보이지 않는 조직에서는 버티기 어려워요. 커리어 팁: 당신에게 필요한 건 '자유도'예요. 어느 정도 재량권이 있는 역할을 찾으세요. 그리고 인생에서 최소 한 번은 직접 무언가를 시작해보세요. 창업이든, 프로젝트든, 커뮤니티든. 그때 당신의 진가가 나타날 거예요.",
    enDetail: "You're a pioneer. Maintaining what exists is stifling. Starting new things, creating what didn't exist, making paths where there were none—that's your work. Startups, new projects, overseas expansion... your eyes sparkle at anything with 'first' attached. Repetitive work within fixed frameworks drains your energy. Organizations without visible growth opportunities are hard to endure. Career tip: You need 'freedom.' Find roles with some autonomy. And at least once in life, start something yourself—business, project, community. That's when your true worth appears."
  },
  fire: {
    ko: "무대가 필요해요. 사람들 앞에서 영향력을 발휘할 때 진가가 나와요.",
    en: "You need a stage. You shine when you're visible and impactful.",
    koDetail: "당신에게는 무대가 필요해요. 숨어서 일하면 에너지가 빠져요. 사람들 앞에서, 주목받으면서, 영향력을 발휘할 때 진가가 나타나요. 프레젠테이션, 강연, 방송, 영업... 이런 일에서 다른 사람보다 훨씬 빛나요. 뒤에서 묵묵히 지원하는 역할보다는 앞에 서서 이끄는 역할이 맞아요. 인정받지 못한다고 느끼면 의욕이 뚝 떨어져요. '내가 이렇게 열심히 하는데 왜 몰라주지?'라는 생각이 들면 번아웃 신호예요. 커리어 팁: 당신의 존재감을 드러낼 수 있는 위치를 찾으세요. 그리고 인정과 피드백을 자주 받을 수 있는 환경을 만드세요. 당신의 에너지는 '반응'을 먹고 자라요.",
    enDetail: "You need a stage. Working in the shadows drains you. In front of people, receiving attention, wielding influence—that's when your true worth appears. Presentations, lectures, broadcasting, sales... you shine far more than others in these roles. Leading from the front suits you better than silently supporting from behind. When you feel unrecognized, motivation drops immediately. 'I'm working so hard, why don't they see?' is a burnout signal. Career tip: Find positions where you can show your presence. Create environments where you receive frequent recognition and feedback. Your energy grows on 'reactions.'"
  },
  earth: {
    ko: "단단한 것을 쌓는 일이 어울려요. 묵직하게 가치를 만들 때 성공해요.",
    en: "Building something solid suits you. Success comes from steady value creation.",
    koDetail: "당신은 건축가예요. 빠르게 달리기보다 묵직하게 쌓아가는 것. 당장 결과가 안 보여도 꾸준히 가치를 만들어가는 것. 그게 당신의 방식이에요. 단기간에 성과를 내야 하는 환경보다, 시간을 두고 성장할 수 있는 환경이 맞아요. 부동산, 건축, 금융, 농업, 제조업... 뭔가를 '쌓는' 일이 어울려요. 조직에서도 안정적이고 신뢰받는 역할을 하게 돼요. 사람들은 당신에게 중요한 일을 맡겨요. 커리어 팁: 조급하게 비교하지 마세요. 토끼와 거북이 경주에서 당신은 거북이예요. 결국 이기는 건 당신이에요. 꾸준함이 당신의 가장 큰 무기라는 것을 기억하세요.",
    enDetail: "You're an architect. Steadily building rather than running fast. Creating value consistently even when results aren't immediately visible. That's your way. Environments requiring short-term results don't suit you—ones allowing time for growth do. Real estate, architecture, finance, agriculture, manufacturing... 'building' work suits you. In organizations, you take stable, trusted roles. People entrust important matters to you. Career tip: Don't compare impatiently. In the tortoise and hare race, you're the tortoise. You win in the end. Remember consistency is your greatest weapon."
  },
  metal: {
    ko: "전문가의 길이 어울려요. 끝까지 파고들어 정점을 찍을 때 빛나요.",
    en: "The expert path suits you. You shine when you reach the peak of mastery.",
    koDetail: "당신은 장인이에요. 대충은 못해요. 무엇을 하든 끝까지 파고들어야 해요. '이 정도면 됐지'라는 말은 당신의 사전에 없어요. 그래서 전문가의 길이 어울려요. 한 분야를 깊이 파서 정점을 찍을 때 진가가 나타나요. 의사, 변호사, 엔지니어, 디자이너, 연구원... 전문성이 인정받는 분야에서 빛나요. 여러 가지를 동시에 하는 것보다 하나에 집중하는 것이 맞아요. 커리어 팁: 당신의 완벽주의가 때로는 발목을 잡을 수 있어요. '완벽하지 않아도 일단 내보내기'를 연습하세요. 80%의 완성도로 빨리 피드백 받는 것이 100%를 기다리다 기회를 놓치는 것보다 나아요.",
    enDetail: "You're a craftsman. You can't do things halfway. Whatever you do, you must dig deep. 'Good enough' isn't in your vocabulary. That's why the expert path suits you. Digging deep in one field to reach the peak shows your true worth. Doctor, lawyer, engineer, designer, researcher... fields where expertise is recognized are where you shine. Focusing on one thing rather than multitasking suits you. Career tip: Your perfectionism can sometimes hold you back. Practice 'shipping even when imperfect.' Getting feedback quickly at 80% completion beats waiting for 100% and missing opportunities."
  },
  water: {
    ko: "깊이가 필요한 일이 어울려요. 남들이 못 보는 것을 보는 통찰력이 무기예요.",
    en: "Work requiring depth suits you. Your weapon is insight—seeing what others miss.",
    koDetail: "당신은 현자예요. 남들이 못 보는 것을 보고, 못 느끼는 것을 느껴요. 표면적인 일보다 깊이가 필요한 일이 어울려요. 연구, 분석, 전략, 상담, 심리, 철학... 생각하는 힘이 필요한 분야에서 빛나요. 팀에서 '왜?'라는 질문을 던지는 사람이 당신이에요. 남들이 당연하게 여기는 것에 질문을 던지고, 새로운 관점을 제시해요. 직관이 강해서 '느낌'으로 결정할 때 정확할 때가 많아요. 커리어 팁: 당신의 통찰력을 살릴 수 있는 역할을 찾으세요. 실행보다는 기획, 운영보다는 전략이 맞아요. 그리고 혼자 생각할 시간을 확보하세요. 그 시간이 당신의 가장 생산적인 시간이에요.",
    enDetail: "You're a sage. You see what others can't, feel what others miss. Work requiring depth suits you better than surface-level tasks. Research, analysis, strategy, counseling, psychology, philosophy... fields needing thinking power are where you shine. You're the one asking 'why?' in teams. You question what others take for granted and offer new perspectives. Strong intuition makes 'gut feeling' decisions often accurate. Career tip: Find roles that leverage your insight. Planning over execution, strategy over operations suits you. And secure alone thinking time. That's your most productive time."
  },
};

// 운명이 풀리는 선택 5가지를 생성하는 헬퍼
export function generateDestinyChoices(
  weakestElement: string,
  elementTraits: Record<string, { ko: string; en: string; emoji: string }>,
  isKo: boolean
): Array<{ emoji: string; title: string; ko: string; detail: string }> {
  const weakEl = weakestElement;

  const choices: { emoji: string; title: string; ko: string; detail: string }[] = [
    {
      emoji: "🎯",
      title: isKo ? "남들이 뭐라 하든 내 방식대로" : "My way, regardless",
      ko: `눈치 보느라 에너지 낭비하지 마세요. 결국 당신답게 살 때 길이 열려요.`,
      detail: isKo
        ? `사람들이 '이렇게 해야 돼', '그건 좀 이상한데'라고 말할 때마다 신경 쓰느라 정작 본인이 원하는 게 뭔지 모를 때가 많아요. 다른 사람 기준에 맞추려다가 에너지만 빠지고 아무것도 못 해요. 결정할 때 '남들이 뭐라 할까?'보다 '내가 진짜 원하는 게 뭐지?'를 먼저 물어보세요.`
        : `People often say 'you should do it this way' or 'that's weird', and caring about it prevents you from knowing what you really want. Trying to meet others' standards drains energy without achieving anything. When deciding, ask 'what do I really want?' before 'what will others say?'`
    },
    {
      emoji: "💬",
      title: isKo ? "감정이 복잡할 땐 일단 써보세요" : "Write when emotions tangle",
      ko: `머릿속에만 두면 더 꼬여요. 말이든 글이든 밖으로 꺼내야 정리돼요.`,
      detail: isKo
        ? `화나거나 답답할 때 혼자 생각만 하면 똑같은 생각이 계속 돌아요. 그럴 때 노트에 막 써보세요. 형식 없이 '진짜 화난다', '왜 이렇게 서러운지 모르겠다' 이렇게요. 쓰다 보면 '아, 내가 이것 때문에 힘들었구나'가 보여요. 믿는 사람한테 말하는 것도 좋아요. 그냥 들어주는 사람만 있어도 마음이 가벼워져요.`
        : `When angry or frustrated, thinking alone just loops the same thoughts. That's when you should write in a notebook—no format, just 'I'm really angry' or 'I don't know why I'm so hurt'. Writing reveals 'ah, this is what was bothering me'. Talking to someone you trust helps too. Just having someone listen lightens your heart.`
    },
    {
      emoji: "💕",
      title: isKo ? "사랑에서 이기려고 하지 마세요" : "Don't try to win in love",
      ko: `힘겨루기는 둘 다 지치게 해요. 규칙과 경계가 오히려 관계를 편하게 해요.`,
      detail: isKo
        ? `싸우면 '내가 맞다'는 걸 증명하려고 해요. 그런데 이기면 뭐해요? 상대방은 상처받고 관계만 나빠져요. 중요한 건 '누가 맞나'가 아니라 '우리 어떻게 할까'예요. 규칙 정하세요. '밤 11시 넘으면 싸우지 말자', '화났을 때 욕하지 말자'. 이런 작은 약속이 관계를 지켜요.`
        : `When fighting, you try to prove 'I'm right'. But what if you win? Your partner gets hurt and the relationship worsens. What matters isn't 'who's right' but 'what should we do'. Set rules—'no fighting past 11pm', 'no cursing when angry'. These small promises protect relationships.`
    },
    {
      emoji: "📈",
      title: isKo ? "커리어는 시스템이 답이에요" : "Systems are the answer",
      ko: `열심히만 하면 번아웃. 구조를 만들면 운도 따라와요.`,
      detail: isKo
        ? `매일 야근하고 주말에도 일하면 처음엔 잘 되는 것 같아요. 그런데 6개월 지나면 지쳐서 아무것도 못 해요. 시스템을 만드세요. '월요일 오전엔 기획, 오후엔 실행', '금요일은 정리의 날'. 루틴을 만들면 덜 피곤하고 더 많이 해요. 체크리스트, 템플릿, 자동화... 반복되는 건 구조로 만들어두세요.`
        : `Working late daily and on weekends seems productive at first. But 6 months later, you're exhausted and can't do anything. Build systems—'Monday mornings for planning, afternoons for execution', 'Friday is organization day'. Routines make you less tired and more productive. Checklists, templates, automation... structure what repeats.`
    },
    {
      emoji: elementTraits[weakEl]?.emoji || "🌊",
      title: isKo ? `${elementTraits[weakEl]?.ko} 기운 보충하세요` : `Add ${elementTraits[weakEl]?.en} energy`,
      ko: `이 에너지를 일상에 더하면 놀랍게 균형이 잡혀요.`,
      detail: isKo
        ? weakEl === "wood" ? `나무 기운 부족이에요. 새로운 시작, 성장, 활력이 필요해요. 아침에 스트레칭하거나, 식물 키우거나, 새로운 프로젝트 시작해보세요. 초록색 옷이나 소품도 도움 돼요.` :
          weakEl === "fire" ? `불 기운 부족이에요. 열정, 표현, 밝은 에너지가 필요해요. 사람들 만나서 수다 떨거나, 좋아하는 음악 크게 틀거나, 빨간색/주황색 아이템 쓰세요.` :
          weakEl === "earth" ? `흙 기운 부족이에요. 안정, 신뢰, 든든함이 필요해요. 규칙적인 식사, 충분한 수면, 정리 정돈이 도움 돼요. 노란색/갈색 소품을 주변에 두세요.` :
          weakEl === "metal" ? `쇠 기운 부족이에요. 결단, 정리, 분명함이 필요해요. 필요 없는 거 버리고, 할 일 목록 만들고, 운동으로 몸 단련하세요. 흰색/금색 아이템 좋아요.` :
          `물 기운 부족이에요. 유연함, 직관, 쉼이 필요해요. 물 많이 마시고, 목욕하고, 혼자만의 시간 가지세요. 검정색/파란색 소품 추천해요.`
        : weakEl === "wood" ? `Low on Wood energy. You need new beginnings, growth, vitality. Try morning stretches, growing plants, starting new projects. Green clothes/items help.` :
          weakEl === "fire" ? `Low on Fire energy. You need passion, expression, bright energy. Meet people and chat, play favorite music loud, use red/orange items.` :
          weakEl === "earth" ? `Low on Earth energy. You need stability, trust, solidity. Regular meals, sufficient sleep, organizing help. Keep yellow/brown items nearby.` :
          weakEl === "metal" ? `Low on Metal energy. You need decisiveness, clarity, definition. Throw away unnecessary things, make to-do lists, train your body with exercise. White/gold items work.` :
          `Low on Water energy. You need flexibility, intuition, rest. Drink lots of water, take baths, have alone time. Black/blue items recommended.`
    },
  ];

  return choices;
}
