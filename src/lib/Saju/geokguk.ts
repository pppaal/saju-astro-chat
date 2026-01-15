// src/lib/Saju/geokguk.ts
// 격국(格局) 판정 모듈

import { JIJANGGAN, FIVE_ELEMENT_RELATIONS } from './constants';
import type { FiveElement, SajuPillarsInput } from './types';
import {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  normalizeStem,
  normalizeBranch
} from './stemBranchUtils';

export type GeokgukType =
  | '식신격' | '상관격' | '편재격' | '정재격'
  | '편관격' | '정관격' | '편인격' | '정인격'  // 정격 8종
  | '종왕격' | '종강격' | '종아격' | '종재격' | '종살격'  // 종격 5종
  | '건록격' | '양인격' | '월겁격' | '잡기격'  // 비격 4종
  | '갑기화토격' | '을경화금격' | '병신화수격' | '정임화목격' | '무계화화격'  // 화기격국 5종
  | '곡직격' | '염상격' | '가색격' | '종혁격' | '윤하격'  // 특수격국 5종
  | '미정';

export interface GeokgukResult {
  primary: GeokgukType;
  secondary?: GeokgukType;
  category: '정격' | '종격' | '비격' | '화기격국' | '특수격국' | '미정';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  yongsin?: string;
  gisin?: string;
}

// Re-export for backward compatibility
export type { SajuPillarsInput };

// 한글 → 한자 한자 → 한글 변환 (로컬 사용)
const STEM_HAN_TO_KO: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

function stemToKo(s: string): string {
  return STEM_HAN_TO_KO[s] || s;
}

// 십성 계산
type Sipsung = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

function getSipsung(dayElement: FiveElement, dayYinYang: '양' | '음', targetElement: FiveElement, targetYinYang: '양' | '음'): Sipsung {
  const sameYinYang = dayYinYang === targetYinYang;

  if (dayElement === targetElement) {
    return sameYinYang ? '비견' : '겁재';
  }
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayElement] === targetElement) {
    return sameYinYang ? '식신' : '상관';
  }
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayElement] === targetElement) {
    return sameYinYang ? '편재' : '정재';
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayElement] === targetElement) {
    return sameYinYang ? '편관' : '정관';
  }
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayElement] === targetElement) {
    return sameYinYang ? '편인' : '정인';
  }
  return '비견';
}

// 월지 지장간에서 투출 확인
function getTransparentSipsung(pillars: SajuPillarsInput): Sipsung | null {
  const dayS = normalizeStem(pillars.day.stem);
  const monthB = normalizeBranch(pillars.month.branch);
  const dayElement = getStemElement(dayS);
  const dayYinYang = getStemYinYang(dayS);

  const jijanggan = JIJANGGAN[monthB];
  if (!jijanggan) return null;

  // 정기 우선, 중기, 여기 순서로 투출 확인
  const order = ['정기', '중기', '여기'];
  const allStems = [
    normalizeStem(pillars.year.stem),
    normalizeStem(pillars.month.stem),
    normalizeStem(pillars.time.stem),
  ];

  for (const key of order) {
    const hiddenStem = jijanggan[key];
    if (!hiddenStem) continue;

    // 천간에 투출되었는지 확인
    if (allStems.includes(hiddenStem)) {
      const hiddenElement = getStemElement(hiddenStem);
      const hiddenYinYang = getStemYinYang(hiddenStem);
      const sipsung = getSipsung(dayElement, dayYinYang, hiddenElement, hiddenYinYang);

      // 비견/겁재는 격국이 아님
      if (sipsung !== '비견' && sipsung !== '겁재') {
        return sipsung;
      }
    }
  }

  return null;
}

// 오행별 개수 세기
function countElements(pillars: SajuPillarsInput): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.time.stem];
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.time.branch];

  for (const s of stems) {
    counts[getStemElement(s)]++;
  }
  for (const b of branches) {
    counts[getBranchElement(b)]++;
  }

  return counts;
}

