/**
 * growthHealingNarrative.ts - 성장과 치유 내러티브 생성
 */

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
