// src/components/destiny-map/data/stem-descriptions.ts
// Extracted from DestinyMatrixStory.tsx for better maintainability

export interface StemDescriptionField {
  ko: string;
  en: string;
}

export interface StemDescription {
  ko: string;
  en: string;
  nature: StemDescriptionField;
  personality: StemDescriptionField;
  strength: StemDescriptionField;
  weakness: StemDescriptionField;
  loveStyle: StemDescriptionField;
  careerFit: StemDescriptionField;
  lifePattern: StemDescriptionField;
  secretSelf: StemDescriptionField;
  childhood: StemDescriptionField;
  shadowSelf: StemDescriptionField;
  crisis: StemDescriptionField;
  healing: StemDescriptionField;
  destinyCall: StemDescriptionField;
}

export const STEM_INFO: Record<string, StemDescription> = {
  "甲": {
    ko: "갑목", en: "Jia Wood",
    nature: { ko: "숲 속에서 가장 우뚝 솟은 큰 나무", en: "The tallest tree standing proud in the forest" },
    personality: {
      ko: "당신은 곧고 정직하며 리더십이 강한 사람이에요. 거짓말이나 비굴한 것은 체질적으로 맞지 않아요. 한번 맺은 인연은 쉽게 끊지 않고, 의리를 지키는 당신의 모습에 많은 사람들이 감동받습니다. 어떤 상황에서도 자신의 원칙을 굽히지 않는 당신은, 때로는 손해를 보더라도 떳떳하게 살아가는 것을 선택해요.",
      en: "You are upright, honest, and possess strong leadership qualities. Lies and subservience simply don't fit your nature. Once you form a bond, you don't easily break it, and your loyalty touches many people. Even in difficult situations, you choose to live with integrity rather than compromise your principles, even if it means taking a loss."
    },
    strength: { ko: "신뢰감, 리더십, 책임감, 정직함, 원칙주의", en: "Trustworthiness, leadership, responsibility, honesty, principled nature" },
    weakness: { ko: "고집이 세고 유연하지 못할 때가 있어요. '내 방식이 맞다'는 확신이 강해서 타인의 의견을 무시할 수 있어요.", en: "You can be stubborn and inflexible. Your strong conviction that 'my way is right' can lead you to dismiss others' opinions." },
    loveStyle: {
      ko: "연애에서 보호자 역할을 자처해요. 사랑하는 사람을 위해서라면 무엇이든 해주고 싶어하고, 그 사람의 울타리가 되어주려 합니다. 하지만 '내가 다 해줄게'라는 마음이 상대방에게 부담이 될 수도 있어요. 때로는 연인이 스스로 해결하도록 지켜봐주는 것도 사랑이에요.",
      en: "In love, you naturally take on the protector role. You want to do everything for your loved one and be their shield. However, your 'I'll take care of everything' attitude might burden your partner. Sometimes watching them solve things on their own is also an act of love."
    },
    careerFit: { ko: "교육, 법조계, 환경, 건축, 대기업 임원, CEO, 창업가", en: "Education, law, environment, architecture, corporate leadership, CEO, entrepreneur" },
    lifePattern: { ko: "젊은 시절에 고생하더라도 나이가 들수록 안정되고 풍요로워지는 타입. 40대 이후에 진정한 전성기. 인생 초반의 시련은 당신의 뿌리를 더욱 깊게 만들어요.", en: "Even if you struggle when young, you become more stable with age. True peak comes after 40s. Early life trials only deepen your roots." },
    secretSelf: { ko: "겉으로는 강하고 듬직해 보이지만, 실은 인정받고 싶은 마음이 커요. '내가 잘하고 있는 거 맞지?'라는 불안이 가끔 찾아와요.", en: "You appear strong outside, but deep down, you have a strong desire to be recognized. 'Am I doing this right?' - this anxiety visits you sometimes." },
    childhood: { ko: "어린 시절, 일찍 철이 든 편이에요. 가정에서 책임을 느끼거나, 어른스러워야 했던 기억이 있을 수 있어요. 그래서 지금도 '내가 해야 해'라는 생각이 자동으로 떠올라요.", en: "You matured early in childhood. You may have felt responsible at home or had to be grown-up. That's why 'I have to do this' automatically comes to mind even now." },
    shadowSelf: { ko: "당신의 그림자는 '통제'예요. 상황을 통제할 수 없을 때 불안해지고, 그 불안을 숨기기 위해 더 강하게 밀어붙여요. 하지만 모든 것을 통제할 수는 없어요.", en: "Your shadow is 'control.' You become anxious when you can't control situations, and push harder to hide that anxiety. But you can't control everything." },
    crisis: { ko: "위기 상황에서 더욱 강해지는 타입이에요. 하지만 주의하세요 - 혼자 모든 것을 감당하려 하지 말고, 도움을 요청하는 것도 용기예요.", en: "You become stronger in crisis. But be careful - don't try to bear everything alone. Asking for help is also courage." },
    healing: { ko: "자연 속에서 시간을 보내세요. 숲길 산책, 정원 가꾸기가 당신의 에너지를 회복시켜요. 그리고 때로는 '괜찮아, 내가 완벽하지 않아도 돼'라고 스스로에게 말해주세요.", en: "Spend time in nature. Forest walks and gardening restore your energy. And sometimes tell yourself, 'It's okay, I don't have to be perfect.'" },
    destinyCall: { ko: "당신은 새로운 것을 시작하고, 길을 개척하고, 다른 사람들에게 방향을 제시하기 위해 태어났어요. 두려움 없이 앞으로 나아가세요.", en: "You were born to start new things, pioneer paths, and show direction to others. Move forward without fear." }
  },
  "乙": {
    ko: "을목", en: "Yi Wood",
    nature: { ko: "어디든 뻗어나가는 유연한 덩굴", en: "A flexible vine that extends anywhere" },
    personality: {
      ko: "당신은 유연하고 적응력이 뛰어난 사람이에요. 새로운 환경, 낯선 사람들 앞에서도 놀라울 정도로 빠르게 적응해요. 작고 연약해 보이지만, 그 안에는 강인한 생존 본능이 숨어 있습니다. 물이 바위를 뚫듯이, 당신은 부드러움으로 어떤 장애물도 우회해 나가요.",
      en: "You are flexible and highly adaptable. You adjust to new environments and strangers surprisingly fast. Though you appear small and delicate, inside lies a strong survival instinct. Like water wearing through rock, you use softness to navigate around any obstacle."
    },
    strength: { ko: "적응력, 유연함, 사교성, 생존력, 외교술", en: "Adaptability, flexibility, sociability, survival skills, diplomacy" },
    weakness: { ko: "우유부단해 보일 수 있고, 결정을 내리는 데 시간이 걸려요. 너무 맞추다 보면 자신을 잃어버릴 수 있어요.", en: "You may seem indecisive and take time to make decisions. Too much adapting can make you lose yourself." },
    loveStyle: { ko: "상대방에게 맞추는 것을 잘해요. 연인은 당신과 함께 있으면 편안함을 느껴요. 하지만 때로는 당신이 진짜로 원하는 것을 말해주세요. 상대방도 당신의 진심을 알고 싶어해요.", en: "You're great at adapting to your partner. Your loved ones feel comfortable around you. But sometimes, tell them what you really want. They want to know your true feelings too." },
    careerFit: { ko: "예술, 디자인, 상담, 마케팅, 외교, PR, 코칭", en: "Art, design, counseling, marketing, diplomacy, PR, coaching" },
    lifePattern: { ko: "직선이 아닌 곡선의 경로를 따라요. 결국에는 원하는 곳에 도달합니다. 남들이 '돌아가는 것 같다'고 해도, 그게 당신의 길이에요.", en: "You follow a curved path, not straight. Eventually, you reach where you want to be. Even if others say 'you're taking a detour,' that's your path." },
    secretSelf: { ko: "부드러운 외모 뒤에는 강한 야망과 생존 본능이 숨어 있어요. '나는 연약하지 않아'라고 속으로 외치는 순간이 있어요.", en: "Behind your soft exterior hides strong ambition and survival instinct. There are moments when you silently shout 'I'm not weak.'" },
    childhood: { ko: "어린 시절, 분위기를 읽고 맞추는 법을 일찍 배웠을 거예요. 어른들 사이에서 눈치를 보거나, 갈등을 피하는 역할을 했을 수 있어요.", en: "In childhood, you learned early to read the room and adapt. You may have watched adults carefully or played the role of avoiding conflicts." },
    shadowSelf: { ko: "당신의 그림자는 '의존'이에요. 너무 맞추다 보면 '나는 누구지?'라는 정체성 혼란이 올 수 있어요. 자신의 중심을 잡는 것이 중요해요.", en: "Your shadow is 'dependence.' Too much adapting can lead to identity confusion - 'who am I?' Finding your own center is important." },
    crisis: { ko: "위기 상황에서 당신은 놀라운 생존력을 발휘해요. 어떤 상황에서도 살아남는 법을 찾아내요. 하지만 가끔은 도망치지 말고 정면으로 맞서는 것도 필요해요.", en: "In crisis, you show amazing survival skills. You find a way to survive any situation. But sometimes you need to face things head-on instead of evading." },
    healing: { ko: "춤, 요가, 유연성을 필요로 하는 활동이 당신에게 맞아요. 자신만의 공간에서 혼자 있는 시간도 중요해요. 거기서 '진짜 나'를 찾을 수 있어요.", en: "Dance, yoga, activities requiring flexibility suit you. Time alone in your own space is also important. That's where you can find your 'true self.'" },
    destinyCall: { ko: "당신은 연결하고, 중재하고, 다리가 되기 위해 태어났어요. 대립하는 것들 사이에서 조화를 만들어내는 것이 당신의 사명이에요.", en: "You were born to connect, mediate, and be a bridge. Creating harmony between opposing things is your mission." }
  },
  "丙": {
    ko: "병화", en: "Bing Fire",
    nature: { ko: "세상을 비추는 찬란한 태양", en: "The brilliant sun illuminating the world" },
    personality: {
      ko: "당신은 어디를 가든 분위기를 밝게 만들고 사람들에게 에너지를 전달해요. 열정적이고 카리스마 있어서 사람들은 무의식적으로 당신에게 끌립니다. 당신이 들어오면 방 전체가 밝아지고, 당신이 나가면 뭔가 허전해져요.",
      en: "Wherever you go, you brighten the atmosphere and transmit energy to people. Passionate and charismatic, people are unconsciously drawn to you. When you enter a room, it lights up; when you leave, something feels missing."
    },
    strength: { ko: "열정, 카리스마, 낙관성, 리더십, 표현력", en: "Passion, charisma, optimism, leadership, expressiveness" },
    weakness: { ko: "너무 빠르게 타오르다 지칠 수 있어요. 성급할 수 있고, 관심받지 못하면 의기소침해질 수 있어요.", en: "You may burn out quickly. You can be impatient, and may feel down when not getting attention." },
    loveStyle: { ko: "사랑에 빠지면 온 세상에 알리고 싶어해요. 당신의 연애는 한 편의 영화 같아요. 하지만 열정이 식으면 관계도 식을 수 있으니, 일상의 작은 불꽃도 소중히 해주세요.", en: "When in love, you want to tell the whole world. Your romance is like a movie. But when passion cools, relationships can cool too - cherish even small daily sparks." },
    careerFit: { ko: "엔터테인먼트, 정치, 경영, 강연, 미디어, 유튜버, 인플루언서", en: "Entertainment, politics, management, speaking, media, YouTuber, influencer" },
    lifePattern: { ko: "젊은 시절에 화려하게 빛나다가 중년 이후 더 깊고 지속적인 빛을 발하게 됩니다. 30대에 정체기가 올 수 있지만, 그것은 더 큰 빛을 위한 재충전이에요.", en: "You shine brilliantly when young, then develop deeper, lasting light after middle age. A plateau may come in your 30s, but that's recharging for greater light." },
    secretSelf: { ko: "밝고 자신감 넘쳐 보이지만, 실은 외로움을 느끼는 순간이 있어요. '나는 사람들에게 에너지를 주지만, 나에게 에너지를 주는 사람은 누구지?'라는 생각이 들 때가 있어요.", en: "You seem bright and confident, but sometimes feel lonely inside. 'I give energy to others, but who gives energy to me?' - this thought crosses your mind." },
    childhood: { ko: "어린 시절, 주목받는 것을 좋아했거나 반대로 충분히 주목받지 못해 갈증을 느꼈을 수 있어요. 둘 중 하나예요. 그래서 지금도 무대 위에 서고 싶은 욕구가 있어요.", en: "In childhood, you either loved attention or felt thirsty for not getting enough. It's one or the other. That's why you still desire to be on stage." },
    shadowSelf: { ko: "당신의 그림자는 '허영'이에요. 진짜 나와 보여주고 싶은 내가 다를 때 괴로워요. 있는 그대로의 당신도 충분히 빛나요.", en: "Your shadow is 'vanity.' You suffer when your real self differs from who you want to show. You shine enough just as you are." },
    crisis: { ko: "위기 상황에서 당신의 밝음이 무너지면 급격히 어두워질 수 있어요. 하지만 태양은 구름 뒤에서도 여전히 빛나고 있다는 것을 기억하세요.", en: "In crisis, if your brightness crumbles, you can become very dark quickly. But remember, the sun still shines behind clouds." },
    healing: { ko: "춤, 연극, 노래 등 자신을 표현하는 활동이 당신을 치유해요. 그리고 때로는 조용히 혼자 있으면서 '보여주지 않아도 괜찮아'라고 말해보세요.", en: "Dance, theater, singing - activities expressing yourself heal you. And sometimes, be quietly alone and say 'It's okay not to show off.'" },
    destinyCall: { ko: "당신은 세상을 밝히고, 사람들에게 희망과 에너지를 주기 위해 태어났어요. 당신의 빛은 어둠 속에서 더욱 빛나요.", en: "You were born to illuminate the world and give people hope and energy. Your light shines brighter in darkness." }
  },
  "丁": {
    ko: "정화", en: "Ding Fire",
    nature: { ko: "어둠 속에서 은은하게 빛나는 촛불", en: "A candle glowing softly in the darkness" },
    personality: {
      ko: "당신은 조용히 그러나 분명하게 주변에 온기를 전해요. 섬세하고 배려심이 깊어서 다른 사람들이 놓치는 작은 것들을 알아채요. 당신의 따뜻함은 가까이 다가가야 느낄 수 있어요 - 그래서 더 소중해요.",
      en: "You quietly but surely spread warmth to those around you. Delicate and considerate, you notice small things others miss. Your warmth can only be felt up close - that's what makes it precious."
    },
    strength: { ko: "섬세함, 배려심, 집중력, 따뜻함, 직관력", en: "Delicacy, consideration, focus, warmth, intuition" },
    weakness: { ko: "완벽주의 성향으로 자신을 힘들게 할 수 있어요. 작은 것에 너무 집착하면 큰 그림을 놓칠 수 있어요.", en: "Your perfectionism can be hard on yourself. Obsessing over small things can make you miss the big picture." },
    loveStyle: { ko: "정말 로맨틱하고 헌신적이에요. 상대방이 무심코 했던 말도 기억해서 서프라이즈를 준비해요. 하지만 상대방이 당신만큼 섬세하지 않을 수 있다는 것도 이해해주세요.", en: "Truly romantic and devoted. You remember casual remarks and prepare surprises. But understand that your partner may not be as delicate as you." },
    careerFit: { ko: "연구, 글쓰기, 상담, 의료, 예술, 심리학, 타로, 점성술", en: "Research, writing, counseling, healthcare, art, psychology, tarot, astrology" },
    lifePattern: { ko: "꾸준하고 안정적인 성장을 하는 타입. 차근차근 쌓아가며 높은 곳에 도달해요. 밤하늘의 별처럼, 어둠이 짙어질수록 당신의 빛이 더 잘 보여요.", en: "You grow steadily and stably. You build step by step and reach high places. Like stars in the night sky, your light shows better as darkness deepens." },
    secretSelf: { ko: "차분해 보이지만 내면에는 뜨거운 열정이 숨어 있어요. '이렇게 보이지만 나도 불꽃이야'라고 말하고 싶을 때가 있어요.", en: "You seem calm, but inside burns a hot passion. Sometimes you want to say 'I may look like this, but I'm a flame too.'" },
    childhood: { ko: "어린 시절, 조용하고 내성적이었을 가능성이 높아요. 혼자만의 세계가 있었고, 책이나 상상 속에서 시간을 보냈을 수 있어요.", en: "In childhood, you were likely quiet and introverted. You had your own world, possibly spending time in books or imagination." },
    shadowSelf: { ko: "당신의 그림자는 '자기희생'이에요. 다른 사람을 비추느라 자신이 타버리면 안 돼요. 가끔은 자신을 위한 불꽃도 피워주세요.", en: "Your shadow is 'self-sacrifice.' Don't burn yourself out illuminating others. Sometimes light a flame for yourself too." },
    crisis: { ko: "위기 상황에서 당신은 오히려 빛을 발해요. 촛불이 바람에 흔들려도 꺼지지 않듯이, 당신도 시련 속에서 더 강해져요.", en: "In crisis, you actually shine. Like a candle flickering but not going out in wind, you become stronger through trials." },
    healing: { ko: "명상, 일기 쓰기, 촛불 앞에서의 조용한 시간이 당신을 회복시켜요. 그리고 '완벽하지 않아도 충분해'라고 스스로에게 말해주세요.", en: "Meditation, journaling, quiet time by candlelight restore you. And tell yourself, 'Not being perfect is enough.'" },
    destinyCall: { ko: "당신은 가까이 있는 사람들에게 진정한 온기를 전하기 위해 태어났어요. 세상을 다 밝힐 필요 없어요 - 당신 옆에 있는 한 사람을 밝히면 돼요.", en: "You were born to bring true warmth to those close to you. You don't need to light the whole world - just light up the one person beside you." }
  },
  "戊": {
    ko: "무토", en: "Wu Earth",
    nature: { ko: "바람에도 흔들리지 않는 웅장한 산", en: "A majestic mountain unmoved by wind" },
    personality: {
      ko: "당신은 묵직하고 듬직한 존재감을 가지고 있어요. 한번 마음먹으면 쉽게 변하지 않는 굳건함이 있습니다. 당신이 '내가 할게'라고 말하면, 사람들은 안심해요. 산이 그 자리에 있듯이, 당신의 존재 자체가 주변 사람들에게 안정감을 줘요.",
      en: "You have a solid, dependable presence. Once you set your mind, you have unwavering determination. When you say 'I'll handle it,' people feel relieved. Like a mountain standing in its place, your very presence gives stability to those around you."
    },
    strength: { ko: "신뢰성, 인내력, 책임감, 안정감, 포용력", en: "Reliability, patience, responsibility, stability, embracing nature" },
    weakness: { ko: "변화가 필요한 상황에서도 기존 방식을 고수할 수 있어요. '내가 옳다'는 확신이 강해서 새로운 방식을 배척할 수 있어요.", en: "You may stick to old ways even when change is needed. Your conviction of 'I'm right' can make you reject new approaches." },
    loveStyle: { ko: "신중하게 시작하고, 한번 마음을 주면 변하지 않아요. 행동으로 사랑을 보여주는 편이에요. '사랑해'라고 말하는 대신 맛있는 밥을 차려주거나, 필요한 것을 사다 줘요.", en: "You start cautiously, and once committed, you don't change. You show love through actions - instead of saying 'I love you,' you make delicious meals or buy what's needed." },
    careerFit: { ko: "부동산, 건축, 금융, 농업, 제조업, 중재자, 상담가", en: "Real estate, architecture, finance, agriculture, manufacturing, mediator, counselor" },
    lifePattern: { ko: "인생 초반에는 느려 보여도, 시간이 갈수록 진가를 발휘해요. 토끼와 거북이의 경주에서 당신은 거북이예요 - 결국 이겨요.", en: "You may seem slow early in life, but you show your true worth over time. In the race between rabbit and tortoise, you're the tortoise - you win in the end." },
    secretSelf: { ko: "겉으로는 무심해 보이지만, 가족과 가까운 사람들에 대한 깊은 애정이 있어요. '내가 표현을 못해서 그렇지, 사랑하는 거 알지?'라고 마음속으로 말해요.", en: "You seem indifferent outside, but have deep affection for family and close ones. In your heart you say 'I know I don't express it well, but you know I love you, right?'" },
    childhood: { ko: "어린 시절, 조용하고 믿음직한 아이였을 가능성이 높아요. 일찍부터 책임감을 가지고, 형제자매를 돌보거나 가정의 기둥 역할을 했을 수 있어요.", en: "In childhood, you were likely quiet and dependable. You took on responsibility early, possibly caring for siblings or being the family pillar." },
    shadowSelf: { ko: "당신의 그림자는 '무감각'이에요. 너무 강해지려다 보면 자신의 감정을 느끼지 못하게 돼요. 산도 가끔은 흔들려도 괜찮아요.", en: "Your shadow is 'numbness.' Trying too hard to be strong, you stop feeling your own emotions. It's okay for even mountains to shake sometimes." },
    crisis: { ko: "위기 상황에서 당신은 더욱 견고해져요. 하지만 주의하세요 - 혼자 모든 것을 짊어지려 하지 마세요. 산도 지진에는 흔들려요.", en: "In crisis, you become even more solid. But be careful - don't try to carry everything alone. Even mountains shake in earthquakes." },
    healing: { ko: "흙을 만지는 활동 - 정원 가꾸기, 도자기 - 가 당신을 치유해요. 그리고 가끔은 '약해도 괜찮아'라고 자신에게 허락해주세요.", en: "Activities touching earth - gardening, pottery - heal you. And sometimes permit yourself to 'be weak.'" },
    destinyCall: { ko: "당신은 다른 사람들의 닻이 되기 위해 태어났어요. 흔들리는 세상에서 변하지 않는 존재 - 그것이 당신의 가치예요.", en: "You were born to be an anchor for others. An unchanging presence in a shaky world - that's your value." }
  },
  "己": {
    ko: "기토", en: "Ji Earth",
    nature: { ko: "모든 것을 품고 자라게 하는 정원의 흙", en: "Garden soil that nurtures everything to grow" },
    personality: {
      ko: "당신은 겉으로는 평범해 보이지만, 모든 것을 품고 자라게 하는 놀라운 생명력이 있어요. 누구나 당신에게 쉽게 다가올 수 있어요. 당신 옆에 있으면 왠지 마음이 편해지고, 자신의 이야기를 하고 싶어져요.",
      en: "You may seem ordinary outside, but you have amazing life force that nurtures everything. Anyone can easily approach you. Being near you makes people feel at ease and want to share their stories."
    },
    strength: { ko: "포용력, 배려심, 중재력, 인내심, 공감능력", en: "Embracing nature, consideration, mediation, patience, empathy" },
    weakness: { ko: "남들을 챙기느라 자신의 욕구는 뒷전으로 미루는 경향이 있어요. '나는 괜찮아'라고 말하면서 실은 괜찮지 않을 때가 많아요.", en: "You tend to put others first and neglect your own needs. You often say 'I'm fine' when you're actually not." },
    loveStyle: { ko: "정말 헌신적이에요. 연인을 위해 무엇이든 해주고 싶어하고, 상대방의 필요를 먼저 생각해요. 하지만 때로는 '나도 받고 싶어'라고 말해도 돼요.", en: "Truly devoted. You want to do anything for your partner and think of their needs first. But sometimes it's okay to say 'I want to receive too.'" },
    careerFit: { ko: "교육, 복지, 상담, 서비스업, 요식업, 심리치료사, 코치", en: "Education, welfare, counseling, service industry, food business, therapist, coach" },
    lifePattern: { ko: "조용하지만 꾸준한 성장을 해요. 주변 사람들과 함께 풍요로워지는 삶. 당신이 키운 사람들이 언젠가 당신에게 보답해요.", en: "Quiet but steady growth. A life of prosperity shared with those around you. People you've nurtured will repay you someday." },
    secretSelf: { ko: "온화해 보이지만, 사랑하는 사람을 보호해야 할 때는 예상치 못한 강인함이 나와요. '내가 이렇게 강할 줄 몰랐어'라고 스스로도 놀라요.", en: "You seem gentle, but unexpected strength emerges when protecting loved ones. You surprise even yourself thinking 'I didn't know I could be this strong.'" },
    childhood: { ko: "어린 시절, 돌봄을 주거나 받는 역할을 했을 거예요. 동생을 돌보거나, 친구들의 고민 상담 역할을 했을 수 있어요.", en: "In childhood, you played a caregiving role or needed care. You may have looked after siblings or been the friend everyone confided in." },
    shadowSelf: { ko: "당신의 그림자는 '순교자'예요. 모든 것을 희생하면서 속으로는 '아무도 나를 알아주지 않아'라고 억울해할 수 있어요. 자신을 위한 시간도 가지세요.", en: "Your shadow is 'martyr.' While sacrificing everything, you may secretly resent that 'no one appreciates me.' Take time for yourself too." },
    crisis: { ko: "위기 상황에서 당신은 다른 사람들을 먼저 챙겨요. 하지만 기억하세요 - 비행기에서 산소마스크는 먼저 자신에게 씌우라고 해요.", en: "In crisis, you take care of others first. But remember - on airplanes, they tell you to put your own oxygen mask on first." },
    healing: { ko: "요리, 정원 가꾸기, 반려동물 돌보기가 당신을 치유해요. 그리고 '나도 받아도 괜찮아'라고 자신에게 허락해주세요.", en: "Cooking, gardening, caring for pets heal you. And permit yourself to 'receive too.'" },
    destinyCall: { ko: "당신은 다른 사람들이 성장하도록 돕기 위해 태어났어요. 정원사처럼, 당신이 뿌린 씨앗은 언젠가 꽃이 되어 세상을 아름답게 해요.", en: "You were born to help others grow. Like a gardener, seeds you plant will someday bloom and beautify the world." }
  },
  "庚": {
    ko: "경금", en: "Geng Metal",
    nature: { ko: "불의를 베는 날카로운 검", en: "A sharp sword that cuts through injustice" },
    personality: {
      ko: "당신은 옳고 그름을 명확히 하고 불의를 참지 못해요. 카리스마 있고 결단력 있으며, 한번 결심하면 끝까지 밀어붙이는 추진력이 있습니다. 당신의 눈빛 하나로 주변이 조용해질 때가 있어요.",
      en: "You distinguish right from wrong clearly and can't tolerate injustice. Charismatic and decisive, you have the drive to push through once you decide. Sometimes a single look from you silences the room."
    },
    strength: { ko: "결단력, 정의감, 추진력, 용기, 솔직함", en: "Decisiveness, sense of justice, drive, courage, directness" },
    weakness: { ko: "너무 직설적이라 상대방 기분을 상하게 할 수 있어요. '왜 솔직한 게 문제야?'라고 생각하지만, 진실도 포장이 필요할 때가 있어요.", en: "You can be too direct and hurt others' feelings. You think 'Why is being honest a problem?' but truth sometimes needs packaging." },
    loveStyle: { ko: "마음에 드는 사람이 있으면 적극적으로 다가가고, 사랑한다면 거침없이 표현해요. 하지만 '나만 좋으면 되지'가 아니라, 상대방의 템포도 맞춰주세요.", en: "When you like someone, you approach actively. When in love, you express without hesitation. But don't just think 'as long as I'm happy' - match your partner's tempo too." },
    careerFit: { ko: "군인, 경찰, 검찰, 외과의사, 운동선수, 변호사, 언론인", en: "Military, police, prosecution, surgeon, athlete, lawyer, journalist" },
    lifePattern: { ko: "젊을 때 고생이 많지만, 그 시련이 당신을 더 강하게 만들어요. 검이 불에 달궈져야 날카로워지듯, 당신도 시련을 통해 빛나요.", en: "Many hardships when young, but those trials make you stronger. Like a sword sharpened in fire, you shine through trials." },
    secretSelf: { ko: "강해 보이는 외면과 달리 내면은 의외로 여리고 섬세해요. 혼자 있을 때 눈물이 날 때가 있어요. 하지만 그걸 아무에게도 보여주지 않아요.", en: "Despite your strong exterior, your inside is surprisingly delicate and sensitive. Sometimes tears come when alone. But you never show anyone." },
    childhood: { ko: "어린 시절, 불공정한 상황에 분노한 기억이 있을 거예요. 왜 세상이 이렇게 불공평한지, 왜 정의가 실현되지 않는지 화가 났어요.", en: "In childhood, you remember being angered by unfair situations. You were frustrated by why the world is so unfair, why justice isn't served." },
    shadowSelf: { ko: "당신의 그림자는 '공격성'이에요. 정의를 위해서라는 명목 하에 다른 사람을 상처입힐 수 있어요. 검은 베기 위한 것이 아니라 지키기 위한 것이에요.", en: "Your shadow is 'aggression.' Under the guise of justice, you can hurt others. A sword is for protecting, not just cutting." },
    crisis: { ko: "위기 상황에서 당신은 칼처럼 날카로워져요. 문제를 빠르게 베어버리죠. 하지만 때로는 '싸우지 않는 것'이 진짜 용기일 때도 있어요.", en: "In crisis, you become sharp like a blade. You cut through problems quickly. But sometimes 'not fighting' is the real courage." },
    healing: { ko: "운동, 특히 무술이나 격투기가 당신의 에너지를 건강하게 발산시켜요. 그리고 '약한 모습을 보여도 괜찮아'라고 자신에게 말해주세요.", en: "Exercise, especially martial arts or combat sports, helps you release energy healthily. And tell yourself 'It's okay to show weakness.'" },
    destinyCall: { ko: "당신은 불의와 싸우고, 약한 사람들을 보호하기 위해 태어났어요. 하지만 진짜 전사는 언제 싸워야 하고 언제 물러나야 하는지 아는 사람이에요.", en: "You were born to fight injustice and protect the weak. But a true warrior knows when to fight and when to step back." }
  },
  "辛": {
    ko: "신금", en: "Xin Metal",
    nature: { ko: "빛나는 다이아몬드, 정교한 보석", en: "A shining diamond, an exquisite gem" },
    personality: {
      ko: "당신은 세련되고 빛나는 존재감을 가지고 있어요. 미적 감각이 뛰어나고, 디테일에 강하며, 무엇이든 아름답게 만드는 능력이 있어요. 당신이 만지면 평범한 것도 특별해져요.",
      en: "You have a refined, radiant presence. You have excellent aesthetic sense, strong attention to detail, and the ability to beautify anything. Ordinary things become special in your hands."
    },
    strength: { ko: "섬세함, 미적 감각, 완벽주의, 품격, 안목", en: "Delicacy, aesthetic sense, perfectionism, elegance, discernment" },
    weakness: { ko: "자신에게도, 다른 사람에게도 높은 기준을 적용해 쉽게 만족하지 못해요. '왜 이것밖에 안 되지?'라는 생각이 자주 들어요.", en: "You apply high standards to yourself and others, making satisfaction difficult. You often think 'Why is this all there is?'" },
    loveStyle: { ko: "이상이 높아요. 완벽한 상대, 완벽한 관계를 꿈꾸기 때문에 쉽게 만족하지 못할 수 있어요.", en: "You have high ideals. Dreaming of perfect partner and relationship, you may not be easily satisfied." },
    careerFit: { ko: "패션, 뷰티, 보석, 금융, 예술, IT, 디자인, 에디터", en: "Fashion, beauty, jewelry, finance, art, IT, design, editor" },
    lifePattern: { ko: "보석이 세공되면 빛나듯이 당신도 시련을 통해 더욱 빛나요. 압력을 받을수록 다이아몬드가 되어요.", en: "Like a gem that shines when polished, you shine brighter through trials. The more pressure, the more diamond you become." },
    secretSelf: { ko: "화려해 보이지만, 내면에는 불안과 자기 의심이 있을 수 있어요. '나 충분히 빛나고 있는 걸까?'라는 질문이 머릿속을 맴돌아요.", en: "You seem glamorous, but inside may lie anxiety and self-doubt. 'Am I shining enough?' - this question circles in your mind." },
    childhood: { ko: "어린 시절, 예쁜 것, 아름다운 것에 끌렸어요. 다른 아이들과는 다른 감각이 있었어요.", en: "In childhood, you were drawn to pretty, beautiful things. You had a sense different from other kids." },
    shadowSelf: { ko: "당신의 그림자는 '비판'이에요. 자신과 다른 사람을 끊임없이 판단하고 평가해요.", en: "Your shadow is 'criticism.' You constantly judge yourself and others." },
    crisis: { ko: "위기 상황에서 당신은 더 날카로워지고, 비판적이 될 수 있어요. 하지만 진짜 다이아몬드는 스크래치가 나지 않아요.", en: "In crisis, you can become sharper and more critical. But remember - real diamonds don't scratch." },
    healing: { ko: "아름다운 것을 보고, 만지고, 경험하는 것이 당신을 치유해요. 그리고 '불완전해도 아름다워'라고 자신에게 말해주세요.", en: "Seeing, touching, experiencing beautiful things heals you. And tell yourself 'Imperfect is beautiful too.'" },
    destinyCall: { ko: "당신은 세상에 아름다움을 가져오기 위해 태어났어요. 평범한 것을 특별하게 만드는 것이 당신의 사명이에요.", en: "You were born to bring beauty to the world. Making ordinary special is your mission." }
  },
  "壬": {
    ko: "임수", en: "Ren Water",
    nature: { ko: "끝없이 깊고 넓은 바다", en: "The endlessly deep and vast ocean" },
    personality: {
      ko: "당신은 측량할 수 없는 내면의 깊이를 가지고 있어요. 직관력이 뛰어나고, 상황을 꿰뚫어보는 통찰력이 있어요. 바다가 모든 강물을 받아들이듯, 다양한 사람들과 생각들을 품을 수 있어요.",
      en: "You have immeasurable inner depth. You have excellent intuition and insight to see through situations. Like the ocean accepting all rivers, you can embrace diverse people and ideas."
    },
    strength: { ko: "지혜, 포용력, 통찰력, 적응력, 철학적 사고", en: "Wisdom, embracing nature, insight, adaptability, philosophical thinking" },
    weakness: { ko: "감정의 파도가 거세게 일 때, 다스리기가 쉽지 않아요. 때로는 그 깊이가 우울로 변할 수 있어요.", en: "When emotional waves surge, they're not easy to control. Sometimes that depth can turn into melancholy." },
    loveStyle: { ko: "깊이 있는 관계를 원해요. 영혼이 통하는, 진정으로 이해받는 느낌을 주는 관계를 찾습니다.", en: "You want deep relationships. You seek connections where souls communicate and you feel truly understood." },
    careerFit: { ko: "철학, 심리학, 연구, 예술, 물류/무역, 여행, 작가, 치료사", en: "Philosophy, psychology, research, art, logistics/trade, travel, writer, therapist" },
    lifePattern: { ko: "물처럼 여러 방향으로 흐르다가 결국 큰 바다에 이르러요. 남들이 정한 길을 따르지 않고, 당신만의 흐름을 찾아요.", en: "Like water flowing in many directions, you eventually reach the great ocean. You don't follow paths set by others, but find your own flow." },
    secretSelf: { ko: "잔잔해 보이지만 내면에는 거대한 파도 같은 감정이 있어요. 가끔 그 감정에 빠져들어 헤어나오기 힘들 때가 있어요.", en: "You seem calm, but inside are emotions like giant waves. Sometimes you sink into those emotions and struggle to surface." },
    childhood: { ko: "어린 시절, 다른 아이들보다 생각이 많았을 거예요. '왜?'라는 질문을 많이 했고, 세상의 진실에 관심이 있었어요.", en: "In childhood, you probably thought more than other kids. You asked 'why?' a lot and were interested in the truth of the world." },
    shadowSelf: { ko: "당신의 그림자는 '표류'예요. 너무 많은 가능성에 빠져 아무것도 결정하지 못할 때가 있어요.", en: "Your shadow is 'drifting.' Sometimes you get lost in too many possibilities and can't decide anything." },
    crisis: { ko: "위기 상황에서 당신은 물처럼 우회해요. 직접 부딪히기보다 돌아가는 방법을 찾죠. 하지만 때로는 폭포처럼 직선으로 떨어지는 것도 필요해요.", en: "In crisis, you flow around like water. You find ways around rather than confronting directly. But sometimes you need to drop straight like a waterfall." },
    healing: { ko: "물가에서 시간을 보내세요. 바다, 호수, 강. 물 소리가 당신을 치유해요.", en: "Spend time near water. Ocean, lake, river. The sound of water heals you." },
    destinyCall: { ko: "당신은 세상의 깊은 진실을 탐구하고, 다른 사람들에게 지혜를 전하기 위해 태어났어요.", en: "You were born to explore deep truths and share wisdom with others." }
  },
  "癸": {
    ko: "계수", en: "Gui Water",
    nature: { ko: "산에서 시작된 맑은 시냇물", en: "A clear stream flowing from the mountain" },
    personality: {
      ko: "당신은 순수하고 깨끗한 에너지를 가졌어요. 직관력이 예민해서 남들이 놓치는 것을 감지해요. 논리로 설명되지 않지만 정확한 직감이 있어요.",
      en: "You have pure, clean energy. Your intuition is sharp, sensing what others miss. You have accurate instincts that logic can't explain."
    },
    strength: { ko: "직관력, 감수성, 창의력, 영성, 예술적 감각", en: "Intuition, sensitivity, creativity, spirituality, artistic sense" },
    weakness: { ko: "너무 많은 것을 느끼고 흡수하다 보니 쉽게 지쳐요. 다른 사람의 에너지에 영향을 많이 받아요.", en: "You tire easily from feeling and absorbing too much. You're heavily affected by others' energy." },
    loveStyle: { ko: "정말 로맨틱하고 감성적이에요. 영화 같은 사랑, 깊은 정서적 교감을 중시해요.", en: "Truly romantic and emotional. You value movie-like love and deep emotional connection." },
    careerFit: { ko: "예술, 문학, 음악, 심리상담, 영성, 타로, 점술, 치유사", en: "Art, literature, music, counseling, spirituality, tarot, divination, healer" },
    lifePattern: { ko: "작은 시냇물이 모여 강이 되듯, 소소한 노력들이 쌓여 큰 성과로 이어져요.", en: "Like small streams forming a river, small efforts accumulate into great achievements." },
    secretSelf: { ko: "조용하고 내성적으로 보이지만, 풍부한 감수성과 창의력이 흐르고 있어요.", en: "You seem quiet and introverted, but rich sensitivity and creativity flow within." },
    childhood: { ko: "어린 시절, 상상력이 풍부한 아이였을 거예요. 혼자 노는 것을 좋아했고, 보이지 않는 친구가 있었을 수도 있어요.", en: "In childhood, you were probably an imaginative child. You liked playing alone and may have had invisible friends." },
    shadowSelf: { ko: "당신의 그림자는 '도피'예요. 현실이 힘들면 상상 속으로, 꿈속으로 도망가려 해요.", en: "Your shadow is 'escape.' When reality is hard, you try to flee into imagination or dreams." },
    crisis: { ko: "위기 상황에서 당신은 내면으로 들어가요. 겉으로는 얼어붙은 것처럼 보일 수 있지만, 그 안에서 해결책을 찾고 있어요.", en: "In crisis, you go inward. You may seem frozen on the outside, but inside you're finding solutions." },
    healing: { ko: "음악, 명상, 자연 속 산책이 당신을 치유해요. 물 가까이에 있는 것이 특히 좋아요.", en: "Music, meditation, walks in nature heal you. Being near water is especially good." },
    destinyCall: { ko: "당신은 보이지 않는 것을 보고, 느껴지지 않는 것을 느끼기 위해 태어났어요. 당신의 감수성은 저주가 아니라 축복이에요.", en: "You were born to see the invisible and feel the intangible. Your sensitivity is not a curse but a blessing." }
  },
};
