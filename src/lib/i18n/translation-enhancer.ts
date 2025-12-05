/**
 * Translation Enhancement Utility
 * Improves translation quality with context-aware adjustments
 */

type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt';

interface TranslationContext {
  domain: 'astrology' | 'saju' | 'tarot' | 'general';
  tone: 'formal' | 'casual' | 'mystical' | 'professional';
  length: 'short' | 'medium' | 'long';
}

/**
 * Language-specific formatting rules
 */
const LANGUAGE_RULES: Record<Language, {
  honorifics: boolean;
  formality: 'high' | 'medium' | 'low';
  sentenceStructure: 'sov' | 'svo';
  numeralSystem: 'western' | 'eastern';
}> = {
  ko: {
    honorifics: true,
    formality: 'high',
    sentenceStructure: 'sov',
    numeralSystem: 'eastern',
  },
  ja: {
    honorifics: true,
    formality: 'high',
    sentenceStructure: 'sov',
    numeralSystem: 'eastern',
  },
  zh: {
    honorifics: false,
    formality: 'medium',
    sentenceStructure: 'svo',
    numeralSystem: 'eastern',
  },
  en: {
    honorifics: false,
    formality: 'low',
    sentenceStructure: 'svo',
    numeralSystem: 'western',
  },
  es: {
    honorifics: false,
    formality: 'medium',
    sentenceStructure: 'svo',
    numeralSystem: 'western',
  },
  fr: {
    honorifics: false,
    formality: 'medium',
    sentenceStructure: 'svo',
    numeralSystem: 'western',
  },
  de: {
    honorifics: false,
    formality: 'medium',
    sentenceStructure: 'svo',
    numeralSystem: 'western',
  },
  pt: {
    honorifics: false,
    formality: 'medium',
    sentenceStructure: 'svo',
    numeralSystem: 'western',
  },
};

/**
 * Domain-specific terminology mappings
 */
const DOMAIN_TERMS: Record<string, Record<Language, string>> = {
  // Astrology terms
  'sun_sign': {
    ko: '태양 별자리',
    en: 'Sun Sign',
    ja: '太陽星座',
    zh: '太阳星座',
    es: 'Signo Solar',
    fr: 'Signe Solaire',
    de: 'Sonnenzeichen',
    pt: 'Signo Solar',
  },
  'rising_sign': {
    ko: '상승 별자리',
    en: 'Rising Sign',
    ja: 'アセンダント',
    zh: '上升星座',
    es: 'Signo Ascendente',
    fr: 'Signe Ascendant',
    de: 'Aszendent',
    pt: 'Signo Ascendente',
  },
  'moon_sign': {
    ko: '달 별자리',
    en: 'Moon Sign',
    ja: '月星座',
    zh: '月亮星座',
    es: 'Signo Lunar',
    fr: 'Signe Lunaire',
    de: 'Mondzeichen',
    pt: 'Signo Lunar',
  },
  // Saju terms
  'day_master': {
    ko: '일간',
    en: 'Day Master',
    ja: '日干',
    zh: '日主',
    es: 'Maestro del Día',
    fr: 'Maître du Jour',
    de: 'Tagesmeister',
    pt: 'Mestre do Dia',
  },
  'five_elements': {
    ko: '오행',
    en: 'Five Elements',
    ja: '五行',
    zh: '五行',
    es: 'Cinco Elementos',
    fr: 'Cinq Éléments',
    de: 'Fünf Elemente',
    pt: 'Cinco Elementos',
  },
  'heavenly_stem': {
    ko: '천간',
    en: 'Heavenly Stem',
    ja: '天干',
    zh: '天干',
    es: 'Tronco Celestial',
    fr: 'Tige Céleste',
    de: 'Himmlischer Stamm',
    pt: 'Tronco Celestial',
  },
  'earthly_branch': {
    ko: '지지',
    en: 'Earthly Branch',
    ja: '地支',
    zh: '地支',
    es: 'Rama Terrenal',
    fr: 'Branche Terrestre',
    de: 'Irdischer Zweig',
    pt: 'Ramo Terrestre',
  },
};

/**
 * Enhance translation with context-aware adjustments
 */
export function enhanceTranslation(
  text: string,
  targetLang: Language,
  context?: Partial<TranslationContext>
): string {
  let enhanced = text;

  // Apply domain-specific terminology
  if (context?.domain) {
    enhanced = applyDomainTerminology(enhanced, targetLang, context.domain);
  }

  // Apply tone adjustments
  if (context?.tone) {
    enhanced = applyToneAdjustments(enhanced, targetLang, context.tone);
  }

  // Apply language-specific formatting
  enhanced = applyLanguageFormatting(enhanced, targetLang);

  // Apply length adjustments
  if (context?.length) {
    enhanced = applyLengthAdjustments(enhanced, targetLang, context.length);
  }

  return enhanced;
}

