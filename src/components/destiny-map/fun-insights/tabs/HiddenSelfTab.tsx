"use client";

import type { TabProps } from './types';
import { getShadowPersonalityAnalysis } from '../analyzers/matrixAnalyzer';
import type { ShadowPersonalityResult } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';

// 숨겨진 자아 분석을 위한 확장 인터페이스
interface HiddenSelfAnalysis {
  lilithShadow: ShadowPersonalityResult['lilithShadow'] & {
    icon?: string;
    sibsin?: string;
    description?: { ko: string; en: string };
    integration?: { ko: string; en: string };
  } | null;
  hiddenPotential: ShadowPersonalityResult['hiddenPotential'] & {
    icon?: string;
    description?: { ko: string; en: string };
    activation?: { ko: string; en: string };
  } | null;
  chiron?: {
    icon: string;
    element: string;
    wound: { ko: string; en: string };
    healing: { ko: string; en: string };
    gift: { ko: string; en: string };
  };
  vertex?: {
    icon: string;
    element: string;
    fatePattern: { ko: string; en: string };
    turningPoints: { ko: string; en: string };
  };
  specialShinsal?: Array<{
    icon: string;
    shinsal: string;
    planet: string;
    description: { ko: string; en: string };
    hiddenStrength: { ko: string; en: string };
  }>;
  twelfthHouse?: {
    icon: string;
    planets: string[];
    description: { ko: string; en: string };
    advice: { ko: string; en: string };
  };
  shadowScore: number;
  shadowMessage: { ko: string; en: string };
}

