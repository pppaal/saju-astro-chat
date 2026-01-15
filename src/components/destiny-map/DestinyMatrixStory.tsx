"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

import type { FiveElement } from "@/lib/Saju/types";
import { STEM_TO_ELEMENT, ELEMENT_KO_TO_EN as ELEMENT_EN } from "@/lib/Saju/stemElementMapping";
import { getBackendUrl } from "@/lib/backend-url";
import type { SajuData, AstroData, ShinsalItem, PlanetData } from "./fun-insights/types";
import { logger } from "@/lib/logger";

interface Props {
  saju?: SajuData;
  astro?: AstroData;
  lang?: string;
  className?: string;
  useAI?: boolean; // AI 생성 스토리 사용 여부
}

// AI 백엔드 URL
const AI_BACKEND_URL = getBackendUrl();

// 천간 상세 정보
const STEM_INFO: Record<string, {
  ko: string; en: string;
  nature: { ko: string; en: string };
  personality: { ko: string; en: string };
  strength: { ko: string; en: string };
  weakness: { ko: string; en: string };
  loveStyle: { ko: string; en: string };
  careerFit: { ko: string; en: string };
  lifePattern: { ko: string; en: string };
  secretSelf: { ko: string; en: string };
  childhood: { ko: string; en: string };
  shadowSelf: { ko: string; en: string };
  crisis: { ko: string; en: string };
  healing: { ko: string; en: string };
  destinyCall: { ko: string; en: string };
}> = {
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
    nature: { ko: "빛나는 다이아몬드, 정교한 보석 - 세상에서 가장 단단하면서도 가장 아름다운 존재", en: "A shining diamond, an exquisite gem - the hardest yet most beautiful thing in the world" },
    personality: {
      ko: "당신은 세련되고 빛나는 존재감을 가지고 있어요. 미적 감각이 뛰어나고, 디테일에 강하며, 무엇이든 아름답게 만드는 능력이 있어요. 당신이 만지면 평범한 것도 특별해져요. 사람들은 당신의 취향을 신뢰하고, 당신의 추천을 따라요. 옷을 고를 때, 선물을 고를 때, 인테리어를 할 때 - 주변 사람들은 자연스럽게 당신의 의견을 물어요. 그만큼 당신의 안목은 특별해요. 하지만 그 안목이 때로는 당신 자신에게 가장 가혹하게 적용돼요. 거울을 볼 때마다 부족한 점만 보이고, 완성된 작품을 봐도 고칠 곳만 눈에 들어와요. 그것이 당신을 성장시키기도 하지만, 지치게 하기도 해요. 당신은 '대충'이라는 단어를 모르는 사람이에요. 뭔가를 하려면 제대로 해야 하고, 그렇지 않으면 차라리 하지 않는 게 낫다고 생각해요.",
      en: "You have a refined, radiant presence. You have excellent aesthetic sense, strong attention to detail, and the ability to beautify anything. Ordinary things become special in your hands. People trust your taste and follow your recommendations. When choosing clothes, gifts, or decorating - people naturally ask your opinion. Your eye is that special. But that same eye is often harshest on yourself. Every time you look in the mirror, you see only flaws. Even finished work shows only areas for improvement. This drives your growth but also exhausts you. You don't know the word 'good enough.' If you do something, you do it right, or not at all."
    },
    strength: { ko: "섬세함, 미적 감각, 완벽주의, 품격, 안목, 정교함, 세련미, 고급스러운 취향", en: "Delicacy, aesthetic sense, perfectionism, elegance, discernment, precision, sophistication, refined taste" },
    weakness: { ko: "자신에게도, 다른 사람에게도 높은 기준을 적용해 쉽게 만족하지 못해요. '왜 이것밖에 안 되지?'라는 생각이 자주 들어요. 완벽하지 않으면 시작조차 하지 않으려 해요. 그래서 많은 좋은 기회들이 '아직 준비가 안 됐어'라는 말과 함께 지나가버려요. 또한 다른 사람의 작은 실수나 부족함이 눈에 거슬려서, 말하지 않으려 해도 표정에 드러나요. 그것이 관계에서 벽을 만들기도 해요. '왜 다들 이 정도도 못하지?'라는 생각이 무의식중에 떠오르고, 그게 상대방에게 전해져요.", en: "You apply high standards to yourself and others, making satisfaction difficult. You often think 'Why is this all there is?' If it's not perfect, you won't even start. Many good opportunities pass with 'I'm not ready yet.' Also, small mistakes or shortcomings in others bother you, and even trying not to speak, your expression shows it. This creates walls in relationships. 'Why can't everyone manage this much?' rises unconsciously, and it transmits to others." },
    loveStyle: { ko: "이상이 높아요. 완벽한 상대, 완벽한 관계를 꿈꾸기 때문에 쉽게 만족하지 못할 수 있어요. 첫 만남에서 상대방의 옷차림, 말투, 매너 하나하나가 다 체크돼요. 마음에 드는 사람이 생겨도 '저 사람 정말 괜찮은 걸까?'라는 의심이 쉽게 사라지지 않아요. 연애 초기에는 상대방의 모든 것이 완벽해 보여도, 시간이 지나면 작은 것들이 거슬리기 시작해요. 양말을 아무렇게나 벗어놓는 것, 문자에 마침표를 안 찍는 것... 사소한 것들이요. 하지만 일단 마음을 주면, 정말 헌신적이에요. 상대방을 위해 완벽한 서프라이즈를 준비하고, 기념일 하나 놓치지 않아요. 문제는... 상대방도 당신에게 그만큼을 기대하게 되고, 그게 부담이 될 수 있다는 거예요. 완벽한 사람은 없다는 것도 기억해주세요 - 당신 포함해서요.", en: "You have high ideals. Dreaming of perfect partner and relationship, you may not be easily satisfied. On first meeting, you check everything - clothes, speech, manners. Even when someone catches your eye, the doubt 'Are they really good enough?' doesn't easily fade. Early in dating, everything seems perfect, but over time small things start bothering you. Socks left carelessly, texts without periods... trivial things. But once you give your heart, you're truly devoted. You prepare perfect surprises, never missing an anniversary. The problem is... your partner comes to expect the same, which can become pressure. Remember no one is perfect - including you." },
    careerFit: { ko: "패션, 뷰티, 보석, 금융, 예술, IT, 디자인, 에디터, 큐레이터, 품질관리, 럭셔리 브랜드, 웨딩플래너, 인테리어 디자이너, 푸드스타일리스트", en: "Fashion, beauty, jewelry, finance, art, IT, design, editor, curator, quality control, luxury brands, wedding planner, interior designer, food stylist" },
    lifePattern: { ko: "보석이 세공되면 빛나듯이 당신도 시련을 통해 더욱 빛나요. 압력을 받을수록 다이아몬드가 되어요. 20대에는 자신의 기준에 맞는 것을 찾느라 방황할 수 있어요. 이 직업 저 직업, 이 사람 저 사람... '이건 아닌 것 같아'라는 말을 많이 하게 될 거예요. 30대에 진짜 자신만의 스타일을 찾고, 40대 이후에 그 가치를 인정받게 돼요. 인생 초반에 '왜 나만 이렇게 예민하지?'라고 느꼈다면, 나중에는 그 예민함이 당신의 가장 큰 자산이 된다는 것을 알게 될 거예요. 다른 사람들이 보지 못하는 것을 보는 능력, 그것이 당신을 특별하게 만들어요.", en: "Like a gem that shines when polished, you shine brighter through trials. The more pressure, the more diamond you become. In your 20s, you may wander looking for things meeting your standards. This job, that job, this person, that person... You'll say 'This isn't right' a lot. In your 30s, you find your true style, and after 40s, you're recognized for your value. If you felt 'Why am I so sensitive?' early in life, you'll later realize that sensitivity becomes your greatest asset. The ability to see what others can't - that makes you special." },
    secretSelf: { ko: "화려해 보이지만, 내면에는 불안과 자기 의심이 있을 수 있어요. '나 충분히 빛나고 있는 걸까?'라는 질문이 머릿속을 맴돌아요. SNS에 올린 사진을 몇 번이고 다시 보며 '이게 최선이었을까?'라고 생각해요. 칭찬을 받아도 '진심일까?'라고 의심하고, 비판을 받으면 며칠을 잠 못 이뤄요. 겉으로는 자신감 있어 보이지만, 그 자신감을 유지하기 위해 얼마나 노력하는지 아무도 몰라요. 완벽해 보이는 모습 뒤에서 얼마나 많은 시간을 준비에 쏟는지, 얼마나 많은 것들을 버리고 다시 시작하는지... 아무도 몰라요.", en: "You seem glamorous, but inside may lie anxiety and self-doubt. 'Am I shining enough?' - this question circles in your mind. You look at photos posted on social media again and again thinking 'Was this the best?' Even receiving praise, you doubt 'Is it genuine?' When criticized, you can't sleep for days. You appear confident, but no one knows how hard you work to maintain that confidence. How much time you spend preparing behind the perfect appearance, how many things you discard and restart... no one knows." },
    childhood: { ko: "어린 시절, 예쁜 것, 아름다운 것에 끌렸어요. 다른 아이들이 뛰어노는 동안 당신은 색종이를 정리하거나, 인형 옷을 갈아입히거나, 방을 예쁘게 꾸미고 있었을 거예요. 크레파스도 색깔 순서대로 정리하고, 책도 크기별로 꽂아두고, 장난감도 종류별로 분류했을 거예요. 다른 아이들과는 다른 감각이 있었고, 때때로 그것이 외로움이 되기도 했어요. '왜 나만 이런 게 신경 쓰이지?' '왜 다들 아무렇게나 하고 다니지?'라는 생각을 했을 수도 있어요. 부모님이나 선생님이 '너무 까다롭다'고 했을 때, 속으로 상처받았을 거예요. 하지만 그 까다로움이 지금의 당신을 만들었어요.", en: "In childhood, you were drawn to pretty, beautiful things. While other kids played, you were organizing colored paper, changing doll clothes, or decorating your room. You probably arranged crayons by color, books by size, toys by type. You had a sense different from other kids, and sometimes that became loneliness. You may have thought 'Why do only I notice these things?' 'Why does everyone just do whatever?' When parents or teachers called you 'too picky,' you were hurt inside. But that pickiness made who you are today." },
    shadowSelf: { ko: "당신의 그림자는 '비판'이에요. 자신과 다른 사람을 끊임없이 판단하고 평가해요. 머릿속에 채점표가 있어서, 만나는 모든 사람과 상황에 점수를 매기고 있어요. 그 채점표에서 자신도 예외가 아니에요 - 오히려 가장 가혹한 점수를 받는 건 당신 자신이에요. 이 비판적인 시선은 당신을 성장시켜왔지만, 동시에 지치게 하고 외롭게 만들어요. 완벽하지 않은 것에 대한 두려움이 당신을 옭아매고 있어요. 때로는 '그냥 있는 그대로도 괜찮아'라고 말해주세요. 완벽하지 않은 것도 사랑받을 자격이 있어요. 금이 간 도자기도 아름답고, 흠집이 있는 다이아몬드도 여전히 다이아몬드예요.", en: "Your shadow is 'criticism.' You constantly judge yourself and others. There's a scorecard in your head, rating everyone and everything you encounter. You're not exempt from that scorecard - in fact, you receive the harshest scores. This critical eye has driven your growth, but it also exhausts and isolates you. Fear of imperfection binds you. Sometimes say 'It's okay just as it is.' Imperfection deserves love too. Cracked pottery is beautiful, and a flawed diamond is still a diamond." },
    crisis: { ko: "위기 상황에서 당신은 더 날카로워지고, 비판적이 될 수 있어요. 문제의 모든 결함을 찾아내고, '이게 왜 이 모양이야'라고 생각해요. 스트레스를 받으면 주변 사람들에게 날카롭게 굴고, 나중에 후회해요. 모든 것을 통제하려 하고, 완벽하게 해결하려 하다가 더 지쳐버려요. 하지만 기억하세요 - 진짜 다이아몬드는 스크래치가 나지 않아요. 당신도 마찬가지예요. 이 위기도 당신을 더 빛나게 세공하는 과정일 뿐이에요. 지금 힘들어도, 이 과정이 끝나면 더 아름다워진 당신이 있을 거예요. 탄소가 엄청난 압력을 받아야 다이아몬드가 되는 것처럼요.", en: "In crisis, you can become sharper and more critical. You find every flaw in the problem, thinking 'Why is this such a mess?' Under stress, you're sharp with people around you, regretting it later. Trying to control everything and solve it perfectly, you exhaust yourself more. But remember - real diamonds don't scratch. Neither do you. This crisis is just polishing you to shine brighter. Even if it's hard now, a more beautiful you awaits when this ends. Like carbon needs immense pressure to become diamond." },
    healing: { ko: "아름다운 것을 보고, 만지고, 경험하는 것이 당신을 치유해요. 미술관에서 조용히 그림을 감상하거나, 좋은 음악회에 가거나, 고급 레스토랑에서 정성스럽게 플레이팅된 음식을 먹어보세요. 품질 좋은 옷 한 벌, 잘 만들어진 가구 하나가 당신의 마음을 달래줘요. 손으로 무언가를 만드는 것도 좋아요 - 도자기, 꽃꽂이, 요리. 완벽하지 않아도 괜찮은 것들을 만들어보면서, 불완전함의 아름다움을 배워보세요. 그리고 가장 중요한 것 - '불완전해도 아름다워'라고 자신에게 말해주세요. 세상에서 가장 아름다운 것들도 완벽하지 않아요. 금이 간 도자기도, 세월의 흔적이 있는 고가구도, 자연의 돌멩이도 아름다워요. 당신의 불완전함도 그래요.", en: "Seeing, touching, experiencing beautiful things heals you. Quietly view paintings at a museum, attend a fine concert, or eat carefully plated food at an upscale restaurant. One quality piece of clothing, one well-made furniture piece soothes your soul. Making things with your hands is also good - pottery, flower arranging, cooking. Making imperfect things, learn the beauty of imperfection. And most importantly - tell yourself 'Imperfect is beautiful too.' The world's most beautiful things aren't perfect. Cracked ceramics, aged antique furniture, natural stones are beautiful. So is your imperfection." },
    destinyCall: { ko: "당신은 세상에 아름다움을 가져오기 위해 태어났어요. 평범한 것을 특별하게, 어두운 곳에 빛을 가져다주는 것이 당신의 사명이에요. 당신이 만지면 모든 것이 한 단계 업그레이드돼요. 그것이 프로젝트든, 공간이든, 사람이든. 당신의 까다로운 눈은 저주가 아니라 선물이에요. 세상에는 당신처럼 아름다움을 알아보는 사람이 필요해요. 평범함에 만족하지 않는 당신이, 세상을 조금씩 더 아름답게 만들고 있어요. 당신이 존재함으로써 세상은 조금 더 정제되고, 조금 더 빛나고, 조금 더 아름다워져요. 그것이 당신의 존재 이유예요.", en: "You were born to bring beauty to the world. Making ordinary special, bringing light to dark places - that's your mission. Everything you touch upgrades. Whether projects, spaces, or people. Your picky eye is not a curse but a gift. The world needs people like you who recognize beauty. You, who refuse to settle for ordinary, are making the world a little more beautiful. Through your existence, the world becomes more refined, more radiant, more beautiful. That is your reason for being." }
  },
  "壬": {
    ko: "임수", en: "Ren Water",
    nature: { ko: "끝없이 깊고 넓은 바다", en: "The endlessly deep and vast ocean" },
    personality: {
      ko: "당신은 측량할 수 없는 내면의 깊이를 가지고 있어요. 직관력이 뛰어나고, 상황을 꿰뚫어보는 통찰력이 있어요. 바다가 모든 강물을 받아들이듯, 다양한 사람들과 생각들을 품을 수 있어요. 당신의 눈을 보면 깊은 바다를 보는 것 같다는 말을 들어본 적 있을 거예요.",
      en: "You have immeasurable inner depth. You have excellent intuition and insight to see through situations. Like the ocean accepting all rivers, you can embrace diverse people and ideas. You've probably heard that looking into your eyes is like looking at the deep ocean."
    },
    strength: { ko: "지혜, 포용력, 통찰력, 적응력, 철학적 사고", en: "Wisdom, embracing nature, insight, adaptability, philosophical thinking" },
    weakness: { ko: "감정의 파도가 거세게 일 때, 다스리기가 쉽지 않아요. 때로는 그 깊이가 우울로 변할 수 있어요.", en: "When emotional waves surge, they're not easy to control. Sometimes that depth can turn into melancholy." },
    loveStyle: { ko: "깊이 있는 관계를 원해요. 영혼이 통하는, 진정으로 이해받는 느낌을 주는 관계를 찾습니다. 표면적인 관계는 당신에게 만족을 주지 못해요.", en: "You want deep relationships. You seek connections where souls communicate and you feel truly understood. Superficial relationships don't satisfy you." },
    careerFit: { ko: "철학, 심리학, 연구, 예술, 물류/무역, 여행, 작가, 치료사", en: "Philosophy, psychology, research, art, logistics/trade, travel, writer, therapist" },
    lifePattern: { ko: "물처럼 여러 방향으로 흐르다가 결국 큰 바다에 이르러요. 남들이 정한 길을 따르지 않고, 당신만의 흐름을 찾아요.", en: "Like water flowing in many directions, you eventually reach the great ocean. You don't follow paths set by others, but find your own flow." },
    secretSelf: { ko: "잔잔해 보이지만 내면에는 거대한 파도 같은 감정이 있어요. 가끔 그 감정에 빠져들어 헤어나오기 힘들 때가 있어요.", en: "You seem calm, but inside are emotions like giant waves. Sometimes you sink into those emotions and struggle to surface." },
    childhood: { ko: "어린 시절, 다른 아이들보다 생각이 많았을 거예요. '왜?'라는 질문을 많이 했고, 세상의 진실에 관심이 있었어요.", en: "In childhood, you probably thought more than other kids. You asked 'why?' a lot and were interested in the truth of the world." },
    shadowSelf: { ko: "당신의 그림자는 '표류'예요. 너무 많은 가능성에 빠져 아무것도 결정하지 못할 때가 있어요. 물도 가끔은 방향을 정해야 해요.", en: "Your shadow is 'drifting.' Sometimes you get lost in too many possibilities and can't decide anything. Even water needs to choose a direction sometimes." },
    crisis: { ko: "위기 상황에서 당신은 물처럼 우회해요. 직접 부딪히기보다 돌아가는 방법을 찾죠. 하지만 때로는 폭포처럼 직선으로 떨어지는 것도 필요해요.", en: "In crisis, you flow around like water. You find ways around rather than confronting directly. But sometimes you need to drop straight like a waterfall." },
    healing: { ko: "물가에서 시간을 보내세요. 바다, 호수, 강. 물 소리가 당신을 치유해요. 그리고 '깊어도 괜찮아, 떠오를 거야'라고 자신에게 말해주세요.", en: "Spend time near water. Ocean, lake, river. The sound of water heals you. And tell yourself 'It's okay to be deep, you'll surface.'" },
    destinyCall: { ko: "당신은 세상의 깊은 진실을 탐구하고, 다른 사람들에게 지혜를 전하기 위해 태어났어요. 바다가 모든 것을 품듯이, 당신도 세상을 품을 수 있어요.", en: "You were born to explore deep truths and share wisdom with others. Like the ocean embracing everything, you can embrace the world." }
  },
  "癸": {
    ko: "계수", en: "Gui Water",
    nature: { ko: "산에서 시작된 맑은 시냇물", en: "A clear stream flowing from the mountain" },
    personality: {
      ko: "당신은 순수하고 깨끗한 에너지를 가졌어요. 직관력이 예민해서 남들이 놓치는 것을 감지해요. 논리로 설명되지 않지만 정확한 직감이 있어요. 가끔 '이상하게 그냥 느껴졌어'라고 말하면 사람들이 놀라죠 - 그게 당신이에요.",
      en: "You have pure, clean energy. Your intuition is sharp, sensing what others miss. You have accurate instincts that logic can't explain. Sometimes when you say 'I just somehow felt it,' people are amazed - that's you."
    },
    strength: { ko: "직관력, 감수성, 창의력, 영성, 예술적 감각", en: "Intuition, sensitivity, creativity, spirituality, artistic sense" },
    weakness: { ko: "너무 많은 것을 느끼고 흡수하다 보니 쉽게 지쳐요. 다른 사람의 에너지에 영향을 많이 받아서 보호막이 필요해요.", en: "You tire easily from feeling and absorbing too much. You're heavily affected by others' energy and need protection." },
    loveStyle: { ko: "정말 로맨틱하고 감성적이에요. 영화 같은 사랑, 깊은 정서적 교감을 중시해요. 하지만 현실의 사랑은 영화와 다르다는 것도 받아들여야 해요.", en: "Truly romantic and emotional. You value movie-like love and deep emotional connection. But you need to accept that real love differs from movies." },
    careerFit: { ko: "예술, 문학, 음악, 심리상담, 영성, 타로, 점술, 치유사", en: "Art, literature, music, counseling, spirituality, tarot, divination, healer" },
    lifePattern: { ko: "작은 시냇물이 모여 강이 되듯, 소소한 노력들이 쌓여 큰 성과로 이어져요. 조급해하지 마세요 - 당신의 리듬이 있어요.", en: "Like small streams forming a river, small efforts accumulate into great achievements. Don't be impatient - you have your own rhythm." },
    secretSelf: { ko: "조용하고 내성적으로 보이지만, 풍부한 감수성과 창의력이 흐르고 있어요. 당신의 내면은 우주처럼 광활해요.", en: "You seem quiet and introverted, but rich sensitivity and creativity flow within. Your inner world is as vast as the universe." },
    childhood: { ko: "어린 시절, 상상력이 풍부한 아이였을 거예요. 혼자 노는 것을 좋아했고, 보이지 않는 친구가 있었을 수도 있어요. 세상이 너무 거칠게 느껴질 때가 있었어요.", en: "In childhood, you were probably an imaginative child. You liked playing alone and may have had invisible friends. Sometimes the world felt too harsh." },
    shadowSelf: { ko: "당신의 그림자는 '도피'예요. 현실이 힘들면 상상 속으로, 꿈속으로 도망가려 해요. 하지만 가끔은 현실에 발을 딛고 있어야 해요.", en: "Your shadow is 'escape.' When reality is hard, you try to flee into imagination or dreams. But sometimes you need to keep your feet on the ground." },
    crisis: { ko: "위기 상황에서 당신은 내면으로 들어가요. 겉으로는 얼어붙은 것처럼 보일 수 있지만, 그 안에서 해결책을 찾고 있어요.", en: "In crisis, you go inward. You may seem frozen on the outside, but inside you're finding solutions." },
    healing: { ko: "음악, 명상, 자연 속 산책이 당신을 치유해요. 물 가까이에 있는 것이 특히 좋아요. 그리고 '느끼는 것은 나의 선물이야'라고 자신에게 말해주세요.", en: "Music, meditation, walks in nature heal you. Being near water is especially good. And tell yourself 'Feeling is my gift.'" },
    destinyCall: { ko: "당신은 보이지 않는 것을 보고, 느껴지지 않는 것을 느끼기 위해 태어났어요. 세상에는 당신 같은 안테나가 필요해요. 당신의 감수성은 저주가 아니라 축복이에요.", en: "You were born to see the invisible and feel the intangible. The world needs antennas like you. Your sensitivity is not a curse but a blessing." }
  },
};