// 십성별 개수 세기
function countSipsung(pillars: SajuPillarsInput): Record<Sipsung, number> {
  const dayS = normalizeStem(pillars.day.stem);
  const dayElement = getStemElement(dayS);
  const dayYinYang = getStemYinYang(dayS);

  const counts: Record<Sipsung, number> = {
    '비견': 0, '겁재': 0, '식신': 0, '상관': 0, '편재': 0,
    '정재': 0, '편관': 0, '정관': 0, '편인': 0, '정인': 0
  };

  // 천간
  const stems = [pillars.year.stem, pillars.month.stem, pillars.time.stem];
  for (const s of stems) {
    const e = getStemElement(s);
    const y = getStemYinYang(s);
    counts[getSipsung(dayElement, dayYinYang, e, y)]++;
  }

  // 지지 (본기 기준)
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.time.branch];
  for (const b of branches) {
    const nb = normalizeBranch(b);
    const jj = JIJANGGAN[nb];
    if (jj?.정기) {
      const e = getStemElement(jj.정기);
      const y = getStemYinYang(jj.정기);
      counts[getSipsung(dayElement, dayYinYang, e, y)]++;
    }
  }

  return counts;
}

// 신강/신약 판정
function getStrength(pillars: SajuPillarsInput): '신강' | '신약' | '중화' {
  const counts = countSipsung(pillars);

  // 비겁 + 인성 = 일간을 돕는 세력
  const supporting = counts['비견'] + counts['겁재'] + counts['편인'] + counts['정인'];
  // 식상 + 재성 + 관성 = 일간을 소모/극하는 세력
  const opposing = counts['식신'] + counts['상관'] + counts['편재'] + counts['정재'] + counts['편관'] + counts['정관'];

  if (supporting >= opposing + 2) return '신강';
  if (opposing >= supporting + 2) return '신약';
  return '중화';
}

// 종격 판정
function checkJonggyeok(pillars: SajuPillarsInput): GeokgukType | null {
  const strength = getStrength(pillars);
  const counts = countSipsung(pillars);

  // 극신강: 비겁/인성이 압도적
  if (strength === '신강') {
    const bigeop = counts['비견'] + counts['겁재'];
    const insung = counts['편인'] + counts['정인'];

    if (bigeop >= 5) return '종왕격';  // 비겁이 압도적
    if (insung >= 4 && bigeop >= 2) return '종강격';  // 인성+비겁
  }

  // 극신약: 다른 오행이 압도적
  if (strength === '신약') {
    const siksang = counts['식신'] + counts['상관'];
    const jaesung = counts['편재'] + counts['정재'];
    const gwansung = counts['편관'] + counts['정관'];

    if (siksang >= 4) return '종아격';  // 식상 종격
    if (jaesung >= 4) return '종재격';  // 재성 종격
    if (gwansung >= 4) return '종살격';  // 관성 종격
  }

  return null;
}

// 비격 판정 (건록격, 양인격 등)
function checkBigyeok(pillars: SajuPillarsInput): GeokgukType | null {
  const dayS = normalizeStem(pillars.day.stem);
  const monthB = normalizeBranch(pillars.month.branch);

  // 건록격: 월지가 일간의 록지
  const rokjiMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
  };
  if (rokjiMap[dayS] === monthB) return '건록격';

  // 양인격: 월지가 일간의 양인지
  const yanginMap: Record<string, string> = {
    '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子'
  };
  if (yanginMap[dayS] === monthB) return '양인격';

  // 월겁격: 월지에 겁재가 있는 경우
  const jijanggan = JIJANGGAN[monthB];
  if (jijanggan?.정기) {
    const dayElement = getStemElement(dayS);
    const dayYinYang = getStemYinYang(dayS);
    const hiddenElement = getStemElement(jijanggan.정기);
    const hiddenYinYang = getStemYinYang(jijanggan.정기);
    const sipsung = getSipsung(dayElement, dayYinYang, hiddenElement, hiddenYinYang);
    if (sipsung === '겁재') return '월겁격';
  }

  return null;
}

// 화기격국 판정 (천간합 화)
function checkHwagiGeokguk(pillars: SajuPillarsInput): GeokgukType | null {
  const stems = [
    normalizeStem(pillars.year.stem),
    normalizeStem(pillars.month.stem),
    normalizeStem(pillars.day.stem),
    normalizeStem(pillars.time.stem)
  ];

  // 천간합 쌍
  const hapPairs: Array<{ pair: [string, string]; result: GeokgukType }> = [
    { pair: ['甲', '己'], result: '갑기화토격' },
    { pair: ['乙', '庚'], result: '을경화금격' },
    { pair: ['丙', '辛'], result: '병신화수격' },
    { pair: ['丁', '壬'], result: '정임화목격' },
    { pair: ['戊', '癸'], result: '무계화화격' },
  ];

  for (const { pair, result } of hapPairs) {
    if (stems.includes(pair[0]) && stems.includes(pair[1])) {
      // 일간이 합의 일부이고, 월령이 화한 오행을 도우면 성립
      const dayS = normalizeStem(pillars.day.stem);
      if (pair.includes(dayS)) {
        return result;
      }
    }
  }

  return null;
}

