// src/lib/numerology/descriptions.ts
// Human-readable texts for numerology readings. Logic untouched; strings cleaned to ASCII.
import { reduceToCore } from "./utils";

export type CoreKey = "lifePath" | "expression" | "soulUrge" | "personality" | "personalYear" | "personalMonth" | "personalDay";

const base: Record<number, { title: string; tagline: string; aura: string }> = {
  1: { title: "Leader / Pioneer", tagline: "Takes initiative, sets direction, moves first when others hesitate.", aura: "Decisive, self-driven, assertive" },
  2: { title: "Mediator / Partner", tagline: "Builds harmony, senses nuance, brings people to common ground.", aura: "Cooperative, diplomatic, steady" },
  3: { title: "Communicator / Creator", tagline: "Expressive and playful; translates ideas into uplifting stories.", aura: "Artistic, social, optimistic" },
  4: { title: "Builder / Steward", tagline: "Systematic and reliable; turns plans into consistent execution.", aura: "Grounded, methodical, dependable" },
  5: { title: "Explorer / Catalyst", tagline: "Thrives on change; brings momentum and adaptive thinking.", aura: "Adventurous, curious, flexible" },
  6: { title: "Guardian / Nurturer", tagline: "Protects and cares; creates warmth and responsibility for the group.", aura: "Caring, loyal, stabilizing" },
  7: { title: "Seeker / Analyst", tagline: "Looks beneath the surface; seeks depth, truth, and pattern.", aura: "Introspective, discerning, insightful" },
  8: { title: "Executor / Strategist", tagline: "Handles resources and power with focus on outcomes.", aura: "Ambitious, influential, results-oriented" },
  9: { title: "Humanitarian / Visionary", tagline: "Broad perspective; channels compassion into impact.", aura: "Empathetic, inspiring, generous" },
  11: { title: "Illuminator (Master 11)", tagline: "Heightened intuition and inspiration; bridges ideas and spirit.", aura: "Intuitive, visionary, catalytic" },
  22: { title: "Master Builder (Master 22)", tagline: "Turns large visions into tangible systems; long-horizon planner.", aura: "Pragmatic, architecting, enduring" },
  33: { title: "Master Healer (Master 33)", tagline: "Deep service and guidance; heals through wisdom and care.", aura: "Compassionate, integrative, mentoring" },
};

function safeBase(n: unknown) {
  const r = reduceToCore(n);
  return base[r] ?? base[1];
}