// 십이운성 상세 해석
const TWELVE_STAGE: Record<string, { name: { ko: string; en: string }; meaning: { ko: string; en: string }; lifeAdvice: { ko: string; en: string } }> = {
  "장생": { name: { ko: "장생(長生)", en: "Longevity" }, meaning: { ko: "끊임없이 성장하고 발전하려는 에너지. 새로운 시작에 강해요.", en: "Energy for constant growth. Strong at new beginnings." }, lifeAdvice: { ko: "새로운 것을 시작할 때 운이 트여요.", en: "Luck opens when you start something new." } },
  "목욕": { name: { ko: "목욕(沐浴)", en: "Bathing" }, meaning: { ko: "변화와 정화의 에너지. 새롭게 시작하는 능력이 탁월해요.", en: "Energy for change and purification. Excellent at fresh starts." }, lifeAdvice: { ko: "변화를 두려워하지 마세요.", en: "Don't fear change." } },
  "관대": { name: { ko: "관대(冠帶)", en: "Capping" }, meaning: { ko: "세상에 자신을 드러내려는 에너지. 사회적 성공을 추구해요.", en: "Energy to present yourself. Pursuing social success." }, lifeAdvice: { ko: "내면의 성장도 함께 챙기세요.", en: "Nurture inner growth too." } },
  "건록": { name: { ko: "건록(建祿)", en: "Establishing" }, meaning: { ko: "독립적이고 자립심이 강한 에너지.", en: "Independent, self-reliant energy." }, lifeAdvice: { ko: "때로는 협력도 필요해요.", en: "Sometimes cooperation is needed." } },
  "제왕": { name: { ko: "제왕(帝旺)", en: "Emperor" }, meaning: { ko: "정점의 왕 에너지. 강한 리더십과 카리스마.", en: "Peak emperor energy. Strong leadership and charisma." }, lifeAdvice: { ko: "겸손을 배우세요.", en: "Learn humility." } },
  "쇠": { name: { ko: "쇠(衰)", en: "Decline" }, meaning: { ko: "원숙하고 안정된 에너지. 깊은 경험과 지혜.", en: "Mature, stable energy. Deep experience and wisdom." }, lifeAdvice: { ko: "자신의 페이스를 유지하세요.", en: "Maintain your own pace." } },
  "병": { name: { ko: "병(病)", en: "Illness" }, meaning: { ko: "돌봄을 주고받는 에너지. 보살피는 재능.", en: "Energy for giving and receiving care." }, lifeAdvice: { ko: "건강에 신경 쓰세요.", en: "Take care of your health." } },
  "사": { name: { ko: "사(死)", en: "Death" }, meaning: { ko: "완성과 마무리의 에너지. 정신적 가치를 추구.", en: "Energy for completion. Pursuing spiritual values." }, lifeAdvice: { ko: "정신적 가치에서 의미를 찾으세요.", en: "Find meaning in spiritual values." } },
  "묘": { name: { ko: "묘(墓)", en: "Tomb" }, meaning: { ko: "축적과 보존의 에너지. 재물 운이 있어요.", en: "Energy for accumulation. Fortune for wealth." }, lifeAdvice: { ko: "물려받은 것을 잘 지키세요.", en: "Protect what you've inherited." } },
  "절": { name: { ko: "절(絶)", en: "Extinction" }, meaning: { ko: "완전한 변화의 에너지. 새로 시작할 용기.", en: "Energy for complete transformation." }, lifeAdvice: { ko: "끝은 새로운 시작이에요.", en: "Every end is a new beginning." } },
  "태": { name: { ko: "태(胎)", en: "Conception" }, meaning: { ko: "잠재력의 에너지. 무한한 가능성.", en: "Energy of potential. Infinite possibilities." }, lifeAdvice: { ko: "때를 기다리세요.", en: "Wait for the right time." } },
  "양": { name: { ko: "양(養)", en: "Nurturing" }, meaning: { ko: "보살핌을 받는 에너지. 귀인의 도움.", en: "Energy of being nurtured. Help from benefactors." }, lifeAdvice: { ko: "복에 감사하고 자립심도 키우세요.", en: "Be grateful and develop independence." } },
};

