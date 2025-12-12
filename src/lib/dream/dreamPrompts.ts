/**
 * Dream Prompts Helper Library
 * Generates structured AI prompts for dream interpretation
 */

// Dream Symbol Categories
export const DREAM_SYMBOLS = {
  animals: [
    { ko: '뱀', en: 'Snake', emoji: '🐍' },
    { ko: '용', en: 'Dragon', emoji: '🐉' },
    { ko: '호랑이', en: 'Tiger', emoji: '🐯' },
    { ko: '새', en: 'Bird', emoji: '🦅' },
    { ko: '물고기', en: 'Fish', emoji: '🐟' },
    { ko: '나비', en: 'Butterfly', emoji: '🦋' },
    { ko: '말', en: 'Horse', emoji: '🐴' },
    { ko: '개', en: 'Dog', emoji: '🐕' },
    { ko: '고양이', en: 'Cat', emoji: '🐈' },
    { ko: '돼지', en: 'Pig', emoji: '🐷' },
    { ko: '소', en: 'Cow', emoji: '🐄' },
  ],
  nature: [
    { ko: '물', en: 'Water', emoji: '💧' },
    { ko: '불', en: 'Fire', emoji: '🔥' },
    { ko: '산', en: 'Mountain', emoji: '⛰️' },
    { ko: '바다', en: 'Ocean', emoji: '🌊' },
    { ko: '나무', en: 'Tree', emoji: '🌳' },
    { ko: '꽃', en: 'Flower', emoji: '🌸' },
    { ko: '달', en: 'Moon', emoji: '🌙' },
    { ko: '태양', en: 'Sun', emoji: '☀️' },
    { ko: '별', en: 'Star', emoji: '⭐' },
    { ko: '비', en: 'Rain', emoji: '🌧️' },
    { ko: '눈', en: 'Snow', emoji: '❄️' },
    { ko: '하늘', en: 'Sky', emoji: '🌤️' },
  ],
  actions: [
    { ko: '날기', en: 'Flying', emoji: '🦋' },
    { ko: '떨어지다', en: 'Falling', emoji: '⬇️' },
    { ko: '달리다', en: 'Running', emoji: '🏃' },
    { ko: '수영하다', en: 'Swimming', emoji: '🏊' },
    { ko: '죽음', en: 'Death', emoji: '💀' },
    { ko: '출산', en: 'Birth', emoji: '👶' },
    { ko: '결혼', en: 'Marriage', emoji: '💒' },
    { ko: '시험', en: 'Exam', emoji: '📝' },
    { ko: '여행', en: 'Travel', emoji: '✈️' },
    { ko: '싸움', en: 'Fight', emoji: '⚔️' },
    { ko: '길 잃음', en: 'Lost', emoji: '🧭' },
  ],
  people: [
    { ko: '가족', en: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { ko: '친구', en: 'Friend', emoji: '👥' },
    { ko: '연인', en: 'Lover', emoji: '💑' },
    { ko: '낯선 사람', en: 'Stranger', emoji: '🚶' },
    { ko: '죽은 사람', en: 'Deceased', emoji: '👻' },
    { ko: '아이', en: 'Child', emoji: '👶' },
    { ko: '노인', en: 'Elder', emoji: '👴' },
    { ko: '선생님', en: 'Teacher', emoji: '👨‍🏫' },
    { ko: '의사', en: 'Doctor', emoji: '👨‍⚕️' },
    { ko: '부모', en: 'Parents', emoji: '👫' },
    { ko: '유명인', en: 'Celebrity', emoji: '⭐' },
    { ko: '적', en: 'Enemy', emoji: '😠' },
    { ko: '군중', en: 'Crowd', emoji: '👥' },
  ],
  places: [
    { ko: '집', en: 'Home', emoji: '🏠' },
    { ko: '학교', en: 'School', emoji: '🏫' },
    { ko: '병원', en: 'Hospital', emoji: '🏥' },
    { ko: '길', en: 'Road', emoji: '🛣️' },
    { ko: '다리', en: 'Bridge', emoji: '🌉' },
    { ko: '숲', en: 'Forest', emoji: '🌲' },
    { ko: '동굴', en: 'Cave', emoji: '🕳️' },
    { ko: '하늘', en: 'Sky', emoji: '☁️' },
    { ko: '지하', en: 'Underground', emoji: '⬇️' },
  ],
  objects: [
    { ko: '돈', en: 'Money', emoji: '💰' },
    { ko: '반지', en: 'Ring', emoji: '💍' },
    { ko: '차', en: 'Car', emoji: '🚗' },
    { ko: '전화', en: 'Phone', emoji: '📱' },
    { ko: '거울', en: 'Mirror', emoji: '🪞' },
    { ko: '문', en: 'Door', emoji: '🚪' },
    { ko: '창문', en: 'Window', emoji: '🪟' },
    { ko: '책', en: 'Book', emoji: '📚' },
    { ko: '음식', en: 'Food', emoji: '🍽️' },
    { ko: '옷', en: 'Clothes', emoji: '👔' },
    { ko: '열쇠', en: 'Key', emoji: '🔑' },
    { ko: '집', en: 'House', emoji: '🏠' },
  ],
  colors: [
    { ko: '빨강', en: 'Red', emoji: '🔴' },
    { ko: '파랑', en: 'Blue', emoji: '🔵' },
    { ko: '노랑', en: 'Yellow', emoji: '🟡' },
    { ko: '초록', en: 'Green', emoji: '🟢' },
    { ko: '보라', en: 'Purple', emoji: '🟣' },
    { ko: '검정', en: 'Black', emoji: '⚫' },
    { ko: '하양', en: 'White', emoji: '⚪' },
    { ko: '금색', en: 'Gold', emoji: '🟨' },
    { ko: '은색', en: 'Silver', emoji: '⬜' },
    { ko: '무지개', en: 'Rainbow', emoji: '🌈' },
  ],
  numbers: [
    { ko: '1', en: 'One', emoji: '1️⃣', meaning: '시작, 독립' },
    { ko: '2', en: 'Two', emoji: '2️⃣', meaning: '조화, 관계' },
    { ko: '3', en: 'Three', emoji: '3️⃣', meaning: '창조, 완성' },
    { ko: '4', en: 'Four', emoji: '4️⃣', meaning: '안정, 토대' },
    { ko: '5', en: 'Five', emoji: '5️⃣', meaning: '변화, 자유' },
    { ko: '6', en: 'Six', emoji: '6️⃣', meaning: '사랑, 가족' },
    { ko: '7', en: 'Seven', emoji: '7️⃣', meaning: '신비, 영성' },
    { ko: '8', en: 'Eight', emoji: '8️⃣', meaning: '풍요, 성공' },
    { ko: '9', en: 'Nine', emoji: '9️⃣', meaning: '완성, 깨달음' },
    { ko: '0', en: 'Zero', emoji: '0️⃣', meaning: '무한, 순환' },
  ],
} as const;

// Dream Emotions
export const DREAM_EMOTIONS = [
  { ko: '공포', en: 'Fear', emoji: '😱', intensity: 'negative' },
  { ko: '불안', en: 'Anxiety', emoji: '😰', intensity: 'negative' },
  { ko: '슬픔', en: 'Sadness', emoji: '😢', intensity: 'negative' },
  { ko: '분노', en: 'Anger', emoji: '😡', intensity: 'negative' },
  { ko: '혼란', en: 'Confusion', emoji: '😵', intensity: 'neutral' },
  { ko: '평화', en: 'Peace', emoji: '😌', intensity: 'positive' },
  { ko: '기쁨', en: 'Joy', emoji: '😊', intensity: 'positive' },
  { ko: '사랑', en: 'Love', emoji: '🥰', intensity: 'positive' },
  { ko: '흥분', en: 'Excitement', emoji: '🤩', intensity: 'positive' },
  { ko: '놀람', en: 'Surprise', emoji: '😲', intensity: 'neutral' },
] as const;

// Dream Themes/Types
export const DREAM_THEMES = [
  { ko: '예지몽', en: 'Prophetic', description: 'Dreams that predict future events' },
  { ko: '악몽', en: 'Nightmare', description: 'Frightening or disturbing dreams' },
  { ko: '상징몽', en: 'Symbolic', description: 'Dreams rich with symbolic meaning' },
  { ko: '반복몽', en: 'Recurring', description: 'Dreams that repeat over time' },
  { ko: '자각몽', en: 'Lucid', description: 'Dreams where you know you are dreaming' },
  { ko: '태몽', en: 'Conception', description: 'Dreams related to pregnancy/birth' },
  { ko: '영적 꿈', en: 'Spiritual', description: 'Dreams with spiritual or religious significance' },
  { ko: '치유몽', en: 'Healing', description: 'Dreams that bring emotional healing' },
] as const;

// ============================================================
// CULTURAL DREAM TRADITIONS (문화권별 꿈 전통)
// ============================================================

// Korean Traditional Dream Interpretations (한국 전통 꿈풀이)
export const KOREAN_DREAM_TYPES = [
  { ko: '길몽', en: 'Good Fortune', emoji: '🍀', description: 'Dreams predicting good luck' },
  { ko: '흉몽', en: 'Bad Omen', emoji: '⚠️', description: 'Dreams warning of challenges' },
  { ko: '태몽', en: 'Conception Dream', emoji: '👶', description: 'Dreams about pregnancy/babies' },
  { ko: '로또꿈', en: 'Lottery Dream', emoji: '💰', description: 'Dreams suggesting lucky numbers' },
] as const;

export const KOREAN_LUCKY_SYMBOLS = [
  { ko: '용', en: 'Dragon', emoji: '🐉', meaning: '큰 성공, 승진' },
  { ko: '호랑이', en: 'Tiger', emoji: '🐯', meaning: '권력, 명예' },
  { ko: '돼지', en: 'Pig', emoji: '🐷', meaning: '재물운' },
  { ko: '금', en: 'Gold', emoji: '🥇', meaning: '재물, 행운' },
  { ko: '똥', en: 'Feces', emoji: '💩', meaning: '재물, 돈' },
  { ko: '불', en: 'Fire', emoji: '🔥', meaning: '열정, 사업 번창' },
  { ko: '큰 물', en: 'Large Water', emoji: '🌊', meaning: '재물, 풍요' },
] as const;

// Chinese Dream Interpretation (中国解梦)
export const CHINESE_DREAM_SYMBOLS = [
  { zh: '龙', en: 'Dragon', emoji: '🐉', meaning: 'Imperial power, success' },
  { zh: '凤凰', en: 'Phoenix', emoji: '🦅', meaning: 'Rebirth, opportunity' },
  { zh: '鱼', en: 'Fish', emoji: '🐟', meaning: 'Abundance, surplus' },
  { zh: '莲花', en: 'Lotus', emoji: '🪷', meaning: 'Purity, enlightenment' },
  { zh: '竹子', en: 'Bamboo', emoji: '🎋', meaning: 'Resilience, integrity' },
  { zh: '红色', en: 'Red Color', emoji: '🔴', meaning: 'Joy, prosperity' },
  { zh: '桥', en: 'Bridge', emoji: '🌉', meaning: 'Transition, connection' },
] as const;

// Islamic Dream Interpretation (تفسير الأحلام الإسلامي)
export const ISLAMIC_DREAM_TYPES = [
  { ar: 'رؤيا صادقة', en: 'True Vision', emoji: '✨', meaning: 'Divine message' },
  { ar: 'حلم من النفس', en: 'Self Dream', emoji: '💭', meaning: 'Personal thoughts' },
  { ar: 'حلم من الشيطان', en: 'Satanic Dream', emoji: '⚠️', meaning: 'Ignore and seek refuge' },
] as const;

export const ISLAMIC_BLESSED_SYMBOLS = [
  { ar: 'ماء', en: 'Water', emoji: '💧', meaning: 'Knowledge, purity' },
  { ar: 'نور', en: 'Light', emoji: '💡', meaning: 'Guidance, truth' },
  { ar: 'كتاب', en: 'Book', emoji: '📖', meaning: 'Wisdom, learning' },
  { ar: 'حديقة', en: 'Garden', emoji: '🌳', meaning: 'Paradise, goodness' },
  { ar: 'طائر', en: 'Bird', emoji: '🦅', meaning: 'Freedom, message' },
] as const;

// Western/European Dream Symbolism (서양 꿈 상징)
export const WESTERN_DREAM_ARCHETYPES = [
  { en: 'Shadow', emoji: '🌑', meaning: 'Unconscious aspects of self' },
  { en: 'Anima/Animus', emoji: '⚖️', meaning: 'Inner feminine/masculine' },
  { en: 'The Wise Old Man', emoji: '🧙', meaning: 'Inner wisdom, guidance' },
  { en: 'The Hero', emoji: '🦸', meaning: 'Overcoming challenges' },
  { en: 'The Trickster', emoji: '🃏', meaning: 'Change, transformation' },
] as const;

// Indian/Hindu Dream Interpretation (भारतीय स्वप्न व्याख्या)
export const HINDU_DREAM_SYMBOLS = [
  { hi: 'कमल', en: 'Lotus', emoji: '🪷', meaning: 'Spiritual awakening' },
  { hi: 'गाय', en: 'Cow', emoji: '🐄', meaning: 'Prosperity, motherhood' },
  { hi: 'हाथी', en: 'Elephant', emoji: '🐘', meaning: 'Wisdom, Ganesha blessings' },
  { hi: 'सांप', en: 'Snake', emoji: '🐍', meaning: 'Kundalini, transformation' },
  { hi: 'सूर्य', en: 'Sun', emoji: '☀️', meaning: 'Consciousness, vitality' },
  { hi: 'गंगा', en: 'Sacred River', emoji: '🌊', meaning: 'Purification, flow' },
] as const;

// Native American Dream Traditions (아메리카 원주민 꿈 전통)
export const NATIVE_AMERICAN_SYMBOLS = [
  { en: 'Eagle', emoji: '🦅', meaning: 'Vision, spiritual messenger' },
  { en: 'Wolf', emoji: '🐺', meaning: 'Teacher, pathfinder' },
  { en: 'Bear', emoji: '🐻', meaning: 'Strength, introspection' },
  { en: 'Buffalo', emoji: '🦬', meaning: 'Abundance, prayer' },
  { en: 'Spider', emoji: '🕷️', meaning: 'Creativity, connection' },
  { en: 'Feather', emoji: '🪶', meaning: 'Truth, lightness' },
] as const;

// Japanese Dream Interpretation (日本の夢占い)
export const JAPANESE_DREAM_SYMBOLS = [
  { ja: '富士山', en: 'Mt. Fuji', emoji: '🗻', meaning: 'Great fortune, achievement' },
  { ja: '鷹', en: 'Hawk', emoji: '🦅', meaning: 'Success, opportunity' },
  { ja: '茄子', en: 'Eggplant', emoji: '🍆', meaning: 'Achievement (first dream)' },
  { ja: '桜', en: 'Cherry Blossom', emoji: '🌸', meaning: 'New beginnings, beauty' },
  { ja: '鯉', en: 'Koi', emoji: '🐟', meaning: 'Perseverance, success' },
  { ja: '鶴', en: 'Crane', emoji: '🦢', meaning: 'Longevity, good fortune' },
] as const;

// Dream Context/Timing
export const DREAM_CONTEXT = [
  { ko: '새벽 꿈', en: 'Early morning dream', significance: 'Often considered most meaningful' },
  { ko: '첫꿈', en: 'First dream of the year', significance: 'Korean tradition: predicts the year ahead' },
  { ko: '최근 반복', en: 'Recently recurring', significance: 'May indicate unresolved issues' },
  { ko: '생생한 꿈', en: 'Vivid dream', significance: 'Strong emotional or spiritual significance' },
  { ko: '단편적', en: 'Fragmented', significance: 'May reflect scattered thoughts or stress' },
] as const;

/**
 * Generate structured AI prompt for dream interpretation
 */
export function generateDreamPrompt(params: {
  dream: string;
  symbols?: string[];
  emotions?: string[];
  themes?: string[];
  context?: string[];
  koreanType?: string[];
  luckySymbols?: string[];
  chineseSymbols?: string[];
  islamicTypes?: string[];
  islamicBlessed?: string[];
  westernArchetypes?: string[];
  hinduSymbols?: string[];
  nativeAmericanSymbols?: string[];
  japaneseSymbols?: string[];
  birthData?: {
    sun?: string;
    moon?: string;
    ascendant?: string;
  };
}): string {
  const {
    dream, symbols, emotions, themes, context,
    koreanType, luckySymbols,
    chineseSymbols, islamicTypes, islamicBlessed,
    westernArchetypes, hinduSymbols, nativeAmericanSymbols, japaneseSymbols,
    birthData
  } = params;

  let prompt = `You are an expert dream interpreter with deep knowledge of global dream interpretation traditions including Korean, Chinese, Islamic, Western/Jungian, Hindu, Native American, and Japanese approaches. You synthesize insights from multiple cultural perspectives along with astrological analysis.

## Dream Description
${dream}
`;

  // Add selected symbols
  if (symbols && symbols.length > 0) {
    prompt += `\n## Key Symbols Present
${symbols.join(', ')}
`;
  }

  // Add emotions
  if (emotions && emotions.length > 0) {
    prompt += `\n## Emotions Experienced
${emotions.join(', ')}
`;
  }

  // Add dream themes/types
  if (themes && themes.length > 0) {
    prompt += `\n## Dream Type/Theme
${themes.join(', ')}
`;
  }

  // Add context
  if (context && context.length > 0) {
    prompt += `\n## Dream Context
${context.join(', ')}
`;
  }

  // Add Korean traditional dream type
  if (koreanType && koreanType.length > 0) {
    prompt += `\n## Korean Traditional Dream Classification (한국 전통 꿈풀이)
${koreanType.join(', ')}
**Note**: Please incorporate traditional Korean dream interpretation perspectives for these dream types.
`;
  }

  // Add Korean lucky symbols
  if (luckySymbols && luckySymbols.length > 0) {
    prompt += `\n## Korean Lucky Symbols Present (길몽 상징)
${luckySymbols.join(', ')}
**Note**: These are traditionally auspicious symbols in Korean dream interpretation. Consider their cultural significance.
`;
  }

  // Add Chinese symbols
  if (chineseSymbols && chineseSymbols.length > 0) {
    prompt += `\n## Chinese Dream Symbols (中国解梦)
${chineseSymbols.join(', ')}
**Note**: Consider Chinese cultural interpretations of these symbols (e.g., dragons = imperial power, fish = abundance).
`;
  }

  // Add Islamic dream types
  if (islamicTypes && islamicTypes.length > 0) {
    prompt += `\n## Islamic Dream Classification (تفسير الأحلام)
${islamicTypes.join(', ')}
**Note**: Apply Islamic dream interpretation framework (True Vision from Allah, Self Dream, or Satanic Dream).
`;
  }

  // Add Islamic blessed symbols
  if (islamicBlessed && islamicBlessed.length > 0) {
    prompt += `\n## Islamic Blessed Symbols
${islamicBlessed.join(', ')}
**Note**: These are considered blessed symbols in Islamic tradition.
`;
  }

  // Add Western/Jungian archetypes
  if (westernArchetypes && westernArchetypes.length > 0) {
    prompt += `\n## Western/Jungian Archetypes
${westernArchetypes.join(', ')}
**Note**: Interpret using Jungian psychology and Western dream symbolism.
`;
  }

  // Add Hindu/Indian symbols
  if (hinduSymbols && hinduSymbols.length > 0) {
    prompt += `\n## Hindu/Indian Dream Symbols (स्वप्न)
${hinduSymbols.join(', ')}
**Note**: Consider Hindu spiritual and cultural meanings.
`;
  }

  // Add Native American symbols
  if (nativeAmericanSymbols && nativeAmericanSymbols.length > 0) {
    prompt += `\n## Native American Symbols
${nativeAmericanSymbols.join(', ')}
**Note**: Consider Native American spiritual traditions and animal symbolism.
`;
  }

  // Add Japanese symbols
  if (japaneseSymbols && japaneseSymbols.length > 0) {
    prompt += `\n## Japanese Dream Symbols (夢占い)
${japaneseSymbols.join(', ')}
**Note**: Consider Japanese cultural meanings (e.g., Mt. Fuji, hawk, eggplant = traditional first dream symbols).
`;
  }

  // Add astrological context
  if (birthData) {
    prompt += `\n## Dreamer's Astrological Profile
`;
    if (birthData.sun) prompt += `Sun Sign: ${birthData.sun}\n`;
    if (birthData.moon) prompt += `Moon Sign: ${birthData.moon}\n`;
    if (birthData.ascendant) prompt += `Ascendant: ${birthData.ascendant}\n`;
  }

  // Add interpretation instructions
  prompt += `
## Please Provide

1. **Summary**: Brief overview of the dream's core message (2-3 sentences)

2. **Key Symbols**: Analyze the most significant symbols and their meanings
   - Provide both Eastern and Western interpretations where applicable
   - Consider cultural context (Korean dream interpretation traditions)

3. **Emotional Landscape**: What emotions reveal about the dreamer's current state

4. **Themes**: Identify recurring patterns or major themes (with weight 0-1)

5. **Astrological Connections**: How the dream relates to the dreamer's birth chart
   - Connect dream symbols to planetary influences
   - Consider current transits if relevant

6. **Cross-Cultural Insights**: Unique perspectives from combining Eastern and Western traditions

7. **Recommendations**: Practical next steps or actions based on the dream's message

**Format your response as JSON** with the following structure:
\`\`\`json
{
  "summary": "string",
  "dreamSymbols": [
    { "label": "symbol name", "meaning": "interpretation" }
  ],
  "themes": [
    { "label": "theme name", "weight": 0.0-1.0 }
  ],
  "astrology": {
    "sun": "sun sign interpretation if relevant",
    "moon": "moon sign interpretation if relevant",
    "asc": "ascendant interpretation if relevant",
    "highlights": ["key astrological insight 1", "insight 2"]
  },
  "crossInsights": [
    "unique insight combining Eastern and Western traditions"
  ],
  "recommendations": [
    "practical action or reflection point"
  ]
}
\`\`\`

Focus on being insightful, culturally sensitive, and practical. Avoid generic interpretations.
`;

  return prompt;
}

/**
 * Generate quick dream entry from selected options
 */
export function generateQuickDreamEntry(params: {
  symbols: string[];
  emotions: string[];
  additionalDetails?: string;
}): string {
  const { symbols, emotions, additionalDetails } = params;

  let entry = 'In my dream, I encountered ';

  // Add symbols
  if (symbols.length > 0) {
    entry += symbols.join(', ');
  }

  // Add emotions
  if (emotions.length > 0) {
    entry += `. I felt ${emotions.join(', ')}`;
  }

  entry += '.';

  // Add additional details if provided
  if (additionalDetails && additionalDetails.trim()) {
    entry += ` ${additionalDetails.trim()}`;
  }

  return entry;
}

/**
 * Get symbol by name (Korean or English)
 */
export function findSymbol(name: string) {
  name = name.toLowerCase();
  for (const [category, symbols] of Object.entries(DREAM_SYMBOLS)) {
    const found = symbols.find(
      (s) => s.ko.toLowerCase() === name || s.en.toLowerCase() === name
    );
    if (found) return { ...found, category };
  }
  return null;
}

/**
 * Get emotion by name (Korean or English)
 */
export function findEmotion(name: string) {
  name = name.toLowerCase();
  return DREAM_EMOTIONS.find(
    (e) => e.ko.toLowerCase() === name || e.en.toLowerCase() === name
  );
}
