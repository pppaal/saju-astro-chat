/**
 * Conversation Starters — surfaced after a mutual match to give users
 * a natural first-message hook. Pure deterministic from MatchProfile;
 * no LLM. Returns 3-5 specific suggestions calibrated to the actual
 * astro/saju overlap.
 */

import type { MatchProfile } from './matchProfile'

const VENUS_HINT_BY_SIGN: Record<string, string> = {
  Aries: '솔직하고 즉흥적인 데이트',
  Taurus: '맛있는 음식과 감각적인 공간',
  Gemini: '대화가 끊이지 않는 카페',
  Cancer: '집밥 같은 따뜻한 분위기',
  Leo: '특별하고 인상적인 경험',
  Virgo: '잘 다듬어진 작은 디테일',
  Libra: '예쁘고 균형 잡힌 장소',
  Scorpio: '깊이 있는 한 사람과의 시간',
  Sagittarius: '여행과 새로운 모험',
  Capricorn: '계획적이고 의미 있는 만남',
  Aquarius: '독특하고 자유로운 활동',
  Pisces: '감성적이고 영감을 주는 자리',
}

const MARS_HINT_BY_SIGN: Record<string, string> = {
  Aries: '액티브한 스포츠나 빠른 결정이 좋은 활동',
  Taurus: '느긋하고 감각적인 시간',
  Gemini: '여러 곳을 짧게 둘러보는 짧은 일정',
  Cancer: '집에서 함께 요리하는 편안한 시간',
  Leo: '눈에 띄고 즐거운 행사',
  Virgo: '꼼꼼하게 준비된 코스 데이트',
  Libra: '함께 결정하고 협력하는 활동',
  Scorpio: '깊은 대화와 단둘만의 시간',
  Sagittarius: '새 경험을 찾아 떠나는 여행',
  Capricorn: '목표와 야망을 공유하는 대화',
  Aquarius: '특별한 전시나 색다른 이벤트',
  Pisces: '음악·영화·예술 같은 감성적 경험',
}

const SUN_TOPIC_BY_ELEMENT: Record<string, string> = {
  fire: '에너지·열정·새 시작',
  earth: '안정·실용·작은 일상',
  air: '아이디어·책·여행 이야기',
  water: '감정·꿈·관계 이야기',
}

const ELEMENT_KO: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const ZODIAC_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

export interface ConversationStarter {
  category: 'date_idea' | 'topic' | 'compliment' | 'question'
  text: string
  reason: string // why this matches the pair
}

export function buildConversationStarters(
  me: MatchProfile,
  other: MatchProfile
): ConversationStarter[] {
  const starters: ConversationStarter[] = []

  // 1. Shared Venus sign → date idea
  if (me.astro.venus.sign === other.astro.venus.sign) {
    const hint = VENUS_HINT_BY_SIGN[me.astro.venus.sign] || '편안한 만남'
    starters.push({
      category: 'date_idea',
      text: `둘 다 금성이 ${ZODIAC_KO[me.astro.venus.sign] || me.astro.venus.sign}이라 '${hint}'에 같이 끌릴 거예요. 다음 데이트에 제안해보세요.`,
      reason: '같은 금성 사인',
    })
  }

  // 2. Shared Sun element → conversation topic
  if (me.astro.sun.element === other.astro.sun.element) {
    const topic = SUN_TOPIC_BY_ELEMENT[me.astro.sun.element]
    starters.push({
      category: 'topic',
      text: `둘 다 ${me.astro.sun.element === 'fire' ? '불' : me.astro.sun.element === 'earth' ? '땅' : me.astro.sun.element === 'air' ? '바람' : '물'} 원소라 ${topic} 같은 주제에서 자연스럽게 대화가 이어져요.`,
      reason: '같은 태양 원소',
    })
  }

  // 3. Yin-yang complement → compliment
  if (me.saju.yinYang !== other.saju.yinYang) {
    const myYang = me.saju.yinYang === 'yang'
    starters.push({
      category: 'compliment',
      text: myYang
        ? '상대의 차분함이 매력 포인트예요. "왠지 옆에 있으면 마음이 편해진다"는 식의 진심 어린 칭찬이 잘 통합니다.'
        : '상대의 추진력이 매력 포인트예요. "결정이 빠르고 단단해 보인다"는 식의 칭찬이 잘 와닿습니다.',
      reason: '음양 보완',
    })
  }

  // 4. Mars compatibility → activity suggestion
  const mars1 = me.astro.mars.sign
  const mars2 = other.astro.mars.sign
  if (mars1 === mars2) {
    const hint = MARS_HINT_BY_SIGN[mars1] || '함께 즐길 수 있는 활동'
    starters.push({
      category: 'date_idea',
      text: `둘 다 화성이 ${ZODIAC_KO[mars1] || mars1}이라 '${hint}'을 같이 좋아할 가능성이 커요.`,
      reason: '같은 화성 사인',
    })
  }

  // 5. Saju element complement → question
  const myWeak = (Object.entries(me.saju.elements) as [string, number][])
    .filter(([, v]) => v <= 1)
    .map(([k]) => k)
  const otherStrong = (Object.entries(other.saju.elements) as [string, number][])
    .filter(([, v]) => v >= 3)
    .map(([k]) => k)
  const filled = myWeak.find((e) => otherStrong.includes(e))
  if (filled) {
    starters.push({
      category: 'question',
      text: `사주에서 두 분이 서로의 ${ELEMENT_KO[filled] || filled} 기운을 채워주는 결이에요. "당신은 어떤 일에서 가장 자신감을 느껴요?" 같은 질문으로 그 결을 살펴보세요.`,
      reason: `5행 보완 (${ELEMENT_KO[filled] || filled})`,
    })
  }

  // 6. Moon match → emotional reading
  if (me.astro.moon.sign === other.astro.moon.sign) {
    starters.push({
      category: 'compliment',
      text: `같은 달자리(${ZODIAC_KO[me.astro.moon.sign] || me.astro.moon.sign})를 가져 정서 결이 닮아 있어요. "왠지 함께 있으면 마음이 편해진다"는 솔직한 표현이 깊이 와닿습니다.`,
      reason: '같은 달 사인',
    })
  }

  // Fallback when no signal — generic but personalized
  if (starters.length === 0) {
    starters.push({
      category: 'question',
      text: '서로 다른 결이라 처음엔 호기심으로 시작하는 것도 좋아요. "최근 가장 좋았던 순간" 같은 가벼운 질문이 자연스럽게 다가가는 방법입니다.',
      reason: '대비 매칭',
    })
  }

  return starters.slice(0, 5)
}
