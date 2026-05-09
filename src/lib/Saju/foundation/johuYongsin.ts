// src/lib/Saju/johuYongsin.ts
// 궁통보감(窮通寶鑑) 기반 조후용신 데이터베이스
// 일간 10개 × 월령 12개 = 120개 케이스

import { FiveElement } from './types';

/**
 * 조후용신 상세 정보
 */
export interface JohuYongsinInfo {
  daymaster: string;           // 일간 (甲~癸)
  month: string;               // 월지 (子~亥)
  climate: '한' | '습' | '조' | '열' | '온화';  // 기후 특성
  primaryYongsin: FiveElement; // 주 조후용신
  secondaryYongsin?: FiveElement; // 보조 조후용신
  reasoning: string;           // 조후용신 선정 이유
  caution?: string;            // 주의사항
  rating: 1 | 2 | 3 | 4 | 5;   // 조후 필요도 (5가 가장 급함)
}

/**
 * 월지별 계절/기후 매핑
 */
export const MONTH_CLIMATE: Record<string, { season: string; climate: string; temperature: string }> = {
  '寅': { season: '초봄', climate: '한습', temperature: '추위가 남음' },
  '卯': { season: '중봄', climate: '온화', temperature: '따뜻해짐' },
  '辰': { season: '늦봄', climate: '습', temperature: '습기 있음' },
  '巳': { season: '초여름', climate: '열', temperature: '더워짐' },
  '午': { season: '한여름', climate: '조열', temperature: '가장 덥고 건조' },
  '未': { season: '늦여름', climate: '습열', temperature: '덥고 습함' },
  '申': { season: '초가을', climate: '조', temperature: '선선해짐' },
  '酉': { season: '중가을', climate: '조', temperature: '건조함' },
  '戌': { season: '늦가을', climate: '조한', temperature: '건조하고 쌀쌀' },
  '亥': { season: '초겨울', climate: '한습', temperature: '추워짐' },
  '子': { season: '한겨울', climate: '한', temperature: '가장 춥고 습함' },
  '丑': { season: '늦겨울', climate: '한습', temperature: '춥고 습함' },
};

/**
 * 궁통보감 조후용신 데이터베이스 (120개 케이스)
 */
