// src/lib/Saju/pillarLookup.ts
// 60갑자 조회 모듈 - 사주명리학 기초 데이터

import { FiveElement, YinYang } from './types';
import { STEMS, BRANCHES } from './constants';
import {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getBranchYinYang
} from './stemBranchUtils';

/**
 * 60갑자 기본 정보
 */
export interface SixtyPillarInfo {
  index: number;        // 1-60 순번
  pillar: string;       // 간지 (예: 甲子)
  stem: string;         // 천간 (예: 甲)
  branch: string;       // 지지 (예: 子)
  stemKorean: string;   // 천간 한글 (예: 갑)
  branchKorean: string; // 지지 한글 (예: 자)
  koreanName: string;   // 한글명 (예: 갑자)
  stemElement: FiveElement;   // 천간 오행
  branchElement: FiveElement; // 지지 오행
  stemYinYang: YinYang;  // 천간 음양
  branchYinYang: YinYang; // 지지 음양
  naeum: string;         // 납음오행
}

/**
 * 일주론(日柱論) 상세 정보
 */
export interface IljuInfo {
  pillar: string;
  personality: string;
  career: string;
  love: string;
  wealth: string;
  health: string;
  famousPeople?: string;
}

// ============ 60갑자 기본 데이터 ============

/**
 * 천간 한자-한글 매핑
 */
const STEM_KOREAN: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
};

/**
 * 지지 한자-한글 매핑
 */
const BRANCH_KOREAN: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

/**
 * 천간 배열 (순서대로)
 */
const STEM_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/**
 * 지지 배열 (순서대로)
 */
const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 60갑자 순서 배열
 */
export const SIXTY_PILLARS: string[] = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

/**
 * 납음오행(納音五行) 데이터
 * 60갑자 30쌍의 납음
 */
const NAEUM_DATA: Record<string, string> = {
  '甲子': '해중금(海中金)', '乙丑': '해중금(海中金)',
  '丙寅': '노중화(爐中火)', '丁卯': '노중화(爐中火)',
  '戊辰': '대림목(大林木)', '己巳': '대림목(大林木)',
  '庚午': '노방토(路傍土)', '辛未': '노방토(路傍土)',
  '壬申': '검봉금(劍鋒金)', '癸酉': '검봉금(劍鋒金)',
  '甲戌': '산두화(山頭火)', '乙亥': '산두화(山頭火)',
  '丙子': '간하수(澗下水)', '丁丑': '간하수(澗下水)',
  '戊寅': '성두토(城頭土)', '己卯': '성두토(城頭土)',
  '庚辰': '백랍금(白蠟金)', '辛巳': '백랍금(白蠟金)',
  '壬午': '양류목(楊柳木)', '癸未': '양류목(楊柳木)',
  '甲申': '천천수(泉中水)', '乙酉': '천천수(泉中水)',
  '丙戌': '옥상토(屋上土)', '丁亥': '옥상토(屋上土)',
  '戊子': '벽력화(霹靂火)', '己丑': '벽력화(霹靂火)',
  '庚寅': '송백목(松柏木)', '辛卯': '송백목(松柏木)',
  '壬辰': '장류수(長流水)', '癸巳': '장류수(長流水)',
  '甲午': '사중금(砂中金)', '乙未': '사중금(砂中金)',
  '丙申': '산하화(山下火)', '丁酉': '산하화(山下火)',
  '戊戌': '평지목(平地木)', '己亥': '평지목(平地木)',
  '庚子': '벽상토(壁上土)', '辛丑': '벽상토(壁上土)',
  '壬寅': '금박금(金箔金)', '癸卯': '금박금(金箔金)',
  '甲辰': '복등화(覆燈火)', '乙巳': '복등화(覆燈火)',
  '丙午': '천하수(天河水)', '丁未': '천하수(天河水)',
  '戊申': '대역토(大驛土)', '己酉': '대역토(大驛土)',
  '庚戌': '차천금(釵釧金)', '辛亥': '차천금(釵釧金)',
  '壬子': '상자목(桑柘木)', '癸丑': '상자목(桑柘木)',
  '甲寅': '대계수(大溪水)', '乙卯': '대계수(大溪水)',
  '丙辰': '사중토(砂中土)', '丁巳': '사중토(砂中土)',
  '戊午': '천상화(天上火)', '己未': '천상화(天上火)',
  '庚申': '석류목(石榴木)', '辛酉': '석류목(石榴木)',
  '壬戌': '대해수(大海水)', '癸亥': '대해수(大海水)'
};

/**
 * 일주론 상세 데이터 - 60갑자 완전판
 */