// 별자리 상세 정보
const ZODIAC_INFO: Record<string, { ko: string; en: string; element: string; personality: { ko: string; en: string }; loveStyle: { ko: string; en: string }; strength: { ko: string; en: string }; challenge: { ko: string; en: string }; lifeTheme: { ko: string; en: string } }> = {
  aries: { ko: "양자리", en: "Aries", element: "fire", personality: { ko: "개척자. 불꽃같은 용기로 새로운 것을 시작하는 선구자.", en: "A pioneer with fiery courage to start new things." }, loveStyle: { ko: "열정적으로 달려들어요. 추격의 스릴을 즐깁니다.", en: "You dive in passionately. You enjoy the thrill of the chase." }, strength: { ko: "용기, 추진력, 솔직함", en: "Courage, drive, honesty" }, challenge: { ko: "인내심 부족, 충동성", en: "Lack of patience, impulsiveness" }, lifeTheme: { ko: "새로운 길을 여는 것.", en: "Opening new paths." } },
  taurus: { ko: "황소자리", en: "Taurus", element: "earth", personality: { ko: "대지처럼 안정적. 오감으로 세상을 경험하고 끈기있게 밀고 나가요.", en: "Stable like earth. Experiencing world through senses with tenacity." }, loveStyle: { ko: "느리지만 확실하게. 평생의 각오로 임해요.", en: "Slowly but surely. Ready for lifetime commitment." }, strength: { ko: "인내심, 신뢰성, 끈기", en: "Patience, reliability, tenacity" }, challenge: { ko: "고집, 변화 저항", en: "Stubbornness, resistance to change" }, lifeTheme: { ko: "풍요로운 삶을 만드는 것.", en: "Building a prosperous life." } },
  gemini: { ko: "쌍둥이자리", en: "Gemini", element: "air", personality: { ko: "바람처럼 자유롭고 다재다능. 끝없는 호기심.", en: "Free as wind and versatile. Endless curiosity." }, loveStyle: { ko: "지적 교감 중시. 대화가 통해야 해요.", en: "Value intellectual connection. Need good conversation." }, strength: { ko: "소통, 적응력, 재치", en: "Communication, adaptability, wit" }, challenge: { ko: "산만함, 일관성 부족", en: "Distraction, inconsistency" }, lifeTheme: { ko: "세상을 연결하는 것.", en: "Connecting the world." } },
  cancer: { ko: "게자리", en: "Cancer", element: "water", personality: { ko: "달처럼 깊은 감수성. 가족에 대한 깊은 헌신과 공감 능력.", en: "Deep sensitivity like moon. Deep devotion to family with empathy." }, loveStyle: { ko: "모든 것을 주고 싶어해요. 헌신적인 사랑.", en: "Want to give everything. Devoted love." }, strength: { ko: "공감, 보호본능, 직관", en: "Empathy, protective instinct, intuition" }, challenge: { ko: "감정기복, 과거 집착", en: "Mood swings, clinging to past" }, lifeTheme: { ko: "안식처가 되어주는 것.", en: "Being a sanctuary." } },
  leo: { ko: "사자자리", en: "Leo", element: "fire", personality: { ko: "태양처럼 빛나는 존재. 어디서든 주목받고 무대 중심에 서요.", en: "Radiant like sun. Attracting attention, taking center stage." }, loveStyle: { ko: "왕처럼, 여왕처럼 대우받고 싶고 그만큼 줘요.", en: "Want royal treatment and give just as much." }, strength: { ko: "카리스마, 창의성, 관대함", en: "Charisma, creativity, generosity" }, challenge: { ko: "자존심, 인정욕구", en: "Pride, need for recognition" }, lifeTheme: { ko: "자신의 빛으로 세상을 밝히는 것.", en: "Illuminating the world with your light." } },
  virgo: { ko: "처녀자리", en: "Virgo", element: "earth", personality: { ko: "섬세하고 분석적. 완벽을 추구하며 실용적으로 문제 해결.", en: "Delicate and analytical. Pursuing perfection practically." }, loveStyle: { ko: "행동으로 표현해요. 챙기는 것으로 마음을 전해요.", en: "Express through actions and care." }, strength: { ko: "분석력, 실용성, 봉사정신", en: "Analysis, practicality, service" }, challenge: { ko: "완벽주의, 비판적 태도", en: "Perfectionism, critical attitude" }, lifeTheme: { ko: "세상을 더 나은 곳으로.", en: "Making the world better." } },
  libra: { ko: "천칭자리", en: "Libra", element: "air", personality: { ko: "조화와 아름다움 추구. 공정함을 중시하고 중재자 역할.", en: "Pursuing harmony and beauty. Valuing fairness, mediating." }, loveStyle: { ko: "파트너십 중시. 완전한 조화를 원해요.", en: "Value partnership. Want perfect harmony." }, strength: { ko: "외교력, 미적 감각, 매력", en: "Diplomacy, aesthetic sense, charm" }, challenge: { ko: "우유부단, 갈등 회피", en: "Indecisiveness, conflict avoidance" }, lifeTheme: { ko: "세상에 균형을 가져오는 것.", en: "Bringing balance to the world." } },
  scorpio: { ko: "전갈자리", en: "Scorpio", element: "water", personality: { ko: "깊은 심연의 강렬함. 진실을 꿰뚫는 통찰력.", en: "Intense depth. Insight to see through truth." }, loveStyle: { ko: "전부를 원해요. 깊고 강렬한 연결.", en: "Want everything. Deep, intense connections." }, strength: { ko: "통찰력, 집요함, 충성심", en: "Insight, persistence, loyalty" }, challenge: { ko: "집착, 비밀주의", en: "Obsession, secrecy" }, lifeTheme: { ko: "죽음과 재탄생을 통한 진화.", en: "Evolving through death and rebirth." } },
  sagittarius: { ko: "궁수자리", en: "Sagittarius", element: "fire", personality: { ko: "자유로운 영혼의 모험가. 새로운 경험과 지식에 목말라요.", en: "Free-spirited adventurer. Thirsting for new experiences." }, loveStyle: { ko: "사랑도 모험처럼. 자유를 존중해주는 파트너.", en: "Love as adventure. Partner respecting freedom." }, strength: { ko: "낙관, 솔직함, 모험심", en: "Optimism, honesty, adventure" }, challenge: { ko: "무책임, 과장", en: "Irresponsibility, exaggeration" }, lifeTheme: { ko: "더 큰 진리를 찾는 여행.", en: "Traveling for greater truth." } },
  capricorn: { ko: "염소자리", en: "Capricorn", element: "earth", personality: { ko: "정상을 향해 꾸준히 오르는 등반가. 야망과 자기 단련.", en: "Climber ascending steadily. Ambition and self-discipline." }, loveStyle: { ko: "진지하게 접근. 안정적인 미래를 함께 설계.", en: "Serious approach. Designing stable future together." }, strength: { ko: "야망, 책임감, 인내심", en: "Ambition, responsibility, patience" }, challenge: { ko: "워커홀릭, 감정 억제", en: "Workaholism, emotional suppression" }, lifeTheme: { ko: "정상에 오르는 것.", en: "Climbing to the top." } },
  aquarius: { ko: "물병자리", en: "Aquarius", element: "air", personality: { ko: "시대를 앞서는 혁신가. 독창적 아이디어로 세상을 바꿔요.", en: "Innovator ahead of time. Changing world with original ideas." }, loveStyle: { ko: "친구 같은 연인. 지적 자극을 주는 관계.", en: "Friend-like lover. Intellectually stimulating relationships." }, strength: { ko: "독창성, 인도주의, 혁신", en: "Originality, humanitarianism, innovation" }, challenge: { ko: "감정적 거리감, 반항심", en: "Emotional distance, rebelliousness" }, lifeTheme: { ko: "더 나은 미래를 위한 변화.", en: "Leading change for better future." } },
  pisces: { ko: "물고기자리", en: "Pisces", element: "water", personality: { ko: "경계 없이 흐르는 바다. 뛰어난 공감과 예술적 감수성.", en: "Ocean flowing without boundaries. Excellent empathy and artistry." }, loveStyle: { ko: "영혼이 통하는 사랑. 하나가 되고 싶어요.", en: "Soul-connecting love. Want to become one." }, strength: { ko: "공감, 창의성, 직관", en: "Empathy, creativity, intuition" }, challenge: { ko: "현실도피, 경계부재", en: "Escapism, lack of boundaries" }, lifeTheme: { ko: "보이지 않는 세계와 보이는 세계를 잇는 것.", en: "Connecting invisible and visible worlds." } },
};