export const JOHU_YONGSIN_DB: JohuYongsinInfo[] = [
  // ============ 甲木 일간 (12개월) ============
  {
    daymaster: '甲', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 갑목은 아직 추위가 남아 병화로 따뜻하게 해야. 계수로 뿌리 보양.',
    rating: 4
  },
  {
    daymaster: '甲', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 갑목은 왕성하니 병화로 발산하고 경금으로 조각해야 쓸모있음.',
    rating: 3
  },
  {
    daymaster: '甲', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 습토월, 갑목 뿌리 튼튼하니 병화 설기하고 경금으로 제련.',
    rating: 3
  },
  {
    daymaster: '甲', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '초여름 갑목은 열기에 마르니 계수로 윤택하게, 병화는 보조.',
    rating: 4
  },
  {
    daymaster: '甲', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 극열, 갑목 고갈되니 임계수 급히 필요. 경금으로 수원 생성.',
    rating: 5
  },
  {
    daymaster: '甲', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 습열, 아직 더우니 계수로 해갈하고 경신금으로 수생.',
    rating: 4
  },
  {
    daymaster: '甲', month: '申',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '초가을 금왕, 갑목 극받으니 임수로 통관하고 병정화로 금제어.',
    rating: 4
  },
  {
    daymaster: '甲', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 금왕지, 정화로 금을 제련하고 임계수로 목을 보양.',
    rating: 4
  },
  {
    daymaster: '甲', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 건조, 갑목 마르니 임계수로 윤택, 병화로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '甲', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 갑목은 수왕지에서 병화가 급함. 무토로 수 제어.',
    rating: 5
  },
  {
    daymaster: '甲', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 갑목은 얼어붙으니 병정화 필수. 무기토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '甲', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 갑목은 아직 추우니 병화로 해동. 경금으로 조각.',
    rating: 4
  },

  // ============ 乙木 일간 (12개월) ============
  {
    daymaster: '乙', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 을목은 추위 남아 병화로 해동. 계수로 뿌리 보양.',
    rating: 4
  },
  {
    daymaster: '乙', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중봄 을목 왕지, 병화로 꽃피우고 계수로 뿌리 보양.',
    rating: 3
  },
  {
    daymaster: '乙', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 을목은 병화로 습기 말리고, 신금으로 다듬어야.',
    rating: 3
  },
  {
    daymaster: '乙', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 을목은 열에 시드니 계수로 적시고 신금으로 수원.',
    rating: 4
  },
  {
    daymaster: '乙', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 을목 고갈, 임계수 급히 필요하고 경신금 수원 필수.',
    rating: 5
  },
  {
    daymaster: '乙', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 을목은 습열에 지치니 계수로 해갈.',
    rating: 4
  },
  {
    daymaster: '乙', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 을목은 금에 극받으니 병정화로 금 제어.',
    rating: 4
  },
  {
    daymaster: '乙', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 을목은 신금에 극심, 정화로 금 녹이고 계수 보양.',
    rating: 5
  },
  {
    daymaster: '乙', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 건조, 을목 마르니 계수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '乙', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 을목은 수다하니 병화가 급함.',
    rating: 5
  },
  {
    daymaster: '乙', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 을목은 얼어붙으니 병화 필수.',
    rating: 5
  },
  {
    daymaster: '乙', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦겨울 을목은 병화로 해동하고 계수로 뿌리 보양.',
    rating: 4
  },

  // ============ 丙火 일간 (12개월) ============
  {
    daymaster: '丙', month: '寅',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초봄 병화는 목생화로 기운 얻어야. 갑을목이 좋음.',
    rating: 3
  },
  {
    daymaster: '丙', month: '卯',
    climate: '온화', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '중봄 병화는 목의 생조 받아 빛남. 무기토로 설기.',
    rating: 2
  },
  {
    daymaster: '丙', month: '辰',
    climate: '습', primaryYongsin: '목', secondaryYongsin: '금',
    reasoning: '늦봄 습토월, 갑목으로 병화 생조하고 경금으로 갑목 조각.',
    rating: 3
  },
  {
    daymaster: '丙', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 병화 왕성, 임수로 제어하고 경금으로 수원 생성.',
    rating: 4
  },
  {
    daymaster: '丙', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 병화 극왕, 임수 필수로 조열 해소.',
    rating: 5
  },
  {
    daymaster: '丙', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 병화 아직 강하니 임계수로 식히고 경신금 보조.',
    rating: 4
  },
  {
    daymaster: '丙', month: '申',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '초가을 금왕, 병화 쇠하니 갑목으로 생조하고 임수 통관.',
    rating: 3
  },
  {
    daymaster: '丙', month: '酉',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '중가을 병화 쇠약, 갑을목으로 생조 필요.',
    rating: 4
  },
  {
    daymaster: '丙', month: '戌',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦가을 건조, 갑목으로 병화 살리고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '丙', month: '亥',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초겨울 병화는 갑목의 생조 급히 필요.',
    rating: 4
  },
  {
    daymaster: '丙', month: '子',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '한겨울 병화 쇠약, 갑을목 생조 필수. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '丙', month: '丑',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦겨울 병화는 갑목으로 생조받아야 빛남.',
    rating: 4
  },

  // ============ 丁火 일간 (12개월) ============
  {
    daymaster: '丁', month: '寅',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초봄 정화는 갑을목 생조로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '丁', month: '卯',
    climate: '온화', primaryYongsin: '목', secondaryYongsin: '금',
    reasoning: '중봄 정화는 을목 생조 좋고, 경금으로 갑목 조각.',
    rating: 2
  },
  {
    daymaster: '丁', month: '辰',
    climate: '습', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦봄 정화는 갑목 생조 필요. 병화 도움.',
    rating: 3
  },
  {
    daymaster: '丁', month: '巳',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '초여름 정화는 갑목 있어야 빛남. 임수로 과열 방지.',
    rating: 3
  },
  {
    daymaster: '丁', month: '午',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '한여름 정화는 갑목 필수. 임수로 조열 해소.',
    rating: 4
  },
  {
    daymaster: '丁', month: '未',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦여름 정화는 갑목으로 빛내고 계수로 습열 조절.',
    rating: 3
  },
  {
    daymaster: '丁', month: '申',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초가을 정화 쇠하니 갑을목 생조 필요.',
    rating: 4
  },
  {
    daymaster: '丁', month: '酉',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '중가을 정화 쇠약, 갑목 생조 급함.',
    rating: 4
  },
  {
    daymaster: '丁', month: '戌',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦가을 정화는 갑목으로 살리고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '丁', month: '亥',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초겨울 정화는 갑목 생조 필수.',
    rating: 5
  },
  {
    daymaster: '丁', month: '子',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '한겨울 정화 꺼지기 쉬우니 갑목 생조 급함. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '丁', month: '丑',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦겨울 정화는 갑을목 생조로 살려야.',
    rating: 4
  },

  // ============ 戊土 일간 (12개월) ============
  {
    daymaster: '戊', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초봄 무토는 병화로 따뜻하게. 목왕절이라 화 필수.',
    rating: 4
  },
  {
    daymaster: '戊', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 무토는 병화로 생조받고 경금으로 설기.',
    rating: 3
  },
  {
    daymaster: '戊', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦봄 무토는 병화로 습기 말리고 갑목으로 소토.',
    rating: 3
  },
  {
    daymaster: '戊', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 무토는 화다하니 임수로 식히고 경금 수원.',
    rating: 4
  },
  {
    daymaster: '戊', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 무토 건조, 임수 급히 필요. 갑목 소토.',
    rating: 5
  },
  {
    daymaster: '戊', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '목',
    reasoning: '늦여름 무토는 임계수로 습윤하게, 갑목 소토.',
    rating: 4
  },
  {
    daymaster: '戊', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 무토는 병화로 생조하고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '戊', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 무토 설기 심하니 병화 생조 필요.',
    rating: 4
  },
  {
    daymaster: '戊', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '목',
    reasoning: '늦가을 무토 건조, 임계수로 윤택하게. 갑목 소토.',
    rating: 4
  },
  {
    daymaster: '戊', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 무토는 수다하니 병화 급함.',
    rating: 5
  },
  {
    daymaster: '戊', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 무토는 수에 잠기니 병화 필수.',
    rating: 5
  },
  {
    daymaster: '戊', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦겨울 무토는 병화로 해동하고 갑목으로 소토.',
    rating: 4
  },

  // ============ 己土 일간 (12개월) ============
  {
    daymaster: '己', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 기토는 병정화로 따뜻하게 해야 만물 생육.',
    rating: 4
  },
  {
    daymaster: '己', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 기토는 병화 생조받고 신금으로 설기.',
    rating: 3
  },
  {
    daymaster: '己', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 기토는 병화로 습기 말리고 신금 설기.',
    rating: 3
  },
  {
    daymaster: '己', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 기토는 계수로 식히고 신금 수원.',
    rating: 4
  },
  {
    daymaster: '己', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 기토 건조, 계수 급히 필요.',
    rating: 5
  },
  {
    daymaster: '己', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 기토는 계수로 습윤하게.',
    rating: 4
  },
  {
    daymaster: '己', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 기토는 병정화 생조 필요.',
    rating: 3
  },
  {
    daymaster: '己', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 기토 설기 심하니 병화 생조.',
    rating: 4
  },
  {
    daymaster: '己', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 기토 건조, 계수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '己', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 기토는 수다하니 병화 급함.',
    rating: 5
  },
  {
    daymaster: '己', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 기토는 병화 필수.',
    rating: 5
  },
  {
    daymaster: '己', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 기토는 병화로 해동.',
    rating: 4
  },

  // ============ 庚金 일간 (12개월) ============
  {
    daymaster: '庚', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초봄 경금은 병정화로 제련해야 쓸모있음.',
    rating: 4
  },
  {
    daymaster: '庚', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중봄 경금은 정화로 제련하고 무토 생조.',
    rating: 3
  },
  {
    daymaster: '庚', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦봄 경금은 병화로 제련하고 갑목 보조.',
    rating: 3
  },
  {
    daymaster: '庚', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초여름 경금은 임수로 식히고 무토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '한여름 경금 녹으니 임수 급히 필요. 무토 생조.',
    rating: 5
  },
  {
    daymaster: '庚', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦여름 경금은 임수로 식히고 무기토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 경금 왕성, 정화로 제련해야 그릇됨.',
    rating: 3
  },
  {
    daymaster: '庚', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 경금 극왕, 정화 제련 필수. 임수 설기.',
    rating: 4
  },
  {
    daymaster: '庚', month: '戌',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦가을 경금은 정화로 제련하고 임수 윤택.',
    rating: 3
  },
  {
    daymaster: '庚', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 경금은 병정화로 제련. 무토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 경금은 병정화 필수. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '庚', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦겨울 경금은 병정화로 제련. 갑목 보조.',
    rating: 4
  },

  // ============ 辛金 일간 (12개월) ============
  {
    daymaster: '辛', month: '寅',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '초봄 신금은 무기토 생조 필요. 병화로 따뜻하게.',
    rating: 4
  },
  {
    daymaster: '辛', month: '卯',
    climate: '온화', primaryYongsin: '토', secondaryYongsin: '수',
    reasoning: '중봄 신금은 무기토 생조하고 임수로 씻어야 빛남.',
    rating: 3
  },
  {
    daymaster: '辛', month: '辰',
    climate: '습', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦봄 신금은 임수로 씻어 빛내고 병화로 건조.',
    rating: 3
  },
  {
    daymaster: '辛', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초여름 신금은 임계수로 씻고 무기토 생조.',
    rating: 4
  },
  {
    daymaster: '辛', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '한여름 신금 녹으니 임계수 급히 필요. 기토 생조.',
    rating: 5
  },
  {
    daymaster: '辛', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦여름 신금은 임수로 씻고 기토 생조.',
    rating: 4
  },
  {
    daymaster: '辛', month: '申',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초가을 신금은 임수로 씻어야 보석처럼 빛남.',
    rating: 3
  },
  {
    daymaster: '辛', month: '酉',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '중가을 신금 왕지, 임수로 씻어 빛내야.',
    rating: 4
  },
  {
    daymaster: '辛', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦가을 신금은 임수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '辛', month: '亥',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '초겨울 신금은 무기토 생조하고 병화로 따뜻하게.',
    rating: 4
  },
  {
    daymaster: '辛', month: '子',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '한겨울 신금은 무기토 생조 필수. 병화로 해동.',
    rating: 5
  },
  {
    daymaster: '辛', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦겨울 신금은 병화로 따뜻하게 하고 임수로 씻음.',
    rating: 4
  },

  // ============ 壬水 일간 (12개월) ============
  {
    daymaster: '壬', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '초봄 임수는 병화로 따뜻하게. 경금 수원.',
    rating: 4
  },
  {
    daymaster: '壬', month: '卯',
    climate: '온화', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '중봄 임수는 경신금 수원 필요. 병화 보조.',
    rating: 3
  },
  {
    daymaster: '壬', month: '辰',
    climate: '습', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦봄 임수는 경금 수원하고 병화로 설기.',
    rating: 3
  },
  {
    daymaster: '壬', month: '巳',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '초여름 임수 말라가니 경신금 수원 급함.',
    rating: 4
  },
  {
    daymaster: '壬', month: '午',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '한여름 임수 고갈, 경신금 수원 필수. 계수 보조.',
    rating: 5
  },
  {
    daymaster: '壬', month: '未',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '늦여름 임수는 경신금 수원 필요.',
    rating: 4
  },
  {
    daymaster: '壬', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초가을 임수 득령, 병화로 따뜻하게. 무토 제수.',
    rating: 3
  },
  {
    daymaster: '壬', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중가을 임수 왕성, 병화로 설기하고 무토 제수.',
    rating: 3
  },
  {
    daymaster: '壬', month: '戌',
    climate: '조', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦가을 임수는 경금 수원하고 병화로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '壬', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 임수 왕지, 병화 필수로 한기 해소.',
    rating: 5
  },
  {
    daymaster: '壬', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 임수 극왕, 병화 급함. 무토 제수.',
    rating: 5
  },
  {
    daymaster: '壬', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 임수는 병화로 해동하고 경금 수원.',
    rating: 4
  },

  // ============ 癸水 일간 (12개월) ============
  {
    daymaster: '癸', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '초봄 계수는 병정화로 따뜻하게. 신금 수원.',
    rating: 4
  },
  {
    daymaster: '癸', month: '卯',
    climate: '온화', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '중봄 계수는 신금 수원 필요. 정화 보조.',
    rating: 3
  },
  {
    daymaster: '癸', month: '辰',
    climate: '습', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦봄 계수는 신금 수원하고 정화로 설기.',
    rating: 3
  },
  {
    daymaster: '癸', month: '巳',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '초여름 계수 마르니 신금 수원 급함.',
    rating: 4
  },
  {
    daymaster: '癸', month: '午',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '한여름 계수 고갈, 신금 수원 필수. 임수 보조.',
    rating: 5
  },
  {
    daymaster: '癸', month: '未',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '늦여름 계수는 신금 수원 필요.',
    rating: 4
  },
  {
    daymaster: '癸', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초가을 계수 득령, 정화로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '癸', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중가을 계수 왕성, 정화로 설기하고 기토 제수.',
    rating: 3
  },
  {
    daymaster: '癸', month: '戌',
    climate: '조', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦가을 계수는 신금 수원하고 정화로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '癸', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 계수 왕, 정화 필수.',
    rating: 5
  },
  {
    daymaster: '癸', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 계수 극왕, 정화 급함. 기토 제수.',
    rating: 5
  },
  {
    daymaster: '癸', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 계수는 정화로 해동하고 신금 수원.',
    rating: 4
  },
];

