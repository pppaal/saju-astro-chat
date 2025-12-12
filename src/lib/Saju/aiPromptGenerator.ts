// src/lib/Saju/aiPromptGenerator.ts
// AI 프롬프트 생성기 (500% 급 모듈)
// LLM/이미지 생성 AI를 위한 프롬프트 자동 생성

import { FiveElement, SajuPillars, SibsinKind } from './types';
import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS } from './constants';

// ============================================================
// 헬퍼 함수
// ============================================================

function getStemElement(stem: string): FiveElement {
  const found = STEMS.find(s => s.name === stem);
  return found?.element as FiveElement || '토';
}

function getBranchElement(branch: string): FiveElement {
  const found = BRANCHES.find(b => b.name === branch);
  return found?.element as FiveElement || '토';
}

function getStemYinYang(stem: string): '양' | '음' {
  const found = STEMS.find(s => s.name === stem);
  return found?.yin_yang || '양';
}

// ============================================================
// 타입 정의
// ============================================================

/** 프롬프트 유형 */
export type PromptType =
  | 'fortune_reading'    // 운세 해석
  | 'personality'        // 성격 분석
  | 'compatibility'      // 궁합 분석
  | 'career'             // 진로/직업
  | 'health'             // 건강
  | 'image_aura'         // 오라 이미지
  | 'image_element'      // 오행 이미지
  | 'image_fortune'      // 운세 카드 이미지
  | 'narrative';         // 스토리텔링

/** 프롬프트 스타일 */
export type PromptStyle =
  | 'professional'       // 전문적
  | 'friendly'           // 친근한
  | 'mystical'           // 신비로운
  | 'modern'             // 현대적
  | 'traditional';       // 전통적

/** 프롬프트 언어 */
export type PromptLanguage = 'ko' | 'en' | 'ja' | 'zh';

/** 프롬프트 옵션 */
export interface PromptOptions {
  type: PromptType;
  style?: PromptStyle;
  language?: PromptLanguage;
  maxLength?: number;
  includeDisclaimer?: boolean;
  targetAudience?: 'general' | 'expert' | 'young';
  additionalContext?: string;
}

/** 생성된 프롬프트 */
export interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextData: Record<string, unknown>;
  suggestedFollowUps: string[];
  metadata: {
    type: PromptType;
    style: PromptStyle;
    language: PromptLanguage;
    tokenEstimate: number;
  };
}

/** 이미지 프롬프트 */
export interface ImagePrompt {
  positive: string;      // 포함할 요소
  negative: string;      // 제외할 요소
  style: string;         // 이미지 스타일
  aspectRatio: string;   // 비율
  quality: string;       // 품질 키워드
  metadata: {
    element: FiveElement;
    mood: string;
    colorPalette: string[];
  };
}

// ============================================================
// 오행별 키워드
// ============================================================

const ELEMENT_KEYWORDS = {
  '목': {
    colors: ['emerald green', 'jade', 'spring green', 'forest'],
    moods: ['growth', 'vitality', 'renewal', 'creativity'],
    symbols: ['tree', 'bamboo', 'spring leaves', 'seedling'],
    textures: ['wood grain', 'bark', 'natural fibers'],
    lighting: ['morning light', 'dappled sunlight', 'fresh dawn'],
  },
  '화': {
    colors: ['crimson red', 'orange flame', 'golden yellow', 'sunset'],
    moods: ['passion', 'energy', 'brilliance', 'transformation'],
    symbols: ['flame', 'phoenix', 'sun', 'candle'],
    textures: ['ember glow', 'fire particles', 'warm radiance'],
    lighting: ['dramatic lighting', 'warm glow', 'fiery atmosphere'],
  },
  '토': {
    colors: ['earth brown', 'ochre', 'terracotta', 'sand beige'],
    moods: ['stability', 'grounding', 'nurturing', 'abundance'],
    symbols: ['mountain', 'field', 'clay pot', 'harvest'],
    textures: ['soil', 'ceramic', 'stone', 'natural earth'],
    lighting: ['golden hour', 'warm ambient', 'soft afternoon'],
  },
  '금': {
    colors: ['silver', 'white gold', 'platinum', 'metallic gray'],
    moods: ['precision', 'clarity', 'refinement', 'justice'],
    symbols: ['sword', 'coin', 'crystal', 'metal ornament'],
    textures: ['polished metal', 'crystalline', 'brushed silver'],
    lighting: ['cool light', 'moonlight', 'crisp clarity'],
  },
  '수': {
    colors: ['deep blue', 'navy', 'midnight black', 'ocean teal'],
    moods: ['wisdom', 'depth', 'mystery', 'intuition'],
    symbols: ['water', 'moon', 'wave', 'rain'],
    textures: ['flowing water', 'mist', 'ripples', 'deep ocean'],
    lighting: ['moonlit', 'underwater glow', 'mysterious ambiance'],
  },
};

