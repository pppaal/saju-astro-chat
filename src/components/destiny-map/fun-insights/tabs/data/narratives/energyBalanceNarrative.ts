/**
 * energyBalanceNarrative.ts - 에너지 밸런스 내러티브 생성
 */

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

  // Element combination interpretations
  const elementCombinations: Record<string, Record<string, { ko: string; en: string }>> = {
    wood: {
      fire: {
        ko: "나무가 강하고 불이 약하면, 시작하는 힘은 있지만 표현하고 완성하는 힘이 부족합니다. 아이디어는 많은데 실행이 약해요. 불 에너지(열정, 표현, 행동)를 보충하세요.",
        en: "Strong Wood with weak Fire means you can start things but lack power to express and complete. Many ideas but weak execution. Boost Fire energy (passion, expression, action)."
      },
      water: {
        ko: "나무가 강하고 물이 약하면, 뻗어나가려는 힘은 있지만 지혜와 깊이가 부족합니다. 충분히 생각하지 않고 행동할 수 있어요. 물 에너지(사색, 휴식, 깊이)를 보충하세요.",
        en: "Strong Wood with weak Water means expanding power exists but wisdom and depth are lacking. May act without enough thought. Boost Water energy (reflection, rest, depth)."
      },
      metal: {
        ko: "나무가 강하고 쇠가 약하면, 성장하는 힘은 있지만 정리하고 마무리하는 힘이 부족합니다. 시작은 잘하는데 끝을 못 볼 수 있어요. 쇠 에너지(결단, 마무리)를 보충하세요.",
        en: "Strong Wood with weak Metal means growth power exists but organizing and finishing power is lacking. Start well but may not finish. Boost Metal energy (decision, completion)."
      },
      earth: {
        ko: "나무가 강하고 흙이 약하면, 성장하려는 힘은 있지만 안정감이 부족합니다. 기반 없이 위로만 자라려 해요. 흙 에너지(안정, 중심)를 보충하세요.",
        en: "Strong Wood with weak Earth means growth drive exists but stability is lacking. Trying to grow upward without foundation. Boost Earth energy (stability, centering)."
      }
    },
    fire: {
      wood: {
        ko: "불이 강하고 나무가 약하면, 열정은 있지만 지속할 연료가 부족합니다. 빨리 타오르고 빨리 꺼져요. 나무 에너지(새로운 시작, 성장)를 보충하세요.",
        en: "Strong Fire with weak Wood means passion exists but fuel to sustain is lacking. Burns fast and dies fast. Boost Wood energy (new starts, growth)."
      },
      water: {
        ko: "불이 강하고 물이 약하면, 열정적이지만 감정 조절이 어렵습니다. 너무 뜨거워서 자신도 지치고 남도 지치게 해요. 물 에너지(냉정, 휴식)가 필요합니다.",
        en: "Strong Fire with weak Water means passionate but hard to control emotions. Too hot, exhausting yourself and others. Water energy (coolness, rest) is needed."
      },
      metal: {
        ko: "불이 강하고 쇠가 약하면, 표현력은 뛰어나지만 날카로운 결단력이 부족합니다. 감정에 휩쓸려 결정을 미루게 돼요. 쇠 에너지(결단, 냉정함)를 보충하세요.",
        en: "Strong Fire with weak Metal means excellent expression but lacking sharp decisiveness. Emotions delay decisions. Boost Metal energy (decision, coolness)."
      },
      earth: {
        ko: "불이 강하고 흙이 약하면, 열정은 넘치지만 안정감이 부족합니다. 불꽃처럼 이리저리 튀어요. 흙 에너지(안정, 중심 잡기)가 필요합니다.",
        en: "Strong Fire with weak Earth means overflowing passion but lacking stability. Bouncing around like sparks. Earth energy (stability, centering) is needed."
      }
    },
    earth: {
      wood: {
        ko: "흙이 강하고 나무가 약하면, 안정적이지만 변화와 성장이 어렵습니다. 너무 보수적이고 새로운 시도를 두려워해요. 나무 에너지(새로움, 도전)를 보충하세요.",
        en: "Strong Earth with weak Wood means stable but change and growth are difficult. Too conservative, fearing new attempts. Boost Wood energy (newness, challenge)."
      },
      fire: {
        ko: "흙이 강하고 불이 약하면, 안정적이지만 열정과 기쁨이 부족합니다. 무거워 보이고 재미가 없어요. 불 에너지(열정, 기쁨, 표현)를 보충하세요.",
        en: "Strong Earth with weak Fire means stable but lacking passion and joy. Seems heavy and no fun. Boost Fire energy (passion, joy, expression)."
      },
      metal: {
        ko: "흙이 강하고 쇠가 약하면, 포용력은 있지만 결단력이 부족합니다. 너무 받아들이기만 하고 정리를 못해요. 쇠 에너지(결단, 정리)를 보충하세요.",
        en: "Strong Earth with weak Metal means embracing but lacking decisiveness. Only accepting, can't organize. Boost Metal energy (decision, organizing)."
      },
      water: {
        ko: "흙이 강하고 물이 약하면, 안정적이지만 유연성이 부족합니다. 고집이 세고 변통이 안 돼요. 물 에너지(유연성, 적응력)를 보충하세요.",
        en: "Strong Earth with weak Water means stable but lacking flexibility. Stubborn and can't adapt. Boost Water energy (flexibility, adaptability)."
      }
    },
    metal: {
      wood: {
        ko: "쇠가 강하고 나무가 약하면, 날카롭지만 부드러움이 부족합니다. 너무 냉정하고 성장에 대한 열망이 적어요. 나무 에너지(부드러움, 성장)를 보충하세요.",
        en: "Strong Metal with weak Wood means sharp but lacking softness. Too cold with little desire for growth. Boost Wood energy (softness, growth)."
      },
      fire: {
        ko: "쇠가 강하고 불이 약하면, 결단력은 있지만 열정이 부족합니다. 차갑고 기계적으로 느껴질 수 있어요. 불 에너지(따뜻함, 열정)를 보충하세요.",
        en: "Strong Metal with weak Fire means decisive but lacking passion. May feel cold and mechanical. Boost Fire energy (warmth, passion)."
      },
      earth: {
        ko: "쇠가 강하고 흙이 약하면, 날카롭지만 포용력이 부족합니다. 비판적이고 다른 사람을 받아들이기 어려워해요. 흙 에너지(포용, 수용)를 보충하세요.",
        en: "Strong Metal with weak Earth means sharp but lacking embrace. Critical and hard to accept others. Boost Earth energy (embrace, acceptance)."
      },
      water: {
        ko: "쇠가 강하고 물이 약하면, 결단력은 있지만 깊이가 부족합니다. 표면적으로만 처리하고 넘어가요. 물 에너지(깊이, 지혜)를 보충하세요.",
        en: "Strong Metal with weak Water means decisive but lacking depth. Handling things only superficially. Boost Water energy (depth, wisdom)."
      }
    },
    water: {
      wood: {
        ko: "물이 강하고 나무가 약하면, 지혜는 있지만 실행력이 부족합니다. 생각만 하고 행동으로 옮기지 못해요. 나무 에너지(행동, 시작)를 보충하세요.",
        en: "Strong Water with weak Wood means wisdom exists but execution is lacking. Only thinking, not acting. Boost Wood energy (action, starting)."
      },
      fire: {
        ko: "물이 강하고 불이 약하면, 깊이는 있지만 표현력이 부족합니다. 속으로만 생각하고 밖으로 나누지 못해요. 불 에너지(표현, 공유)를 보충하세요.",
        en: "Strong Water with weak Fire means depth exists but expression is lacking. Thinking inside only, not sharing. Boost Fire energy (expression, sharing)."
      },
      earth: {
        ko: "물이 강하고 흙이 약하면, 유연하지만 중심이 없습니다. 이리저리 흘러다니기만 해요. 흙 에너지(중심, 안정)를 보충하세요.",
        en: "Strong Water with weak Earth means flexible but lacking center. Just flowing everywhere. Boost Earth energy (centering, stability)."
      },
      metal: {
        ko: "물이 강하고 쇠가 약하면, 깊이는 있지만 결단력이 부족합니다. 생각이 너무 많아서 결정을 못 내려요. 쇠 에너지(결단, 마무리)를 보충하세요.",
        en: "Strong Water with weak Metal means depth exists but decisiveness is lacking. Too many thoughts to decide. Boost Metal energy (decision, completion)."
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

    // Add combination interpretation
    const combinationKey = elementAnalysis.strongest;
    const weakKey = elementAnalysis.weakest;
    if (elementCombinations[combinationKey] && elementCombinations[combinationKey][weakKey]) {
      paragraphs.push(`🎯 【당신의 오행 조합 해석】`);
      paragraphs.push(elementCombinations[combinationKey][weakKey].ko);
      paragraphs.push('');
    }

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

    // Add combination interpretation
    const combinationKey = elementAnalysis.strongest;
    const weakKey = elementAnalysis.weakest;
    if (elementCombinations[combinationKey] && elementCombinations[combinationKey][weakKey]) {
      paragraphs.push(`🎯 【Your Five Elements Combination Interpretation】`);
      paragraphs.push(elementCombinations[combinationKey][weakKey].en);
      paragraphs.push('');
    }

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