// 숨겨진 자아 분석 함수 (확장)
function getHiddenSelfAnalysis(
  saju: TabProps['saju'],
  astro: TabProps['astro'],
  isKo: boolean
): HiddenSelfAnalysis | null {
  const shadowBase = getShadowPersonalityAnalysis(
    saju ?? undefined,
    astro ?? undefined,
    isKo ? 'ko' : 'en'
  );

  if (!shadowBase && !saju && !astro) return null;

  const dayElement = saju?.dayMaster?.element || 'wood';

  // 오행별 아이콘
  const elementIcons: Record<string, string> = {
    '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧',
    'wood': '🌳', 'fire': '🔥', 'earth': '🏔️', 'metal': '⚔️', 'water': '💧',
  };

  // Chiron 상처 분석
  const chironWounds: Record<string, { wound: { ko: string; en: string }; healing: { ko: string; en: string }; gift: { ko: string; en: string } }> = {
    'wood': {
      wound: { ko: '자기 표현과 성장에 대한 상처', en: 'Wounds around self-expression and growth' },
      healing: { ko: '창의적 활동을 통해 치유됩니다', en: 'Healing through creative activities' },
      gift: { ko: '다른 사람의 성장을 돕는 능력', en: 'Ability to help others grow' },
    },
    'fire': {
      wound: { ko: '인정과 열정에 대한 상처', en: 'Wounds around recognition and passion' },
      healing: { ko: '자기 빛을 발하며 치유됩니다', en: 'Healing by shining your own light' },
      gift: { ko: '다른 사람에게 영감을 주는 능력', en: 'Ability to inspire others' },
    },
    'earth': {
      wound: { ko: '안정과 소속감에 대한 상처', en: 'Wounds around stability and belonging' },
      healing: { ko: '자신만의 기반을 만들며 치유됩니다', en: 'Healing by building your own foundation' },
      gift: { ko: '다른 사람에게 안정감을 주는 능력', en: 'Ability to provide stability to others' },
    },
    'metal': {
      wound: { ko: '가치와 판단에 대한 상처', en: 'Wounds around value and judgment' },
      healing: { ko: '자기 기준을 세우며 치유됩니다', en: 'Healing by establishing your own standards' },
      gift: { ko: '진정한 가치를 알아보는 능력', en: 'Ability to recognize true value' },
    },
    'water': {
      wound: { ko: '감정과 깊이에 대한 상처', en: 'Wounds around emotions and depth' },
      healing: { ko: '감정을 수용하며 치유됩니다', en: 'Healing by accepting emotions' },
      gift: { ko: '깊은 공감 능력', en: 'Deep empathy ability' },
    },
  };

  // Vertex 운명 패턴
  const vertexPatterns: Record<string, { fatePattern: { ko: string; en: string }; turningPoints: { ko: string; en: string } }> = {
    'wood': {
      fatePattern: { ko: '새로운 시작과 관련된 운명적 만남', en: 'Fated meetings related to new beginnings' },
      turningPoints: { ko: '성장과 확장의 순간에 인생이 바뀝니다', en: 'Life changes at moments of growth and expansion' },
    },
    'fire': {
      fatePattern: { ko: '열정과 창조와 관련된 운명적 만남', en: 'Fated meetings related to passion and creation' },
      turningPoints: { ko: '자기 표현의 순간에 인생이 바뀝니다', en: 'Life changes at moments of self-expression' },
    },
    'earth': {
      fatePattern: { ko: '안정과 현실화와 관련된 운명적 만남', en: 'Fated meetings related to stability and manifestation' },
      turningPoints: { ko: '기반을 다지는 순간에 인생이 바뀝니다', en: 'Life changes when building foundations' },
    },
    'metal': {
      fatePattern: { ko: '결단과 정화와 관련된 운명적 만남', en: 'Fated meetings related to decisions and purification' },
      turningPoints: { ko: '내려놓는 순간에 인생이 바뀝니다', en: 'Life changes at moments of letting go' },
    },
    'water': {
      fatePattern: { ko: '직관과 영성과 관련된 운명적 만남', en: 'Fated meetings related to intuition and spirituality' },
      turningPoints: { ko: '깊은 통찰의 순간에 인생이 바뀝니다', en: 'Life changes at moments of deep insight' },
    },
  };

  // 12하우스 무의식 패턴
  const twelfthHousePatterns: Record<string, { description: { ko: string; en: string }; advice: { ko: string; en: string } }> = {
    'wood': {
      description: { ko: '숨겨진 야망과 성장 욕구가 있습니다', en: 'Hidden ambition and desire for growth' },
      advice: { ko: '명상과 자연 속에서 내면을 탐구하세요', en: 'Explore your inner self through meditation and nature' },
    },
    'fire': {
      description: { ko: '숨겨진 창조적 에너지가 있습니다', en: 'Hidden creative energy exists' },
      advice: { ko: '혼자만의 창작 시간을 가지세요', en: 'Have alone time for creative work' },
    },
    'earth': {
      description: { ko: '숨겨진 물질적 불안이 있습니다', en: 'Hidden material insecurity exists' },
      advice: { ko: '내면의 안정감을 키우세요', en: 'Build inner sense of security' },
    },
    'metal': {
      description: { ko: '숨겨진 완벽주의 성향이 있습니다', en: 'Hidden perfectionist tendencies exist' },
      advice: { ko: '자기 용서를 연습하세요', en: 'Practice self-forgiveness' },
    },
    'water': {
      description: { ko: '숨겨진 영적 감수성이 있습니다', en: 'Hidden spiritual sensitivity exists' },
      advice: { ko: '꿈과 직관을 신뢰하세요', en: 'Trust your dreams and intuition' },
    },
  };

  // 특수 신살 분석 (괴강살, 현침살 등)
  const specialShinsalList: Array<{ shinsal: string; planet: string; description: { ko: string; en: string }; hiddenStrength: { ko: string; en: string } }> = [];

  // saju.shinsal 또는 saju.sinsal에서 특수 신살 확인
  const shinsalArray = Array.isArray(saju?.shinsal) ? saju.shinsal : [];
  const unluckyList = saju?.sinsal?.unluckyList || [];

  const specialShinsals = ['괴강살', '현침살', '양인살', '도화살'];
  const shinsalIcons: Record<string, string> = {
    '괴강살': '⚔️',
    '현침살': '🎯',
    '양인살': '🗡️',
    '도화살': '🌸',
  };

  const shinsalPlanets: Record<string, string> = {
    '괴강살': '명왕성',
    '현침살': '해왕성',
    '양인살': '화성',
    '도화살': '금성',
  };

  const shinsalDescriptions: Record<string, { description: { ko: string; en: string }; hiddenStrength: { ko: string; en: string } }> = {
    '괴강살': {
      description: { ko: '강렬한 카리스마와 결단력이 숨어있습니다', en: 'Hidden intense charisma and decisiveness' },
      hiddenStrength: { ko: '위기 상황에서 빛나는 리더십', en: 'Leadership that shines in crisis' },
    },
    '현침살': {
      description: { ko: '예리한 직관과 통찰력이 숨어있습니다', en: 'Hidden sharp intuition and insight' },
      hiddenStrength: { ko: '문제의 핵심을 꿰뚫는 능력', en: 'Ability to see the core of problems' },
    },
    '양인살': {
      description: { ko: '강한 추진력과 용기가 숨어있습니다', en: 'Hidden strong drive and courage' },
      hiddenStrength: { ko: '어려운 상황을 돌파하는 힘', en: 'Power to break through difficulties' },
    },
    '도화살': {
      description: { ko: '매력적인 카리스마가 숨어있습니다', en: 'Hidden charming charisma' },
      hiddenStrength: { ko: '사람을 끌어당기는 매력', en: 'Magnetism that attracts people' },
    },
  };

  // 신살 분석
  for (const shinsal of specialShinsals) {
    const found = shinsalArray.some((s) =>
      (typeof s === 'string' ? s : s?.shinsal || s?.name || '')?.includes(shinsal)
    ) || unluckyList.some((s) =>
      (typeof s === 'string' ? s : s?.name || '')?.includes(shinsal)
    );

    if (found && shinsalDescriptions[shinsal]) {
      specialShinsalList.push({
        shinsal,
        planet: shinsalPlanets[shinsal] || '명왕성',
        ...shinsalDescriptions[shinsal],
      });
    }
  }

  // 그림자 점수 계산
  let shadowScore = 50;
  if (shadowBase?.lilithShadow) shadowScore += 15;
  if (shadowBase?.hiddenPotential) shadowScore += 10;
  if (specialShinsalList.length > 0) shadowScore += specialShinsalList.length * 5;
  shadowScore = Math.min(shadowScore, 100);

  const shadowMessage = {
    ko: shadowScore >= 75
      ? '숨겨진 자아의 에너지가 매우 강합니다. 이를 인식하고 통합하면 큰 힘이 됩니다.'
      : shadowScore >= 50
      ? '숨겨진 자아와 연결할 수 있는 잠재력이 있습니다. 내면 탐구를 통해 발견하세요.'
      : '숨겨진 자아가 조용히 작용합니다. 명상이나 꿈 기록으로 접근해보세요.',
    en: shadowScore >= 75
      ? 'Hidden self energy is very strong. Recognizing and integrating it becomes great power.'
      : shadowScore >= 50
      ? 'You have potential to connect with your hidden self. Discover it through inner exploration.'
      : 'Hidden self works quietly. Try approaching through meditation or dream journaling.',
  };

  return {
    lilithShadow: shadowBase?.lilithShadow ? {
      ...shadowBase.lilithShadow,
      icon: '🌑',
      description: shadowBase.lilithShadow.shadowSelf,
      integration: shadowBase.lilithShadow.integration,
    } : null,
    hiddenPotential: shadowBase?.hiddenPotential ? {
      ...shadowBase.hiddenPotential,
      icon: '🍀',
      description: shadowBase.hiddenPotential.potential,
      activation: {
        ko: '이 잠재력을 활성화하려면 관련 영역에서 작은 시도를 해보세요',
        en: 'To activate this potential, try small attempts in related areas',
      },
    } : null,
    chiron: {
      icon: '🩹',
      element: elementIcons[dayElement] || '🌟',
      ...chironWounds[dayElement] || chironWounds['earth'],
    },
    vertex: {
      icon: '✨',
      element: elementIcons[dayElement] || '🌟',
      ...vertexPatterns[dayElement] || vertexPatterns['earth'],
    },
    specialShinsal: specialShinsalList.map((s) => ({
      ...s,
      icon: shinsalIcons[s.shinsal] || '⚡',
    })),
    twelfthHouse: {
      icon: '🌊',
      planets: [],
      ...twelfthHousePatterns[dayElement] || twelfthHousePatterns['earth'],
    },
    shadowScore,
    shadowMessage,
  };
}