const SIBSIN_DESCRIPTIONS: Record<SibsinKind, { en: string; theme: string }> = {
  '비견': { en: 'Companion', theme: 'partnership and competition' },
  '겁재': { en: 'Rob Wealth', theme: 'challenge and drive' },
  '식신': { en: 'Eating God', theme: 'creativity and expression' },
  '상관': { en: 'Hurting Officer', theme: 'rebellion and innovation' },
  '편재': { en: 'Indirect Wealth', theme: 'opportunity and risk' },
  '정재': { en: 'Direct Wealth', theme: 'stability and accumulation' },
  '편관': { en: 'Seven Killings', theme: 'power and authority' },
  '정관': { en: 'Direct Officer', theme: 'honor and responsibility' },
  '편인': { en: 'Indirect Resource', theme: 'unconventional wisdom' },
  '정인': { en: 'Direct Resource', theme: 'nurturing and learning' },
};

// ============================================================
// 프롬프트 생성 함수
// ============================================================

/**
 * LLM 프롬프트 생성
 */
export function generateLLMPrompt(
  pillars: SajuPillars,
  options: PromptOptions
): GeneratedPrompt {
  const style = options.style || 'professional';
  const language = options.language || 'ko';

  const dayMaster = pillars.day.heavenlyStem.name;
  const dayElement = getStemElement(dayMaster);
  const dayYinYang = getStemYinYang(dayMaster);

  // 시스템 프롬프트 생성
  const systemPrompt = generateSystemPrompt(options.type, style, language);

  // 사용자 프롬프트 생성
  const userPrompt = generateUserPrompt(pillars, options);

  // 컨텍스트 데이터
  const contextData = {
    dayMaster,
    dayElement,
    dayYinYang,
    pillars: {
      year: `${pillars.year.heavenlyStem.name}${pillars.year.earthlyBranch.name}`,
      month: `${pillars.month.heavenlyStem.name}${pillars.month.earthlyBranch.name}`,
      day: `${pillars.day.heavenlyStem.name}${pillars.day.earthlyBranch.name}`,
      time: `${pillars.time.heavenlyStem.name}${pillars.time.earthlyBranch.name}`,
    },
  };

  // 후속 질문 제안
  const suggestedFollowUps = generateFollowUpQuestions(options.type, language);

  // 토큰 추정
  const tokenEstimate = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

  return {
    systemPrompt,
    userPrompt,
    contextData,
    suggestedFollowUps,
    metadata: {
      type: options.type,
      style,
      language,
      tokenEstimate,
    },
  };
}

function generateSystemPrompt(
  type: PromptType,
  style: PromptStyle,
  language: PromptLanguage
): string {
  const styleInstructions: Record<PromptStyle, string> = {
    professional: '전문적이고 체계적인 분석을 제공합니다. 학술적 용어를 적절히 사용하되 이해하기 쉽게 설명합니다.',
    friendly: '친근하고 따뜻한 어조로 상담합니다. 공감하며 격려하는 자세로 조언합니다.',
    mystical: '신비롭고 시적인 표현을 사용합니다. 우주의 기운과 연결된 통찰을 전달합니다.',
    modern: '현대적이고 실용적인 관점에서 해석합니다. 일상에 적용 가능한 조언을 제공합니다.',
    traditional: '전통 명리학의 격식을 갖춰 해석합니다. 고전적 용어와 표현을 적절히 사용합니다.',
  };

  const typeInstructions: Record<PromptType, string> = {
    fortune_reading: '사주 팔자를 바탕으로 운세를 분석하고 조언을 제공합니다.',
    personality: '타고난 성격과 기질, 강점과 약점을 분석합니다.',
    compatibility: '두 사람 간의 궁합을 분석하고 관계 조언을 제공합니다.',
    career: '적합한 진로와 직업, 성공 전략을 분석합니다.',
    health: '오행 균형에 따른 건강 경향과 관리법을 안내합니다.',
    image_aura: '오라 이미지 생성을 위한 설명을 제공합니다.',
    image_element: '오행 에너지를 시각화하는 이미지 설명을 제공합니다.',
    image_fortune: '운세 카드 이미지 생성을 위한 설명을 제공합니다.',
    narrative: '사주를 바탕으로 인생 스토리를 풀어냅니다.',
  };

  const basePrompt = language === 'ko'
    ? `당신은 전문 사주 명리학자입니다. ${typeInstructions[type]} ${styleInstructions[style]}`
    : `You are a professional Four Pillars of Destiny consultant. ${getEnglishTypeInstruction(type)} ${getEnglishStyleInstruction(style)}`;

  const disclaimer = language === 'ko'
    ? '\n\n참고: 사주 해석은 참고용이며, 중요한 결정은 전문가와 상담하시기 바랍니다.'
    : '\n\nNote: This reading is for reference only. Please consult professionals for important decisions.';

  return basePrompt + disclaimer;
}