// 신살 정보
const SHINSAL_INFO: Record<string, { ko: string; en: string; meaning: { ko: string; en: string }; lifeImpact: { ko: string; en: string }; advice: { ko: string; en: string } }> = {
  "역마살": { ko: "역마살", en: "Traveling Star", meaning: { ko: "끊임없이 움직이고 새로운 것을 경험하려는 본능.", en: "Instinct to constantly move and experience new things." }, lifeImpact: { ko: "무역, 항공, 여행 분야에서 성공 가능.", en: "Success potential in trade, aviation, travel." }, advice: { ko: "여행과 새 프로젝트로 에너지를 풀어주세요.", en: "Release energy through travel and new projects." } },
  "도화살": { ko: "도화살", en: "Peach Blossom", meaning: { ko: "사람을 끄는 묘한 매력.", en: "Mysterious charm that attracts people." }, lifeImpact: { ko: "대중적 관심을 받는 직업에서 성공.", en: "Success in public-facing careers." }, advice: { ko: "예술이나 대중 소통으로 승화시키세요.", en: "Sublimate into art or public communication." } },
  "화개살": { ko: "화개살", en: "Canopy Star", meaning: { ko: "예술적 감각과 영적 민감성.", en: "Artistic sense and spiritual sensitivity." }, lifeImpact: { ko: "예술, 종교, 철학 분야에서 두각.", en: "Excellence in art, religion, philosophy." }, advice: { ko: "고독이 창조력의 원천이에요.", en: "Solitude is source of creativity." } },
  "문창귀인": { ko: "문창귀인", en: "Literary Star", meaning: { ko: "학문과 글쓰기의 재능.", en: "Talent for academics and writing." }, lifeImpact: { ko: "교육, 출판, 연구 분야에서 성공.", en: "Success in education, publishing, research." }, advice: { ko: "배움을 멈추지 마세요.", en: "Never stop learning." } },
  "천을귀인": { ko: "천을귀인", en: "Heavenly Noble", meaning: { ko: "어려울 때 도움받는 행운의 에너지.", en: "Lucky energy bringing help in difficulties." }, lifeImpact: { ko: "위기에서 기적적으로 빠져나와요.", en: "Miraculously escape from crises." }, advice: { ko: "다른 사람에게도 귀인이 되어주세요.", en: "Become a benefactor to others too." } },
  "양인살": { ko: "양인살", en: "Blade Star", meaning: { ko: "날카로운 결단력과 추진력.", en: "Sharp decisiveness and drive." }, lifeImpact: { ko: "경쟁이 치열한 분야에서 성공.", en: "Success in highly competitive fields." }, advice: { ko: "건설적인 방향으로 사용하세요.", en: "Use constructively." } },
  "괴강살": { ko: "괴강살", en: "Powerful Star", meaning: { ko: "강한 개성과 독자적 성향.", en: "Strong individuality and independent tendency." }, lifeImpact: { ko: "창업, 예술 등 독자적 분야에서 성공.", en: "Success in independent fields like entrepreneurship." }, advice: { ko: "타인과의 조화도 배우세요.", en: "Learn to harmonize with others." } },
};