// 특수격국 판정 (곡직격, 염상격 등)
function checkSpecialGeokguk(pillars: SajuPillarsInput): GeokgukType | null {
  const counts = countElements(pillars);
  const dayS = normalizeStem(pillars.day.stem);
  const dayElement = getStemElement(dayS);

  // 한 오행이 6개 이상이면 특수격
  for (const [element, count] of Object.entries(counts)) {
    if (count >= 6) {
      if (element === '목' && dayElement === '목') return '곡직격';
      if (element === '화' && dayElement === '화') return '염상격';
      if (element === '토' && dayElement === '토') return '가색격';
      if (element === '금' && dayElement === '금') return '종혁격';
      if (element === '수' && dayElement === '수') return '윤하격';
    }
  }

  return null;
}

// 메인 격국 판정 함수
export function determineGeokguk(pillars: SajuPillarsInput): GeokgukResult {
  // 1. 특수격국 체크
  const special = checkSpecialGeokguk(pillars);
  if (special) {
    return {
      primary: special,
      category: '특수격국',
      confidence: 'high',
      description: `${special}: 한 오행이 압도적인 특수 격국`,
      yongsin: '같은 오행 강화',
    };
  }

  // 2. 종격 체크
  const jong = checkJonggyeok(pillars);
  if (jong) {
    return {
      primary: jong,
      category: '종격',
      confidence: 'high',
      description: `${jong}: 일간이 한쪽으로 종(從)하는 격국`,
      yongsin: jong === '종왕격' || jong === '종강격' ? '비겁/인성' : '강한 오행 따름',
    };
  }

  // 3. 비격 체크 (건록격, 양인격)
  const bi = checkBigyeok(pillars);
  if (bi) {
    return {
      primary: bi,
      category: '비격',
      confidence: 'high',
      description: `${bi}: 월지에 비겁이 있는 격국`,
      yongsin: '재성 또는 관성',
      gisin: '비겁/인성',
    };
  }

  // 4. 화기격국 체크
  const hwagi = checkHwagiGeokguk(pillars);
  if (hwagi) {
    return {
      primary: hwagi,
      category: '화기격국',
      confidence: 'medium',
      description: `${hwagi}: 천간합이 화(化)하는 격국`,
      yongsin: '화한 오행',
    };
  }

  // 5. 정격 판정 (월지 지장간 투출)
  const transparent = getTransparentSipsung(pillars);
  if (transparent) {
    const geokgukName = `${transparent}격` as GeokgukType;
    const strength = getStrength(pillars);

    let yongsin = '';
    let gisin = '';

    if (strength === '신강') {
      yongsin = '재성/관성/식상';
      gisin = '비겁/인성';
    } else if (strength === '신약') {
      yongsin = '인성/비겁';
      gisin = '재성/관성/식상';
    } else {
      yongsin = '격국에 맞는 용신';
    }

    return {
      primary: geokgukName,
      category: '정격',
      confidence: 'high',
      description: `${geokgukName}: 월지 지장간의 ${transparent}이 투출하여 형성`,
      yongsin,
      gisin,
    };
  }

  // 6. 판정 불가
  return {
    primary: '미정',
    category: '미정',
    confidence: 'low',
    description: '격국 판정을 위한 조건이 명확하지 않음. 전문가 상담 권장',
  };
}