/**
 * 궁통보감 조후용신 조회 함수
 */
export function getJohuYongsin(daymaster: string, monthBranch: string): JohuYongsinInfo | null {
  return JOHU_YONGSIN_DB.find(
    info => info.daymaster === daymaster && info.month === monthBranch
  ) || null;
}

/**
 * 조후 필요도 평가 함수
 */
export function evaluateJohuNeed(daymaster: string, monthBranch: string): {
  rating: number;
  description: string;
  urgent: boolean;
} {
  const info = getJohuYongsin(daymaster, monthBranch);
  if (!info) {
    return { rating: 0, description: '조후 정보 없음', urgent: false };
  }

  const ratingDesc: Record<number, string> = {
    1: '조후 필요 낮음 - 기후 온화',
    2: '조후 필요 보통 - 약간의 조절 유리',
    3: '조후 필요 중간 - 조후용신 있으면 좋음',
    4: '조후 필요 높음 - 조후용신 중요',
    5: '조후 필요 급함 - 조후용신 필수'
  };

  return {
    rating: info.rating,
    description: ratingDesc[info.rating] || '',
    urgent: info.rating >= 4
  };
}

/**
 * 조후용신과 억부용신 조화 판단
 */
export function harmonizeYongsin(
  johuYongsin: FiveElement,
  eokbuYongsin: FiveElement,
  johuRating: number
): {
  primary: FiveElement;
  secondary: FiveElement;
  harmony: 'excellent' | 'good' | 'conflict';
  recommendation: string;
} {
  // 같으면 최상
  if (johuYongsin === eokbuYongsin) {
    return {
      primary: johuYongsin,
      secondary: johuYongsin,
      harmony: 'excellent',
      recommendation: '조후용신과 억부용신이 일치하여 최상의 조합'
    };
  }

  // 조후 필요도가 높으면 조후 우선
  if (johuRating >= 4) {
    return {
      primary: johuYongsin,
      secondary: eokbuYongsin,
      harmony: 'good',
      recommendation: '조후가 급하므로 조후용신 우선, 억부용신 보조'
    };
  }

  // 조후 필요도가 낮으면 억부 우선
  return {
    primary: eokbuYongsin,
    secondary: johuYongsin,
    harmony: 'good',
    recommendation: '조후 필요가 낮으므로 억부용신 우선, 조후용신 보조'
  };
}