const ILJU_DATA: Record<string, IljuInfo> = {
  // === 1-10: 甲子순 ===
  '甲子': {
    pillar: '甲子',
    personality: '개척 정신이 강하고 지혜로움. 리더십과 창의력이 뛰어나나 고집이 세다.',
    career: 'CEO, 창업가, 정치인, 연구원, 작가. 새로운 분야 개척에 탁월.',
    love: '이상주의적 사랑. 지적인 파트너를 선호하며 정신적 교감 중시.',
    wealth: '초년에 어려움 있으나 중년 이후 안정. 투자보다 사업에 강점.',
    health: '신장, 방광 계통 주의. 과로로 인한 피로 축적 조심.',
    famousPeople: '정주영, 빌 게이츠'
  },
  '乙丑': {
    pillar: '乙丑',
    personality: '인내심이 강하고 꾸준함. 겉으로는 부드러우나 속은 단단하다.',
    career: '예술가, 디자이너, 금융인, 부동산, 농업. 장기 프로젝트에 강함.',
    love: '신중하고 진지한 연애. 한번 사랑하면 끝까지 가는 스타일.',
    wealth: '늦게 피는 꽃. 40대 이후 재물운 상승. 땅과 관련된 투자 유리.',
    health: '소화기, 비장 주의. 습한 환경 피하고 적당한 운동 필요.',
    famousPeople: '무라카미 하루키'
  },
  '丙寅': {
    pillar: '丙寅',
    personality: '열정적이고 진취적. 태양과 호랑이의 기운으로 카리스마 넘침.',
    career: '정치인, 연예인, 사업가, 군인, 스포츠. 주목받는 자리에 적합.',
    love: '뜨겁고 적극적인 연애. 상대를 리드하며 헌신적으로 사랑.',
    wealth: '젊어서 돈을 벌고 크게 쓰는 타입. 투자보다 사업으로 성공.',
    health: '심장, 눈, 혈압 주의. 과열되기 쉬우니 휴식 중요.',
    famousPeople: '마이클 조던'
  },
  '丁卯': {
    pillar: '丁卯',
    personality: '섬세하고 예술적. 불꽃처럼 아름답고 감성적. 직관력이 뛰어남.',
    career: '예술가, 작가, 상담사, 교육자, 뷰티. 감성을 다루는 분야.',
    love: '로맨틱하고 감성적인 연애. 분위기와 감정 교류를 중시.',
    wealth: '예술적 재능으로 부를 얻음. 투자보다 본업에 집중해야.',
    health: '간, 신경계 주의. 스트레스 관리와 충분한 수면 필요.',
    famousPeople: '빈센트 반 고흐'
  },
  '戊辰': {
    pillar: '戊辰',
    personality: '산과 용의 기운. 웅장하고 포용력 있으며 큰 그릇.',
    career: '대기업, 건설, 부동산, 정치, 종교. 큰 조직을 이끄는 역할.',
    love: '포용력 있고 듬직한 연애. 상대에게 안정감을 주는 파트너.',
    wealth: '큰 돈을 다루는 재능. 부동산, 대규모 사업에서 성공.',
    health: '위장, 피부 주의. 습한 것 피하고 규칙적인 식사 중요.',
    famousPeople: '도널드 트럼프'
  },
  '己巳': {
    pillar: '己巳',
    personality: '유연하면서도 지혜로움. 겉은 부드럽고 속은 날카롭다.',
    career: '외교관, 비서, 기획자, 상담사, 서비스업. 사람을 다루는 역할.',
    love: '매력적이고 센스있는 연애. 상대의 니즈를 잘 파악.',
    wealth: '여러 방면에서 수입을 얻음. 투자 감각이 있으나 도박 주의.',
    health: '심장, 소화기 주의. 과로와 스트레스 관리 필요.',
    famousPeople: '마릴린 먼로'
  },
  '庚午': {
    pillar: '庚午',
    personality: '결단력과 열정의 조합. 칼과 불의 만남으로 강렬하고 파워풀.',
    career: '군인, 외과의사, 스포츠, 금융, 법조. 결단이 필요한 분야.',
    love: '뜨겁고 강렬한 연애. 질투심이 있고 소유욕이 강한 편.',
    wealth: '젊어서 크게 벌거나 크게 잃음. 중년에 안정. 투기 주의.',
    health: '심장, 폐 주의. 열이 많으니 술, 담배 절제 필요.',
    famousPeople: '나폴레옹'
  },
  '辛未': {
    pillar: '辛未',
    personality: '섬세하고 예술적. 보석과 흙의 조합으로 숨은 재능이 많다.',
    career: '보석, 패션, 예술, 금융, 감정사. 아름다움을 다루는 분야.',
    love: '이상이 높은 연애. 상대에 대한 기준이 까다로운 편.',
    wealth: '꾸준히 모으는 스타일. 투기보다 저축과 안정 투자.',
    health: '폐, 피부, 알레르기 주의. 건조한 환경 피해야.',
    famousPeople: '코코 샤넬'
  },
  '壬申': {
    pillar: '壬申',
    personality: '지혜롭고 실리적. 바다와 원숭이의 조합으로 영리하고 적응력 좋음.',
    career: '사업가, 무역, 컨설턴트, IT, 언론. 정보를 다루는 분야.',
    love: '다양한 인연을 만나는 타입. 한곳에 정착이 어려울 수 있음.',
    wealth: '여러 방면에서 수입. 투자 감각은 좋으나 집중이 필요.',
    health: '신장, 호흡기 주의. 물을 많이 마시고 휴식 중요.',
    famousPeople: '빌 클린턴'
  },
  '癸酉': {
    pillar: '癸酉',
    personality: '직관적이고 예리함. 샘물과 닭의 조합으로 섬세하고 날카롭다.',
    career: '예술가, 비평가, 애널리스트, 보석, 뷰티. 분석과 미학의 분야.',
    love: '까다롭고 이상 높은 연애. 외모와 품격을 중시하는 편.',
    wealth: '예술이나 투자로 성공. 한 분야 전문가로 부를 얻음.',
    health: '폐, 피부, 비뇨기 주의. 알레르기 체질이 많음.',
    famousPeople: '마이클 잭슨'
  },

  // === 11-20: 甲戌순 ===
  '甲戌': {
    pillar: '甲戌',
    personality: '정의감이 강하고 원칙주의. 큰 나무가 마른 땅에 선 형상으로 고독함이 있다.',
    career: '법조인, 종교인, 사회운동가, 경찰, 군인. 정의를 실현하는 분야.',
    love: '의리 있고 진지한 연애. 한번 믿으면 끝까지 가는 스타일.',
    wealth: '정직하게 버는 타입. 투기보다 실업에서 안정적 수입.',
    health: '위장, 피부 건조 주의. 스트레스 해소 필요.',
    famousPeople: '마하트마 간디'
  },
  '乙亥': {
    pillar: '乙亥',
    personality: '부드럽고 지혜로움. 물 위에 뜬 풀처럼 유연하고 적응력이 좋다.',
    career: '교육자, 상담사, 작가, 예술가, 종교인. 정신적 분야에 강점.',
    love: '감성적이고 헌신적인 연애. 상대에게 맞추려는 경향.',
    wealth: '급하게 벌기보다 서서히 축적. 부동산보다 금융 투자.',
    health: '간, 신장 주의. 물을 많이 마시고 휴식 취하기.',
    famousPeople: '알베르트 아인슈타인'
  },
  '丙子': {
    pillar: '丙子',
    personality: '물 위의 태양. 밝고 명랑하나 내면에 깊은 생각이 있다.',
    career: '방송인, 광고, 마케팅, 교육, 예능. 빛나는 자리에 어울림.',
    love: '화려하고 적극적인 연애. 상대를 빛나게 해주는 타입.',
    wealth: '재물 복이 있으나 씀씀이가 큼. 저축 습관 필요.',
    health: '심장, 신장 균형 주의. 수화(水火) 조절 필요.',
    famousPeople: '오프라 윈프리'
  },
  '丁丑': {
    pillar: '丁丑',
    personality: '차분하고 깊은 사고. 땅속의 불씨처럼 은은하게 빛난다.',
    career: '연구원, 학자, 농업, 금융, 요리사. 깊이를 다루는 분야.',
    love: '느리지만 진실된 연애. 시간이 지날수록 깊어지는 사랑.',
    wealth: '늦게 피는 재물운. 땅과 관련된 사업이나 투자 유리.',
    health: '소화기, 심장 주의. 습하고 차가운 환경 피하기.',
    famousPeople: '워렌 버핏'
  },
  '戊寅': {
    pillar: '戊寅',
    personality: '산과 호랑이의 조합. 위엄 있고 당당하며 지도력이 있다.',
    career: '정치인, CEO, 건설업, 부동산, 군인. 큰 조직을 이끄는 역할.',
    love: '보호본능이 강한 연애. 상대를 품어주려는 스타일.',
    wealth: '큰 돈을 만지는 능력. 부동산, 건설 분야에서 성공.',
    health: '위장, 간 주의. 과식과 음주 절제 필요.',
    famousPeople: '이병철'
  },
  '己卯': {
    pillar: '己卯',
    personality: '부드럽고 예술적. 정원의 꽃처럼 아름답고 섬세하다.',
    career: '예술가, 디자이너, 원예, 패션, 미용. 아름다움을 다루는 분야.',
    love: '로맨틱하고 감성적인 연애. 분위기를 중시하는 타입.',
    wealth: '예술적 재능으로 수입. 안정적이지만 큰 부는 어려움.',
    health: '간, 비장 주의. 스트레스와 감정 기복 관리 필요.',
    famousPeople: '클로드 모네'
  },
  '庚辰': {
    pillar: '庚辰',
    personality: '강철과 용의 조합. 카리스마 넘치고 결단력이 있다.',
    career: '군인, 법조인, 금융, 엔지니어, 중공업. 강한 결단이 필요한 분야.',
    love: '강렬하고 지배적인 연애. 상대를 리드하려는 경향.',
    wealth: '큰 돈을 버는 능력. 투자보다 사업으로 성공.',
    health: '폐, 위장 주의. 스트레스 해소와 휴식 중요.',
    famousPeople: '스티브 잡스'
  },
  '辛巳': {
    pillar: '辛巳',
    personality: '날카롭고 지혜로움. 불 속의 보석처럼 빛나는 재능.',
    career: '보석, 금융, 법률, 의료, IT. 정밀함이 필요한 분야.',
    love: '까다롭지만 진실된 연애. 상대를 꿰뚫어보는 눈.',
    wealth: '전문성으로 부를 얻음. 투자 감각이 뛰어남.',
    health: '폐, 심장 주의. 열이 많으니 열 관리 필요.',
    famousPeople: '일론 머스크'
  },
  '壬午': {
    pillar: '壬午',
    personality: '물과 불의 충돌. 겉은 화려하나 내면은 복잡하다.',
    career: '예술가, 연예인, 외교관, 상담사. 감정을 다루는 분야.',
    love: '열정적이나 변덕스러운 연애. 감정 기복 관리 필요.',
    wealth: '재물 복은 있으나 유지가 어려움. 절제 필요.',
    health: '심장, 신장 균형 주의. 수화(水火) 부조화 조심.',
    famousPeople: '레오나르도 디카프리오'
  },
  '癸未': {
    pillar: '癸未',
    personality: '부드럽고 온화함. 땅에 스며드는 물처럼 포용력이 있다.',
    career: '교육자, 상담사, 서비스업, 농업, 요리. 돌봄의 분야.',
    love: '헌신적이고 모성애적인 연애. 상대를 돌보려는 타입.',
    wealth: '꾸준히 모으는 스타일. 땅과 관련된 투자 유리.',
    health: '비장, 신장 주의. 습기와 냉기 피하기.',
    famousPeople: '마더 테레사'
  },

  // === 21-30: 甲申순 ===
  '甲申': {
    pillar: '甲申',
    personality: '나무와 원숭이의 조합. 영리하고 재치 있으나 변화가 많다.',
    career: '사업가, 무역, 언론, 광고, IT. 변화에 빠르게 대응하는 분야.',
    love: '재미있고 다양한 연애. 한곳에 정착하기 어려울 수 있음.',
    wealth: '다양한 수입원. 사업 감각은 좋으나 집중 필요.',
    health: '간, 폐 주의. 과로와 스트레스 관리.',
    famousPeople: '잭 마'
  },
  '乙酉': {
    pillar: '乙酉',
    personality: '섬세하고 예리함. 풀과 닭의 조합으로 분석력이 뛰어남.',
    career: '예술가, 비평가, 감정사, 금융, 뷰티. 세밀한 작업에 강점.',
    love: '까다롭고 이상 높은 연애. 완벽한 상대를 찾으려 함.',
    wealth: '전문 분야에서 수입. 투자보다 본업에 집중.',
    health: '간, 폐 주의. 건조하고 예민해지기 쉬움.',
    famousPeople: '안나 윈투어'
  },
  '丙戌': {
    pillar: '丙戌',
    personality: '열정적이고 정의로움. 태양과 개의 조합으로 충직하다.',
    career: '정치인, 종교인, 사회운동가, 경찰. 정의 실현 분야.',
    love: '의리 있고 헌신적인 연애. 상대를 지키려는 본능.',
    wealth: '정직하게 버는 타입. 투기보다 실업에서 성공.',
    health: '심장, 위장 주의. 열이 많으니 관리 필요.',
    famousPeople: '넬슨 만델라'
  },
  '丁亥': {
    pillar: '丁亥',
    personality: '따뜻하고 지혜로움. 물 위의 등불처럼 은은하게 빛남.',
    career: '작가, 예술가, 교육자, 상담사, 종교인. 정신적 분야.',
    love: '깊고 헌신적인 연애. 상대와 정신적 교감 중시.',
    wealth: '급하게 벌기보다 서서히 축적. 지혜로운 투자.',
    health: '심장, 신장 균형 주의. 수화(水火) 조절.',
    famousPeople: '루트비히 반 베토벤'
  },
  '戊子': {
    pillar: '戊子',
    personality: '산과 물의 조합. 중후하면서도 깊은 지혜가 있다.',
    career: '부동산, 건설, 금융, 연구원, 학자. 깊이와 안정의 분야.',
    love: '진중하고 안정적인 연애. 상대에게 안정감을 줌.',
    wealth: '부동산, 땅과 관련된 투자에서 성공. 안정적 축적.',
    health: '위장, 신장 주의. 습기 관리와 운동 필요.',
    famousPeople: '앤드류 카네기'
  },
  '己丑': {
    pillar: '己丑',
    personality: '인내심 강하고 실속 있음. 두 개의 흙으로 땅심이 강하다.',
    career: '농업, 부동산, 금융, 요리, 건설. 실물 자산 분야.',
    love: '느리지만 진실된 연애. 한번 시작하면 끝까지.',
    wealth: '늦게 피지만 안정적인 재물운. 땅 관련 투자.',
    health: '소화기, 비장 주의. 규칙적인 식사와 운동.',
    famousPeople: '존 록펠러'
  },
  '庚寅': {
    pillar: '庚寅',
    personality: '강인하고 진취적. 쇠와 호랑이의 조합으로 추진력이 강함.',
    career: '군인, 사업가, 스포츠, 엔지니어, 수술의. 행동력 필요한 분야.',
    love: '적극적이고 열정적인 연애. 상대를 리드하는 스타일.',
    wealth: '젊어서 돈을 버는 타입. 사업으로 성공.',
    health: '폐, 간 주의. 과로와 부상 조심.',
    famousPeople: '브루스 리'
  },
  '辛卯': {
    pillar: '辛卯',
    personality: '섬세하고 우아함. 보석과 꽃의 조합으로 아름다움을 추구.',
    career: '예술가, 디자이너, 보석, 패션, 뷰티. 미학 분야.',
    love: '로맨틱하고 이상적인 연애. 아름다운 사랑을 꿈꿈.',
    wealth: '예술적 재능으로 수입. 안정적 재물운.',
    health: '폐, 간 주의. 감정 기복과 스트레스 관리.',
    famousPeople: '오드리 헵번'
  },
  '壬辰': {
    pillar: '壬辰',
    personality: '물과 용의 조합. 깊은 지혜와 큰 포부를 가진다.',
    career: 'CEO, 정치인, 학자, 종교인, 금융. 큰 비전의 분야.',
    love: '이상이 높고 깊은 연애. 정신적 교감 중시.',
    wealth: '큰 돈을 다루는 능력. 투자와 사업 모두 가능.',
    health: '신장, 위장 주의. 습기 관리 필요.',
    famousPeople: '마크 저커버그'
  },
  '癸巳': {
    pillar: '癸巳',
    personality: '물과 뱀의 조합. 지혜롭고 통찰력이 뛰어남.',
    career: '연구원, 의사, 상담사, 점술가, 탐정. 통찰력 필요한 분야.',
    love: '깊고 신비로운 연애. 상대를 꿰뚫어보는 눈.',
    wealth: '전문성으로 부를 얻음. 투자 감각도 좋음.',
    health: '신장, 심장 균형 주의. 수화(水火) 조절.',
    famousPeople: '에드가 앨런 포'
  },

  // === 31-40: 甲午순 ===
  '甲午': {
    pillar: '甲午',
    personality: '나무와 불의 조합. 열정적이고 표현력이 풍부함.',
    career: '예술가, 연예인, 교육자, 작가, 광고. 표현의 분야.',
    love: '열정적이고 적극적인 연애. 상대를 밝게 해줌.',
    wealth: '재능으로 돈을 버는 타입. 저축보다 소비 경향.',
    health: '간, 심장 주의. 열이 많으니 관리 필요.',
    famousPeople: '파블로 피카소'
  },
  '乙未': {
    pillar: '乙未',
    personality: '부드럽고 온화함. 들판의 풀처럼 유연하고 적응력 좋음.',
    career: '교육자, 서비스업, 원예, 요리, 돌봄. 봉사 분야.',
    love: '헌신적이고 다정한 연애. 상대를 돌보려는 타입.',
    wealth: '꾸준히 모으는 스타일. 안정적 재물운.',
    health: '비장, 간 주의. 습기와 과식 조심.',
    famousPeople: '프로렌스 나이팅게일'
  },
  '丙申': {
    pillar: '丙申',
    personality: '태양과 원숭이의 조합. 밝고 재치 있으며 적응력 좋음.',
    career: '연예인, 사업가, 광고, 무역, IT. 빠른 변화의 분야.',
    love: '재미있고 활발한 연애. 다양한 인연을 만남.',
    wealth: '여러 방면에서 수입. 투자 감각 있음.',
    health: '심장, 폐 주의. 과열과 과로 조심.',
    famousPeople: '짐 캐리'
  },
  '丁酉': {
    pillar: '丁酉',
    personality: '불과 닭의 조합. 섬세하고 예리하며 완벽주의.',
    career: '예술가, 보석, 금융, 의료, 뷰티. 정밀함 필요한 분야.',
    love: '까다롭지만 진지한 연애. 이상 높은 파트너 추구.',
    wealth: '전문성으로 부를 얻음. 안정적 축적.',
    health: '심장, 폐 주의. 스트레스와 완벽주의 관리.',
    famousPeople: '니콜 키드먼'
  },
  '戊戌': {
    pillar: '戊戌',
    personality: '두 개의 마른 흙. 고집 세고 원칙적이며 듬직함.',
    career: '건설, 부동산, 법률, 종교, 군인. 안정과 원칙의 분야.',
    love: '의리 있고 진지한 연애. 변치 않는 사랑.',
    wealth: '늦게 피지만 안정적. 부동산 투자 유리.',
    health: '위장, 피부 주의. 건조함 관리 필요.',
    famousPeople: '윈스턴 처칠'
  },
  '己亥': {
    pillar: '己亥',
    personality: '흙과 물의 조합. 부드럽고 지혜로우며 적응력 좋음.',
    career: '농업, 서비스업, 교육, 상담, 종교. 돌봄의 분야.',
    love: '온화하고 헌신적인 연애. 상대를 품어주는 타입.',
    wealth: '서서히 축적하는 스타일. 안정적 재물운.',
    health: '비장, 신장 주의. 습기 관리 필요.',
    famousPeople: '달라이 라마'
  },
  '庚子': {
    pillar: '庚子',
    personality: '쇠와 물의 조합. 날카롭고 지혜로우며 실리적.',
    career: '금융, 법률, 엔지니어, 연구원, IT. 분석력 필요한 분야.',
    love: '냉정하지만 진지한 연애. 실리적 파트너 선호.',
    wealth: '투자 감각이 뛰어남. 금융 분야에서 성공.',
    health: '폐, 신장 주의. 냉기와 습기 관리.',
    famousPeople: '조지 소로스'
  },
  '辛丑': {
    pillar: '辛丑',
    personality: '보석이 흙 속에 있는 형상. 숨은 재능이 많고 인내심 강함.',
    career: '보석, 금융, 농업, 연구, 고고학. 발굴과 인내의 분야.',
    love: '느리지만 깊은 연애. 시간이 지날수록 빛나는 관계.',
    wealth: '늦게 피는 재물운. 꾸준한 노력으로 성공.',
    health: '폐, 비장 주의. 습기와 건조함 균형.',
    famousPeople: '알프레드 노벨'
  },
  '壬寅': {
    pillar: '壬寅',
    personality: '물과 호랑이의 조합. 지혜롭고 추진력이 있음.',
    career: '사업가, 무역, 학자, 탐험가, IT. 개척의 분야.',
    love: '열정적이면서도 깊은 연애. 지적 파트너 선호.',
    wealth: '사업 감각이 좋음. 무역, 해외 관련 성공.',
    health: '신장, 간 주의. 과로와 스트레스 관리.',
    famousPeople: '제프 베조스'
  },
  '癸卯': {
    pillar: '癸卯',
    personality: '물과 꽃의 조합. 섬세하고 예술적이며 감성적.',
    career: '예술가, 작가, 디자이너, 상담사, 교육. 감성의 분야.',
    love: '로맨틱하고 감성적인 연애. 분위기 중시.',
    wealth: '예술적 재능으로 수입. 안정적 축적.',
    health: '신장, 간 주의. 감정 기복과 스트레스 관리.',
    famousPeople: '버지니아 울프'
  },

  // === 41-50: 甲辰순 ===
  '甲辰': {
    pillar: '甲辰',
    personality: '나무와 용의 조합. 큰 포부와 리더십을 가진다.',
    career: 'CEO, 정치인, 학자, 종교인, 건설. 큰 비전의 분야.',
    love: '이상이 높고 진지한 연애. 포부가 맞는 파트너.',
    wealth: '큰 돈을 다루는 능력. 사업과 투자 모두 가능.',
    health: '간, 위장 주의. 스트레스와 과로 관리.',
    famousPeople: '리처드 브랜슨'
  },
  '乙巳': {
    pillar: '乙巳',
    personality: '풀과 뱀의 조합. 유연하고 지혜로우며 적응력 좋음.',
    career: '외교관, 상담사, 비서, 마케팅, 서비스. 소통의 분야.',
    love: '매력적이고 센스있는 연애. 상대 니즈 파악.',
    wealth: '여러 방면에서 수입. 투자 감각 있음.',
    health: '간, 심장 주의. 열과 스트레스 관리.',
    famousPeople: '앤젤리나 졸리'
  },
  '丙午': {
    pillar: '丙午',
    personality: '태양이 정오에 있는 형상. 가장 밝고 뜨거운 기운.',
    career: '연예인, 정치인, 방송인, 스포츠, 예술. 빛나는 분야.',
    love: '열정적이고 화려한 연애. 모든 것을 바치는 사랑.',
    wealth: '크게 벌고 크게 쓰는 타입. 저축 습관 필요.',
    health: '심장, 눈, 혈압 주의. 열 관리 중요.',
    famousPeople: '마돈나'
  },
  '丁未': {
    pillar: '丁未',
    personality: '은은한 불꽃과 흙의 조합. 따뜻하고 포용력 있음.',
    career: '교육자, 요리사, 서비스업, 상담사, 돌봄. 봉사 분야.',
    love: '따뜻하고 헌신적인 연애. 상대를 품어주는 타입.',
    wealth: '꾸준히 모으는 스타일. 안정적 재물운.',
    health: '심장, 비장 주의. 습열 관리 필요.',
    famousPeople: '엘비스 프레슬리'
  },
  '戊申': {
    pillar: '戊申',
    personality: '산과 원숭이의 조합. 중후하면서도 영리함.',
    career: '사업가, 부동산, 무역, 건설, IT. 실리의 분야.',
    love: '실리적이면서도 진지한 연애. 안정적 파트너 선호.',
    wealth: '사업 감각이 좋음. 부동산과 투자 모두 가능.',
    health: '위장, 폐 주의. 과식과 스트레스 관리.',
    famousPeople: '빌 클린턴'
  },
  '己酉': {
    pillar: '己酉',
    personality: '흙과 닭의 조합. 실속 있고 분석력이 뛰어남.',
    career: '금융, 회계, 감정사, 농업, 뷰티. 실리의 분야.',
    love: '까다롭지만 진실된 연애. 실속 있는 파트너 선호.',
    wealth: '꾸준히 모으는 스타일. 안정적 투자.',
    health: '비장, 폐 주의. 건조함과 습기 균형.',
    famousPeople: '조지 클루니'
  },
  '庚戌': {
    pillar: '庚戌',
    personality: '쇠와 개의 조합. 정의롭고 결단력이 있음.',
    career: '군인, 법조인, 경찰, 금융, 중공업. 정의의 분야.',
    love: '의리 있고 진지한 연애. 신뢰할 수 있는 파트너.',
    wealth: '정직하게 버는 타입. 투기보다 실업.',
    health: '폐, 위장 주의. 스트레스와 건조함 관리.',
    famousPeople: '무하마드 알리'
  },
  '辛亥': {
    pillar: '辛亥',
    personality: '보석이 물속에 있는 형상. 숨은 재능과 깊은 지혜.',
    career: '예술가, 연구원, 금융, 보석, 종교. 깊이의 분야.',
    love: '깊고 신비로운 연애. 정신적 교감 중시.',
    wealth: '전문성으로 부를 얻음. 투자 감각 있음.',
    health: '폐, 신장 주의. 냉기와 습기 관리.',
    famousPeople: '스티븐 스필버그'
  },
  '壬子': {
    pillar: '壬子',
    personality: '물 위의 물. 가장 순수한 지혜와 직관력.',
    career: '연구원, 학자, 예술가, 철학자, IT. 지혜의 분야.',
    love: '깊고 지적인 연애. 정신적 교감이 핵심.',
    wealth: '전문성으로 수입. 투자보다 본업 집중.',
    health: '신장, 방광 주의. 물을 많이 마시고 휴식.',
    famousPeople: '스티븐 호킹'
  },
  '癸丑': {
    pillar: '癸丑',
    personality: '물이 흙 속에 스며드는 형상. 인내심 있고 깊은 지혜.',
    career: '연구원, 농업, 금융, 상담사, 종교. 인내의 분야.',
    love: '느리지만 깊은 연애. 시간이 지날수록 깊어짐.',
    wealth: '늦게 피는 재물운. 꾸준한 축적.',
    health: '신장, 비장 주의. 습기와 냉기 관리.',
    famousPeople: '마리 퀴리'
  },

  // === 51-60: 甲寅순 ===
  '甲寅': {
    pillar: '甲寅',
    personality: '나무와 호랑이의 조합. 큰 나무가 산에 서있는 형상으로 당당함.',
    career: '정치인, CEO, 군인, 스포츠, 건설. 리더십의 분야.',
    love: '적극적이고 보호하려는 연애. 든든한 파트너.',
    wealth: '사업가 기질. 큰 돈을 다루는 능력.',
    health: '간, 담 주의. 과로와 스트레스 관리.',
    famousPeople: '테디 루즈벨트'
  },
  '乙卯': {
    pillar: '乙卯',
    personality: '꽃과 나무가 만개한 형상. 예술적이고 아름다움.',
    career: '예술가, 디자이너, 패션, 뷰티, 원예. 미학의 분야.',
    love: '로맨틱하고 감성적인 연애. 아름다운 사랑 추구.',
    wealth: '예술적 재능으로 수입. 안정적 축적.',
    health: '간 주의. 감정 기복과 스트레스 관리.',
    famousPeople: '케이트 미들턴'
  },
  '丙辰': {
    pillar: '丙辰',
    personality: '태양과 용의 조합. 밝고 당당하며 큰 포부.',
    career: '정치인, 연예인, 사업가, 종교인, CEO. 빛나는 분야.',
    love: '열정적이고 이상적인 연애. 큰 비전 공유.',
    wealth: '큰 돈을 다루는 능력. 사업으로 성공.',
    health: '심장, 위장 주의. 열과 습기 관리.',
    famousPeople: '존 F. 케네디'
  },
  '丁巳': {
    pillar: '丁巳',
    personality: '불과 뱀의 조합. 지혜롭고 통찰력이 뛰어남.',
    career: '연구원, 의사, 점술가, 상담사, 금융. 통찰의 분야.',
    love: '깊고 신비로운 연애. 상대를 꿰뚫어봄.',
    wealth: '전문성으로 부를 얻음. 투자 감각 뛰어남.',
    health: '심장 주의. 열 관리 필수.',
    famousPeople: '알버트 아인슈타인'
  },
  '戊午': {
    pillar: '戊午',
    personality: '산과 불의 조합. 열정적이고 당당하며 힘이 넘침.',
    career: '군인, 스포츠, 부동산, 정치, 건설. 파워의 분야.',
    love: '열정적이고 지배적인 연애. 상대를 리드.',
    wealth: '큰 돈을 버는 능력. 부동산으로 성공.',
    health: '위장, 심장 주의. 열과 스트레스 관리.',
    famousPeople: '아놀드 슈워제네거'
  },
  '己未': {
    pillar: '己未',
    personality: '두 개의 흙. 온화하고 포용력 있으며 안정적.',
    career: '교육자, 농업, 서비스업, 요리, 돌봄. 봉사 분야.',
    love: '따뜻하고 헌신적인 연애. 상대를 품어줌.',
    wealth: '꾸준히 모으는 스타일. 땅 관련 투자 유리.',
    health: '비장, 위장 주의. 과식과 습기 관리.',
    famousPeople: '메릴 스트립'
  },
  '庚申': {
    pillar: '庚申',
    personality: '쇠와 원숭이의 조합. 날카롭고 영리하며 추진력 있음.',
    career: '군인, 엔지니어, 금융, 법률, IT. 결단의 분야.',
    love: '적극적이고 실리적인 연애. 유능한 파트너 선호.',
    wealth: '사업 감각이 뛰어남. 투자로 성공.',
    health: '폐 주의. 과로와 스트레스 관리.',
    famousPeople: '버락 오바마'
  },
  '辛酉': {
    pillar: '辛酉',
    personality: '두 개의 금속. 날카롭고 예리하며 완벽주의.',
    career: '보석, 금융, 법률, 의료, 뷰티. 정밀함의 분야.',
    love: '까다롭고 이상 높은 연애. 완벽한 상대 추구.',
    wealth: '전문성으로 부를 얻음. 안정적 축적.',
    health: '폐, 피부, 알레르기 주의. 건조함 관리.',
    famousPeople: '그레이스 켈리'
  },
  '壬戌': {
    pillar: '壬戌',
    personality: '물과 개의 조합. 지혜롭고 정의로우며 충직함.',
    career: '법조인, 종교인, 사회운동가, 학자, 금융. 정의의 분야.',
    love: '의리 있고 깊은 연애. 신뢰 기반의 관계.',
    wealth: '정직하게 버는 타입. 안정적 투자.',
    health: '신장, 위장 주의. 습기와 스트레스 관리.',
    famousPeople: '로버트 F. 케네디'
  },
  '癸亥': {
    pillar: '癸亥',
    personality: '두 개의 물. 가장 깊은 지혜와 직관력을 가진다.',
    career: '연구원, 철학자, 예술가, 종교인, 심리학자. 깊이의 분야.',
    love: '깊고 영적인 연애. 정신적 교감이 핵심.',
    wealth: '전문성으로 수입. 물과 관련된 분야 유리.',
    health: '신장, 방광 주의. 물을 많이 마시고 휴식.',
    famousPeople: '칼 융'
  }
};

