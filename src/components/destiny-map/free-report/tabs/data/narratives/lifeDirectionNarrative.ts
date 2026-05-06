/**
 * lifeDirectionNarrative.ts - 이번 생의 방향 내러티브 생성
 */

import { northNodeSimple, saturnSimple } from '../karma-data';
import { northNodeExtendedNarratives, saturnExtendedNarratives } from '../karma-narratives-data';

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