/**
 * Apply domain-specific terminology
 */
function applyDomainTerminology(
  text: string,
  lang: Language,
  _domain: string
): string {
  let result = text;

  // Replace common terms with proper terminology
  for (const [key, translations] of Object.entries(DOMAIN_TERMS)) {
    const term = translations[lang];
    if (term) {
      // Case-insensitive replacement
      const regex = new RegExp(key.replace(/_/g, ' '), 'gi');
      result = result.replace(regex, term);
    }
  }

  return result;
}

/**
 * Apply tone-specific adjustments
 */
function applyToneAdjustments(
  text: string,
  lang: Language,
  tone: string
): string {
  const rules = LANGUAGE_RULES[lang];

  // Korean honorifics
  if (lang === 'ko' && rules.honorifics) {
    if (tone === 'formal') {
      text = text.replace(/이에요/g, '입니다');
      text = text.replace(/해요/g, '합니다');
      text = text.replace(/돼요/g, '됩니다');
    } else if (tone === 'casual') {
      text = text.replace(/입니다/g, '이에요');
      text = text.replace(/합니다/g, '해요');
      text = text.replace(/됩니다/g, '돼요');
    }
  }

  // Japanese politeness levels
  if (lang === 'ja' && rules.honorifics) {
    if (tone === 'formal') {
      text = text.replace(/です/g, 'でございます');
      text = text.replace(/ます/g, 'ております');
    }
  }

  return text;
}

/**
 * Apply language-specific formatting
 */
function applyLanguageFormatting(text: string, lang: Language): string {
  // Add proper spacing for Asian languages
  if (['ko', 'ja', 'zh'].includes(lang)) {
    // Remove extra spaces between CJK characters
    text = text.replace(/([一-龥ぁ-ゔァ-ヴー가-힣])\s+([一-龥ぁ-ゔァ-ヴー가-힣])/g, '$1$2');
  }

  // Ensure proper spacing for Western languages
  if (['en', 'es', 'fr', 'de'].includes(lang)) {
    // Add space after punctuation if missing
    text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
  }

  return text;
}

/**
 * Apply length-based adjustments
 */
function applyLengthAdjustments(
  text: string,
  lang: Language,
  length: string
): string {
  if (length === 'short') {
    // Condense for brevity
    text = text.replace(/\s*\([^)]*\)\s*/g, ' '); // Remove parentheticals
    text = text.replace(/,\s*for example,/gi, ',');
    text = text.replace(/,\s*such as,/gi, ',');
  }

  return text.trim();
}

/**
 * Get translation prompt enhancement for AI
 */
export function getTranslationPrompt(
  targetLang: Language,
  context?: Partial<TranslationContext>
): string {
  const rules = LANGUAGE_RULES[targetLang];
  const prompts: string[] = [];

  prompts.push(`Translate to natural, fluent ${targetLang.toUpperCase()}.`);

  if (rules.honorifics) {
    if (context?.tone === 'formal') {
      prompts.push('Use formal/polite language with proper honorifics.');
    } else {
      prompts.push('Use respectful but natural conversational tone.');
    }
  }

  if (context?.domain) {
    prompts.push(`This is ${context.domain} content - use proper terminology.`);
  }

  if (rules.numeralSystem === 'eastern' && ['ko', 'ja', 'zh'].includes(targetLang)) {
    prompts.push('Use appropriate numeral expressions for the culture.');
  }

  return prompts.join(' ');
}

/**
 * Validate translation quality
 */
export function validateTranslation(
  original: string,
  translated: string,
  _lang: Language
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if translation is not empty
  if (!translated || translated.trim().length === 0) {
    issues.push('Translation is empty');
  }

  // Check if translation is not identical to original (unless it's proper nouns)
  if (original === translated && original.split(' ').length > 3) {
    issues.push('Translation appears identical to original');
  }

  // Check for common issues
  if (translated.includes('undefined') || translated.includes('null')) {
    issues.push('Contains undefined/null values');
  }

  // Check character encoding
  if (translated.includes('�')) {
    issues.push('Contains invalid characters');
  }

  // Check length ratio (translations should be within reasonable bounds)
  const ratio = translated.length / original.length;
  if (ratio < 0.3 || ratio > 3) {
    issues.push('Translation length seems unusual');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