// ============ 메인 함수들 ============

/**
 * 60갑자 인덱스 계산 (1-60)
 * 천간과 지지로 60갑자 순번 계산
 */
export function calculatePillarIndex(stem: string, branch: string): number {
  const stemIdx = STEM_ORDER.indexOf(stem);
  const branchIdx = BRANCH_ORDER.indexOf(branch);

  if (stemIdx === -1 || branchIdx === -1) {return -1;}

  // 천간과 지지의 음양이 맞아야 유효한 조합
  if (stemIdx % 2 !== branchIdx % 2) {return -1;}

  // 60갑자 인덱스 공식
  // (천간인덱스 * 6 + 지지인덱스 / 2) % 60 + 1
  const idx = ((stemIdx - branchIdx + 60) % 10) * 6 + branchIdx;
  return (idx % 60) + 1;
}

/**
 * 60갑자 기본 정보 조회
 */
export function getPillarInfo(pillar: string): SixtyPillarInfo | null {
  const index = SIXTY_PILLARS.indexOf(pillar);
  if (index === -1) {return null;}

  const stem = pillar[0];
  const branch = pillar[1];

  return {
    index: index + 1,
    pillar,
    stem,
    branch,
    stemKorean: STEM_KOREAN[stem] || '',
    branchKorean: BRANCH_KOREAN[branch] || '',
    koreanName: `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`,
    stemElement: getStemElement(stem),
    branchElement: getBranchElement(branch),
    stemYinYang: getStemYinYang(stem),
    branchYinYang: getBranchYinYang(branch),
    naeum: NAEUM_DATA[pillar] || ''
  };
}

