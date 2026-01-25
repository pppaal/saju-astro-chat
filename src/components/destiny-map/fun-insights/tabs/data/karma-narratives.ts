/**
 * @file Extended karma narrative generators
 * Creates personalized, rich narratives (~20+ lines) for karma analysis
 */

import type { DayMasterInfo, NorthNodeInfo, SaturnInfo, ShinsalInfo } from './karma-types';
import { dayMasterSimple, northNodeSimple, saturnSimple, shinsalSimple } from './karma-data';

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

  if (dayMasterInfo) {
    if (isKo) {
      paragraphs.push(
        `당신의 영혼은 ${dayMasterInfo.emoji} "${dayMasterInfo.simpleKo}"의 에너지를 타고 태어났습니다.`
      );
      paragraphs.push(dayMasterInfo.metaphorKo);
      paragraphs.push(
        `이 에너지는 당신이 세상을 바라보는 방식, 결정을 내리는 방식, 그리고 사람들과 관계 맺는 방식 모두에 깊이 스며들어 있습니다. 어린 시절부터 이런 성향이 자연스럽게 나타났을 것입니다.`
      );
      paragraphs.push(
        `${dayMasterInfo.strengthKo} - 이것이 당신의 타고난 무기입니다. 하지만 모든 강점에는 그림자도 있습니다. ${dayMasterInfo.watchOutKo}`
      );
      paragraphs.push(
        `당신에게 어울리는 색상은 ${dayMasterInfo.luckyColorKo}입니다. 이 색을 가까이 두면 당신의 에너지가 더 안정되고 조화롭게 흐릅니다.`
      );
    } else {
      paragraphs.push(
        `Your soul was born with the energy of ${dayMasterInfo.emoji} "${dayMasterInfo.simpleEn}".`
      );
      paragraphs.push(dayMasterInfo.metaphorEn);
      paragraphs.push(
        `This energy permeates how you see the world, make decisions, and form relationships. You've likely noticed these tendencies naturally appearing since childhood.`
      );
      paragraphs.push(
        `${dayMasterInfo.strengthEn} - This is your innate gift. But every strength has its shadow. ${dayMasterInfo.watchOutEn}`
      );
      paragraphs.push(
        `Your harmonious color is ${dayMasterInfo.luckyColorEn}. Keeping this color close helps your energy flow more balanced and steady.`
      );
    }
  }

  if (soulType) {
    if (isKo) {
      paragraphs.push('');
      paragraphs.push(`영혼 유형 분석에서 당신은 "${soulType.title}" 유형으로 나타납니다.`);
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push(
          `당신을 대표하는 키워드: ${soulType.traits.join(', ')}. 이 특성들은 당신의 영혼이 이번 생에서 표현하고자 하는 본질적인 에너지입니다.`
        );
      }
    } else {
      paragraphs.push('');
      paragraphs.push(`Soul type analysis reveals you as the "${soulType.title}" type.`);
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push(
          `Keywords representing you: ${soulType.traits.join(', ')}. These traits are the essential energies your soul seeks to express in this lifetime.`
        );
      }
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      isKo
        ? '영혼의 정체성을 분석하기 위한 데이터가 부족합니다. 생년월일시 정보가 있으면 더 깊은 분석이 가능합니다.'
        : 'Not enough data to analyze soul identity. Birth date and time would enable deeper analysis.'
    );
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
  } else if (northNodeInfo) {
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
    paragraphs.push(
      isKo
        ? '이번 생의 방향을 분석하기 위한 출생시간 데이터가 필요합니다.'
        : 'Birth time data is needed to analyze this life\'s direction.'
    );
  }

  return paragraphs;
}