// ============================================================
// 정통 궁통보감 천간 단위 처방 KB
// ============================================================
// 위 JOHU_YONGSIN_DB(오행 단위)의 한 단계 더 깊은 layer.
// 1995-02-09(寅月 辛金) 같은 case에 정통 처방 "己→庚→壬 우선순위" 출력.
// 이전엔 별도 johuPrescription.ts 파일에 있었으나 같은 도메인이라 통합.

const STEM_LUCKY_COLORS_PR: Record<string, string[]> = {
  甲: ['초록(딥)', '청록'],
  乙: ['연두', '민트'],
  丙: ['빨강(밝은)', '주황'],
  丁: ['진홍', '와인'],
  戊: ['황토', '갈색'],
  己: ['베이지', '아이보리'],
  庚: ['은색', '회색(차가운)'],
  辛: ['화이트', '실버 핑크'],
  壬: ['짙은 남색', '검정'],
  癸: ['회색(부드러운)', '슬레이트'],
}

const STEM_LUCKY_DIRECTION_PR: Record<string, string> = {
  甲: '동(東)', 乙: '동남(東南)',
  丙: '남(南)', 丁: '남(南)',
  戊: '중앙·남서(中央·南西)', 己: '중앙·동북(中央·東北)',
  庚: '서(西)', 辛: '서북(西北)',
  壬: '북(北)', 癸: '북동(北東)',
}