// 격국 설명 가져오기
export function getGeokgukDescription(geokguk: GeokgukType): string {
  const descriptions: Record<GeokgukType, string> = {
    '식신격': '창의력과 표현력이 뛰어나며 식복과 재복이 있음',
    '상관격': '재능이 비범하고 자유분방하며 예술적 감각이 뛰어남',
    '편재격': '사업 수완이 좋고 활동적이며 큰 재물을 다룸',
    '정재격': '안정적이고 성실하며 꾸준한 재물 축적',
    '편관격': '권위와 결단력이 있으며 강한 추진력 보유',
    '정관격': '명예와 품위를 중시하며 사회적 성공 추구',
    '편인격': '학문과 종교에 관심이 많고 비범한 사고력',
    '정인격': '학문을 좋아하고 덕망이 있으며 인자함',
    '종왕격': '비겁이 강하여 독립적이고 자기 주도적',
    '종강격': '인성이 강하여 학문과 지혜로 성공',
    '종아격': '식상이 강하여 재능과 표현으로 성공',
    '종재격': '재성이 강하여 재물과 사업으로 성공',
    '종살격': '관성이 강하여 권력과 명예로 성공',
    '건록격': '월지가 록지로 자수성가형, 독립심 강함',
    '양인격': '결단력과 추진력이 강하며 승부욕 있음',
    '월겁격': '형제나 동료와의 인연이 강하며 경쟁심 있음',
    '잡기격': '여러 기운이 섞여 다재다능하나 집중력 필요',
    '갑기화토격': '갑목과 기토가 합하여 토로 화하는 격',
    '을경화금격': '을목과 경금이 합하여 금으로 화하는 격',
    '병신화수격': '병화와 신금이 합하여 수로 화하는 격',
    '정임화목격': '정화와 임수가 합하여 목으로 화하는 격',
    '무계화화격': '무토와 계수가 합하여 화로 화하는 격',
    '곡직격': '목이 왕성하여 곧게 뻗는 나무의 격',
    '염상격': '화가 왕성하여 타오르는 불꽃의 격',
    '가색격': '토가 왕성하여 넓은 대지의 격',
    '종혁격': '금이 왕성하여 단단한 쇠의 격',
    '윤하격': '수가 왕성하여 흐르는 물의 격',
    '미정': '격국이 명확하지 않아 종합적 판단 필요',
  };

  return descriptions[geokguk] || '격국 설명 없음';
}

// ============ 고급 격국 판정 (성패/잡기격 포함) ============

/**
 * 잡기격 판정
 * 진술축미(辰戌丑未) 월에 해당하며 정기 투출이 없을 때
 */
function checkJapgigyeok(pillars: SajuPillarsInput): GeokgukType | null {
  const monthB = normalizeBranch(pillars.month.branch);
  const japgiMonths = ['辰', '戌', '丑', '未'];

  if (!japgiMonths.includes(monthB)) return null;

  // 잡기월의 정기가 투출되지 않았는지 확인
  const jijanggan = JIJANGGAN[monthB];
  if (!jijanggan) return null;

  const allStems = [
    normalizeStem(pillars.year.stem),
    normalizeStem(pillars.month.stem),
    normalizeStem(pillars.time.stem),
  ];

  // 정기가 투출되었으면 정격
  if (jijanggan.정기 && allStems.includes(jijanggan.정기)) {
    return null; // 정격으로 판정
  }

  // 중기나 여기가 투출되었으면 잡기격
  if (jijanggan.중기 && allStems.includes(jijanggan.중기)) {
    return '잡기격';
  }
  if (jijanggan.여기 && allStems.includes(jijanggan.여기)) {
    return '잡기격';
  }

  return null;
}

/**
 * 격국 성패(成敗) 판정
 */
export type GeokgukStatus = '성격' | '파격' | '반성반파';

export interface GeokgukStatusResult {
  status: GeokgukStatus;
  factors: {
    positive: string[];  // 성격 요인
    negative: string[];  // 파격 요인
  };
  description: string;
}

/**
 * 정격의 성패 판정
 */
