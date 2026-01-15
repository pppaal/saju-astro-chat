// 변효 해석 데이터 - 프론트엔드용
// 백엔드의 hexagrams JSON에서 변효 해석 정보를 가져옴

import { logger } from "@/lib/logger";

export interface ChangingLineInfo {
  lineIndex: number; // 0-5 (초효-상효)
  changingTo: number; // 변괘 번호
  changingHexagramName: string; // 변괘 이름 (한글+한자)
  interpretation: {
    transition: string;
    from_to: string;
    core_message: string;
    practical_advice: string[];
    warning: string;
  };
}

// 괘번호 -> 효번호 -> 변효 정보
// 이 데이터는 런타임에 API를 통해 가져오거나, 빌드 타임에 생성됨
// 여기서는 API 호출용 인터페이스만 정의

export async function fetchChangingLineInterpretation(
  hexagramNumber: number,
  lineIndex: number,
  locale: string = "ko"
): Promise<ChangingLineInfo | null> {
  try {
    const response = await fetch(`/api/iching/changing-line`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Token": process.env.NEXT_PUBLIC_API_TOKEN || "",
      },
      body: JSON.stringify({
        hexagramNumber,
        lineIndex,
        locale,
      }),
    });

    if (!response.ok) {
      logger.error("Failed to fetch changing line interpretation");
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error("Error fetching changing line interpretation:", error);
    return null;
  }
}

// 변효 계산 헬퍼 함수
export function calculateChangingHexagramNumber(
  primaryBinary: string,
  lineIndex: number
): number {
  // 해당 효를 뒤집어서 변괘 바이너리 계산
  const binaryArray = primaryBinary.split("");
  binaryArray[lineIndex] = binaryArray[lineIndex] === "1" ? "0" : "1";
  const resultingBinary = binaryArray.join("");

  // 바이너리를 괘 번호로 변환 (실제 매핑 필요)
  return binaryToHexagramNumber(resultingBinary);
}

// 바이너리 -> 괘 번호 매핑
const binaryToNumberMap: Record<string, number> = {
  "111111": 1,  // 건
  "000000": 2,  // 곤
  "010001": 3,  // 준
  "100010": 4,  // 몽
  "010111": 5,  // 수
  "111010": 6,  // 송
  "000010": 7,  // 사
  "010000": 8,  // 비
  "110111": 9,  // 소축
  "111011": 10, // 리
  "000111": 11, // 태
  "111000": 12, // 비
  "111101": 13, // 동인
  "101111": 14, // 대유
  "000100": 15, // 겸
  "001000": 16, // 예
  "011001": 17, // 수
  "100110": 18, // 고
  "000011": 19, // 임
  "110000": 20, // 관
  "101001": 21, // 서합
  "100101": 22, // 비
  "100000": 23, // 박
  "000001": 24, // 복
  "111001": 25, // 무망
  "100111": 26, // 대축
  "100001": 27, // 이
  "011110": 28, // 대과
  "010010": 29, // 감
  "101101": 30, // 리
  "011100": 31, // 함
  "001110": 32, // 항
  "111100": 33, // 둔
  "001111": 34, // 대장
  "101000": 35, // 진
  "000101": 36, // 명이
  "110101": 37, // 가인
  "101011": 38, // 규
  "010100": 39, // 건
  "001010": 40, // 해
  "100011": 41, // 손
  "110001": 42, // 익
  "011111": 43, // 쾌
  "111110": 44, // 구
  "011000": 45, // 췌
  "000110": 46, // 승
  "011010": 47, // 곤
  "010110": 48, // 정
  "011101": 49, // 혁
  "101110": 50, // 정
  "001001": 51, // 진
  "100100": 52, // 간
  "110100": 53, // 점
  "001011": 54, // 귀매
  "001101": 55, // 풍
  "101100": 56, // 려
  "110110": 57, // 손
  "011011": 58, // 태
  "110010": 59, // 환
  "010011": 60, // 절
  "110011": 61, // 중부
  "001100": 62, // 소과
  "010101": 63, // 기제
  "101010": 64, // 미제
};

export function binaryToHexagramNumber(binary: string): number {
  return binaryToNumberMap[binary] || 0;
}

// 괘 번호 -> 이름 매핑 (한글)
export const hexagramNames: Record<number, string> = {
  1: "중천건(重天乾)",
  2: "중지곤(重地坤)",
  3: "수뢰둔(水雷屯)",
  4: "산수몽(山水蒙)",
  5: "수천수(水天需)",
  6: "천수송(天水訟)",
  7: "지수사(地水師)",
  8: "수지비(水地比)",
  9: "풍천소축(風天小畜)",
  10: "천택리(天澤履)",
  11: "지천태(地天泰)",
  12: "천지비(天地否)",
  13: "천화동인(天火同人)",
  14: "화천대유(火天大有)",
  15: "지산겸(地山謙)",
  16: "뇌지예(雷地豫)",
  17: "택뢰수(澤雷隨)",
  18: "산풍고(山風蠱)",
  19: "지택임(地澤臨)",
  20: "풍지관(風地觀)",
  21: "화뢰서합(火雷噬嗑)",
  22: "산화비(山火賁)",
  23: "산지박(山地剝)",
  24: "지뢰복(地雷復)",
  25: "천뢰무망(天雷无妄)",
  26: "산천대축(山天大畜)",
  27: "산뢰이(山雷頤)",
  28: "택풍대과(澤風大過)",
  29: "중수감(重水坎)",
  30: "중화리(重火離)",
  31: "택산함(澤山咸)",
  32: "뇌풍항(雷風恆)",
  33: "천산둔(天山遯)",
  34: "뇌천대장(雷天大壯)",
  35: "화지진(火地晉)",
  36: "지화명이(地火明夷)",
  37: "풍화가인(風火家人)",
  38: "화택규(火澤睽)",
  39: "수산건(水山蹇)",
  40: "뇌수해(雷水解)",
  41: "산택손(山澤損)",
  42: "풍뢰익(風雷益)",
  43: "택천쾌(澤天夬)",
  44: "천풍구(天風姤)",
  45: "택지췌(澤地萃)",
  46: "지풍승(地風升)",
  47: "택수곤(澤水困)",
  48: "수풍정(水風井)",
  49: "택화혁(澤火革)",
  50: "화풍정(火風鼎)",
  51: "중뢰진(重雷震)",
  52: "중산간(重山艮)",
  53: "풍산점(風山漸)",
  54: "뇌택귀매(雷澤歸妹)",
  55: "뇌화풍(雷火豐)",
  56: "화산려(火山旅)",
  57: "중풍손(重風巽)",
  58: "중택태(重澤兌)",
  59: "풍수환(風水渙)",
  60: "수택절(水澤節)",
  61: "풍택중부(風澤中孚)",
  62: "뇌산소과(雷山小過)",
  63: "수화기제(水火旣濟)",
  64: "화수미제(火水未濟)",
};