/**
 * 천간+지지로 갑자 문자열 생성
 */
export function makePillar(stem: string, branch: string): string | null {
  const stemIdx = STEM_ORDER.indexOf(stem);
  const branchIdx = BRANCH_ORDER.indexOf(branch);

  if (stemIdx === -1 || branchIdx === -1) {return null;}
  if (stemIdx % 2 !== branchIdx % 2) {return null;} // 음양 불일치

  return `${stem}${branch}`;
}

/**
 * 인덱스로 60갑자 조회 (1-60)
 */
export function getPillarByIndex(index: number): string | null {
  if (index < 1 || index > 60) {return null;}
  return SIXTY_PILLARS[index - 1];
}

/**
 * 한글명으로 60갑자 조회
 */
export function getPillarByKoreanName(koreanName: string): string | null {
  for (const pillar of SIXTY_PILLARS) {
    const stem = pillar[0];
    const branch = pillar[1];
    const name = `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`;
    if (name === koreanName) {return pillar;}
  }
  return null;
}

/**
 * 납음오행 조회
 */
export function getNaeum(pillar: string): string | null {
  return NAEUM_DATA[pillar] || null;
}

/**
 * 납음오행 오행만 추출
 */
export function getNaeumElement(pillar: string): FiveElement | null {
  const naeum = NAEUM_DATA[pillar];
  if (!naeum) {return null;}

  // 납음명에서 오행 추출 (예: 해중금 -> 금)
  if (naeum.includes('금')) {return '금';}
  if (naeum.includes('목')) {return '목';}
  if (naeum.includes('수')) {return '수';}
  if (naeum.includes('화')) {return '화';}
  if (naeum.includes('토')) {return '토';}

  return null;
}