// 행성 해석
const PLANET_SIGNS: Record<string, Record<string, { ko: string; en: string }>> = {
  mercury: {
    fire: { ko: "생각이 빠르고 열정적으로 표현해요.", en: "Fast thinking and passionate expression." },
    earth: { ko: "실용적이고 신중하게 소통해요.", en: "Practical and careful communication." },
    air: { ko: "빠르게 정보를 처리하고 대화를 즐겨요.", en: "Quick information processing, enjoying conversation." },
    water: { ko: "깊고 직관적인 이해. 느낌으로 소통해요.", en: "Deep, intuitive understanding. Communicating through feelings." }
  },
  venus: {
    fire: { ko: "열정적으로 사랑을 표현해요.", en: "Expressing love passionately." },
    earth: { ko: "안정과 신뢰를 중시하는 사랑.", en: "Love valuing stability and trust." },
    air: { ko: "정신적 교감을 중시하는 사랑.", en: "Love valuing mental connection." },
    water: { ko: "깊은 감정적 연결을 원하는 사랑.", en: "Love seeking deep emotional connection." }
  },
  mars: {
    fire: { ko: "빠르고 직접적인 행동.", en: "Fast and direct action." },
    earth: { ko: "꾸준하고 끈기 있는 행동.", en: "Steady and persistent action." },
    air: { ko: "전략적이고 다양한 접근.", en: "Strategic and varied approach." },
    water: { ko: "간접적이고 흐름을 읽는 행동.", en: "Indirect action, reading the flow." }
  },
  jupiter: {
    fire: { ko: "모험과 도전을 통해 행운이 와요.", en: "Luck through adventure and challenge." },
    earth: { ko: "실용적 노력을 통해 행운이 와요.", en: "Luck through practical effort." },
    air: { ko: "소통과 네트워킹을 통해 행운이 와요.", en: "Luck through communication and networking." },
    water: { ko: "직관을 따를 때 행운이 와요.", en: "Luck when following intuition." }
  },
};