function getEnglishTypeInstruction(type: PromptType): string {
  const instructions: Record<PromptType, string> = {
    fortune_reading: 'Analyze fortune based on the Four Pillars and provide guidance.',
    personality: 'Analyze innate personality traits, strengths, and weaknesses.',
    compatibility: 'Analyze compatibility between two people and provide relationship advice.',
    career: 'Analyze suitable career paths and success strategies.',
    health: 'Provide health guidance based on elemental balance.',
    image_aura: 'Describe aura visualization for image generation.',
    image_element: 'Describe elemental energy visualization.',
    image_fortune: 'Describe fortune card imagery.',
    narrative: 'Tell a life story based on the Four Pillars.',
  };
  return instructions[type];
}

function getEnglishStyleInstruction(style: PromptStyle): string {
  const instructions: Record<PromptStyle, string> = {
    professional: 'Provide systematic analysis with appropriate technical terms explained clearly.',
    friendly: 'Use warm, encouraging tone with empathy and supportive advice.',
    mystical: 'Use poetic, mysterious expressions connecting to cosmic energies.',
    modern: 'Interpret from a practical, contemporary perspective with actionable advice.',
    traditional: 'Use classical terminology and formal traditional interpretation style.',
  };
  return instructions[style];
}

function generateUserPrompt(
  pillars: SajuPillars,
  options: PromptOptions
): string {
  const language = options.language || 'ko';

  const pillarStr = `${pillars.year.heavenlyStem.name}${pillars.year.earthlyBranch.name} ` +
    `${pillars.month.heavenlyStem.name}${pillars.month.earthlyBranch.name} ` +
    `${pillars.day.heavenlyStem.name}${pillars.day.earthlyBranch.name} ` +
    `${pillars.time.heavenlyStem.name}${pillars.time.earthlyBranch.name}`;

  const dayElement = getStemElement(pillars.day.heavenlyStem.name);

  if (language === 'ko') {
    const typePrompts: Record<PromptType, string> = {
      fortune_reading: `다음 사주를 분석해주세요: ${pillarStr}\n일간: ${pillars.day.heavenlyStem.name}(${dayElement})`,
      personality: `다음 사주의 성격을 분석해주세요: ${pillarStr}`,
      compatibility: `다음 사주를 분석해주세요: ${pillarStr}`,
      career: `다음 사주의 직업 적성을 분석해주세요: ${pillarStr}`,
      health: `다음 사주의 건강 운을 분석해주세요: ${pillarStr}`,
      image_aura: `다음 사주의 오라를 이미지로 묘사해주세요: ${pillarStr}`,
      image_element: `다음 사주의 오행 에너지를 시각적으로 묘사해주세요: ${pillarStr}`,
      image_fortune: `다음 사주의 운세 카드 이미지를 묘사해주세요: ${pillarStr}`,
      narrative: `다음 사주로 인생 스토리를 풀어주세요: ${pillarStr}`,
    };
    return typePrompts[options.type] + (options.additionalContext ? `\n\n추가 정보: ${options.additionalContext}` : '');
  } else {
    const typePrompts: Record<PromptType, string> = {
      fortune_reading: `Please analyze the following Four Pillars: ${pillarStr}\nDay Master: ${pillars.day.heavenlyStem.name}(${dayElement})`,
      personality: `Please analyze the personality for: ${pillarStr}`,
      compatibility: `Please analyze: ${pillarStr}`,
      career: `Please analyze career aptitude for: ${pillarStr}`,
      health: `Please analyze health fortune for: ${pillarStr}`,
      image_aura: `Please describe the aura image for: ${pillarStr}`,
      image_element: `Please describe the elemental energy visualization for: ${pillarStr}`,
      image_fortune: `Please describe a fortune card image for: ${pillarStr}`,
      narrative: `Please tell a life story for: ${pillarStr}`,
    };
    return typePrompts[options.type] + (options.additionalContext ? `\n\nAdditional context: ${options.additionalContext}` : '');
  }
}