// ============================================================
// Section 3: Past Life Energy Narrative (전생의 에너지)
// Combines Past Life Hints + Shinsal stars
// ============================================================

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

  if (isKo) {
    paragraphs.push(
      `🔮 전생의 에너지는 신비로운 영역입니다. 이 분석은 영감을 주기 위한 것이며, 절대적인 진실보다는 자기 성찰의 도구로 활용하세요.`
    );
  } else {
    paragraphs.push(
      `🔮 Past life energy is a mystical realm. This analysis is meant for inspiration - use it as a tool for self-reflection rather than absolute truth.`
    );
  }

  // Past life theme from karmaAnalysis
  if (pastLifeTheme) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🌀 【전생의 모습】`);
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push(`✨ 가져온 재능: ${pastLifeTheme.talents}`);
      paragraphs.push(`📖 이번 생 숙제: ${pastLifeTheme.lessons}`);
    } else {
      paragraphs.push(`🌀 【Past Life Vision】`);
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push(`✨ Talents brought: ${pastLifeTheme.talents}`);
      paragraphs.push(`📖 This life's homework: ${pastLifeTheme.lessons}`);
    }
  }

  // Past life hints from matrix
  if (pastLifeHints.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💫 【신살 × 행성 조합으로 본 전생 에너지】`);
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}: ${hint.hint.ko}`);
      });
    } else {
      paragraphs.push(`💫 【Past Life Energy from Shinsal × Planet Combinations】`);
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}: ${hint.hint.en}`);
      });
    }
  }

  // Shinsal stars
  if (luckyStars.length > 0 || challengeStars.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`⭐ 【타고난 별들】`);
      paragraphs.push(
        `태어날 때 우주가 당신에게 특별한 별들을 선물했습니다. 이 별들은 당신의 잠재력과 도전을 나타냅니다.`
      );
    } else {
      paragraphs.push(`⭐ 【Stars You Were Born With】`);
      paragraphs.push(
        `The universe gifted you special stars at birth. These stars represent your potential and challenges.`
      );
    }

    if (luckyStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '✨ 축복의 별:' : '✨ Blessing Stars:');
      luckyStars.slice(0, 3).forEach(starName => {
        const info = shinsalSimple[starName];
        if (info) {
          paragraphs.push(`${info.emoji} ${starName}: ${isKo ? info.storyKo : info.storyEn}`);
          paragraphs.push(`   → ${isKo ? info.adviceKo : info.adviceEn}`);
        }
      });
    }

    if (challengeStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '🌟 도전의 별 (극복하면 강해져요):' : '🌟 Challenge Stars (Grow by overcoming):');
      challengeStars.slice(0, 3).forEach(starName => {
        const info = shinsalSimple[starName];
        if (info) {
          paragraphs.push(`${info.emoji} ${starName}: ${isKo ? info.storyKo : info.storyEn}`);
          paragraphs.push(`   → ${isKo ? info.adviceKo : info.adviceEn}`);
        }
      });
    }
  }

  if (paragraphs.length <= 1) {
    paragraphs.push(
      isKo
        ? '전생 에너지 분석을 위한 데이터가 충분하지 않습니다.'
        : 'Not enough data for past life energy analysis.'
    );
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
      paragraphs.push(`🌟 【이번 생의 사명】`);
      paragraphs.push(
        `모든 영혼은 이번 생에서 이루고자 하는 특별한 목적을 가지고 태어납니다. 당신의 영혼이 선택한 사명은:`
      );
      paragraphs.push(`🎯 핵심 사명: ${soulMission.core}`);
      paragraphs.push(`💫 표현 방식: ${soulMission.expression}`);
      paragraphs.push(`✨ 성취의 순간: ${soulMission.fulfillment}`);
      paragraphs.push(
        `이 사명을 따라갈 때, 당신은 가장 충만하고 의미 있는 삶을 살게 됩니다. 때때로 힘들어도, 이것이 당신의 영혼이 원하는 길입니다.`
      );
    } else {
      paragraphs.push(`🌟 【This Life's Mission】`);
      paragraphs.push(
        `Every soul is born with a special purpose to fulfill this lifetime. Your soul's chosen mission is:`
      );
      paragraphs.push(`🎯 Core mission: ${soulMission.core}`);
      paragraphs.push(`💫 Expression: ${soulMission.expression}`);
      paragraphs.push(`✨ Fulfillment moment: ${soulMission.fulfillment}`);
      paragraphs.push(
        `Following this mission leads to the most fulfilling and meaningful life. Though sometimes difficult, this is the path your soul desires.`
      );
    }
  }

  if (woundToHeal) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💝 【치유해야 할 마음의 상처】`);
      paragraphs.push(
        `우리 모두는 치유해야 할 상처를 가지고 있습니다. 이 상처를 인정하고 치유하는 것이 성장의 핵심입니다.`
      );
      paragraphs.push(`💔 아픈 곳: ${woundToHeal.wound}`);
      paragraphs.push(
        `이 상처는 어쩌면 전생에서 온 것일 수도, 어린 시절의 경험일 수도 있습니다. 중요한 것은 이제 이것을 치유할 준비가 되었다는 것입니다.`
      );
      paragraphs.push(`🩹 치유의 길: ${woundToHeal.healingPath}`);
      paragraphs.push(`🎁 치유 후의 선물: ${woundToHeal.gift}`);
      paragraphs.push(
        `상처가 치유되면, 그것은 오히려 당신의 가장 큰 강점이 됩니다. 같은 아픔을 겪는 다른 사람들을 도울 수 있는 지혜가 생깁니다.`
      );
    } else {
      paragraphs.push(`💝 【Heart Wounds to Heal】`);
      paragraphs.push(
        `We all carry wounds that need healing. Acknowledging and healing these wounds is key to growth.`
      );
      paragraphs.push(`💔 The wound: ${woundToHeal.wound}`);
      paragraphs.push(
        `This wound might come from past lives or childhood experiences. What matters is that you're now ready to heal it.`
      );
      paragraphs.push(`🩹 Healing path: ${woundToHeal.healingPath}`);
      paragraphs.push(`🎁 Gift after healing: ${woundToHeal.gift}`);
      paragraphs.push(
        `Once healed, this wound becomes your greatest strength. You gain wisdom to help others experiencing similar pain.`
      );
    }
  }

  if (karmicRelations.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💫 【카르마적 관계 패턴】`);
      paragraphs.push(
        `어떤 사람들과의 관계에서 강한 끌림이나 반복되는 갈등을 경험했다면, 그것은 카르마적 연결 때문일 수 있습니다.`
      );
      karmicRelations.slice(0, 3).forEach(rel => {
        paragraphs.push(`${rel.fusion.icon} ${rel.relation} × ${rel.aspect} (${rel.fusion.level})`);
        paragraphs.push(`   ${rel.meaning.ko}`);
      });
      paragraphs.push(
        `이 패턴들을 인식하면, 관계에서 더 의식적인 선택을 할 수 있습니다.`
      );
    } else {
      paragraphs.push(`💫 【Karmic Relationship Patterns】`);
      paragraphs.push(
        `If you've experienced strong attraction or recurring conflicts with certain people, it may be due to karmic connections.`
      );
      karmicRelations.slice(0, 3).forEach(rel => {
        paragraphs.push(`${rel.fusion.icon} ${rel.relation} × ${rel.aspect} (${rel.fusion.level})`);
        paragraphs.push(`   ${rel.meaning.en}`);
      });
      paragraphs.push(
        `Recognizing these patterns allows for more conscious choices in relationships.`
      );
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      isKo
        ? '성장과 치유 분석을 위한 데이터가 충분하지 않습니다.'
        : 'Not enough data for growth and healing analysis.'
    );
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
    paragraphs.push(
      isKo
        ? '오행 에너지 분석을 위한 데이터가 충분하지 않습니다.'
        : 'Not enough data for Five Elements energy analysis.'
    );
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

    paragraphs.push(
      `Five Elements balance isn't fixed - it changes with seasons, age, and environment. Consciously supplement lacking energy while finding natural harmony.`
    );
  }

  return paragraphs;
}