export default function HiddenSelfTab({ isKo, saju, astro }: TabProps) {
  const hiddenSelf = getHiddenSelfAnalysis(saju, astro, isKo);

  return (
    <div className="space-y-6">
      {/* 숨겨진 자아 소개 */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌑</span>
          <div>
            <h3 className="text-lg font-bold text-gray-300">{isKo ? '숨겨진 나 (Hidden Self)' : 'Hidden Self'}</h3>
            <p className="text-gray-500 text-xs">{isKo ? '무의식과 그림자 속 숨겨진 에너지' : 'Hidden energy in the unconscious and shadow'}</p>
          </div>
        </div>

        {hiddenSelf && (
          <>
            {/* 그림자 에너지 점수 */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/30 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-300 font-bold text-sm">{isKo ? '숨겨진 자아 에너지' : 'Hidden Self Energy'}</p>
                <span className="text-2xl font-bold text-gray-400">{hiddenSelf.shadowScore}{isKo ? '점' : 'pts'}</span>
              </div>
              <div className="h-3 bg-gray-900/50 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-600 to-gray-500 transition-all duration-700"
                  style={{ width: `${hiddenSelf.shadowScore}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {isKo ? hiddenSelf.shadowMessage.ko : hiddenSelf.shadowMessage.en}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Lilith 그림자 자아 (L10) */}
      {hiddenSelf?.lilithShadow && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hiddenSelf.lilithShadow.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-purple-300">{isKo ? '억압된 욕구 (Lilith)' : 'Suppressed Desires (Lilith)'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '무의식 속 숨겨진 본능과 욕망' : 'Hidden instincts and desires in the unconscious'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ml-auto">L10</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{hiddenSelf.lilithShadow.fusion.icon}</span>
              <span className="text-white font-medium">Lilith × {hiddenSelf.lilithShadow.element}</span>
              {hiddenSelf.lilithShadow.sibsin && (
                <span className="text-gray-400 text-sm">× {hiddenSelf.lilithShadow.sibsin}</span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {isKo ? hiddenSelf.lilithShadow.description?.ko : hiddenSelf.lilithShadow.description?.en}
            </p>
            <div className="p-3 rounded-lg bg-purple-500/15 border border-purple-500/25">
              <p className="text-purple-300 text-xs font-bold mb-1">{isKo ? '💜 통합 방법' : '💜 Integration'}</p>
              <p className="text-gray-300 text-xs">
                {isKo ? hiddenSelf.lilithShadow.integration?.ko : hiddenSelf.lilithShadow.integration?.en}
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            {isKo
              ? '* 릴리스는 억압된 본능적 욕구를 나타냅니다. 이를 인정하면 더 완전한 자아를 실현할 수 있어요.'
              : '* Lilith represents suppressed instinctual desires. Acknowledging them helps realize a more complete self.'}
          </p>
        </div>
      )}

      {/* Chiron 치유 포인트 (L10) */}
      {hiddenSelf?.chiron && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-teal-900/20 border border-teal-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hiddenSelf.chiron.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-teal-300">{isKo ? '치유 포인트 (Chiron)' : 'Healing Point (Chiron)'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '상처와 치유, 그리고 치유자의 선물' : 'Wound, healing, and the healer\'s gift'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 ml-auto">L10</span>
          </div>

          <div className="space-y-3">
            {/* 상처 */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💔</span>
                <p className="text-rose-300 font-bold text-sm">{isKo ? '핵심 상처' : 'Core Wound'}</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {isKo ? hiddenSelf.chiron.wound.ko : hiddenSelf.chiron.wound.en}
              </p>
            </div>

            {/* 치유 */}
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🌿</span>
                <p className="text-teal-300 font-bold text-sm">{isKo ? '치유 경로' : 'Healing Path'}</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {isKo ? hiddenSelf.chiron.healing.ko : hiddenSelf.chiron.healing.en}
              </p>
            </div>

            {/* 선물 */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎁</span>
                <p className="text-amber-300 font-bold text-sm">{isKo ? '치유자의 선물' : 'Healer\'s Gift'}</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {isKo ? hiddenSelf.chiron.gift.ko : hiddenSelf.chiron.gift.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Part of Fortune 숨겨진 행운 (L10) */}
      {hiddenSelf?.hiddenPotential && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hiddenSelf.hiddenPotential.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-amber-300">{isKo ? '숨겨진 행운 (Part of Fortune)' : 'Hidden Fortune (Part of Fortune)'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '물질적 성공과 행운이 숨어있는 영역' : 'Area where material success and luck hide'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ml-auto">L10</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{hiddenSelf.hiddenPotential.fusion.icon}</span>
              <span className="text-white font-medium">Part of Fortune × {hiddenSelf.hiddenPotential.element}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {isKo ? hiddenSelf.hiddenPotential.description?.ko : hiddenSelf.hiddenPotential.description?.en}
            </p>
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/25">
              <p className="text-amber-300 text-xs font-bold mb-1">{isKo ? '✨ 활성화 방법' : '✨ Activation'}</p>
              <p className="text-gray-300 text-xs">
                {isKo ? hiddenSelf.hiddenPotential.activation?.ko : hiddenSelf.hiddenPotential.activation?.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vertex 운명의 만남 (L10) */}
      {hiddenSelf?.vertex && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hiddenSelf.vertex.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? '운명의 만남 (Vertex)' : 'Fated Meetings (Vertex)'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '운명적 만남과 인생 전환점' : 'Fated encounters and life turning points'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 ml-auto">L10</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤝</span>
                <p className="text-fuchsia-300 font-bold text-sm">{isKo ? '운명적 만남 패턴' : 'Fated Meeting Pattern'}</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {isKo ? hiddenSelf.vertex.fatePattern.ko : hiddenSelf.vertex.fatePattern.en}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔄</span>
                <p className="text-purple-300 font-bold text-sm">{isKo ? '인생 전환점' : 'Life Turning Points'}</p>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {isKo ? hiddenSelf.vertex.turningPoints.ko : hiddenSelf.vertex.turningPoints.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 특수 신살 × 행성 (L8) */}
      {hiddenSelf?.specialShinsal && hiddenSelf.specialShinsal.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚔️</span>
            <div>
              <h3 className="text-lg font-bold text-indigo-300">{isKo ? '특수 신살 × 행성' : 'Special Shinsal × Planets'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '숨겨진 강점과 잠재력' : 'Hidden strengths and potential'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 ml-auto">L8</span>
          </div>

          <div className="space-y-3">
            {hiddenSelf.specialShinsal.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-white font-bold text-sm">{item.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-indigo-300 text-sm">{item.planet}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">
                  {isKo ? item.description.ko : item.description.en}
                </p>
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-green-300 text-xs">
                    <span className="font-bold">{isKo ? '숨겨진 강점: ' : 'Hidden strength: '}</span>
                    {isKo ? item.hiddenStrength.ko : item.hiddenStrength.en}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 무의식 패턴 (12하우스) */}
      {hiddenSelf?.twelfthHouse && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hiddenSelf.twelfthHouse.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-cyan-300">{isKo ? '무의식 패턴 (12하우스)' : 'Unconscious Pattern (12th House)'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '숨겨진 두려움과 영적 잠재력' : 'Hidden fears and spiritual potential'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {isKo ? hiddenSelf.twelfthHouse.description.ko : hiddenSelf.twelfthHouse.description.en}
            </p>
            <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/25">
              <p className="text-cyan-300 text-xs font-bold mb-1">{isKo ? '🌊 접근 방법' : '🌊 Approach'}</p>
              <p className="text-gray-300 text-xs">
                {isKo ? hiddenSelf.twelfthHouse.advice.ko : hiddenSelf.twelfthHouse.advice.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 데이터 없을 때 */}
      {!hiddenSelf && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6 text-center">
          <span className="text-4xl mb-4 block">🌑</span>
          <h3 className="text-lg font-bold text-gray-300 mb-2">
            {isKo ? '숨겨진 자아 분석을 위해 더 많은 정보가 필요해요' : 'More info needed for hidden self analysis'}
          </h3>
          <p className="text-gray-500 text-sm">
            {isKo
              ? '사주와 점성 정보가 있으면 릴리스, 카이론, 버텍스 등 심층 분석을 제공해드려요.'
              : 'With saju and astrology data, we can provide deep analysis of Lilith, Chiron, Vertex, and more.'}
          </p>
        </div>
      )}

      {/* 마무리 팁 */}
      {hiddenSelf && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-sm text-center">
            {isKo
              ? '💜 그림자 자아를 인정하고 통합하면, 당신은 더욱 완전한 존재가 됩니다.'
              : '💜 By acknowledging and integrating your shadow self, you become a more complete being.'}
          </p>
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="hidden"
        matrixData={{ hiddenSelf }}
      />
    </div>
  );
}
