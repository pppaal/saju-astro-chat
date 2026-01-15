// src/lib/astrology/foundation/fixedStars.ts
// 항성 (Fixed Stars) 계산

import { Chart, PlanetBase, ZodiacKo } from "./types";
import { normalize360, shortestAngle } from "./utils";

export interface FixedStar {
  name: string;
  name_ko: string;
  longitude: number;    // 2000년 기준 황경 (세차 보정 필요)
  magnitude: number;    // 등급
  nature: string;       // 행성적 성질
  constellation: string;
  keywords: string[];
  interpretation: string;
}

export interface FixedStarConjunction {
  star: FixedStar;
  planet: string;
  orb: number;
  description: string;
}

// 주요 항성 데이터 (2000년 기준 위치, 50개+)
// 참고: 항성은 매년 약 50.3" 세차 운동하므로 실제 계산 시 보정 필요
const FIXED_STARS: FixedStar[] = [
  // ========== 왕의 별 4대 (Royal Stars) ==========
  {
    name: "Regulus",
    name_ko: "레굴루스 (왕의 별)",
    longitude: 149.83,  // 29 Leo 50
    magnitude: 1.35,
    nature: "Mars/Jupiter",
    constellation: "Leo",
    keywords: ["왕권", "성공", "명예", "리더십"],
    interpretation: "가장 왕족적인 별. 성공과 명예를 가져오지만, 복수심이 있으면 추락할 수 있습니다.",
  },
  {
    name: "Aldebaran",
    name_ko: "알데바란 (봄의 눈)",
    longitude: 69.78,   // 9 Gemini 47
    magnitude: 0.85,
    nature: "Mars",
    constellation: "Taurus",
    keywords: ["명예", "용기", "성실", "부"],
    interpretation: "왕의 별 중 하나. 성실함으로 명예와 부를 얻습니다.",
  },
  {
    name: "Antares",
    name_ko: "안타레스 (전갈의 심장)",
    longitude: 249.77,  // 9 Sagittarius 46
    magnitude: 0.96,
    nature: "Mars/Jupiter",
    constellation: "Scorpius",
    keywords: ["열정", "강렬함", "용기", "위험"],
    interpretation: "화성에 대항하는 별. 강렬한 열정과 용기를 주지만 무모함을 주의해야 합니다.",
  },
  {
    name: "Fomalhaut",
    name_ko: "포말하우트 (물고기 입)",
    longitude: 333.87,  // 3 Pisces 52
    magnitude: 1.16,
    nature: "Venus/Mercury",
    constellation: "Piscis Austrinus",
    keywords: ["이상주의", "명성", "불멸", "예술"],
    interpretation: "왕의 별 중 하나. 이상주의와 명성을 줍니다.",
  },
  // ========== 밝은 별 (1등성 이상) ==========
  {
    name: "Sirius",
    name_ko: "시리우스 (개의 별)",
    longitude: 104.08,  // 14 Cancer 05
    magnitude: -1.46,
    nature: "Jupiter/Mars",
    constellation: "Canis Major",
    keywords: ["명성", "부", "열정", "명예"],
    interpretation: "밤하늘에서 가장 밝은 별. 명성과 부를 가져옵니다.",
  },
  {
    name: "Canopus",
    name_ko: "카노푸스 (항해자의 별)",
    longitude: 104.97,  // 14 Cancer 58
    magnitude: -0.72,
    nature: "Saturn/Jupiter",
    constellation: "Carina",
    keywords: ["지혜", "항해", "여행", "교육"],
    interpretation: "두 번째로 밝은 별. 지혜와 여행을 관장합니다.",
  },
  {
    name: "Arcturus",
    name_ko: "아르크투루스 (곰의 수호자)",
    longitude: 204.14,  // 24 Libra 14
    magnitude: -0.05,
    nature: "Mars/Jupiter",
    constellation: "Bootes",
    keywords: ["수호", "번영", "명성", "리더십"],
    interpretation: "수호와 번영. 새로운 시작과 성공을 가져옵니다.",
  },
  {
    name: "Vega",
    name_ko: "베가 (하프 별)",
    longitude: 285.32,  // 15 Capricorn 19
    magnitude: 0.03,
    nature: "Venus/Mercury",
    constellation: "Lyra",
    keywords: ["음악", "예술", "매력", "이상주의"],
    interpretation: "예술적 재능과 매력을 줍니다. 때로는 비현실적일 수 있습니다.",
  },
  {
    name: "Capella",
    name_ko: "카펠라 (작은 염소)",
    longitude: 81.85,   // 21 Gemini 51
    magnitude: 0.08,
    nature: "Mars/Mercury",
    constellation: "Auriga",
    keywords: ["호기심", "독립", "명예", "부"],
    interpretation: "호기심과 독립심을 줍니다. 군사적/시민적 명예.",
  },
  {
    name: "Rigel",
    name_ko: "리겔 (오리온 발)",
    longitude: 76.83,   // 16 Gemini 50
    magnitude: 0.13,
    nature: "Jupiter/Mars",
    constellation: "Orion",
    keywords: ["교육", "명예", "부", "행운"],
    interpretation: "교육과 관련된 행운. 명예와 부를 가져옵니다.",
  },
  {
    name: "Procyon",
    name_ko: "프로키온 (개의 앞)",
    longitude: 115.62,  // 25 Cancer 47
    magnitude: 0.34,
    nature: "Mercury/Mars",
    constellation: "Canis Minor",
    keywords: ["활동", "폭력", "급함", "성공"],
    interpretation: "갑작스러운 성공과 상승. 때로는 폭력적이거나 조급할 수 있습니다.",
  },
  {
    name: "Betelgeuse",
    name_ko: "베텔게우스 (오리온 어깨)",
    longitude: 88.75,   // 28 Gemini 45
    magnitude: 0.42,
    nature: "Mars/Mercury",
    constellation: "Orion",
    keywords: ["명예", "성공", "재물", "호의"],
    interpretation: "군사적 영예와 행운. 성공과 재물을 가져옵니다.",
  },
  {
    name: "Altair",
    name_ko: "알타이르 (독수리)",
    longitude: 301.78,  // 1 Aquarius 47
    magnitude: 0.77,
    nature: "Mars/Jupiter",
    constellation: "Aquila",
    keywords: ["대담함", "자신감", "야망", "행동"],
    interpretation: "대담하고 자신감 있는 행동. 갑작스러운 상승과 하락.",
  },
  // ========== 처녀자리/천칭자리 ==========
  {
    name: "Spica",
    name_ko: "스피카 (수확의 별)",
    longitude: 203.83,  // 23 Libra 50
    magnitude: 0.97,
    nature: "Venus/Mars",
    constellation: "Virgo",
    keywords: ["재능", "성공", "명성", "예술"],
    interpretation: "가장 길조적인 별 중 하나. 재능과 성공을 가져옵니다.",
  },
  {
    name: "Vindemiatrix",
    name_ko: "빈데미아트릭스 (포도수확자)",
    longitude: 189.92,  // 9 Libra 56
    magnitude: 2.83,
    nature: "Saturn/Mercury",
    constellation: "Virgo",
    keywords: ["과부", "손실", "슬픔", "변화"],
    interpretation: "손실과 변화. 과부의 별로 알려져 있습니다.",
  },
  // ========== 페르세우스/황소자리 ==========
  {
    name: "Algol",
    name_ko: "알골 (악마의 별)",
    longitude: 56.17,   // 26 Taurus 10
    magnitude: 2.12,
    nature: "Saturn/Jupiter",
    constellation: "Perseus",
    keywords: ["강렬함", "변형", "위험", "권력"],
    interpretation: "강력하지만 위험한 별. 극단적 성공이나 극단적 실패를 가져올 수 있습니다.",
  },
  {
    name: "Alcyone",
    name_ko: "알키오네 (플레이아데스)",
    longitude: 60.00,   // 0 Gemini
    magnitude: 2.87,
    nature: "Moon/Mars",
    constellation: "Taurus",
    keywords: ["슬픔", "눈", "판단력", "야망"],
    interpretation: "야망과 명예. 눈 관련 문제에 주의. 플레이아데스 7자매 중 가장 밝은 별.",
  },
  {
    name: "Pleiades",
    name_ko: "플레이아데스 (7자매)",
    longitude: 59.98,   // 29 Taurus 58
    magnitude: 1.6,
    nature: "Moon/Mars",
    constellation: "Taurus",
    keywords: ["슬픔", "비애", "사랑", "야망"],
    interpretation: "사랑과 야망, 하지만 슬픔과 눈물도 동반됩니다.",
  },
  {
    name: "Hyades",
    name_ko: "히아데스 (비의 별)",
    longitude: 65.47,   // 5 Gemini 48
    magnitude: 3.65,
    nature: "Saturn/Mercury",
    constellation: "Taurus",
    keywords: ["비", "눈물", "질병", "폭력"],
    interpretation: "폭풍우와 슬픔. 눈과 관련된 문제. 폭력에 주의.",
  },
  // ========== 백조자리/거문고자리 ==========
  {
    name: "Deneb",
    name_ko: "데네브 (백조 꼬리)",
    longitude: 335.33,  // 5 Pisces 20
    magnitude: 1.25,
    nature: "Venus/Mercury",
    constellation: "Cygnus",
    keywords: ["예술", "지성", "아름다움", "재능"],
    interpretation: "예술적이고 지적인 재능. 아름다움에 대한 감각.",
  },
  {
    name: "Deneb Algedi",
    name_ko: "데네브 알게디 (염소 꼬리)",
    longitude: 293.49,  // 23 Aquarius 33
    magnitude: 2.87,
    nature: "Saturn/Jupiter",
    constellation: "Capricornus",
    keywords: ["지혜", "정의", "법률", "명예"],
    interpretation: "법과 정의에 관한 성공. 지혜로운 판단.",
  },
  // ========== 큰곰자리/작은곰자리 ==========
  {
    name: "Polaris",
    name_ko: "폴라리스 (북극성)",
    longitude: 88.57,   // 28 Gemini 34
    magnitude: 1.98,
    nature: "Saturn/Venus",
    constellation: "Ursa Minor",
    keywords: ["방향", "안내", "영적", "질병주의"],
    interpretation: "길을 안내하는 별. 영적 인도력을 줍니다. 건강 주의.",
  },
  {
    name: "Dubhe",
    name_ko: "두베 (곰의 등)",
    longitude: 105.24,  // 15 Leo 12
    magnitude: 1.79,
    nature: "Mars",
    constellation: "Ursa Major",
    keywords: ["파괴", "공격", "용기", "야심"],
    interpretation: "파괴적이지만 용감한 에너지. 군사적 재능.",
  },
  {
    name: "Alioth",
    name_ko: "알리오트 (북두칠성)",
    longitude: 168.81,  // 18 Virgo 56
    magnitude: 1.77,
    nature: "Mars",
    constellation: "Ursa Major",
    keywords: ["위험", "비극", "죽음", "변형"],
    interpretation: "위험과 변형. 갑작스러운 사건에 주의.",
  },
  // ========== 전갈자리/사수자리 ==========
  {
    name: "Acrab",
    name_ko: "아크라브 (전갈 발톱)",
    longitude: 243.17,  // 3 Sagittarius 11
    magnitude: 2.62,
    nature: "Saturn/Mars",
    constellation: "Scorpius",
    keywords: ["위험", "악의", "질병", "범죄"],
    interpretation: "악의적인 에너지. 사고와 위험에 주의.",
  },
  {
    name: "Dschubba",
    name_ko: "드슈바 (전갈 이마)",
    longitude: 242.17,  // 2 Sagittarius 34
    magnitude: 2.32,
    nature: "Mars/Saturn",
    constellation: "Scorpius",
    keywords: ["분쟁", "운명", "변화", "권력"],
    interpretation: "운명적 사건. 권력 투쟁과 변화.",
  },
  {
    name: "Lesath",
    name_ko: "레사트 (전갈 침)",
    longitude: 264.12,  // 24 Sagittarius 01
    magnitude: 2.69,
    nature: "Mercury/Mars",
    constellation: "Scorpius",
    keywords: ["위험", "침", "독", "사고"],
    interpretation: "위험과 사고. 독이나 동물에 주의.",
  },
  {
    name: "Shaula",
    name_ko: "샤울라 (전갈 꼬리)",
    longitude: 264.68,  // 24 Sagittarius 35
    magnitude: 1.63,
    nature: "Mercury/Mars",
    constellation: "Scorpius",
    keywords: ["위험", "강렬함", "지성", "용기"],
    interpretation: "강렬한 지성. 위험하지만 용기 있는 행동.",
  },
  // ========== 쌍둥이자리/오리온자리 ==========
  {
    name: "Castor",
    name_ko: "카스토르 (쌍둥이 형)",
    longitude: 80.17,   // 20 Cancer 14
    magnitude: 1.58,
    nature: "Mercury",
    constellation: "Gemini",
    keywords: ["지성", "소통", "글쓰기", "부상"],
    interpretation: "지적 재능과 소통 능력. 부상에 주의.",
  },
  {
    name: "Pollux",
    name_ko: "폴룩스 (쌍둥이 동생)",
    longitude: 83.25,   // 23 Cancer 13
    magnitude: 1.14,
    nature: "Mars",
    constellation: "Gemini",
    keywords: ["잔인", "대담", "무모", "스포츠"],
    interpretation: "대담하고 무모한 용기. 스포츠 재능.",
  },
  {
    name: "Bellatrix",
    name_ko: "벨라트릭스 (여전사)",
    longitude: 80.92,   // 20 Gemini 57
    magnitude: 1.64,
    nature: "Mars/Mercury",
    constellation: "Orion",
    keywords: ["전쟁", "명예", "빠른 판단", "위험"],
    interpretation: "빠른 결정과 행동. 군사적 명예와 위험.",
  },
  {
    name: "Mintaka",
    name_ko: "민타카 (오리온 벨트)",
    longitude: 82.43,   // 22 Gemini 24
    magnitude: 2.23,
    nature: "Saturn/Jupiter",
    constellation: "Orion",
    keywords: ["행운", "명예", "부", "보수"],
    interpretation: "행운과 명예. 보수적인 성공.",
  },
  {
    name: "Alnilam",
    name_ko: "알닐람 (오리온 벨트 중앙)",
    longitude: 83.57,   // 23 Gemini 28
    magnitude: 1.70,
    nature: "Jupiter/Saturn",
    constellation: "Orion",
    keywords: ["명성", "명예", "행운", "성공"],
    interpretation: "일시적 명성과 행복. 높은 지위.",
  },
  {
    name: "Alnitak",
    name_ko: "알니탁 (오리온 벨트)",
    longitude: 84.68,   // 24 Gemini 42
    magnitude: 1.74,
    nature: "Jupiter/Saturn",
    constellation: "Orion",
    keywords: ["행운", "명예", "지위", "안정"],
    interpretation: "안정적인 성공. 높은 지위와 명예.",
  },
  // ========== 물병자리/물고기자리 ==========
  {
    name: "Sadalsuud",
    name_ko: "사달수드 (행운의 행운)",
    longitude: 323.47,  // 23 Aquarius 24
    magnitude: 2.91,
    nature: "Saturn/Mercury",
    constellation: "Aquarius",
    keywords: ["행운", "성공", "번영", "창조"],
    interpretation: "행운 중 가장 큰 행운. 지속적인 번영.",
  },
  {
    name: "Sadalmelik",
    name_ko: "사달멜릭 (왕의 행운)",
    longitude: 333.33,  // 3 Pisces 21
    magnitude: 2.96,
    nature: "Saturn/Jupiter",
    constellation: "Aquarius",
    keywords: ["왕권", "명예", "정부", "성공"],
    interpretation: "정부와 관련된 성공. 명예로운 지위.",
  },
  {
    name: "Achernar",
    name_ko: "아케르나르 (강의 끝)",
    longitude: 345.27,  // 15 Pisces 19
    magnitude: 0.46,
    nature: "Jupiter",
    constellation: "Eridanus",
    keywords: ["성공", "행복", "교회", "공직"],
    interpretation: "종교나 공직에서 성공. 행복과 명예.",
  },
  {
    name: "Markab",
    name_ko: "마르카브 (안장)",
    longitude: 353.47,  // 23 Pisces 29
    magnitude: 2.49,
    nature: "Mars/Mercury",
    constellation: "Pegasus",
    keywords: ["명예", "부", "위험", "정신"],
    interpretation: "정신적 명료함. 열정과 위험.",
  },
  {
    name: "Scheat",
    name_ko: "세아트 (다리)",
    longitude: 359.23,  // 29 Pisces 22
    magnitude: 2.42,
    nature: "Mars/Mercury",
    constellation: "Pegasus",
    keywords: ["익사", "재난", "불행", "투쟁"],
    interpretation: "물과 관련된 위험. 재난에 주의.",
  },
  // ========== 사자자리/게자리 ==========
  {
    name: "Alphard",
    name_ko: "알파르드 (외로운 별)",
    longitude: 147.17,  // 27 Leo 17
    magnitude: 1.98,
    nature: "Saturn/Venus",
    constellation: "Hydra",
    keywords: ["지혜", "예술", "독", "스캔들"],
    interpretation: "예술적 감각. 독과 스캔들에 주의.",
  },
  {
    name: "Acubens",
    name_ko: "아쿠벤스 (집게)",
    longitude: 103.53,  // 13 Leo 38
    magnitude: 4.25,
    nature: "Saturn/Mercury",
    constellation: "Cancer",
    keywords: ["활동", "악의", "거짓", "범죄"],
    interpretation: "활동적이지만 악의적 에너지에 주의.",
  },
  // ========== 기타 중요한 별 ==========
  {
    name: "Zubeneschamali",
    name_ko: "주베네스카말리 (북쪽 집게)",
    longitude: 199.17,  // 19 Scorpio 22
    magnitude: 2.61,
    nature: "Jupiter/Mercury",
    constellation: "Libra",
    keywords: ["행운", "지성", "성공", "명예"],
    interpretation: "가장 길조적인 별 중 하나. 행운과 지성.",
  },
  {
    name: "Zubenelgenubi",
    name_ko: "주베넬게누비 (남쪽 집게)",
    longitude: 195.07,  // 15 Scorpio 05
    magnitude: 2.75,
    nature: "Saturn/Mars",
    constellation: "Libra",
    keywords: ["불운", "복수", "범죄", "질병"],
    interpretation: "불행한 별. 복수와 질병에 주의.",
  },
  {
    name: "Rasalhague",
    name_ko: "라살하게 (뱀잡이 머리)",
    longitude: 262.43,  // 22 Sagittarius 27
    magnitude: 2.07,
    nature: "Saturn/Venus",
    constellation: "Ophiuchus",
    keywords: ["치유", "독", "감염", "불운"],
    interpretation: "치유 능력. 독과 감염에 주의.",
  },
  {
    name: "Ras Algethi",
    name_ko: "라스 알게티 (헤라클레스 머리)",
    longitude: 256.23,  // 16 Sagittarius 09
    magnitude: 3.48,
    nature: "Mars",
    constellation: "Hercules",
    keywords: ["용기", "힘", "대담함", "폭력"],
    interpretation: "용기와 힘. 폭력에 주의.",
  },
  {
    name: "Wega",
    name_ko: "웨가 (떨어지는 독수리)",
    longitude: 285.27,  // 15 Capricorn 19
    magnitude: 0.03,
    nature: "Venus/Mercury",
    constellation: "Lyra",
    keywords: ["음악", "매력", "예술", "호프"],
    interpretation: "음악과 예술적 재능. 희망과 이상주의.",
  },
  {
    name: "Denebola",
    name_ko: "데네볼라 (사자 꼬리)",
    longitude: 171.52,  // 21 Virgo 37
    magnitude: 2.14,
    nature: "Saturn/Venus",
    constellation: "Leo",
    keywords: ["불행", "귀족", "명예", "질병"],
    interpretation: "명예와 불행이 동반. 건강에 주의.",
  },
  {
    name: "Zosma",
    name_ko: "조스마 (사자 등)",
    longitude: 161.32,  // 11 Virgo 19
    magnitude: 2.56,
    nature: "Saturn/Venus",
    constellation: "Leo",
    keywords: ["수치", "비밀", "우울", "이기심"],
    interpretation: "수치와 비밀. 우울에 주의.",
  },
  {
    name: "Cor Caroli",
    name_ko: "코르 카롤리 (찰스의 심장)",
    longitude: 174.32,  // 24 Virgo 34
    magnitude: 2.90,
    nature: "Venus/Mercury",
    constellation: "Canes Venatici",
    keywords: ["예술", "사랑", "명예", "창조"],
    interpretation: "예술과 사랑. 명예로운 창조.",
  },
];