const templates: Record<CoreKey, (n: number) => string> = {
  lifePath: (n) => {
    const b = safeBase(n);
    return `Your life path emphasizes ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  expression: (n) => {
    const b = safeBase(n);
    return `Your expression number channels ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  soulUrge: (n) => {
    const b = safeBase(n);
    return `Heart's Desire leans toward ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  personality: (n) => {
    const b = safeBase(n);
    return `Outward personality projects ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  personalYear: (n) => {
    const b = safeBase(n);
    return `This year carries ${b.title} energy. ${b.tagline}`;
  },
  personalMonth: (n) => {
    const b = safeBase(n);
    return `This month highlights ${b.title} themes. ${b.tagline}`;
  },
  personalDay: (n) => {
    const b = safeBase(n);
    return `Today resonates with ${b.title}. ${b.aura}.`;
  },
};

export function describe(core: CoreKey, n: number) {
  return templates[core](n);
}

export const luckyTag: Record<number, string> = {
  1: "Initiative, independence",
  2: "Partnership, balance",
  3: "Expression, creativity",
  4: "Stability, structure",
  5: "Change, versatility",
  6: "Care, responsibility",
  7: "Insight, research",
  8: "Power, execution",
  9: "Compassion, legacy",
  11: "Vision, inspiration",
  22: "Execution at scale",
  33: "Service, healing",
};

const luckyTagKo: Record<number, string> = {
  1: "주도력, 독립성",
  2: "파트너십, 균형",
  3: "표현력, 창의성",
  4: "안정성, 구조",
  5: "변화, 다재다능",
  6: "돌봄, 책임감",
  7: "통찰력, 연구",
  8: "권력, 실행력",
  9: "자비, 유산",
  11: "비전, 영감",
  22: "대규모 실행",
  33: "봉사, 치유",
};

const baseKo: Record<number, { title: string; tagline: string; aura: string }> = {
  1: { title: "리더 / 개척자", tagline: "주도권을 잡고, 방향을 설정하며, 다른 사람들이 망설일 때 먼저 움직입니다.", aura: "결단력, 자기주도적, 적극적" },
  2: { title: "중재자 / 파트너", tagline: "조화를 구축하고, 뉘앙스를 감지하며, 사람들을 공통점으로 이끕니다.", aura: "협력적, 외교적, 안정적" },
  3: { title: "소통가 / 창작자", tagline: "표현력이 풍부하고 유쾌하며, 아이디어를 고양시키는 이야기로 전환합니다.", aura: "예술적, 사교적, 낙관적" },
  4: { title: "건설자 / 관리자", tagline: "체계적이고 신뢰할 수 있으며, 계획을 일관된 실행으로 전환합니다.", aura: "현실적, 체계적, 신뢰할 수 있는" },
  5: { title: "탐험가 / 촉매제", tagline: "변화를 즐기며, 추진력과 적응적 사고를 가져옵니다.", aura: "모험적, 호기심, 유연한" },
  6: { title: "수호자 / 양육자", tagline: "보호하고 돌보며, 그룹에 따뜻함과 책임감을 만듭니다.", aura: "배려하는, 충성스러운, 안정시키는" },
  7: { title: "탐구자 / 분석가", tagline: "표면 아래를 보며, 깊이, 진실, 패턴을 찾습니다.", aura: "내성적, 식별력 있는, 통찰력 있는" },
  8: { title: "실행자 / 전략가", tagline: "결과에 초점을 맞추어 자원과 권력을 다룹니다.", aura: "야심 찬, 영향력 있는, 결과 지향적" },
  9: { title: "인도주의자 / 비전가", tagline: "넓은 관점을 가지고 연민을 영향력으로 전환합니다.", aura: "공감적, 영감을 주는, 관대한" },
  11: { title: "계몽자 (마스터 11)", tagline: "높아진 직관과 영감; 아이디어와 영혼을 연결합니다.", aura: "직관적, 비전이 있는, 촉매적" },
  22: { title: "마스터 빌더 (마스터 22)", tagline: "큰 비전을 실질적인 시스템으로 전환; 장기 계획자.", aura: "실용적, 설계하는, 지속적인" },
  33: { title: "마스터 힐러 (마스터 33)", tagline: "깊은 봉사와 안내; 지혜와 돌봄으로 치유합니다.", aura: "자비로운, 통합적, 멘토링" },
};

// Extended CoreKey for locale support
export type ExtendedCoreKey = CoreKey | "birthday" | "maturity" | "balance" | "rationalThought" |
  "cornerstone" | "capstone" | "firstVowel" | "subconscious" | "karmicDebt" | "karmicLesson" |
  "pinnacle" | "challenge" | "universalYear" | "universalMonth" | "universalDay";

function safeBaseLocale(n: unknown, locale: string) {
  const r = reduceToCore(n);
  if (locale === "ko") {
    return baseKo[r] ?? baseKo[1];
  }
  return base[r] ?? base[1];
}

const templatesKo: Record<string, (n: number) => string> = {
  lifePath: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `당신의 생명 경로는 ${b.title}를 강조합니다. ${b.tagline} 오라 하이라이트: ${b.aura}.`;
  },
  expression: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `당신의 표현 숫자는 ${b.title}를 채널링합니다. ${b.tagline} 오라 하이라이트: ${b.aura}.`;
  },
  soulUrge: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `마음의 욕망은 ${b.title}을 향합니다. ${b.tagline} 오라 하이라이트: ${b.aura}.`;
  },
  personality: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `외향적 성격은 ${b.title}을 투영합니다. ${b.tagline} 오라 하이라이트: ${b.aura}.`;
  },
  personalYear: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `올해는 ${b.title} 에너지를 담고 있습니다. ${b.tagline}`;
  },
  personalMonth: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `이번 달은 ${b.title} 테마를 강조합니다. ${b.tagline}`;
  },
  personalDay: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `오늘은 ${b.title}과 공명합니다. ${b.aura}.`;
  },
  birthday: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `생일 숫자는 ${b.title}의 특성을 나타냅니다. ${b.aura}.`;
  },
  maturity: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `성숙 숫자는 인생 후반에 ${b.title}로 발전함을 암시합니다.`;
  },
  balance: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `균형 숫자는 스트레스 상황에서 ${b.title} 접근 방식을 권장합니다.`;
  },
  rationalThought: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `합리적 사고 숫자는 ${b.title} 스타일의 분석을 선호함을 나타냅니다.`;
  },
  cornerstone: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `기초석은 ${b.title}의 시작 에너지를 나타냅니다.`;
  },
  capstone: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `정점석은 ${b.title}의 완성 에너지를 나타냅니다.`;
  },
  firstVowel: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `첫 모음은 ${b.title}의 내면 반응을 나타냅니다.`;
  },
  subconscious: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `잠재의식 숫자는 ${b.title}의 숨겨진 강점을 나타냅니다.`;
  },
  karmicDebt: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `카르마 부채 ${n}은 ${b.title}와 관련된 교훈을 배워야 함을 나타냅니다.`;
  },
  karmicLesson: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `카르마 레슨 ${n}은 ${b.title} 영역에서 성장이 필요함을 나타냅니다.`;
  },
  pinnacle: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `이 정점 주기는 ${b.title} 에너지를 강조합니다. ${b.tagline}`;
  },
  challenge: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `이 도전 주기는 ${b.title} 영역에서 성장 기회를 제공합니다.`;
  },
  universalYear: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `올해 우주적 에너지는 ${b.title}입니다. ${b.tagline}`;
  },
  universalMonth: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `이번 달 우주적 에너지는 ${b.title}입니다.`;
  },
  universalDay: (n) => {
    const b = safeBaseLocale(n, "ko");
    return `오늘 우주적 에너지는 ${b.title}입니다.`;
  },
};

