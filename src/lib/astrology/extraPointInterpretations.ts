// src/lib/astrology/extraPointInterpretations.ts
//
// Interpretation data for non-planet points: Chiron (the wounded healer)
// and Black Moon Lilith (the suppressed/wild feminine, the rebellion edge).
// Same shape as `interpretations.ts`: deterministic, offline, KO+EN.
//
// Coverage:
//   - Chiron × 12 signs (the wound's flavour)
//   - Chiron × 12 houses (the area of life where the wound lives)
//   - Lilith × 12 signs (the rebellion's flavour)
//   - Lilith × 12 houses (the area where the suppressed-then-reclaimed
//     edge surfaces)

import type { ZodiacName } from './interpretations'

export type ExtraPointName = 'Chiron' | 'Lilith'

interface Line {
  ko: string
  en: string
}

const CHIRON_SIGN_LINES: Record<ZodiacName, Line> = {
  Aries: {
    ko: '자기 의지·정체성에 새겨진 상처. 자기를 주장하는 법을 배우며 치유.',
    en: 'A wound in self-assertion and identity; healing comes through reclaiming will.',
  },
  Taurus: {
    ko: '안전·자기가치에 대한 상처. 몸·자원을 신뢰하는 법을 배우며 치유.',
    en: 'A wound in self-worth and security; healing through trusting body and resources.',
  },
  Gemini: {
    ko: '말·소통·이해받음에 대한 상처. 진솔한 표현 속에서 치유.',
    en: 'A wound around voice and being heard; healing through honest expression.',
  },
  Cancer: {
    ko: '가족·돌봄·소속감에 대한 상처. 자기 자신을 돌보는 법으로 치유.',
    en: 'A wound in family, nurture, belonging; healing by mothering oneself.',
  },
  Leo: {
    ko: '인정·창조·존재감 결핍의 상처. 자기 빛을 드러내며 치유.',
    en: 'A wound in recognition and creative selfhood; healing by daring to shine.',
  },
  Virgo: {
    ko: '완벽주의·자기비판의 상처. 충분함을 받아들이며 치유.',
    en: 'A wound of perfectionism and self-critique; healing by accepting "enough".',
  },
  Libra: {
    ko: '관계·공정에 대한 상처. 자기 안의 균형을 회복하며 치유.',
    en: 'A wound in relationship and fairness; healing by restoring inner balance.',
  },
  Scorpio: {
    ko: '신뢰·배신·통제의 상처. 깊은 변용을 통과하며 치유.',
    en: 'A wound around trust and betrayal; healing through deep transformation.',
  },
  Sagittarius: {
    ko: '믿음·의미의 상처. 자기만의 진리를 짓는 과정에서 치유.',
    en: 'A wound in faith and meaning; healing by building a personal truth.',
  },
  Capricorn: {
    ko: '권위·성취·아버지에 관한 상처. 자기 권위를 세우며 치유.',
    en: 'A wound around authority, ambition, the father; healing by claiming one’s own authority.',
  },
  Aquarius: {
    ko: '소속·이방인 감각의 상처. 다름을 자산으로 쓰며 치유.',
    en: 'A wound of feeling like an outsider; healing by using difference as a gift.',
  },
  Pisces: {
    ko: '경계·구원자 환상의 상처. 연민을 조건 없이 자기 자신에게 돌리며 치유.',
    en: 'A wound around boundaries and rescuer fantasies; healing by extending compassion to self.',
  },
}

const CHIRON_HOUSE_LINES: Record<number, Line> = {
  1: { ko: '자아·외모·존재감 영역에 새겨진 상처', en: 'Wound lives in identity and how one shows up' },
  2: { ko: '자원·자기가치 영역에 새겨진 상처', en: 'Wound lives in self-worth and resources' },
  3: { ko: '소통·형제·학습 영역에 새겨진 상처', en: 'Wound lives in voice, siblings, early learning' },
  4: { ko: '가정·뿌리·정서적 안전 영역에 새겨진 상처', en: 'Wound lives in home, roots, emotional safety' },
  5: { ko: '창조·연애·자기표현 영역에 새겨진 상처', en: 'Wound lives in creativity, romance, self-expression' },
  6: { ko: '일상·건강·실무 영역에 새겨진 상처', en: 'Wound lives in routine, health, daily service' },
  7: { ko: '관계·파트너십 영역에 새겨진 상처', en: 'Wound lives in partnership and one-to-one bonds' },
  8: { ko: '깊이·공유 자원·신뢰 영역에 새겨진 상처', en: 'Wound lives in intimacy, shared resources, trust' },
  9: { ko: '믿음·여행·고등 학습 영역에 새겨진 상처', en: 'Wound lives in belief, travel, higher learning' },
  10: { ko: '커리어·사회적 권위 영역에 새겨진 상처', en: 'Wound lives in career and public authority' },
  11: { ko: '커뮤니티·미래 비전 영역에 새겨진 상처', en: 'Wound lives in community and future vision' },
  12: { ko: '내면·무의식·은둔 영역에 새겨진 상처', en: 'Wound lives in the inner, hidden, unconscious realm' },
}