/**
 * 세차 보정 (Precession correction)
 * 2000년 기준 위치에서 현재 연도로 보정
 * 매년 약 50.3초(arcseconds) = 0.01397도 이동
 */
export function correctForPrecession(baseLongitude: number, year: number): number {
  const yearsSince2000 = year - 2000;
  const precessionPerYear = 50.3 / 3600; // 초를 도로 변환
  return normalize360(baseLongitude + yearsSince2000 * precessionPerYear);
}

/**
 * 항성과 행성의 합 찾기
 */
export function findFixedStarConjunctions(
  chart: Chart,
  year: number = new Date().getFullYear(),
  orb: number = 1.0
): FixedStarConjunction[] {
  const conjunctions: FixedStarConjunction[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const star of FIXED_STARS) {
    // 세차 보정된 항성 위치
    const correctedLon = correctForPrecession(star.longitude, year);

    for (const point of allPoints) {
      const diff = shortestAngle(point.longitude, correctedLon);

      if (diff <= orb) {
        conjunctions.push({
          star,
          planet: point.name,
          orb: diff,
          description: `${point.name}이(가) ${star.name_ko}과(와) 합 (오브: ${diff.toFixed(2)}도)`,
        });
      }
    }
  }

  return conjunctions.sort((a, b) => a.orb - b.orb);
}

/**
 * 특정 항성 정보 가져오기
 */
export function getFixedStar(name: string): FixedStar | undefined {
  return FIXED_STARS.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * 모든 항성 목록 가져오기
 */
export function getAllFixedStars(): FixedStar[] {
  return [...FIXED_STARS];
}

/**
 * 특정 경도 근처의 항성 찾기
 */
export function findStarsNearLongitude(
  longitude: number,
  year: number = new Date().getFullYear(),
  orb: number = 2.0
): FixedStar[] {
  return FIXED_STARS.filter((star) => {
    const correctedLon = correctForPrecession(star.longitude, year);
    const diff = shortestAngle(longitude, correctedLon);
    return diff <= orb;
  });
}

/**
 * 가장 밝은 항성들 가져오기
 */
export function getBrightestStars(count: number = 5): FixedStar[] {
  return [...FIXED_STARS]
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, count);
}