// 오행 조합
function getElementCross(saju: FiveElement, astro: string, lang: string): string {
  const isKo = lang === "ko";
  const map: Record<string, Record<string, { ko: string; en: string }>> = {
    "목": {
      "fire": { ko: "나무가 불을 만나 더욱 빛나요! 성장과 열정의 시너지.", en: "Wood meets fire and shines brighter! Synergy of growth and passion." },
      "earth": { ko: "나무가 흙에 뿌리내려 안정적으로 성장해요.", en: "Wood roots in earth for stable growth." },
      "air": { ko: "나무가 바람을 만나 씨앗이 멀리 퍼져요.", en: "Wood meets wind, seeds spread far." },
      "water": { ko: "나무가 물을 만나 무럭무럭 자라요!", en: "Wood meets water and grows vigorously!" }
    },
    "화": {
      "fire": { ko: "불이 불을 만나 폭발적으로 타올라요!", en: "Fire meets fire and burns explosively!" },
      "earth": { ko: "불이 흙을 만나 단단한 결과물을 만들어요.", en: "Fire meets earth creating solid results." },
      "air": { ko: "불이 바람을 만나 더 크게 타올라요!", en: "Fire meets wind and burns greater!" },
      "water": { ko: "불과 물의 긴장이 증기처럼 새 에너지를 만들어요.", en: "Fire and water tension creates new energy like steam." }
    },
    "토": {
      "fire": { ko: "흙이 불을 만나 더욱 단단해져요.", en: "Earth meets fire and hardens." },
      "earth": { ko: "흙이 흙을 만나 더욱 견고한 기반이 돼요.", en: "Earth meets earth for stronger foundation." },
      "air": { ko: "흙과 바람이 만나 새로운 가능성이 열려요.", en: "Earth meets wind opening new possibilities." },
      "water": { ko: "흙이 물을 만나 비옥해져요.", en: "Earth meets water becoming fertile." }
    },
    "금": {
      "fire": { ko: "금이 불을 만나 새로운 형태로 태어나요.", en: "Metal meets fire and is reborn in new form." },
      "earth": { ko: "금이 흙에서 나와 가치 있는 결과를 만들어요.", en: "Metal from earth creating valuable results." },
      "air": { ko: "금이 바람에 아름다운 소리를 내요.", en: "Metal rings beautifully in the wind." },
      "water": { ko: "금이 물을 만나 더욱 맑게 빛나요.", en: "Metal meets water shining clearer." }
    },
    "수": {
      "fire": { ko: "물과 불이 만나 증기처럼 새 에너지를 만들어요.", en: "Water and fire create new energy like steam." },
      "earth": { ko: "물이 흙을 적셔 생명이 자라요.", en: "Water moistens earth, life grows." },
      "air": { ko: "물이 증발해 구름이 되듯 감성이 아이디어로 승화해요.", en: "Like water evaporating to clouds, emotions sublimate to ideas." },
      "water": { ko: "물이 물을 만나 더 깊어져요.", en: "Water meets water and deepens." }
    }
  };
  const result = map[saju]?.[astro];
  return result ? (isKo ? result.ko : result.en) : (isKo ? "동양과 서양의 에너지가 만나 독특한 조합을 만들어요." : "Eastern and Western energies create a unique combination.");
}

// 한글 천간 → 한자 변환
const STEM_KO_TO_HANJA: Record<string, string> = {
  "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊",
  "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸",
  "갑목": "甲", "을목": "乙", "병화": "丙", "정화": "丁", "무토": "戊",
  "기토": "己", "경금": "庚", "신금": "辛", "임수": "壬", "계수": "癸",
};