export function evaluateGeokgukStatus(
  geokguk: GeokgukType,
  pillars: SajuPillarsInput
): GeokgukStatusResult {
  const positive: string[] = [];
  const negative: string[] = [];

  const dayS = normalizeStem(pillars.day.stem);
  const dayElement = getStemElement(dayS);
  const dayYinYang = getStemYinYang(dayS);

  // 십성별 판정 기준
  const sipsungCounts = countSipsung(pillars);

  // 격국별 성패 조건
  switch (geokguk) {
    case '식신격':
      // 성격 조건: 식신이 있고, 편인(도식)이 없어야
      if (sipsungCounts['식신'] >= 1) positive.push('식신 존재');
      if (sipsungCounts['편인'] === 0) positive.push('편인(도식) 없음');
      else negative.push('편인(도식)이 식신을 극함');
      if (sipsungCounts['편관'] >= 2) negative.push('편관 과다로 식신 소모');
      break;

    case '상관격':
      // 성격 조건: 상관이 있고, 관성을 제어할 때
      if (sipsungCounts['상관'] >= 1) positive.push('상관 존재');
      if (sipsungCounts['정관'] >= 1 && sipsungCounts['상관'] >= 1) {
        negative.push('상관견관 - 관성 손상');
      }
      if (sipsungCounts['편인'] === 0) positive.push('편인 없어 상관 보존');
      break;

    case '편재격':
      // 성격 조건: 편재가 있고, 비겁의 극이 없어야
      if (sipsungCounts['편재'] >= 1) positive.push('편재 존재');
      if (sipsungCounts['비견'] >= 2 || sipsungCounts['겁재'] >= 2) {
        negative.push('비겁 과다로 재성 분탈');
      }
      if (sipsungCounts['편관'] >= 1) positive.push('관성이 비겁 제어');
      break;

    case '정재격':
      // 성격 조건: 정재가 있고, 겁재의 극이 없어야
      if (sipsungCounts['정재'] >= 1) positive.push('정재 존재');
      if (sipsungCounts['겁재'] >= 2) negative.push('겁재 과다로 재성 분탈');
      if (sipsungCounts['정관'] >= 1) positive.push('관성이 비겁 제어');
      break;

    case '편관격':
      // 성격 조건: 편관이 있고, 식신의 제어가 있어야
      if (sipsungCounts['편관'] >= 1) positive.push('편관 존재');
      if (sipsungCounts['식신'] >= 1) positive.push('식신이 편관 제어(식신제살)');
      if (sipsungCounts['편관'] >= 3 && sipsungCounts['식신'] === 0) {
        negative.push('칠살 과다, 제어 없음');
      }
      if (sipsungCounts['편인'] >= 1) negative.push('편인이 식신 파괴');
      break;

    case '정관격':
      // 성격 조건: 정관이 순수해야 (편관 혼잡 없음)
      if (sipsungCounts['정관'] >= 1) positive.push('정관 존재');
      if (sipsungCounts['편관'] >= 1) negative.push('관살혼잡');
      if (sipsungCounts['상관'] >= 1) negative.push('상관견관');
      if (sipsungCounts['정인'] >= 1) positive.push('인성 보호');
      break;

    case '편인격':
      // 성격 조건: 편인이 있고, 재성의 파괴가 없어야
      if (sipsungCounts['편인'] >= 1) positive.push('편인 존재');
      if (sipsungCounts['편재'] >= 2) negative.push('재성이 인성 파괴');
      if (sipsungCounts['식신'] >= 1) negative.push('편인도식 - 식신 손상');
      break;

    case '정인격':
      // 성격 조건: 정인이 있고, 재성의 파괴가 없어야
      if (sipsungCounts['정인'] >= 1) positive.push('정인 존재');
      if (sipsungCounts['정재'] >= 2 || sipsungCounts['편재'] >= 2) {
        negative.push('재성이 인성 파괴');
      }
      if (sipsungCounts['정관'] >= 1) positive.push('관인상생');
      break;

    case '건록격':
    case '양인격':
    case '월겁격':
      // 비격: 관성이나 재성의 극제가 있어야
      if (sipsungCounts['정관'] >= 1 || sipsungCounts['편관'] >= 1) {
        positive.push('관성이 비겁 제어');
      }
      if (sipsungCounts['정재'] >= 1 || sipsungCounts['편재'] >= 1) {
        positive.push('재성으로 설기');
      }
      if (sipsungCounts['비견'] + sipsungCounts['겁재'] >= 4) {
        negative.push('비겁 과다로 재성 분탈 위험');
      }
      break;

    default:
      positive.push('기타 격국');
  }

  // 종합 판정
  let status: GeokgukStatus;
  if (negative.length === 0 && positive.length >= 2) {
    status = '성격';
  } else if (negative.length >= 2 && positive.length <= 1) {
    status = '파격';
  } else {
    status = '반성반파';
  }

  const description = status === '성격'
    ? '격국이 순수하게 성립하여 길한 작용'
    : status === '파격'
      ? '격국이 파손되어 흉한 작용 가능'
      : '격국이 부분적으로 성립, 희기 혼재';

  return {
    status,
    factors: { positive, negative },
    description
  };
}

