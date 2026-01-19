"use client";

import type { TabProps } from './types';
import { getHealthMatrixAnalysis } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';

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

export default function HealthTab({ saju, astro, isKo, data }: TabProps) {
  const healthAnalysis = (data as Record<string, unknown>).healthAnalysis as HealthItem[] | null;
  const chironInsight = (data as Record<string, unknown>).chironInsight as ChironInsight | null;
  const dayMasterName = data.dayMasterName || "";

  // 매트릭스 분석 호출
  const matrixHealth = getHealthMatrixAnalysis(saju || undefined, astro || undefined, isKo ? 'ko' : 'en');

  // 일간별 건강 정보
  const getHealthStory = (dm: string) => {
    const stories: Record<string, { focus: string; warning: string; lifestyle: string; stress: string; exercise: string; food: string }> = {
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
  };

  const healthStory = getHealthStory(String(dayMasterName || ''));

  // 에너지 강도 분석
  const advancedAnalysis = (saju as Record<string, unknown>)?.advancedAnalysis as Record<string, unknown> | undefined;
  const extendedAnalysis = advancedAnalysis?.extended as Record<string, unknown> | undefined;
  const energyStrength = extendedAnalysis?.strength as Record<string, unknown> | undefined;

  const getEnergyLevel = () => {
    if (!energyStrength) return null;
    const levelVal = energyStrength.level || energyStrength.type || "";
    const level = String(levelVal).toLowerCase();

    if (level.includes("강") || level.includes("strong") || level.includes("extreme")) {
      return {
        level: isKo ? "신강" : "Strong Energy",
        emoji: "🔥",
        desc: isKo ? "에너지가 넘치는 타입이에요. 활동적으로 에너지를 발산해야 건강해요." : "You're an energetic type. Stay healthy by being active.",
        advice: isKo ? "가만히 있으면 오히려 몸이 무거워져요. 운동으로 발산하세요." : "Staying still makes your body heavy. Release through exercise."
      };
    } else if (level.includes("약") || level.includes("weak")) {
      return {
        level: isKo ? "신약" : "Gentle Energy",
        emoji: "🌙",
        desc: isKo ? "섬세하고 예민한 타입이에요. 충분한 휴식과 보양이 필요해요." : "You're delicate and sensitive. You need rest and nourishment.",
        advice: isKo ? "무리하지 마세요. 쉬는 것도 능력이에요." : "Don't overdo it. Resting is also an ability."
      };
    }
    return {
      level: isKo ? "중화" : "Balanced Energy",
      emoji: "⚖️",
      desc: isKo ? "균형 잡힌 에너지를 가졌어요. 안정적인 리듬이 건강의 핵심이에요." : "You have balanced energy. Stable rhythm is key to health.",
      advice: isKo ? "급격한 변화보다 꾸준한 관리가 좋아요." : "Steady management is better than drastic changes."
    };
  };

  const energyLevel = getEnergyLevel();

  // 헬퍼 함수들
  const getElementColor = (element: string) => {
    const colors: Record<string, string> = { '목': 'bg-green-500', '화': 'bg-red-500', '토': 'bg-yellow-500', '금': 'bg-gray-400', '수': 'bg-blue-500' };
    return colors[element] || 'bg-gray-500';
  };

  const getElementEmoji = (element: string) => {
    const emojis: Record<string, string> = { '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧' };
    return emojis[element] || '⚡';
  };

  const getStatusColor = (status: 'excess' | 'balanced' | 'deficient') => {
    const colors = { excess: 'text-orange-400', balanced: 'text-green-400', deficient: 'text-blue-400' };
    return colors[status];
  };

  const getStatusText = (status: 'excess' | 'balanced' | 'deficient') => {
    if (status === 'excess') return isKo ? '과다' : 'Excess';
    if (status === 'balanced') return isKo ? '균형' : 'Balanced';
    return isKo ? '부족' : 'Deficient';
  };

  const getVitalityColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-400';
    if (score >= 60) return 'from-yellow-500 to-amber-400';
    if (score >= 40) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. 종합 생명력 점수 (매트릭스 기반) */}
      {matrixHealth && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/30 border border-emerald-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💚</span>
              <h3 className="text-lg font-bold text-emerald-300">
                {isKo ? "종합 생명력 지수" : "Vitality Index"}
              </h3>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {matrixHealth.vitalityScore}<span className="text-lg text-emerald-500">/100</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getVitalityColor(matrixHealth.vitalityScore)} transition-all duration-500 rounded-full`}
                style={{ width: `${matrixHealth.vitalityScore}%` }}
              />
            </div>
          </div>

          <p className="text-gray-300 text-sm">
            {matrixHealth.vitalityScore >= 80
              ? (isKo ? "훌륭한 생명력! 현재 상태를 유지하세요." : "Excellent vitality! Maintain your current state.")
              : matrixHealth.vitalityScore >= 60
              ? (isKo ? "양호한 상태예요. 몇 가지 균형을 맞추면 더 좋아져요." : "Good shape. A few adjustments will improve things.")
              : matrixHealth.vitalityScore >= 40
              ? (isKo ? "관리가 필요해요. 아래 조언을 참고하세요." : "Care is needed. Refer to the advice below.")
              : (isKo ? "집중적인 관리가 필요해요. 건강을 최우선으로 하세요." : "Intensive care is needed. Make health your priority.")}
          </p>
        </div>
      )}

      {/* 2. 오행 건강 밸런스 (L1 기반) */}
      {matrixHealth && matrixHealth.elementBalance.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚖️</span>
            <h3 className="text-lg font-bold text-purple-300">
              {isKo ? "오행 건강 밸런스" : "Five Element Health Balance"}
            </h3>
          </div>

          <div className="space-y-3">
            {matrixHealth.elementBalance.map((el, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{getElementEmoji(el.element)}</span>
                    <span className="text-gray-300">{el.element}</span>
                  </span>
                  <span className={`font-medium ${getStatusColor(el.status)}`}>
                    {el.score}% · {getStatusText(el.status)}
                  </span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getElementColor(el.element)} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.min(el.score * 3, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-400">
            {isKo ? "* 이상적인 균형은 각 오행이 15-25% 범위입니다" : "* Ideal balance is 15-25% for each element"}
          </p>
        </div>
      )}

      {/* 3. 취약 부위 경고 (매트릭스 기반) */}
      {matrixHealth && matrixHealth.vulnerableAreas.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-bold text-rose-300">
              {isKo ? "건강 취약 포인트" : "Health Vulnerability Points"}
            </h3>
          </div>

          <div className="space-y-3">
            {matrixHealth.vulnerableAreas.map((area, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  area.risk === 'high' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-orange-500/10 border-orange-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{area.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold ${area.risk === 'high' ? 'text-rose-300' : 'text-orange-300'}`}>
                        {area.organ}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        area.risk === 'high' ? 'bg-rose-500/30 text-rose-300' : 'bg-orange-500/30 text-orange-300'
                      }`}>
                        {area.risk === 'high' ? (isKo ? '주의 필요' : 'Attention') : (isKo ? '관찰 필요' : 'Monitor')}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{area.advice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 생명력 사이클 (L6 기반) */}
      {matrixHealth?.lifeCycleStage && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔄</span>
            <h3 className="text-lg font-bold text-cyan-300">
              {isKo ? "현재 생명력 사이클" : "Current Life Cycle Stage"}
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-cyan-400">
                {matrixHealth.lifeCycleStage.stage}
              </span>
              <div className="flex items-center gap-1">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 rounded-sm ${
                      i < matrixHealth.lifeCycleStage!.vitalityLevel ? 'bg-cyan-400' : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              {isKo ? matrixHealth.lifeCycleStage.description.ko : matrixHealth.lifeCycleStage.description.en}
            </p>
            <p className="text-cyan-200 text-sm">💡 {matrixHealth.lifeCycleStage.advice}</p>
          </div>
        </div>
      )}

      {/* 5. 신살 건강 경고 (L8 기반) */}
      {matrixHealth && matrixHealth.shinsalHealth.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-lg font-bold text-amber-300">
              {isKo ? "신살 × 행성 건강 분석" : "Shinsal × Planet Health Analysis"}
            </h3>
          </div>

          <div className="space-y-3">
            {matrixHealth.shinsalHealth.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.fusion.icon}</span>
                  <span className="font-bold text-amber-300">{item.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{item.planet}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    item.fusion.score >= 7 ? 'bg-green-500/30 text-green-300' :
                    item.fusion.score >= 4 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
                  }`}>
                    {item.fusion.level}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? item.healthWarning.ko : item.healthWarning.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. 에너지 타입 */}
      {energyLevel && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-orange-900/20 border border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{energyLevel.emoji}</span>
            <h3 className="text-lg font-bold text-orange-300">
              {isKo ? "나의 에너지 타입" : "My Energy Type"}: {energyLevel.level}
            </h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-3">{energyLevel.desc}</p>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-orange-200">{energyLevel.advice}</p>
          </div>
        </div>
      )}

      {/* 7. 건강 체크 포인트 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-red-900/20 border border-red-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💪</span>
          <h3 className="text-lg font-bold text-red-300">{isKo ? "건강 체크 포인트" : "Health Check Points"}</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-300 font-bold mb-2 text-sm">🎯 {isKo ? "관리가 필요한 부위" : "Areas Needing Care"}</p>
            <p className="text-gray-200 text-sm leading-relaxed">{healthStory.focus}</p>
          </div>

          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "이럴 때 조심하세요" : "Watch Out For This"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.warning}</p>
          </div>

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

          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-300 font-bold mb-2 text-sm">💚 {isKo ? "건강하게 사는 법" : "Healthy Living Tips"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{healthStory.lifestyle}</p>
          </div>

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

          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">🧘</span>
              <span className="text-blue-200 leading-relaxed">{healthStory.stress}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 8. Chiron 치유 심층 분석 (L10 기반) */}
      {(matrixHealth?.chironHealing || chironInsight) && (
        <div className="rounded-2xl bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-indigo-900/30 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{matrixHealth?.chironHealing?.icon || chironInsight?.emoji || '💫'}</span>
            <h3 className="text-lg font-bold text-pink-300">
              {isKo ? "Chiron 치유 심층 분석" : "Chiron Deep Healing Analysis"}
            </h3>
          </div>

          {matrixHealth?.chironHealing ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-pink-300 font-bold mb-2 text-sm">💔 {isKo ? "상처 영역" : "Wound Area"}</p>
                <p className="text-gray-300 text-sm">
                  {isKo ? matrixHealth.chironHealing.woundArea.ko : matrixHealth.chironHealing.woundArea.en}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold mb-2 text-sm">🌈 {isKo ? "치유 경로" : "Healing Path"}</p>
                <p className="text-gray-300 text-sm">
                  {isKo ? matrixHealth.chironHealing.healingPath.ko : matrixHealth.chironHealing.healingPath.en}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-300 font-bold mb-2 text-sm">✨ {isKo ? "치유자 잠재력" : "Healer Potential"}</p>
                <p className="text-gray-300 text-sm">
                  {isKo ? matrixHealth.chironHealing.healerPotential.ko : matrixHealth.chironHealing.healerPotential.en}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm text-gray-400">{isKo ? "치유력" : "Healing Power"}</span>
                <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                    style={{ width: `${matrixHealth.chironHealing.score * 10}%` }}
                  />
                </div>
                <span className="text-pink-400 font-bold">{matrixHealth.chironHealing.score}/10</span>
              </div>
            </div>
          ) : chironInsight && (
            <>
              <p className="text-gray-200 leading-relaxed text-sm mb-4">{chironInsight.message}</p>
              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-sm text-pink-200">
                  {isKo
                    ? "💝 치유는 약점을 인정하는 것에서 시작됩니다. 당신의 상처는 다른 사람을 도울 수 있는 선물이 될 거예요."
                    : "💝 Healing begins with acknowledging weakness. Your wounds can become gifts to help others."}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="health"
        matrixData={{ matrixHealth }}
      />
    </div>
  );
}