// 메인 스토리 생성
function generateFullStory(saju: SajuData | undefined, astro: AstroData | undefined, lang: string): string {
  const isKo = lang === "ko";
  const L = (obj: { ko: string; en: string } | undefined) => obj ? (isKo ? obj.ko : obj.en) : "";

  const dayMasterRaw = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "甲";
  // 한글이면 한자로 변환
  const dayMasterKey = STEM_KO_TO_HANJA[dayMasterRaw] || dayMasterRaw;
  const sajuElement = STEM_TO_ELEMENT[dayMasterRaw] || "목";
  const stem = STEM_INFO[dayMasterKey] || STEM_INFO["甲"];

  const elements = saju?.elements || saju?.fiveElements || {};
  const balance = { 목: elements.wood || elements.목 || 0, 화: elements.fire || elements.화 || 0, 토: elements.earth || elements.토 || 0, 금: elements.metal || elements.금 || 0, 수: elements.water || elements.수 || 0 };
  const sorted = Object.entries(balance).sort(([,a], [,b]) => b - a);
  const strongest = sorted[0], weakest = sorted[sorted.length - 1];

  const stage = saju?.twelveStage || saju?.twelveStages?.day || "";
  const stageInfo = TWELVE_STAGE[stage];

  const shinsals = saju?.shinsal || saju?.specialStars || [];
  const shinsalList: string[] = Array.isArray(shinsals) ? shinsals.map((s: ShinsalItem | string) => {
    if (typeof s === 'string') return s;
    return s?.name || s?.kind || null;
  }).filter((s): s is string => s !== null && s !== undefined) : [];

  const planetsRaw = astro?.planets || [];
  const planets = Array.isArray(planetsRaw) ? planetsRaw : [];
  const getPlanet = (n: string) => planets.find((p: PlanetData) => p?.name?.toLowerCase() === n);
  const sun = getPlanet("sun"), moon = getPlanet("moon"), mercury = getPlanet("mercury"), venus = getPlanet("venus"), mars = getPlanet("mars"), jupiter = getPlanet("jupiter");

  const sunSign = sun?.sign?.toLowerCase() || "aries", moonSign = moon?.sign?.toLowerCase() || "cancer";
  const sunZ = ZODIAC_INFO[sunSign] || ZODIAC_INFO.aries, moonZ = ZODIAC_INFO[moonSign] || ZODIAC_INFO.cancer;
  const mercuryZ = mercury?.sign?.toLowerCase() ? ZODIAC_INFO[mercury.sign.toLowerCase()] : null;
  const venusZ = venus?.sign?.toLowerCase() ? ZODIAC_INFO[venus.sign.toLowerCase()] : null;
  const marsZ = mars?.sign?.toLowerCase() ? ZODIAC_INFO[mars.sign.toLowerCase()] : null;
  const jupiterZ = jupiter?.sign?.toLowerCase() ? ZODIAC_INFO[jupiter.sign.toLowerCase()] : null;
  const ascZ = astro?.ascendant?.sign?.toLowerCase() ? ZODIAC_INFO[astro.ascendant.sign.toLowerCase()] : null;

  const stemName = isKo ? stem.ko : stem.en;
  const sunZName = isKo ? sunZ.ko : sunZ.en, moonZName = isKo ? moonZ.ko : moonZ.en;
  const elementName = isKo ? sajuElement : ELEMENT_EN[sajuElement];
  const strongestName = isKo ? strongest[0] : ELEMENT_EN[strongest[0]], weakestName = isKo ? weakest[0] : ELEMENT_EN[weakest[0]];

  const t = {
    title: isKo ? "당신만을 위한 운명 분석서" : "Your Personal Destiny Analysis",
    intro: isKo ? "이 분석은 사주(동양의 지혜)와 점성술(서양의 지혜)을 교차 분석한 결과입니다. 세상에 오직 당신만을 위해 존재합니다. 이 글을 읽으며 소름이 돋는다면, 그것은 우연이 아니에요." : "This analysis cross-references Saju (Eastern wisdom) and Astrology (Western wisdom). It exists only for you. If you get chills while reading this, it's no coincidence.",
    ch1: isKo ? "제1장: 당신의 본질" : "Chapter 1: Your Essence",
    ch2: isKo ? `제2장: 태양 ${sunZName}` : `Chapter 2: Sun in ${sunZName}`,
    ch3: isKo ? `제3장: 달 ${moonZName}` : `Chapter 3: Moon in ${moonZName}`,
    ch4: isKo ? "제4장: 오행 에너지" : "Chapter 4: Five Elements",
    ch5: isKo ? "제5장: 십이운성" : "Chapter 5: Twelve Stages",
    ch6: isKo ? "제6장: 연애와 관계" : "Chapter 6: Love & Relationships",
    ch7: isKo ? "제7장: 사고방식" : "Chapter 7: Thinking",
    ch8: isKo ? "제8장: 행동력" : "Chapter 8: Action",
    ch9: isKo ? "제9장: 행운" : "Chapter 9: Fortune",
    ch10: isKo ? "제10장: 직업과 인생 패턴" : "Chapter 10: Career & Life Pattern",
    ch11: isKo ? "제11장: 신살 - 특별한 별" : "Chapter 11: Special Stars",
    chChildhood: isKo ? "제12장: 어린 시절의 당신" : "Chapter 12: Your Childhood",
    chShadow: isKo ? "제13장: 그림자 자아" : "Chapter 13: Shadow Self",
    chCrisis: isKo ? "제14장: 위기 대처법" : "Chapter 14: Crisis Response",
    chHealing: isKo ? "제15장: 치유의 길" : "Chapter 15: Path to Healing",
    chFinal: isKo ? "마지막 장: 당신의 운명적 소명" : "Final Chapter: Your Destiny Call",
    dayMaster: isKo ? "일간(日干)" : "Day Master",
    strength: isKo ? "강점" : "Strengths",
    weakness: isKo ? "주의점" : "Points to Watch",
    hidden: isKo ? "숨겨진 당신" : "Hidden Self",
    eastWest: isKo ? "동서양 에너지의 만남" : "Where East Meets West",
    strongestEl: isKo ? "가장 강한 기운" : "Strongest Element",
    weakestEl: isKo ? "보완 필요" : "Needs Balance",
    loveStyle: isKo ? "연애 스타일" : "Love Style",
    career: isKo ? "적성" : "Aptitude",
    lifePattern: isKo ? "인생 패턴" : "Life Pattern",
    remember: isKo ? "기억하세요" : "Remember",
    unique: isKo ? "세상에 단 하나뿐인 조합입니다. 그 자체로 충분히 특별해요." : "You are a one-of-a-kind combination. Special just as you are."
  };

  const strongDesc: Record<string, { ko: string; en: string }> = {
    "목": { ko: "성장, 창의성, 새로운 시작의 에너지가 넘쳐요.", en: "Overflowing with growth, creativity, and new beginning energy." },
    "화": { ko: "열정, 표현력, 사교성의 에너지가 넘쳐요.", en: "Overflowing with passion, expressiveness, and sociability." },
    "토": { ko: "안정, 신뢰, 포용의 에너지가 넘쳐요.", en: "Overflowing with stability, trust, and embracing nature." },
    "금": { ko: "정의, 결단, 세련됨의 에너지가 넘쳐요.", en: "Overflowing with justice, decisiveness, and refinement." },
    "수": { ko: "지혜, 직관, 적응력의 에너지가 넘쳐요.", en: "Overflowing with wisdom, intuition, and adaptability." }
  };

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ${t.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${t.intro}


◈ ${t.ch1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${t.dayMaster}: ${stemName}
${L(stem.nature)}

${L(stem.personality)}

▸ ${t.strength}: ${L(stem.strength)}
▸ ${t.weakness}: ${L(stem.weakness)}
▸ ${t.hidden}: ${L(stem.secretSelf)}


◈ ${t.ch2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(sunZ.personality)}

▸ ${t.strength}: ${L(sunZ.strength)}
▸ ${L(sunZ.lifeTheme)}

❖ ${t.eastWest} ❖
${stemName} (${elementName}) + ${sunZName} (${sunZ.element})
${getElementCross(sajuElement, sunZ.element, lang)}


◈ ${t.ch3}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(moonZ.personality)}

${getElementCross(sajuElement, moonZ.element, lang)}
${ascZ ? `\n▸ ${isKo ? "첫인상" : "First Impression"}: ${isKo ? ascZ.ko : ascZ.en}` : ""}


◈ ${t.ch4}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wood ████${"░".repeat(5 - Math.min(balance.목, 5))} ${balance.목}
Fire ████${"░".repeat(5 - Math.min(balance.화, 5))} ${balance.화}
Earth ████${"░".repeat(5 - Math.min(balance.토, 5))} ${balance.토}
Metal ████${"░".repeat(5 - Math.min(balance.금, 5))} ${balance.금}
Water ████${"░".repeat(5 - Math.min(balance.수, 5))} ${balance.수}

▸ ${t.strongestEl}: ${strongestName} - ${L(strongDesc[strongest[0]])}
▸ ${t.weakestEl}: ${weakestName}


◈ ${t.ch5}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stageInfo ? `${L(stageInfo.name)}: ${L(stageInfo.meaning)}\n💡 ${L(stageInfo.lifeAdvice)}` : (isKo ? "독특한 인생 리듬을 가지고 있어요." : "You have a unique life rhythm.")}


◈ ${t.ch6}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ ${stemName}: ${L(stem.loveStyle)}
${venusZ ? `▸ Venus ${isKo ? venusZ.ko : venusZ.en}: ${L(PLANET_SIGNS.venus[venusZ.element])}` : ""}
▸ Moon ${moonZName}: ${L(moonZ.loveStyle)}


◈ ${t.ch7}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mercuryZ ? `Mercury ${isKo ? mercuryZ.ko : mercuryZ.en}: ${L(PLANET_SIGNS.mercury[mercuryZ.element])}` : ""}