function generateFollowUpQuestions(type: PromptType, language: PromptLanguage): string[] {
  const questions: Record<PromptType, { ko: string[]; en: string[] }> = {
    fortune_reading: {
      ko: ['올해 특별히 주의할 점이 있나요?', '재물운은 어떤가요?', '인간관계에서 주의할 점은?'],
      en: ['Any special precautions this year?', 'How is my wealth fortune?', 'Relationship advice?'],
    },
    personality: {
      ko: ['강점을 살리는 방법은?', '약점 극복 방법은?', '대인관계 스타일은?'],
      en: ['How to leverage strengths?', 'How to overcome weaknesses?', 'Relationship style?'],
    },
    compatibility: {
      ko: ['갈등 해결 방법은?', '더 좋은 관계를 위한 조언은?', '피해야 할 것은?'],
      en: ['Conflict resolution tips?', 'Advice for better relationship?', 'What to avoid?'],
    },
    career: {
      ko: ['구체적인 직업 추천은?', '사업운은 어떤가요?', '전환기에 주의할 점은?'],
      en: ['Specific job recommendations?', 'Business fortune?', 'Career transition advice?'],
    },
    health: {
      ko: ['주의해야 할 장기는?', '건강 보조 방법은?', '운동 추천은?'],
      en: ['Organs to watch?', 'Health support methods?', 'Exercise recommendations?'],
    },
    image_aura: { ko: ['더 밝은 버전은?', '배경 변경은?'], en: ['Brighter version?', 'Change background?'] },
    image_element: { ko: ['다른 스타일로?', '색상 강조는?'], en: ['Different style?', 'Color emphasis?'] },
    image_fortune: { ko: ['카드 디자인 변경?', '다른 테마로?'], en: ['Change card design?', 'Different theme?'] },
    narrative: { ko: ['더 자세히 들려주세요', '미래 전망은?'], en: ['Tell me more', 'Future outlook?'] },
  };

  return questions[type][language === 'ko' ? 'ko' : 'en'];
}

/**
 * 이미지 생성 프롬프트 생성 (Midjourney/DALL-E 스타일)
 */
export function generateImagePrompt(
  pillars: SajuPillars,
  imageType: 'aura' | 'element' | 'fortune_card' | 'portrait',
  options?: {
    style?: 'realistic' | 'artistic' | 'anime' | 'mystical';
    aspectRatio?: '1:1' | '2:3' | '3:2' | '16:9';
  }
): ImagePrompt {
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);
  const dayYinYang = getStemYinYang(pillars.day.heavenlyStem.name);
  const keywords = ELEMENT_KEYWORDS[dayElement];
  const style = options?.style || 'mystical';
  const aspectRatio = options?.aspectRatio || '2:3';

  let positive = '';
  let negative = 'low quality, blurry, distorted, ugly, deformed';

  switch (imageType) {
    case 'aura':
      positive = `ethereal aura energy illustration, glowing ${keywords.colors[0]} aura, ` +
        `soft human silhouette surrounded by gentle ${dayElement === '화' ? 'warm' : dayElement === '수' ? 'cool' : 'natural'} energy waves, ` +
        `${keywords.moods.slice(0, 2).join(' and ')}, ${keywords.lighting[0]}, ` +
        `soft gradient background, mystical spiritual art, soft glow effects, dreamy atmosphere, ` +
        `digital art, highly detailed, 8k`;
      break;

    case 'element':
      positive = `abstract elemental energy visualization, ${dayElement} element, ` +
        `${keywords.symbols.join(', ')}, ${keywords.colors.slice(0, 2).join(' and ')} color scheme, ` +
        `${keywords.textures[0]} textures, ${keywords.lighting[0]}, ` +
        `dynamic energy flow, particles and waves, ` +
        `${style === 'artistic' ? 'watercolor and ink' : 'digital art'} style, ` +
        `${dayYinYang === '양' ? 'bright and vibrant' : 'soft and serene'}, highly detailed`;
      break;

    case 'fortune_card':
      positive = `tarot card design, ${dayElement} element theme, ` +
        `${keywords.symbols[0]} central motif, ${keywords.colors[0]} and gold accents, ` +
        `ornate border with ${keywords.textures[0]} patterns, ` +
        `mystical ${keywords.moods[0]} atmosphere, ${keywords.lighting[0]}, ` +
        `vintage card aesthetic, detailed illustration, symmetrical composition`;
      break;

    case 'portrait':
      positive = `mystical portrait, ${dayYinYang === '양' ? 'yang energy' : 'yin energy'}, ` +
        `person with ${keywords.colors[0]} aura glow, ${keywords.moods.join(' ')} expression, ` +
        `${keywords.lighting[0]}, ethereal atmosphere, ` +
        `${style === 'anime' ? 'anime style, beautiful illustration' : 'realistic portrait, photorealistic'}, ` +
        `detailed features, dramatic lighting`;
      break;
  }

  // 스타일별 추가
  const styleAdditions: Record<string, string> = {
    realistic: ', photorealistic, professional photography',
    artistic: ', watercolor, impressionistic, artistic interpretation',
    anime: ', anime style, vibrant colors, clean lines',
    mystical: ', mystical atmosphere, ethereal glow, magical realism',
  };
  positive += styleAdditions[style] || styleAdditions.mystical;

  // 비율 추가
  positive += ` --ar ${aspectRatio} --v 6.1 --s 400`;

  return {
    positive,
    negative,
    style: style,
    aspectRatio,
    quality: '8k, highly detailed',
    metadata: {
      element: dayElement,
      mood: keywords.moods[0],
      colorPalette: keywords.colors,
    },
  };
}