const STEM_LUCKY_HOUR_PR: Record<string, string> = {
  甲: '인시(03-05)·묘시(05-07)',
  乙: '묘시(05-07)·진시(07-09)',
  丙: '사시(09-11)·오시(11-13)',
  丁: '오시(11-13)·미시(13-15)',
  戊: '진시(07-09)·술시(19-21)',
  己: '축시(01-03)·미시(13-15)',
  庚: '신시(15-17)·유시(17-19)',
  辛: '유시(17-19)·술시(19-21)',
  壬: '해시(21-23)·자시(23-01)',
  癸: '자시(23-01)·축시(01-03)',
}

export interface JohuPrescription {
  prescriptionStems: string[]
  stemRoles: Record<string, string>
  prescriptionLine: string
  recommendation: {
    colors: string[]
    direction: string
    bestHour: string
    geokgukNote?: string
    irreversibleAction: string
  }
}

const PRESCRIPTION_KB: Record<string, { stems: string[]; roles: Record<string, string> }> = {
  甲_寅: { stems: ['丙', '癸'], roles: { 丙: '한기 해소·발양', 癸: '뿌리 자양' } },
  甲_卯: { stems: ['庚', '丙'], roles: { 庚: '제련 (가장 중요)', 丙: '발산' } },
  甲_辰: { stems: ['庚', '丁'], roles: { 庚: '제련', 丁: '단련 보조' } },
  甲_巳: { stems: ['癸', '庚'], roles: { 癸: '윤택', 庚: '수원 생성' } },
  甲_午: { stems: ['癸', '丁', '庚'], roles: { 癸: '급히 필요', 丁: '제어', 庚: '수원' } },
  甲_未: { stems: ['癸', '丁', '庚'], roles: { 癸: '윤택', 丁: '제어', 庚: '제련' } },
  甲_申: { stems: ['丁', '庚'], roles: { 丁: '제련', 庚: '같이 씀' } },
  甲_酉: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한기 해소' } },
  甲_戌: { stems: ['丁', '癸'], roles: { 丁: '제련', 癸: '윤택' } },
  甲_亥: { stems: ['庚', '丙'], roles: { 庚: '제련', 丙: '온화' } },
  甲_子: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  甲_丑: { stems: ['丁', '庚', '丙'], roles: { 丁: '제련', 庚: '재제련', 丙: '해동' } },
  乙_寅: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  乙_卯: { stems: ['丙', '癸'], roles: { 丙: '발산', 癸: '뿌리' } },
  乙_辰: { stems: ['癸', '丙'], roles: { 癸: '습토 윤택', 丙: '발산' } },
  乙_巳: { stems: ['癸', '丙'], roles: { 癸: '필수', 丙: '약하게' } },
  乙_午: { stems: ['癸', '丙'], roles: { 癸: '극열에서 필수', 丙: '보조' } },
  乙_未: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  乙_申: { stems: ['丙', '癸', '己'], roles: { 丙: '한해소', 癸: '윤택', 己: '뿌리 자양' } },
  乙_酉: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발양' } },
  乙_戌: { stems: ['癸', '辛'], roles: { 癸: '윤택', 辛: '제련 보조' } },
  乙_亥: { stems: ['丙', '戊'], roles: { 丙: '온화', 戊: '제수' } },
  乙_子: { stems: ['丙', '戊'], roles: { 丙: '온화', 戊: '제수' } },
  乙_丑: { stems: ['丙', '戊'], roles: { 丙: '해동', 戊: '제수' } },
  丙_寅: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_卯: { stems: ['壬', '己'], roles: { 壬: '제어', 己: '설기' } },
  丙_辰: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '신약 시 인성' } },
  丙_巳: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_午: { stems: ['壬', '庚'], roles: { 壬: '극열 제어', 庚: '수원' } },
  丙_未: { stems: ['壬', '庚'], roles: { 壬: '제어', 庚: '수원' } },
  丙_申: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '근원' } },
  丙_酉: { stems: ['壬', '甲'], roles: { 壬: '제어', 甲: '인성' } },
  丙_戌: { stems: ['甲', '壬'], roles: { 甲: '인성', 壬: '약하게 제어' } },
  丙_亥: { stems: ['甲', '戊'], roles: { 甲: '한해소', 戊: '제수' } },
  丙_子: { stems: ['甲', '戊'], roles: { 甲: '한해소', 戊: '제수' } },
  丙_丑: { stems: ['甲', '壬'], roles: { 甲: '해동', 壬: '약하게' } },
  丁_寅: { stems: ['庚', '甲'], roles: { 庚: '제련 재료', 甲: '땔감' } },
  丁_卯: { stems: ['庚', '甲'], roles: { 庚: '제련', 甲: '땔감' } },
  丁_辰: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_巳: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_午: { stems: ['壬', '甲'], roles: { 壬: '극열 제어', 甲: '인성' } },
  丁_未: { stems: ['甲', '壬'], roles: { 甲: '땔감', 壬: '제어' } },
  丁_申: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_酉: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_戌: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_亥: { stems: ['甲', '庚'], roles: { 甲: '땔감', 庚: '제련' } },
  丁_子: { stems: ['甲', '庚'], roles: { 甲: '한해소·땔감', 庚: '제련' } },
  丁_丑: { stems: ['甲', '庚'], roles: { 甲: '해동·땔감', 庚: '제련' } },
  戊_寅: { stems: ['丙', '甲', '癸'], roles: { 丙: '한해소', 甲: '소토', 癸: '윤택' } },
  戊_卯: { stems: ['丙', '甲', '癸'], roles: { 丙: '발양', 甲: '소토', 癸: '윤택' } },
  戊_辰: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발산', 癸: '윤택' } },
  戊_巳: { stems: ['甲', '癸', '丙'], roles: { 甲: '소토', 癸: '윤택', 丙: '약하게' } },
  戊_午: { stems: ['壬', '甲', '癸'], roles: { 壬: '윤택', 甲: '소토', 癸: '약윤택' } },
  戊_未: { stems: ['甲', '癸', '丙'], roles: { 甲: '소토', 癸: '윤택', 丙: '발산' } },
  戊_申: { stems: ['丙', '甲', '癸'], roles: { 丙: '한해소', 甲: '소토', 癸: '윤택' } },
  戊_酉: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  戊_戌: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발양', 癸: '윤택' } },
  戊_亥: { stems: ['甲', '丙'], roles: { 甲: '소토', 丙: '한해소' } },
  戊_子: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '소토' } },
  戊_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },
  己_寅: { stems: ['丙', '庚', '甲'], roles: { 丙: '한해소', 庚: '소토', 甲: '제극' } },
  己_卯: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_辰: { stems: ['丙', '癸', '甲'], roles: { 丙: '발양', 癸: '윤택', 甲: '소토' } },
  己_巳: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  己_午: { stems: ['癸', '丙'], roles: { 癸: '극열 윤택', 丙: '약화' } },
  己_未: { stems: ['癸', '丙'], roles: { 癸: '윤택', 丙: '발산' } },
  己_申: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_酉: { stems: ['丙', '癸'], roles: { 丙: '발양', 癸: '윤택' } },
  己_戌: { stems: ['甲', '丙', '癸'], roles: { 甲: '소토', 丙: '발산', 癸: '윤택' } },
  己_亥: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '뿌리' } },
  己_子: { stems: ['丙', '甲'], roles: { 丙: '한해소', 甲: '뿌리' } },
  己_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },
  庚_寅: { stems: ['丙', '甲', '壬'], roles: { 丙: '한해소', 甲: '제목', 壬: '제련 보조' } },
  庚_卯: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재료' } },
  庚_辰: { stems: ['甲', '丁', '壬'], roles: { 甲: '재목', 丁: '제련', 壬: '도세' } },
  庚_巳: { stems: ['壬', '丙'], roles: { 壬: '도세', 丙: '있을 때만' } },
  庚_午: { stems: ['壬', '癸'], roles: { 壬: '극열 제어', 癸: '윤택' } },
  庚_未: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재목' } },
  庚_申: { stems: ['丁', '甲'], roles: { 丁: '제련', 甲: '재목' } },
  庚_酉: { stems: ['丁', '甲', '丙'], roles: { 丁: '제련', 甲: '재목', 丙: '발양' } },
  庚_戌: { stems: ['甲', '壬'], roles: { 甲: '재목', 壬: '도세' } },
  庚_亥: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  庚_子: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '한해소' } },
  庚_丑: { stems: ['丁', '丙'], roles: { 丁: '제련', 丙: '해동' } },
  辛_寅: { stems: ['己', '庚', '壬'], roles: { 己: '인성 자양', 庚: '비겁 보조', 壬: '식상 세련' } },
  辛_卯: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_辰: { stems: ['壬', '甲'], roles: { 壬: '습토 도세', 甲: '재' } },
  辛_巳: { stems: ['壬', '癸'], roles: { 壬: '제어', 癸: '윤택' } },
  辛_午: { stems: ['壬', '己'], roles: { 壬: '극열 제어', 己: '인성' } },
  辛_未: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_申: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_酉: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_戌: { stems: ['壬', '甲'], roles: { 壬: '도세', 甲: '재' } },
  辛_亥: { stems: ['壬', '丙'], roles: { 壬: '도세', 丙: '한해소' } },
  辛_子: { stems: ['丙', '壬'], roles: { 丙: '한해소', 壬: '도세' } },
  辛_丑: { stems: ['丙', '壬'], roles: { 丙: '해동', 壬: '도세' } },
  壬_寅: { stems: ['丙', '戊', '庚'], roles: { 丙: '한해소', 戊: '제수', 庚: '근원' } },
  壬_卯: { stems: ['戊', '辛'], roles: { 戊: '제수', 辛: '근원' } },
  壬_辰: { stems: ['甲', '庚'], roles: { 甲: '소토', 庚: '근원' } },
  壬_巳: { stems: ['壬', '辛', '癸'], roles: { 壬: '비겁', 辛: '근원', 癸: '겁재' } },
  壬_午: { stems: ['庚', '辛', '壬'], roles: { 庚: '근원', 辛: '근원', 壬: '비겁' } },
  壬_未: { stems: ['辛', '甲'], roles: { 辛: '근원', 甲: '소토' } },
  壬_申: { stems: ['戊', '丁'], roles: { 戊: '제수', 丁: '제련' } },
  壬_酉: { stems: ['甲', '庚'], roles: { 甲: '식상', 庚: '근원' } },
  壬_戌: { stems: ['甲', '丙'], roles: { 甲: '재', 丙: '발양' } },
  壬_亥: { stems: ['戊', '丙'], roles: { 戊: '제수', 丙: '한해소' } },
  壬_子: { stems: ['戊', '丙'], roles: { 戊: '제수', 丙: '한해소' } },
  壬_丑: { stems: ['丙', '甲'], roles: { 丙: '해동', 甲: '소토' } },
  癸_寅: { stems: ['丙', '辛'], roles: { 丙: '한해소', 辛: '근원' } },
  癸_卯: { stems: ['庚', '辛'], roles: { 庚: '근원', 辛: '근원' } },
  癸_辰: { stems: ['丙', '辛'], roles: { 丙: '발양', 辛: '근원' } },
  癸_巳: { stems: ['辛', '庚'], roles: { 辛: '근원', 庚: '근원' } },
  癸_午: { stems: ['庚', '壬', '癸'], roles: { 庚: '근원', 壬: '비겁', 癸: '비겁' } },
  癸_未: { stems: ['庚', '辛'], roles: { 庚: '근원', 辛: '근원' } },
  癸_申: { stems: ['丁', '甲'], roles: { 丁: '재', 甲: '식상' } },
  癸_酉: { stems: ['辛', '丙'], roles: { 辛: '근원', 丙: '발양' } },
  癸_戌: { stems: ['辛', '甲'], roles: { 辛: '근원', 甲: '식상' } },
  癸_亥: { stems: ['庚', '辛', '丙'], roles: { 庚: '근원', 辛: '근원', 丙: '한해소' } },
  癸_子: { stems: ['丙', '辛'], roles: { 丙: '한해소', 辛: '근원' } },
  癸_丑: { stems: ['丙', '丁'], roles: { 丙: '해동', 丁: '재' } },
}

