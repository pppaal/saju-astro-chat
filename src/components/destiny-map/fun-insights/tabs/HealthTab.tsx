"use client";

import type { TabProps } from './types';

interface HealthItem {
  emoji: string;
  organ: string;
  advice: string;
}

interface ChironInsight {
  emoji: string;
  title: string;
  message: string;
}

export default function HealthTab({ saju, astro, lang, isKo, data }: TabProps) {
  const healthAnalysis = data.healthAnalysis as HealthItem[] | null;
  const chironInsight = data.chironInsight as ChironInsight | null;
  const dayMasterName = data.dayMasterName || "";

  // 일간별 건강 정보
  const getHealthStory = (dm: string) => {
    const stories: Record<string, { focus: string; warning: string; lifestyle: string; stress: string; exercise: string; food: string }> = {
      "갑": {
        focus: isKo ? "간, 담낭, 눈, 근육, 신경계" : "Liver, gallbladder, eyes, muscles, nervous system",
        warning: isKo ? "스트레스를 받으면 간에 무리가 와요. 화를 참으면 몸에 쌓여요. 눈의 피로, 근육 경직에도 주의하세요." : "Stress burdens your liver. Holding anger accumulates in your body. Watch for eye fatigue and muscle stiffness.",
        lifestyle: isKo ? "규칙적인 운동으로 에너지를 발산하세요. 녹색 채소, 신맛 나는 음식이 도움돼요. 충분한 수면이 간 회복에 필수예요." : "Release energy through regular exercise. Green vegetables and sour foods help. Sufficient sleep is essential for liver recovery.",
        stress: isKo ? "화가 나면 바로 풀어야 해요. 운동, 산책, 글쓰기... 속에 담아두면 몸이 아파요." : "Release anger immediately. Exercise, walking, writing... keeping it inside makes your body sick.",
        exercise: isKo ? "달리기, 등산, 테니스 등 에너지를 발산하는 운동" : "Running, hiking, tennis - energy-releasing exercises",
        food: isKo ? "녹색 채소, 신맛 나는 음식 (레몬, 식초), 콩나물" : "Green vegetables, sour foods (lemon, vinegar), bean sprouts"
      },
      "을": {
        focus: isKo ? "간, 담낭, 목, 어깨, 신경" : "Liver, gallbladder, neck, shoulders, nerves",
        warning: isKo ? "목과 어깨에 긴장이 쌓여요. 섬세한 성격 때문에 신경이 예민해지기 쉬워요." : "Tension accumulates in neck and shoulders. Sensitive personality makes nerves easily strained.",
        lifestyle: isKo ? "스트레칭과 요가가 잘 맞아요. 목욕으로 긴장을 풀고, 자연 속에서 충전하세요." : "Stretching and yoga suit you well. Relax tension with baths and recharge in nature.",
        stress: isKo ? "눈치 보느라 지치지 마세요. 내 감정도 중요하니까요. 가끔은 'NO'라고 말해도 괜찮아요." : "Don't exhaust yourself reading moods. Your emotions matter too. It's okay to say 'NO' sometimes.",
        exercise: isKo ? "요가, 필라테스, 가벼운 스트레칭" : "Yoga, Pilates, light stretching",
        food: isKo ? "녹색 채소, 부추, 미나리, 허브차" : "Green vegetables, chives, water parsley, herbal tea"
      },
      "병": {
        focus: isKo ? "심장, 소장, 혈압, 눈, 혀" : "Heart, small intestine, blood pressure, eyes, tongue",
        warning: isKo ? "열정이 과하면 심장에 무리가 와요. 화를 내면 혈압이 올라가요. 과로와 수면 부족에 특히 주의하세요." : "Excessive passion burdens the heart. Anger raises blood pressure. Especially watch overwork and sleep deprivation.",
        lifestyle: isKo ? "정기적인 휴식이 필수예요. 심장 건강을 위해 유산소 운동을 하고, 쓴맛 나는 음식을 적당히 드세요." : "Regular rest is essential. Do cardio for heart health, and have bitter foods in moderation.",
        stress: isKo ? "흥분하면 심장이 힘들어요. 차분해지는 연습, 심호흡, 명상이 도움돼요." : "Excitement strains your heart. Practice calming down, deep breathing, and meditation.",
        exercise: isKo ? "수영, 조깅, 사이클링 등 유산소 운동" : "Swimming, jogging, cycling - cardio exercises",
        food: isKo ? "쓴맛 음식 (커피, 녹차, 씀바귀), 토마토, 빨간 과일" : "Bitter foods (coffee, green tea), tomatoes, red fruits"
      },
      "정": {
        focus: isKo ? "심장, 소장, 눈, 혈액순환" : "Heart, small intestine, eyes, blood circulation",
        warning: isKo ? "감정을 안으로 삼키면 심장이 답답해져요. 혼자 끙끙 앓으면 순환이 안 돼요." : "Swallowing emotions makes your heart stuffy. Suffering alone blocks circulation.",
        lifestyle: isKo ? "감정을 표현하는 게 건강에 좋아요. 따뜻한 차, 족욕, 반신욕으로 순환을 돕고, 일찍 자세요." : "Expressing emotions is good for health. Help circulation with warm tea, foot baths, half-baths, and keep early sleep schedules.",
        stress: isKo ? "속앓이하지 마세요. 일기를 쓰거나 믿을 사람에게 털어놓으세요. 표현이 치유예요." : "Don't suffer silently. Write a diary or confide in trusted people. Expression is healing.",
        exercise: isKo ? "댄스, 에어로빅, 가벼운 조깅" : "Dance, aerobics, light jogging",
        food: isKo ? "쓴맛 음식, 적색 채소와 과일, 대추" : "Bitter foods, red vegetables and fruits, jujubes"
      },
      "무": {
        focus: isKo ? "위장, 비장, 소화기, 입술, 근육" : "Stomach, spleen, digestive system, lips, muscles",
        warning: isKo ? "걱정하면 위장이 아파요. 불규칙한 식사와 과식에 주의하세요. 당뇨와 비만에도 신경 써야 해요." : "Worry hurts your stomach. Watch irregular meals and overeating. Also be mindful of diabetes and obesity.",
        lifestyle: isKo ? "규칙적인 식사가 가장 중요해요. 황색 음식이 좋아요. 단 음식은 적당히만 드세요." : "Regular meals are most important. Yellow foods are good. Eat sweet foods in moderation.",
        stress: isKo ? "걱정이 많으면 소화가 안 돼요. 한 번에 하나씩만 생각하세요. 지금 할 수 없는 건 내려놓으세요." : "Too much worry prevents digestion. Think about one thing at a time. Let go of what you can't do now.",
        exercise: isKo ? "걷기, 등산, 필드 스포츠" : "Walking, hiking, field sports",
        food: isKo ? "황색 음식 (호박, 고구마, 옥수수, 바나나)" : "Yellow foods (pumpkin, sweet potato, corn, banana)"
      },
      "기": {
        focus: isKo ? "위장, 비장, 피부, 소화기" : "Stomach, spleen, skin, digestive system",
        warning: isKo ? "과로하면 소화력이 떨어져요. 스트레스가 위장과 피부로 나타나요." : "Overwork reduces digestive power. Stress shows in stomach and skin.",
        lifestyle: isKo ? "잘 먹는 것보다 잘 쉬는 게 중요해요. 자연식, 제철 음식이 좋아요." : "Resting well is more important than eating well. Natural, seasonal foods are good.",
        stress: isKo ? "남 걱정하느라 자신을 돌보지 못해요. 내 몸과 마음도 챙기세요." : "Worrying about others, you neglect yourself. Take care of your body and mind too.",
        exercise: isKo ? "걷기, 정원 가꾸기, 가벼운 요가" : "Walking, gardening, light yoga",
        food: isKo ? "곡물, 뿌리채소, 꿀, 견과류" : "Grains, root vegetables, honey, nuts"
      },
      "경": {
        focus: isKo ? "폐, 대장, 피부, 코, 호흡기" : "Lungs, large intestine, skin, nose, respiratory system",
        warning: isKo ? "슬픔을 삼키면 폐가 힘들어요. 건조한 환경, 미세먼지에 주의하세요." : "Swallowing sadness burdens lungs. Watch dry environments and fine dust.",
        lifestyle: isKo ? "깊은 호흡 연습이 도움돼요. 흰색 음식이 폐에 좋아요. 수분 섭취를 충분히 하세요." : "Deep breathing practice helps. White foods are good for lungs. Drink plenty of water.",
        stress: isKo ? "감정을 억누르면 호흡이 얕아져요. 울고 싶을 땐 우세요. 그게 폐 건강에 좋아요." : "Suppressing emotions shallows breathing. Cry when you want to. That's good for lung health.",
        exercise: isKo ? "달리기, 수영, 호흡 운동, 무술" : "Running, swimming, breathing exercises, martial arts",
        food: isKo ? "흰색 음식 (배, 무, 도라지, 양파, 마늘)" : "White foods (pear, radish, bellflower root, onion, garlic)"
      },
      "신": {
        focus: isKo ? "폐, 대장, 피부, 호흡기, 치아" : "Lungs, large intestine, skin, respiratory, teeth",
        warning: isKo ? "예민한 성격이 피부와 호흡기에 영향을 줘요. 스트레스가 피부 트러블로 나타나요." : "Sensitive personality affects skin and respiratory system. Stress shows as skin troubles.",
        lifestyle: isKo ? "밤 11시 전 수면이 피부 재생의 핵심이에요. 실내 습도 50-60%로 유지하세요." : "Sleep before 11 PM is key to skin regeneration. Maintain 50-60% humidity.",
        stress: isKo ? "완벽하려고 애쓰면 몸이 긴장해요. '70%만 해도 괜찮다'는 마음을 가지세요." : "Striving for perfection stiffens your body. Practice mindset that '70% is good enough.'",
        exercise: isKo ? "요가, 태극권, 호흡 명상" : "Yoga, Tai Chi, breathing meditation",
        food: isKo ? "흰색 음식, 프로바이오틱스, 배, 은행" : "White foods, probiotics, pear, ginkgo"
      },
      "임": {
        focus: isKo ? "신장, 방광, 귀, 뼈, 생식기" : "Kidneys, bladder, ears, bones, reproductive system",
        warning: isKo ? "물을 적게 마시면 신장에 무리가 와요. 과로와 수면 부족이 뼈와 관절에 영향을 줘요." : "Drinking little water burdens kidneys. Overwork and sleep deprivation affect bones and joints.",
        lifestyle: isKo ? "물을 충분히 마시세요. 검은색 음식이 신장에 좋아요. 과로를 피하고 충분히 쉬세요." : "Drink plenty of water. Black foods are good for kidneys. Avoid overwork and rest enough.",
        stress: isKo ? "생각이 많으면 잠을 못 자요. 잠 못 자면 신장이 지쳐요. 머릿속을 비우는 연습을 하세요." : "Too many thoughts prevent sleep. Poor sleep exhausts kidneys. Practice emptying your mind.",
        exercise: isKo ? "수영, 수중 에어로빅, 태극권" : "Swimming, water aerobics, Tai Chi",
        food: isKo ? "검은색 음식 (검은콩, 검은깨, 해조류, 오골계)" : "Black foods (black beans, black sesame, seaweed)"
      },
      "계": {
        focus: isKo ? "신장, 방광, 혈액, 림프, 귀" : "Kidneys, bladder, blood, lymph, ears",
        warning: isKo ? "감정을 너무 흡수하면 에너지가 고갈돼요. 수분 부족과 추위에 약해요." : "Absorbing too many emotions depletes energy. Vulnerable to dehydration and cold.",
        lifestyle: isKo ? "따뜻하게 지내세요. 온수를 자주 마시고, 찬 음식은 피하세요. 명상과 수면이 중요해요." : "Stay warm. Drink warm water often and avoid cold foods. Meditation and sleep are important.",
        stress: isKo ? "남의 감정까지 다 느끼면 지쳐요. 경계를 지키세요. 내 에너지를 보호하는 것도 건강이에요." : "Feeling everyone's emotions exhausts you. Keep boundaries. Protecting your energy is also health.",
        exercise: isKo ? "수영, 명상, 부드러운 스트레칭" : "Swimming, meditation, gentle stretching",
        food: isKo ? "검은색 음식, 따뜻한 수프, 생강차" : "Black foods, warm soups, ginger tea"
      }
    };
    return stories[dm] || {
      focus: isKo ? "전반적인 건강 관리" : "Overall health management",
      warning: isKo ? "스트레스와 과로에 주의하세요" : "Watch for stress and overwork",
      lifestyle: isKo ? "규칙적인 생활이 중요해요" : "Regular lifestyle is important",
      stress: isKo ? "적절한 휴식을 취하세요" : "Take proper rest",
      exercise: isKo ? "자신에게 맞는 운동을 찾으세요" : "Find exercise that suits you",
      food: isKo ? "균형 잡힌 식사를 하세요" : "Eat balanced meals"
    };
  };

  const healthStory = getHealthStory(String(dayMasterName || ''));

  // 에너지 강도 분석
  const advancedAnalysis = (saju as Record<string, unknown>)?.advancedAnalysis as Record<string, unknown> | undefined;
  const extendedAnalysis = advancedAnalysis?.extended as Record<string, unknown> | undefined;
  const energyStrength = extendedAnalysis?.strength as Record<string, unknown> | undefined;
  const getEnergyLevel = () => {
    if (!energyStrength) return null;
    const levelVal = energyStrength.level || energyStrength.type || "";
    const level = String(levelVal);
    const lv = level.toLowerCase();

    if (lv.includes("강") || lv.includes("strong") || lv.includes("extreme")) {
      return {
        level: isKo ? "신강" : "Strong Energy",
        emoji: "🔥",
        desc: isKo
          ? "에너지가 넘치는 타입이에요. 활동적으로 움직이고 에너지를 발산해야 건강해요."
          : "You're an energetic type. Stay healthy by being active and releasing energy.",
        advice: isKo
          ? "가만히 있으면 오히려 몸이 무거워져요. 운동, 활동, 도전으로 에너지를 발산하세요."
          : "Staying still makes your body heavy. Release energy through exercise, activity, and challenges."
      };
    } else if (lv.includes("약") || lv.includes("weak")) {
      return {
        level: isKo ? "신약" : "Gentle Energy",
        emoji: "🌙",
        desc: isKo
          ? "섬세하고 예민한 타입이에요. 충분한 휴식과 보양이 필요해요."
          : "You're a delicate and sensitive type. You need sufficient rest and nourishment.",
        advice: isKo
          ? "무리하지 마세요. 쉬는 것도 능력이에요. 몸의 신호에 귀 기울이세요."
          : "Don't overdo it. Resting is also an ability. Listen to your body's signals."
      };
    }
    return {
      level: isKo ? "중화" : "Balanced Energy",
      emoji: "⚖️",
      desc: isKo
        ? "균형 잡힌 에너지를 가졌어요. 안정적인 리듬이 건강의 핵심이에요."
        : "You have balanced energy. Stable rhythm is key to your health.",
      advice: isKo
        ? "급격한 변화보다 꾸준한 관리가 좋아요. 무리하지 않는 선에서 규칙적으로 움직이세요."
        : "Steady management is better than drastic changes. Move regularly without overdoing it."
    };
  };

  const energyLevel = getEnergyLevel();

  return (
    <div className="space-y-6">
      {/* 에너지 강도 */}
      {energyLevel && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-orange-900/20 border border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{energyLevel.emoji}</span>
            <h3 className="text-lg font-bold text-orange-300">{isKo ? "나의 에너지 타입" : "My Energy Type"}: {energyLevel.level}</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-3">{energyLevel.desc}</p>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-orange-200">{energyLevel.advice}</p>
          </div>
        </div>
      )}

      {/* 건강 체크 포인트 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-red-900/20 border border-red-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💪</span>
          <h3 className="text-lg font-bold text-red-300">{isKo ? "건강 체크 포인트" : "Health Check Points"}</h3>
        </div>

        <div className="space-y-4">
          {/* 주의해야 할 부위 */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-300 font-bold mb-2 text-sm">🎯 {isKo ? "관리가 필요한 부위" : "Areas Needing Care"}</p>
            <p className="text-gray-200 text-sm leading-relaxed">{healthStory.focus}</p>
          </div>

          {/* 건강 경고 */}
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "이럴 때 조심하세요" : "Watch Out For This"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.warning}</p>
          </div>

          {/* 오행 기반 건강 분석 (있으면) */}
          {healthAnalysis && healthAnalysis.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 font-bold mb-3 text-sm">🔮 {isKo ? "오행 불균형에 따른 주의점" : "Element Imbalance Effects"}</p>
              <div className="space-y-2">
                {healthAnalysis.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <div>
                      <span className="text-purple-300 text-sm font-medium">{item.organ}:</span>
                      <span className="text-gray-300 text-sm ml-1">{item.advice}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 건강한 생활 팁 */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-300 font-bold mb-2 text-sm">💚 {isKo ? "건강하게 사는 법" : "Healthy Living Tips"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.lifestyle}</p>
          </div>

          {/* 추천 운동 & 음식 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-cyan-300 font-bold mb-2 text-sm">🏃 {isKo ? "추천 운동" : "Recommended Exercise"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{healthStory.exercise}</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-300 font-bold mb-2 text-sm">🍎 {isKo ? "좋은 음식" : "Good Foods"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{healthStory.food}</p>
            </div>
          </div>

          {/* 스트레스 관리 */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">🧘</span>
              <span className="text-blue-200 leading-relaxed">{healthStory.stress}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 치유 포인트 (Chiron) */}
      {chironInsight && (
        <div className="rounded-2xl bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-indigo-900/30 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{chironInsight.emoji}</span>
            <h3 className="text-lg font-bold text-pink-300">{chironInsight.title}</h3>
          </div>
          <p className="text-gray-200 leading-relaxed text-sm mb-4">
            {chironInsight.message}
          </p>
          <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <p className="text-sm text-pink-200">
              {isKo
                ? "💝 치유는 약점을 인정하는 것에서 시작됩니다. 당신의 상처는 다른 사람을 도울 수 있는 선물이 될 거예요."
                : "💝 Healing begins with acknowledging weakness. Your wounds can become gifts to help others."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
