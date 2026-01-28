/**
 * @file Extended karma narrative generators
 * Creates personalized, rich narratives (~20+ lines) for karma analysis
 */

import { dayMasterSimple, northNodeSimple, saturnSimple, shinsalSimple } from './karma-data';
import { dayMasterExtendedNarratives, northNodeExtendedNarratives, saturnExtendedNarratives, shinsalExtendedNarratives } from './karma-narratives-data';


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

  if (dayMasterInfo && dayMaster) {
    // Check if we have extended narrative for this day master
    const extendedNarrative = dayMasterExtendedNarratives[dayMaster];
    if (extendedNarrative) {
      const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
      narrativeLines.forEach(line => paragraphs.push(line));
      paragraphs.push('');
      // Add color recommendation
      if (isKo) {
        paragraphs.push(`🎨 【어울리는 색상】`);
        paragraphs.push(`당신에게 어울리는 색상은 ${dayMasterInfo.luckyColorKo}입니다.`);
        paragraphs.push(`이 색을 옷, 소품, 인테리어에 활용하면 당신의 에너지가 더 안정되고 조화롭게 흐릅니다.`);
      } else {
        paragraphs.push(`🎨 【Your Harmonious Colors】`);
        paragraphs.push(`Your harmonious colors are ${dayMasterInfo.luckyColorEn}.`);
        paragraphs.push(`Using these colors in clothing, accessories, and interior design helps your energy flow more balanced and steady.`);
      }
    } else {
      // Fallback to original simple version
      if (isKo) {
        paragraphs.push(`🌟 【일간(日干) 분석 - 당신 영혼의 본질】`);
        paragraphs.push('');
        paragraphs.push(
          `사주(四柱)에서 '일간'은 당신 자체를 나타냅니다. 태어난 날의 천간(天干)이 바로 당신의 영혼이 어떤 에너지로 이 세상에 왔는지를 보여줍니다.`
        );
        paragraphs.push('');
        paragraphs.push(
          `당신의 일간은 ${dayMasterInfo.emoji} "${dayMasterInfo.simpleKo}"입니다.`
        );
        paragraphs.push('');
        paragraphs.push(dayMasterInfo.metaphorKo);
        paragraphs.push('');
        paragraphs.push(
          `이 에너지는 당신이 세상을 바라보는 방식, 결정을 내리는 방식, 그리고 사람들과 관계 맺는 방식 모두에 깊이 스며들어 있습니다.`
        );
        paragraphs.push('');
        paragraphs.push(`어린 시절부터 이런 성향이 자연스럽게 나타났을 것입니다. 부모님이나 주변 사람들도 아마 이 특성을 알아챘을 거예요.`);
        paragraphs.push('');
        paragraphs.push(`💪 【당신의 타고난 강점】`);
        paragraphs.push(dayMasterInfo.strengthKo);
        paragraphs.push('');
        paragraphs.push(`⚠️ 【조심할 부분】`);
        paragraphs.push(`모든 강점에는 그림자도 있습니다. ${dayMasterInfo.watchOutKo}`);
        paragraphs.push('');
        paragraphs.push(`🎨 【어울리는 색상】`);
        paragraphs.push(
          `당신에게 어울리는 색상은 ${dayMasterInfo.luckyColorKo}입니다.`
        );
        paragraphs.push(`이 색을 옷, 소품, 인테리어에 활용하면 당신의 에너지가 더 안정되고 조화롭게 흐릅니다.`);
      } else {
        paragraphs.push(`🌟 【Day Master Analysis - The Essence of Your Soul】`);
        paragraphs.push('');
        paragraphs.push(
          `In Four Pillars (Saju), the 'Day Master' represents you yourself. The Heavenly Stem of your birth day shows what energy your soul brought into this world.`
        );
        paragraphs.push('');
        paragraphs.push(
          `Your Day Master is ${dayMasterInfo.emoji} "${dayMasterInfo.simpleEn}".`
        );
        paragraphs.push('');
        paragraphs.push(dayMasterInfo.metaphorEn);
        paragraphs.push('');
        paragraphs.push(
          `This energy permeates how you see the world, make decisions, and form relationships.`
        );
        paragraphs.push('');
        paragraphs.push(`These tendencies have naturally appeared since childhood. Your parents and those around you probably noticed these traits too.`);
        paragraphs.push('');
        paragraphs.push(`💪 【Your Innate Strength】`);
        paragraphs.push(dayMasterInfo.strengthEn);
        paragraphs.push('');
        paragraphs.push(`⚠️ 【Watch Out For】`);
        paragraphs.push(`Every strength has its shadow. ${dayMasterInfo.watchOutEn}`);
        paragraphs.push('');
        paragraphs.push(`🎨 【Your Harmonious Colors】`);
        paragraphs.push(
          `Your harmonious colors are ${dayMasterInfo.luckyColorEn}.`
        );
        paragraphs.push(`Using these colors in clothing, accessories, and interior design helps your energy flow more balanced and steady.`);
      }
    }
  }

  if (soulType) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🔮 【영혼 유형 분석】`);
      paragraphs.push('');
      paragraphs.push(`동서양 분석을 종합한 결과, 당신은 "${soulType.title}" 유형으로 나타납니다.`);
      paragraphs.push('');
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push('');
        paragraphs.push(`✨ 당신을 대표하는 키워드: ${soulType.traits.join(' • ')}`);
        paragraphs.push('');
        paragraphs.push(
          `이 특성들은 당신의 영혼이 이번 생에서 표현하고자 하는 본질적인 에너지입니다. 이 키워드들과 공명하는 활동이나 환경을 찾으면, 자연스럽게 에너지가 흐르고 성취감을 느낄 수 있습니다.`
        );
      }
    } else {
      paragraphs.push(`🔮 【Soul Type Analysis】`);
      paragraphs.push('');
      paragraphs.push(`Combining Eastern and Western analysis, you emerge as the "${soulType.title}" type.`);
      paragraphs.push('');
      paragraphs.push(soulType.description);
      if (soulType.traits && soulType.traits.length > 0) {
        paragraphs.push('');
        paragraphs.push(`✨ Keywords representing you: ${soulType.traits.join(' • ')}`);
        paragraphs.push('');
        paragraphs.push(
          `These traits are the essential energies your soul seeks to express this lifetime. Finding activities and environments that resonate with these keywords allows energy to flow naturally and brings fulfillment.`
        );
      }
    }
  }

  if (paragraphs.length === 0) {
    if (isKo) {
      paragraphs.push(`🌟 【영혼의 정체성에 대하여】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석을 위한 데이터가 부족하지만, 모든 사람은 고유한 영혼의 에너지를 가지고 태어납니다.`);
      paragraphs.push('');
      paragraphs.push(`당신이 자연스럽게 끌리는 것, 어릴 때부터 좋아했던 것, 노력하지 않아도 잘하는 것... 이런 것들이 당신 영혼의 본질을 보여주는 단서입니다.`);
      paragraphs.push('');
      paragraphs.push(`어떤 상황에서 가장 '나답다'고 느끼나요? 어떤 활동을 할 때 시간 가는 줄 모르나요? 그 순간들이 바로 당신의 영혼이 빛나는 순간입니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 생년월일시 정보가 있으면 더 정확한 일간 분석이 가능합니다.`);
    } else {
      paragraphs.push(`🌟 【About Soul Identity】`);
      paragraphs.push('');
      paragraphs.push(`While detailed analysis data isn't available, everyone is born with unique soul energy.`);
      paragraphs.push('');
      paragraphs.push(`What you're naturally drawn to, what you've loved since childhood, what you do well without trying... these are clues revealing your soul's essence.`);
      paragraphs.push('');
      paragraphs.push(`In what situations do you feel most 'yourself'? During what activities does time fly? Those moments are when your soul shines.`);
      paragraphs.push('');
      paragraphs.push(`💡 More accurate Day Master analysis is possible with birth date and time information.`);
    }
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
  } else if (northNodeInfo && northNodeHouse) {
    // Check if we have extended narrative for this north node house
    const extendedNarrative = northNodeExtendedNarratives[northNodeHouse];
    if (extendedNarrative) {
      const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
      narrativeLines.forEach(line => paragraphs.push(line));
      paragraphs.push('');
      // Add south node info
      if (southNodeHouse) {
        if (isKo) {
          paragraphs.push(`☋ 【사우스노드 ${southNodeHouse}하우스 - 전생의 패턴】`);
          paragraphs.push(`당신의 사우스노드는 ${southNodeHouse}하우스에 있습니다. 이 영역에서는 이미 충분한 경험을 쌓았습니다.`);
          paragraphs.push(`여기에 머무는 것은 편안하지만, 성장을 위해서는 반대 방향(노스노드)으로 나아가야 합니다.`);
        } else {
          paragraphs.push(`☋ 【South Node ${southNodeHouse}th House - Past Life Pattern】`);
          paragraphs.push(`Your South Node is in the ${southNodeHouse}th house. You've already gained sufficient experience in this area.`);
          paragraphs.push(`Staying here is comfortable, but growth requires moving toward the opposite direction (North Node).`);
        }
      }
    } else {
      // Fallback to original simple version
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
  }

  if (saturnInfo && saturnHouse) {
    paragraphs.push('');
    // Check if we have extended narrative for this saturn house
    const saturnExtended = saturnExtendedNarratives[saturnHouse];
    if (saturnExtended) {
      const narrativeLines = isKo ? saturnExtended.ko : saturnExtended.en;
      narrativeLines.forEach(line => paragraphs.push(line));
    } else {
      // Fallback to original simple version
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
  }

  if (paragraphs.length === 0) {
    if (isKo) {
      paragraphs.push(`🧭 【이번 생의 방향에 대하여】`);
      paragraphs.push('');
      paragraphs.push(`상세한 분석을 위한 출생시간 데이터가 부족하지만, 이번 생의 방향에 대한 보편적인 지혜를 나눌 수 있습니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 【편안함 vs 성장】`);
      paragraphs.push(`우리는 모두 '익숙한 것'과 '성장해야 할 것' 사이에서 선택해야 합니다. 쉬운 길을 계속 가면 편하지만 성장이 없고, 어려운 길을 가면 힘들지만 성장합니다.`);
      paragraphs.push('');
      paragraphs.push(`🔄 【반복되는 패턴】`);
      paragraphs.push(`인생에서 비슷한 상황이 계속 반복된다면, 그것은 아직 배우지 못한 레슨이 있다는 신호입니다. 같은 유형의 사람을 만나거나, 같은 문제가 생기거나, 같은 실수를 한다면 그 패턴을 인식하세요.`);
      paragraphs.push('');
      paragraphs.push(`🌱 【작은 불편함이 성장의 시작】`);
      paragraphs.push(`뭔가가 조금 불편하고, 조금 두렵고, 조금 어색하다면... 그것이 바로 성장의 방향일 수 있습니다. 영혼은 쉬운 것을 배우러 오지 않았어요.`);
      paragraphs.push('');
      paragraphs.push(`출생 시간 정보가 있으면 노스노드와 토성 분석으로 더 구체적인 방향을 알 수 있습니다.`);
    } else {
      paragraphs.push(`🧭 【About This Life's Direction】`);
      paragraphs.push('');
      paragraphs.push(`While detailed analysis needs birth time data, here's some universal wisdom about life direction.`);
      paragraphs.push('');
      paragraphs.push(`💡 【Comfort vs Growth】`);
      paragraphs.push(`We all must choose between 'the familiar' and 'what we need to grow into.' Easy paths are comfortable but bring no growth; difficult paths are hard but bring development.`);
      paragraphs.push('');
      paragraphs.push(`🔄 【Repeating Patterns】`);
      paragraphs.push(`If similar situations keep repeating in life, it signals lessons not yet learned. If you meet the same types of people, face the same problems, or make the same mistakes, recognize that pattern.`);
      paragraphs.push('');
      paragraphs.push(`🌱 【Small Discomfort Starts Growth】`);
      paragraphs.push(`If something feels slightly uncomfortable, slightly scary, slightly awkward... that might be the direction of growth. Your soul didn't come here to learn easy things.`);
      paragraphs.push('');
      paragraphs.push(`With birth time information, North Node and Saturn analysis can reveal more specific direction.`);
    }
  }

  return paragraphs;
}



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

  // Opening narrative
  if (isKo) {
    paragraphs.push(
      `🔮 전생과 카르마는 눈에 보이지 않는 영역입니다. 이 분석은 과학적 증명보다는 동양 철학과 점성술의 지혜를 바탕으로 한 영감의 도구예요.`
    );
    paragraphs.push(
      `당신이 왜 특정한 상황에서 강하게 끌리거나 반복적인 패턴을 경험하는지, 그 실마리를 여기서 찾아볼 수 있습니다.`
    );
  } else {
    paragraphs.push(
      `🔮 Past lives and karma belong to invisible realms. This analysis is an inspirational tool based on Eastern philosophy and astrological wisdom rather than scientific proof.`
    );
    paragraphs.push(
      `Here you may find clues about why you feel strongly drawn to certain situations or experience recurring patterns.`
    );
  }

  // Past life theme from karmaAnalysis
  if (pastLifeTheme) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🌀 【전생의 모습 - 영혼이 기억하는 과거】`);
      paragraphs.push('');
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push('');
      paragraphs.push(`이것은 당신의 영혼이 이미 경험한 에너지입니다. 그래서 특정 분야에서 '처음인데 익숙한' 느낌을 받았을 수 있어요.`);
      paragraphs.push('');
      paragraphs.push(`✨ 전생에서 가져온 재능: ${pastLifeTheme.talents}`);
      paragraphs.push(`이 재능은 노력 없이도 자연스럽게 발휘되는 영역일 가능성이 높습니다.`);
      paragraphs.push('');
      paragraphs.push(`📖 이번 생의 숙제: ${pastLifeTheme.lessons}`);
      paragraphs.push(`전생에서 다 배우지 못한 것을 이번 생에서 완성해야 합니다. 어렵게 느껴지는 영역이 바로 성장의 열쇠예요.`);
    } else {
      paragraphs.push(`🌀 【Past Life Vision - What Your Soul Remembers】`);
      paragraphs.push('');
      paragraphs.push(pastLifeTheme.likely);
      paragraphs.push('');
      paragraphs.push(`This is energy your soul has already experienced. That's why certain areas may feel 'familiar even though it's your first time.'`);
      paragraphs.push('');
      paragraphs.push(`✨ Talents from past lives: ${pastLifeTheme.talents}`);
      paragraphs.push(`These talents likely manifest naturally without effort.`);
      paragraphs.push('');
      paragraphs.push(`📖 This life's homework: ${pastLifeTheme.lessons}`);
      paragraphs.push(`You must complete what wasn't fully learned in past lives. The areas that feel difficult are the keys to your growth.`);
    }
  }

  // Past life hints from matrix
  if (pastLifeHints.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`💫 【신살과 행성의 만남 - 더 깊은 전생 에너지】`);
      paragraphs.push(`동양의 신살(神煞)과 서양 점성술의 행성이 만나면 독특한 카르마적 조합이 나타납니다:`);
      paragraphs.push('');
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}`);
        paragraphs.push(`   ${hint.hint.ko}`);
        paragraphs.push('');
      });
    } else {
      paragraphs.push(`💫 【Shinsal Meets Planets - Deeper Past Life Energy】`);
      paragraphs.push(`When Eastern Shinsal (divine stars) meet Western planetary energies, unique karmic combinations emerge:`);
      paragraphs.push('');
      pastLifeHints.slice(0, 3).forEach(hint => {
        paragraphs.push(`${hint.fusion.icon} ${hint.shinsal} × ${hint.planet}`);
        paragraphs.push(`   ${hint.hint.en}`);
        paragraphs.push('');
      });
    }
  }

  // Shinsal stars with extended narratives
  if (luckyStars.length > 0 || challengeStars.length > 0) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`⭐ 【타고난 별들 - 당신만의 우주적 선물】`);
      paragraphs.push('');
      paragraphs.push(
        `태어나는 순간, 우주는 당신에게 특별한 별들을 선물했습니다. 마치 요정들이 아기에게 축복을 주는 것처럼요. 이 별들은 평생 당신과 함께하며 잠재력과 도전을 나타냅니다.`
      );
    } else {
      paragraphs.push(`⭐ 【Stars You Were Born With - Your Cosmic Gifts】`);
      paragraphs.push('');
      paragraphs.push(
        `At the moment of birth, the universe gifted you special stars. Like fairies blessing a baby, these stars accompany you throughout life, representing your potential and challenges.`
      );
    }

    if (luckyStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '🌟 【축복의 별들】' : '🌟 【Blessing Stars】');
      paragraphs.push('');

      luckyStars.slice(0, 3).forEach((starName, idx) => {
        // Check if we have extended narrative
        const extendedNarrative = shinsalExtendedNarratives[starName];
        if (extendedNarrative) {
          const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
          narrativeLines.forEach(line => paragraphs.push(line));
        } else {
          // Fall back to simple version
          const info = shinsalSimple[starName];
          if (info) {
            paragraphs.push(`${info.emoji} ${starName} (${isKo ? info.typeKo : info.typeEn})`);
            paragraphs.push('');
            paragraphs.push(isKo ? info.storyKo : info.storyEn);
            paragraphs.push('');
            paragraphs.push(`💡 ${isKo ? info.adviceKo : info.adviceEn}`);
          }
        }
        if (idx < luckyStars.slice(0, 3).length - 1) {
          paragraphs.push('');
          paragraphs.push('---');
          paragraphs.push('');
        }
      });
    }

    if (challengeStars.length > 0) {
      paragraphs.push('');
      paragraphs.push(isKo ? '⚡ 【도전의 별들 - 극복하면 최강의 무기가 됩니다】' : '⚡ 【Challenge Stars - Overcome Them to Gain Your Greatest Weapons】');
      paragraphs.push('');
      if (isKo) {
        paragraphs.push(`도전의 별은 '나쁜 별'이 아닙니다. 오히려 극복했을 때 가장 강력한 성장을 가져다주는 별이에요. 다이아몬드가 압력을 받아 빛나듯, 이 별들의 도전을 이겨내면 당신도 빛나게 됩니다.`);
      } else {
        paragraphs.push(`Challenge stars aren't 'bad stars.' Rather, they bring the most powerful growth when overcome. Like diamonds shining under pressure, conquering these stellar challenges makes you shine.`);
      }
      paragraphs.push('');

      challengeStars.slice(0, 3).forEach((starName, idx) => {
        const extendedNarrative = shinsalExtendedNarratives[starName];
        if (extendedNarrative) {
          const narrativeLines = isKo ? extendedNarrative.ko : extendedNarrative.en;
          narrativeLines.forEach(line => paragraphs.push(line));
        } else {
          const info = shinsalSimple[starName];
          if (info) {
            paragraphs.push(`${info.emoji} ${starName} (${isKo ? info.typeKo : info.typeEn})`);
            paragraphs.push('');
            paragraphs.push(isKo ? info.storyKo : info.storyEn);
            paragraphs.push('');
            paragraphs.push(`💡 ${isKo ? info.adviceKo : info.adviceEn}`);
          }
        }
        if (idx < challengeStars.slice(0, 3).length - 1) {
          paragraphs.push('');
          paragraphs.push('---');
          paragraphs.push('');
        }
      });
    }
  }

  // If still not enough content, add general wisdom
  if (paragraphs.length <= 3) {
    paragraphs.push('');
    if (isKo) {
      paragraphs.push(`🌌 【전생 에너지에 대한 일반적 통찰】`);
      paragraphs.push('');
      paragraphs.push(`당신의 상세한 전생 데이터가 충분하지 않아 구체적인 분석은 어렵지만, 몇 가지 보편적인 지혜를 나눌 수 있습니다.`);
      paragraphs.push('');
      paragraphs.push(`우리 모두는 이번 생에 배워야 할 것을 가지고 태어납니다. 어떤 일이 유독 어렵게 느껴진다면, 그것이 바로 당신의 영혼이 이번 생에서 성장하고자 선택한 영역일 수 있어요.`);
      paragraphs.push('');
      paragraphs.push(`반대로, 특별히 노력하지 않아도 잘 되는 일이 있다면, 그것은 전생에서 이미 충분히 연습한 영역입니다. 그 재능을 활용하되, 너무 거기에만 안주하지 마세요.`);
      paragraphs.push('');
      paragraphs.push(`특정 사람에게 강하게 끌리거나, 이유 없이 반복되는 패턴이 있다면, 그것은 카르마적 연결의 신호일 수 있습니다. 그 패턴을 인식하고 의식적으로 선택하는 것이 성장의 시작입니다.`);
      paragraphs.push('');
      paragraphs.push(`💡 출생 시간 정보가 있으면 더 정확한 전생 분석이 가능합니다.`);
    } else {
      paragraphs.push(`🌌 【General Insights on Past Life Energy】`);
      paragraphs.push('');
      paragraphs.push(`While detailed past life data isn't available for specific analysis, here are some universal wisdoms to share.`);
      paragraphs.push('');
      paragraphs.push(`We're all born with lessons to learn this lifetime. If something feels particularly difficult, that might be exactly the area your soul chose to grow in.`);
      paragraphs.push('');
      paragraphs.push(`Conversely, if something comes easily without much effort, that's an area you've already practiced plenty in past lives. Use that talent, but don't rest solely on it.`);
      paragraphs.push('');
      paragraphs.push(`Strong attraction to certain people or inexplicable recurring patterns may signal karmic connections. Recognizing these patterns and making conscious choices is where growth begins.`);
      paragraphs.push('');
      paragraphs.push(`💡 More accurate past life analysis is possible with birth time information.`);
    }
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