interface PrescriptionInput {
  dayStem: string
  monthBranch: string
  geokguk?: string
  strength?: string
}

export function getJohuPrescription(input: PrescriptionInput): JohuPrescription | null {
  const key = `${input.dayStem}_${input.monthBranch}`
  const entry = PRESCRIPTION_KB[key]
  if (!entry) return null
  const stems = entry.stems
  const stemRoles = entry.roles
  const primary = stems[0]
  const colors = STEM_LUCKY_COLORS_PR[primary] || []
  const direction = STEM_LUCKY_DIRECTION_PR[primary] || ''
  const bestHour = STEM_LUCKY_HOUR_PR[primary] || ''
  const geokgukNote = buildGeokgukNote(input.geokguk, input.strength)
  const irreversibleAction = buildIrreversibleGuard(stems, stemRoles, input.geokguk, input.strength)
  const prescriptionLine = stems.map((s) => `${s}(${stemRoles[s] || ''})`).join(' → ')
  return {
    prescriptionStems: stems, stemRoles, prescriptionLine,
    recommendation: { colors, direction, bestHour, geokgukNote, irreversibleAction },
  }
}

function buildGeokgukNote(geokguk?: string, strength?: string): string | undefined {
  if (!geokguk) return undefined
  const isStrong = /신강|중강|강함|jonggang|jonggwang|^strong$/i.test(strength || '')
  const isWeak = /신약|중약|약함|^weak$/i.test(strength || '')
  if (geokguk.includes('정관'))
    return isWeak ? '정관격 신약 → 인성·비겁 우선. 권력에 정면으로 부딪지 말고 도움받는 결.' : '정관격 → 재성·인성으로 보좌. 책임을 단단히 짓는 결.'
  if (geokguk.includes('편관') || geokguk.includes('칠살'))
    return isWeak ? '편관격 신약 → 인화·식제. 압력 정면 X, 우회·단계화.' : '편관격 → 식상으로 제살 + 인성으로 화살. 큰일 도맡는 결.'
  if (geokguk.includes('정재') || geokguk.includes('편재'))
    return isStrong ? '재격 신강 → 식상·재 활용 적극. 자기 결실 짓기 좋은 시기.' : '재격 신약 → 비겁·인성 보강 후 재 활용. 확장보다 토대 먼저.'
  if (geokguk.includes('정인') || geokguk.includes('편인'))
    return isStrong ? '인격 신강 → 식상으로 설기. 학습·표현·창작이 평생 결.' : '인격 신약 → 인성·비겁 보강. 도움받고 배움 우선.'
  if (geokguk.includes('식신') || geokguk.includes('상관'))
    return isStrong ? '식상격 신강 → 재 생성. 자기 표현 → 결실·자원 변환.' : '식상격 신약 → 인성으로 제어. 발산 절제, 내실 우선.'
  if (/jonggang|jonggwang|종왕|종강/.test(geokguk)) return '종격 → 흐름 거스르지 말고 그 결대로. 비겁·인성 운에 발복.'
  if (/jongjae|jongsal|jonga|종재|종살|종아/.test(geokguk)) return '종격(외향) → 흐름 따라가는 결. 정통 정격 운(인비) 오면 오히려 충돌.'
  return undefined
}

function buildIrreversibleGuard(stems: string[], roles: Record<string, string>, geokguk?: string, strength?: string): string {
  const isWeak = /신약|중약|약함|^weak$/i.test(strength || '')
  const primary = stems[0]
  const primaryRole = roles[primary] || ''
  const baseGuard = `처방 1순위 ${primary}(${primaryRole})이 활성될 때까지는 큰 계약·결혼·이주·송금 같은 비가역 행동 한 박자 늦추는 결.`
  if (isWeak) return `${baseGuard} 신약이라 외부 압박 큰 시기엔 도움받는 통로 먼저 확인.`
  if (geokguk?.includes('편관') || geokguk?.includes('칠살'))
    return `${baseGuard} 편관격은 충동 결정이 가장 큰 손실로 이어지므로 24시간 hold rule 권장.`
  return baseGuard
}
