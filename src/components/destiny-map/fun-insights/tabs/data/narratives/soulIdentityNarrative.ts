/**
 * soulIdentityNarrative.ts - 영혼의 정체성 내러티브 생성
 */

import { dayMasterSimple } from '../karma-data';
import { dayMasterExtendedNarratives } from '../karma-narratives-data';

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
