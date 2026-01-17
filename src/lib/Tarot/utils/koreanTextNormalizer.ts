/**
 * 한글 텍스트 정규화 유틸리티
 * 띄어쓰기, 초성, 맞춤법 오류를 처리하여 패턴 매칭 성공률 향상
 */

// 초성 매핑
const CHOSUNG_MAP: Record<string, string> = {
  'ㄱ': '[가-깋]',
  'ㄲ': '[까-낗]',
  'ㄴ': '[나-닣]',
  'ㄷ': '[다-딯]',
  'ㄸ': '[따-띻]',
  'ㄹ': '[라-맇]',
  'ㅁ': '[마-밓]',
  'ㅂ': '[바-빟]',
  'ㅃ': '[빠-삫]',
  'ㅅ': '[사-싷]',
  'ㅆ': '[싸-앃]',
  'ㅇ': '[아-잏]',
  'ㅈ': '[자-짛]',
  'ㅉ': '[짜-찧]',
  'ㅊ': '[차-칳]',
  'ㅋ': '[카-킿]',
  'ㅌ': '[타-팋]',
  'ㅍ': '[파-핗]',
  'ㅎ': '[하-힣]',
};

const CHOSUNG_LIST = Object.keys(CHOSUNG_MAP);

/**
 * 초성만 있는 질문인지 확인
 */
export function isChosungOnly(text: string): boolean {
  const cleanText = text.replace(/[^ㄱ-ㅎ가-힣]/g, '');
  if (cleanText.length === 0) return false;

  // 50% 이상이 초성이면 초성 질문으로 간주
  const chosungCount = cleanText.split('').filter(char => CHOSUNG_LIST.includes(char)).length;
  return chosungCount / cleanText.length > 0.5;
}

/**
 * 초성을 정규식 패턴으로 변환
 * 예: "ㅇㄷㅇㄷㄱㄹㄲ" → "오늘 운동 갈까" 패턴
 */
export function chosungToPattern(text: string): string {
  let pattern = '';
  for (const char of text) {
    if (CHOSUNG_MAP[char]) {
      pattern += CHOSUNG_MAP[char];
    } else if (/[가-힣]/.test(char)) {
      pattern += char;
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
    }
  }
  return pattern;
}

/**
 * 초성 질문을 가능한 완성 문장으로 변환
 */
export function expandChosungQuestion(text: string): string[] {
  const expansions: string[] = [];

  // 일반적인 yes/no 질문 패턴
  const commonPatterns: [RegExp, string][] = [
    [/^ㅇㄷ.*ㄱㄹㄲ$/, '오늘 운동 갈까'],
    [/^ㄹㅁㄴ.*ㅁㅇㄹㄲ$/, '라면 먹을까'],
    [/^ㅅ.*ㅁㅅㄹㄲ$/, '술 마실까'],
    [/^ㅁㄹ.*ㅇㅅㅎㄹㄲ$/, '머리 염색할까'],
    [/^ㅇㄷ.*ㅅㄹㄲ$/, '이 옷 살까'],
    [/^ㄱ.*ㅎㄹㄲ$/, '게임 할까'],
    [/^ㅇㄷㅎㄹㄲ$/, '어떨까'],
  ];

  for (const [pattern, expansion] of commonPatterns) {
    if (pattern.test(text)) {
      expansions.push(expansion);
    }
  }

  return expansions;
}

/**
 * 텍스트 정규화 (띄어쓰기 무시, 소문자 변환)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '') // 모든 공백 제거
    .replace(/[?!.,;~]/g, '') // 구두점 제거
    .trim();
}

/**
 * 패턴 매칭 전 텍스트 정규화 + 초성 확장
 */
export function prepareForMatching(text: string): string[] {
  const variants: string[] = [];

  // 1. 원본
  variants.push(text);

  // 2. 정규화 버전
  const normalized = normalizeText(text);
  variants.push(normalized);

  // 3. 초성만 있으면 확장
  if (isChosungOnly(normalized)) {
    const expanded = expandChosungQuestion(normalized);
    variants.push(...expanded);
    variants.push(...expanded.map(e => normalizeText(e)));
  }

  // 4. 공통 맞춤법 오류 수정
  const typoFixed = fixCommonTypos(normalized);
  if (typoFixed !== normalized) {
    variants.push(typoFixed);
  }

  return Array.from(new Set(variants)); // 중복 제거
}

/**
 * 일반적인 맞춤법 오류 수정
 */
function fixCommonTypos(text: string): string {
  const typoMap: [RegExp, string][] = [
    [/되요/g, '돼요'],
    [/안되/g, '안돼'],
    [/할려고/g, '하려고'],
    [/갈려고/g, '가려고'],
    [/먹을려고/g, '먹으려고'],
    [/봤어요/g, '봤어요'],
    [/됬어/g, '됐어'],
    [/됬다/g, '됐다'],
    [/했다/g, '했다'],
    [/갔다/g, '갔다'],
    [/왔다/g, '왔다'],
    [/했어/g, '했어'],
  ];

  let fixed = text;
  for (const [pattern, replacement] of typoMap) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

/**
 * 특정 패턴이 텍스트에 매칭되는지 확인 (정규화된 버전 포함)
 */
export function fuzzyMatch(text: string, patterns: RegExp[]): boolean {
  const variants = prepareForMatching(text);

  for (const variant of variants) {
    for (const pattern of patterns) {
      if (pattern.test(variant)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Yes/No 질문 강화 패턴 (띄어쓰기 무시)
 */
export function enhancedYesNoMatch(text: string): boolean {
  const normalized = normalizeText(text);

  // 띄어쓰기 없는 버전의 패턴들
  const noSpacePatterns = [
    /할까$/,
    /갈까$/,
    /볼까$/,
    /살까$/,
    /먹을까$/,
    /마실까$/,
    /만날까$/,
    /시작할까$/,
    /보낼까$/,
    /연락할까$/,
    /뽀뽀할까$/,
    /키스할까$/,
    /염색할까$/,
    /할까말까/,
    /해야하나/,
    /해도될까/,
    /좋을까$/,
  ];

  return noSpacePatterns.some(p => p.test(normalized));
}

/**
 * 초성 디코딩 (간단한 휴리스틱)
 * "ㅇㄷㅇㄷㄱㄹㄲ" → "오늘운동갈까" 추측
 */
export function decodeChosung(text: string): string | null {
  if (!isChosungOnly(text)) return null;

  // 일반적인 패턴 매칭
  const knownPatterns: Record<string, string> = {
    'ㅇㄷㅇㄷㄱㄹㄲ': '오늘운동갈까',
    'ㄹㅁㄴㅁㅇㄹㄲ': '라면먹을까',
    'ㅅㅁㅅㄹㄲ': '술마실까',
    'ㅁㄹㅇㅅㅎㄹㄲ': '머리염색할까',
    'ㅇㅇㅅㄹㄲ': '이옷살까',
    'ㄱㅎㅌㅃㅃㅎㄹㄲ': '개한테뽀뽀할까',
    'ㄱㅎㅌㅋㅅㅎㄹㄲ': '개한테키스할까',
    'ㅇㄷㅎㄹㄲ': '어떨까',
    'ㄱㅎㄹㄲ': '갈까',
    'ㅎㄹㄲ': '할까',
    'ㅁㅇㄹㄲ': '먹을까',
    'ㅅㄹㄲ': '살까',
    'ㅂㄹㄲ': '볼까',
  };

  const normalized = normalizeText(text);
  return knownPatterns[normalized] || null;
}

/**
 * 텍스트 유사도 계산 (Levenshtein distance)
 */
export function similarity(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}
