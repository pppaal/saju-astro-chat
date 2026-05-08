/**
 * pastLifeNarrative.ts - 전생 내러티브 생성
 */

import { shinsalSimple } from '../karma-data';
import { shinsalExtendedNarratives } from '../karma-narratives-data';

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