/**
 * 화기격국 성립 조건 정밀 판정
 */
export function evaluateHwagiGeokguk(pillars: SajuPillarsInput): {
  possible: boolean;
  type: GeokgukType | null;
  conditions: {
    hasHap: boolean;        // 합이 있는지
    isDaymasterPart: boolean;  // 일간이 합의 일부인지
    monthSupport: boolean;  // 월령이 화신 지지하는지
    noBreaker: boolean;     // 파합 요소 없는지
  };
  description: string;
} {
  const stems = [
    normalizeStem(pillars.year.stem),
    normalizeStem(pillars.month.stem),
    normalizeStem(pillars.day.stem),
    normalizeStem(pillars.time.stem)
  ];
  const dayS = normalizeStem(pillars.day.stem);
  const monthB = normalizeBranch(pillars.month.branch);

  // 천간합 정의 (합 → 화하는 오행 → 월령 지지 지지)
  const hapDefs: Array<{
    pair: [string, string];
    result: GeokgukType;
    resultElement: FiveElement;
    supportBranches: string[];
  }> = [
    { pair: ['甲', '己'], result: '갑기화토격', resultElement: '토', supportBranches: ['辰', '戌', '丑', '未'] },
    { pair: ['乙', '庚'], result: '을경화금격', resultElement: '금', supportBranches: ['申', '酉'] },
    { pair: ['丙', '辛'], result: '병신화수격', resultElement: '수', supportBranches: ['亥', '子'] },
    { pair: ['丁', '壬'], result: '정임화목격', resultElement: '목', supportBranches: ['寅', '卯'] },
    { pair: ['戊', '癸'], result: '무계화화격', resultElement: '화', supportBranches: ['巳', '午'] },
  ];

  for (const def of hapDefs) {
    const hasHap = stems.includes(def.pair[0]) && stems.includes(def.pair[1]);
    if (!hasHap) continue;

    const isDaymasterPart = def.pair.includes(dayS);
    const monthSupport = def.supportBranches.includes(monthB);

    // 파합 요소 체크 (극하는 오행이 많으면 파합)
    const breakerElement = FIVE_ELEMENT_RELATIONS.극받는관계[def.resultElement];
    let breakerCount = 0;
    for (const stem of stems) {
      if (getStemElement(stem) === breakerElement) breakerCount++;
    }
    const noBreaker = breakerCount < 2;

    const possible = hasHap && isDaymasterPart && monthSupport && noBreaker;

    return {
      possible,
      type: possible ? def.result : null,
      conditions: {
        hasHap,
        isDaymasterPart,
        monthSupport,
        noBreaker
      },
      description: possible
        ? `${def.result} 성립: 월령이 화신을 지지하고 파합 요소 없음`
        : `${def.result} 미성립: ${!isDaymasterPart ? '일간이 합에 미포함' : ''} ${!monthSupport ? '월령 미지지' : ''} ${!noBreaker ? '파합 요소 존재' : ''}`
    };
  }

  return {
    possible: false,
    type: null,
    conditions: {
      hasHap: false,
      isDaymasterPart: false,
      monthSupport: false,
      noBreaker: false
    },
    description: '천간합 없음'
  };
}

/**
 * 고급 격국 판정 (성패 포함)
 */
export function determineGeokgukAdvanced(pillars: SajuPillarsInput): GeokgukResult & {
  statusResult?: GeokgukStatusResult;
} {
  const basicResult = determineGeokguk(pillars);

  // 잡기격 체크 추가
  if (basicResult.primary === '미정') {
    const japgi = checkJapgigyeok(pillars);
    if (japgi) {
      return {
        primary: japgi,
        category: '비격',
        confidence: 'medium',
        description: '잡기격: 진술축미월에 중기/여기가 투출',
        yongsin: '투출된 십성에 따라 결정',
      };
    }
  }

  // 성패 판정
  if (basicResult.category === '정격' || basicResult.category === '비격') {
    const statusResult = evaluateGeokgukStatus(basicResult.primary, pillars);
    return {
      ...basicResult,
      statusResult
    };
  }

  return basicResult;
}
