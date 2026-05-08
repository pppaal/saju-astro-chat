/**
 * Chiron 별자리별 상처와 치유
 * Chiron(키론)은 "상처 입은 치유자"로, 깊은 상처와 치유의 선물을 나타냄
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface ChironHealingPath {
  wound: BilingualText;
  healing: BilingualText;
  gift: BilingualText;
}

export const CHIRON_HEALING_PATH: Record<ZodiacSign, ChironHealingPath> = {
  aries: {
    wound: {
      ko: "존재 자체에 대한 상처. '내가 있어도 되는 걸까'라는 근본적 의문.",
      en: "Wound about existence itself. 'Am I allowed to exist?'"
    },
    healing: {
      ko: "스스로 행동하고 주도하면서 존재감을 확인하세요.",
      en: "Confirm your presence by acting and leading yourself."
    },
    gift: {
      ko: "다른 사람들의 자기 확신을 도울 수 있어요.",
      en: "You can help others' self-confidence."
    },
  },
  taurus: {
    wound: {
      ko: "자기 가치에 대한 상처. 충분하지 않다는 느낌.",
      en: "Wound about self-worth. Feeling never enough."
    },
    healing: {
      ko: "자신만의 가치를 정의하고, 물질적 안정을 만드세요.",
      en: "Define your own value and create material stability."
    },
    gift: {
      ko: "다른 사람들의 자기 가치 발견을 도울 수 있어요.",
      en: "You can help others discover their worth."
    },
  },
  gemini: {
    wound: {
      ko: "소통과 이해에 대한 상처. '아무도 나를 이해 못해'.",
      en: "Wound about communication. 'No one understands me.'"
    },
    healing: {
      ko: "다양한 방식으로 표현하고, 먼저 다른 사람을 이해하세요.",
      en: "Express in various ways and understand others first."
    },
    gift: {
      ko: "복잡한 것을 쉽게 설명하는 능력이 생겨요.",
      en: "You gain ability to explain complex things simply."
    },
  },
  cancer: {
    wound: {
      ko: "소속감에 대한 상처. 어디에도 속하지 못한다는 느낌.",
      en: "Wound about belonging. Feeling you don't fit anywhere."
    },
    healing: {
      ko: "자신만의 '가정'을 만들고, 자신을 먼저 양육하세요.",
      en: "Create your own 'home' and nurture yourself first."
    },
    gift: {
      ko: "다른 사람들에게 진정한 소속감을 줄 수 있어요.",
      en: "You can give others true sense of belonging."
    },
  },
  leo: {
    wound: {
      ko: "인정에 대한 상처. '내가 빛날 자격이 있나'라는 의심.",
      en: "Wound about recognition. 'Do I deserve to shine?'"
    },
    healing: {
      ko: "자신의 빛을 인정하고, 다른 사람도 빛나게 도우세요.",
      en: "Acknowledge your light and help others shine too."
    },
    gift: {
      ko: "다른 사람들의 재능을 발견해주는 능력이 생겨요.",
      en: "You gain ability to discover others' talents."
    },
  },
  virgo: {
    wound: {
      ko: "완벽함에 대한 상처. 결코 충분히 잘하지 못한다는 느낌.",
      en: "Wound about perfection. Never feeling good enough."
    },
    healing: {
      ko: "'충분히 좋다'를 받아들이고, 자신에게 관대해지세요.",
      en: "Accept 'good enough' and be generous with yourself."
    },
    gift: {
      ko: "다른 사람들이 완벽주의에서 벗어나도록 도울 수 있어요.",
      en: "You can help others escape perfectionism."
    },
  },
  libra: {
    wound: {
      ko: "관계에 대한 상처. 사랑받을 자격에 대한 의심.",
      en: "Wound about relationships. Doubting worthiness of love."
    },
    healing: {
      ko: "혼자서도 온전할 수 있음을 알고, 건강한 경계를 세우세요.",
      en: "Know you're complete alone and set healthy boundaries."
    },
    gift: {
      ko: "불균형한 관계에서 균형을 찾도록 도울 수 있어요.",
      en: "You can help find balance in unequal relationships."
    },
  },
  scorpio: {
    wound: {
      ko: "신뢰에 대한 상처. 깊은 배신감의 기억.",
      en: "Wound about trust. Deep memories of betrayal."
    },
    healing: {
      ko: "조금씩 다시 신뢰하는 법을 배우고, 취약해지는 연습을 하세요.",
      en: "Learn to trust again slowly and practice vulnerability."
    },
    gift: {
      ko: "깊은 치유와 변환을 도울 수 있는 힘이 생겨요.",
      en: "You gain power to help deep healing and transformation."
    },
  },
  sagittarius: {
    wound: {
      ko: "의미에 대한 상처. '삶의 목적이 뭐지'라는 방황.",
      en: "Wound about meaning. Wandering 'What is life's purpose?'"
    },
    healing: {
      ko: "찾는 것을 멈추고 창조하세요. 의미는 발견되는 게 아니라 만들어지는 거예요.",
      en: "Stop searching and create. Meaning is made, not found."
    },
    gift: {
      ko: "다른 사람들이 자신만의 의미를 찾도록 도울 수 있어요.",
      en: "You can help others find their own meaning."
    },
  },
  capricorn: {
    wound: {
      ko: "성취에 대한 상처. 아무리 해도 인정받지 못한다는 느낌.",
      en: "Wound about achievement. Never feeling recognized despite effort."
    },
    healing: {
      ko: "외부 인정에 의존하지 말고, 자신의 성취를 스스로 인정하세요.",
      en: "Don't depend on external recognition; acknowledge your own achievements."
    },
    gift: {
      ko: "다른 사람들의 잠재력과 성취를 알아봐 줄 수 있어요.",
      en: "You can recognize others' potential and achievements."
    },
  },
  aquarius: {
    wound: {
      ko: "소외에 대한 상처. 언제나 이방인 같은 느낌.",
      en: "Wound about alienation. Always feeling like an outsider."
    },
    healing: {
      ko: "'다름'이 당신의 선물임을 인정하세요. 당신만이 할 수 있는 일이 있어요.",
      en: "Accept 'difference' as your gift. There's something only you can do."
    },
    gift: {
      ko: "소외된 사람들이 자신을 받아들이도록 도울 수 있어요.",
      en: "You can help alienated people accept themselves."
    },
  },
  pisces: {
    wound: {
      ko: "연결에 대한 상처. 세상과 분리되어 있다는 고독감.",
      en: "Wound about connection. Feeling isolated from the world."
    },
    healing: {
      ko: "경계 없이 연결되려 하지 말고, 건강한 경계 안에서 연결하세요.",
      en: "Don't connect without boundaries; connect within healthy ones."
    },
    gift: {
      ko: "깊은 영적 치유와 연민을 줄 수 있어요.",
      en: "You can give deep spiritual healing and compassion."
    },
  },
};