◈ ${t.ch8}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${marsZ ? `Mars ${isKo ? marsZ.ko : marsZ.en}: ${L(PLANET_SIGNS.mars[marsZ.element])}` : ""}


◈ ${t.ch9}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${jupiterZ ? `Jupiter ${isKo ? jupiterZ.ko : jupiterZ.en}: ${L(PLANET_SIGNS.jupiter[jupiterZ.element])}` : ""}


◈ ${t.ch10}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ ${t.career}: ${L(stem.careerFit)}
▸ ${t.lifePattern}: ${L(stem.lifePattern)}


◈ ${t.ch11}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${shinsalList.length > 0 ? shinsalList.map((s: string) => {
  const info = SHINSAL_INFO[s];
  return info ? `▸ ${isKo ? info.ko : info.en}: ${L(info.meaning)}\n  💡 ${L(info.advice)}` : `▸ ${s}`;
}).join("\n\n") : (isKo ? "특별한 신살 없음. 자유롭게 길을 개척하세요." : "No special stars. Forge your own path freely.")}


◈ ${t.chChildhood}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.childhood)}

${isKo ? "이 시절의 경험이 지금의 당신을 만들었어요. 그때의 작은 아이에게 '괜찮아, 잘 해낼 거야'라고 말해주세요." : "These early experiences shaped who you are now. Tell that little child from back then, 'It's okay, you'll do great.'"}


◈ ${t.chShadow}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.shadowSelf)}

${isKo ? "그림자는 적이 아니에요. 인정하고 포용할 때, 그것은 당신의 힘이 됩니다." : "The shadow is not your enemy. When you acknowledge and embrace it, it becomes your strength."}


◈ ${t.chCrisis}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.crisis)}

${isKo ? "힘든 순간에 이 문장을 기억하세요: '이것도 지나갈 것이다.'" : "In difficult moments, remember this: 'This too shall pass.'"}


◈ ${t.chHealing}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.healing)}

${isKo ? "자신을 돌보는 것은 이기적인 게 아니에요. 가득 찬 컵만이 다른 사람에게 줄 수 있어요." : "Taking care of yourself isn't selfish. Only a full cup can give to others."}


◈ ${t.chFinal}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stemName} + ${sunZName} + ${moonZName}

${L(stem.destinyCall)}

${isKo ? `당신은 ${stemName}의 본질과 ${sunZName}의 빛, ${moonZName}의 감성을 가지고 이 세상에 태어났어요. 이 조합은 우주에서 단 하나뿐이에요.` : `You were born into this world with the essence of ${stemName}, the light of ${sunZName}, and the sensitivity of ${moonZName}. This combination is the only one in the universe.`}

★ ${t.remember} ★
${t.unique}

${isKo ? "당신의 존재 자체가 기적이에요. ✨" : "Your very existence is a miracle. ✨"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

export default function DestinyMatrixStory({ saju, astro, lang = "ko", className = "", useAI = false }: Props) {
  const isKo = lang === "ko";

  // AI 스트리밍 상태
  const [aiStory, setAiStory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [totalLength, setTotalLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 정적 스토리 (AI가 아닌 경우)
  const staticStory = useMemo(() => generateFullStory(saju, astro, lang), [saju, astro, lang]);

  // AI 스토리 생성 함수
  const generateAIStory = useCallback(async () => {
    logger.info("[DestinyMatrixStory] generateAIStory called", { saju, astro, lang });

    if (!saju || !astro) {
      logger.warn("[DestinyMatrixStory] Missing data:", { hasSaju: !!saju, hasAstro: !!astro });
      return;
    }

    setIsLoading(true);
    setAiStory("");
    setCurrentChapter(0);
    setError(null);

    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/destiny-story/generate-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saju,
          astro,
          locale: lang
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const isKoLang = lang === "ko";
          throw new Error(isKoLang
            ? "요청이 너무 많습니다. 30초 후 다시 시도해주세요."
            : "Too many requests. Please wait 30 seconds and try again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setError(data.error);
                break;
              }

              if (data.content) {
                setAiStory(prev => prev + data.content);
              }

              if (data.chapter) {
                setCurrentChapter(data.chapter);
              }

              if (data.status === "done") {
                setTotalLength(data.total_length || 0);
              }
            } catch {
              // JSON parse error, skip
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 스토리 생성 실패");
    } finally {
      setIsLoading(false);
    }
  }, [saju, astro, lang]);

  // AI 모드일 때 자동으로 스토리 생성
  useEffect(() => {
    logger.debug("[DestinyMatrixStory] useEffect check:", {
      useAI,
      hasSaju: !!saju,
      hasAstro: !!astro,
      sajuKeys: saju ? Object.keys(saju) : [],
      astroKeys: astro ? Object.keys(astro) : [],
      aiStoryLen: aiStory.length,
      isLoading
    });

    if (useAI && saju && astro && !aiStory && !isLoading) {
      logger.info("[DestinyMatrixStory] Calling generateAIStory...");
      generateAIStory();
    }
  }, [useAI, saju, astro, aiStory, isLoading, generateAIStory]);

  // 표시할 스토리 선택
  const displayStory = useAI ? aiStory : staticStory;

  if (!useAI && !staticStory) return null;

  return (
    <div className={`mt-8 ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <span className="text-purple-400 text-sm font-medium">
          {isKo ? "당신만을 위한 운명 이야기" : "Your Personal Destiny Story"}
          {useAI && <span className="ml-2 text-xs text-purple-300/70">✨ AI Generated</span>}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* AI 로딩 상태 표시 */}
      {useAI && isLoading && (
        <div className="mb-4 flex items-center gap-3 text-purple-300">
          <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">
            {isKo
              ? `AI가 당신만의 운명 이야기를 작성 중... (챕터 ${currentChapter}/15)`
              : `AI is writing your destiny story... (Chapter ${currentChapter}/15)`
            }
          </span>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
          <button
            onClick={generateAIStory}
            className="ml-4 underline hover:text-red-200"
          >
            {isKo ? "다시 시도" : "Retry"}
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900/80 to-purple-900/30 border border-purple-500/20 rounded-2xl p-6 md:p-8">
        {displayStory ? (
          <pre className="text-gray-200 text-base whitespace-pre-wrap font-sans leading-relaxed tracking-wide">
            {displayStory}
          </pre>
        ) : useAI && !isLoading && !error ? (
          <div className="text-center py-8">
            <button
              onClick={generateAIStory}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              {isKo ? "✨ AI 운명 스토리 생성하기" : "✨ Generate AI Destiny Story"}
            </button>
          </div>
        ) : null}
      </div>

      {/* 완료 후 글자 수 표시 */}
      {useAI && totalLength > 0 && !isLoading && (
        <div className="mt-4 text-center text-purple-400/60 text-xs">
          {isKo
            ? `총 ${totalLength.toLocaleString()}자의 운명 분석이 완성되었습니다.`
            : `Your ${totalLength.toLocaleString()} character destiny analysis is complete.`
          }
        </div>
      )}
    </div>
  );
}