/**
 * 일주론 상세 정보 조회
 */
export function getIljuInfo(pillar: string): IljuInfo | null {
  return ILJU_DATA[pillar] || null;
}

/**
 * 다음 갑자 계산
 */
export function getNextPillar(pillar: string): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar);
  if (index === -1) {return null;}
  return SIXTY_PILLARS[(index + 1) % 60];
}

/**
 * 이전 갑자 계산
 */
export function getPreviousPillar(pillar: string): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar);
  if (index === -1) {return null;}
  return SIXTY_PILLARS[(index + 59) % 60];
}

/**
 * 두 갑자 사이 거리 계산 (순행)
 */
export function getPillarDistance(from: string, to: string): number {
  const fromIdx = SIXTY_PILLARS.indexOf(from);
  const toIdx = SIXTY_PILLARS.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) {return -1;}
  return (toIdx - fromIdx + 60) % 60;
}

/**
 * N번째 후의 갑자 계산
 */
export function getPillarAfter(pillar: string, n: number): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar);
  if (index === -1) {return null;}
  return SIXTY_PILLARS[((index + n) % 60 + 60) % 60];
}

/**
 * 연도로 연주(年柱) 계산
 */
export function getYearPillar(year: number): string {
  // 기준년: 1984년 = 갑자년 (index 0)
  const baseYear = 1984;
  const diff = year - baseYear;
  const index = ((diff % 60) + 60) % 60;
  return SIXTY_PILLARS[index];
}