const LILITH_SIGN_LINES: Record<ZodiacName, Line> = {
  Aries: {
    ko: '직진하는 분노·자기 의지에서 일어나는 야생의 자리',
    en: 'Wild edge surfaces as raw will and confrontational anger',
  },
  Taurus: {
    ko: '몸·관능·자기 가치 주장에서 일어나는 야생의 자리',
    en: 'Wild edge surfaces around body, sensuality, ownership of value',
  },
  Gemini: {
    ko: '검열되지 않은 말·금기적 사고에서 일어나는 야생의 자리',
    en: 'Wild edge surfaces as uncensored speech and forbidden thought',
  },
  Cancer: {
    ko: '가족·정서 의존 패턴 안의 억압된 어두운 자리',
    en: 'Wild edge sits inside family and emotional-dependence patterns',
  },
  Leo: {
    ko: '드러내고 인정받고자 하는 강렬한 욕망의 자리',
    en: 'Wild edge surfaces as fierce demand to be seen and acknowledged',
  },
  Virgo: {
    ko: '몸·일·완벽주의에 묶인 억압된 욕망의 자리',
    en: 'Wild edge sits in body, work, perfectionism — suppressed desire',
  },
  Libra: {
    ko: '관계 속 길들여진 자아 뒤의 어두운 욕망의 자리',
    en: 'Wild edge hides behind the polished relational self',
  },
  Scorpio: {
    ko: '권력·섹슈얼리티·통제 욕망의 본거지',
    en: 'Wild edge is at home: power, sexuality, control',
  },
  Sagittarius: {
    ko: '체제 밖 진리·자유 추구 안의 야생의 자리',
    en: 'Wild edge surfaces as rebel truth-seeking and free roaming',
  },
  Capricorn: {
    ko: '권위·구조 안에 갇힌 어두운 욕망의 자리',
    en: 'Wild edge sits caged inside authority and structure',
  },
  Aquarius: {
    ko: '체제 밖에서 나오는 급진적 자유의 자리',
    en: 'Wild edge surfaces as radical, system-defying freedom',
  },
  Pisces: {
    ko: '몰입·환상·구원 안의 어두운 깊이',
    en: 'Wild edge surfaces inside immersion, fantasy, surrender',
  },
}

const LILITH_HOUSE_LINES: Record<number, Line> = {
  1: { ko: '자아·외모를 통해 야생의 자리가 드러남', en: 'The suppressed edge surfaces through identity and presence' },
  2: { ko: '자기가치·자원 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces around self-worth and resources' },
  3: { ko: '말·정보 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in voice and exchange' },
  4: { ko: '가정·뿌리 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in home and roots' },
  5: { ko: '창조·연애 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in creativity and romance' },
  6: { ko: '일상·건강·실무 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in routine and body' },
  7: { ko: '관계·파트너십 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces inside one-to-one relationships' },
  8: { ko: '심층 친밀·공유 권력 영역에서 본거지', en: 'The suppressed edge is at home in intimacy and shared power' },
  9: { ko: '신념·확장 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in belief and exploration' },
  10: { ko: '커리어·사회상 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in career and public face' },
  11: { ko: '커뮤니티·미래 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in community and future vision' },
  12: { ko: '무의식·은둔 영역에서 야생의 자리가 드러남', en: 'The suppressed edge surfaces in the hidden inner realm' },
}

export function getChironSignInterpretation(
  sign: ZodiacName,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = CHIRON_SIGN_LINES[sign]
  return language === 'ko' ? entry.ko : entry.en
}

export function getChironHouseInterpretation(
  house: number,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = CHIRON_HOUSE_LINES[house]
  if (!entry) {
    return language === 'ko' ? `${house}하우스에 새겨진 상처` : `Wound lives in House ${house}`
  }
  return language === 'ko' ? entry.ko : entry.en
}

export function getLilithSignInterpretation(
  sign: ZodiacName,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = LILITH_SIGN_LINES[sign]
  return language === 'ko' ? entry.ko : entry.en
}

export function getLilithHouseInterpretation(
  house: number,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = LILITH_HOUSE_LINES[house]
  if (!entry) {
    return language === 'ko'
      ? `${house}하우스에서 야생의 자리가 드러남`
      : `Suppressed edge surfaces in House ${house}`
  }
  return language === 'ko' ? entry.ko : entry.en
}