const templatesEn: Record<string, (n: number) => string> = {
  ...templates,
  birthday: (n) => {
    const b = safeBase(n);
    return `Birthday number reflects ${b.title} traits. ${b.aura}.`;
  },
  maturity: (n) => {
    const b = safeBase(n);
    return `Maturity number suggests development towards ${b.title} in later life.`;
  },
  balance: (n) => {
    const b = safeBase(n);
    return `Balance number recommends a ${b.title} approach during stressful situations.`;
  },
  rationalThought: (n) => {
    const b = safeBase(n);
    return `Rational thought number indicates preference for ${b.title} style analysis.`;
  },
  cornerstone: (n) => {
    const b = safeBase(n);
    return `Cornerstone represents ${b.title} starting energy.`;
  },
  capstone: (n) => {
    const b = safeBase(n);
    return `Capstone represents ${b.title} completion energy.`;
  },
  firstVowel: (n) => {
    const b = safeBase(n);
    return `First vowel indicates ${b.title} inner reactions.`;
  },
  subconscious: (n) => {
    const b = safeBase(n);
    return `Subconscious number represents hidden ${b.title} strengths.`;
  },
  karmicDebt: (n) => {
    const b = safeBase(n);
    return `Karmic debt ${n} indicates lessons to learn related to ${b.title}.`;
  },
  karmicLesson: (n) => {
    const b = safeBase(n);
    return `Karmic lesson ${n} indicates growth needed in ${b.title} areas.`;
  },
  pinnacle: (n) => {
    const b = safeBase(n);
    return `This pinnacle cycle emphasizes ${b.title} energy. ${b.tagline}`;
  },
  challenge: (n) => {
    const b = safeBase(n);
    return `This challenge cycle offers growth opportunities in ${b.title} areas.`;
  },
  universalYear: (n) => {
    const b = safeBase(n);
    return `This year's universal energy is ${b.title}. ${b.tagline}`;
  },
  universalMonth: (n) => {
    const b = safeBase(n);
    return `This month's universal energy is ${b.title}.`;
  },
  universalDay: (n) => {
    const b = safeBase(n);
    return `Today's universal energy is ${b.title}.`;
  },
};

/**
 * Get description with locale support
 */
export function describeLocale(core: string, n: number, locale: string = "en"): string {
  const t = locale === "ko" ? templatesKo : templatesEn;
  const fn = t[core];
  if (fn) return fn(n);
  // Fallback
  const b = safeBaseLocale(n, locale);
  return b.tagline;
}

/**
 * Get lucky tag with locale support
 */
export function getLuckyTag(n: number, locale: string = "en"): string {
  const r = reduceToCore(n);
  if (locale === "ko") {
    return luckyTagKo[r] ?? luckyTagKo[1];
  }
  return luckyTag[r] ?? luckyTag[1];
}

/**
 * Get number title with locale support
 */
export function getNumberTitle(n: number, locale: string = "en"): string {
  const r = reduceToCore(n);
  if (locale === "ko") {
    return (baseKo[r] ?? baseKo[1]).title;
  }
  return (base[r] ?? base[1]).title;
}