/**
 * 스토리텔링 프롬프트 생성
 */
export function generateNarrativePrompt(
  pillars: SajuPillars,
  narrativeType: 'life_story' | 'year_ahead' | 'relationship' | 'career_path'
): GeneratedPrompt {
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);

  const narrativeFrames: Record<string, string> = {
    life_story: `이 사주를 가진 사람의 인생 여정을 이야기로 풀어주세요.
어린 시절, 청년기, 중년, 노년까지 각 시기의 주요 테마와 성장 이야기를 담아주세요.
${dayElement}의 기운을 가진 주인공이 겪는 도전과 성취를 생생하게 묘사해주세요.`,

    year_ahead: `이 사주를 가진 사람의 올해 운세를 이야기 형식으로 전해주세요.
봄, 여름, 가을, 겨울 각 계절의 흐름과 주요 이벤트를 예측해주세요.
희망적이면서도 현실적인 조언을 담아주세요.`,

    relationship: `이 사주를 가진 사람의 인연 이야기를 들려주세요.
어떤 사람과 어떻게 만나게 될지, 관계의 발전 과정을 이야기로 풀어주세요.
${dayElement}의 특성이 관계에 어떻게 영향을 미치는지 묘사해주세요.`,

    career_path: `이 사주를 가진 사람의 직업 여정을 이야기해주세요.
적성, 시작, 성장, 성공의 과정을 드라마틱하게 풀어주세요.
${dayElement}의 강점이 어떻게 발휘되는지 보여주세요.`,
  };

  return generateLLMPrompt(pillars, {
    type: 'narrative',
    style: 'mystical',
    language: 'ko',
    additionalContext: narrativeFrames[narrativeType],
  });
}

/**
 * 챗봇 대화 프롬프트 생성
 */
export function generateChatPrompt(
  pillars: SajuPillars,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): { systemPrompt: string; messages: Array<{ role: string; content: string }> } {
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);

  const systemPrompt = `당신은 친근하고 지혜로운 사주 상담사입니다.
상담자의 사주: ${pillars.year.heavenlyStem.name}${pillars.year.earthlyBranch.name} ${pillars.month.heavenlyStem.name}${pillars.month.earthlyBranch.name} ${pillars.day.heavenlyStem.name}${pillars.day.earthlyBranch.name} ${pillars.time.heavenlyStem.name}${pillars.time.earthlyBranch.name}
일간: ${pillars.day.heavenlyStem.name} (${dayElement})

다음 원칙을 따라주세요:
1. 따뜻하고 공감하는 어조로 대화합니다
2. 사주 분석을 바탕으로 구체적인 조언을 제공합니다
3. 부정적인 내용도 긍정적인 방향으로 전환합니다
4. 질문에 명확하게 답변합니다
5. 필요시 추가 질문으로 대화를 이어갑니다`;

  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return { systemPrompt, messages };
}
