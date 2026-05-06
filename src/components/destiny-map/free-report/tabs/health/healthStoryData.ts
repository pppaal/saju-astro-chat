import type { HealthStory } from './types';

export function getHealthStory(dm: string, isKo: boolean): HealthStory {
  const stories: Record<string, HealthStory> = {
    "갑": {
      focus: isKo ? "간, 담낭, 눈, 근육, 신경계" : "Liver, gallbladder, eyes, muscles, nervous system",
      warning: isKo ? "스트레스를 받으면 간에 무리가 와요. 화를 참으면 몸에 쌓여요." : "Stress burdens your liver. Holding anger accumulates in your body.",
      lifestyle: isKo ? "규칙적인 운동으로 에너지를 발산하세요. 녹색 채소가 도움돼요." : "Release energy through regular exercise. Green vegetables help.",
      stress: isKo ? "화가 나면 바로 풀어야 해요. 운동, 산책으로 발산하세요." : "Release anger immediately through exercise or walking.",
      exercise: isKo ? "달리기, 등산, 테니스" : "Running, hiking, tennis",
      food: isKo ? "녹색 채소, 신맛 나는 음식, 콩나물" : "Green vegetables, sour foods, bean sprouts"
    },
    "을": {
      focus: isKo ? "간, 담낭, 목, 어깨, 신경" : "Liver, gallbladder, neck, shoulders, nerves",
      warning: isKo ? "목과 어깨에 긴장이 쌓여요. 신경이 예민해지기 쉬워요." : "Tension accumulates in neck and shoulders.",
      lifestyle: isKo ? "스트레칭과 요가가 잘 맞아요. 자연 속에서 충전하세요." : "Stretching and yoga suit you well. Recharge in nature.",
      stress: isKo ? "눈치 보느라 지치지 마세요. 가끔은 'NO'라고 말해도 괜찮아요." : "Don't exhaust yourself reading moods. It's okay to say 'NO'.",
      exercise: isKo ? "요가, 필라테스, 스트레칭" : "Yoga, Pilates, stretching",
      food: isKo ? "녹색 채소, 부추, 미나리, 허브차" : "Green vegetables, chives, herbal tea"
    },
    "병": {
      focus: isKo ? "심장, 소장, 혈압, 눈" : "Heart, small intestine, blood pressure, eyes",
      warning: isKo ? "열정이 과하면 심장에 무리가 와요. 과로에 주의하세요." : "Excessive passion burdens the heart. Watch overwork.",
      lifestyle: isKo ? "정기적인 휴식이 필수예요. 유산소 운동을 하세요." : "Regular rest is essential. Do cardio exercises.",
      stress: isKo ? "흥분하면 심장이 힘들어요. 심호흡, 명상이 도움돼요." : "Excitement strains your heart. Deep breathing helps.",
      exercise: isKo ? "수영, 조깅, 사이클링" : "Swimming, jogging, cycling",
      food: isKo ? "쓴맛 음식, 토마토, 빨간 과일" : "Bitter foods, tomatoes, red fruits"
    },
    "정": {
      focus: isKo ? "심장, 소장, 눈, 혈액순환" : "Heart, small intestine, eyes, circulation",
      warning: isKo ? "감정을 안으로 삼키면 심장이 답답해져요." : "Swallowing emotions makes your heart stuffy.",
      lifestyle: isKo ? "감정을 표현하는 게 건강에 좋아요. 일찍 자세요." : "Expressing emotions is good for health. Sleep early.",
      stress: isKo ? "속앓이하지 마세요. 일기를 쓰거나 털어놓으세요." : "Don't suffer silently. Write a diary or confide.",
      exercise: isKo ? "댄스, 에어로빅, 가벼운 조깅" : "Dance, aerobics, light jogging",
      food: isKo ? "쓴맛 음식, 적색 채소, 대추" : "Bitter foods, red vegetables, jujubes"
    },
    "무": {
      focus: isKo ? "위장, 비장, 소화기, 근육" : "Stomach, spleen, digestive system, muscles",
      warning: isKo ? "걱정하면 위장이 아파요. 불규칙한 식사에 주의하세요." : "Worry hurts your stomach. Watch irregular meals.",
      lifestyle: isKo ? "규칙적인 식사가 가장 중요해요. 황색 음식이 좋아요." : "Regular meals are most important. Yellow foods are good.",
      stress: isKo ? "걱정이 많으면 소화가 안 돼요. 한 번에 하나씩만 생각하세요." : "Too much worry prevents digestion. Think one at a time.",
      exercise: isKo ? "걷기, 등산, 필드 스포츠" : "Walking, hiking, field sports",
      food: isKo ? "황색 음식 (호박, 고구마, 옥수수)" : "Yellow foods (pumpkin, sweet potato, corn)"
    },
    "기": {
      focus: isKo ? "위장, 비장, 피부, 소화기" : "Stomach, spleen, skin, digestive system",
      warning: isKo ? "과로하면 소화력이 떨어져요. 스트레스가 피부로 나타나요." : "Overwork reduces digestion. Stress shows in skin.",
      lifestyle: isKo ? "잘 먹는 것보다 잘 쉬는 게 중요해요." : "Resting well is more important than eating well.",
      stress: isKo ? "남 걱정하느라 자신을 돌보지 못해요. 내 몸도 챙기세요." : "Worrying about others, you neglect yourself.",
      exercise: isKo ? "걷기, 정원 가꾸기, 가벼운 요가" : "Walking, gardening, light yoga",
      food: isKo ? "곡물, 뿌리채소, 꿀, 견과류" : "Grains, root vegetables, honey, nuts"
    },
    "경": {
      focus: isKo ? "폐, 대장, 피부, 코, 호흡기" : "Lungs, large intestine, skin, nose, respiratory",
      warning: isKo ? "슬픔을 삼키면 폐가 힘들어요. 건조한 환경에 주의하세요." : "Swallowing sadness burdens lungs. Watch dry environments.",
      lifestyle: isKo ? "깊은 호흡 연습이 도움돼요. 흰색 음식이 폐에 좋아요." : "Deep breathing helps. White foods are good for lungs.",
      stress: isKo ? "감정을 억누르면 호흡이 얕아져요. 울고 싶을 땐 우세요." : "Suppressing emotions shallows breathing. Cry when needed.",
      exercise: isKo ? "달리기, 수영, 호흡 운동" : "Running, swimming, breathing exercises",
      food: isKo ? "흰색 음식 (배, 무, 도라지, 마늘)" : "White foods (pear, radish, garlic)"
    },
    "신": {
      focus: isKo ? "폐, 대장, 피부, 호흡기, 치아" : "Lungs, large intestine, skin, respiratory, teeth",
      warning: isKo ? "예민한 성격이 피부와 호흡기에 영향을 줘요." : "Sensitive personality affects skin and respiratory.",
      lifestyle: isKo ? "밤 11시 전 수면이 피부 재생의 핵심이에요." : "Sleep before 11 PM is key to skin regeneration.",
      stress: isKo ? "완벽하려고 애쓰면 몸이 긴장해요. 70%도 괜찮아요." : "Striving for perfection stiffens your body.",
      exercise: isKo ? "요가, 태극권, 호흡 명상" : "Yoga, Tai Chi, breathing meditation",
      food: isKo ? "흰색 음식, 프로바이오틱스, 배" : "White foods, probiotics, pear"
    },
    "임": {
      focus: isKo ? "신장, 방광, 귀, 뼈, 생식기" : "Kidneys, bladder, ears, bones, reproductive",
      warning: isKo ? "물을 적게 마시면 신장에 무리가 와요." : "Drinking little water burdens kidneys.",
      lifestyle: isKo ? "물을 충분히 마시세요. 검은색 음식이 신장에 좋아요." : "Drink plenty of water. Black foods are good for kidneys.",
      stress: isKo ? "생각이 많으면 잠을 못 자요. 머릿속을 비우는 연습을 하세요." : "Too many thoughts prevent sleep. Practice emptying mind.",
      exercise: isKo ? "수영, 수중 에어로빅, 태극권" : "Swimming, water aerobics, Tai Chi",
      food: isKo ? "검은색 음식 (검은콩, 검은깨, 해조류)" : "Black foods (black beans, sesame, seaweed)"
    },
    "계": {
      focus: isKo ? "신장, 방광, 혈액, 림프, 귀" : "Kidneys, bladder, blood, lymph, ears",
      warning: isKo ? "감정을 너무 흡수하면 에너지가 고갈돼요." : "Absorbing too many emotions depletes energy.",
      lifestyle: isKo ? "따뜻하게 지내세요. 찬 음식은 피하세요." : "Stay warm. Avoid cold foods.",
      stress: isKo ? "남의 감정까지 다 느끼면 지쳐요. 경계를 지키세요." : "Feeling everyone's emotions exhausts you. Keep boundaries.",
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
}