/**
 * 모든 60갑자 정보 조회
 */
export function getAllPillars(): SixtyPillarInfo[] {
  return SIXTY_PILLARS.map((pillar, idx) => {
    const stem = pillar[0];
    const branch = pillar[1];
    return {
      index: idx + 1,
      pillar,
      stem,
      branch,
      stemKorean: STEM_KOREAN[stem] || '',
      branchKorean: BRANCH_KOREAN[branch] || '',
      koreanName: `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`,
      stemElement: getStemElement(stem),
      branchElement: getBranchElement(branch),
      stemYinYang: getStemYinYang(stem),
      branchYinYang: getBranchYinYang(branch),
      naeum: NAEUM_DATA[pillar] || ''
    };
  });
}

/**
 * 특정 오행의 천간 목록
 */
export function getStemsByElement(element: FiveElement): string[] {
  return STEMS.filter(s => s.element === element).map(s => s.name);
}

/**
 * 특정 오행의 지지 목록
 */
export function getBranchesByElement(element: FiveElement): string[] {
  return BRANCHES.filter(b => b.element === element).map(b => b.name);
}

/**
 * 일주 요약 정보 (간략화)
 */
export function getIljuSummary(pillar: string): string | null {
  const info = ILJU_DATA[pillar];
  if (!info) {
    // 데이터가 없으면 기본 설명 생성
    const pillarInfo = getPillarInfo(pillar);
    if (!pillarInfo) {return null;}

    return `${pillarInfo.koreanName}일주: ${pillarInfo.stemElement}일간이 ${pillarInfo.branchElement}지지 위에 있는 형상.`;
  }

  return `${pillar}일주: ${info.personality.substring(0, 50)}...`;
}

/**
 * 공망(空亡) 계산
 * 특정 갑자의 공망 지지 2개 반환
 */
export function getGongmang(pillar: string): [string, string] | null {
  const index = SIXTY_PILLARS.indexOf(pillar);
  if (index === -1) {return null;}

  // 10개 단위로 순환 (갑자~계유, 갑술~계미, ...)
  const groupStart = Math.floor(index / 10) * 10;
  const usedBranches = SIXTY_PILLARS.slice(groupStart, groupStart + 10).map(p => p[1]);

  // 사용되지 않은 지지 2개가 공망
  const gongmang = BRANCH_ORDER.filter(b => !usedBranches.includes(b));
  return [gongmang[0], gongmang[1]];
}

// 내보내기
export {
  STEM_KOREAN,
  BRANCH_KOREAN,
  STEM_ORDER,
  BRANCH_ORDER,
  NAEUM_DATA,
  ILJU_DATA
};
